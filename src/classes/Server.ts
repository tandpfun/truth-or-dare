import {
  APIChatInputApplicationCommandInteraction,
  InteractionResponseType,
  ApplicationCommandType,
  InteractionType,
  APIInteraction,
  ComponentType,
} from 'discord-api-types/v9';
import { fastify, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyRateLimit, { RateLimitOptions } from '@fastify/rate-limit';
import { QuestionType, Rating } from '.prisma/client';
import { verifyKey } from 'discord-interactions';
import * as Sentry from '@sentry/node';
import { register } from 'prom-client';

import CommandContext from './CommandContext';
import ButtonContext from './ButtonContext';
import ButtonHandler from './ButtonHandler';
import type Client from './Client';

const PASSTHROUGH_COMMANDS = ['settings'];

const rateLimitConfig: RateLimitOptions = {
  max: 5,
  timeWindow: 5 * 1000,
};

export default class Server {
  port: number;
  client: Client;
  router: FastifyInstance;
  buttonHandler: ButtonHandler;

  constructor(port: number, client: Client) {
    this.port = port;
    this.client = client;
    this.router = fastify({ logger: false });
    this.buttonHandler = new ButtonHandler(this.client);
  }

  async start() {
    await this.router.register(fastifyRateLimit, { global: false });

    this.registerRoutes();

    this.router.listen({ port: this.port, host: '0.0.0.0' }, (err, address) => {
      if (err) throw err;
      this.client.console.success(`Listening for requests at ${address}!`);
    });
  }

  registerRoutes() {
    this.router.post('/interactions', this.handleRequest.bind(this));

    this.router.get(
      '/api/:questionType',
      { config: { rateLimit: rateLimitConfig } },
      this.handleAPI.bind(this)
    );
    this.router.get(
      '/v1/:questionType',
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

    if (!signature || !timestamp || !req.body) return res.status(401).send('Invalid signature');

    const rawBody = JSON.stringify(req.body);
    const isValidRequest = verifyKey(rawBody, signature, timestamp, this.client.publicKey);

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
        interaction as APIChatInputApplicationCommandInteraction,
        this.client,
        res
      );
      if ((await ctx.channelSettings).muted && !PASSTHROUGH_COMMANDS.includes(ctx.command.name))
        return ctx.reply({
          content:
            this.client.EMOTES.xmark +
            ' I am muted in this channel. Use `/settings unmute` to unmute me.',
          flags: 1 << 6,
        });
      await this.handleCommand(ctx);
    } else if (
      interaction.type === InteractionType.MessageComponent &&
      interaction.data.component_type === ComponentType.Button
    ) {
      // If interaction is a button
      const ctx = new ButtonContext(interaction, this.client, res);
      if ((await ctx.channelSettings).muted)
        return ctx.reply({
          content:
            this.client.EMOTES.xmark +
            ' I am muted in this channel. Use `/settings unmute` to unmute me.',
          flags: 1 << 6,
        });
      await this.buttonHandler.handleButton(ctx);
    }
  }

  async handleCommand(ctx: CommandContext) {
    const command = this.client.commands.find(c => c.name === ctx.command.name);
    if (!command)
      return this.client.console.error(
        `Command ${ctx.command.name} was run with no corresponding command file.`
      );
    if (!this.client.functions.checkPerms(command, ctx)) return;

    // Statistics
    this.client.stats.minuteCommandCount++;
    this.client.stats.commands[command.name]++;
    this.client.stats.minuteCommands[command.name]++;

    let commandErrored;
    try {
      await command.run(ctx);
    } catch (err) {
      commandErrored = true;
      this.client.console.error(err);

      // Track error with Sentry
      Sentry.withScope(scope => {
        scope.setExtras({
          user: `${ctx.user.username}#${ctx.user.discriminator} (${ctx.user.id})`,
          command: command.name,
          args: JSON.stringify(ctx.options),
          channelId: ctx.channelId,
        });
        Sentry.captureException(err);
      });
      ctx.reply({
        content: `${this.client.EMOTES.xmark} Something went wrong while running that command.`,
        flags: 1 << 6,
      });
    }

    this.client.metrics.trackCommandUse(command.name, !commandErrored);

    /*this.client.console.log(
      `${ctx.user.username}#${ctx.user.discriminator} (${ctx.user.id}) ran the ${command.name} command.`
    );*/
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

    if (!rating) return res.send(await this.client.database.getRandomQuestion(questionType, ['R']));

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

    const question = await this.client.database.getRandomQuestion(questionType, disabledRatings);

    this.client.metrics.trackAPIRequest(question.type, question.rating); // Track API usage metrics

    res.send(question);
  }
}
