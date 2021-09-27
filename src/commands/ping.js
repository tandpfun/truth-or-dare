import Command from '../../lib/classes/Command.js'

export default class PingCommand extends Command {
  constructor(name, client) {
    super(name, client, {
      description: 'Check if the bot is online!'
    })
  }

  async run(ctx) {
    ctx.reply('Pong!')
  }
}
