import { Collection } from 'discord.js';
import Functions from './Functions.js';
import Logger from './Logger.js';
import { readFileSync } from 'fs';
import WebServer from './Server.js';

export default class Client {
  constructor({ token, applicationId, publicKey, port }) {
    this.token = token;
    this.id = applicationId;
    this.publicKey = publicKey;
    this.port = port;

    this.console = new Logger('ToD');
    this.commands = new Collection();
    this.functions = new Functions();
    this.webServer = new WebServer(this.port, this);

    this.questions = {};
  }

  async start() {
    this.console.log(`Starting Truth or Dare...`);
    await this.loadCommands();
    this.console.success(`Loaded ${this.commands.size} commands!`);
    // Eventually post slash commands
    // await this.loadQuestions();
    await this.webServer.start();
  }

  async loadCommands() {
    const commandFileNames = this.functions.getFiles('./src/commands', '.js');
    for (const commandFileName of commandFileNames) {
      const commandName = commandFileName.split('.js')[0];
      const commandFile = (await import(`../../src/commands/${commandName}.js`))
        .default;
      const command = new commandFile(commandName, this.client);
      this.commands.set(commandName, command);
    }
  }

  async loadQuestions() {
    const questionFileNames = this.functions.getFiles(
      './src/questions',
      '.quf'
    );
    for (const questionFileName of questionFileNames) {
      const questionName = questionFileName.split('.quf')[0];
      const questionFile = readFileSync(
        `./src/questions/${questionFileName}`
      ).toString();
      this.questions[questionName] = {};
    }
  }
}
