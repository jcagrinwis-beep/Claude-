'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const CLI = path.join(__dirname, '..', 'src', 'cli.js');
const runQueue = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });

test('queue met --now markeert alleen verlopen tickets als ESCALATIE', () => {
  const result = runQueue('--now', '2026-11-14T12:30:00Z');
  assert.equal(result.status, 0);
  const escalated = result.stdout.split('\n').filter((line) => line.startsWith('ESCALATIE'));
  assert.deepEqual(escalated.map((line) => line.match(/T-\d+/)[0]), ['T-1003', 'T-1006', 'T-1001']);
});

for (const value of ['onzin', '1', 'November 20', '2026-11-14T12:30:00']) {
  test(`queue weigert --now ${value} met exit code 1`, () => {
    const result = runQueue('--now', value);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Ongeldige tijd voor --now/);
  });
}

test('queue weigert --now zonder waarde en de vorm --now=<tijd>', () => {
  assert.equal(runQueue('--now').status, 1);
  assert.equal(runQueue('--now=2026-11-14T12:30:00Z').status, 1);
});
