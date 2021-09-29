import Command from '../../classes/Command';
import Context from '../../classes/Context';

const ping: Command = {
  name: 'ping',
  description: 'Check if the bot is online!',
  options: [],
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    ctx.reply({
      embeds: [
        {
          description: `${ctx.client.EMOTES.time} **Pong!** IDK the Latency!`,
          color: ctx.client.COLORS.GREEN,
        },
      ],
    });
  },
};

export default ping;
