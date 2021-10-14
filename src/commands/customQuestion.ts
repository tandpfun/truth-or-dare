import { QuestionType } from '.prisma/client';
import {
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
            { name: 'truth', value: 'TRUTH' },
            { name: 'dare', value: 'DARE' },
            { name: 'wyr', value: 'WYR' },
            { name: 'nhie', value: 'NHIE' },
            { name: 'paranoia', value: 'PARANOIA' },
          ],
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

    if (ctx.args[0] === 'list') {
      const questionType = (ctx.getOption('type') as ApplicationCommandInteractionDataOptionString)
        ?.value as QuestionType;
      const questions = await ctx.client.database.getCustomQuestions(ctx.guildId, questionType);

      // fancy pagination shit
      questions;
    }
  },
};

export default customQuestion;
