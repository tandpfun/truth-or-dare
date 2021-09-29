import Command from '../classes/Command';
import Context from '../classes/Context';

const help: Command = {
  name: 'help',
  description: 'Get a list of commands.',
  category: 'control',
  options: [],
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    ctx.reply({
      embeds: [
        {
          title: 'Commands List:',
          fields: [
            {
              name: `${ctx.client.EMOTES.question} __Question Commands__`,
              value: `${ctx.client.commands
                .filter(c => c.category === 'question')
                .map(c => `**/${c.name}** - ${c.description}`)
                .join('\n')}`,
            },
            {
              name: `${ctx.client.EMOTES.gear} __Control Commands__`,
              value: `${ctx.client.commands
                .filter(c => c.category === 'control')
                .map(c => `**/${c.name}** - ${c.description}`)
                .join('\n')}`,
            },
          ],
          color: ctx.client.COLORS.BLUE,
        },
      ],
    });
  },
};

export default help;
