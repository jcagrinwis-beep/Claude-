'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { login, getAccessToken } = require('../src/oauth');

const cfg = { clientId: 'test-client', tenant: 'consumers' };

function mockFetch(responses) {
  const calls = [];
  global.fetch = async (url, opts) => {
    const params = Object.fromEntries(new URLSearchParams(opts.body));
    calls.push({ url, params });
    const r = responses.shift();
    return { ok: r.ok, json: async () => r.data };
  };
  return calls;
}

function tmpFile(content) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'oauth-')), 'tokens.json');
  if (content) fs.writeFileSync(file, JSON.stringify(content));
  return file;
}

test('login polls until the user has signed in', async () => {
  const calls = mockFetch([
    { ok: true, data: { device_code: 'dc', message: 'ga naar ...', interval: 1, expires_in: 900 } },
    { ok: false, data: { error: 'authorization_pending' } },
    { ok: true, data: { access_token: 'at', refresh_token: 'rt', expires_in: 3600 } },
  ]);
  const tokens = await login(cfg, { log: () => {}, sleep: async () => {} });
  assert.strictEqual(tokens.accessToken, 'at');
  assert.strictEqual(tokens.refreshToken, 'rt');
  assert.match(calls[0].url, /consumers\/oauth2\/v2.0\/devicecode$/);
  assert.match(calls[0].params.scope, /IMAP\.AccessAsUser\.All/);
  assert.match(calls[0].params.scope, /offline_access/);
});

test('login stops on a real error', async () => {
  mockFetch([
    { ok: true, data: { device_code: 'dc', message: '', interval: 1, expires_in: 900 } },
    { ok: false, data: { error: 'authorization_declined', error_description: 'geweigerd' } },
  ]);
  await assert.rejects(login(cfg, { log: () => {}, sleep: async () => {} }), /geweigerd/);
});

test('a valid access token is reused without a request', async () => {
  const calls = mockFetch([]);
  const file = tmpFile({ accessToken: 'still-good', refreshToken: 'rt', expiresAt: Date.now() + 60_000 });
  assert.strictEqual(await getAccessToken(cfg, file), 'still-good');
  assert.strictEqual(calls.length, 0);
});

test('an expired token is refreshed and the rotated refresh token is saved', async () => {
  const calls = mockFetch([{ ok: true, data: { access_token: 'new-at', refresh_token: 'new-rt', expires_in: 3600 } }]);
  const file = tmpFile({ accessToken: 'old', refreshToken: 'old-rt', expiresAt: Date.now() - 1 });
  assert.strictEqual(await getAccessToken(cfg, file), 'new-at');
  assert.strictEqual(calls[0].params.refresh_token, 'old-rt');
  assert.strictEqual(JSON.parse(fs.readFileSync(file, 'utf8')).refreshToken, 'new-rt');
});

test('missing token file asks to log in', async () => {
  await assert.rejects(getAccessToken(cfg, tmpFile()), /npm run login/);
});
