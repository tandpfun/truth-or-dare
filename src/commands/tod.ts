import { ApplicationCommandOptionType } from 'discord-api-types/v9';

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
      { name: 'random', value: 'NONE' },
    ],
  },
] as const;

const tod: Command = {
  name: 'tod',
  description: 'Gives a random truth or dare question.',
  category: 'question',
  options,
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    const serverSettings = ctx.guildId
      ? await ctx.client.database.fetchGuildSettings(ctx.guildId)
      : null;
    const type = Math.random() < 0.5 ? 'TRUTH' : 'DARE';
    const rating = ctx.getOption<Mutable<typeof options[0]>>('rating')?.value;
    const result = await ctx.client.getQuestion(ctx, type, rating);
    if (result.id) ctx.client.metrics.trackRatingSelection(rating || 'NONE');
    ctx.reply({
      content: ctx.client.functions.promoMessage(ctx.client, ctx.guildId, result.rating),
      embeds: [
        {
          title: result.question,
          color: ctx.client.COLORS.BLUE,
          footer: result.id
            ? {
                text: `Type: ${result.type} | Rating: ${result.rating} | ID: ${result.id}`,
              }
            : undefined,
        },
      ],
      components: serverSettings?.disableButtons
        ? []
        : ctx.client.buttonHandler.components('TOD', result.rating),
    });
  },
};

export default tod;
