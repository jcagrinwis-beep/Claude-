#!/usr/bin/env bash
# PreToolUse-hook: blokkeert gevaarlijke acties voordat ze worden uitgevoerd.
# Invoer: JSON op stdin. Exit 2 = blokkeren; stderr gaat als feedback naar Claude.
#
# Let op: dit is een vangnet tegen ongelukken, geen beveiliging. Het kijkt alleen
# naar de tekst van het commando, dus een script dat zelf bestanden verwijdert of
# een andere tool (python, perl, ...) wordt niet herkend.
input=$(cat)
tool=$(jq -r '.tool_name // ""' <<<"$input")

block() {
  echo "Geblokkeerd door guard.sh: $1" >&2
  exit 2
}

if [ "$tool" = "Bash" ]; then
  cmd=$(jq -r '.tool_input.command // ""' <<<"$input")

  # Splits het commando in losse delen bij ; && || | en nieuwe regels,
  # zodat vlaggen van verschillende commando's niet bij elkaar worden opgeteld.
  while IFS= read -r part; do
    # rm met zowel recursief als forceren, in welke vorm dan ook:
    # -rf, -fr, -r -f, -R -f, --recursive --force, ...
    if grep -Eq '(^|[^[:alnum:]_./-])rm([[:space:]]|$)' <<<"$part"; then
      recursive=0
      force=0
      grep -Eq '[[:space:]]-[a-zA-Z]*[rR]' <<<"$part" && recursive=1
      grep -Eq '[[:space:]]--recursive([[:space:]]|$)' <<<"$part" && recursive=1
      grep -Eq '[[:space:]]-[a-zA-Z]*f' <<<"$part" && force=1
      grep -Eq '[[:space:]]--force([[:space:]]|$)' <<<"$part" && force=1
      if [ "$recursive" = 1 ] && [ "$force" = 1 ]; then
        block "recursief geforceerd verwijderen met rm is niet toegestaan. Verwijder bestanden gericht, één voor één."
      fi
    fi

    # find met -delete
    if grep -Eq '(^|[^[:alnum:]_./-])find[[:space:]].*[[:space:]]-delete([[:space:]]|$)' <<<"$part"; then
      block "find met -delete is niet toegestaan. Verwijder bestanden gericht, één voor één."
    fi
  done < <(sed -E 's/(\|\||&&|;|\|)/\n/g' <<<"$cmd")
else
  path=$(jq -r '.tool_input.file_path // ""' <<<"$input")
  name=$(basename "$path")
  case "$name" in
    .env.example) ;;
    .env | .env.*)
      block "$name bevat secrets en mag niet door Claude worden aangepast."
      ;;
  esac
fi
exit 0
