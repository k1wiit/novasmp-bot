const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { DEVELOPER_ROLE, isBotOwner, hasRole } = require('../../utils/permissions');
const { createWelcomeCard } = require('../../utils/welcomeCard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setwelcome')
    .setDescription('Sende eine Test-Willkommenskarte für einen Benutzer')
    .addUserOption((option) =>
      option.setName('user').setDescription('Benutzer zum Testen der Willkommenskarte').setRequired(true)
    ),
  async execute(interaction) {
    try {
      if (!isBotOwner(interaction.member) && !hasRole(interaction.member, DEVELOPER_ROLE)) {
        return await interaction.reply({ content: 'Du hast keine Berechtigung für diesen Befehl.', ephemeral: true });
      }

      const user = interaction.options.getUser('user');
      const welcomeChannel = interaction.client.channels.cache.get(process.env.WELCOME_CHANNEL_ID);
      if (!welcomeChannel) {
        return await interaction.reply({ content: 'Willkommenskanal nicht gefunden.', ephemeral: true });
      }

      const buffer = await createWelcomeCard(user, interaction.guild.memberCount);
      const attachment = new AttachmentBuilder(buffer, { name: 'welcome.png' });
      await welcomeChannel.send({ content: `Willkommens-Vorschau für ${user}`, files: [attachment] });
      await interaction.reply({ content: 'Willkommenskarte erfolgreich gesendet.', ephemeral: true });
    } catch (error) {
      console.error('Setwelcome command failed:', error);
      await interaction.reply({ content: 'Die Willkommenskarte konnte nicht gesendet werden.', ephemeral: true });
    }
  }
};
