import Command from '../classes/Command';
import Context from '../classes/Context';

const stats: Command = {
  name: 'stats',
  description: 'Find cool statistics about the bot.',
  category: 'control',
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    ctx.reply({
      embeds: [
        {
          color: ctx.client.COLORS.BLUE,
          title: 'Statistics',
          description: `Last Restart: <t:${(process.uptime() * 1000) | 0}:R>\nCommands/s: ${(
            ctx.client.stats.perMinuteCommandAverage / 60
          ).toFixed(2)}\nMost Popular Command: ${
            Object.entries(ctx.client.stats.commands).reduce((a, c) => (a[1] > c[1] ? a : c))[0]
          }\n\nCommands Run So Far:\n${Object.entries(ctx.client.stats.commands)
            .map(([command, count]) => `${command}: ${count.toLocaleString()}`)
            .join('\n')}\n\nQuestion Counts:\n${Object.entries(ctx.client.database.questionCache)
            .map(
              ([type, rates]) =>
                `${type}: ${Object.entries(rates)
                  .map(([rate, quests]) => `${rate}: ${quests.length.toLocaleString()}`)
                  .join(', ')}`
            )
            .join('\n')}`,
        },
      ],
    });
  },
};

export default stats;
