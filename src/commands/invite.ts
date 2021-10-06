import { ButtonStyle, ComponentType } from 'discord-api-types';
import Command from '../classes/Command';
import Context from '../classes/Context';

const invite: Command = {
  name: 'invite',
  description: 'Add the bot to another server.',
  category: 'control',
  perms: [],
  run: async (ctx: Context): Promise<void> => {
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
              url: 'https://discord.gg/mwKZq2y',
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
