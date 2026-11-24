'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const SERVER = path.join(__dirname, '..', 'mcp', 'ticket-server.js');

/** Start de server, stuurt de berichten (één per regel) en geeft de antwoorden terug, op id. */
function exchange(messages, env = {}) {
  const input = messages.map((m) => (typeof m === 'string' ? m : JSON.stringify(m))).join('\n') + '\n';
  const result = spawnSync(process.execPath, [SERVER], { input, encoding: 'utf8', env: { ...process.env, ...env } });
  const lines = result.stdout.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  return { lines, byId: Object.fromEntries(lines.map((l) => [l.id, l])) };
}

const init = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0' } } };
const initialized = { jsonrpc: '2.0', method: 'notifications/initialized' };
const call = (id, name, args) => ({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } });
const parse = (response) => JSON.parse(response.result.content[0].text);

test('mcp-server: initialize meldt tools en notificaties krijgen geen antwoord', () => {
  const { lines, byId } = exchange([init, initialized]);
  assert.equal(lines.length, 1);
  assert.deepEqual(Object.keys(byId[1].result.capabilities), ['tools']);
  assert.equal(byId[1].result.serverInfo.name, 'support-desk-tickets');
});

test('mcp-server: tools/list geeft list_tickets en get_ticket', () => {
  const { byId } = exchange([init, initialized, { jsonrpc: '2.0', id: 2, method: 'tools/list' }]);
  assert.deepEqual(byId[2].result.tools.map((t) => t.name), ['list_tickets', 'get_ticket', 'add_note']);
});

test('mcp-server: list_tickets markeert escalaties op het gegeven moment', () => {
  const { byId } = exchange([init, call(2, 'list_tickets', { now: '2026-11-14T12:30:00Z' })]);
  const tickets = parse(byId[2]);
  assert.equal(tickets.length, 7);
  assert.deepEqual(tickets.filter((t) => t.escalated).map((t) => t.id), ['T-1001', 'T-1003', 'T-1006']);
  assert.deepEqual(Object.keys(tickets[0]), ['id', 'customer', 'subject', 'priority', 'slaDeadline', 'escalated']);
});

test('mcp-server: get_ticket geeft het volledige ticket met berekende velden', () => {
  const { byId } = exchange([init, call(2, 'get_ticket', { id: 'T-1004', now: '2026-11-14T12:30:00Z' })]);
  const ticket = parse(byId[2]);
  assert.equal(ticket.body, 'Mijn collega kan niet inloggen sinds de update.');
  assert.equal(ticket.priority, 'high');
  assert.equal(ticket.slaDeadline, '2026-11-14T13:10:00.000Z');
  assert.equal(ticket.escalated, false);
});

test('mcp-server: toolfouten komen terug als isError, protocolfouten als JSON-RPC-fout', () => {
  const { byId } = exchange([
    init,
    call(2, 'get_ticket', { id: 'T-9999' }),
    call(3, 'list_tickets', { now: '2026-11-14T12:30:00' }),
    call(4, 'bestaat_niet', {}),
    { jsonrpc: '2.0', id: 5, method: 'onbekend' },
  ]);
  assert.equal(byId[2].result.isError, true);
  assert.match(byId[2].result.content[0].text, /T-9999 bestaat niet/);
  assert.equal(byId[3].result.isError, true);
  assert.equal(byId[4].error.code, -32602);
  assert.equal(byId[5].error.code, -32601);
});

test('mcp-server: ongeldige JSON geeft een parse error en de server blijft werken', () => {
  const { byId, lines } = exchange(['{kapot', { jsonrpc: '2.0', id: 2, method: 'ping' }]);
  assert.equal(lines[0].error.code, -32700);
  assert.deepEqual(byId[2].result, {});
});

/** Geeft een leeg, tijdelijk notitiebestand en ruimt het na de test op. */
function tempNotes(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'notes-'));
  const file = path.join(dir, 'notes.json');
  t.after(() => {
    fs.rmSync(file, { force: true });
    fs.rmdirSync(dir);
  });
  return { TICKET_NOTES_PATH: file };
}

test('mcp-server: add_note slaat een notitie op en get_ticket toont hem', (t) => {
  const env = tempNotes(t);
  const { byId } = exchange([init, call(2, 'add_note', { id: 'T-1004', text: 'Klant teruggebeld, wacht op screenshot.' })], env);
  assert.equal(byId[2].result.isError, undefined);
  const after = exchange([init, call(2, 'get_ticket', { id: 'T-1004' })], env);
  const notes = parse(after.byId[2]).notes;
  assert.equal(notes.length, 1);
  assert.equal(notes[0].text, 'Klant teruggebeld, wacht op screenshot.');
  assert.match(notes[0].createdAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
});

test('mcp-server: add_note weigert een e-mailadres buiten example.com en noemt het adres niet voluit', (t) => {
  const env = tempNotes(t);
  const address = ['piet', 'bakkerij-voorbeeld.nl'].join('@');
  const { byId } = exchange([init, call(2, 'add_note', { id: 'T-1001', text: `Mail naar ${address} gestuurd.` })], env);
  assert.equal(byId[2].result.isError, true);
  assert.match(byId[2].result.content[0].text, /p\*\*\*@bakkerij-voorbeeld\.nl/);
  assert.doesNotMatch(byId[2].result.content[0].text, /piet@/);
  assert.equal(fs.existsSync(env.TICKET_NOTES_PATH), false);
});

test('mcp-server: add_note staat adressen op example.com toe, ook in hoofdletters', (t) => {
  const env = tempNotes(t);
  const { byId } = exchange([init, call(2, 'add_note', { id: 'T-1001', text: 'Contact: Klant@Example.COM' })], env);
  assert.equal(byId[2].result.isError, undefined);
});

test('mcp-server: add_note weigert een onbekend ticket en een lege notitie', (t) => {
  const env = tempNotes(t);
  const { byId } = exchange([
    init,
    call(2, 'add_note', { id: 'T-9999', text: 'Hallo' }),
    call(3, 'add_note', { id: 'T-1001', text: '   ' }),
  ], env);
  assert.equal(byId[2].result.isError, true);
  assert.equal(byId[3].result.isError, true);
  assert.equal(fs.existsSync(env.TICKET_NOTES_PATH), false);
});
