"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const truth = {
    name: 'truth',
    description: 'Gives a random question that has to be answered truthfully!',
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
        const truth = ctx.client.randomQuestion('truth', rating ? [rating] : undefined);
        ctx.reply({
            embeds: [
                {
                    title: truth.question,
                    color: ctx.client.COLORS.BLUE,
                    footer: {
                        text: `${truth.type}-${truth.rating}-${truth.index}`,
                    },
                },
            ],
        });
    },
};
exports.default = truth;
