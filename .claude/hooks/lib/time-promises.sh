#!/usr/bin/env bash
# Gedeelde patronen voor tijdsbeloftes aan klanten, zoals "binnen 24 uur" of "vandaag nog".
# Gebruikt door .claude/hooks/time-promise-guard.sh (kennisbankartikelen) en
# scripts/check-drafts.sh (conceptantwoorden uit scripts/bulk-triage.sh).
#
# Bewust niet gevangen: "direct" en "meteen". Die staan vaak in stappen
# ("je ziet meteen het menu") en zijn daar geen belofte van support.

# Print de gevonden tijdsbeloftes in $1 als komma-gescheiden lijst; leeg als er geen zijn.
find_time_promises() {
  local text=$1 num unit day p hit found=""
  num='([0-9]+|een|één|twee|drie|vier|vijf|zes|zeven|acht|negen|tien|enkele|paar)'
  unit='(minuut|minuten|kwartier|uur|uren|dag|dagen|werkdag|werkdagen|week|weken)'
  day='(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|morgen|vandaag)'
  local patterns=(
    "\bbinnen (het |de )?$num $unit\b"
    "\bzo (snel|spoedig) mogelijk\b"
    "\bvandaag nog\b"
    "\b(over)?morgen\b"
    "\buiterlijk (op |om )?($day|[0-9])"
    "\b(voor|vóór|aan) het eind(e)? van (de|deze) (dag|week|middag|ochtend)\b"
  )
  for p in "${patterns[@]}"; do
    hit=$(grep -oiE "$p" <<<"$text" | head -1)
    [ -n "$hit" ] && found="$found${found:+, }\"$hit\""
  done
  printf '%s' "$found"
}
