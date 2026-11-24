'use strict';

const KEYWORDS = {
  urgent: ['outage', 'storing', 'ligt stil', 'security', 'data kwijt'],
  high: ['error', 'fout', 'kan niet inloggen', 'betaling', 'pinnen', 'traag', 'bestelling'],
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

/** Geeft true als de SLA-deadline op het moment `now` verstreken is (precies op de deadline nog niet). */
function isEscalated(ticket, now = new Date()) {
  return now.getTime() > slaDeadline(ticket).getTime();
}

/** Sorteert tickets: geëscaleerde tickets eerst, dan hoogste prioriteit, daarna oudste eerst. */
function sortQueue(tickets, now = new Date()) {
  return [...tickets].sort((a, b) => {
    const ea = isEscalated(a, now);
    const eb = isEscalated(b, now);
    if (ea !== eb) return ea ? -1 : 1;
    const pa = classifyTicket(a);
    const pb = classifyTicket(b);
    if (pa !== pb) return PRIORITY_RANK[pa] - PRIORITY_RANK[pb];
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
}

module.exports = { classifyTicket, slaDeadline, isEscalated, sortQueue, SLA_HOURS };
