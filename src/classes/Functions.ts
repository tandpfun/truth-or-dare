import { APIEmbed, PermissionFlagsBits } from 'discord-api-types/v9';
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

export function avatarURL({ id, avatar }: { id: string; avatar: string }) {
  return `https://cdn.discordapp.com/avatars/${id}/${avatar}.${
    avatar.startsWith('_a') ? 'gif' : 'png'
  }`;
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
    author: {
      name: `${user.username}#${user.discriminator}`,
      icon_url: avatarURL(user),
    },
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
