"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const wyr = {
    name: 'wyr',
    description: 'Gives a random Would You Rather question to be answered!',
    options: [
        {
            type: 3 /* String */,
            name: 'rating',
            description: 'The maturity level of the topics the question can relate to.',
            choices: [
                { name: 'PG', value: 'pg' },
                { name: 'PG13', value: 'pg13' },
                { name: 'R', value: 'r' },
            ],
        },
    ],
    perms: [],
    run: async (ctx) => {
        const rating = ctx.getOption('rating')
            ?.value;
        const wyr = ctx.client.randomQuestion('wyr', rating ? [rating] : undefined);
        ctx.reply({
            embeds: [
                {
                    title: wyr.question,
                    color: ctx.client.COLORS.BLUE,
                    footer: {
                        text: `${wyr.type}-${wyr.rating}-${wyr.index}`,
                    },
                },
            ],
        });
    },
};
exports.default = wyr;
