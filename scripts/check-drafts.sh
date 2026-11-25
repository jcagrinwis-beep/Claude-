#!/usr/bin/env bash
# Controleert conceptantwoorden in een JSONL-bestand (standaard out/triage.jsonl)
# op tijdsbeloftes, met dezelfde patronen als de hook time-promise-guard.sh.
# Exit 0: geen beloftes. Exit 1: minstens één belofte, of het bestand ontbreekt.
#
# Gebruik: scripts/check-drafts.sh [bestand.jsonl]
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FILE="${1:-$ROOT/out/triage.jsonl}"
source "$ROOT/.claude/hooks/lib/time-promises.sh"

if [ ! -f "$FILE" ]; then
  echo "FOUT  $FILE bestaat niet" >&2
  exit 1
fi

failed=0
while IFS=$'\t' read -r id draft; do
  found=$(find_time_promises "$draft")
  if [ -n "$found" ]; then
    echo "BELOFTE  $id: $found" >&2
    failed=1
  fi
done < <(jq -r '[.id, (.draft | gsub("[\t\n]"; " "))] | @tsv' "$FILE")

[ "$failed" = 0 ] && echo "Geen tijdsbeloftes in de conceptantwoorden."
exit "$failed"
