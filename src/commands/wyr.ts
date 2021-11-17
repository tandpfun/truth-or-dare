import { ApplicationCommandOptionType } from 'discord-api-types';

import type { Mutable } from '../classes/OptionTypes';
import type Command from '../classes/Command';
import type Context from '../classes/Context';

const wyrCategories: string[] = [];

const options = [
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
  {
    type: ApplicationCommandOptionType.String,
    name: 'category',
    description: 'The topic that that the question relates to.',
    choices: wyrCategories.map(c => ({ name: c, value: c })),
  },
] as const;

const wyr: Command = {
  name: 'wyr',
  description: 'Gives a random Would You Rather question to be answered.',
  category: 'question',
  options,
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    const channelSettings = await ctx.channelSettings;
    const rating = ctx.getOption<Mutable<typeof options[0]>>('rating')?.value;
    const category = ctx.getOption<Mutable<typeof options[1]>>('category')?.value;
    const wyr = await ctx.client.database.getRandomQuestion(
      'WYR',
      channelSettings.disabledRatings,
      rating,
      category,
      ctx.guildId
    );
    ctx.reply({
      content: ctx.client.functions.upvoteAd(),
      embeds: [
        {
          title: wyr.question,
          color: ctx.client.COLORS.BLUE,
          footer: wyr.id
            ? {
                text: `Type: ${wyr.type} | Rating: ${wyr.rating} | ID: ${wyr.id}`,
              }
            : undefined,
        },
      ],
    });
  },
};

export default wyr;
