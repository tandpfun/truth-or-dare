import {
  ApplicationCommandOptionType,
  ApplicationCommandInteractionDataOptionString,
} from 'discord-api-types';
import Command from '../../classes/Command';
import Context from '../../classes/Context';

const dare: Command = {
  name: 'dare',
  description: 'Get a random dare ',
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: 'rating',
      description: 'The rating of dare you want to get',
      required: false,
      choices: [
        { name: 'pg', value: 'pg' },
        { name: 'pg13', value: 'pg13' },
        { name: 'r', value: 'r' },
      ],
    },
  ],
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    const rating = (ctx.getOption('rating') as ApplicationCommandInteractionDataOptionString)
      ?.value;
    const dare = ctx.client.randomQuestion(
      'dare',
      rating ? [rating as 'pg' | 'pg13' | 'r'] : undefined
    );
    ctx.reply({
      embeds: [
        {
          title: dare.question,
          color: ctx.client.COLORS.RED,
          footer: {
            text: `${dare.type}-${dare.rating}-${dare.index}`,
          },
        },
      ],
    });
  },
};

export default dare;
