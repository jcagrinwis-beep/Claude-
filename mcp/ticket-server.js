#!/usr/bin/env node
'use strict';

// MCP-server voor de ticketwachtrij, zonder SDK: JSON-RPC 2.0 over stdio,
// één JSON-bericht per regel. Stdout is uitsluitend voor protocolberichten;
// meldingen voor mensen gaan naar stderr.

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { classifyTicket, slaDeadline, isEscalated } = require('../src/triage');

const TICKETS_PATH = path.join(__dirname, '..', 'data', 'tickets.json');
const PROTOCOL_VERSION = '2025-06-18';
const SERVER_INFO = { name: 'support-desk-tickets', version: '0.1.0' };

const JSONRPC_PARSE_ERROR = -32700;
const JSONRPC_INVALID_REQUEST = -32600;
const JSONRPC_METHOD_NOT_FOUND = -32601;
const JSONRPC_INVALID_PARAMS = -32602;

const NOW_PROPERTY = {
  type: 'string',
  description: 'Optioneel peilmoment in UTC, ISO-notatie (bijv. 2026-11-14T12:30:00Z). Standaard de huidige klok.',
};

const TOOLS = [
  {
    name: 'list_tickets',
    description:
      'Geeft alle tickets in de wachtrij met id, klant, onderwerp, prioriteit, SLA-deadline en of het ticket geëscaleerd is (SLA verstreken).',
    inputSchema: { type: 'object', properties: { now: NOW_PROPERTY }, additionalProperties: false },
  },
  {
    name: 'get_ticket',
    description: 'Geeft alle gegevens van één ticket, inclusief berekende prioriteit, SLA-deadline en escalatie.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Ticket-ID, bijvoorbeeld T-1004.' }, now: NOW_PROPERTY },
      required: ['id'],
      additionalProperties: false,
    },
  },
];

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?Z$/;

/** Leest de tickets bij elke aanroep opnieuw, zodat wijzigingen in het bestand direct zichtbaar zijn. */
function loadTickets() {
  return JSON.parse(fs.readFileSync(TICKETS_PATH, 'utf8'));
}

/** Zet het optionele `now`-argument om naar een Date; gooit bij een ongeldige of niet-UTC-tijd. */
function parseNow(value) {
  if (value === undefined) return new Date();
  const now = new Date(value);
  if (typeof value !== 'string' || !ISO_UTC.test(value) || Number.isNaN(now.getTime())) {
    throw new Error(`Ongeldige tijd voor now: ${value}. Gebruik UTC in ISO-notatie, bijvoorbeeld 2026-11-14T12:30:00Z.`);
  }
  return now;
}

/** Voegt de berekende velden (prioriteit, deadline, escalatie) toe aan een ticket. */
function describe(ticket, now) {
  return {
    priority: classifyTicket(ticket),
    slaDeadline: slaDeadline(ticket).toISOString(),
    escalated: isEscalated(ticket, now),
  };
}

const HANDLERS = {
  list_tickets(args) {
    const now = parseNow(args.now);
    return loadTickets().map((t) => ({ id: t.id, customer: t.customer, subject: t.subject, ...describe(t, now) }));
  },
  get_ticket(args) {
    if (typeof args.id !== 'string') throw new Error('id is verplicht, bijvoorbeeld T-1004.');
    const now = parseNow(args.now);
    const ticket = loadTickets().find((t) => t.id === args.id);
    if (!ticket) throw new Error(`Ticket ${args.id} bestaat niet.`);
    return { ...ticket, ...describe(ticket, now) };
  },
};

/** Voert een tools/call uit; fouten in de tool worden als isError-resultaat teruggegeven, zodat Claude ze kan lezen. */
function callTool(params) {
  const handler = HANDLERS[params?.name];
  if (!handler) return { error: { code: JSONRPC_INVALID_PARAMS, message: `Onbekende tool: ${params?.name}` } };
  try {
    const data = handler(params.arguments ?? {});
    return { result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] } };
  } catch (err) {
    return { result: { content: [{ type: 'text', text: err.message }], isError: true } };
  }
}

/** Beantwoordt één JSON-RPC-bericht; geeft null voor notificaties (berichten zonder id). */
function handleMessage(msg) {
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
    return { jsonrpc: '2.0', id: msg?.id ?? null, error: { code: JSONRPC_INVALID_REQUEST, message: 'Ongeldig verzoek' } };
  }
  const isNotification = msg.id === undefined;
  let outcome;
  switch (msg.method) {
    case 'initialize':
      outcome = {
        result: {
          protocolVersion: msg.params?.protocolVersion ?? PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO,
        },
      };
      break;
    case 'ping':
      outcome = { result: {} };
      break;
    case 'tools/list':
      outcome = { result: { tools: TOOLS } };
      break;
    case 'tools/call':
      outcome = callTool(msg.params);
      break;
    default:
      if (isNotification) return null; // bijv. notifications/initialized: geen antwoord
      outcome = { error: { code: JSONRPC_METHOD_NOT_FOUND, message: `Onbekende methode: ${msg.method}` } };
  }
  return isNotification ? null : { jsonrpc: '2.0', id: msg.id, ...outcome };
}

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  if (!line.trim()) return;
  let response;
  try {
    response = handleMessage(JSON.parse(line));
  } catch {
    response = { jsonrpc: '2.0', id: null, error: { code: JSONRPC_PARSE_ERROR, message: 'Ongeldige JSON' } };
  }
  if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
});
