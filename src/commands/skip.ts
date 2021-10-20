import type Command from '../classes/Command';
import type Context from '../classes/Context';

const skip: Command = {
  name: 'skip',
  description: 'Skips a paranoia question sent to you if the question is stuck',
  category: 'question',
  perms: [],
  run: async (ctx: Context) => {
    if (ctx.guildId)
      return ctx.reply(`${ctx.client.EMOTES.xmark} Paranoia questions can only be skipped in DMs.`);

    const currentParanoia = await ctx.client.database.getNextParanoia(ctx.user.id);

    if (!currentParanoia)
      return ctx.reply(`${ctx.client.EMOTES.xmark} You don't have any active paranoia questions.`);

    await ctx.client.database.removeParanoiaQuestion(currentParanoia.id);

    // edit message to let the user know the question has been skipped
    const editedMessage = await ctx.client.functions.editMessage(
      {
        embeds: [
          {
            title: currentParanoia.questionText,
            color: ctx.client.COLORS.YELLOW,
            description: 'Question skipped',
            footer: {
              text: `Type: PARANOIA | Rating: ${currentParanoia.questionRating} | ID: ${currentParanoia.questionId}`,
            },
          },
        ],
      },
      ctx.channelId,
      currentParanoia.dmMessageId,
      ctx.client.token
    );
    if (!editedMessage)
      ctx.client.console.warn(
        `Paranoia skip message edit failed in channel: ${ctx.channelId} with user: ${ctx.user.id} on message: ${currentParanoia.dmMessageId}`
      );

    // get next queued question, if there is one
    const nextParanoia = await ctx.client.database.getNextParanoia(ctx.user.id);
    if (!nextParanoia) return ctx.reply(`${ctx.client.EMOTES.checkmark} Your queue is now empty.`);

    // fetch server name
    const guild = await ctx.client.functions.fetchGuild(nextParanoia.guildId, ctx.client.token);
    if (!guild) ctx.client.console.warn(`Failed to fetch guild: ${nextParanoia.guildId}`);

    // send next question in DMs
    const nextMessage = await ctx.client.functions.sendMessage(
      {
        embeds: [
          {
            title: nextParanoia.questionText,
            color: ctx.client.COLORS.BLUE,
            description: `Use \`/answer\` to answer this question.\n\nQuestion sent from **${
              guild ? guild.name : `Unknown Guild (${nextParanoia.guildId})`
            }** <#${nextParanoia.channelId}>.`,
            footer: {
              text: `Type: PARANOIA | Rating: ${nextParanoia.questionRating} | ID: ${nextParanoia.questionId}`,
            },
          },
        ],
      },
      ctx.channelId,
      ctx.client.token
    );
    if (!nextMessage) {
      ctx.reply(
        `${ctx.client.EMOTES.xmark} Something went wrong trying to send you the next question.`
      );
      return ctx.client.console.error(
        `Paranoia skip next question failed in channel: ${ctx.channelId} with user: ${ctx.user.id}`
      );
    }

    await ctx.client.database.setParanoiaMessageId(nextParanoia.id, nextMessage.id);
    ctx.reply(`${ctx.client.EMOTES.checkmark} **Question skipped!** Your next question was sent.`);
  },
};

export default skip;
