'use strict';

const tickets = require('../data/tickets.json');
const { classifyTicket, slaDeadline, isEscalated, sortQueue } = require('./triage');

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?Z$/;

/** Stopt met exit code 1 en een uitleg over de juiste notatie van --now. */
function rejectNow(value) {
  console.error(`Ongeldige tijd voor --now: ${value}. Gebruik UTC in ISO-notatie, bijvoorbeeld --now 2026-11-14T12:30:00Z.`);
  process.exit(1);
}

/** Leest het peilmoment uit `--now <ISO-tijd in UTC>`; zonder die optie de huidige klok. */
function parseNow(argv) {
  const inline = argv.find((arg) => arg.startsWith('--now='));
  if (inline) rejectNow(inline);
  const index = argv.indexOf('--now');
  if (index === -1) return new Date();
  const raw = argv[index + 1];
  const now = new Date(raw);
  if (!ISO_UTC.test(raw ?? '') || Number.isNaN(now.getTime())) rejectNow(raw ?? '(leeg)');
  return now;
}

const now = parseNow(process.argv.slice(2));

for (const ticket of sortQueue(tickets, now)) {
  const escalation = (isEscalated(ticket, now) ? 'ESCALATIE' : '').padEnd(9);
  const priority = classifyTicket(ticket).toUpperCase().padEnd(6);
  const deadline = slaDeadline(ticket).toISOString().slice(11, 16);
  console.log(`${escalation} ${priority} ${ticket.id}  SLA ${deadline}Z  ${ticket.customer}: ${ticket.subject}`);
}
