const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { ADMIN_ROLE, isBotOwner, hasRole } = require('../utils/permissions');
const { COLORS } = require('../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Administration commands grouped')
    .addSubcommand((s) => s.setName('delete').setDescription('Löscht mehrere Nachrichten in diesem Kanal').addIntegerOption((o) => o.setName('amount').setDescription('Anzahl der zu löschenden Nachrichten (1-100)').setRequired(true)))
    .addSubcommand((s) => s.setName('lock').setDescription('Sperrt diesen Kanal für Mitglieder'))
    .addSubcommand((s) => s.setName('unlock').setDescription('Entsperrt diesen Kanal für Mitglieder'))
    .addSubcommand((s) => s.setName('slowmode').setDescription('Setzt den Slowmode für diesen Kanal').addIntegerOption((o) => o.setName('seconds').setDescription('Slowmode-Dauer in Sekunden').setRequired(true)))
    .addSubcommand((s) => s.setName('ticketsetup').setDescription('Erstellt ein Ticket-Panel in einem Kanal').addChannelOption((o) => o.setName('channel').setDescription('Kanal für das Ticket-Panel').setRequired(true))),

  async execute(interaction) {
    try {
      if (!isBotOwner(interaction.member) && !hasRole(interaction.member, ADMIN_ROLE)) {
        return await interaction.reply({ content: 'Du hast keine Berechtigung für diesen Befehl.', ephemeral: true });
      }

      const sub = interaction.options.getSubcommand();

      // Pre-read common options so they're available as variables
      const amount = interaction.options.getInteger('amount');
      const seconds = interaction.options.getInteger('seconds');
      const channelOpt = interaction.options.getChannel('channel');

      if (sub === 'delete') {
        if (typeof amount !== 'number' || amount < 1 || amount > 100) return await interaction.reply({ content: 'Bitte gib eine Anzahl zwischen 1 und 100 an.', ephemeral: true });
        const deleted = await interaction.channel.bulkDelete(amount, true);
        return await interaction.reply({ content: `Es wurden ${deleted.size} Nachrichten gelöscht.`, ephemeral: true });
      }

      if (sub === 'lock') {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
          SendMessages: false,
          AddReactions: false
        });
        return await interaction.reply({ content: 'Kanal erfolgreich gesperrt.', ephemeral: true });
      }

      if (sub === 'unlock') {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
          SendMessages: true,
          AddReactions: true
        });
        return await interaction.reply({ content: 'Kanal erfolgreich entsperrt.', ephemeral: true });
      }

      if (sub === 'slowmode') {
        if (typeof seconds !== 'number' || seconds < 0 || seconds > 21600) return await interaction.reply({ content: 'Der Slowmode muss zwischen 0 und 21600 Sekunden liegen.', ephemeral: true });
        await interaction.channel.setRateLimitPerUser(seconds);
        return await interaction.reply({ content: `Slowmode wurde auf ${seconds} Sekunden gesetzt.`, ephemeral: true });
      }

      if (sub === 'ticketsetup') {
        const channel = channelOpt;
        const embed = new EmbedBuilder()
          .setTitle('Ticket eröffnen')
          .setDescription('Wähle eine Kategorie, um ein privates Ticket zu öffnen. Ein Teammitglied hilft dir gleich weiter.')
          .setColor(COLORS.info)
          .setTimestamp();

        const menu = new StringSelectMenuBuilder()
          .setCustomId('ticket_select')
          .setPlaceholder('Wähle eine Ticket-Kategorie')
          .addOptions([
            { label: 'Bewerbung', description: 'Stelle deine Bewerbung ein', value: 'bewerbung', emoji: '📋' },
            { label: 'Bug Meldung', description: 'Melde einen Bug', value: 'bugmeldung', emoji: '🐛' },
            { label: 'Fragen', description: 'Stelle eine Frage', value: 'fragen', emoji: '❓' },
            { label: 'Reporting', description: 'Melde einen Spieler', value: 'reporting', emoji: '⚠️' }
          ]);

        const row = new ActionRowBuilder().addComponents(menu);
        await channel.send({ embeds: [embed], components: [row] });
        return await interaction.reply({ content: 'Ticket-Panel erfolgreich erstellt.', ephemeral: true });
      }

      return await interaction.reply({ content: 'Unbekannter Unterbefehl.', ephemeral: true });
    } catch (error) {
      console.error('Admin category command failed:', error);
      try { await interaction.reply({ content: 'Beim Ausführen des Admin-Befehls ist ein Fehler aufgetreten.', ephemeral: true }); } catch (e) {}
    }
  }
};
