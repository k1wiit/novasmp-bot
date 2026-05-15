const { SlashCommandBuilder } = require('discord.js');
const { DEVELOPER_ROLE, isBotOwner, hasRole } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Zeigt Bot-Laufzeit, Arbeitsspeicher und Ping an'),
  async execute(interaction) {
    try {
      if (!isBotOwner(interaction.member) && !hasRole(interaction.member, DEVELOPER_ROLE)) {
        return await interaction.reply({ content: 'Du hast keine Berechtigung für diesen Befehl.', ephemeral: true });
      }

      const uptime = process.uptime();
      const memory = process.memoryUsage();
      const embed = {
        color: 0x57b5ff,
        title: 'Bot Status',
        fields: [
          { name: 'Uptime', value: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`, inline: true },
          { name: 'Ping', value: `${Math.round(interaction.client.ws.ping)}ms`, inline: true },
          { name: 'Memory', value: `${Math.round(memory.rss / 1024 / 1024)} MB RSS`, inline: true }
        ],
        timestamp: new Date()
      };

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Status command failed:', error);
      await interaction.reply({ content: 'Status konnte nicht abgerufen werden.', ephemeral: true });
    }
  }
};
