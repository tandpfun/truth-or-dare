import Client from '../lib/classes/Client.js';
import 'dotenv/config.js';

const { APPLICATION_ID, PUBLIC_KEY, TOKEN } = process.env;

const client = new Client({
  port: 1000,
  token: TOKEN,
  applicationId: APPLICATION_ID,
  publicKey: PUBLIC_KEY,
});

client.start();
