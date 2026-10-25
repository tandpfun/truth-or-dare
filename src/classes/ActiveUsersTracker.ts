import { Gauge } from 'prom-client';
import type { Registry } from 'prom-client';
import RollingActiveUsers, { ActiveUsersSnapshot } from './RollingActiveUsers';
import Logger from './Logger';

interface Store {
  loadActiveUsersMetrics(): Promise<ActiveUsersSnapshot | null>;
  saveActiveUsersMetrics(data: ActiveUsersSnapshot): Promise<void>;
}

/** One writer: the single interactions container, shared by both applications. */
export default class ActiveUsersTracker {
  private console = new Logger('ActiveUsers');
  private sketch = new RollingActiveUsers();
  private initialized = false;
  private revision = 0;
  private savedRevision = -1;
  private pending?: Promise<void>;
  private timer?: NodeJS.Timeout;
  private lastSaved = 0;
  private lastAttempt = 0;
  private stopped = false;
  private activeUsers: Gauge<'period'>;
  private healthy: Gauge;
  private checkpoint: Gauge;
  private observationStart: Gauge;

  constructor(private database: Store, registry?: Registry) {
    const registers = registry ? [registry] : undefined;
    this.activeUsers = new Gauge({
      name: 'active_users_estimate',
      help: 'Distinct users across both bots in trailing 7/30 days; HLL standard error 0.57%',
      labelNames: ['period'],
      registers,
    });
    this.healthy = new Gauge({
      name: 'active_users_storage_healthy',
      help: '1 after successful checkpoint load/save; 0 on storage failure',
      registers,
    });
    this.checkpoint = new Gauge({
      name: 'active_users_checkpoint_timestamp_seconds',
      help: 'Last successful active-user checkpoint',
      registers,
    });
    this.observationStart = new Gauge({
      name: 'active_users_observation_start_timestamp_seconds',
      help: 'Start of current continuous observation; windows are partial until aged 7/30 days',
      registers,
    });
    this.updateGauges();
  }

  start(): void {
    if (this.timer) return;
    // Never block bot startup or interaction responses on analytics storage.
    void this.tick();
    this.timer = setInterval(() => void this.tick(), 60_000);
    this.timer.unref();
  }

  trackUser(userId: string): void {
    this.sketch.track(userId);
    this.revision++;
  }

  private updateGauges(): void {
    if (this.initialized) {
      const counts = this.sketch.counts();
      this.activeUsers.labels('week').set(counts.week);
      this.activeUsers.labels('month').set(counts.month);
    }
    this.observationStart.set(this.sketch.startedAt);
    this.checkpoint.set(this.lastSaved);
  }

  async tick(force = false): Promise<void> {
    if (this.stopped && !force) return;
    this.updateGauges();
    if (this.pending) return this.pending;
    const watchdog = setTimeout(() => this.healthy.set(0), 5000);
    watchdog.unref();
    this.pending = this.work(force).finally(() => {
      clearTimeout(watchdog);
      this.pending = undefined;
    });
    return this.pending;
  }

  private async work(force: boolean): Promise<void> {
    try {
      if (!this.initialized) {
        const stored = await this.database.loadActiveUsersMetrics();
        if (stored) {
          await this.sketch.restore(stored);
          this.lastSaved = stored.savedAt;
        }
        this.initialized = true;
        this.healthy.set(1);
      }
      this.updateGauges();
      const now = Math.floor(Date.now() / 1000);
      // Checkpoint even while idle, so startup can distinguish an outage from quiet traffic.
      if (!force && now - this.lastAttempt < 300) return;
      if (force && this.savedRevision === this.revision) return;
      this.lastAttempt = now;
      const revision = this.revision;
      const snapshot = await this.sketch.snapshot(now);
      await this.database.saveActiveUsersMetrics(snapshot);
      this.savedRevision = revision;
      this.lastSaved = snapshot.savedAt;
      this.checkpoint.set(this.lastSaved);
      this.healthy.set(1);
    } catch (err) {
      this.healthy.set(0);
      this.console.error(
        'Active-user storage unavailable; bot continues normally.',
        err instanceof Error ? err.message : 'Unknown error'
      );
    }
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    if (this.pending) await this.pending;
    await this.tick(true);
  }
}
