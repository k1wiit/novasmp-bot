const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { MOD_ROLE, isBotOwner, hasRole } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Vergibt eine Verwarnung und protokolliert sie')
    .addUserOption((option) => option.setName('user').setDescription('Benutzer, der verwarnt werden soll').setRequired(true))
    .addStringOption((option) => option.setName('reason').setDescription('Grund für die Verwarnung').setRequired(true)),
  async execute(interaction) {
    try {
      if (!isBotOwner(interaction.member) && !hasRole(interaction.member, MOD_ROLE)) {
        return await interaction.reply({ content: 'Du hast keine Berechtigung für diesen Befehl.', ephemeral: true });
      }

      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');
      interaction.client.warningStore.add(user.id, {
        moderator: interaction.user.tag,
        reason,
        timestamp: new Date().toISOString()
      });

      const embed = new EmbedBuilder()
        .setTitle('Benutzer verwarnt')
        .setColor(0xffd264)
        .addFields(
          { name: 'Benutzer', value: `${user.tag} (${user.id})`, inline: false },
          { name: 'Moderator', value: interaction.user.tag, inline: false },
          { name: 'Grund', value: reason, inline: false }
        )
        .setTimestamp();

      const logChannel = interaction.client.channels.cache.get(process.env.LOG_CHANNEL_ID);
      if (logChannel) await logChannel.send({ embeds: [embed] });
      await user.send({ content: `Du hast eine Verwarnung erhalten für: ${reason}` }).catch(() => null);
      await interaction.reply({ content: `Der Benutzer ${user.tag} wurde erfolgreich verwarnt.`, ephemeral: true });
    } catch (error) {
      console.error('Warn command failed:', error);
      await interaction.reply({ content: 'Der Benutzer konnte nicht verwarnt werden.', ephemeral: true });
    }
  }
};
