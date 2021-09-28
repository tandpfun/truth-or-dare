import { InteractionResponseType } from 'discord-interactions';
import {
  APIApplicationCommandInteraction,
  APIApplicationCommandInteractionDataOption,
  APIChatInputApplicationCommandInteraction,
  APIChatInputApplicationCommandInteractionData,
  APIChatInputApplicationCommandInteractionDataResolved,
  APIInteractionGuildMember,
  APIInteractionResponseCallbackData,
  APIUser,
  ApplicationCommandOptionType,
  ApplicationCommandType,
} from 'discord-api-types/v9';
import { Response } from 'express';
import Client from './Client';

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
    this.user = interaction.user;
  }

  getOption(name: string) {
    return this.options.find(o => o.name === name);
  }

  async reply(data: string | APIInteractionResponseCallbackData) {
    if (typeof data === 'string') data = { content: data };
    await this.response.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data,
    });
  }
}
