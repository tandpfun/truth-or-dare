import { APIApplicationCommandOption, PermissionFlagsBits } from 'discord-api-types/v9';
import Context from './Context';

export default interface Command {
  name: string;
  description: string;
  options: APIApplicationCommandOption[];
  perms: (
    | keyof typeof PermissionFlagsBits
    | typeof PermissionFlagsBits[keyof typeof PermissionFlagsBits]
  )[];
  run: (ctx: Context) => Promise<void>;
}