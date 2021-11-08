import { ApplicationCommandOptionType, ChannelType } from 'discord-api-types';
import { Rating } from '.prisma/client';

import type { Mutable } from '../classes/OptionTypes';
import type Command from '../classes/Command';
import type Context from '../classes/Context';

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
        channel_types: [ChannelType.GuildText, ChannelType.GuildNews],
      },
    ],
  },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: 'disablerating',
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
    name: 'enablerating',
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
] as const;

const settings: Command = {
  name: 'settings',
  description: 'Show and configure the channel settings of a channel.',
  category: 'control',
  perms: ['ManageChannels'],
  options,
  run: async (ctx: Context): Promise<void> => {
    if (!ctx.guildId)
      return ctx.reply(`${ctx.client.EMOTES.xmark} Settings cannot be configured in DMs.`);

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
            title: `${ctx.client.EMOTES.gear} Channel Settings`,
            description: `__Ratings:__\n${Object.values(Rating)
              .map(r => `${ratingEmoji(r)} ${r} Questions`)
              .join('\n')}`,
            color: ctx.client.COLORS.BLUE,
          },
        ],
      });
    } else if (ctx.args[0] === 'disablerating') {
      const ratingToDisable =
        ctx.getOption<Mutable<typeof options[1]['options'][0]>>('rating')!.value;

      if (channelSettings.disabledRatings.includes(ratingToDisable))
        return ctx.reply(`${ctx.client.EMOTES.xmark} That rating is already disabled here!`);

      channelSettings.disabledRatings.push(ratingToDisable);
      await ctx.client.database.updateChannelSettings(channelSettings);
      ctx.reply(`${ctx.client.EMOTES.checkmark} The ${ratingToDisable} rating was disabled here!`);
    } else if (ctx.args[0] === 'enablerating') {
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
      if (channelSettings.muted)
        return ctx.reply(ctx.client.EMOTES.xmark + ' I am already muted here.');

      channelSettings.muted = true;
      await ctx.client.database.updateChannelSettings(channelSettings);
      ctx.reply(ctx.client.EMOTES.checkmark + ' Muted, use `/settings unmute` to unmute.');
    } else if (ctx.args[0] === 'unmute') {
      if (!channelSettings.muted)
        return ctx.reply(ctx.client.EMOTES.xmark + ' I am already unmuted here.');

      channelSettings.muted = false;
      await ctx.client.database.updateChannelSettings(channelSettings);
      ctx.reply(ctx.client.EMOTES.checkmark + ' Unmuted, use `/settings mute` to mute.');
    }
  },
};

export default settings;
