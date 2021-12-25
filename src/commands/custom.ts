import { ApplicationCommandOptionType } from 'discord-api-types';

import type { Mutable } from '../classes/OptionTypes';
import type Command from '../classes/Command';
import type Context from '../classes/Context';

const options = [
  {
    type: ApplicationCommandOptionType.String,
    name: 'rating',
    description: 'The rating of question to add.',
    choices: [
      { name: 'PG', value: 'PG' },
      { name: 'PG13', value: 'PG13' },
      { name: 'R', value: 'R' },
    ],
  },
  {
    type: ApplicationCommandOptionType.String,
    name: 'question',
    description: 'The question to add.',
    required: true,
  },
] as const;

const custom: Command = {
  name: 'custom',
  description: 'Send a custom question in the channel for other members to see.',
  category: 'question',
  options,
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    const rating = ctx.getOption<Mutable<typeof options[0]>>('rating')?.value ?? 'UNKNOWN';
    const question = ctx.getOption<Mutable<typeof options[1]>>('question')!.value;

    ctx.reply({
      content: ctx.client.functions.upvoteAd(),
      embeds: [
        {
          author: {
            name: ctx.user.username + '#' + ctx.user.discriminator,
            icon_url: ctx.client.functions.avatarURL(ctx.user),
          },
          title: question,
          color: ctx.client.COLORS.BLUE,
          footer: {
            text: `Type: CUSTOM | Rating: ${rating} | ID: ${ctx.user.id}`,
          },
        },
      ],
    });
  },
};

export default custom;
