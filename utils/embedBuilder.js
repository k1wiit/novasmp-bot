const { EmbedBuilder } = require('discord.js');

const COLORS = {
  info: 0x57b5ff,
  success: 0x57ff8c,
  warning: 0xffd264,
  danger: 0xff4d4d,
  voice: 0x4f82ff,
  deletion: 0xff5c5c
};

function createEmbed(options = {}) {
  return new EmbedBuilder()
    .setColor(options.color || COLORS.info)
    .setTitle(options.title || null)
    .setDescription(options.description || null)
    .setFooter(options.footer ? { text: options.footer } : null)
    .setTimestamp(options.timestamp !== false ? new Date() : null);
}

module.exports = {
  createEmbed,
  COLORS
};
