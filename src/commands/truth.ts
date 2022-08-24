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
    ],
  },
] as const;

const truth: Command = {
  name: 'truth',
  description: 'Gives a random question that has to be answered truthfully.',
  category: 'question',
  options,
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    const channelSettings = await ctx.channelSettings;
    const serverSettings = ctx.guildId
      ? await ctx.client.database.fetchGuildSettings(ctx.guildId)
      : null;
    const rating = ctx.getOption<Mutable<typeof options[0]>>('rating')?.value;
    const truth = await ctx.client.database.getRandomQuestion(
      'TRUTH',
      channelSettings.disabledRatings,
      rating,
      ctx.guildId,
      ctx.channelId,
      serverSettings?.language
    );
    if (truth.id) ctx.client.metrics.trackRatingSelection(rating || 'NONE');
    ctx.reply({
      content: ctx.client.functions.promoMessage(ctx.client, ctx.guildId),
      embeds: [
        {
          title: truth.question,
          color: ctx.client.COLORS.BLUE,
          footer: truth.id
            ? {
                text: `Type: ${truth.type} | Rating: ${truth.rating} | ID: ${truth.id}`,
              }
            : undefined,
        },
      ],
      components: serverSettings?.disableButtons
        ? []
        : ctx.client.server.buttonHandler.components('TOD'),
    });
  },
};

export default truth;
