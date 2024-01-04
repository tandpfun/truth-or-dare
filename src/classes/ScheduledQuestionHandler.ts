import type Client from './Client';

import schedule from 'node-schedule';
import { QuestionType, ScheduledQuestionChannel, ScheduleType } from '@prisma/client';
import { RESTPostAPIChannelMessageJSONBody } from 'discord-api-types/v9';

export default class ScheduledQuestionHandler {
  client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  start() {
    schedule.scheduleJob('0 8 * * *', this.handleSchedule.bind(this, 'DAILY'));
    schedule.scheduleJob('0 * * * *', this.handleSchedule.bind(this, 'HOURLY'));
  }

  async handleSchedule(scheduleType: ScheduleType) {
    const premiumGuilds = new Set([
      ...((await this.client.database.fetchDiscordPremiumGuilds()) || []),
      ...this.client.database.chargebeePremiumGuilds,
    ]);

    const scheduledQuestions = await this.client.database.fetchAllScheduledQuestionChannels();
    const scheduledQuestionsByType = scheduledQuestions.filter(
      q => q.schedule === scheduleType && q.botId === this.client.id
    );

    for (const scheduledQuestionChannel of scheduledQuestionsByType) {
      if (!premiumGuilds.has(scheduledQuestionChannel.guildId)) continue;

      const questionMessageData = await this.questionMessage(scheduledQuestionChannel);
      const sentMessage = await this.client.functions
        .sendMessage(questionMessageData, scheduledQuestionChannel.id, this.client.token)
        .catch(err => {
          if (err.response.body.code === 10003)
            // "Unknown channel". Remove from DB if channel is deleted.
            this.client.database.deleteScheduledQuestionChannel(scheduledQuestionChannel.id);
          else
            this.client.console.warn(
              `Failed to send a scheduled question with status code ${err.status} ${err.response.body.code}`
            );
        });

      if (scheduledQuestionChannel.autoThread && sentMessage != null) {
        const threadTitle =
          questionMessageData.embeds?.[0].title ??
          questionMessageData.embeds?.[0].description ??
          'Thread';
        this.client.functions
          .startThreadFromMessage(
            { name: threadTitle, auto_archive_duration: 1440 },
            scheduledQuestionChannel.id,
            sentMessage.id,
            this.client.token
          )
          .catch(_ => null);
      }
    }
  }

  async questionMessage(
    scheduledQuestionChannel: ScheduledQuestionChannel
  ): Promise<RESTPostAPIChannelMessageJSONBody> {
    const channelSettings = this.client.database.fetchChannelSettings(
      scheduledQuestionChannel.id,
      false
    );

    // Get a random non-dare question type
    const questionTypes = Object.values(QuestionType).filter(type => type !== QuestionType.DARE);
    const randomType = questionTypes[Math.floor(Math.random() * questionTypes.length)];

    const question = await this.client.getQuestion(
      {
        channelSettings,
        premium: true,
        channelId: scheduledQuestionChannel.id,
        guildId: scheduledQuestionChannel.guildId,
      },
      scheduledQuestionChannel.type || randomType,
      scheduledQuestionChannel.rating || undefined
    );

    return {
      content: `${this.client.EMOTES.time} ${
        scheduledQuestionChannel.role ? `<@&${scheduledQuestionChannel.role}>` : ''
      } ${this.client.functions.titleCase(scheduledQuestionChannel.schedule)} question:`,
      embeds: [
        {
          title: question.question,
          color: this.client.COLORS.BLUE,
          footer: question.id
            ? {
                text: `Type: ${question.type} | Rating: ${question.rating} | ID: ${question.id}`,
              }
            : undefined,
        },
      ],
    };
  }
}
