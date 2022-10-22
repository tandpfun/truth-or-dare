import type Client from './Client';

import schedule from 'node-schedule';
import { ScheduledQuestionChannel, ScheduleType } from '@prisma/client';
import { RESTPostAPIChannelMessageJSONBody } from 'discord-api-types/v9';

export default class ScheduledQuestionHandler {
  client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  start() {
    schedule.scheduleJob('0 8 * * *', this.handleSchedule.bind(this, 'DAILY'));
    schedule.scheduleJob('* * * * *', this.handleSchedule.bind(this, 'HOURLY'));
  }

  async handleSchedule(scheduleType: ScheduleType) {
    const scheduledQuestions = await this.client.database.fetchAllScheduledQuestionChannels();
    console.log(scheduledQuestions);
    const hourlyQuestions = scheduledQuestions.filter(
      q => q.schedule === scheduleType && q.botId === this.client.id
    );

    for (const scheduledQuestionChannel of hourlyQuestions) {
      this.client.functions.sendMessage(
        await this.questionMessage(scheduledQuestionChannel),
        scheduledQuestionChannel.id,
        this.client.token
      );
    }
  }

  async questionMessage(
    scheduledQuestionChannel: ScheduledQuestionChannel
  ): Promise<RESTPostAPIChannelMessageJSONBody> {
    const question = await this.client.database.getRandomQuestion(
      scheduledQuestionChannel.type || undefined,
      this.client.enableR ? [] : ['R'],
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
