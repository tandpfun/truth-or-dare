import {
  APIChatInputApplicationCommandInteractionDataResolved,
  APIInteractionResponseCallbackData,
  APIInteractionGuildMember,
  InteractionResponseType,
  APIUser,
  APIMessageComponentInteraction,
  APIMessageButtonInteractionData,
  ComponentType,
} from 'discord-api-types';
import type { ChannelSettings } from '@prisma/client';
import type { Response } from 'express';
import type Client from './Client';

export default class ButtonContext {
  interaction: APIMessageComponentInteraction;
  data: APIMessageButtonInteractionData;
  response: Response;
  client: Client;
  resolved?: APIChatInputApplicationCommandInteractionDataResolved;
  applicationId: string;
  channelId: string;
  guildId?: string;
  member?: APIInteractionGuildMember;
  user: APIUser;
  messageId: string;

  constructor(interaction: APIMessageComponentInteraction, client: Client, response: Response) {
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
  }

  reply(data: string | APIInteractionResponseCallbackData) {
    if (typeof data === 'string') data = { content: data };
    this.response.send({
      type: InteractionResponseType.ChannelMessageWithSource,
      data,
    });
  }

  get channelSettings(): Promise<ChannelSettings> {
    return this.client.database.fetchChannelSettings(this.channelId, !this.guildId);
  }
}
