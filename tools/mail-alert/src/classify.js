'use strict';

const { checkRules } = require('./rules');

async function askClaude(mail, claudeCfg) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY ontbreekt');

  const prompt = [
    'Beoordeel of deze e-mail belangrijk is voor de ontvanger.',
    `Criteria van de ontvanger: ${claudeCfg.instructions}`,
    'Antwoord met alleen JSON: {"important": true|false, "summary": "max 15 woorden, Nederlands"}',
    '',
    `Van: ${mail.from}`,
    `Onderwerp: ${mail.subject}`,
    '',
    (mail.text || '').slice(0, 4000),
  ].join('\n');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: claudeCfg.model || 'claude-haiku-5-5',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const raw = data.content.map((c) => c.text || '').join('');
  const json = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
  return { important: Boolean(json.important), reason: json.summary || 'volgens Claude' };
}

// Rules decide first; Claude only judges mail that the rules leave open.
async function classify(mail, config) {
  const byRules = checkRules(mail, config.rules);
  if (byRules.important !== null) return byRules;
  if (config.claude && config.claude.enabled) return askClaude(mail, config.claude);
  return { important: false, reason: byRules.reason };
}

module.exports = { classify };
