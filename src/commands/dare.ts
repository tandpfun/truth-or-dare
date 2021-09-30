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
    const dare = ctx.client.randomQuestion(
      'dare',
      (rating ? [rating as 'PG' | 'PG13' | 'R'] : ['PG', 'PG13', 'R']).filter(
        (r: 'PG' | 'PG13' | 'R') => !channelSettings.disabledRatings.includes(r)
      ) as ('PG' | 'PG13' | 'R')[]
    );
    ctx.reply({
      embeds: [
        {
          title: dare.question,
          color: ctx.client.COLORS.BLUE,
          footer: isNaN(dare.index)
            ? null
            : {
                text: `${dare.type}-${dare.rating}-${dare.index}`,
              },
        },
      ],
    });
  },
};

export default dare;
