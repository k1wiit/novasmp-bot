require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');

const eventsPath = path.join(__dirname, 'events');
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

console.log(`Found ${eventFiles.length} event files:`);
for (const file of eventFiles) {
  const event = require(file);
  console.log(`- ${event.name || path.basename(file)} ${event.once ? '(once)' : ''}`);
}
console.log('Event deployment script completed.');
