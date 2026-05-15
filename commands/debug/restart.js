const { SlashCommandBuilder } = require('discord.js');
const { DEVELOPER_ROLE, isBotOwner, hasRole } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('restart')
    .setDescription('Starte den Bot neu (PM2 empfohlen)'),
  async execute(interaction) {
    try {
      if (!isBotOwner(interaction.member) && !hasRole(interaction.member, DEVELOPER_ROLE)) {
        return await interaction.reply({ content: 'Du hast keine Berechtigung für diesen Befehl.', ephemeral: true });
      }
      await interaction.reply('Der Bot wird jetzt neu gestartet...');
      process.exit(0);
    } catch (error) {
      console.error('Restart command failed:', error);
      await interaction.reply({ content: 'Der Bot konnte nicht neu gestartet werden.', ephemeral: true });
    }
  }
};
