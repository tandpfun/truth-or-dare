const Rolling = require('../build/classes/RollingActiveUsers').default;
const assert = require('node:assert/strict');
const now = 1800000000,
  n = 1000000,
  results = [];
for (let trial = 0; trial < 12; trial++) {
  const h = new Rolling(now);
  for (let i = 0; i < n; i++)
    h.track(String(200000000000000000n + BigInt(trial) * 10000000n + BigInt(i)), now);
  const estimate = h.counts(now).month;
  const errorPct = 100 * (estimate / n - 1);
  results.push({ trial, estimate, errorPct });
  assert.ok(Math.abs(errorPct) < 2.5);
}
console.log(
  JSON.stringify(
    {
      usersPerTrial: n,
      results,
      rmsErrorPct: Math.sqrt(results.reduce((s, r) => s + r.errorPct ** 2, 0) / results.length),
    },
    null,
    2
  )
);
