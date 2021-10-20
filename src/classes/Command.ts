import { APIApplicationCommandOption, PermissionFlagsBits } from 'discord-api-types';

import type Context from './Context';

export default interface Command {
  name: string;
  description: string;
  category: 'question' | 'control';
  options?: APIApplicationCommandOption[];
  perms: (
    | keyof typeof PermissionFlagsBits
    | typeof PermissionFlagsBits[keyof typeof PermissionFlagsBits]
  )[];
  run: (ctx: Context) => Promise<void>;
}
