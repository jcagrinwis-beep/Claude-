# support-toolkit

Vangnetten en helpers voor een supportdesk, gebundeld uit het oefenproject Support Desk Dojo.

## Onderdelen

| Onderdeel | Soort | Wat het doet |
|---|---|---|
| `guard.sh` | hook (PreToolUse) | Blokkeert recursief geforceerd verwijderen met `rm`, `find -delete` en wijzigingen aan `.env`-bestanden. |
| `pii-guard.sh` | hook (PreToolUse) | Blokkeert Write en Edit met echte e-mailadressen; `@example.com` mag wel. |
| `code-reviewer` | subagent | Reviewt code en diffs op concrete bugs. |
| `ticket-triager` | subagent | Beoordeelt tickets uit `data/tickets.json` en schrijft een conceptantwoord. |

Agents uit een plugin krijgen de pluginnaam als voorvoegsel, bijvoorbeeld `support-toolkit:code-reviewer`. Ze botsen dus niet met agents van dezelfde naam in een project.

## Installeren

Vanuit de hoofdmap van deze repository, die ook de marketplace bevat:

```bash
claude plugin marketplace add ./
claude plugin install support-toolkit@support-desk-dojo
```

### Automatisch aan in deze repository

`.claude/settings.json` zet de plugin aan met `enabledPlugins`. Dat werkt zodra de marketplace `support-desk-dojo` geregistreerd is; anders slaat Claude Code de plugin over ("marketplace not registered"). Lokaal is `claude plugin marketplace add ./` dus één keer genoeg. In de cloud doet de omgeving `Claude-` dat in haar setup-script bij elke nieuwe sessie.

## Vereisten

`bash` en `jq` moeten geïnstalleerd zijn; de hooks gebruiken ze om de invoer van Claude Code te lezen.
