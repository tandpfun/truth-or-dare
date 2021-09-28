import { APIApplicationCommandArgumentOptions, PermissionFlagsBits } from 'discord-api-types/v9';
import Client from './Client';
import Context from './Context';

export interface CommandOptions {
  description?: string;
  options?: APIApplicationCommandArgumentOptions[];
  perms?: (
    | keyof typeof PermissionFlagsBits
    | typeof PermissionFlagsBits[keyof typeof PermissionFlagsBits]
  )[];
}

export default class Command {
  name: string;
  client: Client;
  description: string;
  options: APIApplicationCommandArgumentOptions[];
  perms: CommandOptions['perms'];

  constructor(name: string, client: Client, options: CommandOptions = {}) {
    this.name = name;
    this.client = client;
    this.description = options.description || '';
    this.options = options.options || [];
    this.perms = options.perms || [];
  }

  async run(ctx: Context) {
    throw new Error(`The ${this.name} command has not implemented a run method.`);
  }

  async validate(context: Context) {
    const required = this.perms
      .map(perm => (typeof perm === 'bigint' ? perm : PermissionFlagsBits[perm]))
      .reduce((a, c) => a & c, 0n);

    if ((BigInt(context.member.permissions) & required) !== required) {
      await context.reply(`${this.client.EMOTES.xmark} you need more perms`); // TODO: better message
      return false;
    }
    return true;
  }
}
