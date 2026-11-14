'use strict';

const KEYWORDS = {
  urgent: ['outage', 'storing', 'ligt stil', 'security', 'data kwijt'],
  high: ['error', 'fout', 'kan niet inloggen', 'betaling', 'pinnen'],
};

const SLA_HOURS = { urgent: 1, high: 4, normal: 24 };

/** Bepaalt de prioriteit van een ticket op basis van trefwoorden. */
function classify(ticket) {
  const text = `${ticket.subject} ${ticket.body}`;
  for (const priority of ['urgent', 'high']) {
    if (KEYWORDS[priority].some((word) => text.includes(word))) {
      return priority;
    }
  }
  return 'normal';
}

/** Geeft het moment waarop de eerste reactie uiterlijk verstuurd moet zijn. */
function slaDeadline(ticket) {
  const priority = classify(ticket);
  const created = new Date(ticket.createdAt).getTime();
  return new Date(created + SLA_HOURS[priority] * 60 * 1000);
}

/** Sorteert tickets: hoogste prioriteit eerst, daarna oudste eerst. */
function sortQueue(tickets) {
  return [...tickets].sort((a, b) => {
    const pa = classify(a);
    const pb = classify(b);
    if (pa !== pb) return pa < pb ? -1 : 1;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
}

module.exports = { classify, slaDeadline, sortQueue, SLA_HOURS };
