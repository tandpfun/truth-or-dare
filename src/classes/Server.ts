import crypto from 'node:crypto';

import {
  InteractionResponseType,
  ApplicationCommandType,
  InteractionType,
  APIInteraction,
  ComponentType,
} from 'discord-api-types/v9';
import { fastify, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyRateLimit, { RateLimitOptions } from '@fastify/rate-limit';
import { QuestionType, Rating } from '.prisma/client';
import { verify } from 'discord-verify/node';
import metricsPlugin from 'fastify-metrics';
import { register } from 'prom-client';

import {
  APIChatInputApplicationCommandInteractionWithEntitlements,
  APIMessageComponentInteractionWithEntitlements,
} from './PremiumTypes';
import CommandContext from './CommandContext';
import ButtonContext from './ButtonContext';
import type Client from './Client';
import Database from './Database';
import Metrics from './Metrics';
import Logger from './Logger';

const rateLimitConfig: RateLimitOptions = {
  max: 5,
  timeWindow: 5 * 1000,
};

export default class Server {
  port: number;
  database: Database;
  metrics: Metrics;
  clients: Client[];
  console: Logger;
  router: FastifyInstance;

  constructor(port: number, database: Database, metrics: Metrics, clients: Client[]) {
    this.port = port;
    this.database = database;
    this.metrics = metrics;
    this.clients = clients;
    this.console = new Logger('Server');
    this.router = fastify({ logger: false, trustProxy: 1 });
  }

  async start() {
    this.console.log('Starting ToD Server...');
    await this.database.start();
    for (const c of this.clients) {
      await c.start();
    }

    await this.router.register(fastifyRateLimit, { global: false });
    await this.router.register(metricsPlugin, {
      defaultMetrics: { enabled: false, register: register },
      endpoint: null,
    });

    this.registerRoutes();

    this.router.listen({ port: this.port, host: '0.0.0.0' }, (err, address) => {
      if (err) throw err;
      this.console.success(`Listening for requests at ${address}!`);
    });
  }

  registerRoutes() {
    this.router.post('/interactions', this.handleRequest.bind(this));

    this.router.get(
      '/api/:questionType',
      // @ts-expect-error Bug with metrics plugin extending types
      { config: { rateLimit: rateLimitConfig } },
      this.handleAPI.bind(this)
    );
    this.router.get(
      '/v1/:questionType',
      // @ts-expect-error Bug with metrics plugin extending types
      { config: { rateLimit: rateLimitConfig } },
      this.handleAPI.bind(this)
    );

    this.router.get('/metrics', async (req, res) => {
      if (req.headers.authorization?.replace('Bearer ', '') !== process.env.PROMETHEUS_AUTH)
        return res.status(401).send('Invalid authorization');
      const metrics = await register.metrics();
      res.send(metrics);
    });

    this.router.get('/', (_, res) => res.redirect('https://docs.truthordarebot.xyz/api-docs'));
  }

  async handleRequest(
    req: FastifyRequest<{
      Body: APIInteraction;
      Headers: {
        'x-signature-ed25519': string;
        'x-signature-timestamp': string;
      };
    }>,
    res: FastifyReply
  ) {
    // Verify Request is from Discord
    const signature = req.headers['x-signature-ed25519'];
    const timestamp = req.headers['x-signature-timestamp'];

    const rawBody = JSON.stringify(req.body);

    const client = this.clients.find(c => c.id === req.body?.application_id);
    if (!client) return res.code(401).send('Invalid request');

    const isValidRequest = await verify(
      rawBody,
      signature,
      timestamp,
      client.publicKey,
      crypto.webcrypto.subtle
    );
    if (!isValidRequest) return res.code(401).send('Invalid signature');

    const interaction = req.body;

    if (interaction.type === InteractionType.Ping)
      // If interaction is a ping (url verification)
      res.send({ type: InteractionResponseType.Pong });
    else if (
      interaction.type === InteractionType.ApplicationCommand &&
      interaction.data.type === ApplicationCommandType.ChatInput
    ) {
      // If interaction is a slash command
      if (interaction.data.type !== ApplicationCommandType.ChatInput) return;
      const ctx = new CommandContext(
        interaction as APIChatInputApplicationCommandInteractionWithEntitlements,
        client,
        res
      );
      await client.handleCommand(ctx);
    } else if (
      interaction.type === InteractionType.MessageComponent &&
      interaction.data.component_type === ComponentType.Button
    ) {
      // If interaction is a button
      const ctx = new ButtonContext(
        interaction as APIMessageComponentInteractionWithEntitlements,
        client,
        res
      );
      await client.handleButton(ctx);
    }
  }

  async handleAPI(
    req: FastifyRequest<{
      Params: { questionType: string }; // Not a question type as case insensitive
      Querystring: { rating: string }; // Not a rating type as case insensitive
    }>,
    res: FastifyReply
  ) {
    res.header('Access-Control-Allow-Origin', '*'); // CORS support for TOD website

    const questionType = req.params.questionType.toUpperCase() as QuestionType;
    const rating = req.query.rating;

    if (!Object.values(QuestionType).includes(questionType))
      return res.status(400).send({
        error: true,
        message: `The question type must be one of the following: ${Object.values(QuestionType)
          .map(q => `'${q}'`)
          .join(' ')}`,
      });

    if (!rating) return res.send(await this.database.getRandomQuestion(questionType, ['R']));

    let ratingArray = (Array.isArray(rating) ? rating : [rating]) as Rating[];

    for (const rating of ratingArray) {
      if (!Object.values(Rating).includes(rating.toUpperCase?.() as Rating))
        return res.status(400).send({
          error: true,
          message: `The rating must be one of the following: ${Object.values(Rating)
            .map(r => `'${r}'`)
            .join(' ')}`,
        });
    }

    ratingArray = ratingArray.map(r => r.toUpperCase()) as Rating[];

    const disabledRatings = Object.values(Rating).filter(a => !ratingArray.includes(a));

    const question = await this.database.getRandomQuestion(questionType, disabledRatings);

    this.metrics.trackAPIRequest(question.type, question.rating); // Track API usage metrics

    res.send(question);
  }
}
