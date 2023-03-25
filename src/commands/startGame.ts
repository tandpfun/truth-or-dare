import { ApplicationCommandOptionType, ButtonStyle, ComponentType } from 'discord-api-types/v9';

import type { Mutable } from '../classes/OptionTypes';
import type Command from '../classes/Command';
import type Context from '../classes/Context';

const options = [
  {
    type: ApplicationCommandOptionType.String,
    name: 'type',
    description: 'The type of question to send.',
    choices: [
      { name: 'TRUTH', value: 'TRUTH' },
      { name: 'WYR', value: 'WYR' },
      { name: 'NHIE', value: 'NHIE' },
      { name: 'PARANOIA', value: 'PARANOIA' },
      { name: 'random', value: 'NONE' },
    ],
  },
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

const truth: Command = {
  name: 'startgame',
  description: 'Start an interactive game of Truth or Dare',
  category: 'question',
  options,
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    const rating = ctx.getOption<Mutable<typeof options[1]>>('rating')?.value;
    const specifiedQuestionType = ctx.getOption<Mutable<typeof options[0]>>('type')?.value;

    let questionType;
    const gameTypes = ['TRUTH', 'WYR', 'NHIE', 'PARANOIA'] as const;
    if (!specifiedQuestionType || specifiedQuestionType === 'NONE')
      questionType = gameTypes[Math.floor(Math.random() * gameTypes.length)];
    else questionType = specifiedQuestionType;

    const question = await ctx.client.getQuestion(ctx, questionType, rating);
    if (question.id) ctx.client.metrics.trackRatingSelection(rating || 'NONE');

    ctx.reply({
      content: ctx.client.functions.promoMessage(ctx.client, ctx.premium),
      embeds: [
        {
          title: question.question,
          description: 'Click the button below to answer!',
          color: ctx.client.COLORS.BLUE,
          footer: question.id
            ? {
                text: `Type: ${question.type} | Rating: ${question.rating} | ID: ${question.id}`,
              }
            : undefined,
        },
      ],
      components: [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.Button,
              custom_id: `ANSWER:${question.id}:${ctx.channelId}:${ctx.guildId}`,
              label: 'Answer',
              style: ButtonStyle.Primary,
            },
            {
              type: ComponentType.Button,
              custom_id: `${question.type}:${rating || 'NONE'}:NONE`,
              label: 'New Question',
              style: ButtonStyle.Secondary,
            },
          ],
        },
      ],
    });
  },
};

export default truth;
