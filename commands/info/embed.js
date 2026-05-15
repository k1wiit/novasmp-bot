const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { STAFF_ROLE, isBotOwner, hasRole } = require('../../utils/permissions');
const { COLORS } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Erstellt und sendet ein benutzerdefiniertes Embed')
    .addChannelOption((option) => option.setName('channel').setDescription('Kanal zum Senden des Embeds').setRequired(true))
    .addStringOption((option) => option.setName('title').setDescription('Embed-Titel').setRequired(true))
    .addStringOption((option) => option.setName('description').setDescription('Embed-Beschreibung').setRequired(true))
    .addStringOption((option) => option.setName('color').setDescription('Hex-Farbcode oder Name').setRequired(false))
    .addStringOption((option) => option.setName('footer').setDescription('Footer-Text').setRequired(false)),
  async execute(interaction) {
    try {
      if (!isBotOwner(interaction.member) && !hasRole(interaction.member, STAFF_ROLE)) {
        return await interaction.reply({ content: 'Du hast keine Berechtigung für diesen Befehl.', ephemeral: true });
      }

      const channel = interaction.options.getChannel('channel');
      const title = interaction.options.getString('title');
      const description = interaction.options.getString('description');
      const color = interaction.options.getString('color') || COLORS.info;
      const footer = interaction.options.getString('footer') || null;

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

      if (footer) embed.setFooter({ text: footer });
      await channel.send({ embeds: [embed] });
      await interaction.reply({ content: 'Embed erfolgreich gesendet.', ephemeral: true });
    } catch (error) {
      console.error('Embed command failed:', error);
      await interaction.reply({ content: 'Embed konnte nicht gesendet werden.', ephemeral: true });
    }
  }
};
