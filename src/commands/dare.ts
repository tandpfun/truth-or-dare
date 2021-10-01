import { Rating } from '.prisma/client';
import {
  ApplicationCommandOptionType,
  ApplicationCommandInteractionDataOptionString,
} from 'discord-api-types';
import Command from '../classes/Command';
import Context from '../classes/Context';

const dare: Command = {
  name: 'dare',
  description: 'Gives a dare that has to be completed.',
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
    const rating = (ctx.getOption('rating') as ApplicationCommandInteractionDataOptionString)
      ?.value;
    const dare = await ctx.client.database.getRandomQuestion(
      'DARE',
      (rating ? [rating as Rating] : ['PG', 'PG13', 'R']).filter(
        (r: Rating) => !channelSettings.disabledRatings.includes(r)
      ) as Rating[]
    );
    ctx.reply({
      embeds: [
        {
          title: dare.question,
          color: ctx.client.COLORS.BLUE,
          footer:
            typeof dare.id === 'string'
              ? null
              : {
                  text: `${dare.type}-${dare.rating}-${dare.id}`,
                },
        },
      ],
    });
  },
};

export default dare;
