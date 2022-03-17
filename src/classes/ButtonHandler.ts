import { QuestionType } from '@prisma/client';
import { APIActionRowComponent, ButtonStyle, ComponentType } from 'discord-api-types';
import ButtonContext from './ButtonContext';
import type Client from './Client';

type ButtonIds = 'TRUTH' | 'DARE' | 'TOD';
type CommandComponentTypes = 'TOD' | 'NHIE' | 'WYR' | 'RANDOM';

export default class ButtonHandler {
  client: Client;
  buttonIds: ButtonIds[];

  constructor(client: Client) {
    this.client = client;
    this.buttonIds = ['TRUTH', 'DARE', 'TOD'];
  }

  async handleButton(ctx: ButtonContext) {
    if (!this.buttonIds.includes(ctx.data.custom_id as ButtonIds)) return;
    const channelSettings = await ctx.channelSettings;

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
    ctx.reply({
      content: ctx.client.functions.upvoteAd(),
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
