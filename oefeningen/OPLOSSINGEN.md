# Oplossingen (spoilers)

Lees dit pas nadat je oefening 2.1 hebt gedaan.

## De drie bugs in `src/triage.js`

1. **`classify` is hoofdlettergevoelig.** De tekst wordt niet naar kleine letters omgezet, dus een ticket met alleen "COMPLETE OUTAGE" of "Error bij betalen" wordt `normal`. Oplossing: `.toLowerCase()` op de tekst.
2. **`slaDeadline` rekent in minuten.** `SLA_HOURS[priority] * 60 * 1000` is uren maal één minuut. Een urgent ticket krijgt zo een deadline van één minuut en een normaal ticket van 24 minuten. Oplossing: `* 60 * 60 * 1000`.
3. **`sortQueue` sorteert alfabetisch.** Als tekst geldt `'high' < 'normal' < 'urgent'`, dus urgente tickets staan onderaan. Oplossing: een expliciete rangorde, bijvoorbeeld `{ urgent: 0, high: 1, normal: 2 }`.

## Waarom de tests groen waren

Elke test controleert iets dat ook met de bug waar is: een trefwoord in kleine letters, een deadline die "later" is, een lijst van dezelfde lengte. Groene tests bewijzen alleen wat ze daadwerkelijk afdwingen.
