import type Command from '../classes/Command';
import type CommandContext from '../classes/CommandContext';

const ping: Command = {
  name: 'ping',
  description: 'Check if the bot is online.',
  category: 'control',
  perms: [],
  run: async (ctx: CommandContext): Promise<void> => {
    return ctx.reply({
      embeds: [
        {
          description:
            `${ctx.client.EMOTES.time} **Pong!** The bot is online.` +
            `\n• Database: \`${await ctx.client.database.ping()}ms\``,
          color: ctx.client.COLORS.GREEN,
        },
      ],
    });
  },
};

export default ping;
