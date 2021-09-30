import { ChannelSettings, PrismaClient } from '@prisma/client';
import Client from './Client';

export default class Database {
  client: Client;
  db: PrismaClient;
  channelCache: { [id: string]: ChannelSettings | null };

  constructor(client: Client) {
    this.client = client;
    this.db = new PrismaClient();
    this.channelCache = {};
  }

  async start() {
    await this.db.$connect();
    this.client.console.success('Connected to database!');
    setInterval(() => {
      const cacheSize = Object.keys(this.channelCache).length;
      this.channelCache = {};
      this.client.console.log(`Cleared ${cacheSize} entries from the channel cache`);
    }, 6 * 60 * 60 * 1000);
  }

  defaultChannelSettings(id: string): ChannelSettings {
    return {
      id,
      disabledRatings: [],
    };
  }

  async fetchChannelSettings(id: string) {
    if (!(id in this.channelCache))
      this.channelCache[id] = await this.db.channelSettings.findUnique({
        where: { id },
      });
    return this.channelCache[id] ?? this.defaultChannelSettings(id);
  }

  async updateChannelSettings(id: string, update: ChannelSettings) {
    const withoutID = Object.assign({}, update);
    delete withoutID.id;
    return (this.channelCache[id] = await this.db.channelSettings.upsert({
      where: { id },
      update: withoutID,
      create: { id, ...update },
    }));
  }

  async deleteChannelSettings(id: string) {
    delete this.channelCache[id];
    return await this.db.channelSettings.delete({ where: { id } });
  }
}
