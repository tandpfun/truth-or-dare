import { CustomQuestion, QuestionType, Rating } from '.prisma/client';
import {
  ApplicationCommandInteractionDataOptionNumber,
  ApplicationCommandInteractionDataOptionString,
  ApplicationCommandOptionType,
} from 'discord-api-types';
import Command from '../classes/Command';
import Context from '../classes/Context';

const customQuestion: Command = {
  name: 'customquestion',
  description: 'List, add, and remove custom questions for this server',
  category: 'control',
  perms: ['ManageChannels'],
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
            { name: 'all', value: 'ALL' },
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
      return ctx.reply(ctx.client.EMOTES.xmark + 'Custom questions cannot be edited in DMs');

    if (ctx.args[0] === 'list') {
      const questionType = <QuestionType | 'ALL'>(
        (ctx.getOption('type') as ApplicationCommandInteractionDataOptionString)?.value
      );
      const rating = <Rating | 'ALL'>(
        (ctx.getOption('rating') as ApplicationCommandInteractionDataOptionString)?.value
      );
      const ratingList: Rating[] = rating !== 'ALL' ? [rating] : ['PG', 'PG13', 'R'];

      const questions =
        questionType !== 'ALL'
          ? await ctx.client.database.getCustomQuestions(ctx.guildId, questionType, ratingList)
          : [
              ...(await ctx.client.database.getCustomQuestions(ctx.guildId, 'TRUTH', ratingList)),
              ...(await ctx.client.database.getCustomQuestions(ctx.guildId, 'DARE', ratingList)),
              ...(await ctx.client.database.getCustomQuestions(
                ctx.guildId,
                'PARANOIA',
                ratingList
              )),
              ...(await ctx.client.database.getCustomQuestions(ctx.guildId, 'WYR', ratingList)),
              ...(await ctx.client.database.getCustomQuestions(ctx.guildId, 'NHIE', ratingList)),
            ];
      const questionsPerPage = 15;
      const pages = questions.reduce(
        (result: CustomQuestion[][], question: CustomQuestion, index: number) => {
          const page = Math.floor(index / questionsPerPage);
          result[page] = [...(result[page] || []), question];
          return result;
        },
        []
      );

      let pageNumber = (ctx.getOption('page') as ApplicationCommandInteractionDataOptionNumber)
        ?.value;
      if (!pageNumber || pageNumber < 1) pageNumber = 1;
      if (pageNumber > pages.length) pageNumber = pages.length;

      ctx.reply({
        embeds: [
          {
            title: createListTitle(questionType, rating, pageNumber),
            description:
              questionType === 'ALL'
                ? createListDescription(questions)
                : `Total ${
                    questionType[0] + questionType.toLowerCase().substring(1)
                  } Questions: ${questions.reduce(
                    (count, item) => (item.type === questionType ? count + 1 : count),
                    0
                  )}`,
            fields: pages[pageNumber - 1].map(question => ({
              name: question.question,
              value: `Type: ${question.type} | Rating: ${question.rating} | ID: ${question.id}`,
            })),
            footer: {
              text: 'Page ' + pageNumber,
            },
          },
        ],
      });
    } else if (ctx.args[0] === 'add') {
      const type = <QuestionType>(
        (ctx.getOption('type') as ApplicationCommandInteractionDataOptionString)?.value
      );
      const rating = <Rating>(
        (ctx.getOption('rating') as ApplicationCommandInteractionDataOptionString)?.value
      );
      const questionText = (
        ctx.getOption('question') as ApplicationCommandInteractionDataOptionString
      )?.value;

      if (questionText.length > 256) return ctx.reply('Maximum question length is 256 characters');

      await ctx.client.database.addCustomQuestion({
        guildId: ctx.guildId,
        type,
        rating,
        question: questionText,
      });

      ctx.reply(ctx.client.EMOTES.checkmark + ' Question Added');
    } else if (ctx.args[0] === 'remove') {
      const id = (ctx.getOption('id') as ApplicationCommandInteractionDataOptionString)?.value;

      try {
        await ctx.client.database.deleteCustomQuestion(id);
        ctx.reply(ctx.client.EMOTES.checkmark + ' Question Removed');
      } catch {
        ctx.reply(ctx.client.EMOTES.xmark + ' Failed to remove question');
      }
    }
  },
};

export default customQuestion;

function createListTitle(type: QuestionType | 'ALL', rating: Rating | 'ALL', pageNumber: number) {
  const typeString = type === 'ALL' ? '' : type[0] + type.toLowerCase().substring(1) + ' ';
  const ratingString = rating === 'ALL' ? '' : rating[0] + rating.toLowerCase().substring(1) + ' ';
  return `${typeString}${ratingString}Custom Questions | Page ${pageNumber}`;
}

function createListDescription(questions: CustomQuestion[]) {
  return `TRUTH: ${questions.reduce(
    (count, item) => (item.type === 'TRUTH' ? count + 1 : count),
    0
  )}
    DARE: ${questions.reduce((count, item) => (item.type === 'DARE' ? count + 1 : count), 0)}
    PARANOIA: ${questions.reduce(
      (count, item) => (item.type === 'PARANOIA' ? count + 1 : count),
      0
    )}
    WYR: ${questions.reduce((count, item) => (item.type === 'WYR' ? count + 1 : count), 0)}
    NHIE: ${questions.reduce((count, item) => (item.type === 'NHIE' ? count + 1 : count), 0)}`;
}
