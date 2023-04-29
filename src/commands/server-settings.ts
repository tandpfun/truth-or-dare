import { ApplicationCommandOptionType } from 'discord-api-types/v9';

import { Mutable } from '../classes/OptionTypes';
import type Command from '../classes/Command';
import type Context from '../classes/Context';
import { Translation } from '@prisma/client';
import Client from '../classes/Client';
import { ApplicationCommandContext } from '../classes/Command';

const options = [
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: 'view',
    description: 'View premium server settings.',
  },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: 'show-paranoia',
    description: 'Set how often paranoia questions are shown.',
    options: [
      {
        type: ApplicationCommandOptionType.Integer,
        name: 'frequency',
        description:
          'How often questions are shown as a percent chance (0 for never, 100 for always).',
        required: true,
      },
    ],
  },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: 'disable-question',
    description: 'Disable a global question from being shown in this server.',
    options: [
      {
        type: ApplicationCommandOptionType.String,
        name: 'id',
        description: 'The id of the question to disable.',
        required: true,
      },
    ],
  },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: 'enable-question',
    description: 'Enable a global question that has been disabled.',
    options: [
      {
        type: ApplicationCommandOptionType.String,
        name: 'id',
        description: 'The ID of the question to enable.',
        required: true,
      },
    ],
  },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: 'set-language',
    description: 'Set the language of questions in the server.',
    options: [
      {
        type: ApplicationCommandOptionType.String,
        name: 'language',
        description: 'The language of the questions.',
        choices: [
          { name: 'English', value: 'en' },
          ...Object.values(Translation).map(t => ({ name: Client.LANGUAGES[t], value: t })),
        ],
        required: true,
      },
    ],
  },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: 'toggle-globals',
    description: 'Disable/enable all global questions in this server.',
  },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: 'toggle-buttons',
    description: 'Disable/enable buttons showing on question messages.',
  },
] as const;

const serverSettings: Command = {
  name: 'server-settings',
  description: 'View and change the premium server settings.',
  options,
  category: 'control',
  perms: ['ManageGuild'],
  contexts: [ApplicationCommandContext.Guild],
  run: async (ctx: Context) => {
    if (!ctx.guildId)
      return ctx.reply(
        ctx.client.EMOTES.xmark + ' Server settings can only be managed in servers.'
      );
    if (
      !ctx.premium &&
      ctx.args[0] !== 'view' &&
      ctx.args[0] !== 'toggle-buttons' &&
      ctx.args[0] !== 'set-language'
    )
      return ctx.replyUpsell();

    const settings = await ctx.client.database.fetchGuildSettings(ctx.guildId);

    if (ctx.args[0] === 'view') {
      return ctx.reply({
        embeds: [
          {
            title: ctx.client.EMOTES.gear + ' Server Settings',
            description:
              'Configure how the bot functions on a server-wide level.\nModify a setting with `/server-settings <setting>`',
            fields: [
              {
                name: `• Paranoia Frequency: ${settings.showParanoiaFrequency}%`,
                value: `How often the question is shown in the paranoia game.\n\`/server-settings show-paranoia\``,
              },
              {
                name: `• Question Buttons: ${settings.disableButtons ? 'Disabled' : 'Enabled'}`,
                value: `Add buttons to question messages to get another question.\n\`/server-settings toggle-buttons\``,
              },
              {
                name: `• Disabled Questions:`,
                value:
                  (settings.disableGlobals
                    ? 'All global questions'
                    : settings.disabledQuestions.map(id => '`' + id + '`').join(', ') || 'None') +
                  '\n`/server-settings disable-question`',
              },
            ],
            color: ctx.client.COLORS.BLUE,
          },
        ],
      });
    } else if (ctx.args[0] === 'show-paranoia') {
      const freq = ctx.getOption<Mutable<typeof options[1]['options'][0]>>('frequency')!.value;

      if (freq < 0 || freq > 100)
        return ctx.reply(
          ctx.client.EMOTES.xmark + ' Question show frequency must be between 0 and 100 percent.'
        );

      await ctx.client.database.updateGuildSettings({
        id: ctx.guildId,
        showParanoiaFrequency: freq,
      });
      return ctx.reply({
        embeds: [
          ctx.client.functions.embed(
            `Paranoia questions will now be shown ${freq}% of the time.`,
            ctx.user,
            false
          ),
        ],
      });
    } else if (ctx.args[0] === 'disable-question') {
      const id = ctx.getOption<Mutable<typeof options[2]['options'][0]>>('id')!.value;
      const question = ctx.client.database.fetchSpecificQuestion(id);
      if (!question)
        return ctx.reply(ctx.client.EMOTES.xmark + ' I could not find that default question.');

      if (settings.disableGlobals)
        return ctx.reply(
          ctx.client.EMOTES.xmark + ' Global questions are currently disabled in this server.'
        );
      if (settings.disabledQuestions.includes(id))
        return ctx.reply(ctx.client.EMOTES.xmark + ' That question is already disabled.');

      await ctx.client.database.addDisabledQuestion(ctx.guildId, id);
      return ctx.reply(ctx.client.EMOTES.checkmark + ' Successfully disabled question: ' + id);
    } else if (ctx.args[0] === 'enable-question') {
      const id = ctx.getOption<Mutable<typeof options[3]['options'][0]>>('id')!.value;

      if (settings.disableGlobals)
        return ctx.reply(
          ctx.client.EMOTES.xmark + ' Global questions are currently disabled in this server.'
        );
      if (!settings.disabledQuestions.includes(id))
        return ctx.reply(ctx.client.EMOTES.xmark + ' That question is not currently disabled.');

      await ctx.client.database.updateGuildSettings({
        id: ctx.guildId,
        disabledQuestions: settings.disabledQuestions.filter(q => q !== id),
      });

      return ctx.reply(ctx.client.EMOTES.checkmark + ' That question is now enabled again.');
    } else if (ctx.args[0] === 'set-language') {
      const lang = ctx.getOption<Mutable<typeof options[4]['options'][0]>>('language')!.value;
      const dbLang = lang === 'en' ? null : lang;

      await ctx.client.database.updateGuildSettings({
        id: ctx.guildId,
        language: dbLang,
      });

      return ctx.reply(
        ctx.client.EMOTES.checkmark + ' Question language set to ' + ctx.client.LANGUAGES[lang]
      );
    } else if (ctx.args[0] === 'toggle-globals') {
      await ctx.client.database.updateGuildSettings({
        id: ctx.guildId,
        disableGlobals: !settings.disableGlobals,
      });
      return ctx.reply(
        `${ctx.client.EMOTES.checkmark} ${
          settings.disableGlobals ? 'Enabled' : 'Disabled'
        } global questions in this server.`
      );
    } else if (ctx.args[0] === 'toggle-buttons') {
      await ctx.client.database.updateGuildSettings({
        id: ctx.guildId,
        disableButtons: !settings.disableButtons,
      });
      return ctx.reply(
        `${ctx.client.EMOTES.checkmark} ${
          settings.disableButtons ? 'Enabled' : 'Disabled'
        } buttons in this server.`
      );
    }
  },
};

export default serverSettings;
