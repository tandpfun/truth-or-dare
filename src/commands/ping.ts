import Client from '../../classes/Client';
import Command from '../../classes/Command';
import Context from '../../classes/Context';

export default class PingCommand extends Command {
  constructor(name: string, client: Client) {
    super(name, client, {
      description: 'Check if the bot is online!',
    });
  }

  async run(ctx: Context) {
    await ctx.reply({
      embeds: [
        {
          title: `${this.client.EMOTES.time} **Pong!** IDK the Latency!`,
          color: this.client.COLORS.GREEN,
        },
      ],
    });
  }
}
