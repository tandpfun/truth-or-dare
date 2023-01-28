import { ComponentType, TextInputStyle } from 'discord-api-types/v9';
import ButtonContext from './ButtonContext';
import Client from './Client';
import ModalContext from './ModalContext';

export default class ParanoiaHandler {
  client: Client;
  constructor(client: Client) {
    this.client = client;
  }

  async handleModal(ctx: ModalContext) {
    if (ctx.data.custom_id.startsWith('ANSWER')) return this.handleParanoiaModal(ctx);

    return this.client.console.error(
      `Modal ${ctx.data.custom_id} was submitted with no known action.`
    );
  }

  async handleParanoiaModal(ctx: ModalContext) {
    const [_, questionId, channelId, guildId] = ctx.data.custom_id.split(':') as string[];

    const fetchedQuestion = ctx.client.database.fetchSpecificQuestion(questionId, true);
    if (!fetchedQuestion)
      return ctx.reply(`${ctx.client.EMOTES.xmark} That question doesn't exist anymore.`);

    const showFreq = (await ctx.client.database.isPremiumGuild(guildId))
      ? (await ctx.client.database.fetchGuildSettings(guildId)).showParanoiaFrequency
      : ctx.client.database.defaultGuildSettings(ctx.guildId!).showParanoiaFrequency;

    const answer = ctx.data.components[0].components[0].value;

    const message = await ctx.client.functions
      .sendMessage(
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
                      ? fetchedQuestion.question
                      : `The user got lucky, and the question wasn't shared.`,
                },
                {
                  name: `${ctx.user.username}'s Answer:`,
                  value: answer.slice(0, 1021) + (answer.length > 1021 ? '...' : ''),
                },
              ],
            },
          ],
        },
        channelId,
        ctx.client.token
      )
      .catch(_ => null);

    if (!message)
      return ctx.reply({
        embeds: [
          ctx.client.functions.embed(
            `Message failed to send, please make sure I can send messages in <#${channelId}> and then try again. If that's not the issue, have them send you another question.`,
            ctx.user,
            true
          ),
        ],
      });

    const editedMessage = await ctx.client.functions
      .editMessage(
        {
          embeds: [
            {
              title: fetchedQuestion.question,
              color: ctx.client.COLORS.GREEN,
              description: `Question answered, check it out in <#${channelId}>!`,
              footer: {
                text: `Type: PARANOIA | Rating: ${fetchedQuestion.rating} | ID: ${fetchedQuestion.id}`,
              },
            },
          ],
          components: [],
        },
        ctx.channelId!,
        ctx.messageId!,
        ctx.client.token
      )
      .catch(_ => null);
    if (!editedMessage)
      ctx.client.console.warn(
        `Paranoia message edit failed in channel: ${ctx.channelId} with user: ${ctx.user.id} on message: ${ctx.messageId}`
      );

    ctx.defer();
  }

  async handleParanoiaModalButton(ctx: ButtonContext) {
    const [_, questionId] = ctx.data.custom_id.split(':') as string[];

    const fetchedQuestion = ctx.client.database.fetchSpecificQuestion(questionId, true);
    if (!fetchedQuestion) {
      ctx.client.functions.editMessage(
        { components: [] },
        ctx.channelId,
        ctx.messageId,
        ctx.client.token
      );
      return ctx.reply(`${ctx.client.EMOTES.xmark} That question doesn't exist anymore.`);
    }

    return ctx.replyModal({
      title: 'Answer Paranoia',
      custom_id: ctx.data.custom_id,
      components: [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.TextInput,
              custom_id: 'answer',
              label: 'Answer',
              placeholder: fetchedQuestion.question.substring(0, 100),
              style: TextInputStyle.Short,
              min_length: 1,
              max_length: 2000,
            },
          ],
        },
      ],
    });
  }
}
