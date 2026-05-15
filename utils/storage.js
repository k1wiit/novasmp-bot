const fs = require('node:fs');
const path = require('node:path');

const warningsPath = path.join(__dirname, '..', 'data', 'warnings.json');
const ticketsPath = path.join(__dirname, '..', 'data', 'tickets.json');

function loadJson(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
      return defaultValue;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Error loading JSON file ${filePath}:`, error);
    return defaultValue;
  }
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function createWarningStore() {
  const store = loadJson(warningsPath, {});
  return {
    get(userId) {
      return store[userId] || [];
    },
    add(userId, warning) {
      store[userId] = store[userId] || [];
      store[userId].push(warning);
      saveJson(warningsPath, store);
    }
  };
}

function createTicketStore() {
  const store = loadJson(ticketsPath, { openTickets: [] });
  return {
    getOpen(userId) {
      return store.openTickets.find((ticket) => ticket.userId === userId);
    },
    add(ticket) {
      store.openTickets.push(ticket);
      saveJson(ticketsPath, store);
    },
    remove(channelId) {
      store.openTickets = store.openTickets.filter((ticket) => ticket.channelId !== channelId);
      saveJson(ticketsPath, store);
    },
    all() {
      return store.openTickets;
    }
  };
}

module.exports = {
  createWarningStore,
  createTicketStore
};