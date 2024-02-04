import type { APIApplicationCommandOption } from 'discord-api-types/v9';

import type { ReadOnly } from './OptionTypes';
import type { Permission } from './Functions';
import type Context from './Context';

export enum ApplicationCommandContext {
  Guild = 0, // Allow command in guilds
  BotDM = 1, // Allow command in user-bot DMs
  // PrivateChannel = 2, // Allow command in user-user or group DMs (not currently supported)
}

export default interface Command {
  name: string;
  description: string;
  category: 'question' | 'config' | 'premium';
  options?: ReadOnly<APIApplicationCommandOption[]>;
  perms: Permission[];
  contexts?: ApplicationCommandContext[];
  guildId?: string[];
  mainBotOnly?: boolean;
  rBotOnly?: boolean;
  default_member_permissions?: string | null;
  run: (ctx: Context) => Promise<void>;
}
