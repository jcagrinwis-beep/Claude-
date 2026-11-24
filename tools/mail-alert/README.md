# mail-alert

Leest je mailbox (IMAP) elke paar minuten uit en stuurt je een WhatsApp-bericht als er belangrijke mail binnenkomt. Je mail blijft ongelezen in je mailprogramma.

## Hoe bepaalt het wat belangrijk is?

1. **Regels** in `config.json` (gaan altijd voor):
   - `ignoreSenders`: nooit melden (bv. nieuwsbrieven)
   - `vipSenders`: altijd melden (volledig adres of een domein als `@belastingdienst.nl`)
   - `keywords`: melden als het woord in onderwerp of tekst staat
2. **Claude** (optioneel, `claude.enabled: true`): beoordeelt de mail waar geen regel op past, aan de hand van jouw `instructions`. Let op: dan gaat de inhoud van die mails naar de Claude API.

## Installeren

```bash
cd tools/mail-alert
npm install
cp config.example.json config.json
cp .env.example .env
```

Vul daarna `config.json` en `.env` in.

### Mailbox
Gebruik een **app-wachtwoord**, niet je gewone wachtwoord:
- Gmail: `imap.gmail.com`, app-wachtwoord via Google-account → Beveiliging → App-wachtwoorden (tweestapsverificatie moet aan staan).
- Outlook.com/Hotmail/Live: `outlook.office365.com`. Microsoft staat inloggen met alleen een wachtwoord niet meer overal toe; werkt het niet, dan is OAuth nodig (zit hier nog niet in).
- KPN, Ziggo enz.: de IMAP-gegevens van je provider.

### WhatsApp
- **CallMeBot** (gratis, voor persoonlijk gebruik): stuur vanaf je telefoon het activatiebericht naar het CallMeBot-nummer (zie callmebot.com), je krijgt een API-key terug. Zet die in `CALLMEBOT_APIKEY`.
- **Twilio** (betaald, betrouwbaarder): zet `provider` op `twilio` en vul de Twilio-gegevens in `.env`.
- **console**: drukt het bericht alleen af. Handig om eerst te testen.

## Draaien

```bash
npm run once   # één keer controleren
npm start      # blijft draaien en controleert elke pollMinutes minuten
```

Bij de eerste run wordt bestaande mail overgeslagen; daarna wordt alleen nieuwe mail bekeken. De voortgang staat in `state.json`.

Het programma moet ergens blijven draaien: een computer die aan staat, een Raspberry Pi of een kleine server. Gebruik bijvoorbeeld `pm2`, een systemd-service of een cronjob met `npm run once`.

`config.json`, `.env` en `state.json` worden niet in git gezet.
