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
        { name: 'PG', value: 'pg' },
        { name: 'PG13', value: 'pg13' },
        { name: 'R', value: 'r' },
      ],
    },
  ],
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    const rating = (ctx.getOption('rating') as ApplicationCommandInteractionDataOptionString)
      ?.value;
    const truth = ctx.client.randomQuestion(
      'truth',
      rating ? [rating as 'pg' | 'pg13' | 'r'] : undefined
    );
    ctx.reply({
      embeds: [
        {
          title: truth.question,
          color: ctx.client.COLORS.BLUE,
          footer: {
            text: `${truth.type}-${truth.rating}-${truth.index}`,
          },
        },
      ],
    });
  },
};

export default truth;
