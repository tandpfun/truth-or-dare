import { APIApplicationCommandOption, PermissionFlagsBits } from 'discord-api-types';

import type { ReadOnly } from './OptionTypes';
import type Context from './Context';

export default interface Command {
  name: string;
  description: string;
  category: 'question' | 'control';
  options?: ReadOnly<APIApplicationCommandOption[]>;
  perms: (
    | keyof typeof PermissionFlagsBits
    | typeof PermissionFlagsBits[keyof typeof PermissionFlagsBits]
  )[];
  run: (ctx: Context) => Promise<void>;
}
