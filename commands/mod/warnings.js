const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { MOD_ROLE, isBotOwner, hasRole } = require('../../utils/permissions');
const { COLORS } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Zeigt Verwarnungen für einen Benutzer an')
    .addUserOption((option) => option.setName('user').setDescription('Benutzer zum Anzeigen').setRequired(true)),
  async execute(interaction) {
    try {
      if (!isBotOwner(interaction.member) && !hasRole(interaction.member, MOD_ROLE)) {
        return await interaction.reply({ content: 'Du hast keine Berechtigung für diesen Befehl.', ephemeral: true });
      }

      const user = interaction.options.getUser('user');
      const warnings = interaction.client.warningStore.get(user.id);

      if (!warnings.length) {
        return await interaction.reply({ content: `${user.tag} hat keine Verwarnungen.`, ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle(`Verwarnungen von ${user.tag}`)
        .setColor(COLORS.warning)
        .setTimestamp();

      warnings.slice(-5).forEach((warn, index) => {
        embed.addFields({
          name: `Verwarnung ${warnings.length - index}`,
          value: `**Moderator:** ${warn.moderator}
**Grund:** ${warn.reason}
**Wann:** ${new Date(warn.timestamp).toLocaleString()}`,
          inline: false
        });
      });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Warnings command failed:', error);
      await interaction.reply({ content: 'Verwarnungen konnten nicht geladen werden.', ephemeral: true });
    }
  }
};
