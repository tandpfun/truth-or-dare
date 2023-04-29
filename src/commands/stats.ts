import { QuestionType, Rating } from '@prisma/client';

import type Command from '../classes/Command';
import type Context from '../classes/Context';
import { ApplicationCommandContext } from '../classes/Command';

const stats: Command = {
  name: 'stats',
  description: 'List some statistics on the bot!',
  category: 'control',
  perms: [],
  contexts: [ApplicationCommandContext.Guild, ApplicationCommandContext.BotDM],
  run: async (ctx: Context): Promise<void> => {
    ctx.reply({
      embeds: [
        {
          color: ctx.client.COLORS.BLUE,
          title: ctx.client.EMOTES.graph + ' Statistics',
          description: `Last Restart: <t:${
            (Date.now() / 1000 - process.uptime()) | 0
          }:R>\nCommands/s: ${(
            ctx.client.stats.pastCommandCounts.reduce((a, c) => a + c, 0) /
            (ctx.client.stats.pastCommandCounts.length * 60)
          ).toFixed(2)}\nMost Popular Command: ${ctx.client.functions.titleCase(
            Object.entries(ctx.client.stats.commands).reduce((a, c) => (a[1] > c[1] ? a : c))[0]
          )}\n\n__Commands Run So Far:__\n${Object.entries(ctx.client.stats.commands)
            .sort(([_, count1], [_2, count2]) => count2 - count1)
            .map(
              ([command, count]) =>
                `${ctx.client.functions.titleCase(command)}: ${count.toLocaleString()}`
            )
            .join('\n')}\n\n__Question Counts:__ (${
            ctx.client.database.questionCache.length // total number of questions
          })\n${Object.values(QuestionType)
            .map(
              type =>
                `${type}: ${Object.values(Rating)
                  .map(
                    rate =>
                      `${rate}: ${ctx.client.database.questionCache
                        .filter(q => q.type === type && q.rating === rate)
                        .length.toLocaleString()}`
                  )
                  .join(' | ')}`
            )
            .join('\n')}`,
        },
      ],
    });
  },
};

export default stats;
