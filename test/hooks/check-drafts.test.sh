#!/usr/bin/env bash
# Test voor scripts/check-drafts.sh: faalt het bij een tijdsbelofte in een conceptantwoord,
# en slaagt het bij nette antwoorden? Draait zonder claude -p.
# Draai met: bash test/hooks/check-drafts.test.sh
cd "$(dirname "$0")/../.." || exit 1
tmp=$(mktemp -d)
trap 'rm -f "$tmp"/*.jsonl; rmdir "$tmp"' EXIT
fails=0

check() {
  local expect=$1 label=$2 file=$3 got
  scripts/check-drafts.sh "$file" >/dev/null 2>&1
  got=$?
  if [ "$got" = "$expect" ]; then mark="goed"; else mark="FOUT"; fails=$((fails + 1)); fi
  printf '%-4s  verwacht exit %s kreeg %s  %s\n' "$mark" "$expect" "$got" "$label"
}

draft() { jq -nc --arg id "$1" --arg d "$2" '{id:$id,priority:"high",category:"overig",draft:$d}'; }

draft T-1 "Bedankt voor je melding. Stuur ons een screenshot van de fout." > "$tmp/ok.jsonl"
draft T-2 "We pakken je melding met voorrang op." >> "$tmp/ok.jsonl"
check 0 "nette antwoorden, ook met voorrang" "$tmp/ok.jsonl"

{ cat "$tmp/ok.jsonl"; draft T-3 "We lossen dit binnen 24 uur op."; } > "$tmp/belofte.jsonl"
check 1 "binnen 24 uur in één van de antwoorden" "$tmp/belofte.jsonl"

draft T-4 "Je hoort vandaag nog van ons." > "$tmp/vandaag.jsonl"
check 1 "vandaag nog" "$tmp/vandaag.jsonl"

check 1 "bestand ontbreekt" "$tmp/bestaat-niet.jsonl"

echo
if [ "$fails" = 0 ]; then echo "Alle tests geslaagd."; else echo "$fails test(s) gefaald."; exit 1; fi
