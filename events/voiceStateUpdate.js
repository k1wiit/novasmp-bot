const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
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
        // Handle creating temporary voice channels when joining the VC lobby
        const createVcLobbyId = process.env.CREATE_VC_CHANNEL_ID;
        const tempEntry = client.tempVoiceChannels;
        // User joined the lobby channel -> create a new VC and dashboard
        if (!oldState.channelId && newState.channelId === createVcLobbyId) {
          const member = newState.member;
          const guild = newState.guild;
          const categoryId = process.env.VC_CATEGORY_ID || null;

          // create voice channel
          const voiceChannel = await guild.channels.create({
            name: `${member.displayName}'s Channel`.slice(0, 90),
            type: 2,
            parent: categoryId
          });

          const dashboardName = `${member.user.username} Dashboard`.slice(0, 90);
          const legacyNames = [
            `vc-${member.user.username}`.slice(0, 90),
            `${member.user.username}-dashboard`.slice(0, 90),
            `${member.displayName} Dashboard`.slice(0, 90),
            `${member.displayName}'s Channel`.slice(0, 90)
          ];
          const usernameLower = member.user.username.toLowerCase();

          for (const oldChannel of guild.channels.cache.values()) {
            if (oldChannel.type !== 0 || oldChannel.parentId !== categoryId) continue;
            const oldName = oldChannel.name.toLowerCase();
            if (
              oldChannel.name === dashboardName ||
              legacyNames.includes(oldChannel.name) ||
              (oldName.includes(usernameLower) && /dashboard|vc-|channel/.test(oldName))
            ) {
              await oldChannel.delete().catch(() => null);
            }
          }

          let textChannel = guild.channels.cache.find((ch) =>
            ch.type === 0 &&
            ch.parentId === categoryId &&
            ch.name === dashboardName
          );

          if (!textChannel) {
            textChannel = await guild.channels.create({
              name: dashboardName,
              type: 0,
              parent: categoryId,
              permissionOverwrites: [
                { id: guild.roles.everyone, deny: ['ViewChannel'] },
                { id: member.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] }
              ]
            });
          } else {
            await textChannel.permissionOverwrites.edit(member.id, {
              ViewChannel: true,
              SendMessages: true,
              ReadMessageHistory: true
            }).catch(() => null);
          }

          // send German dashboard message with controls: Umbenennen, Status (Öffnen/Schließen), Limit setzen, Schließen und Kick
          const embed = new EmbedBuilder()
            .setTitle('Voice-Channel Steuerung')
            .setDescription('Benutze die folgenden Knöpfe, um deinen Sprachkanal zu verwalten.')
            .setColor(COLORS.info)
            .addFields({ name: 'Ersteller', value: member.user.tag, inline: true })
            .setTimestamp();

          const select = new StringSelectMenuBuilder()
            .setCustomId(`vc_select_${voiceChannel.id}`)
            .setPlaceholder('Wähle ein Mitglied')
            .addOptions([{ label: member.user.tag, value: member.id }]);

          const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`vc_rename_${voiceChannel.id}`).setLabel('Umbenennen').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`vc_status_${voiceChannel.id}`).setLabel('Öffnen/Schließen').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`vc_limit_${voiceChannel.id}`).setLabel('Limit setzen').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`vc_kick_${voiceChannel.id}`).setLabel('Kick').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(`vc_close_${voiceChannel.id}`).setLabel('Schließen').setStyle(ButtonStyle.Danger)
          );

          await textChannel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(select), buttons] });

          // store metadata
          tempEntry.set(voiceChannel.id, {
            ownerId: member.id,
            voiceChannelId: voiceChannel.id,
            textChannelId: textChannel.id,
            deleteTimeout: null
          });

          // move member to new voice channel
          await member.voice.setChannel(voiceChannel.id).catch(() => null);
        }

        // If someone left a temp voice channel, schedule deletion if empty
        if (oldState.channelId) {
          const meta = tempEntry.get(oldState.channelId);
          if (meta) {
            const voiceCh = oldState.guild.channels.cache.get(oldState.channelId);
            if (voiceCh) {
              const nonBot = voiceCh.members.filter((m) => !m.user.bot);
              if (nonBot.size === 0) {
                if (meta.deleteTimeout) clearTimeout(meta.deleteTimeout);
                meta.deleteTimeout = setTimeout(async () => {
                  try {
                    const t = await oldState.guild.channels.fetch(meta.textChannelId).catch(() => null);
                    const v = await oldState.guild.channels.fetch(meta.voiceChannelId).catch(() => null);
                    if (t) await t.delete().catch(() => null);
                    if (v) await v.delete().catch(() => null);
                  } catch (e) {}
                  client.tempVoiceChannels.delete(oldState.channelId);
                }, 5000);
              }
            }
          }
        }

        // If someone joined a temp voice channel, cancel scheduled deletion and update dashboard select options
        if (newState.channelId) {
          const meta = tempEntry.get(newState.channelId);
          if (meta) {
            // cancel deletion if scheduled
            if (meta.deleteTimeout) {
              clearTimeout(meta.deleteTimeout);
              meta.deleteTimeout = null;
            }

            // update dashboard select options with current members
            try {
              const textCh = await newState.guild.channels.fetch(meta.textChannelId).catch(() => null);
              if (textCh) {
                const voiceCh = await newState.guild.channels.fetch(meta.voiceChannelId).catch(() => null);
                if (voiceCh) {
                  const options = voiceCh.members
                    .filter((m) => !m.user.bot)
                    .map((m) => ({ label: m.user.tag, value: m.id }))
                    .slice(0, 25);
                  const msg = (await textCh.messages.fetch({ limit: 10 })).find((m) => m.author.id === client.user.id && m.components.length > 0);
                  if (msg) {
                    const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`vc_select_${voiceCh.id}`).setPlaceholder('Wähle ein Mitglied').addOptions(options));
                    const buttonRow = msg.components[1] || msg.components[0];
                    await msg.edit({ components: [row, buttonRow] }).catch(() => null);
                  }
                }
              }
            } catch (e) {}
          }
        }

        // Manage waiting room playback
        if (newState.channelId === waitingRoomId && !oldState.channelId) {
          // Someone just joined the waiting room (not a channel switch)
          const targetChannel = newState.guild.channels.cache.get(waitingRoomId);
          if (targetChannel) {
            const nonBotMembers = targetChannel.members.filter((member) => !member.user.bot);
            // Start music only if this is the first person joining (count is now 1 after this join)
            if (nonBotMembers.size === 1) {
              await startWaitingRoomMusic(client, targetChannel).catch((error) => console.error('Waiting room music start error:', error));
            }
          }
        }

        if (oldState.channelId === waitingRoomId && newState.channelId !== waitingRoomId) {
          // Someone just left the waiting room
          const voiceChannel = oldState.guild.channels.cache.get(waitingRoomId);
          if (voiceChannel) {
            const nonBotMembers = voiceChannel.members.filter((member) => !member.user.bot);
            // Stop music if waiting room is now empty
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
