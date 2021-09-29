import {
  ApplicationCommandOptionType,
  ApplicationCommandInteractionDataOptionString,
} from 'discord-api-types';
import Command from '../../classes/Command';
import Context from '../../classes/Context';

const nhie: Command = {
  name: 'nhie',
  description: 'Gives a random Never Have I Ever question to be answered!',
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
    const nhie = ctx.client.randomQuestion(
      'nhie',
      rating ? [rating as 'pg' | 'pg13' | 'r'] : undefined
    );
    ctx.reply({
      embeds: [
        {
          title: nhie.question,
          color: ctx.client.COLORS.BLUE,
          footer: {
            text: `${nhie.type}-${nhie.rating}-${nhie.index}`,
          },
        },
      ],
    });
  },
};

export default nhie;
