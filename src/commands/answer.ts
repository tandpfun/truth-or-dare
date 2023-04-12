import { ApplicationCommandOptionType } from 'discord-api-types/v9';

import type Command from '../classes/Command';
import type Context from '../classes/Context';

const options = [
  {
    type: ApplicationCommandOptionType.String,
    name: 'answer',
    description: 'The answer to the paranoia question.',
    required: true,
  },
] as const;

const answer: Command = {
  name: 'answer',
  description: 'Answers a paranoia question sent to you.',
  category: 'question',
  options,
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    ctx.reply(
      `${ctx.client.EMOTES.xmark} We recently updated how paranoia works, switching away from using using commands to answer questions. To answer a paranoia question, press the "answer" button below the question DMed to you. If there is no button, have them send you another question.`
    );
  },
};

export default answer;
