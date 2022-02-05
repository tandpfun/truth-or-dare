import { verifyKeyMiddleware, InteractionType } from 'discord-interactions';
import express, { Express, Request, Response } from 'express';
import { QuestionType, Rating } from '.prisma/client';
import rateLimiter from 'express-rate-limit';
import * as Sentry from '@sentry/node';
import { register } from 'prom-client';

import type Client from './Client';
import Context from './Context';

const passthroughCommands = ['settings'];

const APIRateLimit = rateLimiter({
  windowMs: 5 * 1000,
  max: 5,
  skipFailedRequests: true,
  handler: (_: Request, res: Response) => {
    res.status(429).send({
      error: true,
      message: 'Too many requests, please try again later.',
    });
  },
});

export default class Server {
  port: number;
  client: Client;
  router: Express;

  constructor(port: number, client: Client) {
    this.port = port;
    this.client = client;
    this.router = express();

    this.router.set('trust proxy', 1);

    this.router.use('/api/', APIRateLimit);
    this.router.use('/v1/', APIRateLimit);

    this.router.post(
      '/interactions',
      verifyKeyMiddleware(this.client.publicKey),
      this.handleRequest.bind(this)
    );

    this.router.get('/api/:questionType', this.handleAPI.bind(this));
    this.router.get('/v1/:questionType', this.handleAPI.bind(this));

    this.router.get('/metrics', async (req, res) => {
      if (req.headers.authorization?.replace('Bearer ', '') !== process.env.PROMETHEUS_AUTH)
        return res.sendStatus(401);
      const metrics = await register.metrics();
      res.send(metrics);
    });

    this.router.get('/', (_, res) => res.redirect('https://docs.truthordarebot.xyz'));
  }

  start() {
    this.router.listen(this.port, () =>
      this.client.console.success(`Listening for requests on port ${this.port}!`)
    );
  }

  async handleRequest(req: Request, res: Response) {
    const interaction = req.body;
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      const ctx = new Context(interaction, this.client, res);
      if ((await ctx.channelSettings).muted && !passthroughCommands.includes(ctx.command.name))
        return ctx.reply({
          content:
            this.client.EMOTES.xmark +
            ' I am muted in this channel. Use `/settings unmute` to unmute me.',
          flags: 1 << 6,
        });
      await this.handleCommand(ctx);
    }
  }

  async handleCommand(ctx: Context) {
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

  async handleAPI(req: Request, res: Response) {
    const questionType = req.params.questionType;
    const rating = req.query.rating;
    if (
      !Object.values(QuestionType).includes(
        (questionType as string).toUpperCase?.() as QuestionType
      )
    )
      return res.status(400).send({
        error: true,
        message: `The question type must be one of the following: ${Object.values(QuestionType)
          .map(q => `'${q}'`)
          .join(' ')}`,
      });

    if (!rating)
      return res.send(
        await this.client.database.getRandomQuestion(questionType.toUpperCase() as QuestionType)
      );

    let ratingArray = (Array.isArray(rating) ? rating : [rating]) as Rating[];
    for (const rating of ratingArray) {
      if (!Object.values(Rating).includes(rating.toUpperCase() as Rating))
        return res.status(400).send({
          error: true,
          message: 'The rating must be one of the following: "PG" "PG13" "R"',
        });
    }

    ratingArray = ratingArray.map(r => r.toUpperCase()) as Rating[];

    const disabledRatings = Object.values(Rating).filter(a => !ratingArray.includes(a));

    const question = await this.client.database.getRandomQuestion(
      questionType.toUpperCase() as QuestionType,
      disabledRatings
    );

    this.client.metrics.trackAPIRequest(question.type, rating as string); // Track API usage metrics

    res.send(question);
  }
}
