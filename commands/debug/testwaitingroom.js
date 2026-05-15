const { SlashCommandBuilder } = require('discord.js');
const { DEVELOPER_ROLE, isBotOwner, hasRole } = require('../../utils/permissions');
const { startWaitingRoomMusic, stopWaitingRoomMusic } = require('../../utils/music');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('testwaitingroom')
    .setDescription('Simuliere die Wartemusik-Wiedergabe'),
  async execute(interaction) {
    try {
      if (!isBotOwner(interaction.member) && !hasRole(interaction.member, DEVELOPER_ROLE)) {
        return await interaction.reply({ content: 'Du hast keine Berechtigung für diesen Befehl.', ephemeral: true });
      }

      const channel = interaction.client.channels.cache.get(process.env.WAITING_ROOM_ID);
      if (!channel) {
        return await interaction.reply({ content: 'Der Warteraum-Kanal ist nicht konfiguriert oder wurde nicht gefunden.', ephemeral: true });
      }

      await startWaitingRoomMusic(interaction.client, channel);
      await interaction.reply({ content: 'Wartemusik-Simulation erfolgreich gestartet.', ephemeral: true });
    } catch (error) {
      console.error('Test waiting room failed:', error);
      await interaction.reply({ content: 'Die Wartemusik-Simulation konnte nicht gestartet werden.', ephemeral: true });
    }
  }
};
