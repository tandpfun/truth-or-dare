import {
  RESTPostAPICurrentUserCreateDMChannelResult,
  APIInteractionResponseCallbackData,
  RESTPostAPIChannelMessageJSONBody,
  RESTPatchAPIChannelMessageResult,
  RESTPostAPIChannelMessageResult,
  RESTGetAPIGuildChannelsResult,
  APIInteractionGuildMember,
  RESTGetAPIChannelResult,
  RESTGetAPIGuildResult,
  PermissionFlagsBits,
  ComponentType,
  ButtonStyle,
  APIEmbed,
} from 'discord-api-types/v9';
import superagent from 'superagent';

import type Command from './Command';
import type Context from './Context';
import Client from './Client';

export type Permission =
  | keyof typeof PermissionFlagsBits
  | typeof PermissionFlagsBits[keyof typeof PermissionFlagsBits];

// bad design with side effect & return type
export function checkPerms(command: Command, ctx: Context) {
  if (!ctx.member) return true;
  const required = command.perms
    .map(perm => (typeof perm === 'bigint' ? perm : PermissionFlagsBits[perm]))
    .reduce((a, c) => a | c, 0n);
  const missing = required & ~BigInt(ctx.member.permissions);
  const missingNames = Object.keys(PermissionFlagsBits).filter(
    key => PermissionFlagsBits[key as keyof typeof PermissionFlagsBits] & missing
  );
  if (missing) {
    ctx.reply({
      embeds: [
        embed(
          `You are missing the following required permissions: ${missingNames
            .map(p => '`' + p.replaceAll(/([a-z])([A-Z])/g, '$1 $2') + '`')
            .join(', ')}`,
          ctx.user,
          true
        ),
      ],
      flags: 1 << 6,
    });
    return false;
  }
  return true;
}

export function hasPermission(permission: Permission, member?: APIInteractionGuildMember) {
  if (!member) return true;
  const required = typeof permission === 'bigint' ? permission : PermissionFlagsBits[permission];
  const missing = required & ~BigInt(member.permissions);
  return !missing;
}

export function avatarURL({
  id,
  avatar,
  discriminator,
}: {
  id: string;
  avatar: string | null;
  discriminator: string;
}) {
  return (
    'https://cdn.discordapp.com/' +
    (avatar
      ? `avatars/${id}/${avatar}.${avatar.startsWith('_a') ? 'gif' : 'png'}`
      : `/embed/avatars/${Number(discriminator) % 5}.png`)
  );
}

export function embed(
  description: string,
  user?: { id: string; username: string; avatar: string | null; discriminator: string },
  fail: boolean | null = null
): APIEmbed {
  return {
    description: `${
      fail ? Client.EMOTES.xmark : fail !== null ? Client.EMOTES.checkmark : ''
    } ${description}`,
    author: user
      ? {
          name: `${user.username}#${user.discriminator}`,
          icon_url: avatarURL(user),
        }
      : undefined,
    color: fail ? Client.COLORS.RED : fail === null ? Client.COLORS.BLUE : Client.COLORS.GREEN,
  };
}

export function deepEquals(obj1: any, obj2: any, ignoreList: string[] = []): boolean {
  return (
    typeof obj1 === typeof obj2 &&
    Array.isArray(obj1) === Array.isArray(obj2) &&
    (obj1 !== null && typeof obj1 === 'object'
      ? Array.isArray(obj1)
        ? obj1.length === obj2.length && obj1.every((a, i) => deepEquals(a, obj2[i], ignoreList))
        : Object.keys(obj1).every(key => {
            return (
              ignoreList.includes(key) ||
              (key in obj2 && deepEquals(obj1[key], obj2[key], ignoreList))
            );
          })
      : obj1 === obj2)
  );
}

export function titleCase(str: string): string {
  return str.slice(0, 1).toUpperCase() + str.slice(1).toLowerCase();
}

export function premiumAd(): APIInteractionResponseCallbackData {
  return {
    embeds: [
      {
        color: Client.COLORS.YELLOW,
        title: `${Client.EMOTES.sparkles} Truth or Dare Premium`,
        description:
          'Help support the development and hosting of Truth or Dare with premium! Get some awesome perks like custom questions. Click the button below for more information.',
      },
    ],
    components: [
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.Button,
            label: 'Get Premium',
            url: 'https://truthordarebot.xyz/premium',
            style: ButtonStyle.Link,
          },
        ],
      },
    ],
  };
}

export function promoMessage(client: Client, guildId?: string) {
  if (guildId && client.database.isPremiumGuild(guildId)) return '';

  const promoMessages = [
    `${client.EMOTES.arrowUp} Enjoying the bot? Consider [upvoting me](https://top.gg/bot/692045914436796436/vote)!`,
    `${client.EMOTES.star} Having fun? Share your experience [with a review](https://top.gg/bot/692045914436796436)! (at the bottom of the page)`,
    `${client.EMOTES.sparkles} Want to stop repeating questions? Repeat prevention is a [premium feature](https://truthordarebot.xyz/premium).`,
    `${client.EMOTES.earth} You can now play Truth or Dare in [7 languages](https://docs.truthordarebot.xyz/setting-question-language)!`,
  ];

  return Math.random() < 0.08
    ? promoMessages[Math.floor(Math.random() * promoMessages.length)]
    : '';
}

export async function sendMessage(
  data: RESTPostAPIChannelMessageJSONBody,
  channelId: string,
  token: string
): Promise<RESTPostAPIChannelMessageResult | null> {
  return await superagent
    .post(
      `${process.env.DISCORD_API_URL || 'https://discord.com'}/api/channels/${channelId}/messages`
    )
    .send(data)
    .set('Authorization', `Bot ${token}`)
    .then(res => res.body)
    .catch(_ => null);
}

export async function editMessage(
  data: RESTPostAPIChannelMessageJSONBody,
  channelId: string,
  messageId: string,
  token: string
): Promise<RESTPatchAPIChannelMessageResult | null> {
  return await superagent
    .patch(
      `${
        process.env.DISCORD_API_URL || 'https://discord.com'
      }/api/channels/${channelId}/messages/${messageId}`
    )
    .send(data)
    .set('Authorization', `Bot ${token}`)
    .then(res => res.body);
}

export async function createDMChannel(
  userId: string,
  token: string
): Promise<RESTPostAPICurrentUserCreateDMChannelResult | null> {
  return await superagent
    .post(`${process.env.DISCORD_API_URL || 'https://discord.com'}/api/users/@me/channels`)
    .send({ recipient_id: userId })
    .set('Authorization', `Bot ${token}`)
    .then(res => res.body)
    .catch(_ => null);
}

export async function fetchGuild(
  guildId: string,
  token: string
): Promise<RESTGetAPIGuildResult | null> {
  return await superagent
    .get(`${process.env.DISCORD_API_URL || 'https://discord.com'}/api/guilds/${guildId}`)
    .set('Authorization', `Bot ${token}`)
    .then(res => res.body)
    .catch(_ => null);
}

export async function fetchChannel(
  channelId: string,
  token: string
): Promise<RESTGetAPIChannelResult | null> {
  return await superagent
    .get(`${process.env.DISCORD_API_URL || 'https://discord.com'}/api/channels/${channelId}`)
    .set('Authorization', `Bot ${token}`)
    .then(res => res.body)
    .catch(_ => null);
}

export async function fetchGuildChannels(
  guildId: string,
  token: string
): Promise<RESTGetAPIGuildChannelsResult | null> {
  return await superagent
    .get(`${process.env.DISCORD_API_URL || 'https://discord.com'}/api/guilds/${guildId}/channels`)
    .set('Authorization', `Bot ${token}`)
    .then(res => res.body)
    .catch(console.log);
}
