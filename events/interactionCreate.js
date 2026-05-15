const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COLORS } = require('../utils/embedBuilder');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        return await command.execute(interaction);
      }

      if (interaction.isModalSubmit()) {
        if (!interaction.customId.startsWith('reportModal_')) return;

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
        await interaction.reply({ content: 'Deine Meldung wurde an das Team weitergeleitet.', ephemeral: true });
        return;
      }

      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
        const category = interaction.values[0];
        const existing = client.ticketStore.getOpen(interaction.user.id);
        if (existing) {
          return await interaction.reply({ content: 'Du hast bereits ein offenes Ticket.', ephemeral: true });
        }

        const ticketCategory = interaction.guild.channels.cache.get(process.env.TICKET_CATEGORY_ID);
        if (!ticketCategory) {
          return await interaction.reply({ content: 'Die Ticket-Kategorie ist nicht konfiguriert.', ephemeral: true });
        }

        const channel = await interaction.guild.channels.create({
          name: `ticket-${interaction.user.username}`.slice(0, 90),
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

        const reason = `Ticket-Kategorie: ${category}`;
        const embed = new EmbedBuilder()
          .setTitle('Ticket erstellt')
          .setDescription('Danke, dass du ein Ticket eröffnet hast. Ein Teammitglied ist gleich für dich da.')
          .addFields(
            { name: 'Anfragender', value: interaction.user.tag, inline: false },
            { name: 'Kategorie', value: category, inline: false }
          )
          .setColor(COLORS.info)
          .setTimestamp();

        const closeButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('close_ticket').setLabel('Ticket schließen').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [closeButton] });
        client.ticketStore.add({ userId: interaction.user.id, channelId: channel.id });
        return await interaction.reply({ content: `Ticket erstellt: ${channel}`, ephemeral: true });
      }

      if (interaction.isButton() && interaction.customId === 'close_ticket') {
        if (!interaction.channel) return;
        const ticketData = client.ticketStore.getOpen(interaction.user.id) || client.ticketStore.all().find((t) => t.channelId === interaction.channel.id);
        if (!ticketData) {
          return await interaction.reply({ content: 'Ticket-Metadaten nicht gefunden.', ephemeral: true });
        }

        const messages = await interaction.channel.messages.fetch({ limit: 100 });
        const transcript = messages
          .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
          .map((msg) => `[${new Date(msg.createdTimestamp).toLocaleString()}] ${msg.author.tag}: ${msg.content}`)
          .join('\n');

        const logChannel = client.channels.cache.get(process.env.TICKET_LOG_CHANNEL_ID);
        if (logChannel) {
          await logChannel.send({
            embeds: [
              new EmbedBuilder()
                .setTitle('Ticket geschlossen')
                .setDescription(`Ticket geschlossen von ${interaction.user.tag}`)
                .addFields({ name: 'Kanal', value: interaction.channel.name, inline: false })
                .setColor(COLORS.danger)
                .setTimestamp()
            ],
            content: `Transkript für Ticket <#${interaction.channel.id}>:\n\n${transcript.slice(0, 1900)}`
          });
        }

        client.ticketStore.remove(interaction.channel.id);
        await interaction.reply({ content: 'Ticket wurde geschlossen und protokolliert.', ephemeral: true });
        await interaction.channel.delete();
      }
    } catch (error) {
      console.error('interactionCreate event error:', error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'Beim Verarbeiten der Interaktion ist ein Fehler aufgetreten.', ephemeral: true });
      } else {
        await interaction.reply({ content: 'Beim Verarbeiten der Interaktion ist ein Fehler aufgetreten.', ephemeral: true });
      }
    }
  }
};
