import { Rating } from '.prisma/client';
import {
  ApplicationCommandOptionType,
  ApplicationCommandInteractionDataOptionString,
  RESTPostAPICurrentUserCreateDMChannelResult,
  RESTPostAPIChannelMessageJSONBody,
  RESTGetAPIGuildResult,
  RESTPostAPIChannelMessageResult
} from 'discord-api-types';
import Command from '../classes/Command';
import Context from '../classes/Context';
import superagent from 'superagent'

const paranoia: Command = {
  name: 'paranoia',
  description: 'Gives a paranoia question.',
  category: 'question',
  options: [
    {
      type: ApplicationCommandOptionType.User,
      name: 'target',
      description: "The user to send a paranoia question to",
      required: true
    },
    {
      type: ApplicationCommandOptionType.String,
      name: 'rating',
      description: 'The maturity level of the topics the question can relate to.',
      choices: [
        { name: 'PG', value: 'PG' },
        { name: 'PG13', value: 'PG13' },
        { name: 'R', value: 'R' },
      ],
    },
  ],
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    if (ctx.guildId === null) {
      ctx.reply("Paranoia questions cannot be sent from DMs")
      return
    }
    const channelSettings = await ctx.channelSettings;
    const rating = (ctx.getOption('rating') as ApplicationCommandInteractionDataOptionString)
      ?.value;
    const paranoia = await ctx.client.database.getRandomQuestion(
      'PARANOIA',
      (rating ? [rating as Rating] : ['PG', 'PG13', 'R']).filter(
        (r: Rating) => !channelSettings.disabledRatings.includes(r)
      ) as Rating[]
    );
    const status = await ctx.client.database.checkParanoiaStatus(ctx.user.id, ctx.guildId)

    if (!status.guildOpen) {
      ctx.reply("That user already has an active question sent from this server")
      return
    } else if (status.queueEmpty) {
      const dmChannelResponse = await superagent
        .post("https://discord.com/api/users/@me/channels")
        .send({ recipient_id: ctx.user.id })
        .set('Authorization', `Bot ${process.env.BOT_TOKEN}`)
      if (dmChannelResponse.status !== 200) {
        console.log("dm channel fetch failed, code " + dmChannelResponse.status)
        ctx.reply("Failed to send DM")
        return
      }
      const dmChannel = <RESTPostAPICurrentUserCreateDMChannelResult>JSON.parse(dmChannelResponse.text)
      const guildResponse = await superagent
        .get(`https://discord.com/api/guilds/${ctx.guildId}`)
        .set('Authorization', `Bot ${process.env.BOT_TOKEN}`)
      if (guildResponse.status !== 200) {
        console.log("guild fetch failed, code " + guildResponse.status)
        ctx.reply("Failed to send DM")
        return
      }
      const guild = <RESTGetAPIGuildResult>JSON.parse(guildResponse.text)
      const messageResponse = await superagent
        .post(`https://discord.com/api/channels/${dmChannel.id}/messages`)
        .send({
          embeds: [{
            description: `Question from **${ctx.user.username}** in **${guild.name}**`,
            fields: [{
              name: paranoia.question,
              value: ' '
            }],
            footer: { text: "Use /ans to answer this question" }
          }]
        } as RESTPostAPIChannelMessageJSONBody)
        .set('Authorization', `Bot ${process.env.BOT_TOKEN}`)
      if (messageResponse.status !== 200) {
        console.log("message send failed, code " + messageResponse.status)
        ctx.reply("Failed to send DM")
        return
      }
      const messageSent = <RESTPostAPIChannelMessageResult>JSON.parse(messageResponse.text)

      await ctx.client.database.addParanoiaQuestion({
        userId: ctx.user.id,
        questionText: paranoia.question,
        guildId: ctx.guildId,
        channelId: ctx.channelId,
        dmMessageId: messageSent.id
      })

      ctx.reply("Question sent")
    } else {
      await ctx.client.database.addParanoiaQuestion({
        userId: ctx.user.id,
        questionText: paranoia.question,
        guildId: ctx.guildId,
        channelId: ctx.channelId,
        dmMessageId: null
      })

      ctx.reply("User already has a live question from a different server, question added to queue")
    }

    // ctx.reply({
    //   embeds: [
    //     {
    //       title: paranoia.question,
    //       color: ctx.client.COLORS.BLUE,
    //       footer: paranoia.id
    //         ? {
    //             text: `Type: ${paranoia.type} | Rating: ${paranoia.rating} | ID: ${paranoia.id}`,
    //           }
    //         : null,
    //     },
    //   ],
    // });
  },
};

export default paranoia;