import { ApplicationCommandOptionType } from "discord-api-types";
import Context from "../classes/Context";
import superagent from 'superagent'
import Command from "../classes/Command";

const ans: Command = {
    name: 'ans',
    description: "Answers a paranoia question sent to you",
    category: 'question',
    options: [
        {
            type: ApplicationCommandOptionType.String,
            name: 'answer',
            description: "The answer to the paranoia question",
            required: true
        }
    ],
    perms: [],
    run: async (ctx: Context): Promise<void> => {
        if (ctx.guildId !== null) {
            ctx.reply("Paranoia questions can only be answered in DMs")
            return
        }
        const paranoiaData = await ctx.client.database.getParanoiaData(ctx.user.id)
        if (paranoiaData.length === 0) {
            ctx.reply("There are no active paranoia questions")
            return
        }

        const messageResponse = await superagent
            .post(`https://discord.com/api/channels/${paranoiaData[0].channelId}/messages`)
            .send({

            })
            .set('Authorization', `Bot ${process.env.BOT_TOKEN}`)
        if (messageResponse.status !== 200) {
            console.log("Message send failed, response code: " + messageResponse.status)
            ctx.reply("Failed to send message, try again later")
            return
        }

        await ctx.client.database.removeParanoiaQuestion(ctx.user.id, ctx.guildId)
        const nextQuestion = await ctx.client.database.getNextParanoia(ctx.user.id)
        if (nextQuestion) {
            
        }
    }
}