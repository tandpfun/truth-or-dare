import { QuestionType } from '@prisma/client';
import { APIActionRowComponent, ButtonStyle, ComponentType } from 'discord-api-types';
import ButtonContext from './ButtonContext';
import type Client from './Client';

type ButtonIds = 'TRUTH' | 'DARE' | 'TOD';
type CommandComponentTypes = 'TOD' | 'NHIE' | 'WYR' | 'RANDOM';

export default class ButtonHandler {
  client: Client;
  buttonIds: ButtonIds[];
  buttonCooldown: Set<string>;

  constructor(client: Client) {
    this.client = client;
    this.buttonIds = ['TRUTH', 'DARE', 'TOD'];
    this.buttonCooldown = new Set();
  }

  async handleButton(ctx: ButtonContext) {
    if (!this.buttonIds.includes(ctx.data.custom_id as ButtonIds)) return;
    const channelSettings = await ctx.channelSettings;

    const isPremium = ctx.guildId ? this.client.database.isPremiumGuild(ctx.guildId) : false;

    if (this.buttonCooldown.has(ctx.channelId) && !isPremium)
      return ctx.reply({
        content: `${ctx.client.EMOTES.time} Buttons can only be pressed once every two seconds per channel to prevent spam!\n${ctx.client.EMOTES.sparkles} You can bypass this with premium.`,
        components: [
          {
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.Button,
                style: ButtonStyle.Link,
                label: 'Get Premium',
                url: 'https://truthordarebot.xyz/premium',
              },
            ],
          },
        ],
        flags: 1 << 6,
      });

    let type;
    if (ctx.data.custom_id === 'TOD') {
      type = (Math.random() < 0.5 ? 'TRUTH' : 'DARE') as QuestionType;
    } else type = ctx.data.custom_id as QuestionType;

    const result = await ctx.client.database.getRandomQuestion(
      type,
      channelSettings.disabledRatings,
      undefined,
      ctx.guildId
    );

    let name = ctx.data.custom_id;
    if (name === 'TOD') name = 'RANDOM';

    ctx.reply({
      content: `${ctx.client.EMOTES.trackball} **${ctx.user.username}#${
        ctx.user.discriminator
      }** clicked on **${ctx.client.functions.titleCase(name)}**`,
      embeds: [
        {
          title: result.question,
          color: ctx.client.COLORS.BLUE,
          footer: result.id
            ? {
                text: `Type: ${result.type} | Rating: ${result.rating} | ID: ${result.id}`,
              }
            : undefined,
        },
      ],
      components: ctx.client.server.buttonHandler.components('TOD'),
    });

    ctx.client.functions.editMessage(
      {
        components: [],
      },
      ctx.channelId,
      ctx.messageId,
      ctx.client.token
    );

    this.buttonCooldown.add(ctx.channelId);
    setTimeout(() => {
      this.buttonCooldown.delete(ctx.channelId);
    }, 2000);
  }

  components(type: CommandComponentTypes): APIActionRowComponent[] | undefined {
    if (type === 'TOD') {
      return [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.Button,
              custom_id: 'TRUTH',
              label: 'Truth',
              style: ButtonStyle.Success,
            },
            {
              type: ComponentType.Button,
              custom_id: 'DARE',
              label: 'Dare',
              style: ButtonStyle.Danger,
            },
            {
              type: ComponentType.Button,
              custom_id: 'TOD',
              label: 'Random',
              style: ButtonStyle.Primary,
            },
          ],
        },
      ];
    }
  }
}
