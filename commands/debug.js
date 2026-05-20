const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { DEVELOPER_ROLE, isBotOwner, hasRole } = require('../utils/permissions');
const { createWelcomeCard } = require('../utils/welcomeCard');

async function safeReply(interaction, options) {
  if (interaction.replied || interaction.deferred) return interaction.followUp(options);
  return interaction.reply(options);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('debug')
    .setDescription('Developer/debug commands grouped')
    .addSubcommand((s) => s.setName('eval').setDescription('Führe JavaScript-Code aus (nur Entwickler)').addStringOption((o) => o.setName('code').setDescription('JavaScript-Code zum Ausführen').setRequired(true)))
    .addSubcommand((s) => s.setName('reload').setDescription('Lade einen Befehl oder ein Event neu ohne Neustart').addStringOption((o) => o.setName('name').setDescription('Name des Befehls oder Events zum Neuladen').setRequired(true)))
    .addSubcommand((s) => s.setName('restart').setDescription('Starte den Bot neu (PM2 empfohlen)'))
    .addSubcommand((s) => s.setName('setwelcome').setDescription('Sende eine Test-Willkommenskarte für einen Benutzer').addUserOption((o) => o.setName('user').setDescription('Benutzer zum Testen der Willkommenskarte').setRequired(true)))
    .addSubcommand((s) => s.setName('status').setDescription('Zeigt Bot-Laufzeit, Arbeitsspeicher und Ping an')),

  async execute(interaction) {
    try {
      if (!isBotOwner(interaction.member) && !hasRole(interaction.member, DEVELOPER_ROLE)) {
        return await interaction.reply({ content: 'Du hast keine Berechtigung für diesen Befehl.', ephemeral: true });
      }

      const sub = interaction.options.getSubcommand();

      if (sub === 'eval') {
        const code = interaction.options.getString('code');
        let result;
        try { result = eval(code); } catch (execError) { return interaction.reply({ content: `Auswertungsfehler: ${execError.message}`, ephemeral: true }); }
        return await interaction.reply({ content: `Ergebnis: \`${typeof result}\`\n\`${String(result).slice(0, 1900)}\``, ephemeral: true });
      }

      if (sub === 'reload') {
        const name = interaction.options.getString('name');
        const fs = require('node:fs');
        const path = require('node:path');

        const findFile = (baseDir, targetName) => {
          const entries = fs.readdirSync(baseDir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(baseDir, entry.name);
            if (entry.isDirectory()) {
              const found = findFile(fullPath, targetName);
              if (found) return found;
            } else if (entry.isFile() && entry.name === `${targetName}.js`) {
              return fullPath;
            }
          }
          return null;
        };

        // Search from project root commands and events
        const root = path.join(__dirname);
        let filePath = findFile(root, name);
        if (!filePath) filePath = findFile(path.join(__dirname, '..', 'events'), name);
        if (!filePath) return await interaction.reply({ content: 'Die Datei konnte nicht gefunden werden.', ephemeral: true });
        delete require.cache[require.resolve(filePath)];
        const reloaded = require(filePath);
        // If it's a command module, update client.commands entry (by its data.name)
        if (reloaded.data) {
          interaction.client.commands.set(reloaded.data.name, reloaded);
          return await interaction.reply({ content: `Der Befehl ${reloaded.data.name} wurde neu geladen.`, ephemeral: true });
        }
        // If event, rebind
        if (reloaded.name) {
          const listener = (...args) => reloaded.execute(interaction.client, ...args);
          if (reloaded.once) interaction.client.once(reloaded.name, listener); else interaction.client.on(reloaded.name, listener);
          interaction.client.events.set(reloaded.name, { ...reloaded, listener });
          return await interaction.reply({ content: `Das Event ${reloaded.name} wurde neu geladen.`, ephemeral: true });
        }

        return await interaction.reply({ content: 'Die Datei wurde neu geladen.', ephemeral: true });
      }

      if (sub === 'restart') {
        await interaction.reply('Der Bot wird jetzt neu gestartet...');
        process.exit(0);
      }

      if (sub === 'setwelcome') {
        const user = interaction.options.getUser('user');
        const welcomeChannel = interaction.client.channels.cache.get(process.env.WELCOME_CHANNEL_ID);
        if (!welcomeChannel) return await safeReply(interaction, { content: 'Willkommenskanal nicht gefunden.', ephemeral: true });
        const buffer = await createWelcomeCard(user, interaction.guild.memberCount);
        const attachment = new AttachmentBuilder(buffer, { name: 'welcome.png' });
        await welcomeChannel.send({ content: `Willkommens-Vorschau für ${user}`, files: [attachment] });
        return await safeReply(interaction, { content: 'Willkommenskarte erfolgreich gesendet.', ephemeral: true });
      }

      if (sub === 'status') {
        const uptime = process.uptime();
        const memory = process.memoryUsage();
        const embed = {
          color: 0x57b5ff,
          title: 'Bot Status',
          fields: [
            { name: 'Uptime', value: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`, inline: true },
            { name: 'Ping', value: `${Math.round(interaction.client.ws.ping)}ms`, inline: true },
            { name: 'Memory', value: `${Math.round(memory.rss / 1024 / 1024)} MB RSS`, inline: true }
          ],
          timestamp: new Date()
        };
        return await interaction.reply({ embeds: [embed] });
      }

      return await interaction.reply({ content: 'Unbekannter Unterbefehl.', ephemeral: true });
    } catch (error) {
      console.error('Debug category command failed:', error);
      try { await interaction.reply({ content: 'Beim Ausführen des Debug-Befehls ist ein Fehler aufgetreten.', ephemeral: true }); } catch (e) {}
    }
  }
};
