require('dotenv').config();
// Prevent noisy TimeoutNegativeWarning from libraries that may pass negative delays.
// This clamps negative timeout values to zero. It's a safe runtime shim; if you
// prefer the root-cause fix we can remove it and trace the offending library.
{
  const _setTimeout = global.setTimeout;
  global.setTimeout = (fn, delay, ...args) => {
    const d = Number(delay);
    return _setTimeout(fn, Number.isFinite(d) ? Math.max(0, d) : delay, ...args);
  };
}
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const { createTicketStore, createWarningStore } = require('./utils/storage');
const { info, error } = require('./utils/logger');

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
// Map to track temporary voice channels and their metadata
client.tempVoiceChannels = new Map();
// Map to store last select choice for a temp VC dashboard (vcId -> memberId)
client.tempVCSelection = new Map();
client.ticketStore = createTicketStore();
client.warningStore = createWarningStore();
client.waitingRoom = {
  connection: null,
  player: null,
  resource: null,
  playerListenerAdded: false
};

// Ensure data directory exists and required JSON files are initialized.
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

loadCommands(client, path.join(__dirname, 'commands'));
info(`Loaded ${client.commands.size} commands`);
loadEvents(client, path.join(__dirname, 'events'));
info(`Loaded ${client.events.size} events`);

client.once('ready', () => {
  info(`Logged in as ${client.user.tag}. Ready to serve ${client.commands.size} commands.`);
});

client.login(process.env.BOT_TOKEN).catch((loginError) => {
  error('Failed to login', loginError);
  process.exit(1);
});
