import express, { Express, Request, Response } from 'express';
import { verifyKeyMiddleware, InteractionType } from 'discord-interactions';
import Context from './Context';
import type Client from './Client';

export default class Server {
  port: number;
  client: Client;
  router: Express;

  constructor(port: number, client: Client) {
    this.port = port;
    this.client = client;
    this.router = express();

    this.router.post('/interactions', verifyKeyMiddleware(this.client.publicKey), (req, res) =>
      this.handleRequest(req, res)
    );
  }

  start() {
    this.router.listen(this.port, () =>
      this.client.console.success(`Listening for requests on port ${this.port}!`)
    );
  }

  async handleRequest(req: Request, res: Response) {
    const interaction = req.body;
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      const ctx = new Context(interaction, res);
      await this.handleCommand(ctx);
    }
  }

  async handleCommand(ctx: Context) {
    const command = this.client.commands.find(c => c.name === ctx.command.name);
    if (!command)
      return this.client.console.error(
        `Command ${ctx.command.name} was run with no corresponding command file.`
      );
    if (!(await command.validate(ctx))) return;
    await command.run(ctx);
  }
}
