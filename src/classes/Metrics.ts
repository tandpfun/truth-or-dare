import { collectDefaultMetrics, Gauge } from 'prom-client';
import { Rating } from '@prisma/client';
import { LocaleString } from 'discord-api-types/v9';

export default class Metrics {
  readonly commandsUsed = new Gauge({
    name: 'commands_used',
    help: 'The usage of each command',
    labelNames: ['command', 'success'],
  });

  readonly buttonsPressed = new Gauge({
    name: 'buttons_pressed',
    help: 'The number of buttons pressed',
    labelNames: ['type'],
  });

  readonly userLocales = new Gauge({
    name: 'user_locales',
    help: 'What users have their language set to',
    labelNames: ['locale'],
  });

  readonly ratingSelections = new Gauge({
    name: 'rating_selections',
    help: 'Number of times a rating has been selected by rating and user',
    labelNames: ['rating'],
  });

  readonly questionsSentRating = new Gauge({
    name: 'questions_sent_rating',
    help: 'The number of questions sent by rating',
    labelNames: ['rating'],
  });

  readonly apiRequests = new Gauge({
    name: 'api_requests',
    help: 'API request usage statistics',
    labelNames: ['endpoint', 'rating'],
  });

  readonly questionCount = new Gauge({
    name: 'question_count',
    help: 'The number of questions in the database',
  });

  readonly customQuestionCount = new Gauge({
    name: 'custom_question_count',
    help: 'The number of custom questions in the database',
  });

  // TODO: add metric types for R bot

  constructor() {
    // TODO: determine if prefixed or separate metrics per bot are wanted?
    collectDefaultMetrics();
  }

  trackCommandUse(command: string, success: boolean) {
    this.commandsUsed.labels(command, String(success)).inc();
  }

  trackButtonPress(type: string) {
    this.buttonsPressed.labels(type).inc();
  }

  trackUserLocale(locale: LocaleString) {
    this.userLocales.labels(locale).inc();
  }

  trackRatingSelection(rating: Rating | 'NONE') {
    this.ratingSelections.labels(rating).inc();
  }

  trackQuestionRating(rating: Rating) {
    this.questionsSentRating.labels(rating).inc();
  }

  trackAPIRequest(endpoint: string, rating: string) {
    this.apiRequests.labels(endpoint, rating).inc();
  }

  updateQuestionCount(questionCount: number) {
    this.questionCount.set(questionCount);
  }

  updateCustomQuestionCount(customQuestionCount: number) {
    this.customQuestionCount.set(customQuestionCount);
  }
}
