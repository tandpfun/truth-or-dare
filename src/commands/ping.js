import { MessageEmbed } from 'discord.js';
import Command from '../../lib/classes/Command.js';

export default class PingCommand extends Command {
  constructor(name, client) {
    super(name, client, {
      description: 'Check if the bot is online!',
    });
  }

  async run(ctx) {
    const embed = new MessageEmbed()
      .setTitle('⏱️ **Pong!** 00ms Latency!')
      .setColor('GREEN');

    ctx.reply({
      embeds: [embed.toJSON()],
    });
  }
}
