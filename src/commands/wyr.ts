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
    const rating = (ctx.getOption('rating') as ApplicationCommandInteractionDataOptionString)
      ?.value;
    const wyr = ctx.client.randomQuestion(
      'wyr',
      (rating ? [rating as 'PG' | 'PG13' | 'R'] : ['PG', 'PG13', 'R']).filter(
        (r: 'PG' | 'PG13' | 'R') => !channelSettings.disabledRatings.includes(r)
      ) as ('PG' | 'PG13' | 'R')[]
    );
    ctx.reply({
      embeds: [
        {
          title: wyr.question,
          color: ctx.client.COLORS.BLUE,
          footer: isNaN(wyr.index)
            ? null
            : {
                text: `${wyr.type}-${wyr.rating}-${wyr.index}`,
              },
        },
      ],
    });
  },
};

export default wyr;
