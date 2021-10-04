import { ChannelSettings, PrismaClient, Question, QuestionType, Rating } from '@prisma/client';
import Client from './Client';

export default class Database {
  client: Client;
  db: PrismaClient;
  channelCache: { [id: string]: ChannelSettings | null };
  questionCache: { [type in QuestionType]: { [rating in Rating]: Question[] } };

  constructor(client: Client) {
    this.client = client;
    this.db = new PrismaClient();
    this.channelCache = {};
  }

  async start() {
    await this.db.$connect();
    this.client.console.success('Connected to database!');
    await this.fetchAllQuestions();
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

  async fetchAllQuestions() {
    const questions: Question[] = [];
    const totalQuestions = await this.db.question.count();
    for (let i = 0; i < Math.ceil(totalQuestions / 100); i++) {
      questions.push(
        ...(await this.db.question.findMany({
          take: 100,
          skip: i * 100,
        }))
      );
    }
    this.questionCache = {
      DARE: {
        PG: questions.filter(q => q.type === 'DARE' && q.rating === 'PG'),
        PG13: questions.filter(q => q.type === 'DARE' && q.rating === 'PG13'),
        R: questions.filter(q => q.type === 'DARE' && q.rating === 'R'),
      },
      NHIE: {
        PG: questions.filter(q => q.type === 'NHIE' && q.rating === 'PG'),
        PG13: questions.filter(q => q.type === 'NHIE' && q.rating === 'PG13'),
        R: questions.filter(q => q.type === 'NHIE' && q.rating === 'R'),
      },
      TRUTH: {
        PG: questions.filter(q => q.type === 'TRUTH' && q.rating === 'PG'),
        PG13: questions.filter(q => q.type === 'TRUTH' && q.rating === 'PG13'),
        R: questions.filter(q => q.type === 'TRUTH' && q.rating === 'R'),
      },
      WYR: {
        PG: questions.filter(q => q.type === 'WYR' && q.rating === 'PG'),
        PG13: questions.filter(q => q.type === 'WYR' && q.rating === 'PG13'),
        R: questions.filter(q => q.type === 'WYR' && q.rating === 'R'),
      },
      PARANOIA: {
        PG: questions.filter(q => q.type === 'PARANOIA' && q.rating === 'PG'),
        PG13: questions.filter(q => q.type === 'PARANOIA' && q.rating === 'PG13'),
        R: questions.filter(q => q.type === 'PARANOIA' && q.rating === 'R'),
      },
    };
    return this.questionCache;
  }

  async fetchSpecificQuestion(id: string) {
    return await this.db.question.findUnique({ where: { id } });
  }

  async getRandomQuestion(type: QuestionType, ratings?: Rating[]): Promise<Question> {
    const rates = ratings ?? ['PG', 'PG13', 'R'];
    if (!rates.length)
      return {
        id: '',
        type,
        rating: 'NONE',
        question: 'That rating is disabled in this channel',
      } as Question & { rating: 'NONE' };
    const rating = rates[Math.floor(Math.random() * rates.length)];
    const questions = this.questionCache[type][rating];
    return questions[Math.floor(Math.random() * questions.length)];
  }

  async updateQuestion(
    id: string,
    { type, rating, question }: { type: QuestionType; rating: Rating; question: string }
  ) {
    const quest = await this.db.question.upsert({
      where: { id },
      update: { type, rating, question },
      create: {
        id: this.generateId(),
        type,
        rating,
        question,
      },
    });
    const questions = this.questionCache[type][rating];
    if (questions.some(q => q.id === quest.id))
      questions.splice(
        questions.findIndex(q => q.id === quest.id),
        1,
        quest
      );
    else questions.push(quest);
    return quest;
  }

  async deleteQuestion(id: string): Promise<Question | null> {
    const question: Question = await this.db.question.delete({ where: { id } }).catch(_ => null);
    if (!question) return;
    const questions = this.questionCache[question.type][question.rating];
    if (questions.some(q => q.id === question.id))
      questions.splice(
        questions.findIndex(q => q.id === question.id),
        1
      );
    return question;
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
