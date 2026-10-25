import { createHash } from 'node:crypto';
import { gzip, gunzip } from 'node:zlib';
import { promisify } from 'node:util';

const compress = promisify(gzip);
const decompress = promisify(gunzip);
export const REGISTERS = 32768;
const RANKS = 51; // 50 independent hash bits, plus the all-zero case.
export const SKETCH_BYTES = REGISTERS * RANKS * 4;
export const DAY_SECONDS = 86400;

// Ertl's improved raw estimator (arXiv:1702.01284, Algorithm 6).
// Unlike switching between linear counting and raw HLL, this has no transition bias.
function estimate(histogram: Uint32Array): number {
  let x = histogram[0] / REGISTERS;
  if (x === 1) return 0;
  let sigma = x;
  for (let weight = 1; ; weight *= 2) {
    x *= x;
    const next = sigma + weight * x;
    if (next === sigma) break;
    sigma = next;
  }
  x = 1 - histogram[RANKS] / REGISTERS;
  let tau = 0;
  if (x > 0 && x < 1) {
    tau = 1 - x;
    for (let weight = 0.5; ; weight *= 0.5) {
      x = Math.sqrt(x);
      const next = tau - weight * (1 - x) ** 2;
      if (next === tau) break;
      tau = next;
    }
    tau /= 3;
  }
  let denominator = REGISTERS * tau;
  for (let rank = RANKS - 1; rank >= 1; rank--) {
    denominator = (denominator + histogram[rank]) / 2;
  }
  denominator += REGISTERS * sigma;
  return Math.round(REGISTERS ** 2 / (2 * Math.LN2 * denominator));
}

export interface ActiveUsersSnapshot {
  version: number;
  startedAt: number;
  savedAt: number;
  data: string;
}

/** Sliding HLL: retain the last timestamp for each (register, rank), not each user.
 * The highest unexpired rank is exactly the register a normal HLL would have
 * built from only the events in that window. Space never grows with traffic.
 */
export default class RollingActiveUsers {
  private timestamps = Buffer.alloc(SKETCH_BYTES);
  startedAt: number;

  constructor(now = Math.floor(Date.now() / 1000)) {
    this.startedAt = now;
  }

  track(userId: string, now = Math.floor(Date.now() / 1000)): void {
    if (!/^\d{1,20}$/.test(userId)) return;
    const hash = createHash('sha256').update(userId).digest();
    const register = hash.readUInt16BE(0) & (REGISTERS - 1);
    const first = hash.readUInt32BE(2);
    const rank =
      first === 0 ? 33 + Math.min(18, Math.clz32(hash.readUInt32BE(6))) : 1 + Math.clz32(first);
    const offset = (register * RANKS + rank - 1) * 4;
    // Ignore a clock regression; never replace a newer observation with an older one.
    if (now > this.timestamps.readUInt32LE(offset)) this.timestamps.writeUInt32LE(now, offset);
  }

  counts(now = Math.floor(Date.now() / 1000)): { week: number; month: number } {
    const cutoffs = [now - 7 * DAY_SECONDS, now - 30 * DAY_SECONDS];
    const histograms = [new Uint32Array(RANKS + 1), new Uint32Array(RANKS + 1)];
    for (let register = 0; register < REGISTERS; register++) {
      const ranks = [0, 0];
      for (let rank = RANKS; rank >= 1; rank--) {
        const seen = this.timestamps.readUInt32LE((register * RANKS + rank - 1) * 4);
        if (seen > 0) {
          if (!ranks[0] && seen > cutoffs[0]) ranks[0] = rank;
          if (!ranks[1] && seen > cutoffs[1]) ranks[1] = rank;
        }
        if (ranks[0] && ranks[1]) break;
      }
      histograms[0][ranks[0]]++;
      histograms[1][ranks[1]]++;
    }
    return { week: estimate(histograms[0]), month: estimate(histograms[1]) };
  }

  async snapshot(now = Math.floor(Date.now() / 1000)): Promise<ActiveUsersSnapshot> {
    // Copy before yielding, so events arriving during compression are not lost or torn.
    const copy = Buffer.from(this.timestamps);
    const cutoff = now - 30 * DAY_SECONDS;
    for (let offset = 0; offset < copy.length; offset += 4) {
      if (copy.readUInt32LE(offset) <= cutoff) copy.writeUInt32LE(0, offset);
    }
    const data = await compress(copy, { level: 1 });
    return { version: 1, startedAt: this.startedAt, savedAt: now, data: data.toString('base64') };
  }

  async restore(stored: ActiveUsersSnapshot, now = Math.floor(Date.now() / 1000)): Promise<void> {
    if (
      stored.version !== 1 ||
      !Number.isInteger(stored.startedAt) ||
      !Number.isInteger(stored.savedAt) ||
      stored.startedAt <= 0 ||
      stored.startedAt > stored.savedAt ||
      stored.savedAt > now + 60 ||
      typeof stored.data !== 'string' ||
      stored.data.length > 12 * 1024 * 1024
    ) {
      throw new Error('Invalid active-user checkpoint');
    }
    const restored = await decompress(Buffer.from(stored.data, 'base64'), {
      maxOutputLength: SKETCH_BYTES,
    });
    if (restored.length !== SKETCH_BYTES) throw new Error('Invalid active-user checkpoint size');
    for (let offset = 0; offset < restored.length; offset += 4) {
      if (restored.readUInt32LE(offset) > stored.savedAt) {
        throw new Error('Invalid active-user checkpoint timestamp');
      }
    }
    for (let offset = 0; offset < restored.length; offset += 4) {
      const seen = restored.readUInt32LE(offset);
      if (seen > this.timestamps.readUInt32LE(offset)) this.timestamps.writeUInt32LE(seen, offset);
    }
    // A long unobserved gap must warm up again, rather than look like full coverage.
    this.startedAt = now - stored.savedAt > 6 * 60 ? this.startedAt : stored.startedAt;
  }
}
