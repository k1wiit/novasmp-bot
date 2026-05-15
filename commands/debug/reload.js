const { SlashCommandBuilder } = require('discord.js');
const { DEVELOPER_ROLE, isBotOwner, hasRole } = require('../../utils/permissions');
const path = require('node:path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reload')
    .setDescription('Lade einen Befehl oder ein Event neu ohne Neustart')
    .addStringOption((option) =>
      option.setName('name').setDescription('Name des Befehls oder Events zum Neuladen').setRequired(true)
    ),
  async execute(interaction) {
    try {
      if (!isBotOwner(interaction.member) && !hasRole(interaction.member, DEVELOPER_ROLE)) {
        return await interaction.reply({ content: 'Du hast keine Berechtigung für diesen Befehl.', ephemeral: true });
      }

      const name = interaction.options.getString('name');
      const client = interaction.client;
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

      const command = client.commands.get(name);
      if (command) {
        const commandPath = findFile(path.join(__dirname, '..', 'commands'), command.data.name);
        if (!commandPath) return await interaction.reply({ content: 'Die Befehlsdatei konnte nicht gefunden werden.', ephemeral: true });
        delete require.cache[require.resolve(commandPath)];
        const reloaded = require(commandPath);
        client.commands.set(reloaded.data.name, reloaded);
        return await interaction.reply({ content: 'Der Befehl ' + reloaded.data.name + ' wurde erfolgreich neu geladen.', ephemeral: true });
      }

      const eventItem = client.events.get(name);
      if (eventItem) {
        client.removeListener(eventItem.name, eventItem.listener);
        const eventPath = findFile(path.join(__dirname, '..', 'events'), eventItem.name);
        if (!eventPath) return await interaction.reply({ content: 'Die Event-Datei konnte nicht gefunden werden.', ephemeral: true });
        delete require.cache[require.resolve(eventPath)];
        const reloaded = require(eventPath);
        const listener = (...args) => reloaded.execute(client, ...args);
        if (reloaded.once) client.once(reloaded.name, listener);
        else client.on(reloaded.name, listener);
        client.events.set(reloaded.name, { ...reloaded, listener });
        return await interaction.reply({ content: 'Das Event ' + reloaded.name + ' wurde erfolgreich neu geladen.', ephemeral: true });
      }

      await interaction.reply({ content: 'Kein Befehl oder Event mit dem Namen ' + name + ' gefunden.', ephemeral: true });
    } catch (error) {
      console.error('Reload command failed:', error);
      await interaction.reply({ content: 'Das Neuladen der angeforderten Datei ist fehlgeschlagen.', ephemeral: true });
    }
  }
};
