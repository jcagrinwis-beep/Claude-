---
paths:
  - "docs/kb/**"
---

# Regels voor kennisbankartikelen

Kennisbankartikelen zijn bedoeld voor klanten, niet voor collega's.

- **Taal:** altijd Nederlands, ook als het ticket of de notities in een andere taal zijn.
- **Lengte:** maximaal 300 woorden, inclusief kopjes. Is er meer nodig, splits het onderwerp dan in twee artikelen.
- **Aanspreekvorm:** spreek de klant aan met "je" en "jouw", nooit met "u". Ook in titels en stappen.
- **Geen interne verwijzingen:** nooit ticket-ID's (zoals `T-1004`), klantnamen, namen van medewerkers of interne systemen. Een artikel moet voor elke klant kloppen.
- **Geen tijdsbeloftes:** nooit "binnen 24 uur", "vandaag nog", "zo snel mogelijk" of een dag of datum waarop iets opgelost is. Verwijs naar de volgende stap, bijvoorbeeld "neem contact op met support". De hook `time-promise-guard.sh` blokkeert zulke tekst.
