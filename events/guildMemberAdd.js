const { AttachmentBuilder } = require('discord.js');
const { createWelcomeCard } = require('../utils/welcomeCard');
const { COLORS } = require('../utils/embedBuilder');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'guildMemberAdd',
  async execute(client, member) {
    try {
      const roleName = process.env.MEMBER_ROLE || 'Member';
      const role = member.guild.roles.cache.find((roleItem) => roleItem.name === roleName);
      if (role) await member.roles.add(role).catch(() => null);

      const welcomeChannel = client.channels.cache.get(process.env.WELCOME_CHANNEL_ID);
      if (!welcomeChannel) return;

      const buffer = await createWelcomeCard(member.user, member.guild.memberCount);
      const attachment = new AttachmentBuilder(buffer, { name: 'welcome.png' });
      const embed = new EmbedBuilder()
        .setTitle(`Willkommen ${member.user.username}!`)
        .setDescription('Schön, dass du da bist. Viel Spaß auf dem Server!')
        .setColor(COLORS.success)
        .setTimestamp();

      await welcomeChannel.send({ embeds: [embed], files: [attachment] });
    } catch (error) {
      console.error('guildMemberAdd event failed:', error);
    }
  }
};
