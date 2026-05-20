const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const { COLORS } = require('../utils/embedBuilder');
const { STAFF_ROLE, isBotOwner, hasRole } = require('../utils/permissions');

function formatDuration(ms) {
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}h ${m}m ${s}s`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Info commands grouped')
    .addSubcommand((s) => s.setName('announce').setDescription('Sende eine formatierte Ankündigung in einen Kanal').addChannelOption((o) => o.setName('channel').setDescription('Kanal für die Ankündigung').setRequired(true)).addStringOption((o) => o.setName('title').setDescription('Titel der Ankündigung').setRequired(true)).addStringOption((o) => o.setName('message').setDescription('Nachricht der Ankündigung').setRequired(true)))
    .addSubcommand((s) => s.setName('embed').setDescription('Erstellt und sendet ein benutzerdefiniertes Embed').addChannelOption((o) => o.setName('channel').setDescription('Kanal zum Senden des Embeds').setRequired(true)).addStringOption((o) => o.setName('title').setDescription('Embed-Titel').setRequired(true)).addStringOption((o) => o.setName('description').setDescription('Embed-Beschreibung').setRequired(true)).addStringOption((o) => o.setName('color').setDescription('Hex-Farbcode oder Name').setRequired(false)).addStringOption((o) => o.setName('footer').setDescription('Footer-Text').setRequired(false)))
    .addSubcommand((s) => s.setName('say').setDescription('Lasse den Bot eine Nachricht in einen Kanal senden').addChannelOption((o) => o.setName('channel').setDescription('Zielkanal').setRequired(true)).addStringOption((o) => o.setName('message').setDescription('Nachrichteninhalt').setRequired(true)))
    .addSubcommand((s) => s.setName('help').setDescription('Shows command categories, examples and optional user voice time').addUserOption((o) => o.setName('user').setDescription('Show voice time for this user').setRequired(false))),

  async execute(interaction) {
    try {
      const sub = interaction.options.getSubcommand();

      if (sub === 'announce') {
        if (!isBotOwner(interaction.member) && !hasRole(interaction.member, STAFF_ROLE)) return await interaction.reply({ content: 'Du hast keine Berechtigung für diesen Befehl.', ephemeral: true });
        const channel = interaction.options.getChannel('channel');
        const title = interaction.options.getString('title');
        const message = interaction.options.getString('message');
        const embed = new EmbedBuilder().setTitle(title).setDescription(message).setColor(COLORS.info).setTimestamp();
        await channel.send({ embeds: [embed] });
        return await interaction.reply({ content: 'Ankündigung erfolgreich gesendet.', ephemeral: true });
      }

      if (sub === 'embed') {
        if (!isBotOwner(interaction.member) && !hasRole(interaction.member, STAFF_ROLE)) return await interaction.reply({ content: 'Du hast keine Berechtigung für diesen Befehl.', ephemeral: true });
        const channel = interaction.options.getChannel('channel');
        const title = interaction.options.getString('title');
        const description = interaction.options.getString('description');
        const color = interaction.options.getString('color') || COLORS.info;
        const footer = interaction.options.getString('footer') || null;
        const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(color).setTimestamp();
        if (footer) embed.setFooter({ text: footer });
        await channel.send({ embeds: [embed] });
        return await interaction.reply({ content: 'Embed erfolgreich gesendet.', ephemeral: true });
      }

      if (sub === 'say') {
        if (!isBotOwner(interaction.member) && !hasRole(interaction.member, STAFF_ROLE)) return await interaction.reply({ content: 'Du hast keine Berechtigung für diesen Befehl.', ephemeral: true });
        const channel = interaction.options.getChannel('channel');
        const message = interaction.options.getString('message');
        await channel.send(message);
        return await interaction.reply({ content: 'Nachricht erfolgreich gesendet.', ephemeral: true });
      }

      if (sub === 'help') {
        const client = interaction.client;
        const commandsRoot = path.join(__dirname);

        const categories = {};
        for (const entry of fs.readdirSync(commandsRoot)) {
          const full = path.join(commandsRoot, entry);
          if (fs.statSync(full).isDirectory()) {
            const files = fs.readdirSync(full).filter((f) => f.endsWith('.js'));
            for (const f of files) {
              try {
                const cmd = require(path.join(full, f));
                const name = cmd.data && cmd.data.name ? cmd.data.name : f.replace(/\.js$/, '');
                categories[entry] = categories[entry] || [];
                categories[entry].push(name);
              } catch (e) {}
            }
          } else if (entry.endsWith('.js')) {
            try {
              const cmd = require(full);
              const name = cmd.data && cmd.data.name ? cmd.data.name : entry.replace(/\.js$/, '');
              categories.General = categories.General || [];
              categories.General.push(name);
            } catch (e) {}
          }
        }

        const embed = new EmbedBuilder().setTitle('Command Overview').setColor(COLORS.info).setDescription('Examples and useful info. Use the optional `user` option to show voice session time.').setTimestamp();
        for (const [cat, cmds] of Object.entries(categories)) {
          const limit = 12;
          const slice = cmds.slice(0, limit);
          let examples = '';
          if (cat === 'General') examples = slice.length ? `/${slice.join('/')}` : '—'; else examples = slice.length ? `/${cat} ${slice.join('/')}` : '—';
          if (cmds.length > limit) examples += ' ...';
          embed.addFields({ name: `${cat} (${cmds.length})`, value: examples, inline: false });
        }

        const targetUser = interaction.options.getUser('user');
        if (targetUser) {
          const joined = client.voiceTimestamps.get(targetUser.id);
          let voiceInfo = 'No active voice session recorded.';
          const member = interaction.guild ? await interaction.guild.members.fetch(targetUser.id).catch(() => null) : null;
          const channelName = member && member.voice && member.voice.channel ? member.voice.channel.name : null;
          if (joined) {
            const dur = Date.now() - joined;
            voiceInfo = `Current session: ${formatDuration(dur)}${channelName ? ` (in ${channelName})` : ''}`;
          } else if (member && member.voice && member.voice.channel) {
            voiceInfo = `In voice channel ${member.voice.channel.name} — session start unknown.`;
          }
          embed.addFields({ name: `Voice time for ${targetUser.tag}`, value: voiceInfo, inline: false });
        }

        return await interaction.reply({ embeds: [embed], ephemeral: false });
      }

      return await interaction.reply({ content: 'Unbekannter Unterbefehl.', ephemeral: true });
    } catch (error) {
      console.error('Info category command failed:', error);
      try { await interaction.reply({ content: 'Beim Ausführen des Info-Befehls ist ein Fehler aufgetreten.', ephemeral: true }); } catch (e) {}
    }
  }
};
