#!/usr/bin/env bash
# PreToolUse-hook: blokkeert gevaarlijke acties voordat ze worden uitgevoerd.
# Invoer: JSON op stdin. Exit 2 = blokkeren; stderr gaat als feedback naar Claude.
input=$(cat)
tool=$(jq -r '.tool_name // ""' <<<"$input")

if [ "$tool" = "Bash" ]; then
  cmd=$(jq -r '.tool_input.command // ""' <<<"$input")
  if grep -Eq '(^|[^[:alnum:]_])rm[[:space:]]+-[a-zA-Z]*(r[a-zA-Z]*f|f[a-zA-Z]*r)' <<<"$cmd"; then
    echo "Geblokkeerd door guard.sh: 'rm -rf' is niet toegestaan in dit project. Verwijder bestanden gericht, één voor één." >&2
    exit 2
  fi
else
  path=$(jq -r '.tool_input.file_path // ""' <<<"$input")
  name=$(basename "$path")
  case "$name" in
    .env.example) ;;
    .env | .env.*)
      echo "Geblokkeerd door guard.sh: $name bevat secrets en mag niet door Claude worden aangepast." >&2
      exit 2
      ;;
  esac
fi
exit 0
