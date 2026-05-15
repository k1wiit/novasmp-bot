const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../utils/embedBuilder');
const { startWaitingRoomMusic, stopWaitingRoomMusic } = require('../utils/music');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(client, oldState, newState) {
    try {
      const logChannel = client.channels.cache.get(process.env.LOG_CHANNEL_ID);
      const waitingRoomId = process.env.WAITING_ROOM_ID;
      const guildId = newState.guild.id;

      const now = Date.now();
      if (!oldState.channelId && newState.channelId) {
        client.voiceTimestamps.set(newState.id, now);
      }

      if (oldState.channelId && !newState.channelId) {
        const joinedAt = client.voiceTimestamps.get(oldState.id);
        if (joinedAt) {
          const durationMs = now - joinedAt;
          const durationSeconds = Math.floor(durationMs / 1000);
          const embed = new EmbedBuilder()
            .setTitle('Voice-Session beendet')
            .setColor(COLORS.voice)
            .addFields(
              { name: 'Benutzer', value: oldState.member.user.tag, inline: true },
              { name: 'Kanal', value: oldState.channel.name, inline: true },
              { name: 'Dauer', value: `${durationSeconds} Sekunden`, inline: false }
            )
            .setTimestamp();

          if (logChannel) await logChannel.send({ embeds: [embed] });
        }
        client.voiceTimestamps.delete(oldState.id);
      }

      if (oldState.channelId !== newState.channelId) {
        // Manage waiting room playback
        if (newState.channelId === waitingRoomId) {
          const targetChannel = newState.guild.channels.cache.get(waitingRoomId);
          if (targetChannel) {
            await startWaitingRoomMusic(client, targetChannel).catch((error) => console.error('Waiting room music start error:', error));
          }
        }

        if (oldState.channelId === waitingRoomId && newState.channelId !== waitingRoomId) {
          const voiceChannel = oldState.guild.channels.cache.get(waitingRoomId);
          if (voiceChannel) {
            const nonBotMembers = voiceChannel.members.filter((member) => !member.user.bot);
            if (nonBotMembers.size === 0) {
              stopWaitingRoomMusic(client);
            }
          }
        }
      }
    } catch (error) {
      console.error('voiceStateUpdate event failed:', error);
    }
  }
};
