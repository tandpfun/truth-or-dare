import {
  ApplicationCommandOptionType,
  ApplicationCommandInteractionDataOptionString,
} from 'discord-api-types';
import Command from '../../classes/Command';
import Context from '../../classes/Context';

const wyr: Command = {
  name: 'wyr',
  description: 'Gives a random Would You Rather question to be answered!',
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: 'rating',
      description: 'The maturity level of the topics the question can relate to.',
      required: false,
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
    const wyr = ctx.client.randomQuestion(
      'wyr',
      rating ? [rating as 'pg' | 'pg13' | 'r'] : undefined
    );
    ctx.reply({
      embeds: [
        {
          title: wyr.question,
          color: ctx.client.COLORS.BLUE,
          footer: {
            text: `${wyr.type}-${wyr.rating}-${wyr.index}`,
          },
        },
      ],
    });
  },
};

export default wyr;
