# Truth or Dare Bot

**Source code for the HTTP interactions system for the Truth or Dare Discord bot!**

Make conversations with your friends more fun and exciting! This bot has Truth or Dare questions, Never Have I Ever prompts, and Would You Rather questions. Altogether, the bot has over 1,500 questions for you to answer! Add it to your server to try it out.

[**Check out the bot**](https://truthordarebot.xyz)

[**Gateway Repo**](https://github.com/acd124/truth-or-dare-gw)

## Active users

`active_users_estimate{period="week"}` and `{period="month"}` count distinct Discord
users who submit a signed slash command or button interaction to either bot,
deduplicated across both bots and all guilds/DMs. Windows are trailing 7 and 30 days,
with one-second timestamp resolution. This is HyperLogLog estimation (0.57% standard
error, not a guaranteed bound); do not sum these metrics across replicas.

The single interactions process keeps a fixed 6,684,672-byte sliding HLL buffer.
No raw user IDs or per-user Prometheus labels are retained. One gzip checkpoint is
upserted into the existing MongoDB `ActiveUsersRollingMetrics` collection every
five minutes, using the existing Prisma connection and `_id` index. There is no
schema migration, new dependency, Redis, or per-interaction database write.

Only one interactions container may write `combined-v1`. Before scaling out,
implement sketch merging and writer ownership; adding replicas and summing counts
is incorrect. The gateway, web API, and website need no changes.

Counts begin at deployment; historical totals cannot reconstruct distinct users.
`active_users_observation_start_timestamp_seconds` marks warm-up (7/30 days).
A checkpoint older than six minutes at startup restarts the coverage warm-up.
`active_users_storage_healthy` and `active_users_checkpoint_timestamp_seconds`
expose storage failures/staleness. Counts are absent until the checkpoint is loaded;
load failures retry without overwriting existing state. Storage outages neither
block bot requests nor create a write queue. SIGTERM drains requests and attempts
a final checkpoint; a hard crash can lose activity since the last successful save
(normally up to five minutes, longer during a storage outage).

Validation (does not contact Discord or MongoDB):

```sh
yarn tsc
node --test tests/active-users.test.js
node --expose-gc tests/active-users-scale.js 10000000
node tests/active-users-accuracy.js
```

The signed-request test uses local Ed25519 keys and Fastify injection. The scale
test checks full-month distinct counts, rolling expiry and checkpoint restoration.
