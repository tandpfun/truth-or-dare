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
type ButtonIdWithState = ButtonIds | `${ButtonIds}:${Rating | 'NONE'}`;

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
    // Premium upsell button
    if (ctx.data.custom_id === 'upsell') return ctx.replyUpsell();

    const customId = ctx.data.custom_id as ButtonIdWithState;
    const [id, rating] = customId.split(':') as [ButtonIds, Rating | 'NONE' | undefined];
    if (!this.buttonIds.includes(id))
      return this.client.console.error(
        `Button ${ctx.data.custom_id} was pressed with no corresponding question type.`
      );

    if (rating && !(rating in Rating || rating === 'NONE'))
      return this.client.console.error(
        `Button ${customId} was pressed, but rating ${rating} is unknown`
      );

    // Cooldown + Perm checks
    if (this.buttonCooldown.has(ctx.channelId)) return ctx.defer();
    if (!this.client.functions.hasPermission('SendMessages', ctx.member)) return ctx.defer();

    // Statistics
    const buttonName = id.toLowerCase();
    this.client.stats.minuteCommandCount++;
    this.client.stats.commands[`${buttonName}-button`]++;
    this.client.stats.minuteCommands[`${buttonName}-button`]++;
    this.client.metrics.trackButtonPress(buttonName);

    this.buttonCooldown.add(ctx.channelId);
    setTimeout(() => {
      this.buttonCooldown.delete(ctx.channelId);
    }, 2000);

    let buttonCommandType: CommandComponentTypes;
    if (id === 'TRUTH' || id === 'DARE') buttonCommandType = 'TOD';
    else buttonCommandType = id;

    let type: QuestionType | undefined;
    if (id === 'TOD') type = Math.random() < 0.5 ? 'TRUTH' : 'DARE';
    else if (id === 'RANDOM') type = undefined;
    else type = id;

    const settings = ctx.guildId ? await ctx.client.database.fetchGuildSettings(ctx.guildId) : null;

    const result = await ctx.client.getQuestion(ctx, type, rating);

    ctx.reply({
      content: ctx.client.functions.promoMessage(ctx.client, ctx.premium, rating),
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
      components: settings?.disableButtons ? [] : this.components(buttonCommandType, rating),
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
    rating: Rating | 'NONE' | undefined
  ): APIActionRowComponent<APIButtonComponent>[] | undefined {
    const makeId = (t: ButtonIds) => `${t}${rating ? ':' + rating : ''}`;
    const arr: APIButtonComponent[] = [];
    if (type === 'TOD') {
      arr.push(
        {
          type: ComponentType.Button,
          custom_id: makeId('TRUTH'),
          label: 'Truth',
          style: ButtonStyle.Success,
        },
        {
          type: ComponentType.Button,
          custom_id: makeId('DARE'),
          label: 'Dare',
          style: ButtonStyle.Danger,
        },
        {
          type: ComponentType.Button,
          custom_id: makeId('TOD'),
          label: 'Random',
          style: ButtonStyle.Primary,
        }
      );
    } else if (type === 'NHIE') {
      arr.push({
        type: ComponentType.Button,
        custom_id: makeId('NHIE'),
        label: 'Never Have I Ever',
        style: ButtonStyle.Primary,
      });
    } else if (type === 'WYR') {
      arr.push({
        type: ComponentType.Button,
        custom_id: makeId('WYR'),
        label: 'Would You Rather',
        style: ButtonStyle.Primary,
      });
    } else if (type === 'PARANOIA') {
      arr.push({
        type: ComponentType.Button,
        custom_id: makeId('PARANOIA'),
        label: 'Paranoia',
        style: ButtonStyle.Primary,
      });
    } else if (type === 'RANDOM') {
      arr.push({
        type: ComponentType.Button,
        custom_id: makeId('RANDOM'),
        label: 'Random Question',
        style: ButtonStyle.Primary,
      });
    }
    if (rating === 'R' && !this.client.enableR) {
      // TODO: remove deprecation
      arr.length = 0;
      arr.push({
        type: ComponentType.Button,
        label: 'Invite 18+ bot',
        url: 'https://discord.com/oauth2/authorize?client_id=1017989345292058656&permissions=19456&scope=bot%20applications.commands',
        style: ButtonStyle.Link,
      });
    }
    return [{ type: ComponentType.ActionRow, components: arr }];
  }
}
