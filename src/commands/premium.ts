import { ApplicationCommandOptionType, ComponentType, ButtonStyle } from 'discord-api-types';

import type { Mutable, OptionType } from '../classes/OptionTypes';
import type Command from '../classes/Command';
import type Context from '../classes/Context';

const options = [
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
    const premiumUser = false; // TODO: fetch data
    const premiumGuild = false;

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

    if (ctx.args[0] === 'list') {
      return ctx.reply({
        embeds: [
          {
            color: ctx.client.COLORS.BLUE,
            description: undefined || 'None', // TODO: use fetched settings
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
      // TODO: activate preium
    } else if (ctx.args[0] === 'remove') {
      const guildId =
        (ctx.getOption('server') as OptionType<Mutable<typeof options[2]['options'][0]>>)?.value ||
        ctx.guildId;
      if (!guildId || !/^\d{17,20}$/.test(guildId))
        // TODO: check in premium guilds array
        return ctx.reply({
          embeds: [
            ctx.client.functions.embed(
              'Please include a valid server id from `/premium list` or run this command in the server you want to remove premium from',
              ctx.user,
              true
            ),
          ],
        });
      // TODO: remove premium
    }
  },
};

export default premium;
