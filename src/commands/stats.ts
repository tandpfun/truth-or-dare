import { ButtonStyle, ComponentType } from 'discord-api-types/v9';
import Command from '../classes/Command';
import Context from '../classes/Context';

const stats: Command = {
  name: 'stats',
  description: 'List some statistics on the bot!',
  category: 'control',
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    ctx.reply({
      embeds: [
        {
          color: ctx.client.COLORS.BLUE,
          title: ctx.client.EMOTES.graph + ' Statistics',
          description: `Last Restart: <t:${
            (Date.now() / 1000 - process.uptime()) | 0
          }:R>\nCommands/s: ${(ctx.client.stats.perMinuteCommandAverage / 60).toFixed(
            2
          )}\nMost Popular Command: ${ctx.client.functions.titleCase(
            Object.entries(ctx.client.stats.commands).reduce((a, c) => (a[1] > c[1] ? a : c))[0]
          )}\n\n__Commands Run So Far:__\n${Object.entries(ctx.client.stats.commands)
            .sort(([_, count1], [_2, count2]) => count2 - count1)
            .map(
              ([command, count]) =>
                `${ctx.client.functions.titleCase(command)}: ${count.toLocaleString()}`
            )
            .join('\n')}\n\n__Question Counts:__ (${Object.values(
            ctx.client.database.questionCache
          ).reduce(
            (total, type) =>
              total + Object.values(type).reduce((tot, rating) => tot + rating.length, 0),
            0
          )})\n${Object.entries(ctx.client.database.questionCache)
            .map(
              ([type, rates]) =>
                `${type}: ${Object.entries(rates)
                  .map(([rate, quests]) => `${rate}: ${quests.length.toLocaleString()}`)
                  .join(' | ')}`
            )
            .join('\n')}`,
        },
      ],
      components: [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.Button,
              label: 'More Stats',
              url: 'https://statcord.com/bot/692045914436796436',
              style: ButtonStyle.Link,
            },
          ],
        },
      ],
    });
  },
};

export default stats;