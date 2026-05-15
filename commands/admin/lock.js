const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { ADMIN_ROLE, isBotOwner, hasRole } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Sperrt diesen Kanal für Mitglieder'),
  async execute(interaction) {
    try {
      if (!isBotOwner(interaction.member) && !hasRole(interaction.member, ADMIN_ROLE)) {
        return await interaction.reply({ content: 'Du hast keine Berechtigung für diesen Befehl.', ephemeral: true });
      }

      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: false,
        AddReactions: false
      });

      await interaction.reply({ content: 'Kanal erfolgreich gesperrt.', ephemeral: true });
    } catch (error) {
      console.error('Lock command failed:', error);
      await interaction.reply({ content: 'Kanal konnte nicht gesperrt werden.', ephemeral: true });
    }
  }
};
