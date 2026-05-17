const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { STAFF_ROLE, hasRole } = require('../utils/permissions');

const categoryNames = {
  bewerbung: 'Bewerbung',
  bugmeldung: 'Bug Meldung',
  fragen: 'Fragen',
  reporting: 'Reporting'
};

module.exports = {
  async handleTicketCommand(client, message) {
    if (!message.guild || !message.channel) return false;

    const args = message.content.slice(1).split(/\s+/);
    const command = args[0].toLowerCase();

    if (!['pause', 'resume', 'close'].includes(command)) return false;

    // Check if staff
    if (!hasRole(message.member, STAFF_ROLE)) {
      await message.reply({
        content: '❌ Nur Staff-Mitglieder können Ticket-Befehle verwenden.',
        flags: 64
      });
      return true;
    }

    const ticketData = client.ticketStore.getByChannelId(message.channel.id);
    if (!ticketData) {
      await message.reply({
        content: '❌ Dies ist kein Ticket-Kanal.',
        flags: 64
      });
      return true;
    }

    if (command === 'pause') {
      if (ticketData.isPaused) {
        return await message.reply({
          content: '⚠️ Dieses Ticket ist bereits pausiert.',
          flags: 64
        });
      }

      client.ticketStore.setPaused(message.channel.id, true);

      // Mute the user
      const ticketUser = await client.users.fetch(ticketData.userId).catch(() => null);
      if (ticketUser) {
        await message.channel.permissionOverwrites.edit(ticketData.userId, {
          SendMessages: false
        });
      }

      const pauseEmbed = new EmbedBuilder()
        .setTitle('⏸️ Ticket pausiert')
        .setDescription('Dieses Ticket wurde gestoppt und wird demnächst weiter geführt.')
        .setColor(0xffa500)
        .setTimestamp();

      await message.reply({
        embeds: [pauseEmbed]
      });

      client.ticketStore.addLog(message.channel.id, 'PAUSED', message.author.tag);
      return true;
    }

    if (command === 'resume') {
      if (!ticketData.isPaused) {
        return await message.reply({
          content: '⚠️ Dieses Ticket ist nicht pausiert.',
          flags: 64
        });
      }

      client.ticketStore.setPaused(message.channel.id, false);

      // Unmute the user
      const ticketUser = await client.users.fetch(ticketData.userId).catch(() => null);
      if (ticketUser) {
        await message.channel.permissionOverwrites.edit(ticketData.userId, {
          SendMessages: true
        });
      }

      const resumeEmbed = new EmbedBuilder()
        .setTitle('▶️ Ticket fortgesetzt')
        .setDescription('Das Ticket wurde fortgesetzt. Du kannst wieder schreiben.')
        .setColor(0x00ff00)
        .setTimestamp();

      await message.reply({
        embeds: [resumeEmbed]
      });

      client.ticketStore.addLog(message.channel.id, 'RESUMED', message.author.tag);
      return true;
    }

    if (command === 'close') {
      const ticketUser = await client.users.fetch(ticketData.userId).catch(() => null);

      // Fetch messages for transcript
      const messages = await message.channel.messages.fetch({ limit: 100 });
      const transcript = messages
        .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
        .map((msg) => `[${new Date(msg.createdTimestamp).toLocaleString('de-DE')}] ${msg.author.tag}: ${msg.content}`)
        .join('\n');

      // Create log embed
      const logChannel = client.channels.cache.get(process.env.TICKET_LOG_CHANNEL_ID);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle('📋 Ticket geschlossen')
          .setColor(0xff6b6b)
          .addFields(
            { name: 'Benutzer', value: ticketUser?.tag || 'Unbekannt', inline: true },
            { name: 'Kategorie', value: categoryNames[ticketData.category] || ticketData.category || 'N/A', inline: true },
            { name: 'Geschlossen von', value: message.author.tag, inline: true },
            { name: 'Kanal', value: `#${message.channel.name}`, inline: true },
            { name: 'Grund des Tickets', value: ticketData.reason || 'Keine Beschreibung', inline: false },
            { name: 'Erstellt am', value: new Date(ticketData.createdAt).toLocaleString('de-DE'), inline: true },
            { name: 'Geschlossen am', value: new Date().toLocaleString('de-DE'), inline: true },
            { name: 'Aktionen', value: `${ticketData.logs?.length || 0} Einträge`, inline: true }
          )
          .setTimestamp();

        // Add log details
        if (ticketData.logs && ticketData.logs.length > 0) {
          const logSummary = ticketData.logs
            .slice(-5)
            .map((log) => `• [${log.action}] ${log.actor} ${log.details ? `- ${log.details}` : ''} - ${new Date(log.timestamp).toLocaleTimeString('de-DE')}`)
            .join('\n');
          logEmbed.addFields({ name: 'Letzte Aktionen', value: logSummary || 'Keine Aktionen', inline: false });
        }

        await logChannel.send({
          embeds: [logEmbed],
          content: transcript.length > 0 ? `\`\`\`\n${transcript.slice(0, 2000)}\n${transcript.length > 2000 ? '... (gekürzt)' : ''}\n\`\`\`` : '(Keine Nachrichten)'
        });
      }

      client.ticketStore.close(message.channel.id, message.author.tag);

      const closeEmbed = new EmbedBuilder()
        .setTitle('✅ Ticket geschlossen')
        .setDescription('Danke für die Nutzung unseres Ticket-Systems. Der Kanal wird in 5 Sekunden gelöscht.')
        .setColor(0x00ff00)
        .setTimestamp();

      await message.reply({
        embeds: [closeEmbed]
      });

      // Delete channel after 5 seconds
      setTimeout(async () => {
        if (message.channel.deletable) {
          await message.channel.delete().catch(() => null);
        }
      }, 5000);

      return true;
    }

    return false;
  }
};
