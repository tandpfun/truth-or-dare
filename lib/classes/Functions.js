import fs from 'fs';
import Discord from 'discord.js';

export default class Functions {
  getFiles(dir, ext) {
    let files = fs.readdirSync(dir);
    return files.filter((f) => f.endsWith(ext));
  }

  embed(color = 0, title = '', desc = '', rows = []) {
    let embed = new Discord.MessageEmbed()
      .setColor(color)
      .setTitle(title)
      .setDescription(desc);
    if (!Array.isArray(rows)) rows = [rows];
    return { embeds: [embed], components: rows };
  }

  buttonRow(buttons) {
    return new Discord.MessageActionRow().addComponents(
      buttons.map((b) => new Discord.MessageButton(b))
    );
  }

  hex2bin(hex) {
    const buf = new Uint8Array(Math.ceil(hex.length / 2));
    for (var i = 0; i < buf.length; i++) {
      buf[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return buf;
  }
}
