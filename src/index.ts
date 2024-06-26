import 'dotenv/config.js';

import * as Sentry from '@sentry/node';

import Database from './classes/Database';
import Metrics from './classes/Metrics';
import Client from './classes/Client';
import Server from './classes/Server';

const {
  APPLICATION_ID,
  PUBLIC_KEY,
  TOKEN,
  PREMIUM_SKU,
  R_APPLICATION_ID,
  R_PUBLIC_KEY,
  R_TOKEN,
  R_PREMIUM_SKU,
  PORT,
  OWNERS,
} = process.env;
const devMode = process.argv.includes('dev');

const metrics = new Metrics();
const database = new Database(metrics);

const clients = [];
if (TOKEN && APPLICATION_ID && PUBLIC_KEY)
  clients.push(
    new Client({
      token: TOKEN,
      applicationId: APPLICATION_ID,
      publicKey: PUBLIC_KEY,
      owners: (OWNERS ?? '').split(','),
      premiumSKU: PREMIUM_SKU,
      metrics,
      database,
      enableR: false,
    })
  );
if (R_TOKEN && R_APPLICATION_ID && R_PUBLIC_KEY)
  clients.push(
    new Client({
      token: R_TOKEN,
      applicationId: R_APPLICATION_ID,
      publicKey: R_PUBLIC_KEY,
      owners: (OWNERS ?? '').split(','),
      premiumSKU: R_PREMIUM_SKU,
      metrics,
      database,
      enableR: true,
    })
  );

const server = new Server(Number(PORT), database, metrics, clients);

if (!devMode && process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN });
  process.on('unhandledRejection', err => {
    Sentry.captureException(err);
  });
}

server.start();
