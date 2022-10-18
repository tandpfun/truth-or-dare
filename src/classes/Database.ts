import {
  ParanoiaQuestion,
  ChannelSettings,
  CustomQuestion,
  GuildSettings,
  PrismaClient,
  QuestionType,
  Question,
  Rating,
} from '@prisma/client';

import { fetchApplicationEntitlementsForGuild } from './Functions';
import type Metrics from './Metrics';
import Logger from './Logger';

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;
type Required<T, K extends keyof T> = Pick<T, K> & Partial<T>;
type SeenQuestion = Pick<Question, 'id' | 'type' | 'rating'>;

export default class Database {
  metrics: Metrics;
  console: Logger;
  db: PrismaClient;
  questionsSeenCache: Record<string, SeenQuestion[]> = {};
  channelCache: Record<string, ChannelSettings | null> = {};
  guildCache: Record<string, GuildSettings | null> = {};
  questionCache: Question[] = [];
  customQuestions: CustomQuestion[] = [];
  chargebeePremiumGuilds: Set<string> = new Set();

  constructor(metrics: Metrics) {
    this.metrics = metrics;
    this.console = new Logger('DB');
    this.db = new PrismaClient();
  }

  async start() {
    await this.db.$connect();
    this.console.success('Connected to database!');
    await this.fetchAllQuestions();
    await this.fetchAllCustomQuestions();
    await this.fetchChargebeePremiumGuilds();
    setInterval(async () => {
      const totalCachedSeenQuestions = Object.values(this.questionsSeenCache).reduce(
        (a, c) => a + c.length,
        0
      );
      const channelCacheSize = Object.keys(this.channelCache).length;
      const guildCacheSize = Object.keys(this.guildCache).length;
      this.channelCache = {};
      this.guildCache = {};
      this.console.log(
        `Cleared ${channelCacheSize} channels, ${guildCacheSize} guilds, and there's ${totalCachedSeenQuestions} seen questions in the settings cache`
      );
      await this.fetchAllQuestions();
      await this.fetchAllCustomQuestions();
      await this.fetchChargebeePremiumGuilds();
    }, 24 * 60 * 60 * 1000);
  }

  async migrate() {
    // NEVER commit changes to this line.
    throw new Error('Unintended Migrations!');

    // const result = await this.db.something.updateMany({ data: {} });
    // this.console.log(`Migration complete. ${result.count} affected`);
  }

  generateId(): string {
    return (
      Date.now().toString(36) +
      Math.floor(Math.random() * 36 ** 4)
        .toString(36)
        .padStart(4, '0')
    );
  }

  async ping() {
    const now = Date.now();
    return this.db.channelSettings.findUnique({ where: { id: '' } }).then(() => Date.now() - now);
  }

  defaultChannelSettings(id: string, dm = false): ChannelSettings {
    return { id, disabledRatings: dm ? [] : ['R'], muted: false };
  }

  async fetchChannelSettings(id: string, dm = false) {
    if (!dm && !(id in this.channelCache))
      this.channelCache[id] = await this.db.channelSettings.findUnique({ where: { id } });
    return this.channelCache[id] ?? this.defaultChannelSettings(id, dm);
  }

  async updateChannelSettings(update: Required<ChannelSettings, 'id'>) {
    const { id, ...withoutId } = update;
    return (this.channelCache[update.id] = await this.db.channelSettings.upsert({
      where: { id },
      update: withoutId,
      create: { ...this.defaultChannelSettings(update.id), ...update },
    }));
  }

  async deleteChannelSettings(id: string) {
    delete this.channelCache[id];
    return await this.db.channelSettings.delete({ where: { id } });
  }

  defaultGuildSettings(id: string): GuildSettings {
    return {
      id,
      disableGlobals: false,
      disableButtons: false,
      disabledQuestions: [],
      showParanoiaFrequency: 50,
      language: null,
    };
  }

  async fetchGuildSettings(id: string, force?: boolean) {
    if (force || !(id in this.guildCache))
      this.guildCache[id] = await this.db.guildSettings.findUnique({ where: { id } });
    return this.guildCache[id] ?? this.defaultGuildSettings(id);
  }

  async updateGuildSettings(update: Required<GuildSettings, 'id'>) {
    const { id, ...withoutId } = update;
    return (this.guildCache[update.id] = await this.db.guildSettings.upsert({
      where: { id },
      update: withoutId,
      create: { ...this.defaultGuildSettings(id), ...update },
    }));
  }

  async fetchAllQuestions() {
    this.questionCache = await this.db.question.findMany();

    // Track question count for metrics
    this.metrics.updateQuestionCount(this.questionCache.length);
    return this.questionCache;
  }

  getQuestions({ type, rating }: { type?: QuestionType; rating?: Rating } = {}) {
    return this.questionCache.filter(
      q => (!type || q.type === type) && (!rating || q.rating === rating)
    );
  }

  fetchSpecificQuestion(id: string) {
    return this.questionCache.find(q => q.id === id);
  }

  async getRandomQuestion(
    type?: QuestionType,
    disabledRatings: Rating[] = [],
    rating?: Rating,
    premium?: boolean,
    guildId?: string,
    channelId?: string
  ): Promise<
    | Question
    | CustomQuestion
    | { id: null; type: QuestionType | 'RANDOM'; rating: Rating | 'NONE'; question: string }
  > {
    const ratings = (rating ? [rating] : Object.values(Rating)).filter(
      r => !disabledRatings.includes(r)
    );
    if (!ratings.length)
      return {
        id: null,
        type: type ?? 'RANDOM',
        rating: 'NONE',
        question:
          'That rating is disabled in this channel.\nUse "/settings enablerating" to enable it.',
      };

    const guildSettings = guildId ? await this.fetchGuildSettings(guildId) : null;
    const language = guildSettings?.language;

    const questionFilter = (q: Omit<Question | CustomQuestion, 'question'>) =>
      (!type || q.type === type) && ratings.includes(q.rating);
    const globalFilter = (q: Question) =>
      questionFilter(q) && (language ? language in q.translations : true);
    const customFilter = (q: CustomQuestion) => q.guildId === guildId && questionFilter(q);

    let questions: (Question | CustomQuestion)[] =
      premium && guildSettings?.disableGlobals
        ? this.customQuestions.filter(customFilter)
        : (premium
            ? [
                ...this.questionCache.filter(globalFilter),
                ...this.customQuestions.filter(customFilter),
              ]
            : this.questionCache.filter(globalFilter)
          ).filter(q => !premium || !guildSettings?.disabledQuestions.includes(q.id));

    let allQuestionsSeen: SeenQuestion[] = [];

    if (premium && channelId) {
      allQuestionsSeen = this.questionsSeenCache[channelId] ?? [];
      let questionsSeen = allQuestionsSeen.filter(q => questionFilter(q));

      if (questionsSeen.length >= questions.length) {
        allQuestionsSeen = allQuestionsSeen.filter(q => !questionsSeen.some(sq => sq.id === q.id));
        questionsSeen = [];
      }
      this.questionsSeenCache[channelId] = allQuestionsSeen;

      questions = questions.filter(q => !questionsSeen.some(sq => sq.id === q.id));
    }

    if (!questions.length) {
      return {
        id: null,
        type: type ?? 'RANDOM',
        rating: 'NONE',
        question: 'I dare you to tell the server admins to add questions',
      };
    }

    let question = questions[Math.floor(Math.random() * questions.length)];

    // Track questions sent by rating
    if (guildId) this.metrics.trackQuestionRating(question.rating);

    if (language && 'translations' in question) {
      const translation = question.translations[language];
      if (translation !== null) question = { ...question, question: translation };
    }
    if (premium && channelId) {
      allQuestionsSeen.push({
        id: question.id,
        type: question.type,
        rating: question.rating,
      });
    }
    return question;
  }

  async updateQuestion(id: string, data: Optional<Question, 'id' | 'translations'>) {
    const oldQuest = this.fetchSpecificQuestion(id);
    const quest = await this.db.question.upsert({
      where: { id },
      update: data,
      create: { id: this.generateId(), translations: {}, ...data },
    });

    const index = oldQuest ? this.questionCache.findIndex(q => q.id === quest.id) : -1;
    if (index !== -1) this.questionCache.splice(index, 1);
    else this.metrics.questionCount.inc();
    this.questionCache.push(quest);
    return quest;
  }

  async deleteQuestion(id: string): Promise<Question | null> {
    const question = await this.db.question.delete({ where: { id } }).catch(_ => null);
    if (!question) return null;
    if (this.questionCache.some(q => q.id === question.id))
      this.questionCache.splice(
        this.questionCache.findIndex(q => q.id === question.id),
        1
      );

    this.metrics.questionCount.dec();
    return question;
  }

  /* async makeExampleQuestions() {
    // NEVER commit changes to this line.
    throw new Error('Unintended example questions.');
    if ((await this.db.question.count()) > 0)
      throw new Error('Example questions in production database');
    for (let i = 0; i < 100; i++) {
      for (const type of Object.values(QuestionType)) {
        for (const rating of Object.values(Rating)) {
          await this.db.question.create({
            data: {
              id: this.generateId(),
              type,
              rating,
              question: `${rating} ${type[0]}${type.slice(1).toLowerCase()} question ${i}`,
              translations: {},
            },
          });
          this.console.log(`${type}-${rating}-${i}`);
        }
      }
    }
  } */

  async fetchAllCustomQuestions() {
    this.customQuestions = await this.db.customQuestion.findMany();

    this.metrics.updateCustomQuestionCount(this.customQuestions.length); // Track custom question count for metrics
    return this.customQuestions;
  }

  getCustomQuestions(
    guildId: string,
    { type, rating }: { type?: QuestionType; rating?: Rating } = {}
  ) {
    return this.customQuestions.filter(
      q => q.guildId === guildId && (!type || q.type === type) && (!rating || q.rating === rating)
    );
  }

  specificCustomQuestion(guildId: string, id: string) {
    return this.getCustomQuestions(guildId).find(q => q.id === id);
  }

  async addCustomQuestion(data: Optional<CustomQuestion, 'id'>) {
    const question = await this.db.customQuestion.create({
      data: { id: this.generateId() + '_c', ...data },
    });
    this.customQuestions.push(question);

    this.metrics.customQuestionCount.inc();
    return question;
  }

  async updateCustomQuestion(data: Required<CustomQuestion, 'id' | 'guildId'>) {
    const { id, ...withoutId } = data;
    const oldQuest = this.specificCustomQuestion(data.guildId, data.id);
    if (!oldQuest) return;
    const quest = await this.db.customQuestion.update({ where: { id }, data: withoutId });

    const index = this.customQuestions.findIndex(q => q.id === quest.id);
    if (index !== -1) this.customQuestions.splice(index, 1);
    this.customQuestions.push(quest);
    return quest;
  }

  async deleteCustomQuestion(id: string): Promise<CustomQuestion | null> {
    const question = await this.db.customQuestion.delete({ where: { id } }).catch(_ => null);
    if (!question) return null;
    if (this.customQuestions.some(q => q.id === question.id))
      this.customQuestions.splice(
        this.customQuestions.findIndex(q => q.id === question.id),
        1
      );

    this.metrics.customQuestionCount.dec();
    return question;
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

  async removeParanoiaQuestion(id: string): Promise<ParanoiaQuestion | null> {
    return await this.db.paranoiaQuestion.delete({ where: { id } }).catch(_ => null);
  }

  async getNextParanoia(userId: string) {
    const questions = await this.db.paranoiaQuestion.findMany({ where: { userId } });
    return questions.length ? questions.reduce((a, data) => (a.time < data.time ? a : data)) : null;
  }

  async setParanoiaMessageId(id: string, dmMessageId: string) {
    await this.db.paranoiaQuestion.update({ where: { id }, data: { dmMessageId } });
  }

  async fetchChargebeePremiumGuilds() {
    const users = await this.db.premiumUser.findMany();
    this.chargebeePremiumGuilds = new Set(users.flatMap(user => user.premiumServers));
  }

  async getPremiumUser(id: string) {
    return await this.db.premiumUser.findUnique({ where: { id } });
  }

  isChargebeePremiumGuild(guildId: string): boolean {
    return this.chargebeePremiumGuilds.has(guildId);
  }

  async isPremiumGuild(guildId: string): Promise<boolean> {
    return (
      this.isChargebeePremiumGuild(guildId) ||
      !!(await fetchApplicationEntitlementsForGuild(guildId))?.length
    );
  }

  async getPremiumActivated(guildId: string) {
    return await this.db.premiumUser.findMany({ where: { premiumServers: { has: guildId } } });
  }

  async activatePremium(userId: string, guildId: string) {
    const user = await this.db.premiumUser.update({
      where: { id: userId },
      data: { premiumServers: { push: guildId } },
    });
    this.chargebeePremiumGuilds.add(guildId);
    return user;
  }

  async deactivatePremium(userId: string, guildId: string) {
    const oldUser = await this.db.premiumUser.findUnique({ where: { id: userId } });
    if (!oldUser) return;
    const user = await this.db.premiumUser.update({
      where: { id: userId },
      data: { premiumServers: oldUser.premiumServers.filter(id => id !== guildId) },
    });
    if (!(await this.db.premiumUser.findFirst({ where: { premiumServers: { has: guildId } } })))
      this.chargebeePremiumGuilds.delete(guildId);
    return user;
  }

  async addDisabledQuestion(guild: string, questionId: string) {
    return await this.db.guildSettings.upsert({
      where: { id: guild },
      update: { disabledQuestions: { push: questionId } },
      create: { ...this.defaultGuildSettings(guild), disabledQuestions: [questionId] },
    });
  }
}
