const { SlashCommandBuilder } = require('discord.js');
const { ADMIN_ROLE, isBotOwner, hasRole } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delete')
    .setDescription('Löscht mehrere Nachrichten in diesem Kanal')
    .addIntegerOption((option) =>
      option.setName('amount').setDescription('Anzahl der zu löschenden Nachrichten (1-100)').setRequired(true)
    ),
  async execute(interaction) {
    try {
      if (!isBotOwner(interaction.member) && !hasRole(interaction.member, ADMIN_ROLE)) {
        return await interaction.reply({ content: 'Du hast keine Berechtigung für diesen Befehl.', ephemeral: true });
      }

      const amount = interaction.options.getInteger('amount');
      if (amount < 1 || amount > 100) {
        return await interaction.reply({ content: 'Bitte gib eine Anzahl zwischen 1 und 100 an.', ephemeral: true });
      }

      const deleted = await interaction.channel.bulkDelete(amount, true);
      await interaction.reply({ content: `Es wurden ${deleted.size} Nachrichten gelöscht.`, ephemeral: true });
    } catch (error) {
      console.error('Delete command failed:', error);
      await interaction.reply({ content: 'Nachrichten konnten nicht gelöscht werden.', ephemeral: true });
    }
  }
};
