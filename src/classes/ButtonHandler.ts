import {
  APIActionRowComponent,
  APIButtonComponent,
  ComponentType,
  ButtonStyle,
} from 'discord-api-types/v9';
import { Question, QuestionType, Rating } from '@prisma/client';

import type ButtonContext from './ButtonContext';
import type Client from './Client';

type ButtonIds = 'TRUTH' | 'DARE' | 'TOD' | 'NHIE' | 'WYR' | 'PARANOIA' | 'RANDOM';
export type CommandComponentTypes = 'TOD' | 'NHIE' | 'WYR' | 'PARANOIA' | 'RANDOM';
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

    if (ctx.data.custom_id.startsWith('ANSWER'))
      return ctx.client.paranoiaHandler.handleParanoiaModalButton(ctx);

    const customId = ctx.data.custom_id as ButtonIdWithState;
    const [id, rating, targetUserId] = customId.split(':') as [
      ButtonIds,
      Rating | 'NONE' | undefined,
      string | undefined
    ];
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
    if (!this.client.functions.hasPermission('SendMessages', ctx.member?.permissions))
      return ctx.defer();

    // Statistics
    const buttonName = id.toLowerCase();
    this.client.stats.minuteCommandCount++;
    this.client.stats.commands[`${buttonName}-button`]++;
    this.client.stats.minuteCommands[`${buttonName}-button`]++;
    this.client.metrics.trackButtonPress(buttonName, ctx.channel?.type || 0);

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

    if (targetUserId && targetUserId !== 'NONE' && ctx.guildId && result.id) {
      // For paranoia target questions

      // Fetch guild name and check for scope
      const guild = await ctx.client.functions.fetchGuild(ctx.guildId, ctx.client.token);
      if (!guild)
        return ctx.reply(
          `${ctx.client.EMOTES.xmark} I can't get this guild. Was I authorized with the bot scope?`,
          { ephemeral: true }
        );

      // Create dm channel
      const dmChannel = await ctx.client.functions.createDMChannel(targetUserId, ctx.client.token);
      if (!dmChannel)
        return ctx.reply(`${ctx.client.EMOTES.xmark} I failed to create a DM with that user.`, {
          ephemeral: true,
        });

      const sendParanoia = await ctx.client.paranoiaHandler
        .sendParanoiaDM({
          dmChannel,
          question: result,
          sender: ctx.user,
          guild,
          channelId: ctx.channelId,
        })
        .catch(_ => null);

      if (!sendParanoia)
        return ctx.reply(
          `${ctx.client.EMOTES.xmark} I failed to send that user a DM. Are their DMs open?`,
          { ephemeral: true }
        );

      ctx.reply({
        content: `${ctx.client.EMOTES.checkmark} **<@${ctx.user.id}> sent them another question!** Their answer will be sent here once they reply.`,
        allowed_mentions: { parse: [] },
      });
    } else {
      // For all other types of games
      const promoHeader = ctx.client.functions.promoMessage(
        ctx.premium || !ctx.guildId,
        !!ctx.client.config.premiumSku
      ); // Promotional message above questions, small chance of showing
      const hasPremiumPromo = promoHeader.includes('premium');

      const replyComponents: APIActionRowComponent<APIButtonComponent>[] =
        targetUserId === 'NONE'
          ? [
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    type: ComponentType.Button,
                    custom_id: `ANSWER:${result.id}:${ctx.channelId}:${ctx.guildId}`,
                    label: 'Answer',
                    style: ButtonStyle.Primary,
                  },
                  {
                    type: ComponentType.Button,
                    custom_id: `${type ?? 'RANDOM'}:${rating || 'NONE'}:NONE`,
                    label: 'New Question',
                    style: ButtonStyle.Secondary,
                  },
                ],
              },
            ]
          : settings?.disableButtons
          ? []
          : this.components(buttonCommandType, rating);

      if (hasPremiumPromo) {
        replyComponents?.push({
          type: ComponentType.ActionRow,
          components: [this.client.functions.premiumUpsellButton(this.client.config.premiumSku)],
        });
      }

      ctx.reply({
        content: promoHeader,
        embeds: [
          {
            author: {
              name: `Requested by ${ctx.client.functions.userTag(ctx.user)}`,
              icon_url: `${ctx.client.functions.avatarURL(ctx.user)}`,
            },
            title: `${result.question} ${
              (result as Question).pack != null ? ctx.client.EMOTES.animated_sparkles : ''
            }`,
            color: ctx.client.COLORS.BLUE,
            footer: result.id
              ? {
                  text: `Type: ${result.type} | Rating: ${result.rating} | ID: ${result.id}`,
                }
              : undefined,
          },
        ],
        components: replyComponents,
      });
    }

    if (!ctx.guildId) {
      // In a dm or group dm
      ctx
        .editResponse(
          {
            components: [],
          },
          ctx.messageId
        )
        .catch(err => {
          if (err.status !== 403)
            this.client.console.warn(
              `DM button failed to edit with ${err.status}: ${err.message} (${ctx.guildId}-${ctx.channelId}-${ctx.user.id})`
            );
        });
    } else {
      // In a server (regular edits are faster for now)
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
              `Server button failed to edit with ${err.status}: ${err.message} (${ctx.guildId}-${ctx.channelId}-${ctx.user.id})`
            );
        });
    }
  }

  components(
    type: CommandComponentTypes,
    rating: Rating | 'NONE' | undefined
  ): APIActionRowComponent<APIButtonComponent>[] {
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

    return [{ type: ComponentType.ActionRow, components: arr }];
  }
}
