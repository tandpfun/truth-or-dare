import { Rating } from '.prisma/client';
import {
  ApplicationCommandOptionType,
  ApplicationCommandInteractionDataOptionString,
} from 'discord-api-types';
import Command from '../classes/Command';
import Context from '../classes/Context';

const wyr: Command = {
  name: 'wyr',
  description: 'Gives a random Would You Rather question to be answered.',
  category: 'question',
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: 'rating',
      description: 'The maturity level of the topics the question can relate to.',
      choices: [
        { name: 'PG', value: 'PG' },
        { name: 'PG13', value: 'PG13' },
        { name: 'R', value: 'R' },
      ],
    },
  ],
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    const channelSettings = await ctx.channelSettings;
    const disabledQuestionIDs = ctx.guildId 
      ? await ctx.client.database.getDisabledQuestionIDs(ctx.guildId)
      : []
    const rating = (ctx.getOption('rating') as ApplicationCommandInteractionDataOptionString)
      ?.value;
    const wyr = await ctx.client.database.getRandomQuestion(
      'WYR',
      channelSettings.disabledRatings,
      disabledQuestionIDs,
      rating as Rating
    );
    ctx.reply({
      embeds: [
        {
          title: wyr.question,
          color: ctx.client.COLORS.BLUE,
          footer: wyr.id
            ? {
                text: `Type: ${wyr.type} | Rating: ${wyr.rating} | ID: ${wyr.id}`,
              }
            : null,
        },
      ],
    });
  },
};

export default wyr;
