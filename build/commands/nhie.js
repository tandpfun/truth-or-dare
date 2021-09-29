"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nhie = {
    name: 'nhie',
    description: 'Gives a random Never Have I Ever question to be answered!',
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
        const nhie = ctx.client.randomQuestion('nhie', rating ? [rating] : undefined);
        ctx.reply({
            embeds: [
                {
                    title: nhie.question,
                    color: ctx.client.COLORS.BLUE,
                    footer: {
                        text: `${nhie.type}-${nhie.rating}-${nhie.index}`,
                    },
                },
            ],
        });
    },
};
exports.default = nhie;
