import 'dotenv/config.js';

import Client from './classes/Client';

const { APPLICATION_ID, PUBLIC_KEY, TOKEN, PORT } = process.env;

const client = new Client({
  port: Number(PORT),
  token: TOKEN,
  applicationId: APPLICATION_ID,
  publicKey: PUBLIC_KEY,
});

client.start();
