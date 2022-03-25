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
    if (!this.buttonIds.includes(ctx.data.custom_id as ButtonIds))
      return this.client.console.error(
        `Button ${ctx.data.custom_id} was pressed with no corresponding question type.`
      );

    const channelSettings = await ctx.channelSettings;
    const isPremium = ctx.guildId ? this.client.database.isPremiumGuild(ctx.guildId) : false;

    // Statistics
    const buttonName = ctx.data.custom_id.toLowerCase();
    this.client.stats.minuteCommandCount++;
    this.client.stats.commands[`${buttonName}-button`]++;
    this.client.stats.minuteCommands[`${buttonName}-button`]++;
    this.client.metrics.trackButtonPress(buttonName);

    // Cooldown
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

    this.buttonCooldown.add(ctx.channelId);
    setTimeout(() => {
      this.buttonCooldown.delete(ctx.channelId);
    }, 2000);

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

    let label = ctx.client.functions.titleCase(ctx.data.custom_id);
    if (ctx.data.custom_id === 'TOD') label = 'Random';

    const isMod = this.client.functions.hasPermission('ManageGuild', ctx.member);
    const settings = ctx.guildId ? await ctx.client.database.fetchGuildSettings(ctx.guildId) : null;

    ctx.reply({
      content: `${this.client.EMOTES.beta1}${
        this.client.EMOTES.beta2
      } Buttons are a beta feature. ${
        isMod ? 'Toggle them with `/serversettings togglebuttons`.' : ''
      }\n${ctx.client.EMOTES.trackball} **${ctx.user.username}#${
        ctx.user.discriminator
      }** clicked on **${label}**`,
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
      components: settings?.disableButtons ? [] : ctx.client.server.buttonHandler.components('TOD'),
    });

    ctx.client.functions.editMessage(
      {
        components: [],
        content: ctx.interaction.message.content
          ? ctx.interaction.message.content.split('\n').slice(-1)[0]
          : undefined,
      },
      ctx.channelId,
      ctx.messageId,
      ctx.client.token
    );
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
