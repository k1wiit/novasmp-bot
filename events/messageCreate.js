const { createEmbed, COLORS } = require('../utils/embedBuilder');

module.exports = {
  name: 'messageCreate',
  async execute(client, message) {
    try {
      if (message.author.bot) return;
      const content = message.content.toLowerCase();
      if (!content.includes('ip') && !content.includes('ip adresse')) return;

      const serverIp = process.env.SERVER_IP || 'Nicht konfiguriert';
      const configuredIpChannel = process.env.IP_CHANNEL_ID ? client.channels.cache.get(process.env.IP_CHANNEL_ID) : null;
      const description = serverIp === 'Nicht konfiguriert'
        ? '`Server-IP nicht konfiguriert`'
        : `\`${serverIp}\``;
      const extraLine = configuredIpChannel
        ? `
Für mehr Infos: ${configuredIpChannel}`
        : '';

      const embed = createEmbed({
        title: 'Server-IP',
        description: `${description}${extraLine}`,
        color: 0x0f0600,
      });

      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('messageCreate event failed:', error);
    }
  }
};
