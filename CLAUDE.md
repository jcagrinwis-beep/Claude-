# Support Desk Dojo

Oefenproject om Claude Code op "Deep"-niveau te leren. Het trainingsplan staat in `TRAINING.md`.

- `npm test` draait de tests, `npm run queue` toont de ticketwachtrij.
- De drie geplante bugs in `src/triage.js` zijn opgelost in oefening 2.2. Bekende open punt: trefwoorden matchen ook binnen andere woorden ("spinnen" bevat "pinnen"); dat is een productkeuze en bewust nog niet aangepast.
- Schrijf documentatie en uitleg in het Nederlands, code en identifiers in het Engels.
- Beloof een klant nooit wanneer iets opgelost is: geen oplostijd, geen deadline, geen "zo snel mogelijk". Dit geldt voor elke tekst die een klant kan lezen (conceptantwoorden, kennisbankartikelen, e-mails). Beschrijf alleen de volgende stap. In `docs/kb/` dwingt `.claude/hooks/time-promise-guard.sh` dit af.
