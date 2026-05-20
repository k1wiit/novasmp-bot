const fs = require('node:fs');
const path = require('node:path');
const { info, warn } = require('../utils/logger');

function loadEvents(client, eventsPath) {
  info('Loading events', eventsPath);
  const eventFiles = [];

  const walk = (dir) => {
    for (const file of fs.readdirSync(dir)) {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        walk(filePath);
      } else if (file.endsWith('.js')) {
        eventFiles.push(filePath);
      }
    }
  };

  walk(eventsPath);

  for (const filePath of eventFiles) {
    const event = require(filePath);
    if (!event.name || !event.execute) {
      warn(`Skipping invalid event file`, filePath);
      continue;
    }

    const listener = (...args) => event.execute(client, ...args);
    if (event.once) {
      client.once(event.name, listener);
    } else {
      client.on(event.name, listener);
    }

    client.events.set(event.name, { ...event, listener });
    info(`Loaded event ${event.name}`);
  }
}

module.exports = { loadEvents };