import {
  ApplicationCommandOptionType,
  ApplicationCommandInteractionDataOptionString,
} from 'discord-api-types';
import Command from '../classes/Command';
import Context from '../classes/Context';
import superagent from 'superagent';

const suggest: Command = {
  name: 'suggest',
  description: 'Suggest a question to be added to the bot.',
  category: 'control',
  options: [
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
  ],
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    const type = (ctx.getOption('type') as ApplicationCommandInteractionDataOptionString).value;
    const rating = (ctx.getOption('rating') as ApplicationCommandInteractionDataOptionString).value;
    const question = (ctx.getOption('question') as ApplicationCommandInteractionDataOptionString)
      .value;
    if (!process.env.suggestHook)
      return ctx.reply({
        embeds: [
          ctx.client.functions.embed(
            "I can't seem to send the suggestion right now, please try again later",
            ctx.user,
            true
          ),
        ],
      });
    await superagent.post(process.env.suggestHook).send({
      username: ctx.user.username,
      avatar_url: ctx.client.functions.avatarURL(ctx.user),
      embeds: {
        color: ctx.client.COLORS.BLUE,
        title: question,
        footer: {
          text: `Type: ${type} | Rating: ${rating}`,
        },
      },
    });
    ctx.reply({
      embeds: [
        ctx.client.functions.embed('Sent your suggestion to the developers.', ctx.user, false),
      ],
    });
  },
};

export default suggest;
