import { ApplicationCommandOptionType } from 'discord-api-types/v9';

import type { Mutable } from '../classes/OptionTypes';
import type Command from '../classes/Command';
import type Context from '../classes/Context';

const options = [
  {
    type: ApplicationCommandOptionType.String,
    name: 'answer',
    description: 'The answer to the paranoia question.',
    required: true,
  },
] as const;

const answer: Command = {
  name: 'answer',
  description: 'Answers a paranoia question sent to you.',
  category: 'question',
  options,
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    const paranoiaAnswer = ctx.getOption<Mutable<typeof options[0]>>('answer')!.value;

    if (ctx.guildId)
      return ctx.reply({
        content: `${ctx.client.EMOTES.xmark} Paranoia questions can only be answered in DMs.`,
        flags: 1 << 6,
      });

    const paranoiaData = await ctx.client.database.getNextParanoia(ctx.user.id);
    if (!paranoiaData)
      return ctx.reply(`${ctx.client.EMOTES.xmark} You don't have any active paranoia questions.`);

    const showFreq = ctx.client.database.isPremiumGuild(paranoiaData.guildId)
      ? (await ctx.client.database.fetchGuildSettings(paranoiaData.guildId)).showParanoiaFrequency
      : ctx.client.database.defaultGuildSettings(ctx.guildId!).showParanoiaFrequency;

    // send answer to the channel the question was sent from
    const message = await ctx.client.functions.sendMessage(
      {
        embeds: [
          {
            author: {
              name: `${ctx.user.username}#${ctx.user.discriminator}`,
              icon_url: ctx.client.functions.avatarURL(ctx.user),
            },
            title: `Paranoia Answer`,
            color: ctx.client.COLORS.BLUE,
            fields: [
              {
                name: 'Question:',
                value:
                  Math.random() < showFreq / 100
                    ? paranoiaData.questionText
                    : `The user got lucky, and the question wasn't shared.`,
              },
              {
                name: `${ctx.user.username}'s Answer:`,
                value: paranoiaAnswer.slice(0, 1021) + (paranoiaAnswer.length > 1021 ? '...' : ''),
              },
            ],
          },
        ],
      },
      paranoiaData.channelId,
      ctx.client.token
    );
    if (!message)
      return ctx.reply({
        embeds: [
          ctx.client.functions.embed(
            `Message failed to send, please make sure I can send messages in <#${paranoiaData.channelId}> and then try again. If that's not the issue, try running \`/skip\` to skip the question.`,
            ctx.user,
            true
          ),
        ],
      });

    const editedMessage = await ctx.client.functions.editMessage(
      {
        embeds: [
          {
            title: paranoiaData.questionText,
            color: ctx.client.COLORS.GREEN,
            description: `Question answered: Check it out in <#${paranoiaData.channelId}>.`,
            footer: {
              text: `Type: PARANOIA | Rating: ${paranoiaData.questionRating} | ID: ${paranoiaData.questionId}`,
            },
          },
        ],
      },
      ctx.channelId,
      paranoiaData.dmMessageId!,
      ctx.client.token
    );
    if (!editedMessage)
      ctx.client.console.warn(
        `Paranoia message edit failed in channel: ${ctx.channelId} with user: ${ctx.user.id} on message: ${paranoiaData.dmMessageId}`
      );

    await ctx.client.database.removeParanoiaQuestion(paranoiaData.id);

    ctx.reply(`${ctx.client.EMOTES.checkmark} Answer sent!`);

    // fetch the next queued question, if there is one
    const nextQuestion = await ctx.client.database.getNextParanoia(ctx.user.id);
    if (!nextQuestion) return;

    const guild = await ctx.client.functions.fetchGuild(nextQuestion.guildId, ctx.client.token);
    if (!guild) ctx.client.console.warn(`Failed to fetch guild: ${nextQuestion.guildId}`);

    const nextMessage = await ctx.client.functions.sendMessage(
      {
        embeds: [
          {
            title: nextQuestion.questionText,
            color: ctx.client.COLORS.BLUE,
            description: `Use \`/answer\` to answer this question.\n\nQuestion sent from **${
              guild ? guild.name : `Unknown Guild (${nextQuestion.guildId})`
            }** <#${nextQuestion.channelId}>.`,
            footer: {
              text: `Type: PARANOIA | Rating: ${nextQuestion.questionRating} | ID: ${nextQuestion.questionId}`,
            },
          },
        ],
      },
      ctx.channelId,
      ctx.client.token
    );
    if (!nextMessage)
      return ctx.client.console.error(
        `Paranoia next question failed in channel: ${ctx.channelId} with user: ${ctx.user.id}`
      );

    await ctx.client.database.setParanoiaMessageId(nextQuestion.id, nextMessage.id);
  },
};

export default answer;
