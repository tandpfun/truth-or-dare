import { Rating } from '.prisma/client';
import {
  ApplicationCommandOptionType,
  ApplicationCommandInteractionDataOptionString,
} from 'discord-api-types';
import Command from '../classes/Command';
import Context from '../classes/Context';

const tod: Command = {
  name: 'tod',
  description: 'Gives a random truth or dare question.',
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
    const type = Math.random() < 0.5 ? 'TRUTH' : 'DARE';
    const rating = (ctx.getOption('rating') as ApplicationCommandInteractionDataOptionString)
      ?.value;
    const result = await ctx.client.database.getRandomQuestion(
      type,
      channelSettings.disabledRatings,
      disabledQuestionIDs,
      rating as Rating
    );
    ctx.reply({
      embeds: [
        {
          title: result.question,
          color: ctx.client.COLORS.BLUE,
          footer: result.id
            ? {
                text: `Type: ${result.type} | Rating: ${result.rating} | ID: ${result.id}`,
              }
            : null,
        },
      ],
    });
  },
};

export default tod;
