import { ApplicationCommandOptionType } from 'discord-api-types';

import type { Mutable, OptionType } from '../classes/OptionTypes';
import type Command from '../classes/Command';
import type Context from '../classes/Context';

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
] as const;

const nhie: Command = {
  name: 'nhie',
  description: 'Gives a random Never Have I Ever question to be answered.',
  category: 'question',
  options,
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    const channelSettings = await ctx.channelSettings;
    const rating = (ctx.getOption('rating') as OptionType<Mutable<typeof options[0]>>)?.value;
    const nhie = await ctx.client.database.getRandomQuestion(
      'NHIE',
      channelSettings.disabledRatings,
      rating
    );
    ctx.reply({
      embeds: [
        {
          title: nhie.question,
          color: ctx.client.COLORS.BLUE,
          footer: nhie.id
            ? {
                text: `Type: ${nhie.type} | Rating: ${nhie.rating} | ID: ${nhie.id}`,
              }
            : null,
        },
      ],
    });
  },
};

export default nhie;
