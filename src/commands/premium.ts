import { ApplicationCommandOptionType, ComponentType, ButtonStyle } from 'discord-api-types';

import type { Mutable } from '../classes/OptionTypes';
import type Command from '../classes/Command';
import type Context from '../classes/Context';

const options = [
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: 'check',
    description: 'Check if this current server has premium activated',
  },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: 'list',
    description: 'List your premium servers',
  },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: 'activate',
    description: 'Add the current server as a premium server',
  },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: 'remove',
    description: 'Remove a server from your premium slots',
    options: [
      {
        type: ApplicationCommandOptionType.String,
        name: 'server',
        description:
          'The server id to remove from your premium slots (found from /premium list) default current server',
      },
    ],
  },
] as const;

const premium: Command = {
  name: 'premium',
  description: 'Manage your premium servers for the bot',
  category: 'control',
  options,
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    const premiumGuild = ctx.guildId
      ? await ctx.client.database.isPremiumGuild(ctx.guildId)
      : false;
    const premiumUser = await ctx.client.database.getPremiumUser(ctx.user.id);

    if (!premiumUser)
      return ctx.reply({
        embeds: [
          {
            color: ctx.client.COLORS.BLUE,
            title: ctx.guildId
              ? `This server does ${premiumGuild ? '' : 'not '}have premium activated`
              : '',
            description:
              'Support Truth or Dare by donating for premium features like custom questions. More information can be found at the website linked below',
          },
        ],
        components: [
          {
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.Button,
                label: 'Premium',
                url: 'https://truthordarebot.xyz/premium',
                style: ButtonStyle.Link,
              },
            ],
          },
        ],
      });

    if (ctx.args[0] === 'check') {
      return ctx.reply({
        embeds: [
          {
            title: ctx.guildId
              ? `You do${
                  premiumUser.premiumServers.includes(ctx.guildId) ? '' : ' not'
                } have premium activated for this server`
              : null,
            color: ctx.client.COLORS.BLUE,
            description: ctx.guildId
              ? `This server does${premiumGuild ? '' : ' not'} have premium activated`
              : 'This is a dm',
          },
        ],
      });
    } else if (ctx.args[0] === 'list') {
      return ctx.reply({
        embeds: [
          {
            title: ctx.guildId
              ? `This server does${premiumGuild ? '' : ' not'} have premium activated`
              : null,
            color: ctx.client.COLORS.BLUE,
            description: premiumUser.premiumServers.join('\n') || 'None', // TODO: use fetched settings
          },
        ],
      });
    } else if (ctx.args[0] === 'activate') {
      if (!ctx.guildId)
        return ctx.reply({
          embeds: [
            ctx.client.functions.embed(
              'Please run this command in the server you want to activate premium for',
              ctx.user,
              true
            ),
          ],
        });
      await ctx.client.database.activatePremium(ctx.user.id, ctx.guildId);
      return ctx.reply({
        embeds: [ctx.client.functions.embed('Activated premium for this server', ctx.user, false)],
      });
    } else if (ctx.args[0] === 'remove') {
      const guildId =
        ctx.getOption<Mutable<typeof options[3]['options'][0]>>('server')?.value || ctx.guildId;
      if (!premiumUser.premiumServers.includes(guildId))
        // TODO: check in premium guilds array
        return ctx.reply({
          embeds: [
            ctx.client.functions.embed(
              "You don't have premium activated for that server",
              ctx.user,
              true
            ),
          ],
        });
      await ctx.client.database.deactivatePremium(ctx.user.id, guildId);
      return ctx.reply({
        embeds: [
          ctx.client.functions.embed(
            `Successfully deactivated premium for ${
              ctx.guildId === guildId ? 'this server' : guildId
            }`,
            ctx.user,
            false
          ),
        ],
      });
    }
  },
};

export default premium;
