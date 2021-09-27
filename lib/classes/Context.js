import { InteractionResponseType } from 'discord-interactions';

export default class Context {
  constructor(interaction, response) {
    this.rawInteraction = interaction;
    this.rawData = interaction.data;
    this.response = response;

    this.command = {
      id: interaction.data.id,
      name: interaction.data.name,
      type: interaction.data.type,
    };

    this.options = interaction.data.options || [];
    this.args = this.options.map((o) => o.value || o.name);
    this.resolved = interaction.data.resolved;

    this.applicationId = interaction.application_id;
    this.channelId = interaction.channel_id;
    this.guildId = interaction.guild_id;

    this.member = interaction.member;
    this.user = interaction.member.user;
  }

  async reply(data) {
    if (typeof data === 'string') data = { content: data };
    await this.response.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data,
    });
  }
}
