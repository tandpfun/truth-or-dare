import { ApplicationCommandOptionType } from 'discord-api-types/v9';

import type { Mutable } from '../classes/OptionTypes';
import type Command from '../classes/Command';
import type Context from '../classes/Context';

const options = [
  {
    type: ApplicationCommandOptionType.User,
    name: 'target',
    description: 'The user to send a paranoia question to.',
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
] as const;

const paranoia: Command = {
  name: 'paranoia',
  description: 'Gives a paranoia question or sends one to a user.',
  category: 'question',
  options,
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    const channelSettings = await ctx.channelSettings;
    const serverSettings = ctx.guildId
      ? await ctx.client.database.fetchGuildSettings(ctx.guildId)
      : null;
    const targetUserId = ctx.getOption<Mutable<typeof options[0]>>('target')?.value;
    const rating = ctx.getOption<Mutable<typeof options[1]>>('rating')?.value;

    const paranoia = await ctx.client.database.getRandomQuestion(
      'PARANOIA',
      channelSettings.disabledRatings,
      rating,
      ctx.guildId,
      serverSettings?.language
    );

    if (!ctx.guildId || !targetUserId || !paranoia.id) {
      return ctx.reply({
        embeds: [
          {
            title: paranoia.question,
            color: ctx.client.COLORS.BLUE,
            footer: paranoia.id
              ? {
                  text: `Type: ${paranoia.type} | Rating: ${paranoia.rating} | ID: ${paranoia.id}`,
                }
              : undefined,
          },
        ],
        components: serverSettings?.disableButtons
          ? []
          : ctx.client.server.buttonHandler.components('PARANOIA'),
      });
    }

    if (ctx.resolved!.users![targetUserId].bot)
      return ctx.reply(
        `${ctx.client.EMOTES.xmark} Bots can't answer paranoia questions, no matter how hard they try.`
      );

    const status = await ctx.client.database.checkParanoiaStatus(targetUserId, ctx.guildId);

    if (!status.guildOpen)
      return ctx.reply(
        `${ctx.client.EMOTES.xmark} That user already has an active question sent from this server.`
      );

    // create dm channel
    const dmChannel = await ctx.client.functions.createDMChannel(targetUserId, ctx.client.token);
    if (!dmChannel)
      return ctx.reply({
        embeds: [
          ctx.client.functions.embed('Failed to create a DM with the user.', ctx.user, true),
        ],
      });

    // fetch guild name
    const guild = await ctx.client.functions.fetchGuild(ctx.guildId, ctx.client.token);
    if (!guild)
      return ctx.reply({
        embeds: [
          ctx.client.functions.embed(
            "I can't get this guild. Was I authorized with the bot scope?",
            ctx.user,
            true
          ),
        ],
      });

    // send message
    const message = await ctx.client.functions.sendMessage(
      {
        embeds: [
          status.queueEmpty
            ? {
                title: paranoia.question,
                color: ctx.client.COLORS.BLUE,
                description: `Use \`/answer\` to answer this question.\n\nQuestion sent from **${guild.name}** <#${ctx.channelId}>.`,
                footer: {
                  text: `Type: ${paranoia.type} | Rating: ${paranoia.rating} | ID: ${paranoia.id}`,
                },
              }
            : {
                description: `${ctx.client.EMOTES.warning} You received a question from ${guild.name}, but you need to answer the current question to see it.`,
                color: ctx.client.COLORS.BLUE,
              },
        ],
      },
      dmChannel.id,
      ctx.client.token
    );
    if (!message)
      return ctx.reply({
        embeds: [
          ctx.client.functions.embed(
            'I was unable to send a DM to that user. Do they have DMs enabled?',
            ctx.user,
            true
          ),
        ],
      });

    // create db object
    const createQuestion = await ctx.client.database
      .addParanoiaQuestion({
        userId: targetUserId,
        questionText: paranoia.question,
        questionRating: paranoia.rating,
        questionId: paranoia.id,
        guildId: ctx.guildId,
        channelId: ctx.channelId,
        dmMessageId: status.queueEmpty ? message.id : null,
      })
      .then(_ => true)
      .catch(_ => null);

    if (!createQuestion) {
      ctx.client.console.error(
        `Paranoia uniqueness failed with document ID "${targetUserId}-${ctx.guildId}" and channel id "${ctx.channelId}"`
      );
      return ctx.reply(
        `${ctx.client.EMOTES.xmark} An internal error occurred while saving the question. Help us resolve this issue by reaching out in our Support Server: https://discord.gg/vBERMvVaRt`
      );
    }

    ctx.reply(
      status.queueEmpty
        ? `${ctx.client.EMOTES.checkmark} **Question sent!** Their answer will be sent here once they reply.`
        : `${ctx.client.EMOTES.checkmark} That user already has a question from another server, but I'll send them this one after they reply to that.`
    );
  },
};

export default paranoia;
