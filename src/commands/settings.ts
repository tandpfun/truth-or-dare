import { Rating } from '.prisma/client';
import {
  ApplicationCommandInteractionDataOptionString,
  ApplicationCommandOptionType,
} from 'discord-api-types/v9';
import Command from '../classes/Command';
import Context from '../classes/Context';

const settings: Command = {
  name: 'settings',
  description: 'Show and configure the channel settings of a channel.',
  category: 'control',
  perms: ['ManageChannels'],
  options: [
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: 'view',
      description: "View a channel's settings.",
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
      ],
    },
  ],
  run: async (ctx: Context): Promise<void> => {
    if (!ctx.guildId)
      return ctx.reply(`${ctx.client.EMOTES.xmark} Settings cannot be configured in DMs.`);

    const channelSettings = await ctx.channelSettings;

    if (ctx.args[0] === 'view') {
      function ratingEmoji(rating: Rating) {
        return channelSettings.disabledRatings.includes(rating)
          ? ctx.client.EMOTES.xmark
          : ctx.client.EMOTES.checkmark;
      }

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
      const ratingToDisable = (ctx.getOption('rating') as ApplicationCommandInteractionDataOptionString).value as Rating;

      if (channelSettings.disabledRatings.includes(ratingToDisable))
        return ctx.reply(`${ctx.client.EMOTES.xmark} That rating is already disabled here!`);

      channelSettings.disabledRatings.push(ratingToDisable);
      await ctx.client.database.updateChannelSettings(channelSettings);
      ctx.reply(`${ctx.client.EMOTES.checkmark} The ${ratingToDisable} rating was disabled here!`);
    } else if (ctx.args[0] === 'enablerating') {
      const ratingToEnable = (ctx.getOption('rating') as ApplicationCommandInteractionDataOptionString).value as Rating;

      if (!channelSettings.disabledRatings.includes(ratingToEnable))
        return ctx.reply(`${ctx.client.EMOTES.xmark} That rating is not disabled here!`);

      channelSettings.disabledRatings = channelSettings.disabledRatings.filter(
        type => type !== ratingToEnable
      );
      await ctx.client.database.updateChannelSettings(channelSettings);
      ctx.reply(`${ctx.client.EMOTES.checkmark} The ${ratingToEnable} rating was enabled here!`);
    }
  },
};

export default settings;
