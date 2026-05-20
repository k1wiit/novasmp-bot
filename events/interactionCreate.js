const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionsBitField } = require('discord.js');
const { COLORS } = require('../utils/embedBuilder');
const { info, error } = require('../utils/logger');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        const subcommand = interaction.options.getSubcommand?.() || 'none';
        info('Interaction command', `${interaction.commandName} sub=${subcommand} user=${interaction.user.tag} guild=${interaction.guild?.name || 'DM'}`);
        const command = client.commands.get(interaction.commandName);
        if (!command) {
          error('Command handler not found', interaction.commandName);
          return;
        }
        return await command.execute(interaction);
      }

      if (interaction.isModalSubmit()) {
        // Report modal
        if (interaction.customId.startsWith('reportModal_')) {
          const targetId = interaction.customId.replace('reportModal_', '');
          const reason = interaction.fields.getTextInputValue('reportReason');
          const targetUser = await client.users.fetch(targetId);
          const staffChannel = client.channels.cache.get(process.env.STAFF_CHANNEL_ID);
          const embed = new EmbedBuilder()
            .setTitle('Neue Meldung')
            .setColor(COLORS.warning)
            .addFields(
              { name: 'Meldender', value: interaction.user.tag, inline: false },
              { name: 'Ziel', value: `${targetUser.tag} (${targetUser.id})`, inline: false },
              { name: 'Grund', value: reason, inline: false }
            )
            .setTimestamp();

          if (staffChannel) await staffChannel.send({ embeds: [embed] });
          await interaction.reply({ content: 'Deine Meldung wurde an das Team weitergeleitet.', flags: 64 });
          return;
        }

        // VC rename modal
        if (interaction.customId.startsWith('vc_rename_modal_')) {
          const vcId = interaction.customId.replace('vc_rename_modal_', '');
          const newName = interaction.fields.getTextInputValue('vcNewName');
          const meta = client.tempVoiceChannels.get(vcId);
          if (!meta) return await interaction.reply({ content: 'Metadaten nicht gefunden.', flags: 64 });
          if (interaction.user.id !== meta.ownerId) return await interaction.reply({ content: 'Nur der Ersteller kann diese Aktion ausführen.', flags: 64 });
          try {
            const voiceCh = await interaction.guild.channels.fetch(meta.voiceChannelId);
            if (voiceCh) await voiceCh.setName(newName.slice(0, 90));
            return await interaction.reply({ content: `Kanal umbenannt zu: ${newName}`, flags: 64 });
          } catch (e) {
            return await interaction.reply({ content: 'Umbenennen fehlgeschlagen.', flags: 64 });
          }
        }

        // VC limit modal
        if (interaction.customId.startsWith('vc_limit_modal_')) {
          const vcId = interaction.customId.replace('vc_limit_modal_', '');
          const limitStr = interaction.fields.getTextInputValue('vcLimit');
          const limit = parseInt(limitStr, 10) || 0;
          const meta = client.tempVoiceChannels.get(vcId);
          if (!meta) return await interaction.reply({ content: 'Metadaten nicht gefunden.', flags: 64 });
          if (interaction.user.id !== meta.ownerId) return await interaction.reply({ content: 'Nur der Ersteller kann diese Aktion ausführen.', flags: 64 });
          try {
            const voiceCh = await interaction.guild.channels.fetch(meta.voiceChannelId);
            if (voiceCh) await voiceCh.setUserLimit(limit);
            return await interaction.reply({ content: `Limit gesetzt: ${limit === 0 ? 'unbegrenzt' : limit}`, flags: 64 });
          } catch (e) {
            return await interaction.reply({ content: 'Setzen des Limits fehlgeschlagen.', flags: 64 });
          }
        }

        // Ticket reason modal
        if (interaction.customId.startsWith('ticket_reason_')) {
          const category = interaction.customId.replace('ticket_reason_', '');
          const reason = interaction.fields.getTextInputValue('ticketReason');

          const ticketCategory = interaction.guild.channels.cache.get(process.env.TICKET_CATEGORY_ID);
          if (!ticketCategory) {
            return await interaction.reply({ content: 'Die Ticket-Kategorie ist nicht konfiguriert.', flags: 64 });
          }

          // Create ticket channel with category + username
          const ticketName = `${category}-${interaction.user.username}`.slice(0, 90).toLowerCase();
          const channel = await interaction.guild.channels.create({
            name: ticketName,
            type: 0,
            parent: ticketCategory.id,
            permissionOverwrites: [
              {
                id: interaction.guild.roles.everyone,
                deny: ['ViewChannel']
              },
              {
                id: interaction.user.id,
                allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
              }
            ]
          });

          const staffRole = interaction.guild.roles.cache.find(
            (role) => role.id === process.env.STAFF_ROLE || role.name === process.env.STAFF_ROLE || role.name === 'Staff'
          );
          if (staffRole) {
            await channel.permissionOverwrites.edit(staffRole, {
              ViewChannel: true,
              SendMessages: true,
              ReadMessageHistory: true
            });
          }

          const embed = new EmbedBuilder()
            .setTitle('✅ Ticket erstellt')
            .setDescription('Danke, dass du ein Ticket eröffnet hast. Ein Teammitglied hilft dir gleich weiter.')
            .addFields(
              { name: 'Benutzer', value: interaction.user.tag, inline: true },
              { name: 'Kategorie', value: category.charAt(0).toUpperCase() + category.slice(1), inline: true },
              { name: 'Grund', value: reason, inline: false }
            )
            .setColor(0x00ff00)
            .setTimestamp();

          const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('close_ticket').setLabel('Ticket schließen').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('pause_ticket').setLabel('⏸️ Pausieren').setStyle(ButtonStyle.Secondary)
          );

          await channel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [buttons] });
          client.ticketStore.add({
            userId: interaction.user.id,
            channelId: channel.id,
            category: category,
            reason: reason
          });
          client.ticketStore.addLog(channel.id, 'CREATED', interaction.user.tag, `Category: ${category}`);

          return await interaction.reply({ content: `✅ Ticket erstellt: ${channel}`, flags: 64 });
        }

        return;
      }

      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
        const category = interaction.values[0];
        const existing = client.ticketStore.getOpen(interaction.user.id);
        if (existing) {
          return await interaction.reply({ content: 'Du hast bereits ein offenes Ticket.', flags: 64 });
        }

        // Show modal for ticket reason
        const modal = new ModalBuilder()
          .setCustomId(`ticket_reason_${category}`)
          .setTitle(`Ticket: ${category.charAt(0).toUpperCase() + category.slice(1)}`);

        const reasonInput = new TextInputBuilder()
          .setCustomId('ticketReason')
          .setLabel('Beschreibe dein Anliegen')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Bitte erklären Sie ausführlich, was das Problem ist...')
          .setMinLength(10)
          .setMaxLength(1024)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        await interaction.showModal(modal);
        return;
      }

      if (interaction.isButton() && interaction.customId === 'close_ticket') {
        if (!interaction.channel) return;
        const ticketData = client.ticketStore.getByChannelId(interaction.channel.id);
        if (!ticketData) {
          return await interaction.reply({ content: 'Ticket-Metadaten nicht gefunden.', flags: 64 });
        }

        const messages = await interaction.channel.messages.fetch({ limit: 100 });
        const transcript = messages
          .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
          .map((msg) => `[${new Date(msg.createdTimestamp).toLocaleString('de-DE')}] ${msg.author.tag}: ${msg.content}`)
          .join('\n');

        // Get user info
        const ticketUser = await client.users.fetch(ticketData.userId).catch(() => null);

        const logChannel = client.channels.cache.get(process.env.TICKET_LOG_CHANNEL_ID);
        if (logChannel) {
          const embed = new EmbedBuilder()
            .setTitle('📋 Ticket geschlossen')
            .setColor(0xff6b6b)
            .addFields(
              { name: 'Benutzer', value: ticketUser?.tag || 'Unbekannt', inline: true },
              { name: 'Kategorie', value: ticketData.category || 'N/A', inline: true },
              { name: 'Geschlossen von', value: interaction.user.tag, inline: true },
              { name: 'Kanal', value: `#${interaction.channel.name}`, inline: true },
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
              .map((log) => `• [${log.action}] ${log.actor} - ${new Date(log.timestamp).toLocaleTimeString('de-DE')}`)
              .join('\n');
            embed.addFields({ name: 'Letzte Aktionen', value: logSummary || 'Keine Aktionen', inline: false });
          }

          await logChannel.send({
            embeds: [embed],
            content: transcript.length > 0 ? `\`\`\`\n${transcript.slice(0, 2000)}\n${transcript.length > 2000 ? '... (gekürzt)' : ''}\n\`\`\`` : '(Keine Nachrichten)'
          });
        }

        client.ticketStore.close(interaction.channel.id, interaction.user.tag);
        await interaction.reply({ content: '✅ Ticket wurde geschlossen und protokolliert.', flags: 64 });
        
        // Delete channel after 5 seconds
        setTimeout(async () => {
          if (interaction.channel?.deletable) {
            await interaction.channel.delete().catch(() => null);
          }
        }, 5000);
      }

      if (interaction.isButton() && interaction.customId === 'pause_ticket') {
        if (!interaction.channel) return;
        const ticketData = client.ticketStore.getByChannelId(interaction.channel.id);
        if (!ticketData) {
          return await interaction.reply({ content: 'Ticket-Metadaten nicht gefunden.', flags: 64 });
        }

        const isPaused = !ticketData.isPaused;
        client.ticketStore.setPaused(interaction.channel.id, isPaused);

        if (isPaused) {
          // Pause the ticket
          const ticketUser = await client.users.fetch(ticketData.userId).catch(() => null);
          if (ticketUser) {
            await interaction.channel.permissionOverwrites.edit(ticketData.userId, {
              SendMessages: false
            });
          }

          const pauseEmbed = new EmbedBuilder()
            .setTitle('⏸️ Ticket pausiert')
            .setDescription('Dieses Ticket wurde gestoppt und wird demnächst weiter geführt.')
            .setColor(0xffa500)
            .setTimestamp();

          await interaction.channel.send({ embeds: [pauseEmbed] });
          await interaction.reply({ content: '⏸️ Ticket wurde pausiert. Der Benutzer kann nicht mehr schreiben.', flags: 64 });
        } else {
          // Resume the ticket
          const ticketUser = await client.users.fetch(ticketData.userId).catch(() => null);
          if (ticketUser) {
            await interaction.channel.permissionOverwrites.edit(ticketData.userId, {
              SendMessages: true
            });
          }

          const resumeEmbed = new EmbedBuilder()
            .setTitle('▶️ Ticket fortgesetzt')
            .setDescription('Das Ticket wurde fortgesetzt. Du kannst wieder schreiben.')
            .setColor(0x00ff00)
            .setTimestamp();

          await interaction.channel.send({ embeds: [resumeEmbed] });
          await interaction.reply({ content: '▶️ Ticket wurde fortgesetzt. Der Benutzer kann wieder schreiben.', flags: 64 });
        }
      }

      // Voice channel dashboard interactions
      if (interaction.isStringSelectMenu() && interaction.customId.startsWith('vc_select_')) {
        const vcId = interaction.customId.replace('vc_select_', '');
        const selected = interaction.values[0];
        interaction.client.tempVCSelection.set(vcId, selected);
        return await interaction.reply({ content: `Ausgewählt: <@${selected}>`, flags: 64 });
      }

      // Rename button -> show modal
      if (interaction.isButton() && interaction.customId.startsWith('vc_rename_')) {
        const vcId = interaction.customId.replace('vc_rename_', '');
        const meta = interaction.client.tempVoiceChannels.get(vcId);
        if (!meta) return await interaction.reply({ content: 'Metadaten nicht gefunden.', flags: 64 });
        if (interaction.user.id !== meta.ownerId) return await interaction.reply({ content: 'Nur der Ersteller kann diese Aktion ausführen.', flags: 64 });
        const modal = new ModalBuilder().setCustomId(`vc_rename_modal_${vcId}`).setTitle('Channel umbenennen');
        const input = new TextInputBuilder().setCustomId('vcNewName').setLabel('Neuer Name').setStyle(TextInputStyle.Short).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
        return;
      }

      // Toggle open/close
      if (interaction.isButton() && interaction.customId.startsWith('vc_status_')) {
        const vcId = interaction.customId.replace('vc_status_', '');
        const meta = interaction.client.tempVoiceChannels.get(vcId);
        if (!meta) return await interaction.reply({ content: 'Metadaten nicht gefunden.', flags: 64 });
        if (interaction.user.id !== meta.ownerId) return await interaction.reply({ content: 'Nur der Ersteller kann diese Aktion ausführen.', flags: 64 });
        try {
          const voiceCh = await interaction.guild.channels.fetch(meta.voiceChannelId);
          const everyone = interaction.guild.roles.everyone;
          const canConnect = voiceCh.permissionsFor(everyone).has(PermissionsBitField.Flags.Connect);
          if (canConnect) {
            await voiceCh.permissionOverwrites.edit(everyone, { Connect: false });
            return await interaction.reply({ content: 'Kanal wurde geschlossen (Nur Besitzer können beitreten).', flags: 64 });
          } else {
            await voiceCh.permissionOverwrites.edit(everyone, { Connect: true });
            return await interaction.reply({ content: 'Kanal wurde geöffnet.', flags: 64 });
          }
        } catch (e) {
          return await interaction.reply({ content: 'Status-Änderung fehlgeschlagen.', flags: 64 });
        }
      }

      // Set limit -> show modal
      if (interaction.isButton() && interaction.customId.startsWith('vc_limit_')) {
        const vcId = interaction.customId.replace('vc_limit_', '');
        const meta = interaction.client.tempVoiceChannels.get(vcId);
        if (!meta) return await interaction.reply({ content: 'Metadaten nicht gefunden.', flags: 64 });
        if (interaction.user.id !== meta.ownerId) return await interaction.reply({ content: 'Nur der Ersteller kann diese Aktion ausführen.', flags: 64 });
        const modal = new ModalBuilder().setCustomId(`vc_limit_modal_${vcId}`).setTitle('Limit setzen');
        const input = new TextInputBuilder().setCustomId('vcLimit').setLabel('Maximale Teilnehmer (0 für unbegrenzt)').setStyle(TextInputStyle.Short).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
        return;
      }

      // Kick member from voice channel
      if (interaction.isButton() && interaction.customId.startsWith('vc_kick_')) {
        const vcId = interaction.customId.replace('vc_kick_', '');
        const meta = interaction.client.tempVoiceChannels.get(vcId);
        if (!meta) return await interaction.reply({ content: 'Metadaten nicht gefunden.', flags: 64 });
        if (interaction.user.id !== meta.ownerId) return await interaction.reply({ content: 'Nur der Ersteller kann diese Aktion ausführen.', flags: 64 });
        const targetId = interaction.client.tempVCSelection.get(vcId);
        if (!targetId) return await interaction.reply({ content: 'Bitte zuerst ein Mitglied auswählen.', flags: 64 });
        try {
          const member = await interaction.guild.members.fetch(targetId);
          await member.voice.setChannel(null).catch(() => null);
          return await interaction.reply({ content: `Mitglied gekickt: <@${targetId}>`, flags: 64 });
        } catch (e) {
          return await interaction.reply({ content: 'Kick fehlgeschlagen.', flags: 64 });
        }
      }

      // Close channel
      if (interaction.isButton() && interaction.customId.startsWith('vc_close_')) {
        const vcId = interaction.customId.replace('vc_close_', '');
        const meta = interaction.client.tempVoiceChannels.get(vcId);
        if (!meta) return await interaction.reply({ content: 'Metadaten nicht gefunden.', flags: 64 });
        if (interaction.user.id !== meta.ownerId) return await interaction.reply({ content: 'Nur der Ersteller kann diese Aktion ausführen.', flags: 64 });
        try {
          await interaction.reply({ content: 'Kanal wird geschlossen und gelöscht.', flags: 64 });
          const t = await interaction.guild.channels.fetch(meta.textChannelId).catch(() => null);
          const v = await interaction.guild.channels.fetch(meta.voiceChannelId).catch(() => null);
          if (t) await t.delete().catch(() => null);
          if (v) await v.delete().catch(() => null);
          interaction.client.tempVoiceChannels.delete(vcId);
          return;
        } catch (e) {
          return await interaction.reply({ content: 'Schließen fehlgeschlagen.', flags: 64 });
        }
      }
    } catch (error) {
      console.error('interactionCreate event error:', error);
      const errorReply = { content: 'Beim Verarbeiten der Interaktion ist ein Fehler aufgetreten.', flags: 64 };
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorReply);
        } else {
          await interaction.reply(errorReply);
        }
      } catch (replyError) {
        console.error('Failed to send interaction error response:', replyError);
      }
    }
  }
};
