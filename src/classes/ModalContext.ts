import {
  APIInteractionResponseCallbackData,
  APIApplicationCommandOption,
  APIInteractionGuildMember,
  InteractionResponseType,
  APIUser,
  APIModalInteractionResponseCallbackData,
  APIModalSubmitInteraction,
  APIModalSubmission,
  InteractionType,
  MessageFlags,
  APIChannel,
} from 'discord-api-types/v9';
import type { ChannelSettings } from '@prisma/client';
import type { FastifyReply } from 'fastify';

import type { OptionType } from './OptionTypes';
import type Client from './Client';
import { APIEntitlement } from 'discord-api-types/v10';

export default class ModalContext {
  interaction: APIModalSubmitInteraction;
  data: APIModalSubmission;
  response: FastifyReply;
  client: Client;
  applicationId: string;
  channelId?: string;
  guildId?: string;
  member?: APIInteractionGuildMember;
  user: APIUser;
  messageId?: string;
  args: (string | number | boolean)[] = [];
  entitlements?: APIEntitlement[];
  premium: boolean;
  channel?: Partial<APIChannel> & Pick<APIChannel, 'id' | 'type'>;

  constructor(interaction: APIModalSubmitInteraction, client: Client, response: FastifyReply) {
    if (interaction.type !== InteractionType.ModalSubmit)
      throw new Error('The component type is not a button.');

    this.interaction = interaction;
    this.data = interaction.data;
    this.response = response;
    this.client = client;

    this.applicationId = interaction.application_id;
    this.messageId = interaction.message?.id;
    this.channelId = interaction.channel_id;
    this.guildId = interaction.guild_id;

    this.member = interaction.member;
    this.user = interaction.user || interaction.member!.user;

    this.channel = interaction.channel;

    this.entitlements = interaction.entitlements;
    this.premium =
      !!this.guildId &&
      (!!this.entitlements.some(entitlement => entitlement.sku_id == this.client.premiumSKU) ||
        this.client.database.isChargebeePremiumGuild(this.guildId));
  }
  getOption<O extends APIApplicationCommandOption>(_name: string): OptionType<O> | undefined {
    return;
  }

  reply(data: string | APIInteractionResponseCallbackData, options?: { ephemeral?: boolean }) {
    if (typeof data === 'string') data = { content: data };
    if (options?.ephemeral) {
      if (data.flags) data.flags |= MessageFlags.Ephemeral;
      else data.flags = MessageFlags.Ephemeral;
    }
    this.response.send({
      type: InteractionResponseType.ChannelMessageWithSource,
      data,
    });
  }

  replyUpsell() {
    this.reply(this.client.functions.premiumUpsell(this.client.premiumSKU));
  }

  replyModal(data: APIModalInteractionResponseCallbackData) {
    this.response.send({
      type: InteractionResponseType.Modal,
      data,
    });
  }

  defer() {
    this.response.send({
      type: InteractionResponseType.DeferredMessageUpdate,
    });
  }

  get channelSettings(): Promise<ChannelSettings> {
    return this.client.database.fetchChannelSettings(this.channelId!, !this.guildId);
  }
}
