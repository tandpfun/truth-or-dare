import type {
  APIChatInputApplicationCommandInteractionDataResolved,
  APIInteractionResponseCallbackData,
  APIApplicationCommandOption,
  APIInteractionGuildMember,
  APIUser,
  RESTPatchAPIInteractionFollowupJSONBody,
} from 'discord-api-types/v9';
import type { ChannelSettings } from '@prisma/client';

import { OptionType } from './OptionTypes';
import type Client from './Client';
import { APIApplicationEntitlement } from '../types/premium';

export default interface Context {
  client: Client;
  args: (string | number | boolean)[];
  resolved?: APIChatInputApplicationCommandInteractionDataResolved;
  channelId: string;
  guildId?: string;
  member?: APIInteractionGuildMember;
  user: APIUser;
  appPermissions?: string;
  entitlements?: APIApplicationEntitlement[];
  premium: boolean;

  getOption<O extends APIApplicationCommandOption>(name: string): OptionType<O> | undefined;
  reply(data: string | APIInteractionResponseCallbackData, options?: { ephemeral?: boolean }): void;
  replyUpsell(): void;
  editResponse(data: string | RESTPatchAPIInteractionFollowupJSONBody, messageId?: string): void;
  get channelSettings(): Promise<ChannelSettings>;
}
