'use strict';

const tickets = require('../data/tickets.json');
const { classify, slaDeadline, sortQueue } = require('./triage');

for (const ticket of sortQueue(tickets)) {
  const priority = classify(ticket).toUpperCase().padEnd(6);
  const deadline = slaDeadline(ticket).toISOString().slice(11, 16);
  console.log(`${priority} ${ticket.id}  SLA ${deadline}Z  ${ticket.customer}: ${ticket.subject}`);
}
