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

const nhie: Command = {
  name: 'nhie',
  description: 'Gives a random Never Have I Ever question to be answered.',
  category: 'question',
  options: options,
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    const channelSettings = await ctx.channelSettings;
    const serverSettings = ctx.guildId
      ? await ctx.client.database.fetchGuildSettings(ctx.guildId)
      : null;
    const rating = ctx.getOption<Mutable<typeof options[0]>>('rating')?.value;
    const nhie = await ctx.client.database.getRandomQuestion(
      'NHIE',
      channelSettings.disabledRatings,
      rating,
      ctx.guildId,
      ctx.channelId,
      serverSettings?.language
    );
    if (nhie.id) ctx.client.metrics.trackRatingSelection(rating || 'NONE');
    ctx.reply({
      content: ctx.client.functions.promoMessage(ctx.client, ctx.guildId),
      embeds: [
        {
          title: nhie.question,
          color: ctx.client.COLORS.BLUE,
          footer: nhie.id
            ? {
                text: `Type: ${nhie.type} | Rating: ${nhie.rating} | ID: ${nhie.id}`,
              }
            : undefined,
        },
      ],
      components: serverSettings?.disableButtons ? [] : ctx.client.buttonHandler.components('NHIE'),
    });
  },
};

export default nhie;
