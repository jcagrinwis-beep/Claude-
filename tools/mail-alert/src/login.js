'use strict';

const path = require('node:path');
const { login, saveTokens } = require('./oauth');
const { loadConfig, TOKEN_FILE } = require('./config');

async function main() {
  const config = loadConfig();
  if (!config.imap.oauth || !config.imap.oauth.clientId) {
    console.error('Zet eerst imap.oauth.clientId in config.json (zie README).');
    process.exit(1);
  }
  const tokens = await login(config.imap.oauth);
  saveTokens(TOKEN_FILE, tokens);
  console.log(`Ingelogd. Tokens opgeslagen in ${path.basename(TOKEN_FILE)}.`);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
