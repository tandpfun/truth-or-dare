const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Registry } = require('prom-client');
const { generateKeyPairSync, sign, createHash } = require('node:crypto');
const Rolling = require('../build/classes/RollingActiveUsers').default;
const { DAY_SECONDS: DAY, SKETCH_BYTES } = require('../build/classes/RollingActiveUsers');
const Tracker = require('../build/classes/ActiveUsersTracker').default;
const NOW = 1800000000;

test('deduplicates across events; expires at exact rolling boundaries', () => {
  const h = new Rolling(NOW);
  for (let i = 0; i < 100; i++) h.track('123456789012345678', NOW);
  assert.deepEqual(h.counts(NOW), { week: 1, month: 1 });
  assert.deepEqual(h.counts(NOW + 7 * DAY - 1), { week: 1, month: 1 });
  assert.deepEqual(h.counts(NOW + 7 * DAY), { week: 0, month: 1 });
  assert.deepEqual(h.counts(NOW + 30 * DAY), { week: 0, month: 0 });
  h.track('123456789012345678', NOW + 31 * DAY);
  assert.deepEqual(h.counts(NOW + 31 * DAY), { week: 1, month: 1 });
  h.track('not-a-user', NOW + 31 * DAY);
  assert.equal(h.counts(NOW + 31 * DAY).week, 1);
  assert.equal(h.timestamps.length, SKETCH_BYTES);
});

test('window registers match an independently rebuilt conventional HLL', () => {
  const h = new Rolling(NOW - 40 * DAY);
  const events = [];
  for (let day = 0; day < 40; day++)
    for (let i = 0; i < 1000; i++) {
      const id = String(100000000000000000n + BigInt((i * 41 + day * 101) % 14000));
      const at = NOW - (39 - day) * DAY;
      events.push([id, at]);
      h.track(id, at);
    }
  function reference(window) {
    const registers = new Uint8Array(32768);
    for (const [id, at] of events)
      if (at > NOW - window * DAY) {
        const bits = Array.from(createHash('sha256').update(id).digest(), n =>
          n.toString(2).padStart(8, '0')
        ).join('');
        const index = parseInt(bits.slice(1, 16), 2);
        const remaining = bits.slice(16, 66);
        const one = remaining.indexOf('1');
        registers[index] = Math.max(registers[index], one < 0 ? 51 : one + 1);
      }
    return registers;
  }
  for (const window of [7, 30]) {
    const actual = new Uint8Array(32768);
    for (let register = 0; register < 32768; register++) {
      for (let rank = 51; rank >= 1; rank--) {
        const seen = h.timestamps.readUInt32LE((register * 51 + rank - 1) * 4);
        if (seen > NOW - window * DAY) {
          actual[register] = rank;
          break;
        }
      }
    }
    assert.deepEqual(actual, reference(window));
  }
});

test('no estimator jump around the old linear-counting transition', () => {
  const h = new Rolling(NOW);
  const sizes = new Set([100, 1000, 10000, 50000, 75000, 80000, 100000, 200000]);
  for (let i = 0; i < 200000; i++) {
    h.track(String(500000000000000000n + BigInt(i)), NOW);
    if (sizes.has(i + 1)) assert.ok(Math.abs(h.counts(NOW).month / (i + 1) - 1) < 0.02);
  }
});

test('checkpoints restore and merge activity received while storage loads', async () => {
  const h = new Rolling(NOW);
  for (let i = 0; i < 10000; i++) h.track(String(100000000000000000n + BigInt(i)), NOW);
  const snapshot = await h.snapshot(NOW);
  const restored = new Rolling(NOW + 60);
  restored.track('999999999999999999', NOW + 60);
  await restored.restore(snapshot, NOW + 60);
  h.track('999999999999999999', NOW + 60);
  assert.deepEqual(restored.counts(NOW + 60), h.counts(NOW + 60));
  assert.equal(restored.startedAt, NOW);
  assert.ok(snapshot.data.length < 5 * 1024 * 1024);
  const late = new Rolling(NOW + 1000);
  await late.restore(snapshot, NOW + 1000);
  assert.equal(late.startedAt, NOW + 1000);
  await assert.rejects(restored.restore({ ...snapshot, version: 99 }, NOW));
  await assert.rejects(restored.restore({ ...snapshot, data: 'broken' }, NOW));
});

test('storage failures stay contained; one in-flight write; shutdown preserves newer events', async () => {
  let rejectLoad = true,
    writes = 0,
    active = 0,
    peak = 0,
    saved,
    release;
  const registry = new Registry();
  const t = new Tracker(
    {
      async loadActiveUsersMetrics() {
        if (rejectLoad) throw Error('test outage');
        return null;
      },
      async saveActiveUsersMetrics(snapshot) {
        writes++;
        active++;
        peak = Math.max(peak, active);
        if (writes === 1) await new Promise(r => (release = r));
        saved = snapshot;
        active--;
      },
    },
    registry
  );
  await t.tick();
  assert.equal((await registry.getSingleMetric('active_users_estimate').get()).values.length, 0);
  t.trackUser('123456789012345678');
  rejectLoad = false;
  const pending = t.tick();
  while (!release) await new Promise(r => setImmediate(r));
  t.trackUser('987654321098765432');
  const concurrent = t.tick();
  release();
  await Promise.all([pending, concurrent]);
  await t.stop();
  assert.equal(peak, 1);
  assert.equal(writes, 2);
  const restored = new Rolling();
  await restored.restore(saved);
  assert.equal(restored.counts().week, 2);
  assert.match(await registry.metrics(), /active_users_storage_healthy 1/);
});

test('signed Discord requests count guild commands and DM buttons across both bots; reject invalid signatures', async () => {
  const Server = require('../build/classes/Server').default;
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const hex = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex');
  const db = { isChargebeePremiumGuild: () => false };
  const clients = ['111', '222'].map(id => ({
    id,
    publicKey: hex,
    config: {},
    database: db,
    handleCommand: async ctx => ctx.response.send({ type: 4 }),
    handleButton: async ctx => ctx.response.send({ type: 4 }),
  }));
  const ids = [];
  const server = new Server(
    0,
    db,
    { trackUserLocale() {} },
    { trackUser: id => ids.push(id) },
    clients
  );
  server.router.post('/interactions', server.handleRequest.bind(server));
  const body = {
    application_id: '111',
    id: '333',
    token: 'test',
    type: 2,
    locale: 'en-US',
    guild_id: '444',
    member: { user: { id: '123456789012345678' } },
    entitlements: [],
    data: { type: 1, name: 'truth', id: '555' },
  };
  async function send(body, invalid = false) {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const payload = JSON.stringify(body);
    const signature = sign(null, Buffer.from(timestamp + payload), privateKey).toString('hex');
    return server.router.inject({
      method: 'POST',
      url: '/interactions',
      payload,
      headers: {
        'content-type': 'application/json',
        'x-signature-timestamp': timestamp,
        'x-signature-ed25519': invalid ? '0'.repeat(128) : signature,
      },
    });
  }
  assert.equal((await send(body)).statusCode, 200);
  const dm = {
    ...body,
    application_id: '222',
    type: 3,
    member: undefined,
    guild_id: undefined,
    user: { id: '123456789012345678' },
    message: { id: '666' },
    data: { component_type: 2, custom_id: 'truth' },
  };
  assert.equal((await send(dm)).statusCode, 200);
  assert.equal((await send(body, true)).statusCode, 401);
  assert.equal((await send({ ...body, type: 1 })).statusCode, 200);
  assert.equal((await send({ ...dm, user: { id: '777', bot: true } })).statusCode, 200);
  assert.deepEqual(ids, ['123456789012345678', '123456789012345678']);
  await server.router.close();
});
