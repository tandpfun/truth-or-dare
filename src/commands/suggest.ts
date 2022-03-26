import { ApplicationCommandOptionType } from 'discord-api-types/v9';

import type { Mutable } from '../classes/OptionTypes';
import type Command from '../classes/Command';
import type Context from '../classes/Context';

const options = [
  {
    type: ApplicationCommandOptionType.String,
    name: 'type',
    description: 'The command the question will be used for.',
    required: true,
    choices: [
      { name: 'dare', value: 'DARE' },
      { name: 'nhie', value: 'NHIE' },
      { name: 'truth', value: 'TRUTH' },
      { name: 'wyr', value: 'WYR' },
      { name: 'paranoia', value: 'PARANOIA' },
    ],
  },
  {
    type: ApplicationCommandOptionType.String,
    name: 'rating',
    description: 'The maturity level of the topics the question can relate to.',
    required: true,
    choices: [
      { name: 'PG', value: 'PG' },
      { name: 'PG13', value: 'PG13' },
      { name: 'R', value: 'R' },
    ],
  },
  {
    type: ApplicationCommandOptionType.String,
    name: 'question',
    description: 'The question that will ba asked.',
    required: true,
  },
] as const;

const suggest: Command = {
  name: 'suggest',
  description: 'Suggest a question to be added to the bot.',
  category: 'control',
  options,
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    const type = ctx.getOption<Mutable<typeof options[0]>>('type')!.value;
    const rating = ctx.getOption<Mutable<typeof options[1]>>('rating')!.value;
    const question = ctx.getOption<Mutable<typeof options[2]>>('question')!.value;

    if (question.length > 256)
      return ctx.reply({
        embeds: [
          ctx.client.functions.embed(
            "That question is too long! Please make sure it's less than 256 characters.",
            ctx.user,
            true
          ),
        ],
        flags: 1 << 6,
      });

    if (!process.env.SUGGEST_HOOK)
      return ctx.reply({
        embeds: [
          ctx.client.functions.embed(
            "I can't seem to send the suggestion right now, please try again later.",
            ctx.user,
            true
          ),
        ],
        flags: 1 << 6,
      });

    if (!(ctx.user.id in ctx.client.suggestCooldowns)) {
      ctx.client.suggestCooldowns[ctx.user.id] = 5;
      setTimeout(() => {
        delete ctx.client.suggestCooldowns[ctx.user.id];
      }, 60 * 1000);
    }

    if (--ctx.client.suggestCooldowns[ctx.user.id] < 0)
      return ctx.reply({
        embeds: [
          ctx.client.functions.embed(
            "You're currently on cooldown. Please wait a minute and try again.",
            ctx.user,
            true
          ),
        ],
        flags: 1 << 6,
      });

    await ctx.client.webhookLog('suggest', {
      username: `${ctx.user.username}#${ctx.user.discriminator} (${ctx.user.id})`,
      avatar_url: ctx.client.functions.avatarURL(ctx.user),
      embeds: [
        {
          color: ctx.client.COLORS.BLUE,
          title: question,
          footer: { text: `Type: ${type} | Rating: ${rating}` },
        },
      ],
    });
    ctx.reply({
      embeds: [
        ctx.client.functions.embed('Sent your suggestion to the developers.', ctx.user, false),
      ],
    });
  },
};

export default suggest;
