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
  name: 'random',
  description: 'Gives a random question from any category (truth, dare, paranoia, wyr, nhie).',
  category: 'question',
  options,
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    const serverSettings = ctx.guildId
      ? await ctx.client.database.fetchGuildSettings(ctx.guildId)
      : null;
    const rating = ctx.getOption<Mutable<typeof options[0]>>('rating')?.value;
    const question = await ctx.client.getQuestion(ctx, undefined, rating);
    if (question.id) ctx.client.metrics.trackRatingSelection(rating || 'NONE');

    ctx.reply(
      ctx.client.functions.questionEmbed({
        question,
        rating,
        componentType: 'RANDOM',
        premium: ctx.premium,
        serverSettings,
        client: ctx.client,
      })
    );
  },
};

export default tod;
