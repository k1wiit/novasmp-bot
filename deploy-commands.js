require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

for (const entry of fs.readdirSync(commandsPath)) {
  const full = path.join(commandsPath, entry);
  if (fs.statSync(full).isDirectory()) {
    const builder = new SlashCommandBuilder()
      .setName(entry)
      .setDescription(`Category: ${entry} commands`);

    for (const file of fs.readdirSync(full).filter((f) => f.endsWith('.js'))) {
      try {
        const cmd = require(path.join(full, file));
        const name = (cmd.data && cmd.data.name) ? cmd.data.name : file.replace(/\.js$/, '');
        const desc = (cmd.data && cmd.data.description) ? cmd.data.description : 'No description';
        builder.addSubcommand((s) => s.setName(name).setDescription(desc));
      } catch (e) {
        console.warn(`Failed to load command for registration: ${file} in ${entry}`, e);
      }
    }

    commands.push(builder.toJSON());
  } else if (entry.endsWith('.js')) {
    try {
      const cmd = require(full);
      if (cmd.data) commands.push(cmd.data.toJSON());
    } catch (e) {
      console.warn(`Failed to load root command for registration: ${entry}`, e);
    }
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log(`Registering ${commands.length} slash commands...`);
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('Slash commands registered successfully.');
  } catch (error) {
    console.error('Failed to register commands:', error);
    process.exit(1);
  }
})();
