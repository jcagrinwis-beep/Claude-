'use strict';

// Pure rule check, so it can be tested without a mailbox.
// Returns { important: boolean|null, reason } — null means "rules don't decide".
function checkRules(mail, rules = {}) {
  const from = (mail.from || '').toLowerCase();
  const text = `${mail.subject || ''}\n${mail.text || ''}`.toLowerCase();

  const ignore = (rules.ignoreSenders || []).find((s) => from.includes(s.toLowerCase()));
  if (ignore) return { important: false, reason: `afzender genegeerd (${ignore})` };

  const vip = (rules.vipSenders || []).find((s) => from.includes(s.toLowerCase()));
  if (vip) return { important: true, reason: `belangrijke afzender (${vip})` };

  const keyword = (rules.keywords || []).find((k) => text.includes(k.toLowerCase()));
  if (keyword) return { important: true, reason: `trefwoord "${keyword}"` };

  return { important: null, reason: 'geen regel van toepassing' };
}

module.exports = { checkRules };
