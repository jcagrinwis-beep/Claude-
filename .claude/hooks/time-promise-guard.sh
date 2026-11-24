#!/usr/bin/env bash
# PreToolUse-hook: blokkeert Write en Edit op kennisbankartikelen (docs/kb/**/*.md)
# als de nieuwe tekst een tijdsbelofte bevat, zoals "binnen 24 uur" of "vandaag nog".
#
# Waarom alleen docs/kb? Dat is de enige plek waar klanttekst in een bestand belandt.
# Conceptantwoorden van de ticket-triager zijn chattekst; daar kan een PreToolUse-hook
# niet bij. Die vallen onder CLAUDE.md, de prompt van de triager en, bij bulk-triage,
# onder scripts/check-drafts.sh.
#
# De patronen staan in lib/time-promises.sh en worden gedeeld met scripts/check-drafts.sh.
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

source "$(dirname "$0")/lib/time-promises.sh"
found=$(find_time_promises "$content")

if [ -n "$found" ]; then
  echo "Geblokkeerd door time-promise-guard.sh: $(basename "$full") bevat een tijdsbelofte ($found)." >&2
  echo "Beloof klanten nooit wanneer iets opgelost is. Beschrijf de volgende stap, bijvoorbeeld \"neem contact op met support\"." >&2
  exit 2
fi
exit 0
