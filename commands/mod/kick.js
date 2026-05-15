const { SlashCommandBuilder } = require('discord.js');
const { MOD_ROLE, isBotOwner, hasRole } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Verbannt einen Benutzer vom Server')
    .addUserOption((option) => option.setName('user').setDescription('Benutzer, der gekickt werden soll').setRequired(true))
    .addStringOption((option) => option.setName('reason').setDescription('Grund für den Kick').setRequired(false)),
  async execute(interaction) {
    try {
      if (!isBotOwner(interaction.member) && !hasRole(interaction.member, MOD_ROLE)) {
        return await interaction.reply({ content: 'Du hast keine Berechtigung für diesen Befehl.', ephemeral: true });
      }

      const target = interaction.options.getMember('user');
      const reason = interaction.options.getString('reason') || 'Kein Grund angegeben';
      if (!target || !target.kickable) {
        return await interaction.reply({ content: 'Ich kann diesen Benutzer nicht kicken.', ephemeral: true });
      }

      await target.kick(reason);
      await interaction.reply({ content: `Der Benutzer ${target.user.tag} wurde erfolgreich gekickt.`, ephemeral: true });
    } catch (error) {
      console.error('Kick command failed:', error);
      await interaction.reply({ content: 'Der Benutzer konnte nicht gekickt werden.', ephemeral: true });
    }
  }
};
