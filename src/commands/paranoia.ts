import { Rating } from '.prisma/client';
import {
  ApplicationCommandOptionType,
  ApplicationCommandInteractionDataOptionString,
  ApplicationCommandInteractionDataOptionUser,
  APIChannel,
  APIMessage,
} from 'discord-api-types';
import Command from '../classes/Command';
import Context from '../classes/Context';

const paranoia: Command = {
  name: 'paranoia',
  description: 'Gives a paranoia question.',
  category: 'question',
  options: [
    {
      type: ApplicationCommandOptionType.User,
      name: 'target',
      description: 'The user to send a paranoia question to',
    },
    {
      type: ApplicationCommandOptionType.String,
      name: 'rating',
      description: 'The maturity level of the topics the question can relate to.',
      choices: [
        { name: 'PG', value: 'PG' },
        { name: 'PG13', value: 'PG13' },
        { name: 'R', value: 'R' },
      ],
    },
  ],
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    const channelSettings = await ctx.channelSettings;
    const rating = (ctx.getOption('rating') as ApplicationCommandInteractionDataOptionString)
      ?.value;
    const targetUserId = (ctx.getOption('target') as ApplicationCommandInteractionDataOptionUser)
      ?.value;

    const paranoia = await ctx.client.database.getRandomQuestion(
      'PARANOIA',
      (rating ? [rating as Rating] : ['PG', 'PG13', 'R']).filter(
        (r: Rating) => !channelSettings.disabledRatings.includes(r)
      ) as Rating[]
    );

    if (!ctx.guildId || !targetUserId) {
      return ctx.reply({
        embeds: [
          {
            title: paranoia.question,
            color: ctx.client.COLORS.BLUE,
            footer: {
              text: `Type: ${paranoia.type} | Rating: ${paranoia.rating} | ID: ${paranoia.id}`,
            },
          },
        ],
      });
    }

    const status = await ctx.client.database.checkParanoiaStatus(ctx.user.id, ctx.guildId);

    if (!status.guildOpen)
      return ctx.reply('That user already has an active question sent from this server');

    // create dm channel
    const dmChannel: APIChannel | null = await ctx.client.functions
      .createDMChannel(targetUserId, ctx.client.token)
      .catch(_ => null);
    if (!dmChannel)
      return ctx.reply({
        embeds: [ctx.client.functions.embed('Failed to create DMs', ctx.user, true)],
      });

    // fetch guild name
    const guildName: string | null = await ctx.client.functions
      .fetchGuild(ctx.guildId, ctx.client.token)
      .then(guild => guild.name)
      .catch(_ => null);
    if (!guildName)
      return ctx.reply({
        embeds: [ctx.client.functions.embed("I can't seem to find this server.", ctx.user, true)],
      });

    // send message
    const message: APIMessage | null = await ctx.client.functions
      .sendMessage(
        {
          embeds: [
            status.queueEmpty
              ? {
                  title: `Paranoia Question From: **${guildName}**`,
                  color: ctx.client.COLORS.BLUE,
                  description: `Use \`/answer\` to answer this question\n\n**${paranoia.question}**`,
                  footer: {
                    text: `Type: ${paranoia.type} | Rating: ${paranoia.rating} | ID: ${paranoia.id}`,
                  },
                }
              : {
                  title: `Question sent from ${guildName}, answer the current question to see it.`,
                  color: ctx.client.COLORS.BLUE,
                },
          ],
        },
        dmChannel.id,
        ctx.client.token
      )
      .catch(_ => null);
    if (!message)
      return ctx.reply({
        embeds: [ctx.client.functions.embed('Failed to send DM', ctx.user, true)],
      });

    // create db object
    await ctx.client.database.addParanoiaQuestion({
      userId: ctx.user.id,
      questionText: paranoia.question,
      questionRating: paranoia.rating,
      questionId: paranoia.id,
      guildId: ctx.guildId,
      channelId: ctx.channelId,
      dmMessageId: status.queueEmpty ? message.id : null,
    });

    ctx.reply(
      status.queueEmpty
        ? 'Message sent.'
        : "I'll send them the question once they've answered their current question."
    );
  },
};

export default paranoia;
