import { ApplicationCommandOptionType } from 'discord-api-types';

import type { Mutable } from '../classes/OptionTypes';
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

const dare: Command = {
  name: 'dare',
  description: 'Gives a dare that has to be completed.',
  category: 'question',
  options,
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    const channelSettings = await ctx.channelSettings;
    const rating = ctx.getOption<Mutable<typeof options[0]>>('rating')?.value;
    const dare = await ctx.client.database.getRandomQuestion(
      'DARE',
      channelSettings.disabledRatings,
      rating,
      ctx.guildId
    );
    ctx.reply({
      content:
        Math.random() > 0.92
          ? ctx.client.EMOTES.arrowUp +
            ' Enjoying the bot? Consider [upvoting me](https://top.gg/bot/692045914436796436/vote)!'
          : undefined,
      embeds: [
        {
          title: dare.question,
          color: ctx.client.COLORS.BLUE,
          footer: dare.id
            ? {
                text: `Type: ${dare.type} | Rating: ${dare.rating} | ID: ${dare.id}`,
              }
            : null,
        },
      ],
    });
  },
};

export default dare;
