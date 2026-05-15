const fs = require('node:fs');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior, getVoiceConnection } = require('@discordjs/voice');
const ytdl = require('ytdl-core');

function createResourceFromUrl(url) {
  if (!url) return null;
  if (url.startsWith('http')) {
    return createAudioResource(ytdl(url, { filter: 'audioonly', highWaterMark: 1 << 25 }));
  }
  if (fs.existsSync(url)) {
    return createAudioResource(fs.createReadStream(url));
  }
  return null;
}

async function startWaitingRoomMusic(client, channel) {
  if (!channel) return null;
  const musicUrl = process.env.WAITING_ROOM_MUSIC_URL;
  if (!musicUrl) return null;

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator
  });

  const player = client.waitingRoom.player || createAudioPlayer({
    behaviors: { noSubscriber: NoSubscriberBehavior.Pause }
  });

  const resource = createResourceFromUrl(musicUrl);
  if (!resource) {
    throw new Error('Could not create audio resource from WAITING_ROOM_MUSIC_URL');
  }

  player.play(resource);
  connection.subscribe(player);

  client.waitingRoom.connection = connection;
  client.waitingRoom.player = player;
  client.waitingRoom.resource = resource;

  player.on(AudioPlayerStatus.Idle, () => {
    // Keep connection alive until room empty, do not disconnect automatically when track ends.
  });

  return { connection, player };
}

function stopWaitingRoomMusic(client) {
  const connection = getVoiceConnection(process.env.GUILD_ID);
  if (connection) {
    connection.destroy();
  }
  if (client.waitingRoom.player) {
    client.waitingRoom.player.stop();
  }
  client.waitingRoom.connection = null;
  client.waitingRoom.player = null;
  client.waitingRoom.resource = null;
}

module.exports = {
  startWaitingRoomMusic,
  stopWaitingRoomMusic
};
