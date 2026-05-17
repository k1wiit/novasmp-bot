const { AttachmentBuilder } = require('discord.js');
const { createWelcomeCard } = require('../utils/welcomeCard');

module.exports = {
  name: 'guildMemberAdd',
  async execute(client, member) {
    try {
      if (!client.recentWelcomeSend) {
        client.recentWelcomeSend = new Map();
      }

      const lastSend = client.recentWelcomeSend.get(member.id);
      const now = Date.now();
      if (lastSend && now - lastSend < 30000) {
        return;
      }

      client.recentWelcomeSend.set(member.id, now);
      setTimeout(() => client.recentWelcomeSend.delete(member.id), 30000);

      const roleId = process.env.MEMBER_ROLE_ID;
      const roleName = process.env.MEMBER_ROLE || 'Member';
      let role = null;

      if (roleId) {
        role = await member.guild.roles.fetch(roleId).catch(() => null);
      } else {
        role = member.guild.roles.cache.find((roleItem) => roleItem.name === roleName);
        if (!role) {
          const roles = await member.guild.roles.fetch().catch(() => null);
          if (roles) {
            role = roles.find((roleItem) => roleItem.name === roleName);
          }
        }
      }

      if (role) {
        await member.roles.add(role).catch((error) => console.error('Failed to assign member role:', error));
      } else {
        console.warn(`guildMemberAdd: member role not found (${roleId || roleName}) on guild ${member.guild.id}`);
      }

      const welcomeChannel = client.channels.cache.get(process.env.WELCOME_CHANNEL_ID);
      if (!welcomeChannel) return;

      const buffer = await createWelcomeCard(member.user, member.guild.memberCount);
      const attachment = new AttachmentBuilder(buffer, { name: 'welcome.png' });
      await welcomeChannel.send({ files: [attachment] });
    } catch (error) {
      console.error('guildMemberAdd event failed:', error);
    }
  }
};
