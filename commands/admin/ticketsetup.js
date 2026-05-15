const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { ADMIN_ROLE, isBotOwner, hasRole } = require('../../utils/permissions');
const { COLORS } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketsetup')
    .setDescription('Erstellt ein Ticket-Panel in einem Kanal')
    .addChannelOption((option) => option.setName('channel').setDescription('Kanal für das Ticket-Panel').setRequired(true)),
  async execute(interaction) {
    try {
      if (!isBotOwner(interaction.member) && !hasRole(interaction.member, ADMIN_ROLE)) {
        return await interaction.reply({ content: 'Du hast keine Berechtigung für diesen Befehl.', ephemeral: true });
      }

      const channel = interaction.options.getChannel('channel');
      const embed = new EmbedBuilder()
        .setTitle('Ticket eröffnen')
        .setDescription('Wähle eine Kategorie, um ein privates Ticket zu öffnen. Ein Teammitglied hilft dir gleich weiter.')
        .setColor(COLORS.info)
        .setTimestamp();

      const menu = new StringSelectMenuBuilder()
        .setCustomId('ticket_select')
        .setPlaceholder('Wähle eine Ticket-Kategorie')
        .addOptions([
          { label: 'Support', description: 'Allgemeine Support-Anfrage', value: 'support', emoji: '🛠️' },
          { label: 'Spieler melden', description: 'Verstoße gegen Regeln melden', value: 'report', emoji: '⚠️' },
          { label: 'Spendenproblem', description: 'Probleme mit Spenden klären', value: 'donation', emoji: '💰' },
          { label: 'Allgemeine Frage', description: 'Eine allgemeine Frage stellen', value: 'question', emoji: '❓' }
        ]);

      const row = new ActionRowBuilder().addComponents(menu);
      await channel.send({ embeds: [embed], components: [row] });
      await interaction.reply({ content: 'Ticket-Panel erfolgreich erstellt.', ephemeral: true });
    } catch (error) {
      console.error('Ticket setup failed:', error);
      await interaction.reply({ content: 'Ticket-Panel konnte nicht erstellt werden.', ephemeral: true });
    }
  }
};
