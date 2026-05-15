const { SlashCommandBuilder } = require('discord.js');
const { ADMIN_ROLE, isBotOwner, hasRole } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Setzt den Slowmode für diesen Kanal')
    .addIntegerOption((option) =>
      option.setName('seconds').setDescription('Slowmode-Dauer in Sekunden').setRequired(true)
    ),
  async execute(interaction) {
    try {
      if (!isBotOwner(interaction.member) && !hasRole(interaction.member, ADMIN_ROLE)) {
        return await interaction.reply({ content: 'Du hast keine Berechtigung für diesen Befehl.', ephemeral: true });
      }

      const seconds = interaction.options.getInteger('seconds');
      if (seconds < 0 || seconds > 21600) {
        return await interaction.reply({ content: 'Der Slowmode muss zwischen 0 und 21600 Sekunden liegen.', ephemeral: true });
      }

      await interaction.channel.setRateLimitPerUser(seconds);
      await interaction.reply({ content: `Slowmode wurde auf ${seconds} Sekunden gesetzt.`, ephemeral: true });
    } catch (error) {
      console.error('Slowmode command failed:', error);
      await interaction.reply({ content: 'Der Slowmode konnte nicht gesetzt werden.', ephemeral: true });
    }
  }
};
