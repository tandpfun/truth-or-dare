import { Rating } from '@prisma/client';
import { collectDefaultMetrics, Gauge } from 'prom-client';

import Client from './Client';

export default class Metrics {
  client: Client;

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

  readonly ratingSelections = new Gauge({
    name: 'rating_selections',
    help: 'Number of times a rating has been selected by rating',
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

  constructor(client: Client) {
    this.client = client;

    collectDefaultMetrics();
  }

  trackCommandUse(command: string, success: boolean) {
    this.commandsUsed.labels(command, String(success)).inc();
  }

  trackButtonPress(type: string) {
    this.buttonsPressed.labels(type).inc();
  }

  trackRatingSelection(rating: Rating) {
    this.ratingSelections.labels(rating).inc();
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
