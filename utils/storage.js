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
  const store = loadJson(ticketsPath, { openTickets: [], closedTickets: [] });

  function normalizeTicket(ticket) {
    return {
      userId: ticket.userId || '',
      channelId: ticket.channelId || '',
      category: ticket.category || '',
      reason: ticket.reason || '',
      status: ticket.status || 'open',
      createdAt: ticket.createdAt || new Date().toISOString(),
      closedBy: ticket.closedBy || null,
      closedAt: ticket.closedAt || null,
      isPaused: typeof ticket.isPaused === 'boolean' ? ticket.isPaused : false,
      pausedAt: ticket.pausedAt || null,
      logs: Array.isArray(ticket.logs) ? ticket.logs : []
    };
  }

  store.openTickets = Array.isArray(store.openTickets) ? store.openTickets.map(normalizeTicket) : [];
  store.closedTickets = Array.isArray(store.closedTickets) ? store.closedTickets.map(normalizeTicket) : [];
  saveJson(ticketsPath, store);

  return {
    getOpen(userId) {
      return store.openTickets.find((ticket) => ticket.userId === userId && ticket.status === 'open');
    },
    add(ticket) {
      const newTicket = normalizeTicket({
        ...ticket,
        status: 'open',
        createdAt: new Date().toISOString(),
        isPaused: false,
        pausedAt: null,
        logs: []
      });
      store.openTickets.push(newTicket);
      saveJson(ticketsPath, store);
    },
    getByChannelId(channelId) {
      return store.openTickets.find((ticket) => ticket.channelId === channelId);
    },
    setPaused(channelId, isPaused) {
      const ticket = this.getByChannelId(channelId);
      if (ticket) {
        ticket.isPaused = isPaused;
        ticket.pausedAt = isPaused ? new Date().toISOString() : null;
        this.addLog(channelId, isPaused ? 'PAUSED' : 'RESUMED', 'System');
        saveJson(ticketsPath, store);
      }
    },
    addLog(channelId, action, actor = 'System', details = '') {
      const ticket = this.getByChannelId(channelId);
      if (ticket) {
        ticket.logs = Array.isArray(ticket.logs) ? ticket.logs : [];
        ticket.logs.push({
          timestamp: new Date().toISOString(),
          action,
          actor,
          details
        });
        saveJson(ticketsPath, store);
      }
    },
    close(channelId, closedBy = 'System') {
      const ticket = store.openTickets.find((t) => t.channelId === channelId);
      if (ticket) {
        ticket.status = 'closed';
        ticket.closedBy = closedBy;
        ticket.closedAt = new Date().toISOString();
        this.addLog(channelId, 'CLOSED', closedBy);
        store.closedTickets.push(ticket);
        store.openTickets = store.openTickets.filter((t) => t.channelId !== channelId);
        saveJson(ticketsPath, store);
        return ticket;
      }
      return null;
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