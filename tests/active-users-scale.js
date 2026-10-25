// No network or database access. Run with node --expose-gc tests/active-users-scale.js [users].
const { performance, monitorEventLoopDelay } = require('node:perf_hooks');
const assert = require('node:assert/strict');
const Rolling = require('../build/classes/RollingActiveUsers').default;
const { SKETCH_BYTES, DAY_SECONDS: DAY } = require('../build/classes/RollingActiveUsers');
(async () => {
  const n = Number(process.argv[2] || 10000000),
    now = 1800000000;
  const h = new Rolling(now - 30 * DAY),
    lag = monitorEventLoopDelay({ resolution: 10 });
  lag.enable();
  global.gc?.();
  const before = process.memoryUsage(),
    start = performance.now();
  let maxBatchMs = 0;
  for (let base = 0; base < n; base += 1000) {
    const b = performance.now();
    for (let i = base; i < Math.min(base + 1000, n); i++)
      h.track(String(100000000000000000n + BigInt(i)), now - (i % 30) * DAY);
    maxBatchMs = Math.max(maxBatchMs, performance.now() - b);
    await new Promise(r => setImmediate(r));
  }
  const ingestionMs = performance.now() - start;
  const countStart = performance.now(),
    counts = h.counts(now),
    countMs = performance.now() - countStart;
  const expectedWeek = Math.floor(n / 30) * 7 + Math.min(n % 30, 7);
  assert.ok(Math.abs(counts.week / expectedWeek - 1) < 0.04);
  assert.ok(Math.abs(counts.month / n - 1) < 0.04);
  const snapshotStart = performance.now(),
    snapshot = await h.snapshot(now),
    snapshotMs = performance.now() - snapshotStart;
  const restored = new Rolling(now);
  await restored.restore(snapshot, now);
  assert.deepEqual(restored.counts(now), counts);
  assert.deepEqual(h.counts(now + 30 * DAY), { week: 0, month: 0 });
  global.gc?.();
  const after = process.memoryUsage();
  lag.disable();
  console.log(
    JSON.stringify(
      {
        node: process.version,
        arch: process.arch,
        users: n,
        counts,
        expectedWeek,
        weekErrorPct: 100 * (counts.week / expectedWeek - 1),
        monthErrorPct: 100 * (counts.month / n - 1),
        sketchBytes: SKETCH_BYTES,
        checkpointBytes: Buffer.byteLength(JSON.stringify(snapshot)),
        ingestionMs,
        updatesPerSecond: n / (ingestionMs / 1000),
        countMs,
        snapshotMs,
        maxBatchMs,
        eventLoopP99Ms: lag.percentile(99) / 1e6,
        before,
        after,
      },
      null,
      2
    )
  );
})().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
