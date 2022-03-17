import { ButtonStyle, ComponentType } from 'discord-api-types';

import type Command from '../classes/Command';
import type CommandContext from '../classes/CommandContext';

const invite: Command = {
  name: 'invite',
  description: 'Add the bot to another server.',
  category: 'control',
  perms: [],
  run: async (ctx: CommandContext): Promise<void> => {
    ctx.reply({
      embeds: [
        {
          title: `Invite Truth or Dare`,
          description: `Click the button below to invite Truth or Dare to your server!`,
          color: ctx.client.COLORS.BLUE,
        },
      ],
      components: [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.Button,
              label: 'Invite Truth or Dare',
              url: ctx.client.inviteUrl,
              style: ButtonStyle.Link,
            },
            {
              type: ComponentType.Button,
              label: 'Support Server',
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
