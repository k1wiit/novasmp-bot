const { SlashCommandBuilder } = require('discord.js');
const { MOD_ROLE, isBotOwner, hasRole } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bannt einen Benutzer vom Server')
    .addUserOption((option) => option.setName('user').setDescription('Benutzer, der gebannt werden soll').setRequired(true))
    .addStringOption((option) => option.setName('reason').setDescription('Grund für den Bann').setRequired(false)),
  async execute(interaction) {
    try {
      if (!isBotOwner(interaction.member) && !hasRole(interaction.member, MOD_ROLE)) {
        return await interaction.reply({ content: 'Du hast keine Berechtigung für diesen Befehl.', ephemeral: true });
      }

      const target = interaction.options.getMember('user');
      const reason = interaction.options.getString('reason') || 'Kein Grund angegeben';
      if (!target || !target.bannable) {
        return await interaction.reply({ content: 'Ich kann diesen Benutzer nicht bannen.', ephemeral: true });
      }

      await target.ban({ reason });
      await interaction.reply({ content: `Der Benutzer ${target.user.tag} wurde erfolgreich gebannt.`, ephemeral: true });
    } catch (error) {
      console.error('Ban command failed:', error);
      await interaction.reply({ content: 'Der Benutzer konnte nicht gebannt werden.', ephemeral: true });
    }
  }
};
