'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { classify } = require('./classify');
const { sendWhatsApp } = require('./whatsapp');

const ROOT = path.join(__dirname, '..');
const STATE_FILE = path.join(ROOT, 'state.json');

function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return {}; }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function checkMailbox(config, state) {
  const client = new ImapFlow({
    host: config.imap.host,
    port: config.imap.port || 993,
    secure: config.imap.secure !== false,
    auth: { user: config.imap.user, pass: process.env.IMAP_PASSWORD },
    logger: false,
  });
  await client.connect();
  const lock = await client.getMailboxLock(config.imap.mailbox || 'INBOX');
  try {
    const box = client.mailbox;
    // A new UIDVALIDITY means the server renumbered the mailbox: start over from "now".
    if (state.uidValidity !== String(box.uidValidity) || !state.lastUid) {
      state.uidValidity = String(box.uidValidity);
      state.lastUid = box.uidNext - 1;
      console.log(`Eerste run: bestaande mail overgeslagen, vanaf nu wordt nieuwe mail bekeken.`);
      return;
    }

    const messages = [];
    // `source` is fetched with BODY.PEEK, so mail stays unread in your mail app.
    for await (const msg of client.fetch(`${state.lastUid + 1}:*`, { uid: true, source: true }, { uid: true })) {
      if (msg.uid > state.lastUid) messages.push(msg);
    }

    for (const msg of messages) {
      const parsed = await simpleParser(msg.source);
      const mail = {
        from: parsed.from ? parsed.from.text : '',
        subject: parsed.subject || '(geen onderwerp)',
        text: parsed.text || '',
      };
      const verdict = await classify(mail, config);
      console.log(`${verdict.important ? '!!' : '  '} ${mail.from} — ${mail.subject} (${verdict.reason})`);
      if (verdict.important) {
        await sendWhatsApp(config.whatsapp, `📧 Belangrijke mail\nVan: ${mail.from}\nOnderwerp: ${mail.subject}\nWaarom: ${verdict.reason}`);
      }
      state.lastUid = msg.uid;
      saveState(state);
    }
  } finally {
    lock.release();
    await client.logout();
  }
}

async function main() {
  loadEnv();
  const configFile = path.join(ROOT, 'config.json');
  if (!fs.existsSync(configFile)) {
    console.error('config.json ontbreekt: kopieer config.example.json naar config.json en vul het in.');
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  if (!process.env.IMAP_PASSWORD) {
    console.error('IMAP_PASSWORD ontbreekt: zet het in .env.');
    process.exit(1);
  }
  const once = process.argv.includes('--once');

  do {
    const state = loadState();
    try {
      await checkMailbox(config, state);
      saveState(state);
    } catch (err) {
      console.error(`Fout bij controleren: ${err.message}`);
      if (once) process.exitCode = 1;
    }
    if (!once) await new Promise((r) => setTimeout(r, (config.pollMinutes || 5) * 60_000));
  } while (!once);
}

main();
