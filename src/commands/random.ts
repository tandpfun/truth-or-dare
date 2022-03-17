import { ApplicationCommandOptionType } from 'discord-api-types';
import { QuestionType } from '@prisma/client';

import type { Mutable } from '../classes/OptionTypes';
import type Command from '../classes/Command';
import type CommandContext from '../classes/CommandContext';

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
  run: async (ctx: CommandContext): Promise<void> => {
    const channelSettings = await ctx.channelSettings;
    const types = Object.values(QuestionType);
    const type = types[Math.floor(Math.random() * types.length)];
    const rating = ctx.getOption<Mutable<typeof options[0]>>('rating')?.value;
    const result = await ctx.client.database.getRandomQuestion(
      type,
      channelSettings.disabledRatings,
      rating,
      ctx.guildId
    );
    ctx.reply({
      content: ctx.client.functions.upvoteAd(),
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
    });
  },
};

export default tod;
