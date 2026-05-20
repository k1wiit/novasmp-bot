const fs = require('node:fs');
const path = require('node:path');
const { info, warn } = require('../utils/logger');

function loadCommands(client, commandsPath) {
  info('Loading commands', commandsPath);
  // Map of category -> { subcommandName: module }
  client.categoryCommandMap = {};

  // Load root-level commands and category folders
  for (const entry of fs.readdirSync(commandsPath)) {
    const full = path.join(commandsPath, entry);
    if (fs.statSync(full).isDirectory()) {
      const mods = {};
      for (const file of fs.readdirSync(full).filter((f) => f.endsWith('.js'))) {
        try {
          const cmd = require(path.join(full, file));
          if (!cmd.data || !cmd.execute) continue;
          const name = cmd.data.name || file.replace(/\.js$/, '');
          mods[name] = cmd;
          info(`Loaded admin subcommand ${name}`, `category=${entry}`);
        } catch (e) {
          warn(`Failed to load command ${file} in ${entry}`, e.message);
        }
      }
      client.categoryCommandMap[entry] = mods;

      // Register a wrapper command for the category so interaction handler can route
      client.commands.set(entry, {
        data: { name: entry },
        async execute(interaction) {
          try {
            let sub = null;
            try { sub = interaction.options.getSubcommand(); } catch (e) { /* no subcommand */ }
            if (!sub) return await interaction.reply({ content: 'Bitte einen Unterbefehl angeben.', ephemeral: true });
            const mod = client.categoryCommandMap[entry][sub];
            if (!mod) return await interaction.reply({ content: `Unbekannter Unterbefehl: ${sub}`, ephemeral: true });
            return await mod.execute(interaction);
          } catch (err) {
            console.error('Category command execution failed:', err);
            try { await interaction.reply({ content: 'Beim Ausführen des Befehls ist ein Fehler aufgetreten.', ephemeral: true }); } catch (e) {}
          }
        }
      });
    } else if (entry.endsWith('.js')) {
      try {
        const cmd = require(full);
        if (!cmd.data || !cmd.execute) continue;
        client.commands.set(cmd.data.name, cmd);
        info(`Loaded root command ${cmd.data.name}`);
      } catch (e) {
        warn(`Failed to load root command ${entry}`, e.message);
      }
    }
  }
}

module.exports = { loadCommands };