import {
  APIEmbed,
  PermissionFlagsBits,
  RESTGetAPIChannelResult,
  RESTGetAPIGuildResult,
  RESTPatchAPIChannelMessageResult,
  RESTPostAPIChannelMessageJSONBody,
  RESTPostAPIChannelMessageResult,
  RESTPostAPICurrentUserCreateDMChannelResult,
} from 'discord-api-types/v9';
import superagent from 'superagent';
import Client from './Client';
import Command from './Command';
import Context from './Context';

export function checkPerms(command: Command, ctx: Context) {
  if (!ctx.guildId) return true;
  const required = command.perms
    .map(perm => (typeof perm === 'bigint' ? perm : PermissionFlagsBits[perm]))
    .reduce((a, c) => a | c, 0n);
  const missing = required & ~BigInt(ctx.member.permissions);
  const missingNames = Object.keys(PermissionFlagsBits).filter(
    key => PermissionFlagsBits[key] & missing
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
    });
    return false;
  }
  return true;
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
  user?: { id: string; username: string; avatar: string; discriminator: string },
  fail: boolean = null
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
      : null,
    color: fail ? Client.COLORS.RED : fail === null ? Client.COLORS.BLUE : Client.COLORS.GREEN,
  };
}

export function deepEquals(obj1: any, obj2: any, ignoreList: string[] = []): boolean {
  return (
    typeof obj1 === typeof obj2 &&
    Array.isArray(obj1) === Array.isArray(obj2) &&
    (typeof obj1 === 'object'
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

export async function sendMessage(
  data: RESTPostAPIChannelMessageJSONBody,
  channelId: string,
  token: string
): Promise<RESTPostAPIChannelMessageResult | null> {
  return await superagent
    .post(`https://discord.com/api/channels/${channelId}/messages`)
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
    .patch(`https://discord.com/api/channels/${channelId}/messages/${messageId}`)
    .send(data)
    .set('Authorization', `Bot ${token}`)
    .then(res => res.body)
    .catch(_ => null);
}

export async function createDMChannel(
  userId: string,
  token: string
): Promise<RESTPostAPICurrentUserCreateDMChannelResult | null> {
  return await superagent
    .post('https://discord.com/api/users/@me/channels')
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
    .get(`https://discord.com/api/guilds/${guildId}`)
    .set('Authorization', `Bot ${token}`)
    .then(res => res.body)
    .catch(_ => null);
}

export async function fetchChannel(
  channelId: string,
  token: string
): Promise<RESTGetAPIChannelResult | null> {
  return await superagent
    .get(`https://discord.com/api/channel/${channelId}`)
    .set('Authorization', `Bot ${token}`)
    .then(res => res.body)
    .catch(_ => null);
}
