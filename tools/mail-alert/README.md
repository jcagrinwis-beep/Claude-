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

### Mailbox: Hotmail / Outlook.com / Live (OAuth)

Microsoft staat inloggen met een wachtwoord niet toe, dus het programma logt in via OAuth. Daarvoor heb je eenmalig een eigen app-registratie bij Microsoft nodig (gratis):

1. Ga naar https://entra.microsoft.com (of portal.azure.com) en log in met je Microsoft-account. Vraagt Microsoft om een gratis Azure-account aan te maken, doe dat dan eerst.
2. **App registrations → New registration**
   - Naam: bv. `mail-alert`
   - Supported account types: **Personal Microsoft accounts only**
   - Redirect URI: leeg laten
3. Kopieer de **Application (client) ID** naar `imap.oauth.clientId` in `config.json`.
4. **Authentication → Advanced settings → Allow public client flows: Yes** → Save.
5. **API permissions → Add a permission → APIs my organization uses** → zoek `Office 365 Exchange Online` → Delegated → `IMAP.AccessAsUser.All`. (Zie je die niet: zonder deze stap werkt het bij persoonlijke accounts meestal ook, omdat de toestemming bij het inloggen wordt gevraagd.)
6. Log in:

   ```bash
   npm run login
   ```

   Je krijgt een link en een code. Open de link (mag op je telefoon), vul de code in, log in met je Hotmail-account en geef toestemming. De tokens worden opgeslagen in `tokens.json`; het programma vernieuwt ze zelf. Alleen als je lange tijd (ongeveer 90 dagen) niets draait of je wachtwoord wijzigt, moet je opnieuw `npm run login` doen.

Zorg ook dat IMAP aan staat in Outlook.com: Instellingen → E-mail → Doorsturen en IMAP → **Apparaten en apps toestaan om POP/IMAP te gebruiken**.

### Mailbox: andere providers (wachtwoord)

Zet `imap.auth` op `password`, haal het `oauth`-blok weg en zet het wachtwoord in `IMAP_PASSWORD` in `.env`:
- Gmail: `imap.gmail.com` met een app-wachtwoord (Google-account → Beveiliging → App-wachtwoorden).
- KPN, Ziggo enz.: de IMAP-gegevens van je provider.

### WhatsApp
- **CallMeBot** (gratis, voor persoonlijk gebruik): stuur vanaf je telefoon het activatiebericht naar het CallMeBot-nummer (zie callmebot.com), je krijgt een API-key terug. Zet die in `CALLMEBOT_APIKEY`.
- **Twilio** (betaald, betrouwbaarder): zet `provider` op `twilio` en vul de Twilio-gegevens in `.env`.
- **console**: drukt het bericht alleen af. Handig om eerst te testen.

## Draaien

```bash
npm run login  # eenmalig, alleen bij Hotmail/Outlook
npm run once   # één keer controleren
npm start      # blijft draaien en controleert elke pollMinutes minuten
```

Bij de eerste run wordt bestaande mail overgeslagen; daarna wordt alleen nieuwe mail bekeken. De voortgang staat in `state.json`.

Het programma moet ergens blijven draaien: een computer die aan staat, een Raspberry Pi of een kleine server. Gebruik bijvoorbeeld `pm2`, een systemd-service of een cronjob met `npm run once`.

`config.json`, `.env`, `tokens.json` en `state.json` worden niet in git gezet. Deel `tokens.json` met niemand: daarmee kan iemand je mail lezen.
