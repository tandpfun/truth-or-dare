import type {
  APIChatInputApplicationCommandInteractionDataResolved,
  APIInteractionResponseCallbackData,
  APIApplicationCommandOption,
  APIInteractionGuildMember,
  APIUser,
} from 'discord-api-types/v9';
import type { ChannelSettings } from '@prisma/client';

import { OptionType } from './OptionTypes';
import type Client from './Client';

export default interface Context {
  client: Client;
  args: (string | number | boolean)[];
  resolved?: APIChatInputApplicationCommandInteractionDataResolved;
  channelId: string;
  guildId?: string;
  member?: APIInteractionGuildMember;
  user: APIUser;
  appPermissions?: string;
  entitlements?: string[];
  premium: boolean;

  getOption<O extends APIApplicationCommandOption>(name: string): OptionType<O> | undefined;
  reply(data: string | APIInteractionResponseCallbackData, options?: { ephemeral?: boolean }): void;
  replyUpsell(): void;
  get channelSettings(): Promise<ChannelSettings>;
}
