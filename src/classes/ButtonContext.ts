import {
  APIInteractionResponseCallbackData,
  APIMessageButtonInteractionData,
  APIMessageComponentInteraction,
  APIApplicationCommandOption,
  APIInteractionGuildMember,
  InteractionResponseType,
  ComponentType,
  APIUser,
} from 'discord-api-types/v9';
import type { ChannelSettings } from '@prisma/client';
import type { FastifyReply } from 'fastify';

import { APIMessageComponentInteractionWithEntitlements } from './PremiumTypes';
import type { OptionType } from './OptionTypes';
import type Context from './Context';
import type Client from './Client';

export default class ButtonContext implements Context {
  interaction: APIMessageComponentInteraction;
  data: APIMessageButtonInteractionData;
  response: FastifyReply;
  client: Client;
  applicationId: string;
  channelId: string;
  guildId?: string;
  member?: APIInteractionGuildMember;
  user: APIUser;
  messageId: string;
  args: (string | number | boolean)[] = [];
  entitlements?: string[];
  premium: boolean;

  constructor(
    interaction: APIMessageComponentInteractionWithEntitlements,
    client: Client,
    response: FastifyReply
  ) {
    if (interaction.data.component_type !== ComponentType.Button)
      throw new Error('The component type is not a button.');

    this.interaction = interaction;
    this.data = interaction.data;
    this.response = response;
    this.client = client;

    this.applicationId = interaction.application_id;
    this.messageId = interaction.message.id;
    this.channelId = interaction.channel_id;
    this.guildId = interaction.guild_id;

    this.member = interaction.member;
    this.user = interaction.user || interaction.member!.user;

    this.entitlements = interaction.entitlement_sku_ids;
    this.premium =
      !!this.guildId &&
      (!!this.entitlements?.length || this.client.database.isChargebeePremiumGuild(this.guildId));
  }
  getOption<O extends APIApplicationCommandOption>(_name: string): OptionType<O> | undefined {
    return;
  }

  reply(data: string | APIInteractionResponseCallbackData) {
    if (typeof data === 'string') data = { content: data };
    this.response.send({
      type: InteractionResponseType.ChannelMessageWithSource,
      data,
    });
  }

  replyUpsell() {
    if (!this.client.enableR) {
      this.response.send({
        type: 10, // Only use type 10 if bot has Discord premium
      });
    } else {
      this.reply(
        'This command requires Truth or Dare Premium. Upgrade now to unlock these features at <https://truthordarebot.xyz/premium>.'
      );
    }
  }

  defer() {
    this.response.send({
      type: InteractionResponseType.DeferredMessageUpdate,
    });
  }

  get channelSettings(): Promise<ChannelSettings> {
    return this.client.database.fetchChannelSettings(this.channelId, !this.guildId);
  }
}
