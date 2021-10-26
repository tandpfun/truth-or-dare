import {
  ApplicationCommandOptionType,
  ComponentType,
  ButtonStyle,
  APIGuild,
} from 'discord-api-types';

import type { Mutable } from '../classes/OptionTypes';
import type Command from '../classes/Command';
import type Context from '../classes/Context';

const options = [
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: 'check',
    description: 'Check if this current server has premium activated.',
  },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: 'list',
    description: 'List your premium servers.',
  },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: 'activate',
    description: 'Add the current server as a premium server.',
  },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: 'deactivate',
    description: 'Remove a server from your premium slots.',
    options: [
      {
        type: ApplicationCommandOptionType.String,
        name: 'server',
        description:
          'The server id to remove from your premium slots (found from /premium list) default current server.',
      },
    ],
  },
] as const;

const premium: Command = {
  name: 'premium',
  description: 'Manage your premium servers for the bot.',
  category: 'control',
  options,
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    const premiumGuild = ctx.guildId && ctx.client.database.isPremiumGuild(ctx.guildId);
    const premiumUser = await ctx.client.database.getPremiumUser(ctx.user.id);

    if (!premiumUser && ctx.args[0] !== 'check') return ctx.reply(ctx.client.functions.premiumAd());

    if (ctx.args[0] === 'check') {
      if (!ctx.guildId)
        return ctx.reply(`${ctx.client.EMOTES.xmark} This command cannot be run in a DM.`);
      return ctx.reply({
        embeds: [
          premiumGuild
            ? {
                title: `${ctx.client.EMOTES.checkmark} Premium Server`,
                description:
                  'This server has premium activated! Thank you so much for supporting the bot.',
                color: ctx.client.COLORS.GREEN,
              }
            : {
                title: `${ctx.client.EMOTES.xmark} Basic Server`,
                description:
                  'Help support the development of Truth or Dare with a one-time $5 donation and gain some awesome perks like custom questions!\n\nTo activate a server, run `/premium activate`.',
                color: ctx.client.COLORS.RED,
              },
        ],
        components: premiumGuild
          ? null
          : [
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    type: ComponentType.Button,
                    label: 'Get Premium Slots',
                    url: 'https://truthordarebot.xyz/premium',
                    style: ButtonStyle.Link,
                  },
                ],
              },
            ],
      });
    } else if (ctx.args[0] === 'list') {
      const premiumServerData = await Promise.all(
        premiumUser.premiumServers.map(
          (id, index): Promise<APIGuild | string> =>
            new Promise(res => {
              setTimeout(() => {
                ctx.client.functions
                  .fetchGuild(id, ctx.client.token)
                  .then(fetchResult => res(fetchResult || id));
              }, index * 20);
            })
        )
      );
      return ctx.reply({
        embeds: [
          {
            title: ctx.client.EMOTES.info + ' Your Premium Information',
            color: ctx.client.COLORS.BLUE,
            description: `**Slots:** ${premiumUser.premiumServers.length}/${
              premiumUser.premiumSlots
            }\n**Servers:**\n${
              premiumServerData
                .map(serverData =>
                  typeof serverData === 'string'
                    ? '• ' + serverData
                    : `• ${serverData.name} (${serverData.id})`
                )
                .join('\n') || 'None'
            }`,
          },
        ],
        flags: ctx.guildId ? 1 << 6 : 0,
      });
    } else if (ctx.args[0] === 'activate') {
      if (!ctx.guildId)
        return ctx.reply(
          `${ctx.client.EMOTES.xmark} Run this in the server you want to activate premium for!`
        );

      if (premiumUser.premiumServers.includes(ctx.guildId))
        return ctx.reply({
          embeds: [
            ctx.client.functions.embed(
              'This server is already activated in one of your premium slots.',
              ctx.user,
              true
            ),
          ],
        });

      if (premiumUser.premiumServers.length >= premiumUser.premiumSlots)
        return ctx.reply({
          content: `All of your premium slots have been filled, click the button below to get more!`,
          components: [
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.Button,
                  label: 'Get Premium Slots',
                  url: 'https://truthordarebot.xyz/premium',
                  style: ButtonStyle.Link,
                },
              ],
            },
          ],
        });

      await ctx.client.database.activatePremium(ctx.user.id, ctx.guildId);

      ctx.client.webhookLog('premium', {
        embeds: [
          {
            color: ctx.client.COLORS.GREEN,
            author: {
              name: `${ctx.user.username}#${ctx.user.discriminator}`,
              icon_url: ctx.client.functions.avatarURL(ctx.user),
            },
            title: `Premium Activated`,
            description: `**User:** <@${ctx.user.id}> (${ctx.user.id})\n**Guild:** ${ctx.guildId}`,
            footer: {
              text: `Slots: ${premiumUser.premiumServers.length + 1}/${premiumUser.premiumSlots}`,
            },
          },
        ],
      });

      return ctx.reply({
        embeds: [
          {
            title: `${ctx.client.EMOTES.checkmark} Premium Activated!`,
            description: `You've activated premium features for this server! Thank you so much for supporting the bot.\n\n**Slots:** ${
              premiumUser.premiumServers.length + 1
            }/${premiumUser.premiumSlots}${
              premiumGuild
                ? '\nThis server already had premium activated by another person. If they remove this server from one of their slots, it will now still remain as premium because it is now in one of yours as well.'
                : ''
            }`,
            color: ctx.client.COLORS.GREEN,
          },
        ],
      });
    } else if (ctx.args[0] === 'deactivate') {
      const guildId =
        ctx.getOption<Mutable<typeof options[3]['options'][0]>>('server')?.value || ctx.guildId;
      if (!premiumUser.premiumServers.includes(guildId))
        return ctx.reply({
          embeds: [
            ctx.client.functions.embed(
              'This server is not in one of your premium slots.',
              ctx.user,
              true
            ),
          ],
        });

      await ctx.client.database.deactivatePremium(ctx.user.id, guildId);

      ctx.client.webhookLog('premium', {
        embeds: [
          {
            color: ctx.client.COLORS.RED,
            author: {
              name: `${ctx.user.username}#${ctx.user.discriminator}`,
              icon_url: ctx.client.functions.avatarURL(ctx.user),
            },
            title: `Premium Deactivated`,
            description: `**User:** <@${ctx.user.id}> (${ctx.user.id})\n**Guild:** ${guildId}`,
            footer: {
              text: `Slots: ${premiumUser.premiumServers.length - 1}/${premiumUser.premiumSlots}`,
            },
          },
        ],
      });

      return ctx.reply({
        embeds: [
          {
            title: `${ctx.client.EMOTES.checkmark} Premium Deactivated`,
            description: `${
              ctx.guildId === guildId ? 'This server' : guildId
            } has been removed from one of your premium slots. You now have ${
              premiumUser.premiumSlots - premiumUser.premiumServers.length + 1
            } available slots.`,
            color: ctx.client.COLORS.GREEN,
          },
        ],
      });
    }
  },
};

export default premium;
