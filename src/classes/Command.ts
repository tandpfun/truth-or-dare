import type { APIApplicationCommandOption } from 'discord-api-types/v9';

import type { ReadOnly } from './OptionTypes';
import type { Permission } from './Functions';
import type Context from './Context';

export default interface Command {
  name: string;
  description: string;
  category: 'question' | 'control';
  options?: ReadOnly<APIApplicationCommandOption[]>;
  perms: Permission[];
  run: (ctx: Context) => Promise<void>;
}
