'use strict';

const KEYWORDS = {
  urgent: ['outage', 'storing', 'ligt stil', 'security', 'data kwijt'],
  high: ['error', 'fout', 'kan niet inloggen', 'betaling', 'pinnen', 'traag'],
};

const SLA_HOURS = { urgent: 1, high: 4, normal: 24 };
const MS_PER_HOUR = 60 * 60 * 1000;

const PRIORITY_RANK = { urgent: 0, high: 1, normal: 2 };

/** Bepaalt de prioriteit van een ticket op basis van trefwoorden. */
function classifyTicket(ticket) {
  const text = `${ticket.subject} ${ticket.body}`.toLowerCase();
  for (const priority of ['urgent', 'high']) {
    if (KEYWORDS[priority].some((word) => text.includes(word))) {
      return priority;
    }
  }
  return 'normal';
}

/** Geeft het moment waarop de eerste reactie uiterlijk verstuurd moet zijn. */
function slaDeadline(ticket) {
  const priority = classifyTicket(ticket);
  const created = new Date(ticket.createdAt).getTime();
  return new Date(created + SLA_HOURS[priority] * MS_PER_HOUR);
}

/** Sorteert tickets: hoogste prioriteit eerst, daarna oudste eerst. */
function sortQueue(tickets) {
  return [...tickets].sort((a, b) => {
    const pa = classifyTicket(a);
    const pb = classifyTicket(b);
    if (pa !== pb) return PRIORITY_RANK[pa] - PRIORITY_RANK[pb];
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
}

module.exports = { classifyTicket, slaDeadline, sortQueue, SLA_HOURS };
