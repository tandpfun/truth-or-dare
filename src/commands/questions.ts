import {
  ApplicationCommandInteractionDataOptionNumber,
  ApplicationCommandInteractionDataOptionString,
  ApplicationCommandOptionType,
} from 'discord-api-types';
import { QuestionType, Rating } from '.prisma/client';

import type Command from '../classes/Command';
import type Context from '../classes/Context';

const PER_PAGE = 15;

const questions: Command = {
  name: 'questions',
  description: 'List, add, and remove custom questions for this server',
  category: 'control',
  perms: ['ManageGuild'],
  options: [
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: 'list',
      description: 'List all the custom questions added so far',
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: 'type',
          description: 'The type of question to list',
          choices: [
            { name: 'all', value: 'ALL' },
            { name: 'truth', value: 'TRUTH' },
            { name: 'dare', value: 'DARE' },
            { name: 'wyr', value: 'WYR' },
            { name: 'nhie', value: 'NHIE' },
            { name: 'paranoia', value: 'PARANOIA' },
          ],
        },
        {
          type: ApplicationCommandOptionType.String,
          name: 'rating',
          description: 'The rating of questions to list',
          choices: [
            { name: 'all', value: 'ALL' },
            { name: 'PG', value: 'PG' },
            { name: 'PG13', value: 'PG13' },
            { name: 'R', value: 'R' },
          ],
        },
        {
          type: ApplicationCommandOptionType.Integer,
          name: 'page',
          description: 'The page number of questions of list',
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: 'add',
      description: 'Adds a new custom question for this server',
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: 'type',
          description: 'The type of question to add',
          choices: [
            { name: 'truth', value: 'TRUTH' },
            { name: 'dare', value: 'DARE' },
            { name: 'wyr', value: 'WYR' },
            { name: 'nhie', value: 'NHIE' },
            { name: 'paranoia', value: 'PARANOIA' },
          ],
          required: true,
        },
        {
          type: ApplicationCommandOptionType.String,
          name: 'rating',
          description: 'The rating of question to add',
          choices: [
            { name: 'PG', value: 'PG' },
            { name: 'PG13', value: 'PG13' },
            { name: 'R', value: 'R' },
          ],
          required: true,
        },
        {
          type: ApplicationCommandOptionType.String,
          name: 'question',
          description: 'The question to add',
          required: true,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: 'remove',
      description: 'Removes a custom question from this server',
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: 'id',
          description: 'The id of the question to remove (get the ID using /customquestion list)',
          required: true,
        },
      ],
    },
  ],
  run: async (ctx: Context) => {
    if (!ctx.guildId)
      return ctx.reply(`${ctx.client.EMOTES.xmark} Custom questions cannot be edited in DMs`);

    // const args = (ctx.options[0] as ApplicationCommandInteractionDataOptionSubCommand).options;

    if (ctx.args[0] === 'list') {
      const questionType = ((ctx.getOption('type') as ApplicationCommandInteractionDataOptionString)
        ?.value || 'ALL') as QuestionType | 'ALL';
      const rating = ((ctx.getOption('rating') as ApplicationCommandInteractionDataOptionString)
        ?.value || 'ALL') as Rating | 'ALL';

      const questions = await ctx.client.database.getCustomQuestions(
        ctx.guildId,
        questionType === 'ALL' ? undefined : questionType,
        rating === 'ALL' ? undefined : rating
      );

      const page = Math.min(
        Math.max(
          (ctx.getOption('page') as ApplicationCommandInteractionDataOptionNumber)?.value || 1,
          1
        ),
        Math.ceil(questions.length / PER_PAGE)
      );

      const titleCase = ctx.client.functions.titleCase;
      // TODO: Buttons
      return ctx.reply({
        embeds: [
          {
            title: `${titleCase(questionType)} ${titleCase(
              rating
            )} Custom Questions | Page ${page}`,
            description:
              questionType === 'ALL'
                ? Object.values(QuestionType)
                    .map(
                      type =>
                        `${type}: ${questions.reduce(
                          (total, q) => total + (q.type === type ? 1 : 0),
                          0
                        )}`
                    )
                    .join('\n')
                : `Total ${titleCase(questionType)} Questions: ${questions.length}`,
            fields: questions.slice((page - 1) * PER_PAGE, page * PER_PAGE).map(q => ({
              name: q.question,
              value: `Type: ${q.type} | Rating: ${q.rating} | ID: ${q.id}`,
            })),
            footer: {
              text: 'Page ' + page,
            },
          },
        ],
      });
    } else if (ctx.args[0] === 'add') {
      const type = (ctx.getOption('type') as ApplicationCommandInteractionDataOptionString)
        .value as QuestionType;
      const rating = (ctx.getOption('rating') as ApplicationCommandInteractionDataOptionString)
        .value as Rating;
      const question = (ctx.getOption('question') as ApplicationCommandInteractionDataOptionString)
        .value;

      if (question.length > 256) return ctx.reply('Maximum question length is 256 characters');

      await ctx.client.database.addCustomQuestion({
        guildId: ctx.guildId,
        type,
        rating,
        question,
      });

      return ctx.reply(`${ctx.client.EMOTES.checkmark} Question Added`);
    } else if (ctx.args[0] === 'remove') {
      const id = (ctx.getOption('id') as ApplicationCommandInteractionDataOptionString).value;

      const deleted = await ctx.client.database.deleteCustomQuestion(id);
      return ctx.reply({
        embeds: [
          ctx.client.functions.embed(
            deleted
              ? 'Question removed'
              : 'Something went wrong, maybe the question has already been deleted?',
            ctx.user,
            !!deleted
          ),
        ],
      });
    }
  },
};

export default questions;
