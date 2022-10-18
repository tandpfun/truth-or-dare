import {
  APIApplicationCommandInteractionDataSubcommandGroupOption,
  APIChatInputApplicationCommandInteractionDataResolved,
  APIApplicationCommandInteractionDataSubcommandOption,
  APIChatInputApplicationCommandInteractionData,
  APIApplicationCommandInteractionDataOption,
  APIInteractionResponseCallbackData,
  APIApplicationCommandInteraction,
  ApplicationCommandOptionType,
  APIApplicationCommandOption,
  APIInteractionGuildMember,
  InteractionResponseType,
  ApplicationCommandType,
  APIUser,
} from 'discord-api-types/v9';
import type { ChannelSettings } from '@prisma/client';
import type { FastifyReply } from 'fastify';

import { APIChatInputApplicationCommandInteractionWithEntitlements } from './PremiumTypes';
import type { OptionType } from './OptionTypes';
import type Context from './Context';
import type Client from './Client';

export default class CommandContext implements Context {
  rawInteraction: APIApplicationCommandInteraction;
  rawData: APIChatInputApplicationCommandInteractionData;
  response: FastifyReply;
  client: Client;
  command: { id: string; name: string; type: ApplicationCommandType };
  options: APIApplicationCommandInteractionDataOption[];
  args: (string | number | boolean)[];
  resolved?: APIChatInputApplicationCommandInteractionDataResolved;
  applicationId: string;
  channelId: string;
  guildId?: string;
  member?: APIInteractionGuildMember;
  user: APIUser;
  entitlements?: string[];
  premium: boolean;

  constructor(
    interaction: APIChatInputApplicationCommandInteractionWithEntitlements,
    client: Client,
    response: FastifyReply
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
    this.user = interaction.user || interaction.member!.user;

    this.entitlements = interaction.entitlement_sku_ids;
    this.premium =
      !!this.guildId &&
      (!!this.entitlements?.length || this.client.database.isChargebeePremiumGuild(this.guildId));
  }

  getOption<O extends APIApplicationCommandOption>(name: string): OptionType<O> | undefined {
    const mainResult = this.options.find(o => o.name === name);
    if (mainResult) return mainResult as OptionType<O>;
    if (
      ![
        ApplicationCommandOptionType.Subcommand,
        ApplicationCommandOptionType.SubcommandGroup,
      ].includes(this.options[0]?.type)
    )
      return;
    const firstRes = (
      (
        this.options[0] as
          | APIApplicationCommandInteractionDataSubcommandGroupOption
          | APIApplicationCommandInteractionDataSubcommandOption
      ).options as (
        | APIApplicationCommandInteractionDataSubcommandGroupOption
        | APIApplicationCommandInteractionDataSubcommandOption
      )[]
    )?.find(o => o.name === name);
    if (firstRes) return firstRes as OptionType<O>;
    if (
      (
        this.options[0] as
          | APIApplicationCommandInteractionDataSubcommandGroupOption
          | APIApplicationCommandInteractionDataSubcommandOption
      ).options?.[0]?.type !== ApplicationCommandOptionType.Subcommand
    )
      return;
    const secondRes = (
      (this.options[0] as APIApplicationCommandInteractionDataSubcommandGroupOption)
        .options[0] as APIApplicationCommandInteractionDataSubcommandOption
    ).options?.find(o => o.name === name);
    if (secondRes) return secondRes as OptionType<O>;
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
    this.response.send({
      type: 10,
    });
  }

  get channelSettings(): Promise<ChannelSettings> {
    return this.client.database.fetchChannelSettings(this.channelId, !this.guildId);
  }
}
