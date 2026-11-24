'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const STATE_FILE = path.join(ROOT, 'state.json');
const TOKEN_FILE = path.join(ROOT, 'tokens.json');

function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

function loadConfig() {
  loadEnv();
  const file = path.join(ROOT, 'config.json');
  if (!fs.existsSync(file)) {
    console.error('config.json ontbreekt: kopieer config.example.json naar config.json en vul het in.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

module.exports = { loadConfig, STATE_FILE, TOKEN_FILE };
