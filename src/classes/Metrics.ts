import { collectDefaultMetrics, Gauge } from 'prom-client';
import Client from './Client';

export default class Metrics {
  client: Client;

  readonly commandsUsed = new Gauge({
    name: 'commands_used',
    help: 'The usage of each command',
    labelNames: ['command', 'success'],
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
