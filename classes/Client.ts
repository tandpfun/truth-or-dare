import { readdirSync } from 'fs';
import Logger from './Logger.js';
import Server from './Server.js';
import Command from './Command.js';
import * as functions from './Functions.js';
import dare from '../src/questions/dare.json';
import nhie from '../src/questions/nhie.json';
import truth from '../src/questions/truth.json';
import wyr from '../src/questions/wyr.json';

export default class Client {
  token: string;
  id: string;
  publicKey: string;
  port: number;
  commands: Command[];
  console: Logger;
  functions: typeof functions;
  server: Server;
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

    this.questions = { dare, nhie, truth, wyr } as const;
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
    this.console.success(`Loaded ${this.commands.length} commands!`);
    // Eventually post slash commands
    // await this.loadQuestions();
    this.server.start();
  }

  async loadCommands() {
    const commandFileNames = readdirSync(`${__dirname}/../src/commands`).filter(f =>
      f.endsWith('.js')
    );
    for (const commandFileName of commandFileNames) {
      const commandFile: Command = (await import(`../src/commands/${commandFileName}`)).default;
      this.commands.push(commandFile);
    }
  }

  randomQuestion(type: keyof Client['questions'], rating: keyof Client['questions'][typeof type]) {
    const questions = this.questions[type][rating];
    return questions[Math.floor(Math.random() * questions.length)];
  }
}
