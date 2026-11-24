'use strict';

async function sendCallMeBot(to, text) {
  const apikey = process.env.CALLMEBOT_APIKEY;
  if (!apikey) throw new Error('CALLMEBOT_APIKEY ontbreekt');
  const url = new URL('https://api.callmebot.com/whatsapp.php');
  url.searchParams.set('phone', to);
  url.searchParams.set('text', text);
  url.searchParams.set('apikey', apikey);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CallMeBot ${res.status}: ${await res.text()}`);
}

async function sendTwilio(to, text) {
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM: from } = process.env;
  if (!sid || !token || !from) throw new Error('TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN of TWILIO_FROM ontbreekt');
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: from, To: `whatsapp:${to}`, Body: text }),
  });
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${await res.text()}`);
}

async function sendWhatsApp(cfg, text) {
  if (cfg.provider === 'twilio') return sendTwilio(cfg.to, text);
  if (cfg.provider === 'callmebot') return sendCallMeBot(cfg.to, text);
  if (cfg.provider === 'console') return console.log(`[whatsapp → ${cfg.to}] ${text}`);
  throw new Error(`Onbekende WhatsApp-provider: ${cfg.provider}`);
}

module.exports = { sendWhatsApp };
