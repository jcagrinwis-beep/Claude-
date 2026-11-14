---
paths:
  - "src/**/*.js"
  - "test/**/*.js"
---

# Regels voor broncode en tests

- Geen externe dependencies: alleen ingebouwde Node-modules.
- Elke geëxporteerde functie heeft een JSDoc-regel die het gedrag beschrijft.
- Elke gedragswijziging krijgt een test in `test/` die zonder de wijziging faalt.
- Tijden altijd in UTC rekenen; reken met milliseconden via benoemde constanten.
