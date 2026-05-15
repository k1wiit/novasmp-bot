const { COLORS } = require('../utils/embedBuilder');

module.exports = {
  name: 'messageCreate',
  async execute(client, message) {
    try {
      if (message.author.bot) return;
      const content = message.content.toLowerCase();
      if (!content.includes('ip') && !content.includes('ip adresse')) return;

      const serverIp = process.env.SERVER_IP || 'Nicht konfiguriert';
      const replyMethod = (process.env.IP_REPLY_METHOD || 'channel').toLowerCase();
      const response = `Server-IP: ${serverIp}`;
      const configuredIpChannel = process.env.IP_CHANNEL_ID ? client.channels.cache.get(process.env.IP_CHANNEL_ID) : null;

      if (replyMethod === 'dm') {
        await message.author.send(response).catch(async () => {
          await message.channel.send(response);
        });
        return;
      }

      if (configuredIpChannel) {
        await configuredIpChannel.send(response);
      } else {
        await message.channel.send(response);
      }
    } catch (error) {
      console.error('messageCreate event failed:', error);
    }
  }
};
