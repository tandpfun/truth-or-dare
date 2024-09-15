import { readdirSync } from 'fs';

import {
  RESTPostAPIWebhookWithTokenJSONBody,
  ApplicationCommandOptionType,
  APIApplicationCommandOption,
  APIApplicationCommand,
  PermissionFlagsBits,
} from 'discord-api-types/v9';
import { ChannelSettings, QuestionType, Rating } from '@prisma/client';
import * as Sentry from '@sentry/node';
import superagent from 'superagent';

import type CommandContext from './CommandContext';
import type ButtonContext from './ButtonContext';
import ButtonHandler from './ButtonHandler';
import * as functions from './Functions';
import type Database from './Database';
import type Metrics from './Metrics';
import type Command from './Command';
import Logger from './Logger';
import ScheduledQuestionHandler from './ScheduledQuestionHandler';
import ParanoiaHandler from './ParanoiaHandler';
import { ApplicationCommandContext, ApplicationCommandInstallationContext } from './Command';
import { InstanceConfig } from '../types/config';

const PASSTHROUGH_COMMANDS = ['settings'];

export default class Client {
  id: string;
  token: string;
  publicKey: string;
  discordAPIUrl: string;
  config: InstanceConfig;

  commands: Command[];
  console: Logger;
  metrics: Metrics;
  database: Database;
  buttonHandler: ButtonHandler;
  paranoiaHandler: ParanoiaHandler;
  scheduledQuestionHandler: ScheduledQuestionHandler;
  functions: typeof functions;

  suggestCooldowns: Record<string, number>;
  stats: {
    minuteCommandCount: number;
    pastCommandCounts: number[];
    commands: Record<string, number>;
    minuteCommands: Record<string, number>;
  };

  static COLORS = {
    WHITE: 0xffffff,
    BLURPLE: 0x5865f2,
    GREYPLE: 0x99aab5,
    DARK_BUT_NOT_BLACK: 0x2c2f33,
    NOT_QUITE_BLACK: 0x23272a,
    GREEN: 0x57f287,
    YELLOW: 0xfee75c,
    FUSCHIA: 0xeb459e,
    RED: 0xed4245,
    BLACK: 0xffffff,
    BLUE: 0x3498db,
  } as const;
  static EMOTES = {
    checkmark: ':white_check_mark:',
    xmark: ':x:',
    time: ':stopwatch:',
    trackball: ':trackball:',
    question: '<:qmark_blurple:1203771072197955636>',
    gear: '<:gear_blurple:1203771800996155472>',
    warning: ':warning:',
    graph: ':chart_with_upwards_trend:',
    sparkles: ':sparkles:',
    animated_sparkles: '<a:animated_sparkles:1204952794772279336>',
    info: ':information_source:',
    arrowUp: ':arrow_up:',
    star: ':star:',
    shushing_face: ':shushing_face:',
    earth: ':earth_asia:',
    delete: '<:delete:927979243844038657>',
    beta1: '<:beta1:955232478463930398>',
    beta2: '<:beta2:955232478434586645>',
    running: ':person_running:',
    technologist: ':technologist:',
    heart: ':heart:',
    bank: ':bank:',
    open_mouth: ':open_mouth:',
    logo: '<:tod_logo:1203770064826794065>',
    premium: '<:premium_badge:1255737711063601224> ',
  } as const;
  static LANGUAGES = {
    en: 'English',
    bn: 'বাংলা (Bengali)',
    de: 'Deutsch (German)',
    es: 'Español (Spanish)',
    fr: 'Français (French)',
    hi: 'हिंदी (Hindi)',
    tl: 'Tagalog',
  } as const;

  constructor({
    config,
    metrics,
    database,
  }: {
    config: InstanceConfig;
    metrics: Metrics;
    database: Database;
  }) {
    this.id = config.applicationId;
    this.token = config.token;
    this.publicKey = config.publicKey;
    this.discordAPIUrl = config.discordApiUrl || 'https://discord.com';
    this.config = config;

    this.suggestCooldowns = {};
    this.stats = {
      minuteCommandCount: 0,
      pastCommandCounts: [],
      commands: {},
      minuteCommands: {},
    };

    this.commands = [];
    this.console = new Logger('ToD' + (config.enableR ? ' R' : ''));
    this.metrics = metrics;
    this.functions = functions;
    this.database = database;
    this.buttonHandler = new ButtonHandler(this);
    this.paranoiaHandler = new ParanoiaHandler(this);
    this.scheduledQuestionHandler = new ScheduledQuestionHandler(this);
  }

  get inviteUrl() {
    return `https://discord.com/oauth2/authorize?client_id=${this.id}&permissions=19456&scope=bot%20applications.commands`;
  }

  get COLORS() {
    return Client.COLORS;
  }
  get EMOTES() {
    return Client.EMOTES;
  }
  get LANGUAGES() {
    return Client.LANGUAGES;
  }

  async start() {
    this.console.log(`Using API URL: ${this.discordAPIUrl}`);
    this.scheduledQuestionHandler.start();
    await this.loadCommands();
    for (const { name } of this.commands) {
      this.stats.commands[name] = 0;
      this.stats.minuteCommands[name] = 0;
    }
    this.console.success(`Loaded ${this.commands.length} commands!`);

    setInterval(() => {
      this.stats.pastCommandCounts.unshift(this.stats.minuteCommandCount);
      if (this.stats.pastCommandCounts.length > 30) this.stats.pastCommandCounts.pop();
      for (const command in this.stats.minuteCommands) {
        this.stats.minuteCommands[command] = 0;
      }
      this.stats.minuteCommandCount = 0;
    }, 60 * 1000);
  }

  async handleCommand(ctx: CommandContext) {
    if ((await ctx.channelSettings).muted && !PASSTHROUGH_COMMANDS.includes(ctx.command.name))
      return ctx.reply({
        content:
          this.EMOTES.xmark + ' I am muted in this channel. Use `/settings unmute` to unmute me.',
        flags: 1 << 6,
      });
    const command = this.commands.find(c => c.name === ctx.command.name);
    if (!command)
      return this.console.error(
        `Command ${ctx.command.name} was run with no corresponding command file.`
      );

    // Statistics
    this.stats.minuteCommandCount++;
    this.stats.commands[command.name]++;
    this.stats.minuteCommands[command.name]++;

    try {
      await command.run(ctx);
    } catch (err) {
      this.console.error(err);

      // Track error with Sentry
      Sentry.withScope(scope => {
        scope.setExtras({
          user: `${functions.userTag(ctx.user)} (${ctx.user.id})`,
          command: command.name,
          args: JSON.stringify(ctx.options),
          channelId: ctx.channelId,
        });
        Sentry.captureException(err);
      });
      ctx.reply({
        content: `${this.EMOTES.xmark} Something went wrong while running that command.`,
        flags: 1 << 6,
      });
    }

    this.metrics.trackCommandUse(command.name, ctx.channel?.type || 0);
  }

  async handleButton(ctx: ButtonContext) {
    if ((await ctx.channelSettings).muted)
      return ctx.reply({
        content:
          this.EMOTES.xmark + ' I am muted in this channel. Use `/settings unmute` to unmute me.',
        flags: 1 << 6,
      });
    await this.buttonHandler.handleButton(ctx);
  }

  async getQuestion(
    ctx: {
      channelSettings: Promise<ChannelSettings>;
      premium: boolean;
      guildId?: string;
      channelId: string;
    },
    type?: QuestionType,
    rating?: Rating | 'NONE'
  ) {
    const disabledRatings = [...(await ctx.channelSettings).disabledRatings];
    if (this.config.enableR) {
      // R bot
      if (rating === 'NONE') rating = undefined;
      else rating = 'R';
    } else {
      // main bot
      disabledRatings.push('R');
      if (rating === 'NONE') rating = undefined;
    }
    const res = await this.database.getRandomQuestion(
      type,
      disabledRatings,
      rating,
      ctx.premium,
      ctx.guildId,
      ctx.channelId
    );
    return res;
  }

  async loadCommands() {
    const commandFileNames = readdirSync(`${__dirname}/../commands`).filter(f => f.endsWith('.js'));
    const globalCommands: Command[] = [];
    const guildOnly: { [id: string]: Command[] } = {};
    for (const commandFileName of commandFileNames) {
      const commandFile: Command = this.functions.deepCopy(
        (await import(`../commands/${commandFileName}`)).default
      );
      if (
        (commandFile.mainBotOnly && this.config.enableR) ||
        (commandFile.rBotOnly && !this.config.enableR)
      ) {
        continue; // ignore main bot commands on r bot & vice versa
      }
      if (typeof commandFile.default_member_permissions === 'undefined')
        commandFile.default_member_permissions = commandFile.perms.length
          ? commandFile.perms
              .map(perm => (typeof perm === 'bigint' ? perm : PermissionFlagsBits[perm]))
              .reduce((a, c) => a | c, 0n)
              .toString()
          : null;
      if (typeof commandFile.contexts === 'undefined')
        commandFile.contexts = [
          ApplicationCommandContext.Guild,
          ApplicationCommandContext.BotDM,
          ApplicationCommandContext.PrivateChannel,
        ]; // Enables for guilds, bot-user DMs, and group DMs by default
      if (typeof commandFile.integration_types === 'undefined')
        commandFile.integration_types = [
          ApplicationCommandInstallationContext.GuildInstall,
          ApplicationCommandInstallationContext.UserInstall,
        ]; // Enables for both guilds and users by default
      if (commandFile.options)
        this.removeRatings(commandFile.options as APIApplicationCommandOption[]);
      this.commands.push(commandFile);
      if (!commandFile.guildId) {
        globalCommands.push(commandFile);
      } else {
        commandFile.guildId.forEach(guildId => {
          if (!(guildId in guildOnly)) guildOnly[guildId] = [];
          guildOnly[guildId].push(commandFile);
        });
      }
    }
    const devMode = process.argv.includes('dev');
    if (devMode)
      this.console.log(
        'Global Commands: ' +
          ((await this.compareCommands(globalCommands))
            ? 'Changes detected'
            : 'No changes detected')
      );
    else await this.updateCommands(globalCommands);

    for (const guildId in guildOnly) {
      if (devMode)
        this.console.log(
          `GuildOnly Commands (${guildId}): ` +
            ((await this.compareCommands(guildOnly[guildId], guildId))
              ? 'Changes detected'
              : 'No changes detected')
        );
      else await this.updateCommands(guildOnly[guildId], guildId);
    }
  }

  removeRatings(options: APIApplicationCommandOption[]) {
    for (const option of options) {
      if ('choices' in option && option.type === ApplicationCommandOptionType.String) {
        if (this.config.enableR) {
          // R bot no pg or pg13
          option.choices = option.choices?.filter(c => c.value !== 'PG' && c.value !== 'PG13');
        } else {
          // main bot no R or random
          option.choices = option.choices?.filter(c => c.value !== 'R' && c.value !== 'NONE');
        }
      } else if ('options' in option && option.options) {
        this.removeRatings(option.options);
      }
    }
  }

  async compareCommands(commands: Command[], guildId?: string): Promise<boolean> {
    const commandList: APIApplicationCommand[] = await superagent
      .get(
        `${this.discordAPIUrl}/api/v9/applications/${this.id}${
          guildId ? `/guilds/${guildId}` : ''
        }/commands`
      )
      .set('Authorization', 'Bot ' + this.token)
      .then(res => res.body);

    return commands.some(
      com =>
        !this.functions.deepEquals(
          com,
          commandList.find(c => c.name === com.name),
          ['category', 'perms', 'run', 'guildId']
        )
    );
  }

  async updateCommands(commands: Command[], guildId?: string) {
    if (!(await this.compareCommands(commands, guildId))) return;
    this.console.log('Updating commands...');

    await superagent
      .put(
        `${this.discordAPIUrl}/api/v9/applications/${this.id}${
          guildId ? `/guilds/${guildId}` : ''
        }/commands`
      )
      .set('Authorization', 'Bot ' + this.token)
      .send(
        commands.map(c => ({
          ...c,
          perms: undefined,
          guild_id: guildId,
        }))
      );
    this.console.success(`Updated ${this.commands.length} slash commands`);
  }

  async webhookLog(type: string, data: RESTPostAPIWebhookWithTokenJSONBody) {
    await superagent
      .post(process.env[type.toUpperCase() + '_HOOK'] ?? '')
      .send(data)
      .catch(_ => null);
  }
}
