import { readdirSync } from 'fs';
import os from 'os';

import {
  RESTPostAPIWebhookWithTokenJSONBody,
  APIApplicationCommand,
  PermissionFlagsBits,
} from 'discord-api-types/v9';
import * as Sentry from '@sentry/node';
import superagent from 'superagent';

import * as functions from './Functions.js';
import type Command from './Command.js';
import Database from './Database.js';
import Metrics from './Metrics.js';
import Logger from './Logger.js';
import Server from './Server.js';

export default class Client {
  token: string;
  id: string;
  publicKey: string;
  port: number;
  developers: string[];
  commands: Command[];
  console: Logger;
  metrics: Metrics;
  functions: typeof functions;
  server: Server;
  database: Database;

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
    question: ':question:',
    gear: ':gear:',
    warning: ':warning:',
    graph: ':chart_with_upwards_trend:',
    sparkles: ':sparkles:',
    info: ':information_source:',
    arrowUp: ':arrow_up:',
    star: ':star:',
    shushing_face: ':shushing_face:',
    earth: ':earth_asia:',
    delete: '<:delete:927979243844038657>',
    beta1: '<:beta1:955232478463930398>',
    beta2: '<:beta2:955232478434586645>',
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
    token,
    applicationId,
    publicKey,
    port,
  }: {
    token: string;
    applicationId: string;
    publicKey: string;
    port: number;
  }) {
    this.token = token;
    this.id = applicationId;
    this.publicKey = publicKey;
    this.port = port;
    this.developers = [
      '393294718345412618',
      '276544649148235776',
      '358776042829119498',
      '472176262291390464',
    ];

    if (!this.devMode && process.env.SENTRY_DSN) {
      Sentry.init({ dsn: process.env.SENTRY_DSN });
      process.on('unhandledRejection', err => {
        Sentry.captureException(err);
      });
    }

    this.suggestCooldowns = {};
    this.stats = {
      minuteCommandCount: 0,
      pastCommandCounts: [],
      commands: {},
      minuteCommands: {},
    };

    this.commands = [];
    this.console = new Logger('ToD');
    this.metrics = new Metrics(this);
    this.functions = functions;
    this.server = new Server(this.port, this);
    this.database = new Database(this);
  }

  get devMode() {
    return process.argv.includes('dev');
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
    this.console.log(`Starting Truth or Dare...`);
    await this.loadCommands();
    for (const { name } of this.commands) {
      this.stats.commands[name] = 0;
      this.stats.minuteCommands[name] = 0;
    }
    if (this.devMode)
      this.console.log((await this.compareCommands()) ? 'Changes detected' : 'No changes detected');
    else await this.updateCommands();
    this.console.success(`Loaded ${this.commands.length} commands!`);
    await this.database.start();
    this.server.start();

    setInterval(() => {
      this.stats.pastCommandCounts.unshift(this.stats.minuteCommandCount);
      if (this.stats.pastCommandCounts.length > 30) this.stats.pastCommandCounts.pop();
      if (!this.devMode && process.env.STATCORD_KEY)
        this.postToStatcord(this.stats.minuteCommandCount, this.stats.minuteCommands);
      for (const command in this.stats.minuteCommands) {
        this.stats.minuteCommands[command] = 0;
      }
      this.stats.minuteCommandCount = 0;
    }, 60 * 1000);
  }

  async loadCommands() {
    const commandFileNames = readdirSync(`${__dirname}/../commands`).filter(f => f.endsWith('.js'));
    for (const commandFileName of commandFileNames) {
      const commandFile: Command = (await import(`../commands/${commandFileName}`)).default;
      if (typeof commandFile.default_member_permissions === 'undefined')
        commandFile.default_member_permissions = commandFile.perms.length
          ? commandFile.perms
              .map(perm => (typeof perm === 'bigint' ? perm : PermissionFlagsBits[perm]))
              .reduce((a, c) => a | c, 0n)
              .toString()
          : null;
      this.commands.push(commandFile);
    }
  }

  async compareCommands(): Promise<boolean> {
    const commandList: APIApplicationCommand[] = await superagent
      .get(`https://discord.com/api/v9/applications/${this.id}/commands`)
      .set('Authorization', 'Bot ' + this.token)
      .then(res => res.body);

    return this.commands.some(
      com =>
        !this.functions.deepEquals(
          com,
          commandList.find(c => c.name === com.name),
          ['category', 'perms', 'run']
        )
    );
  }

  async updateCommands() {
    if (!(await this.compareCommands())) return;
    this.console.log('Updating commands...');

    await superagent
      .put(`https://discord.com/api/v9/applications/${this.id}/commands`)
      .set('Authorization', 'Bot ' + this.token)
      .send(
        this.commands.map(c => ({
          ...c,
          perms: undefined,
        }))
      );
    this.console.success(`Updated ${this.commands.length} slash commands`);
  }

  async postToStatcord(minuteCommandCount: number, minuteCommands: { [command: string]: number }) {
    const activeMem = os.totalmem() - os.freemem();

    await superagent
      .post(`https://api.statcord.com/v3/stats`)
      .send({
        id: this.id,
        key: process.env.STATCORD_KEY,
        servers: 200000,
        users: 0,
        active: [],
        commands: minuteCommandCount,
        popular: Object.entries(minuteCommands).map(([name, count]) => ({ name, count })),
        memactive: activeMem,
        memload: (activeMem / os.totalmem()) * 100,
        cpuload: 0,
        bandwidth: 0,
      })
      .then(res => res.body)
      .catch(_ => null);
  }

  async webhookLog(type: string, data: RESTPostAPIWebhookWithTokenJSONBody) {
    await superagent
      .post(process.env[type.toUpperCase() + '_HOOK'] ?? '')
      .send(data)
      .catch(_ => null);
  }
}
