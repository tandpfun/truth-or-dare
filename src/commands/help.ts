import { ButtonStyle, ComponentType } from 'discord-api-types/v9';
import Command from '../classes/Command';
import Context from '../classes/Context';

const help: Command = {
  name: 'help',
  description: 'Get a list of commands.',
  category: 'control',
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    ctx.reply({
      embeds: [
        {
          title: 'Commands List:',
          fields: [
            {
              name: `${ctx.client.EMOTES.question} __Question Commands__`,
              value: `${ctx.client.commands
                .filter(c => c.category === 'question')
                .map(c => `**/${c.name}** - ${c.description}`)
                .join('\n')}`,
            },
            {
              name: `${ctx.client.EMOTES.gear} __Control Commands__`,
              value: `${ctx.client.commands
                .filter(c => c.category === 'control')
                .map(c => `**/${c.name}** - ${c.description}`)
                .join('\n')}`,
            },
          ],
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

export default help;
