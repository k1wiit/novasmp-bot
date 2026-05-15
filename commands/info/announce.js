const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { STAFF_ROLE, isBotOwner, hasRole } = require('../../utils/permissions');
const { COLORS } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Sende eine formatierte Ankündigung in einen Kanal')
    .addChannelOption((option) => option.setName('channel').setDescription('Kanal für die Ankündigung').setRequired(true))
    .addStringOption((option) => option.setName('title').setDescription('Titel der Ankündigung').setRequired(true))
    .addStringOption((option) => option.setName('message').setDescription('Nachricht der Ankündigung').setRequired(true)),
  async execute(interaction) {
    try {
      if (!isBotOwner(interaction.member) && !hasRole(interaction.member, STAFF_ROLE)) {
        return await interaction.reply({ content: 'Du hast keine Berechtigung für diesen Befehl.', ephemeral: true });
      }

      const channel = interaction.options.getChannel('channel');
      const title = interaction.options.getString('title');
      const message = interaction.options.getString('message');
      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(message)
        .setColor(COLORS.info)
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      await interaction.reply({ content: 'Ankündigung erfolgreich gesendet.', ephemeral: true });
    } catch (error) {
      console.error('Announce command failed:', error);
      await interaction.reply({ content: 'Ankündigung konnte nicht gesendet werden.', ephemeral: true });
    }
  }
};
