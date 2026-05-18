const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const { createReadStream } = require('fs');
const path = require('path');

/**
 * Start playing waiting room music
 * @param {Client} client - The Discord client
 * @param {Channel} channel - The voice channel to join
 * @returns {Promise<boolean>} - Returns true if music started successfully
 */
async function startWaitingRoomMusic(client, channel) {
  try {
    // Check if already connected
    if (client.waitingRoom.connection && client.waitingRoom.connection.state.status !== VoiceConnectionStatus.Destroyed) {
      return true;
    }

    // Join the voice channel
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator
    });

    // Update client's waiting room connection
    client.waitingRoom.connection = connection;

    // Create audio player if not already created
    if (!client.waitingRoom.player) {
      client.waitingRoom.player = createAudioPlayer();

      // Handle player state changes
      client.waitingRoom.player.on(AudioPlayerStatus.Playing, () => {
        console.log('🎵 Waiting room music started');
      });

      client.waitingRoom.player.on(AudioPlayerStatus.Idle, () => {
        console.log('🎵 Waiting room music ended, restarting...');
        playWaitingMusic(client.waitingRoom.player);
      });

      client.waitingRoom.player.on('error', (error) => {
        console.error('Player error:', error.message);
      });
    }

    // Subscribe connection to player
    connection.subscribe(client.waitingRoom.player);

    // Handle connection state changes
    connection.on(VoiceConnectionStatus.Disconnected, () => {
      console.log('Voice connection disconnected');
    });

    connection.on(VoiceConnectionStatus.Destroyed, () => {
      console.log('Voice connection destroyed');
      client.waitingRoom.connection = null;
    });

    // Play the waiting room music
    playWaitingMusic(client.waitingRoom.player);

    return true;
  } catch (error) {
    console.error('Error starting waiting room music:', error);
    return false;
  }
}

/**
 * Stop playing waiting room music and leave the channel
 * @param {Client} client - The Discord client
 */
function stopWaitingRoomMusic(client) {
  try {
    if (client.waitingRoom.player) {
      client.waitingRoom.player.stop();
    }

    if (client.waitingRoom.connection) {
      client.waitingRoom.connection.destroy();
      client.waitingRoom.connection = null;
    }

    client.waitingRoom.resource = null;
    console.log('🛑 Waiting room music stopped and bot left channel');
  } catch (error) {
    console.error('Error stopping waiting room music:', error);
  }
}

/**
 * Play the waiting room music file
 * @param {AudioPlayer} player - The audio player instance
 */
function playWaitingMusic(player) {
  try {
    const musicPath = path.join(__dirname, '../assets/waiting.mp3');
    const stream = createReadStream(musicPath);
    const resource = createAudioResource(stream);

    player.play(resource);
  } catch (error) {
    console.error('Error playing waiting music:', error);
  }
}

module.exports = {
  startWaitingRoomMusic,
  stopWaitingRoomMusic
};
