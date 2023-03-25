import { ApplicationCommandOptionType } from 'discord-api-types/v9';

import type Command from '../classes/Command';
import type Context from '../classes/Context';
import { Mutable } from '../classes/OptionTypes';

const options = [
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: 'create',
    description:
      'Create a scheduled question. Automatically post a question every certain amount of time.',
    options: [
      {
        type: ApplicationCommandOptionType.String,
        name: 'frequency',
        description: 'How often a question is sent.',
        choices: [
          { name: 'Daily', value: 'DAILY' },
          { name: 'Hourly', value: 'HOURLY' },
        ],
        required: true,
      },
      {
        type: ApplicationCommandOptionType.String,
        name: 'type',
        description: 'The type of question to send.',
        choices: [
          { name: 'TRUTH', value: 'TRUTH' },
          { name: 'DARE', value: 'DARE' },
          { name: 'WYR', value: 'WYR' },
          { name: 'NHIE', value: 'NHIE' },
          { name: 'PARANOIA', value: 'PARANOIA' },
          { name: 'random', value: 'NONE' },
        ],
      },
      {
        type: ApplicationCommandOptionType.String,
        name: 'rating',
        description: 'The maturity level of the topics the question can relate to.',
        choices: [
          { name: 'PG', value: 'PG' },
          { name: 'PG13', value: 'PG13' },
          { name: 'R', value: 'R' },
          { name: 'random', value: 'NONE' },
        ],
      },
      {
        type: ApplicationCommandOptionType.Role,
        name: 'role',
        description: 'The role to ping whenever a question is sent.',
      },
    ],
  },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: 'remove',
    description: 'Remove a scheduled question set in the channel.',
  },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: 'view',
    description: 'See all scheduled question channels you have set up.',
  },
] as const;

const scheduledQuestion: Command = {
  name: 'scheduledquestion',
  description: 'Automatically post a question every certain amount of time!',
  options,
  category: 'control',
  perms: ['ManageGuild'],
  run: async (ctx: Context) => {
    if (!ctx.guildId)
      return ctx.reply(
        ctx.client.EMOTES.xmark + ' For now, scheduled questions are only available in servers.'
      );

    if (!ctx.premium) return ctx.replyUpsell();

    if (ctx.args[0] === 'create') {
      if (await ctx.client.database.getScheduledQuestionChannel(ctx.channelId))
        return ctx.reply(
          `${ctx.client.EMOTES.xmark} There's already a scheduled question in this channel. Please remove the old one with \`/scheduledquestion remove\` before creating a new one!`
        );

      if (
        !ctx.client.functions.hasPermission('ViewChannel', ctx.appPermissions) ||
        !ctx.client.functions.hasPermission('SendMessages', ctx.appPermissions)
      )
        return ctx.reply(
          `${ctx.client.EMOTES.xmark} It doesn't look like I can send messages in this channel! Make sure I have the "View Channel" and "Send Messages" permissions in this channel.`
        );

      const frequency = ctx.getOption<Mutable<typeof options[0]['options'][0]>>('frequency')!.value;
      let questionType =
        ctx.getOption<Mutable<typeof options[0]['options'][1]>>('type')?.value || null;
      let rating = ctx.getOption<Mutable<typeof options[0]['options'][2]>>('rating')?.value || null;
      const pingRole =
        ctx.getOption<Mutable<typeof options[0]['options'][3]>>('role')?.value || null;

      if (questionType === 'NONE') questionType = null;
      if (rating === 'NONE') rating = null;

      await ctx.client.database.createScheduledQuestionChannel({
        id: ctx.channelId,
        botId: ctx.client.id,
        guildId: ctx.guildId,
        schedule: frequency,
        type: questionType,
        rating,
        role: pingRole,
      });

      return ctx.reply(
        `${ctx.client.EMOTES.checkmark} Created a ${frequency.toLowerCase()} scheduled question!`
      );
    } else if (ctx.args[0] === 'remove') {
      await ctx.client.database.deleteScheduledQuestionChannel(ctx.channelId);

      return ctx.reply(
        `${ctx.client.EMOTES.checkmark} Removed the scheduled question in this channel.`
      );
    } else if (ctx.args[0] === 'view') {
      const scheduledQuestionsForGuild =
        await ctx.client.database.getGuildScheduledQuestionChannels(ctx.guildId);

      if (!scheduledQuestionsForGuild.length)
        return ctx.reply(
          `${ctx.client.EMOTES.xmark} There are no scheduled question channels set up in this server.`
        );

      ctx.reply({
        embeds: [
          {
            title: `${ctx.client.EMOTES.time} Scheduled Question Channel List`,
            color: ctx.client.COLORS.BLUE,
            description: scheduledQuestionsForGuild
              .map(
                sc =>
                  `• **${ctx.client.functions.titleCase(sc.schedule)}:** <#${sc.id}> - ${
                    sc.type || ''
                  } ${sc.rating || ''} ${sc.role ? `Pings <@&${sc.role}>` : ''}`
              )
              .join('\n'),
            footer: {
              text: "Remove a scheduled question channel by running '/scheduledquestion remove' in it",
            },
          },
        ],
      });
    }
  },
};

export default scheduledQuestion;
