import type Command from '../classes/Command';
import type Context from '../classes/Context';

const skip: Command = {
  name: 'skip',
  description: 'Skips a paranoia question sent to you if the question is stuck.',
  category: 'question',
  perms: [],
  run: async (ctx: Context) => {
    ctx.reply(
      `${ctx.client.EMOTES.xmark} We recently updated how paranoia works, switching away from using commands to answer questions. You should no longer need to skip a question for a user to send you another.`
    );
  },
};

export default skip;
