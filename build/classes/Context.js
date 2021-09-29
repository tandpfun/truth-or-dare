"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_interactions_1 = require("discord-interactions");
class Context {
    constructor(interaction, client, response) {
        this.rawInteraction = interaction;
        this.rawData = interaction.data;
        this.response = response;
        this.client = client;
        this.command = {
            id: interaction.data.id,
            name: interaction.data.name,
            type: interaction.data.type,
        };
        this.options = interaction.data.options || [];
        this.args = this.options.map(o => o.type === 1 /* Subcommand */ ||
            o.type === 2 /* SubcommandGroup */
            ? o.name
            : o.value);
        this.resolved = interaction.data.resolved;
        this.applicationId = interaction.application_id;
        this.channelId = interaction.channel_id;
        this.guildId = interaction.guild_id;
        this.member = interaction.member;
        this.user = interaction.member.user;
    }
    getOption(name) {
        return this.options.find(o => o.name === name);
    }
    reply(data) {
        if (typeof data === 'string')
            data = { content: data };
        this.response.send({
            type: discord_interactions_1.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data,
        });
    }
}
exports.default = Context;
