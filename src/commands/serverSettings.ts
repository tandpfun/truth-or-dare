import { ApplicationCommandOptionType } from 'discord-api-types';

import { Mutable } from '../classes/OptionTypes';
import type Command from '../classes/Command';
import type Context from '../classes/Context';

const options = [
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: 'view',
    description: 'View premium server settings.',
  },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: 'showparanoia',
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
    name: 'disablequestion',
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
    name: 'enablequestion',
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
    name: 'toggleglobals',
    description: 'Disable/enable all global questions in this server.',
  },
] as const;

const serverSettings: Command = {
  name: 'serversettings',
  description: 'View and change the premium server settings.',
  options,
  category: 'control',
  perms: [],
  run: async (ctx: Context) => {
    if (!ctx.guildId)
      return ctx.reply(ctx.client.EMOTES.xmark + ' This command cannot be run in DMs.');
    if (!ctx.client.database.isPremiumGuild(ctx.guildId))
      return ctx.reply(ctx.client.functions.premiumAd());

    if (ctx.args[0] === 'view') {
      const settings = await ctx.client.database.getGuildSettings(ctx.guildId);
      return ctx.reply({
        embeds: [
          {
            title: ctx.client.EMOTES.gear + ' Server Settings',
            description: `__Paranoia frequency:__\n${
              settings.showParanoiaFrequency
            }%\n\n__Disabled Questions:__\n${
              settings.disableGlobals
                ? 'All global questions'
                : settings.disabledQuestions.map(id => '`' + id + '`').join(', ') || 'None'
            }`,
            color: ctx.client.COLORS.BLUE,
          },
        ],
      });
    } else if (ctx.args[0] === 'showparanoia') {
      const freq = ctx.getOption<Mutable<typeof options[1]['options'][0]>>('frequency').value;

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
    } else if (ctx.args[0] === 'disablequestion') {
      const id = ctx.getOption<Mutable<typeof options[2]['options'][0]>>('id').value;
      const question = ctx.client.database.fetchSpecificQuestion(id);
      if (!question)
        return ctx.reply(ctx.client.EMOTES.xmark + ' I could not find that default question.');

      const settings = await ctx.client.database.getGuildSettings(ctx.guildId);
      if (settings.disableGlobals)
        return ctx.reply(
          ctx.client.EMOTES.xmark + ' Global questions are currently disabled in this server.'
        );
      if (settings.disabledQuestions.includes(id))
        return ctx.reply(ctx.client.EMOTES.xmark + ' That question is already disabled.');

      await ctx.client.database.addDisabledQuestion(ctx.guildId, id);
      return ctx.reply(ctx.client.EMOTES.checkmark + ' Successfully disabled question: ' + id);
    } else if (ctx.args[0] === 'enablequestion') {
      const id = ctx.getOption<Mutable<typeof options[3]['options'][0]>>('id').value;

      const settings = await ctx.client.database.getGuildSettings(ctx.guildId);
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
    } else if (ctx.args[0] === 'toggleglobals') {
      const settings = await ctx.client.database.getGuildSettings(ctx.guildId);
      await ctx.client.database.updateGuildSettings({
        id: ctx.guildId,
        disableGlobals: !settings.disableGlobals,
      });
      return ctx.reply(
        `${ctx.client.EMOTES.checkmark} ${
          settings.disableGlobals ? 'Enabled' : 'Disabled'
        } global questions in this server.`
      );
    }
  },
};

export default serverSettings;
