import Command from '../classes/Command';
import Context from '../classes/Context';

const ping: Command = {
  name: 'ping',
  description: 'Check if the bot is online.',
  category: 'control',
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    ctx.reply({
      embeds: [
        {
          description: `${ctx.client.EMOTES.time} **Pong!** The bot is online.`,
          color: ctx.client.COLORS.GREEN,
        },
      ],
    });
  },
};

export default ping;
