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
  APIModalInteractionResponseCallbackData,
  MessageFlags,
  RESTPatchAPIInteractionFollowupJSONBody,
  APIChannel,
} from 'discord-api-types/v9';
import type { ChannelSettings } from '@prisma/client';
import type { FastifyReply } from 'fastify';

import type { OptionType } from './OptionTypes';
import type Context from './Context';
import type Client from './Client';
import { APIChatInputApplicationCommandInteraction, APIEntitlement } from 'discord-api-types/v10';

export default class CommandContext implements Context {
  rawInteraction: APIApplicationCommandInteraction;
  rawData: APIChatInputApplicationCommandInteractionData;
  token: string;
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
  entitlements?: APIEntitlement[];
  premium: boolean;
  appPermissions?: string;
  channel?: Partial<APIChannel> & Pick<APIChannel, 'id' | 'type'>;

  constructor(
    interaction: APIChatInputApplicationCommandInteraction,
    client: Client,
    response: FastifyReply
  ) {
    this.rawInteraction = interaction;
    this.rawData = interaction.data;
    this.token = interaction.token;
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
    this.appPermissions = interaction.app_permissions;

    this.applicationId = interaction.application_id;
    this.channelId = interaction.channel_id;
    this.guildId = interaction.guild_id;

    this.member = interaction.member;
    this.user = interaction.user || interaction.member!.user;

    this.channel = interaction.channel;

    this.entitlements = interaction.entitlements;
    this.premium =
      !!this.guildId &&
      (!!this.entitlements.some(
        entitlement => entitlement.sku_id == this.client.config.premiumSku
      ) ||
        this.client.database.isChargebeePremiumGuild(this.guildId));
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

  reply(data: string | APIInteractionResponseCallbackData, options?: { ephemeral?: boolean }) {
    if (typeof data === 'string') data = { content: data };
    if (options?.ephemeral) {
      data.flags = (data.flags || 0) | MessageFlags.Ephemeral;
    }
    this.response.send({
      type: InteractionResponseType.ChannelMessageWithSource,
      data,
    });
  }

  replyUpsell() {
    this.reply(this.client.functions.premiumUpsell(this.client.config.premiumSku));
  }

  replyModal(data: APIModalInteractionResponseCallbackData) {
    this.response.send({
      type: InteractionResponseType.Modal,
      data,
    });
  }

  editResponse(data: string | RESTPatchAPIInteractionFollowupJSONBody, messageId = '@original') {
    if (typeof data === 'string') data = { content: data };
    return this.client.functions.editInteractionResponse(
      data,
      this.client.id,
      this.token,
      messageId
    );
  }

  get channelSettings(): Promise<ChannelSettings> {
    return this.client.database.fetchChannelSettings(this.channelId, !this.guildId);
  }
}
