import {
  APIActionRowComponent,
  APIButtonComponent,
  ComponentType,
  ButtonStyle,
} from 'discord-api-types/v9';
import { QuestionType, Rating } from '@prisma/client';

import type ButtonContext from './ButtonContext';
import { avatarURL } from './Functions';
import type Client from './Client';

type ButtonIds = 'TRUTH' | 'DARE' | 'TOD' | 'NHIE' | 'WYR' | 'PARANOIA' | 'RANDOM';
type CommandComponentTypes = 'TOD' | 'NHIE' | 'WYR' | 'PARANOIA' | 'RANDOM';

export default class ButtonHandler {
  client: Client;
  buttonIds: ButtonIds[];
  buttonCooldown: Set<string>;

  constructor(client: Client) {
    this.client = client;
    this.buttonIds = ['TRUTH', 'DARE', 'TOD', 'WYR', 'NHIE', 'PARANOIA', 'RANDOM'];
    this.buttonCooldown = new Set();

    for (const buttonId of this.buttonIds) {
      this.client.stats.commands[`${buttonId.toLowerCase()}-button`] = 0;
      this.client.stats.minuteCommands[`${buttonId.toLowerCase()}-button`] = 0;
    }
  }

  async handleButton(ctx: ButtonContext) {
    if (!this.buttonIds.includes(ctx.data.custom_id as ButtonIds))
      return this.client.console.error(
        `Button ${ctx.data.custom_id} was pressed with no corresponding question type.`
      );

    const channelSettings = await ctx.channelSettings;

    // Cooldown + Perm checks
    if (this.buttonCooldown.has(ctx.channelId)) return ctx.defer();
    if (!this.client.functions.hasPermission('SendMessages', ctx.member)) return ctx.defer();

    // Statistics
    const buttonName = ctx.data.custom_id.toLowerCase();
    this.client.stats.minuteCommandCount++;
    this.client.stats.commands[`${buttonName}-button`]++;
    this.client.stats.minuteCommands[`${buttonName}-button`]++;
    this.client.metrics.trackButtonPress(buttonName);

    this.buttonCooldown.add(ctx.channelId);
    setTimeout(() => {
      this.buttonCooldown.delete(ctx.channelId);
    }, 2000);

    let buttonCommandType: CommandComponentTypes;
    if (ctx.data.custom_id === 'TRUTH' || ctx.data.custom_id === 'DARE') buttonCommandType = 'TOD';
    else buttonCommandType = ctx.data.custom_id as CommandComponentTypes;

    let type: QuestionType | undefined;
    if (ctx.data.custom_id === 'TOD') type = Math.random() < 0.5 ? 'TRUTH' : 'DARE';
    else if (ctx.data.custom_id === 'RANDOM') type = undefined;
    else type = ctx.data.custom_id as QuestionType;

    const settings = ctx.guildId ? await ctx.client.database.fetchGuildSettings(ctx.guildId) : null;

    const result = await ctx.client.database.getRandomQuestion(
      type,
      channelSettings.disabledRatings,
      undefined,
      ctx.guildId,
      ctx.channelId,
      settings?.language,
      this.client.enableR
    );

    ctx.reply({
      content: ctx.client.functions.promoMessage(ctx.client, ctx.guildId, result.rating),
      embeds: [
        {
          author: {
            name: `Requested by ${ctx.user.username}#${ctx.user.discriminator}`,
            icon_url: `${avatarURL(ctx.user)}`,
          },
          title: result.question,
          color: ctx.client.COLORS.BLUE,
          footer: result.id
            ? {
                text: `Type: ${result.type} | Rating: ${result.rating} | ID: ${result.id}`,
              }
            : undefined,
        },
      ],
      components: settings?.disableButtons ? [] : this.components(buttonCommandType, result.rating),
    });

    ctx.client.functions
      .editMessage(
        {
          components: [],
        },
        ctx.channelId,
        ctx.messageId,
        ctx.client.token
      )
      .catch(err => {
        if (err.status !== 403)
          this.client.console.warn(
            `Button failed to edit with ${err.status}: ${err.message} (${ctx.guildId}-${ctx.channelId}-${ctx.user.id})`
          );
      });
  }

  components(
    type: CommandComponentTypes,
    rating: Rating | 'NONE'
  ): APIActionRowComponent<APIButtonComponent>[] | undefined {
    const arr: APIButtonComponent[] = [];
    if (type === 'TOD') {
      arr.push(
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
        }
      );
    } else if (type === 'NHIE') {
      arr.push({
        type: ComponentType.Button,
        custom_id: 'NHIE',
        label: 'Never Have I Ever',
        style: ButtonStyle.Primary,
      });
    } else if (type === 'WYR') {
      arr.push({
        type: ComponentType.Button,
        custom_id: 'WYR',
        label: 'Would You Rather',
        style: ButtonStyle.Primary,
      });
    } else if (type === 'PARANOIA') {
      arr.push({
        type: ComponentType.Button,
        custom_id: 'PARANOIA',
        label: 'Paranoia',
        style: ButtonStyle.Primary,
      });
    } else if (type === 'RANDOM') {
      arr.push({
        type: ComponentType.Button,
        custom_id: 'RANDOM',
        label: 'Random Question',
        style: ButtonStyle.Primary,
      });
    }
    if (rating === 'R') {
      arr.push({
        type: ComponentType.Button,
        label: 'Invite R bot',
        url: 'https://discord.com/oauth2/authorize?client_id=1017989345292058656&permissions=19456&scope=bot%20applications.commands',
        style: ButtonStyle.Link,
      });
    }
    return [{ type: ComponentType.ActionRow, components: arr }];
  }
}
