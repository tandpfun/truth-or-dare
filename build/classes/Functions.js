"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fail = exports.avatarURL = exports.checkPerms = void 0;
const v9_1 = require("discord-api-types/v9");
const Client_1 = __importDefault(require("./Client"));
function checkPerms(command, ctx) {
    const required = command.perms
        .map(perm => (typeof perm === 'bigint' ? perm : v9_1.PermissionFlagsBits[perm]))
        .reduce((a, c) => a & c, 0n);
    if ((BigInt(ctx.member.permissions) & required) !== required) {
        ctx.reply(`${Client_1.default.EMOTES.xmark} you need more perms`); // TODO: better message
        return false;
    }
    return true;
}
exports.checkPerms = checkPerms;
function avatarURL({ id, avatar }) {
    return `https://cdn.discordapp.com/avatars/${id}/${avatar}.${avatar.startsWith('_a') ? 'gif' : 'png'}`;
}
exports.avatarURL = avatarURL;
function fail(description, user, fail) {
    return {
        description,
        author: {
            name: user.username,
            icon_url: avatarURL(user),
        },
        color: fail ? Client_1.default.COLORS.RED : fail === null ? Client_1.default.COLORS.BLUE : Client_1.default.COLORS.GREEN,
    };
}
exports.fail = fail;
