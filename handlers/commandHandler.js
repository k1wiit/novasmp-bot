const fs = require('node:fs');
const path = require('node:path');

function loadCommands(client, commandsPath) {
  const commandFiles = [];

  const walk = (dir) => {
    for (const file of fs.readdirSync(dir)) {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        walk(filePath);
      } else if (file.endsWith('.js')) {
        commandFiles.push(filePath);
      }
    }
  };

  walk(commandsPath);

  for (const filePath of commandFiles) {
    const command = require(filePath);
    if (!command.data || !command.execute) {
      console.warn(`Skipping invalid command file: ${filePath}`);
      continue;
    }
    client.commands.set(command.data.name, command);
  }
}

module.exports = { loadCommands };