const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../utils/embedBuilder');

module.exports = {
  name: 'messageDelete',
  async execute(client, message) {
    try {
      if (!message.guild || message.partial) return;
      const logChannel = client.channels.cache.get(process.env.LOG_CHANNEL_ID);
      if (!logChannel) return;

      const embed = new EmbedBuilder()
        .setTitle('Nachricht gelöscht')
        .setColor(COLORS.deletion)
        .addFields(
          { name: 'Autor', value: message.author ? message.author.tag : 'Unbekannt', inline: true },
          { name: 'Kanal', value: `<#${message.channel.id}>`, inline: true },
          { name: 'Inhalt', value: message.content ? message.content.slice(0, 1024) : 'Kein Inhalt', inline: false }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      console.error('messageDelete event failed:', error);
    }
  }
};
