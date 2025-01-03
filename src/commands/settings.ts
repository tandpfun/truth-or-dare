import { ApplicationCommandOptionType, ChannelType } from 'discord-api-types/v9';
import { Rating } from '.prisma/client';

import type { Mutable } from '../classes/OptionTypes';
import type Command from '../classes/Command';
import type Context from '../classes/Context';
import { ApplicationCommandInstallationContext } from '../classes/Command';

const options = [
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: 'view',
    description: "View a channel's settings.",
    options: [
      {
        type: ApplicationCommandOptionType.Channel,
        name: 'channel',
        description: 'The channel to view the settings for.',
        channel_types: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
      },
    ],
  },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: 'disable-rating',
    description: 'Disable a question rating for a channel.',
    options: [
      {
        type: ApplicationCommandOptionType.String,
        name: 'rating',
        description: 'The rating to disable.',
        required: true,
        choices: [
          { name: 'PG', value: 'PG' },
          { name: 'PG13', value: 'PG13' },
          { name: 'R', value: 'R' },
        ],
      },
      {
        type: ApplicationCommandOptionType.Channel,
        name: 'channel',
        description: 'The channel to disable the rating in.',
        channel_types: [ChannelType.GuildText, ChannelType.GuildNews],
      },
    ],
  },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: 'enable-rating',
    description: 'Enable a question rating for a channel.',
    options: [
      {
        type: ApplicationCommandOptionType.String,
        name: 'rating',
        description: 'The rating to enable.',
        required: true,
        choices: [
          { name: 'PG', value: 'PG' },
          { name: 'PG13', value: 'PG13' },
          { name: 'R', value: 'R' },
        ],
      },
      {
        type: ApplicationCommandOptionType.Channel,
        name: 'channel',
        description: 'The channel to enable the rating in.',
        channel_types: [ChannelType.GuildText, ChannelType.GuildNews],
      },
    ],
  },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: 'mute',
    description: 'Disable all commands in a channel.',
    options: [
      {
        type: ApplicationCommandOptionType.Channel,
        name: 'channel',
        description: 'The channel to mute the bot in.',
        channel_types: [ChannelType.GuildText, ChannelType.GuildNews],
      },
    ],
  },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: 'unmute',
    description: 'Reenable all commands in a channel.',
    options: [
      {
        type: ApplicationCommandOptionType.Channel,
        name: 'channel',
        description: 'The channel to unmute the bot in.',
        channel_types: [ChannelType.GuildText, ChannelType.GuildNews],
      },
    ],
  },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: 'mute-server',
    description: 'Disable all commands in all channels serverwide.',
  },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: 'unmute-server',
    description: 'Reenable all commands in all channels serverwide.',
  },
] as const;

const settings: Command = {
  name: 'settings',
  description: 'Show and configure the channel settings of a channel.',
  category: 'config',
  perms: ['ManageChannels'],
  integration_types: [ApplicationCommandInstallationContext.GuildInstall],
  options,
  run: async (ctx: Context): Promise<void> => {
    const channelId =
      ctx.getOption<Mutable<typeof options[0]['options'][0]>>('channel')?.value ?? ctx.channelId;

    const channelSettings =
      channelId === ctx.channelId
        ? await ctx.channelSettings
        : await ctx.client.database.fetchChannelSettings(channelId);

    if (ctx.args[0] === 'view') {
      const ratingEmoji = (rating: Rating) => {
        return channelSettings.disabledRatings.includes(rating)
          ? ctx.client.EMOTES.xmark
          : ctx.client.EMOTES.checkmark;
      };

      ctx.reply({
        embeds: [
          {
            title: `${ctx.client.EMOTES.gear} Channel Settings${
              channelId === ctx.channelId ? '' : ` for <#${channelId}>`
            }`,
            description: `${
              channelSettings.muted ? `Muted ${ctx.client.EMOTES.mute}\n` : ''
            }__Ratings:__\n${Object.values(Rating)
              .filter(r => r !== 'R' || ctx.client.config.enableR)
              .map(r => `${ratingEmoji(r)} ${r} Questions`)
              .join('\n')}`,
            color: ctx.client.COLORS.BLURPLE,
          },
        ],
      });
    } else if (ctx.args[0] === 'disable-rating') {
      const ratingToDisable =
        ctx.getOption<Mutable<typeof options[1]['options'][0]>>('rating')!.value;

      if (channelSettings.disabledRatings.includes(ratingToDisable))
        return ctx.reply(`${ctx.client.EMOTES.xmark} That rating is already disabled here!`);

      channelSettings.disabledRatings.push(ratingToDisable);
      await ctx.client.database.updateChannelSettings(channelSettings);
      ctx.reply(`${ctx.client.EMOTES.checkmark} The ${ratingToDisable} rating was disabled here!`);
    } else if (ctx.args[0] === 'enable-rating') {
      const ratingToEnable =
        ctx.getOption<Mutable<typeof options[2]['options'][0]>>('rating')!.value;

      if (!channelSettings.disabledRatings.includes(ratingToEnable))
        return ctx.reply(`${ctx.client.EMOTES.xmark} That rating is not disabled here!`);

      channelSettings.disabledRatings = channelSettings.disabledRatings.filter(
        type => type !== ratingToEnable
      );
      await ctx.client.database.updateChannelSettings(channelSettings);
      ctx.reply(`${ctx.client.EMOTES.checkmark} The ${ratingToEnable} rating was enabled here!`);
    } else if (ctx.args[0] === 'mute') {
      if (!ctx.guildId)
        return ctx.reply(`${ctx.client.EMOTES.xmark} This cannot be configured in DMs.`);

      if (channelSettings.muted)
        return ctx.reply(ctx.client.EMOTES.xmark + ' I am already muted here.');

      channelSettings.muted = true;
      await ctx.client.database.updateChannelSettings(channelSettings);
      ctx.reply(ctx.client.EMOTES.checkmark + ' Muted, use `/settings unmute` to unmute.');
    } else if (ctx.args[0] === 'unmute') {
      if (!ctx.guildId)
        return ctx.reply(`${ctx.client.EMOTES.xmark} This cannot be configured in DMs.`);

      if (!channelSettings.muted)
        return ctx.reply(ctx.client.EMOTES.xmark + ' I am already unmuted here.');

      channelSettings.muted = false;
      await ctx.client.database.updateChannelSettings(channelSettings);
      ctx.reply(ctx.client.EMOTES.checkmark + ' Unmuted, use `/settings mute` to mute.');
    } else if (ctx.args[0] === 'mute-server') {
      if (!ctx.guildId)
        return ctx.reply(`${ctx.client.EMOTES.xmark} This cannot be configured in DMs.`);

      const allChannels = await ctx.client.functions.fetchGuildChannels(
        ctx.guildId,
        ctx.client.token
      );
      if (!allChannels)
        return ctx.reply(
          ctx.client.EMOTES.xmark +
            " I can't seem to fetch your channels, make sure I'm in the server by inviting me again from `/invite` then maybe try again."
        );
      const textChannels = allChannels.filter(
        c => c.type === ChannelType.GuildText || c.type === ChannelType.GuildNews
      );
      if (!textChannels.length)
        return ctx.reply(
          ctx.client.EMOTES.xmark +
            " I can't seem to find any text or announcement channels to mute, let the devs know in the support server found in `/help` if you think there's something wrong here."
        );

      await Promise.all(
        textChannels.map(async c =>
          ctx.client.database.updateChannelSettings({ id: c.id, muted: true })
        )
      );

      ctx.reply(
        ctx.client.EMOTES.checkmark +
          ' Muted in all channels serverwide. Use `/settings unmute-server` to unmute.'
      );
    } else if (ctx.args[0] === 'unmute-server') {
      if (!ctx.guildId)
        return ctx.reply(`${ctx.client.EMOTES.xmark} This cannot be configured in DMs.`);

      const allChannels = await ctx.client.functions.fetchGuildChannels(
        ctx.guildId,
        ctx.client.token
      );
      if (!allChannels)
        return ctx.reply(
          ctx.client.EMOTES.xmark +
            " I can't seem to fetch your channels, make sure I'm in the server by inviting me again from `/invite` then maybe try again."
        );
      const textChannels = allChannels.filter(
        c => c.type === ChannelType.GuildText || c.type === ChannelType.GuildNews
      );
      if (!textChannels.length)
        return ctx.reply(
          ctx.client.EMOTES.xmark +
            " I can't seem to find any text or announcement channels to unmute, let the devs know in the support server found in `/help` if you think there's something wrong here."
        );

      await Promise.all(
        textChannels.map(async c =>
          ctx.client.database.updateChannelSettings({ id: c.id, muted: false })
        )
      );

      ctx.reply(
        ctx.client.EMOTES.checkmark +
          ' Unmuted in all channels serverwide. Use `/settings unmute-server` to unmute.'
      );
    }
  },
};

export default settings;
