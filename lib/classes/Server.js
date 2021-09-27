import express from 'express';
import { verifyKeyMiddleware, InteractionType } from 'discord-interactions';
import Context from './Context.js';

export default class WebServer {
  constructor(port, client) {
    this.port = port;
    this.client = client;
    this.router = express();

    this.router.post(
      '/interactions',
      verifyKeyMiddleware(this.client.publicKey),
      (req, res) => {
        return this.handleRequest(req, res);
      }
    );
  }

  async start() {
    await this.router.listen(this.port, () =>
      this.client.console.success(
        `Listening for requests on port ${this.port}!`
      )
    );
  }

  async handleRequest(req, res) {
    const interaction = req.body;
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      const ctx = new Context(interaction, res);
      this.handleCommand(ctx);
    }
  }

  async handleCommand(ctx) {
    const command = this.client.commands.get(ctx.command.name);
    if (!command)
      throw new Error(
        `Command ${ctx.command.name} was run with no corresponding command file.`
      );
    return command.run(ctx);
  }
}
