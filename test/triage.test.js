'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyTicket, slaDeadline, sortQueue } = require('../src/triage');

const ticket = (subject, body = '', createdAt = '2026-11-14T08:00:00Z') => ({
  id: 'T-1',
  customer: 'Test BV',
  subject,
  body,
  createdAt,
});

test('classifyTicket herkent een storing als urgent', () => {
  assert.equal(classifyTicket(ticket('Er is een storing')), 'urgent');
});

test('classifyTicket negeert hoofdletters', () => {
  assert.equal(classifyTicket(ticket('COMPLETE OUTAGE')), 'urgent');
  assert.equal(classifyTicket(ticket('Security lek')), 'urgent');
  assert.equal(classifyTicket(ticket('Error bij betalen')), 'high');
});

test('classifyTicket geeft high bij een trage app', () => {
  assert.equal(classifyTicket(ticket('App is erg traag')), 'high');
});

test('classifyTicket geeft high bij een vraag over een bestelling', () => {
  assert.equal(classifyTicket(ticket('Bestelling niet ontvangen')), 'high');
});

test('classifyTicket geeft normal zonder trefwoorden', () => {
  assert.equal(classifyTicket(ticket('Vraag over factuur')), 'normal');
});

test('slaDeadline ligt na het aanmaakmoment', () => {
  const t = ticket('Vraag over factuur');
  assert.ok(slaDeadline(t) > new Date(t.createdAt));
});

test('slaDeadline geeft 1, 4 en 24 uur na aanmaak per prioriteit', () => {
  assert.equal(slaDeadline(ticket('storing')).toISOString(), '2026-11-14T09:00:00.000Z');
  assert.equal(slaDeadline(ticket('error')).toISOString(), '2026-11-14T12:00:00.000Z');
  assert.equal(slaDeadline(ticket('Vraag')).toISOString(), '2026-11-15T08:00:00.000Z');
});

test('sortQueue behoudt alle tickets', () => {
  const queue = [ticket('Vraag'), ticket('storing'), ticket('error')];
  assert.equal(sortQueue(queue).length, 3);
});

test('sortQueue zet urgent eerst, dan high, dan normal', () => {
  const queue = [ticket('Vraag'), ticket('error'), ticket('storing')];
  const priorities = sortQueue(queue).map(classifyTicket);
  assert.deepEqual(priorities, ['urgent', 'high', 'normal']);
});

test('sortQueue zet bij gelijke prioriteit het oudste ticket eerst', () => {
  const nieuw = { ...ticket('storing', '', '2026-11-14T10:00:00Z'), id: 'T-2' };
  const oud = { ...ticket('storing', '', '2026-11-14T08:00:00Z'), id: 'T-1' };
  assert.deepEqual(sortQueue([nieuw, oud]).map((t) => t.id), ['T-1', 'T-2']);
});
