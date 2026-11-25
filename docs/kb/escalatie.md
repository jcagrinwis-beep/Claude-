# Wat betekent de markering ESCALATIE in de supportwachtrij?

## Probleem
In de wachtrij (`npm run queue`) staat bij sommige tickets de markering ESCALATIE, en die tickets staan bovenaan. Je wilt weten waarom en wat je ermee moet doen.

## Oorzaak
Elk ticket heeft een SLA-deadline voor de eerste reactie, gerekend vanaf het moment dat het ticket is aangemaakt:

| Prioriteit | Eerste reactie na aanmaak |
|------------|---------------------------|
| urgent     | 1 uur                     |
| high       | 4 uur                     |
| normal     | 24 uur                    |

Is die deadline verstreken, dan is het ticket geëscaleerd. Precies op de deadline telt nog niet als verstreken.

Geëscaleerde tickets staan altijd boven de andere tickets. Binnen elke groep blijft de gewone volgorde gelden: eerst urgent, dan high, dan normal, en bij gelijke prioriteit het oudste ticket eerst.

## Oplossing
1. Open de wachtrij met `npm run queue`.
2. Pak het bovenste ticket met de markering ESCALATIE als eerste op.
3. Stuur de klant een eerste reactie waarin je de volgende stap beschrijft. Noem geen oplostijd of datum.
4. Wil je zien hoe de wachtrij er op een ander moment uitziet, geef dan een tijd mee, bijvoorbeeld `npm run queue -- --now 2026-11-14T12:30:00Z`. Zonder `--now` geldt de huidige klok. Een ongeldige tijd geeft een foutmelding met een voorbeeld van de juiste notatie.
