import { ChannelSettings, PrismaClient } from '@prisma/client';
import Client from './Client';

export default class Database {
  client: Client;
  db: PrismaClient;
  cache: { [id: string]: ChannelSettings };

  constructor(client: Client) {
    this.client = client;
    this.db = new PrismaClient();
  }

  async start() {
    await this.db.$connect();
    this.client.console.success('Connected to database!');
  }
}
