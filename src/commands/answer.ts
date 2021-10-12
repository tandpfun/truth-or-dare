import {
  APIMessage,
  ApplicationCommandInteractionDataOptionString,
  ApplicationCommandOptionType,
} from 'discord-api-types';
import Context from '../classes/Context';
import Command from '../classes/Command';

const answer: Command = {
  name: 'answer',
  description: 'Answers a paranoia question sent to you',
  category: 'question',
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: 'answer',
      description: 'The answer to the paranoia question',
      required: true,
    },
  ],
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    if (ctx.guildId) return ctx.reply('Paranoia questions can only be answered in DMs');

    const paranoiaData = await ctx.client.database.getNextParanoia(ctx.user.id);
    if (!paranoiaData) return ctx.reply('There are no active paranoia questions');

    // send answer to the channel the question was sent from
    // @ts-ignore
    const message: APIMessage | null = await ctx.client.functions
      .sendMessage(
        {
          embeds: [
            {
              author: {
                name: ctx.user.username,
                icon_url: ctx.client.functions.avatarURL(ctx.user),
              },
              title: `Paranoia Answer To: ${
                Math.random() < 0.5 ? paranoiaData.questionText : 'Question Hidden'
              }`,
              description: (
                ctx.getOption('answer') as ApplicationCommandInteractionDataOptionString
              )?.value,
            },
          ],
        },
        paranoiaData.channelId,
        ctx.client.token
      )
      .catch(_ => null);
    if (!message)
      return ctx.reply({
        embeds: [
          ctx.client.functions.embed(
            `Message failed to send, please make sure I can send messages in <#${paranoiaData.channelId}> and then try again.`,
            ctx.user,
            true
          ),
        ],
      });

    const editedMessage = await ctx.client.functions
      .editMessage(
        { content: ctx.client.EMOTES.checkmark + ' Question answered.' },
        ctx.channelId,
        paranoiaData.dmMessageId,
        ctx.client.token
      )
      .catch(_ => null);
    if (!editedMessage)
      ctx.client.console.warn(
        `Paranoia message edit failed in channel: ${ctx.channelId} with user: ${ctx.user.id} on message: ${paranoiaData.dmMessageId}`
      );

    await ctx.client.database.removeParanoiaQuestion(paranoiaData.id);

    ctx.reply(`${ctx.client.EMOTES.checkmark} Answer sent!`);

    // fetch the next queued question, if there is one
    const nextQuestion = await ctx.client.database.getNextParanoia(ctx.user.id);
    if (!nextQuestion) return;

    const guildName: string | null = await ctx.client.functions
      .fetchGuild(nextQuestion.guildId, ctx.client.token)
      .catch(_ => null);
    if (!guildName) ctx.client.console.warn(`Failed to fetch guild: ${nextQuestion.guildId}`);

    const nextMessage = await ctx.client.functions
      .sendMessage(
        {
          embeds: [
            {
              title: `Paranoia Question From: ${
                guildName ? `**${guildName}**` : `Unknown server (${nextQuestion.guildId})`
              }`,
              color: ctx.client.COLORS.BLUE,
              description: `Use \`/answer\` to answer this question\n\n**${nextQuestion.questionText}**`,
              footer: {
                text: `Type: PARANOIA | Rating: ${nextQuestion.questionRating} | ID: ${nextQuestion.questionId}`,
              },
            },
          ],
        },
        nextQuestion.channelId,
        ctx.client.token
      )
      .catch(_ => null);
    if (!nextMessage)
      return ctx.client.console.error(
        `Paranoia next question failed in channel: ${ctx.channelId} with user: ${ctx.user.id}`
      );

    await ctx.client.database.setParanoiaMessageId(paranoiaData.id, nextQuestion.id);
  },
};

export default answer;
