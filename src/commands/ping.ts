import type Command from '../classes/Command';
import type Context from '../classes/Context';

const ping: Command = {
  name: 'ping',
  description: 'Check if the bot is online.',
  category: 'control',
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    const now = Date.now();
    ctx.reply({
      embeds: [
        {
          description:
            `${ctx.client.EMOTES.time} **Pong!** The bot is online.` +
            `\n• Database: \`${await ctx.client.database
              .fetchSpecificQuestion('')
              .then(() => Date.now() - now)}ms\``,
          color: ctx.client.COLORS.GREEN,
        },
      ],
    });
  },
};

export default ping;
