import { ApplicationCommandOptionType } from 'discord-api-types/v9';

import type { Mutable } from '../classes/OptionTypes';
import type Command from '../classes/Command';
import type Context from '../classes/Context';
import { ApplicationCommandContext } from '../classes/Command';

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
      { name: 'random', value: 'NONE' },
    ],
  },
] as const;

const paranoiaCooldown = new Set(); // Prevent paranoia spam

const paranoia: Command = {
  name: 'paranoia',
  description: 'Gives a paranoia question or sends one to a user.',
  category: 'question',
  options,
  perms: [],
  contexts: [
    ApplicationCommandContext.Guild,
    ApplicationCommandContext.BotDM,
    ApplicationCommandContext.PrivateChannel,
  ],
  run: async (ctx: Context): Promise<void> => {
    const serverSettings = ctx.guildId
      ? await ctx.client.database.fetchGuildSettings(ctx.guildId)
      : null;
    const targetUserId = ctx.getOption<Mutable<typeof options[0]>>('target')?.value;
    const rating = ctx.getOption<Mutable<typeof options[1]>>('rating')?.value;

    const paranoia = await ctx.client.getQuestion(ctx, 'PARANOIA', rating);
    if (paranoia.id) ctx.client.metrics.trackRatingSelection(rating || 'NONE');

    // Send like regular question if no target
    if (!ctx.guildId || !targetUserId || !paranoia.id) {
      return ctx.reply({
        content: ctx.client.functions.promoMessage(ctx.client, ctx.premium),
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
          : ctx.client.buttonHandler.components('PARANOIA', rating),
      });
    }

    if (ctx.resolved!.users![targetUserId].bot)
      return ctx.reply(
        `${ctx.client.EMOTES.xmark} Bots can't answer paranoia questions, no matter how hard they try.`
      );

    if (paranoiaCooldown.has(`${ctx.user.id}:${targetUserId}`))
      return ctx.reply(
        `${ctx.client.EMOTES.xmark} Please wait a few seconds before sending that user another question.`
      );

    // Fetch guild name and check for scope
    const guild = await ctx.client.functions.fetchGuild(ctx.guildId, ctx.client.token);
    if (!guild)
      return ctx.reply(
        `${ctx.client.EMOTES.xmark} I can't get this guild. Was I authorized with the bot scope?`,
        { ephemeral: true }
      );

    // Create dm channel
    const dmChannel = await ctx.client.functions.createDMChannel(targetUserId, ctx.client.token);
    if (!dmChannel)
      return ctx.reply(`${ctx.client.EMOTES.xmark} I failed to create a DM with that user.`, {
        ephemeral: true,
      });

    const sendParanoia = await ctx.client.paranoiaHandler
      .sendParanoiaDM({
        dmChannel,
        question: paranoia,
        sender: ctx.user,
        guild,
        channelId: ctx.channelId,
      })
      .catch(_ => null);

    if (!sendParanoia)
      return ctx.reply(
        `${ctx.client.EMOTES.xmark} I failed to send that user a DM. Are their DMs open?`,
        { ephemeral: true }
      );

    ctx.reply(
      `${ctx.client.EMOTES.checkmark} **Question sent!** Their answer will be sent here once they reply.`
    );

    paranoiaCooldown.add(`${ctx.user.id}:${targetUserId}`);
    setTimeout(() => {
      paranoiaCooldown.delete(`${ctx.user.id}:${targetUserId}`);
    }, 10_000);
  },
};

export default paranoia;
