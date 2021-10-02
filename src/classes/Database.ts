import { ChannelSettings, PrismaClient, Question, QuestionType, Rating } from '@prisma/client';
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

  generateId(): string {
    return (
      Date.now().toString(36) +
      Math.floor(Math.random() * 36 ** 4)
        .toString(36)
        .padStart(4, '0')
    );
  }

  defaultChannelSettings(id: string): ChannelSettings {
    return {
      id,
      disabledRatings: ['R'],
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

  async fetchSpecificQuestion(id: string) {
    return await this.db.question.findUnique({ where: { id } });
  }

  async getRandomQuestion(type: QuestionType, ratings?: Rating[]) {
    const rates = ratings ?? ['PG', 'PG13', 'R'];
    if (!rates.length)
      return {
        id: NaN,
        type,
        rating: 'NONE',
        question: 'That rating is disabled here',
      } as Question & { rating: 'NONE' };
    const rating = rates[Math.floor(Math.random() * rates.length)];
    const questions = await this.db.question.count({
      where: {
        type,
        rating,
      },
    });
    const skip = Math.floor(Math.random() * questions);
    return await this.db.question.findFirst({
      where: {
        type,
        rating,
      },
      skip,
    });
  }

  async updateQuestion(
    id: string,
    { type, rating, question }: { type: QuestionType; rating: Rating; question: string }
  ) {
    return await this.db.question.upsert({
      where: { id },
      update: { type, rating, question },
      create: {
        id: this.generateId(),
        type,
        rating,
        question,
      },
    });
  }

  async deleteQuestion(id: string) {
    return await this.db.question.delete({ where: { id } });
  }

  async makeExampleQuestions() {
    for (let i = 0; i < 100; i++) {
      for (const type of ['DARE', 'NHIE', 'TRUTH', 'WYR'] as QuestionType[]) {
        for (const rating of ['PG', 'PG13', 'R'] as Rating[]) {
          await this.db.question.create({
            data: {
              id: this.generateId(),
              type,
              rating,
              question: `${rating} ${type[0]}${type.slice(1).toLowerCase()} question ${i}`,
            },
          });
          this.client.console.log(`${type}-${rating}-${i}`);
        }
      }
    }
  }
}
