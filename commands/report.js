const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('report')
    .setDescription('Melde einen Spieler oder ein Problem an das Team')
    .addUserOption((option) =>
      option.setName('target').setDescription('Benutzer, den du melden möchtest').setRequired(true)
    ),
  async execute(interaction) {
    try {
      const target = interaction.options.getUser('target');
      const modal = new ModalBuilder()
        .setCustomId(`reportModal_${target.id}`)
        .setTitle('Melde einen Vorfall');

      const reasonInput = new TextInputBuilder()
        .setCustomId('reportReason')
        .setLabel('Grund der Meldung')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Beschreibe das Problem so genau wie möglich')
        .setRequired(true);

      const firstActionRow = new ActionRowBuilder().addComponents(reasonInput);
      modal.addComponents(firstActionRow);
      await interaction.showModal(modal);
    } catch (error) {
      console.error('Error showing report modal:', error);
      await interaction.reply({ content: 'Beim Öffnen des Meldeformulars ist ein Fehler aufgetreten.', ephemeral: true });
    }
  }
};
