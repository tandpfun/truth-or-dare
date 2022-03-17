import { ApplicationCommandOptionType } from 'discord-api-types';

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

const nhie: Command = {
  name: 'nhie',
  description: 'Gives a random Never Have I Ever question to be answered.',
  category: 'question',
  options: options,
  perms: [],
  run: async (ctx: CommandContext): Promise<void> => {
    const channelSettings = await ctx.channelSettings;
    const rating = ctx.getOption<Mutable<typeof options[0]>>('rating')?.value;
    const nhie = await ctx.client.database.getRandomQuestion(
      'NHIE',
      channelSettings.disabledRatings,
      rating,
      ctx.guildId
    );
    ctx.reply({
      content: ctx.client.functions.upvoteAd(),
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
    });
  },
};

export default nhie;
