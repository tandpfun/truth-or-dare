import { ButtonStyle, ComponentType } from 'discord-api-types/v9';

import type Command from '../classes/Command';
import type Context from '../classes/Context';

const help: Command = {
  name: 'help',
  description: 'Get a list of commands.',
  category: 'config',
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    ctx.reply({
      embeds: [
        {
          title: 'Truth or Dare Bot Commands',
          description:
            "I'm here to help you get to know your friends through thousands of exciting questions across multiple game modes. If you run into any issues, please join my [support server](https://discord.gg/vBERMvVaRt).",
          fields: [
            {
              name: `${ctx.client.EMOTES.question} Game Commands`,
              value: `${ctx.client.commands
                .filter(c => c.category === 'question')
                .map(c => `> \`/${c.name}\` - ${c.description}`)
                .join('\n')}`,
            },
            {
              name: `${ctx.client.EMOTES.gear} Config Commands`,
              value: `${ctx.client.commands
                .filter(c => c.category === 'config')
                .map(c => `> \`/${c.name}\` - ${c.description}`)
                .join('\n')}`,
            },
            {
              name: `${ctx.client.EMOTES.premium} Premium Commands`,
              value: `${
                !ctx.premium
                  ? ctx.client.config.premiumSku == null
                    ? '↳ [Upgrade](https://truthordarebot.xyz/premium) to unlock.\n'
                    : '↳ Tap "Upgrade" on my profile to unlock.\n'
                  : ''
              }${ctx.client.commands
                .filter(c => c.category === 'premium')
                .map(c => `> \`/${c.name}\` - ${c.description}`)
                .join('\n')}`,
            },
          ],
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

export default help;
