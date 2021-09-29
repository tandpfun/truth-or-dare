"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dare = {
    name: 'dare',
    description: 'Gives a dare that has to be completed!',
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
        const dare = ctx.client.randomQuestion('dare', rating ? [rating] : undefined);
        ctx.reply({
            embeds: [
                {
                    title: dare.question,
                    color: ctx.client.COLORS.RED,
                    footer: {
                        text: `${dare.type}-${dare.rating}-${dare.index}`,
                    },
                },
            ],
        });
    },
};
exports.default = dare;
