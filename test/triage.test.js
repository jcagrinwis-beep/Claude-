'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { classify, slaDeadline, sortQueue } = require('../src/triage');

const ticket = (subject, body = '', createdAt = '2026-11-14T08:00:00Z') => ({
  id: 'T-1',
  customer: 'Test BV',
  subject,
  body,
  createdAt,
});

test('classify herkent een storing als urgent', () => {
  assert.equal(classify(ticket('Er is een storing')), 'urgent');
});

test('classify geeft normal zonder trefwoorden', () => {
  assert.equal(classify(ticket('Vraag over factuur')), 'normal');
});

test('slaDeadline ligt na het aanmaakmoment', () => {
  const t = ticket('Vraag over factuur');
  assert.ok(slaDeadline(t) > new Date(t.createdAt));
});

test('sortQueue behoudt alle tickets', () => {
  const queue = [ticket('Vraag'), ticket('storing'), ticket('error')];
  assert.equal(sortQueue(queue).length, 3);
});
