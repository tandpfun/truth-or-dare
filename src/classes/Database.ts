import {
  ChannelSettings,
  PrismaClient,
  ParanoiaQuestion,
  Question,
  QuestionType,
  Rating,
} from '@prisma/client';
import Client from './Client';

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export default class Database {
  client: Client;
  db: PrismaClient;
  channelCache: Record<string, ChannelSettings | null>;
  questionCache: Record<QuestionType, Record<Rating, Question[]>>;

  constructor(client: Client) {
    this.client = client;
    this.db = new PrismaClient();
    this.channelCache = {};
  }

  async start() {
    await this.db.$connect();
    this.client.console.success('Connected to database!');
    await this.fetchAllQuestions();
    setInterval(async () => {
      const cacheSize = Object.keys(this.channelCache).length;
      this.channelCache = {};
      this.client.console.log(`Cleared ${cacheSize} entries from the channel cache`);
      await this.fetchAllQuestions();
    }, 6 * 60 * 60 * 1000);
  }

  async migrate() {
    if (!this.client.devMode) throw new Error('Migrations in production');
    //const result = await this.db.something.updateMany();
    //this.client.console.log(`Migration complete. ${result.count} affected`);
  }

  generateId(): string {
    return (
      Date.now().toString(36) +
      Math.floor(Math.random() * 36 ** 4)
        .toString(36)
        .padStart(4, '0')
    );
  }

  defaultChannelSettings(id: string, dm = false): ChannelSettings {
    return { id, disabledRatings: dm ? [] : ['R'] };
  }

  async fetchChannelSettings(id: string, dm = false) {
    if (!dm && !(id in this.channelCache))
      this.channelCache[id] = await this.db.channelSettings.findUnique({ where: { id } });
    return this.channelCache[id] ?? this.defaultChannelSettings(id, dm);
  }

  async updateChannelSettings(update: ChannelSettings) {
    const withoutID = { ...update };
    delete withoutID.id;
    return (this.channelCache[update.id] = await this.db.channelSettings.upsert({
      where: { id: update.id },
      update: withoutID,
      create: update,
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
    ratings = ratings ?? ['PG', 'PG13', 'R'];
    if (!ratings.length)
      return {
        id: '',
        type,
        rating: 'NONE',
        question: 'That rating is disabled in this channel',
      } as Question & { rating: 'NONE' };
    const rating = ratings[Math.floor(Math.random() * ratings.length)];
    const questions = this.questionCache[type][rating];
    return questions[Math.floor(Math.random() * questions.length)];
  }

  async updateQuestion(id: string, data: Optional<Question, 'id'>) {
    const quest = await this.db.question.upsert({
      where: { id },
      update: data,
      create: { id: this.generateId(), ...data },
    });
    const questions = this.questionCache[data.type][data.rating];
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
    const question: Question | null = await this.db.question
      .delete({ where: { id } })
      .catch(_ => null);
    if (!question) return null;
    const questions = this.questionCache[question.type][question.rating];
    if (questions.some(q => q.id === question.id))
      questions.splice(
        questions.findIndex(q => q.id === question.id),
        1
      );
    return question;
  }

  async makeExampleQuestions() {
    if (!this.client.devMode || (await this.db.question.count()) > 0)
      throw new Error('Example questions in production database');
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

  async addParanoiaQuestion(questionData: Optional<ParanoiaQuestion, 'id' | 'time'>) {
    await this.db.paranoiaQuestion.create({
      data: {
        id: `${questionData.userId}-${questionData.guildId}`,
        time: Date.now(),
        ...questionData,
      },
    });
  }

  async getParanoiaData(userId: string) {
    const results = await this.db.paranoiaQuestion.findMany({ where: { userId } });
    return results.sort((a, b) => a.time - b.time);
  }

  async checkParanoiaStatus(userId: string, guildId: string) {
    const questions = await this.db.paranoiaQuestion.findMany({ where: { userId } });
    return {
      guildOpen: !questions.some(data => data.guildId === guildId),
      queueEmpty: !questions.length,
    };
  }

  async removeParanoiaQuestion(id: string) {
    await this.db.paranoiaQuestion.delete({ where: { id } });
  }

  async getNextParanoia(userId: string) {
    const questions = await this.db.paranoiaQuestion.findMany({ where: { userId } });
    return questions.length ? questions.reduce((a, data) => (a.time < data.time ? a : data)) : null;
  }

  async setParanoiaMessageId(id: string, dmMessageId: string) {
    await this.db.paranoiaQuestion.update({ where: { id }, data: { dmMessageId } });
  }
}
