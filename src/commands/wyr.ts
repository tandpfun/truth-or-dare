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

const wyr: Command = {
  name: 'wyr',
  description: 'Gives a random Would You Rather question to be answered.',
  category: 'question',
  options,
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    const channelSettings = await ctx.channelSettings;
    const serverSettings = ctx.guildId
      ? await ctx.client.database.fetchGuildSettings(ctx.guildId)
      : null;
    const rating = ctx.getOption<Mutable<typeof options[0]>>('rating')?.value;
    const wyr = await ctx.client.database.getRandomQuestion(
      'WYR',
      channelSettings.disabledRatings,
      rating,
      ctx.guildId,
      ctx.channelId,
      serverSettings?.language
    );
    ctx.reply({
      content: ctx.client.functions.promoMessage(ctx.client, ctx.guildId),
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
        : ctx.client.server.buttonHandler.components('WYR'),
    });
  },
};

export default wyr;
