'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { checkRules } = require('../src/rules');

const rules = {
  vipSenders: ['@belastingdienst.nl'],
  keywords: ['dringend'],
  ignoreSenders: ['nieuwsbrief@'],
};

test('vip sender is important', () => {
  const r = checkRules({ from: 'Info <info@belastingdienst.nl>', subject: 'Brief' }, rules);
  assert.strictEqual(r.important, true);
});

test('keyword in subject or body is important (case-insensitive)', () => {
  assert.strictEqual(checkRules({ from: 'a@b.nl', subject: 'DRINGEND' }, rules).important, true);
  assert.strictEqual(checkRules({ from: 'a@b.nl', subject: 'Hoi', text: 'Is dringend' }, rules).important, true);
});

test('ignored sender wins over keywords', () => {
  const r = checkRules({ from: 'nieuwsbrief@shop.nl', subject: 'Dringend: 50% korting' }, rules);
  assert.strictEqual(r.important, false);
});

test('no matching rule leaves the decision open', () => {
  assert.strictEqual(checkRules({ from: 'a@b.nl', subject: 'Hoi' }, rules).important, null);
});
