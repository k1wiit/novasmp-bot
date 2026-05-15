const { SlashCommandBuilder } = require('discord.js');
const { STAFF_ROLE, isBotOwner, hasRole } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Lasse den Bot eine Nachricht in einen Kanal senden')
    .addChannelOption((option) => option.setName('channel').setDescription('Zielkanal').setRequired(true))
    .addStringOption((option) => option.setName('message').setDescription('Nachrichteninhalt').setRequired(true)),
  async execute(interaction) {
    try {
      if (!isBotOwner(interaction.member) && !hasRole(interaction.member, STAFF_ROLE)) {
        return await interaction.reply({ content: 'Du hast keine Berechtigung für diesen Befehl.', ephemeral: true });
      }

      const channel = interaction.options.getChannel('channel');
      const message = interaction.options.getString('message');
      await channel.send(message);
      await interaction.reply({ content: 'Nachricht erfolgreich gesendet.', ephemeral: true });
    } catch (error) {
      console.error('Say command failed:', error);
      await interaction.reply({ content: 'Die Nachricht konnte nicht gesendet werden.', ephemeral: true });
    }
  }
};
