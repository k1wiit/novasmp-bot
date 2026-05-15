require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const { createTicketStore, createWarningStore } = require('./utils/storage');

// Create client with the core intents needed for guilds, messages, members, and voice.
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
});

client.commands = new Collection();
client.events = new Collection();
client.voiceTimestamps = new Map();
client.ticketStore = createTicketStore();
client.warningStore = createWarningStore();
client.waitingRoom = {
  connection: null,
  player: null,
  resource: null
};

// Ensure data directory exists and required JSON files are initialized.
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

loadCommands(client, path.join(__dirname, 'commands'));
loadEvents(client, path.join(__dirname, 'events'));

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}. Ready to serve ${client.commands.size} commands.`);
});

client.login(process.env.BOT_TOKEN).catch((error) => {
  console.error('Failed to login:', error);
  process.exit(1);
});
