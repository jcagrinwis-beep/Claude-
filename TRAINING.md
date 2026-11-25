# Trainingsplan: Claude Code op "Deep"-niveau

Vijf sessies van ongeveer een uur. Elke sessie behandelt één of twee onderdelen en eindigt met iets dat aantoonbaar werkt. Het oefenproject is een kleine supportdesk-tool: tickets classificeren, SLA-deadlines berekenen en de wachtrij sorteren.

**Zo werk je:** open deze repo in Claude Code, typ de prompt uit de oefening en controleer het resultaat tegen "Klaar als". Laat Claude het werk doen, maar lees elk bestand dat het aanmaakt: daar zit het leren.

## Wat er al staat

| Onderdeel | Bestand | Wat het doet |
|---|---|---|
| Hook (PreToolUse) | `plugins/support-toolkit/hooks/guard.sh` | Blokkeert `rm -rf` en wijzigingen aan `.env` |
| Hook (PostToolUse) | `.claude/hooks/check-js.sh` | Syntaxcheck en tests na elke wijziging aan een `.js`-bestand |
| Subagent | `plugins/support-toolkit/agents/code-reviewer.md` | Read-only reviewer die alleen concrete bugs meldt |
| Subagent | `plugins/support-toolkit/agents/ticket-triager.md` | Beoordeelt tickets en schrijft een conceptantwoord |
| Rule | `.claude/rules/broncode.md` | Laadt alleen bij werk in `src/` en `test/` |
| Rule | `.claude/rules/klantdata.md` | Laadt alleen bij werk in `data/` |

De hooks zijn geregistreerd in `.claude/settings.json`. Bekijk met `/hooks` welke hooks actief zijn.

## Sessie 0: opwarmen (15 minuten)

Controleer of de basis zit voordat je dieper gaat.

1. Draai `npm test` en `npm run queue`. Bekijk de uitvoer van de wachtrij: klopt de volgorde? (Nee. Onthoud wat je opvalt, dat komt terug in sessie 2.)
2. Typ `/memory` en kijk welke bestanden geladen zijn.
3. Zet plan mode aan (Shift+Tab) en vraag: `Leg uit hoe een ticket van data/tickets.json tot een regel in de wachtrij komt.`

**Klaar als:** je kunt uitleggen wat `classifyTicket`, `slaDeadline` en `sortQueue` beloven te doen.

## Sessie 1: hooks

Kernidee: een instructie in CLAUDE.md is een verzoek aan het model, een hook wordt altijd uitgevoerd door de harness.

### 1.1 Zie de bewaker werken
Prompt: `Verwijder de map data met rm -rf.`

**Klaar als:** de actie wordt geblokkeerd en Claude de melding uit `guard.sh` terugkrijgt. Lees daarna `guard.sh` en zoek op waar de exit code 2 vandaan komt.

Let op: de bewaker zoekt in de hele commandotekst. Ook een onschuldig commando dat de tekst `rm -rf` alleen maar noemt, wordt geblokkeerd. Dat is een bekende zwakte van hooks op basis van tekstpatronen; bedenk hoe je dat preciezer zou maken.

### 1.2 Zie de feedbacklus werken
Prompt: `Hernoem in src/triage.js de functie classify naar classifyTicket, maar pas de rest nog niet aan.`

**Klaar als:** de PostToolUse-hook de falende tests meldt en Claude uit zichzelf de overige verwijzingen herstelt. Draai de wijziging daarna terug met `/rewind`.

### 1.3 Bouw je eigen hook: de PII-bewaker
Supportteams werken met klantgegevens. Bouw een hook die voorkomt dat er e-mailadressen in de repo belanden.

Prompt: `Maak een PreToolUse-hook .claude/hooks/pii-guard.sh die Write en Edit blokkeert als de nieuwe inhoud een e-mailadres bevat. Adressen op @example.com zijn toegestaan. Registreer hem in .claude/settings.json en test hem met een echte en een toegestane invoer.`

**Klaar als:** een ticket met `jan@bedrijf.nl` wordt geweigerd en een ticket met `jan@example.com` wordt geaccepteerd.

### 1.4 Bonus: een auditlog
Prompt: `Maak een hook die elk Bash-commando met tijdstip toevoegt aan .claude/audit.log en zet dat bestand in .gitignore.`

**Klaar als:** het logbestand groeit terwijl je werkt. Vraag jezelf af: welk event is hiervoor het meest geschikt, en waarom?

## Sessie 2: subagents

Kernidee: een subagent heeft een eigen context, eigen tools en een eigen opdracht. Je hoofdgesprek krijgt alleen de conclusie.

### 2.1 De bugjacht
In `src/triage.js` zitten drie bugs. De tests zijn groen.

Prompt: `Laat de code-reviewer subagent src/triage.js en de tests reviewen.`

**Klaar als:** de reviewer drie bugs meldt met bestand en regel. Vergelijk daarna met `oefeningen/OPLOSSINGEN.md`. Vond hij ze niet alle drie? Scherp dan de prompt in `.claude/agents/code-reviewer.md` aan en probeer opnieuw. Dat aanscherpen is de eigenlijke oefening.

### 2.2 Eerst de test, dan de fix
Prompt: `Schrijf voor elke gevonden bug eerst een falende test en los de bug daarna op. Eén bug per keer.`

**Klaar als:** `npm test` groen is en `npm run queue` de urgente tickets bovenaan toont met een deadline één uur na aanmaak.

### 2.3 Triage als een collega
Prompt: `Laat de ticket-triager de tickets T-1003 en T-1006 beoordelen.`

**Klaar als:** je per ticket een prioriteit, categorie, ontbrekende informatie en een conceptantwoord krijgt. Pas daarna de agent aan zodat hij ook een inschatting geeft van het klantsentiment.

### 2.4 Bouw je eigen subagent
Prompt: `Maak een subagent kb-schrijver die van een opgelost ticket een kennisbankartikel maakt in docs/kb/, met de kopjes Probleem, Oorzaak en Oplossing. Hij mag alleen lezen en in docs/kb/ schrijven.`

**Klaar als:** er een artikel staat voor T-1004 en de agent geen bestanden buiten `docs/kb/` heeft aangeraakt. Hoe dwing je dat laatste af: met de prompt, met `tools`, of met een hook?

## Sessie 3: rules en output styles

Kernidee: rules bepalen wát Claude weet per deel van de codebase, output styles bepalen hóé Claude antwoordt.

### 3.1 Zie een rule laden
Prompt: `Voeg een ticket toe aan data/tickets.json van een klant met een trage app.`

**Klaar als:** het nieuwe ticket een geldig ID en een UTC-tijdstip heeft en fictief is, zonder dat je dat hebt gevraagd. Controleer met `/memory` welke rule geladen is.

### 3.2 Schrijf je eigen rule
Prompt: `Maak een rule voor docs/kb/**: artikelen zijn in het Nederlands, maximaal 300 woorden, spreken de klant aan met "je" en bevatten nooit interne ticket-ID's.`

**Klaar als:** een nieuw kennisbankartikel aan alle vier de eisen voldoet.

### 3.3 Maak een output style
Prompt: `Maak een output style "supportcoach" in .claude/output-styles/. In deze stijl legt Claude bij elke wijziging in twee zinnen uit wat een supportmedewerker ervan merkt, en sluit af met één controlevraag aan mij.`

**Klaar als:** je de stijl kunt kiezen via `/config` en het gedrag ziet veranderen. Zet hem daarna terug op de standaard.

### 3.4 Denkvraag
Je wilt dat Claude nooit een oplostijd belooft aan klanten. Hoort dat in CLAUDE.md, een rule, een output style, de subagent of een hook? Beargumenteer je keuze en bouw hem.

## Sessie 4: status line en plugins

### 4.1 Status line
Prompt: `/statusline toon het model, de huidige git-branch en het percentage gebruikte context.`

**Klaar als:** de regel onderin zichtbaar is. Lees het gegenereerde script en voeg zelf het aantal open tickets uit `data/tickets.json` toe.

### 4.2 Verken plugins
Typ `/plugin` en bekijk wat er beschikbaar is. Installeer er één, bekijk welke skills, agents en hooks hij meebrengt en verwijder hem weer.

**Klaar als:** je kunt uitleggen uit welke onderdelen die plugin bestaat.

### 4.3 Maak je eigen plugin
Prompt: `Bundel de guard-hook, de PII-bewaker, de code-reviewer en de ticket-triager tot een plugin "support-toolkit" in de map plugins/support-toolkit, met een geldige plugin.json.`

**Klaar als:** de plugin lokaal te installeren is en de onderdelen werken in een andere, lege map.

## Sessie 5: eindopdracht

Bouw een nieuwe functie van begin tot eind en gebruik daarbij alles uit de vorige sessies.

**Opdracht:** voeg escalatie toe. Een ticket waarvan de SLA-deadline is verstreken, krijgt de markering `ESCALATIE` in de wachtrij en komt bovenaan te staan.

Eisen:
1. Begin in plan mode en laat het plan goedkeuren voordat er code komt.
2. De hooks blijven aan; tests worden eerst geschreven.
3. De `code-reviewer` beoordeelt het resultaat voordat je commit.
4. De `kb-schrijver` maakt een kort artikel over hoe escalatie werkt.
5. Je PII-bewaker heeft onderweg niets hoeven blokkeren.

**Klaar als:** `npm test` groen is, `npm run queue` de escalaties toont en je aan een collega kunt uitleggen welk onderdeel waarvoor zorgde.

## Zelftest: ben je "Deep"?

Je bent er als je deze vragen zonder opzoeken kunt beantwoorden:

- Wat is het verschil tussen exit code 0, 1 en 2 in een hook?
- Wanneer kies je een hook boven een regel in CLAUDE.md?
- Waarom beperk je de tools van een subagent?
- Wat is het voordeel van een rule met `paths` boven een langere CLAUDE.md?
- Wat verandert een output style precies, en wat niet?
- Welke onderdelen kan een plugin bevatten?

## Vervolg: richting "Dark"

Op "Deep"-niveau stuur je Claude zelf aan in een gesprek. Op "Dark"-niveau draait Claude ook zonder dat jij erbij zit: in scripts, gekoppeld aan je eigen systemen en in CI. De vangnetten uit sessie 1 tot en met 4 worden dan belangrijker, omdat niemand meer meekijkt.

## Sessie 6: non-interactive mode (`claude -p`)

Kernidee: `claude -p "<prompt>"` draait één opdracht zonder gesprek en schrijft het resultaat naar stdout. Zo wordt Claude een onderdeel van een script. Er is niemand om toestemming te geven, dus je bepaalt vooraf welke tools mogen.

### 6.1 Eén ticket, één commando
Draai in de terminal:

```bash
claude -p "Geef de prioriteit en een conceptantwoord voor ticket T-1004 uit data/tickets.json." --allowedTools "Read"
```

**Klaar als:** je het antwoord in de terminal krijgt zonder dat er een gesprek opent. Draai het daarna nog eens met `--output-format json` en bekijk welke velden je terugkrijgt naast het antwoord zelf (kosten, aantal beurten, sessie-ID).

### 6.2 Triage in bulk
Prompt: `Maak scripts/bulk-triage.sh die voor elk ticket in data/tickets.json claude -p aanroept met alleen leesrechten, en per ticket een JSON-regel met id, prioriteit, categorie en conceptantwoord wegschrijft naar out/triage.jsonl. Zet out/ in .gitignore.`

**Klaar als:** `out/triage.jsonl` zeven regels bevat die je met `node -e` of `jq` kunt inlezen. Vergelijk de prioriteiten met `npm run queue`: waar zijn Claude en `classifyTicket` het oneens, en wie heeft gelijk?

### 6.3 Het vangnet in een script
De hook `time-promise-guard.sh` bewaakt alleen bestanden in `docs/kb/`. De conceptantwoorden uit 6.2 vallen daarbuiten.

Prompt: `Laat scripts/bulk-triage.sh na afloop elk conceptantwoord controleren op tijdsbeloftes, met hetzelfde patroon als time-promise-guard.sh, en stop met exit code 1 als er één gevonden wordt.`

**Klaar als:** het script faalt zodra je in een testantwoord "binnen 24 uur" zet. Denkvraag: waarom kun je in een script niet vertrouwen op CLAUDE.md alleen?

## Sessie 7: een eigen MCP-server

Kernidee: met MCP geef je Claude gereedschap voor je eigen systemen. Claude leest dan niet meer het bestand `data/tickets.json`, maar vraagt het "ticketsysteem" om gegevens via tools met een vaste vorm.

### 7.1 Een leesserver
Prompt: `Maak in mcp/ticket-server.js een MCP-server over stdio, met alleen ingebouwde Node-modules, met twee tools: list_tickets (id, klant, onderwerp, prioriteit, escalatie) en get_ticket (alles van één ticket). Hergebruik classifyTicket en isEscalated uit src/triage.js. Registreer hem in .mcp.json.`

**Klaar als:** `/mcp` de server als verbonden toont en de prompt `Welke tickets zijn geëscaleerd?` via `list_tickets` wordt beantwoord, niet door het JSON-bestand te lezen. Waarom zonder SDK? Zo zie je het JSON-RPC-protocol zelf, en blijft de repo vrij van dependencies.

### 7.2 Een schrijftool met een vangnet
Prompt: `Voeg een tool add_note toe die een interne notitie bij een ticket opslaat in data/notes.json. Weiger notities met een e-mailadres buiten @example.com.`

**Klaar als:** een notitie met een adres op een echt domein wordt geweigerd en een notitie met een adres op `@example.com` wordt opgeslagen. Denkvraag: de PII-bewaker uit sessie 1 ziet deze schrijfactie niet. Waarom niet, en waar hoort de controle dus thuis?

### 7.3 Rechten per tool
Zet in `.claude/settings.json` `list_tickets` en `get_ticket` op toegestaan, en laat `add_note` om bevestiging vragen.

**Klaar als:** lezen zonder vraag gebeurt en schrijven om je akkoord vraagt. Kijk in `/permissions` hoe de MCP-tools heten (`mcp__<server>__<tool>`).

## Sessie 8: Claude in GitHub Actions

Kernidee: in CI reviewt Claude elke pull request automatisch, met dezelfde agents en regels als in je terminal. De repo is de enige bron van afspraken.

### 8.1 Installeren
Draai `/install-github-app` in Claude Code en volg de stappen. Daarmee komen de GitHub-app, het secret `ANTHROPIC_API_KEY` en een workflow in `.github/workflows/` in de repo.

**Klaar als:** de workflow op GitHub staat en een opmerking met `@claude` in een pull request een reactie oplevert.

### 8.2 Automatische review met je eigen reviewer
Prompt: `Pas de workflow aan zodat Claude bij elke pull request op src/ of test/ automatisch reviewt met de instructies uit plugins/support-toolkit/agents/code-reviewer.md, en npm test draait voordat de review begint.`

**Klaar als:** een pull request met een opzettelijke bug (bijvoorbeeld `>=` in plaats van `>` in `isEscalated`) een reviewopmerking krijgt op de juiste regel.

### 8.3 Denkvraag: wat neemt CI mee?
Welke onderdelen van deze repo werken in GitHub Actions vanzelf mee, en welke niet? Denk aan CLAUDE.md, rules, hooks in `.claude/settings.json`, de plugin (die een geregistreerde marketplace nodig heeft) en de status line.

**Klaar als:** je per onderdeel kunt zeggen of het in CI actief is, en voor de plugin-hooks een manier hebt bedacht om ze daar toch aan te zetten.

## Zelftest: ben je "Dark"?

- Waarom geef je bij `claude -p` altijd `--allowedTools` mee?
- Wat is het verschil tussen Claude een bestand laten lezen en Claude een MCP-tool geven?
- Waarom ziet een PreToolUse-hook op `Write` een schrijfactie via een MCP-tool niet?
- Welke afspraken gelden in CI vanzelf, en welke moet je expliciet meegeven?
