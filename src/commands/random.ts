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

const tod: Command = {
  name: 'random',
  description: 'Gives a random question from any category (truth, dare, paranoia, wyr, nhie).',
  category: 'question',
  options,
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    const channelSettings = await ctx.channelSettings;
    const serverSettings = ctx.guildId
      ? await ctx.client.database.fetchGuildSettings(ctx.guildId)
      : null;
    const rating = ctx.getOption<Mutable<typeof options[0]>>('rating')?.value;
    const result = await ctx.client.database.getRandomQuestion(
      undefined,
      channelSettings.disabledRatings,
      rating,
      ctx.guildId,
      serverSettings?.language
    );
    ctx.reply({
      content: ctx.client.functions.promoMessage(),
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
        : ctx.client.server.buttonHandler.components('RANDOM'),
    });
  },
};

export default tod;
