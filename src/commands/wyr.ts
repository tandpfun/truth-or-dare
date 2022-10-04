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

const wyr: Command = {
  name: 'wyr',
  description: 'Gives a random Would You Rather question to be answered.',
  category: 'question',
  options,
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    const serverSettings = ctx.guildId
      ? await ctx.client.database.fetchGuildSettings(ctx.guildId)
      : null;
    const rating = ctx.getOption<Mutable<typeof options[0]>>('rating')?.value;
    const wyr = await ctx.client.getQuestion(ctx, 'WYR', rating);
    if (wyr.id) ctx.client.metrics.trackRatingSelection(rating || 'NONE');
    ctx.reply({
      content: ctx.client.functions.promoMessage(ctx.client, ctx.guildId, wyr.rating),
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
      components: serverSettings?.disableButtons
        ? []
        : ctx.client.buttonHandler.components('WYR', rating, wyr.rating),
    });
  },
};

export default wyr;
