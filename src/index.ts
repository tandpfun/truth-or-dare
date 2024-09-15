import 'dotenv/config.js';

import * as Sentry from '@sentry/node';

import Database from './classes/Database';
import Metrics from './classes/Metrics';
import Client from './classes/Client';
import Server from './classes/Server';
import { getConfig, getGlobalConfig, getInstances } from './config';

const metrics = new Metrics();
const database = new Database(metrics);

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

const server = new Server(globalConfig.port, database, metrics, clients);

const devMode = process.argv.includes('dev');
if (!devMode && globalConfig.sentryDSN) {
  Sentry.init({ dsn: globalConfig.sentryDSN });
  process.on('unhandledRejection', err => {
    Sentry.captureException(err);
  });
}

server.start();
