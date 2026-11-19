#!/usr/bin/env bash
# PreToolUse-hook: blokkeert Write en Edit op kennisbankartikelen (docs/kb/**/*.md)
# als de nieuwe tekst een tijdsbelofte bevat, zoals "binnen 24 uur" of "vandaag nog".
#
# Waarom alleen docs/kb? Dat is de enige plek waar klanttekst in een bestand belandt.
# Conceptantwoorden van de ticket-triager zijn chattekst; daar kan een PreToolUse-hook
# niet bij. Die vallen onder CLAUDE.md en de prompt van de triager.
#
# Bewust niet geblokkeerd: "direct" en "meteen". Die staan vaak in stappen
# ("je ziet meteen het menu") en zijn daar geen belofte van support.
input=$(cat)

path=$(jq -r '.tool_input.file_path // ""' <<<"$input")
root=$(realpath -m "${CLAUDE_PROJECT_DIR:-.}")
case "$path" in
  /*) full=$(realpath -m "$path") ;;
  *) full=$(realpath -m "$root/$path") ;;
esac
case "$full" in
  "$root"/docs/kb/*.md) ;;
  *) exit 0 ;;
esac

content=$(jq -r '
  [ .tool_input.content,
    .tool_input.new_string,
    (.tool_input.edits // [] | .[].new_string)
  ] | map(select(. != null)) | join("\n")
' <<<"$input")

num='([0-9]+|een|één|twee|drie|vier|vijf|zes|zeven|acht|negen|tien|enkele|paar)'
unit='(minuut|minuten|kwartier|uur|uren|dag|dagen|werkdag|werkdagen|week|weken)'
day='(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|morgen|vandaag)'
patterns=(
  "\bbinnen (het |de )?$num $unit\b"
  "\bzo (snel|spoedig) mogelijk\b"
  "\bvandaag nog\b"
  "\b(over)?morgen\b"
  "\buiterlijk (op |om )?($day|[0-9])"
  "\b(voor|vóór|aan) het eind(e)? van (de|deze) (dag|week|middag|ochtend)\b"
)

found=""
for p in "${patterns[@]}"; do
  hit=$(grep -oiE "$p" <<<"$content" | head -1)
  [ -n "$hit" ] && found="$found${found:+, }\"$hit\""
done

if [ -n "$found" ]; then
  echo "Geblokkeerd door time-promise-guard.sh: $(basename "$full") bevat een tijdsbelofte ($found)." >&2
  echo "Beloof klanten nooit wanneer iets opgelost is. Beschrijf de volgende stap, bijvoorbeeld \"neem contact op met support\"." >&2
  exit 2
fi
exit 0
