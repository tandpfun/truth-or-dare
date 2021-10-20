import { Rating } from '.prisma/client';
import {
  ApplicationCommandOptionType,
  ApplicationCommandInteractionDataOptionString,
} from 'discord-api-types';
import Command from '../classes/Command';
import Context from '../classes/Context';

const truth: Command = {
  name: 'truth',
  description: 'Gives a random question that has to be answered truthfully.',
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
    const truth = await ctx.client.database.getRandomQuestion(
      'TRUTH',
      channelSettings.disabledRatings,
      disabledQuestionIDs,
      rating as Rating
    );
    ctx.reply({
      embeds: [
        {
          title: truth.question,
          color: ctx.client.COLORS.BLUE,
          footer: truth.id
            ? {
                text: `Type: ${truth.type} | Rating: ${truth.rating} | ID: ${truth.id}`,
              }
            : null,
        },
      ],
    });
  },
};

export default truth;
