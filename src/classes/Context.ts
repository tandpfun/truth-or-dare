import {
  ApplicationCommandInteractionDataOptionSubCommandGroup,
  APIChatInputApplicationCommandInteractionDataResolved,
  ApplicationCommandInteractionDataOptionSubCommand,
  APIChatInputApplicationCommandInteractionData,
  APIApplicationCommandInteractionDataOption,
  APIChatInputApplicationCommandInteraction,
  APIInteractionResponseCallbackData,
  APIApplicationCommandInteraction,
  ApplicationCommandOptionType,
  APIInteractionGuildMember,
  InteractionResponseType,
  ApplicationCommandType,
  APIUser,
} from 'discord-api-types';
import type { ChannelSettings } from '@prisma/client';
import type { Response } from 'express';

import type Client from './Client';

export default class Context {
  rawInteraction: APIApplicationCommandInteraction;
  rawData: APIChatInputApplicationCommandInteractionData;
  response: Response;
  client: Client;
  command: { id: string; name: string; type: ApplicationCommandType };
  options: APIApplicationCommandInteractionDataOption[];
  args: (string | number | boolean)[];
  resolved: APIChatInputApplicationCommandInteractionDataResolved;
  applicationId: string;
  channelId: string;
  guildId: string;
  member: APIInteractionGuildMember;
  user: APIUser;

  constructor(
    interaction: APIChatInputApplicationCommandInteraction,
    client: Client,
    response: Response
  ) {
    this.rawInteraction = interaction;
    this.rawData = interaction.data;
    this.response = response;
    this.client = client;

    this.command = {
      id: interaction.data.id,
      name: interaction.data.name,
      type: interaction.data.type,
    };

    this.options = interaction.data.options || [];
    this.args = this.options.map(o =>
      o.type === ApplicationCommandOptionType.Subcommand ||
      o.type === ApplicationCommandOptionType.SubcommandGroup
        ? o.name
        : o.value
    );
    this.resolved = interaction.data.resolved;

    this.applicationId = interaction.application_id;
    this.channelId = interaction.channel_id;
    this.guildId = interaction.guild_id;

    this.member = interaction.member;
    this.user = interaction.user || interaction.member.user;
  }

  getOption(name: string) {
    const mainResult = this.options.find(o => o.name === name);
    if (mainResult) return mainResult;
    if (
      ![
        ApplicationCommandOptionType.Subcommand,
        ApplicationCommandOptionType.SubcommandGroup,
      ].includes(this.options[0]?.type)
    )
      return null;
    const firstRes = (
      (
        this.options[0] as
          | ApplicationCommandInteractionDataOptionSubCommandGroup
          | ApplicationCommandInteractionDataOptionSubCommand
      ).options as (
        | ApplicationCommandInteractionDataOptionSubCommandGroup
        | ApplicationCommandInteractionDataOptionSubCommand
      )[]
    ).find(o => o.name === name);
    if (firstRes) return firstRes;
    if (
      (
        this.options[0] as
          | ApplicationCommandInteractionDataOptionSubCommandGroup
          | ApplicationCommandInteractionDataOptionSubCommand
      ).options[0]?.type !== ApplicationCommandOptionType.Subcommand
    )
      return null;
    const secondRes = (
      (this.options[0] as ApplicationCommandInteractionDataOptionSubCommandGroup)
        .options[0] as ApplicationCommandInteractionDataOptionSubCommand
    ).options.find(o => o.name === name);
    if (secondRes) return secondRes;
    return null;
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
