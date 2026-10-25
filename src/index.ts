import 'dotenv/config.js';

import * as Sentry from '@sentry/node';

import Database from './classes/Database';
import Metrics from './classes/Metrics';
import ActiveUsersTracker from './classes/ActiveUsersTracker';
import Client from './classes/Client';
import Server from './classes/Server';
import { getConfig, getGlobalConfig, getInstances } from './config';

const metrics = new Metrics();
const database = new Database(metrics);
const activeUsers = new ActiveUsersTracker(database);

const globalConfig = getGlobalConfig();

const instances = getInstances();
const clients = instances.map(instance => {
  const instanceConfig = getConfig(instance);

  return new Client({
    config: instanceConfig,
    database,
    metrics,
  });
});

const server = new Server(globalConfig.port, database, metrics, activeUsers, clients);

const devMode = process.argv.includes('dev');
if (!devMode && globalConfig.sentryDSN) {
  Sentry.init({ dsn: globalConfig.sentryDSN });
  process.on('unhandledRejection', err => {
    Sentry.captureException(err);
  });
}

server.start();

// Docker sends SIGTERM. Stop accepting requests, then checkpoint the final events.
let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  const deadline = setTimeout(() => process.exit(0), 8000);
  deadline.unref();
  try {
    await server.router.close();
    await activeUsers.stop();
  } finally {
    process.exit(0);
  }
}
process.once('SIGTERM', () => void shutdown());
process.once('SIGINT', () => void shutdown());
