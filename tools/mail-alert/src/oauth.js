'use strict';

// OAuth2 for Outlook.com / Hotmail / Live via Microsoft's device code flow:
// the user opens a URL, enters a code and signs in; no local web server needed.
const fs = require('node:fs');

const SCOPE = 'https://outlook.office.com/IMAP.AccessAsUser.All offline_access';

function endpoint(tenant, kind) {
  return `https://login.microsoftonline.com/${tenant || 'consumers'}/oauth2/v2.0/${kind}`;
}

async function post(url, params) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  return { ok: res.ok, data: await res.json() };
}

function toTokens(data, now = Date.now()) {
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    // Refresh one minute early so a token never expires mid-check.
    expiresAt: now + (data.expires_in - 60) * 1000,
  };
}

async function login(oauthCfg, { log = console.log, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  const start = await post(endpoint(oauthCfg.tenant, 'devicecode'), { client_id: oauthCfg.clientId, scope: SCOPE });
  if (!start.ok) throw new Error(`Inloggen starten mislukt: ${start.data.error_description || start.data.error}`);
  log(start.data.message);

  let interval = (start.data.interval || 5) * 1000;
  const deadline = Date.now() + start.data.expires_in * 1000;
  while (Date.now() < deadline) {
    await sleep(interval);
    const res = await post(endpoint(oauthCfg.tenant, 'token'), {
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      client_id: oauthCfg.clientId,
      device_code: start.data.device_code,
    });
    if (res.ok) return toTokens(res.data);
    if (res.data.error === 'authorization_pending') continue;
    if (res.data.error === 'slow_down') { interval += 5000; continue; }
    throw new Error(`Inloggen mislukt: ${res.data.error_description || res.data.error}`);
  }
  throw new Error('Inloggen verlopen: de code is niet op tijd ingevoerd.');
}

// Returns a valid access token, refreshing (and saving) when needed.
async function getAccessToken(oauthCfg, tokenFile) {
  if (!fs.existsSync(tokenFile)) throw new Error('Nog niet ingelogd: draai eerst `npm run login`.');
  const tokens = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
  if (tokens.accessToken && Date.now() < tokens.expiresAt) return tokens.accessToken;

  const res = await post(endpoint(oauthCfg.tenant, 'token'), {
    grant_type: 'refresh_token',
    client_id: oauthCfg.clientId,
    refresh_token: tokens.refreshToken,
    scope: SCOPE,
  });
  if (!res.ok) {
    throw new Error(`Token vernieuwen mislukt (${res.data.error}); draai opnieuw \`npm run login\`.`);
  }
  // Microsoft may rotate the refresh token; keep the old one if none is returned.
  const fresh = toTokens(res.data);
  fresh.refreshToken = fresh.refreshToken || tokens.refreshToken;
  saveTokens(tokenFile, fresh);
  return fresh.accessToken;
}

function saveTokens(tokenFile, tokens) {
  fs.writeFileSync(tokenFile, JSON.stringify(tokens, null, 2), { mode: 0o600 });
}

module.exports = { login, getAccessToken, saveTokens, SCOPE };
