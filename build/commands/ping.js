"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ping = {
    name: 'ping',
    description: 'Check if the bot is online!',
    options: [],
    perms: [],
    run: async (ctx) => {
        ctx.reply({
            embeds: [
                {
                    description: `${ctx.client.EMOTES.time} **Pong!** IDK the Latency!`,
                    color: ctx.client.COLORS.GREEN,
                },
            ],
        });
    },
};
exports.default = ping;
