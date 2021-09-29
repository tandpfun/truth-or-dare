import { APIEmbed, PermissionFlagsBits } from 'discord-api-types/v9';
import Client from './Client';
import Command from './Command';
import Context from './Context';

export function checkPerms(command: Command, ctx: Context) {
  const required = command.perms
    .map(perm => (typeof perm === 'bigint' ? perm : PermissionFlagsBits[perm]))
    .reduce((a, c) => a & c, 0n);

  if ((BigInt(ctx.member.permissions) & required) !== required) {
    ctx.reply(`${Client.EMOTES.xmark} you need more perms`); // TODO: better message
    return false;
  }
  return true;
}

export function avatarURL({ id, avatar }: { id: string; avatar: string }) {
  return `https://cdn.discordapp.com/avatars/${id}/${avatar}.${
    avatar.startsWith('_a') ? 'gif' : 'png'
  }`;
}

export function fail(
  description: string,
  user?: { id: string; username: string; avatar: string },
  fail?: boolean
): APIEmbed {
  return {
    description,
    author: {
      name: user.username,
      icon_url: avatarURL(user),
    },
    color: fail ? Client.COLORS.RED : fail === null ? Client.COLORS.BLUE : Client.COLORS.GREEN,
  };
}
