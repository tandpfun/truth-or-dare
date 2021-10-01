import {
  ApplicationCommandInteractionDataOptionSubCommand,
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
      name: 'view',
      description: "View a channel's settings.",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: 'disablerating',
      description: 'Disable a question rating for a channel.',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'rating',
          description: 'The rating to disable.',
          type: ApplicationCommandOptionType.String,
          choices: [
            { name: 'PG', value: 'PG' },
            { name: 'PG13', value: 'PG13' },
            { name: 'R', value: 'R' },
          ],
          required: true,
        },
      ],
    },
    {
      name: 'enablerating',
      description: 'Enable a question rating for a channel.',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'rating',
          description: 'The rating to enable.',
          type: ApplicationCommandOptionType.String,
          choices: [
            { name: 'PG', value: 'PG' },
            { name: 'PG13', value: 'PG13' },
            { name: 'R', value: 'R' },
          ],
          required: true,
        },
      ],
    },
  ],
  run: async (ctx: Context): Promise<void> => {
    const channelSettings = await ctx.channelSettings;

    if (ctx.args[0] === 'view') {
      function ratingEmoji(rating: 'PG' | 'PG13' | 'R') {
        return channelSettings.disabledRatings.includes(rating)
          ? ctx.client.EMOTES.xmark
          : ctx.client.EMOTES.checkmark;
      }

      ctx.reply({
        embeds: [
          {
            title: `${ctx.client.EMOTES.gear} Channel Settings`,
            description: `__Ratings:__\n${ratingEmoji('PG')} PG Questions\n${ratingEmoji(
              'PG13'
            )} PG13 Questions\n${ratingEmoji('R')} R Questions`,
            color: ctx.client.COLORS.BLUE,
          },
        ],
      });
    } else if (ctx.args[0] === 'disablerating') {
      const ratingToDisable = (
        ctx.getOption('disablerating') as ApplicationCommandInteractionDataOptionSubCommand
      ).options[0].value as 'PG' | 'PG13' | 'R';

      if (channelSettings.disabledRatings.includes(ratingToDisable))
        return ctx.reply(`${ctx.client.EMOTES.xmark} That rating is already disabled here!`);

      channelSettings.disabledRatings.push(ratingToDisable);
      await ctx.client.database.updateChannelSettings(ctx.channelId, channelSettings);
      ctx.reply(`${ctx.client.EMOTES.checkmark} The ${ratingToDisable} rating was disabled here!`);
    } else if (ctx.args[0] === 'enablerating') {
      const ratingToDisable = (
        ctx.getOption('enablerating') as ApplicationCommandInteractionDataOptionSubCommand
      ).options[0].value as 'PG' | 'PG13' | 'R';

      if (!channelSettings.disabledRatings.includes(ratingToDisable))
        return ctx.reply(`${ctx.client.EMOTES.xmark} That rating is not disabled here!`);

      channelSettings.disabledRatings = channelSettings.disabledRatings.filter(
        type => type !== ratingToDisable
      );
      await ctx.client.database.updateChannelSettings(ctx.channelId, channelSettings);
      ctx.reply(`${ctx.client.EMOTES.checkmark} The ${ratingToDisable} rating was enabled here!`);
    }
  },
};

export default settings;
