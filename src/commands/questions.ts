import { QuestionType, Rating } from '.prisma/client';
import {
  ApplicationCommandInteractionDataOptionNumber,
  ApplicationCommandInteractionDataOptionString,
  ApplicationCommandOptionType,
} from 'discord-api-types';
import Command from '../classes/Command';
import Context from '../classes/Context';

const PER_PAGE = 15;

const questions: Command = {
  name: 'questions',
  description: 'Control question settings for this server',
  category: 'control',
  perms: ['ManageGuild'],
  options: [
    {
      type: ApplicationCommandOptionType.SubcommandGroup,
      name: 'list',
      description: 'List custom questions or disabled global questions for this server',
      options: [
        {
          type: ApplicationCommandOptionType.Subcommand,
          name: 'custom',
          description: 'List custom questions added to this server',
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
              description: 'The page number of questions to list',
            },
          ]
        },
        {
          type: ApplicationCommandOptionType.Subcommand,
          name: 'disabled',
          description: 'List global questions that have been disabled for this server',
          options: [
            {
              type: ApplicationCommandOptionType.Integer,
              name: 'page',
              description: 'The page number of questions to list'
            }
          ]
        }
      ]
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
          description: 'The id of the question to remove (get the ID using `/question list custom`)',
          required: true,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: 'disable',
      description: 'Disables a global question from being shown in this server',
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: 'id',
          description: 'The id of the question to disable',
          required: true,
        }
      ]
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: 'enable',
      description: 'Enable a global question that has been disabled',
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: 'id',
          description: 'The id of the question to enable (get the ID using `/question list disabled`)',
          required: true
        }
      ]
    },
  ],
  run: async (ctx: Context) => {
    if (!ctx.guildId)
    return ctx.reply(`${ctx.client.EMOTES.xmark} Custom questions cannot be edited in DMs`);

    if (ctx.args[0] === 'list') {
      // my best guess as to how to access subcommand inside subcommand group
      if (ctx.args[1] === 'custom') {
        const questionType = (ctx.getOption('type') as ApplicationCommandInteractionDataOptionString)?.value as QuestionType | 'ALL'
        const rating = ((ctx.getOption('rating') as ApplicationCommandInteractionDataOptionString)?.value || 'ALL') as Rating | 'ALL'
  
        const questions = await ctx.client.database.getCustomQuestions(
          ctx.guildId,
          questionType === 'ALL' ? undefined : questionType,
          rating === 'ALL' ? undefined : rating
        );

        const page = Math.min(
          Math.max(
            (ctx.getOption('page') as ApplicationCommandInteractionDataOptionNumber)
              ?.value || 1,
            1
          ),
          Math.ceil(questions.length / PER_PAGE)
        );
        
        const titleCase = ctx.client.functions.titleCase;
        // TODO: Buttons
        return ctx.reply({
          embeds: [
            {
              title: `${titleCase(questionType)} ${titleCase(rating)} Custom Questions | Page ${page}`,
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
      } else if (ctx.args[1] === 'disabled') {
        const questions = await ctx.client.database.getDisabledQuestions(ctx.guildId);
        const page = Math.min(
          Math.max(
            (ctx.getOption('page') as ApplicationCommandInteractionDataOptionNumber)
              ?.value || 1,
            1
          ),
          Math.ceil(questions.length / PER_PAGE)
        );
        
        return ctx.reply({
          embeds: [
            {
              title: `Disabled Questions | Page ${page}`,
              description: `Total Disabled Questions: ${questions.length}`,
              fields: questions.slice((page - 1) * PER_PAGE, page * PER_PAGE).map(q => ({
                name: q.question,
                value: `Type: ${q.type} | Rating: ${q.rating} | ID: ${q.id}`,
              })),
              footer: {
                text: 'Page ' + page,
              },
            }
          ]
        })
      }
    } else if (ctx.args[0] === 'add') {
      const type = (
        ctx.getOption('type') as ApplicationCommandInteractionDataOptionString
      )?.value as QuestionType
      const rating = (
        ctx.getOption('rating') as ApplicationCommandInteractionDataOptionString
      )?.value as Rating
      const question = (
        ctx.getOption('question') as ApplicationCommandInteractionDataOptionString
      )?.value;

      if (question.length > 256) return ctx.reply('Maximum question length is 256 characters');

      await ctx.client.database.addCustomQuestion({
        guildId: ctx.guildId,
        type,
        rating,
        question: question,
      });

      return ctx.reply(`${ctx.client.EMOTES.checkmark} Question Added`);
    } else if (ctx.args[0] === 'remove') {
      const id = (ctx.getOption('id') as ApplicationCommandInteractionDataOptionString)
        .value;

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
    } else if (ctx.args[0] === "enable") {
      const id = (ctx.getOption('id') as ApplicationCommandInteractionDataOptionString)
        .value
      
      const currentDisabledIDs = await ctx.client.database.getDisabledQuestionIDs(ctx.guildId)
      if (!currentDisabledIDs.includes(id)) 
        return ctx.reply(`${ctx.client.EMOTES.xmark} That question is not currently disabled`)

      await ctx.client.database.setDisabledQuestionIDs(ctx.guildId, currentDisabledIDs.filter(item => item !== id))
      const question = await ctx.client.database.fetchSpecificQuestion(id)
      return ctx.reply({
        embeds: [
          {
            title: 'Question Enabled',
            fields: [
              {
                name: question.question,
                value: `Type: ${question.type} | Rating: ${question.rating} | ID: ${question.id}`
              }
            ],
            color: ctx.client.COLORS.GREEN
          }
        ]
      })
    } else if (ctx.args[0] === "disable") {
      const id = (ctx.getOption('id') as ApplicationCommandInteractionDataOptionString)
        .value
      const question = await ctx.client.database.fetchSpecificQuestion(id)
      if (!question) 
        return ctx.reply(`${ctx.client.EMOTES.xmark} No question with that ID exists`)
      
      const currentDisabledIDs = await ctx.client.database.getDisabledQuestionIDs(ctx.guildId)
      if (currentDisabledIDs.includes(id))
        return ctx.reply(`${ctx.client.EMOTES.xmark} That question is already disabled`)
      
      await ctx.client.database.setDisabledQuestionIDs(ctx.guildId, [
        ...currentDisabledIDs,
        id
      ])
      
      return ctx.reply({
        embeds: [
          {
            title: 'Question Disabled',
            fields: [
              {
                name: question.question,
                value: `Type: ${question.type} | Rating: ${question.rating} | ID: ${question.id}`
              }
            ],
            color: ctx.client.COLORS.GREEN
          }
        ]
      })
    }
  },
};

export default questions;
