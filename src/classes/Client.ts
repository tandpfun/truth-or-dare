import { readdirSync } from 'fs';
import Logger from './Logger.js';
import Server from './Server.js';
import Command from './Command.js';
import * as functions from './Functions.js';
import dare from '../questions/dare.json';
import nhie from '../questions/nhie.json';
import truth from '../questions/truth.json';
import wyr from '../questions/wyr.json';
import { APIApplicationCommand } from 'discord-api-types';
import superagent from 'superagent';
import Database from './Database.js';

export default class Client {
  token: string;
  id: string;
  publicKey: string;
  port: number;
  commands: Command[];
  console: Logger;
  functions: typeof functions;
  server: Server;
  database: Database;
  questions: {
    readonly dare: { r: string[]; pg13: string[]; pg: string[] };
    readonly nhie: { r: string[]; pg13: string[]; pg: string[] };
    readonly truth: { r: string[]; pg13: string[]; pg: string[] };
    readonly wyr: { r: string[]; pg13: string[]; pg: string[] };
  };

  static COLORS = {
    WHITE: 0xffffff,
    BLURPLE: 0x5865f2,
    GREYPLE: 0x99aab5,
    DARK_BUT_NOT_BLACK: 0x2c2f33,
    NOT_QUITE_BLACK: 0x23272a,
    GREEN: 0x57f287,
    YELLOW: 0xfee7c,
    FUSCHIA: 0xeb459e,
    RED: 0xed4245,
    BLACK: 0xffffff,
    BLUE: 0x3498db,
  } as const;
  static EMOTES = {
    checkmark: ':white_check_mark:',
    xmark: ':x:',
    time: ':stopwatch:',
    question: ':question:',
    gear: ':gear:',
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

    this.commands = [];
    this.console = new Logger('ToD');
    this.functions = functions;
    this.server = new Server(this.port, this);
    this.database = new Database(this);

    this.questions = { dare, nhie, truth, wyr } as const;
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

  async start() {
    this.console.log(`Starting Truth or Dare...`);
    await this.loadCommands();
    await this.updateCommands();
    this.console.success(`Loaded ${this.commands.length} commands!`);
    await this.database.start();
    this.server.start();
  }

  async loadCommands() {
    const commandFileNames = readdirSync(`${__dirname}/../commands`).filter(f => f.endsWith('.js'));
    for (const commandFileName of commandFileNames) {
      const commandFile: Command = (await import(`../commands/${commandFileName}`)).default;
      this.commands.push(commandFile);
    }
  }

  randomQuestion(
    type: keyof Client['questions'],
    ratings?: (keyof Client['questions'][typeof type])[]
  ) {
    const rates = ratings ?? ['pg', 'pg13', 'r'];
    const rating = rates[Math.floor(Math.random() * rates.length)];
    const questions = this.questions[type][rating];
    const index = Math.floor(Math.random() * questions.length);
    return {
      type,
      rating,
      index,
      question: questions[index],
    };
  }

  async compareCommands(): Promise<boolean> {
    const commandList: APIApplicationCommand[] = await superagent
      .get(`https://discord.com/api/v9/applications/${this.id}/commands`)
      .set('Authorization', 'Bot ' + this.token)
      .then(res => res.body);

    return this.commands.some(com => {
      const command: APIApplicationCommand | undefined = commandList.find(c => c.name === com.name);

      return (
        !command ||
        com.description !== command.description ||
        JSON.stringify(command.options || []) !== JSON.stringify(com.options)
      );
    });
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
}
