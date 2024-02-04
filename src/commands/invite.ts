import { ButtonStyle, ComponentType } from 'discord-api-types/v9';

import type Command from '../classes/Command';
import type Context from '../classes/Context';

const invite: Command = {
  name: 'invite',
  description: 'Add the bot to another server.',
  category: 'config',
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    ctx.reply({
      embeds: [
        {
          title: `Add Truth or Dare`,
          description: `Click the button below to invite Truth or Dare to your server!`,
          color: ctx.client.COLORS.BLURPLE,
        },
      ],
      components: [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.Button,
              label: 'Add Truth or Dare',
              url: ctx.client.inviteUrl,
              style: ButtonStyle.Link,
            },
            {
              type: ComponentType.Button,
              label: 'Support',
              url: 'https://discord.gg/vBERMvVaRt',
              style: ButtonStyle.Link,
            },
            {
              type: ComponentType.Button,
              label: 'Website',
              url: 'https://truthordarebot.xyz',
              style: ButtonStyle.Link,
            },
          ],
        },
      ],
    });
  },
};

export default invite;
