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

import type Client from './Client';

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;
type Required<T, K extends keyof T> = Pick<T, K> & Partial<T>;

export default class Database {
  client: Client;
  db: PrismaClient;
  channelCache: Record<string, ChannelSettings | null>;
  questionCache: Record<QuestionType, Record<Rating, Question[]>>;
  customQuestions: Record<QuestionType, Record<Rating, CustomQuestion[]>>;
  premiumGuilds: Set<string>;

  constructor(client: Client) {
    this.client = client;
    this.db = new PrismaClient();
    this.channelCache = {};
    this.premiumGuilds = new Set();
    this.questionCache = Object.fromEntries(
      Object.keys(QuestionType).map(type => [
        type,
        Object.fromEntries(Object.entries(Rating).map(rating => [rating, []])),
      ])
    ) as Record<QuestionType, Record<Rating, Question[]>>;
    this.customQuestions = Object.fromEntries(
      Object.keys(QuestionType).map(type => [
        type,
        Object.fromEntries(Object.entries(Rating).map(rating => [rating, []])),
      ])
    ) as Record<QuestionType, Record<Rating, CustomQuestion[]>>;
  }

  async start() {
    await this.db.$connect();
    this.client.console.success('Connected to database!');
    await this.fetchAllQuestions();
    await this.fetchAllCustomQuestions();
    await this.fetchPremiumGuilds();
    setInterval(async () => {
      const cacheSize = Object.keys(this.channelCache).length;
      this.channelCache = {};
      this.client.console.log(`Cleared ${cacheSize} entries from the channel cache`);
      await this.fetchAllQuestions();
      await this.sweepCustomQuestions();
    }, 6 * 60 * 60 * 1000);
  }

  async migrate() {
    if (!this.client.devMode) throw new Error('Migrations in production');
    //const result = await this.db.something.updateMany({ data: {} });
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

  async updateChannelSettings(update: ChannelSettings) {
    const withoutId: Optional<ChannelSettings, 'id'> = { ...update };
    delete withoutId.id;
    return (this.channelCache[update.id] = await this.db.channelSettings.upsert({
      where: { id: update.id },
      update: withoutId,
      create: update,
    }));
  }

  async deleteChannelSettings(id: string) {
    delete this.channelCache[id];
    return await this.db.channelSettings.delete({ where: { id } });
  }

  async fetchAllQuestions() {
    const questions: Question[] = await this.db.question.findMany();
    this.questionCache = Object.fromEntries(
      Object.values(QuestionType).map(type => [
        type,
        Object.fromEntries(
          Object.values(Rating).map(rating => [
            rating,
            questions.filter(q => q.type === type && q.rating === rating),
          ])
        ),
      ])
    ) as Record<QuestionType, Record<Rating, Question[]>>;

    this.client.metrics.updateQuestionCount(questions.length); // Track question count for metrics
    return this.questionCache;
  }

  getQuestions(type?: QuestionType, rating?: Rating) {
    return Object.values(QuestionType)
      .map(t =>
        Object.values(Rating)
          .map(r =>
            this.questionCache[t][r].filter(
              q => (!type || q.type === type) && (!rating || q.rating === rating)
            )
          )
          .flat()
      )
      .flat();
  }

  fetchSpecificQuestion(id: string) {
    return Object.values(this.questionCache)
      .map(rate => Object.values(rate).flat())
      .flat()
      .find(q => q.id === id);
  }

  async getRandomQuestion(
    type: QuestionType,
    disabledRatings: Rating[] = [],
    rating?: Rating,
    guildId?: string
  ): Promise<Question> {
    const ratings = (rating ? [rating] : Object.values(Rating)).filter(
      r => !disabledRatings.includes(r)
    );
    if (!ratings.length)
      return {
        id: '',
        type,
        rating: 'NONE',
        question: 'That rating is disabled in this channel',
      } as Question & { rating: 'NONE' };
    const isPremiumGuild = guildId && this.isPremiumGuild(guildId);
    const guildSettings = isPremiumGuild ? await this.getGuildSettings(guildId) : null;
    const chosenRating = ratings[Math.floor(Math.random() * ratings.length)];
    const questions = guildSettings?.disableGlobals
      ? this.customQuestions[type][chosenRating].filter(q => q.guildId === guildId)
      : (isPremiumGuild
          ? [
              ...this.questionCache[type][chosenRating],
              ...this.customQuestions[type][chosenRating].filter(q => q.guildId === guildId),
            ]
          : this.questionCache[type][chosenRating]
        ).filter(q => !isPremiumGuild || !guildSettings!.disabledQuestions.includes(q.id));
    return questions.length
      ? questions[Math.floor(Math.random() * questions.length)]
      : ({
          id: '',
          type,
          rating: 'NONE',
          question: 'I dare you to tell the server admins to add questions',
        } as Question & { rating: 'NONE' });
  }

  async updateQuestion(id: string, data: Optional<Question, 'id'>) {
    const oldQuest = this.fetchSpecificQuestion(id);
    const quest = await this.db.question.upsert({
      where: { id },
      update: data,
      create: { id: this.generateId(), ...data },
    });

    const questions = oldQuest ? this.questionCache[oldQuest.type][oldQuest.rating] : null;
    const index = questions ? questions.findIndex(q => q.id === quest.id) : -1;
    if (index !== -1) questions!.splice(index, 1);
    else this.client.metrics.questionCount.inc();
    this.questionCache[quest.type][quest.rating].push(quest);
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

    this.client.metrics.questionCount.dec();
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

  async fetchAllCustomQuestions() {
    const questions = await this.db.customQuestion.findMany();
    this.customQuestions = Object.fromEntries(
      Object.values(QuestionType).map(type => [
        type,
        Object.fromEntries(
          Object.values(Rating).map(rating => [
            rating,
            questions.filter(q => q.type === type && q.rating === rating),
          ])
        ),
      ])
    ) as Record<QuestionType, Record<Rating, CustomQuestion[]>>;

    this.client.metrics.updateCustomQuestionCount(questions.length); // Track custom question count for metrics
    return this.customQuestions;
  }

  getCustomQuestions(guildId: string, type?: QuestionType, rating?: Rating) {
    return Object.values(QuestionType)
      .map(t =>
        Object.values(Rating)
          .map(r =>
            this.customQuestions[t][r].filter(
              q =>
                q.guildId === guildId &&
                (!type || q.type === type) &&
                (!rating || q.rating === rating)
            )
          )
          .flat()
      )
      .flat();
  }

  specificCustomQuestion(guildId: string, id: string) {
    return this.getCustomQuestions(guildId).find(q => q.id === id);
  }

  async addCustomQuestion(data: Optional<CustomQuestion, 'id'>) {
    const question = await this.db.customQuestion.create({
      data: { id: this.generateId() + '_c', ...data },
    });
    this.customQuestions[data.type][data.rating].push(question);

    this.client.metrics.customQuestionCount.inc();
    return question;
  }

  async updateCustomQuestion(data: Required<CustomQuestion, 'id' | 'guildId'>) {
    const oldQuest = this.specificCustomQuestion(data.guildId, data.id);
    const quest = await this.db.customQuestion.update({
      where: { id: data.id },
      data: { ...data, id: undefined } as Omit<CustomQuestion, 'id'>,
    });

    const questions = this.customQuestions[oldQuest!.type][oldQuest!.rating];
    const index = questions.findIndex(q => q.id === quest.id);
    if (index !== -1) questions.splice(index, 1);
    this.customQuestions[quest.type][quest.rating].push(quest);
    return quest;
  }

  async deleteCustomQuestion(id: string): Promise<CustomQuestion | null> {
    const question: CustomQuestion | null = await this.db.customQuestion
      .delete({ where: { id } })
      .catch(_ => null);
    if (!question) return null;
    const questions = this.customQuestions[question.type][question.rating];
    if (questions.some(q => q.id === question.id))
      questions.splice(
        questions.findIndex(q => q.id === question.id),
        1
      );

    this.client.metrics.customQuestionCount.dec();
    return question;
  }

  async sweepCustomQuestions() {
    await this.db.customQuestion.deleteMany({
      where: {
        guildId: {
          notIn: (await this.db.premiumUser.findMany()).map(u => u.premiumServers).flat(),
        },
      },
    });
    await this.fetchAllCustomQuestions();
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

  async fetchPremiumGuilds() {
    const users = await this.db.premiumUser.findMany();
    for (const user of users) {
      for (const guild of user.premiumServers) {
        this.premiumGuilds.add(guild);
      }
    }
  }

  async getPremiumUser(id: string) {
    return await this.db.premiumUser.findUnique({ where: { id } });
  }

  isPremiumGuild(guildId: string): boolean {
    return this.premiumGuilds.has(guildId);
  }

  async getPremiumActivated(guildId: string) {
    return await this.db.premiumUser.findMany({ where: { premiumServers: { has: guildId } } });
  }

  async activatePremium(userId: string, guildId: string) {
    const user = await this.db.premiumUser.update({
      where: { id: userId },
      data: { premiumServers: { push: guildId } },
    });
    this.premiumGuilds.add(guildId);
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
      this.premiumGuilds.delete(guildId);
    return user;
  }

  async getGuildSettings(id: string) {
    return id
      ? (await this.db.guildSettings.findUnique({ where: { id } })) ?? this.defaultGuildSettings(id)
      : this.defaultGuildSettings(id);
  }

  defaultGuildSettings(id: string): GuildSettings {
    return { id, disableGlobals: false, disabledQuestions: [], showParanoiaFrequency: 50 };
  }

  async updateGuildSettings(data: Required<GuildSettings, 'id'>) {
    return await this.db.guildSettings.upsert({
      where: { id: data.id },
      update: { ...data, id: undefined } as Omit<GuildSettings, 'id'>,
      create: { ...this.defaultGuildSettings(data.id), ...data },
    });
  }

  async addDisabledQuestion(guild: string, questionId: string) {
    return await this.db.guildSettings.upsert({
      where: { id: guild },
      update: { disabledQuestions: { push: questionId } },
      create: { ...this.defaultGuildSettings(guild), disabledQuestions: [questionId] },
    });
  }
}
