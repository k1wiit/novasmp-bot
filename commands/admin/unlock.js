const { SlashCommandBuilder } = require('discord.js');
const { ADMIN_ROLE, isBotOwner, hasRole } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Entsperrt diesen Kanal für Mitglieder'),
  async execute(interaction) {
    try {
      if (!isBotOwner(interaction.member) && !hasRole(interaction.member, ADMIN_ROLE)) {
        return await interaction.reply({ content: 'Du hast keine Berechtigung für diesen Befehl.', ephemeral: true });
      }

      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: true,
        AddReactions: true
      });

      await interaction.reply({ content: 'Kanal erfolgreich entsperrt.', ephemeral: true });
    } catch (error) {
      console.error('Unlock command failed:', error);
      await interaction.reply({ content: 'Kanal konnte nicht entsperrt werden.', ephemeral: true });
    }
  }
};
