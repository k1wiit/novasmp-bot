const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { DEVELOPER_ROLE, isBotOwner, hasRole } = require('../../utils/permissions');
const { createWelcomeCard } = require('../../utils/welcomeCard');

async function safeReply(interaction, options) {
  if (interaction.replied || interaction.deferred) {
    return interaction.followUp(options);
  }
  return interaction.reply(options);
}

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
        return await safeReply(interaction, { content: 'Du hast keine Berechtigung für diesen Befehl.', flags: 64 });
      }

      const user = interaction.options.getUser('user');
      const welcomeChannel = interaction.client.channels.cache.get(process.env.WELCOME_CHANNEL_ID);
      if (!welcomeChannel) {
        return await safeReply(interaction, { content: 'Willkommenskanal nicht gefunden.', flags: 64 });
      }

      const buffer = await createWelcomeCard(user, interaction.guild.memberCount);
      const attachment = new AttachmentBuilder(buffer, { name: 'welcome.png' });
      await welcomeChannel.send({ content: `Willkommens-Vorschau für ${user}`, files: [attachment] });
      await safeReply(interaction, { content: 'Willkommenskarte erfolgreich gesendet.', flags: 64 });
    } catch (error) {
      console.error('Setwelcome command failed:', error);
      try {
        await safeReply(interaction, { content: 'Die Willkommenskarte konnte nicht gesendet werden.', flags: 64 });
      } catch (replyError) {
        console.error('Failed to reply to setwelcome interaction:', replyError);
      }
    }
  }
};
