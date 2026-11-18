#!/usr/bin/env bash
# Test voor .claude/hooks/pii-guard.sh: voert de hook nagebootste tool-aanroepen
# en controleert of hij blokkeert (exit 2) of doorlaat (exit 0).
# Draai met: bash test/hooks/pii-guard.test.sh
cd "$(dirname "$0")/../.." || exit 1
hook=.claude/hooks/pii-guard.sh
fails=0

# Bouwt een e-mailadres op uit delen, zodat dit testbestand zelf geen
# echt adres bevat en de hook het dus gewoon laat schrijven.
mail() { printf '%s@%s' "$1" "$2"; }

check() {
  local expect=$1 label=$2 json=$3 e got
  echo "$json" | "$hook" 2>/dev/null
  e=$?
  if [ "$e" = 2 ]; then got=BLOK; else got=OK; fi
  if [ "$got" = "$expect" ]; then mark="goed"; else mark="FOUT"; fails=$((fails + 1)); fi
  printf '%-4s  verwacht %-4s kreeg %-4s  %s\n' "$mark" "$expect" "$got" "$label"
}

write() { jq -nc --arg c "$1" '{tool_name:"Write",tool_input:{file_path:"data/x.json",content:$c}}'; }
edit()  { jq -nc --arg c "$1" '{tool_name:"Edit",tool_input:{file_path:"data/x.json",old_string:"a",new_string:$c}}'; }
multi() { jq -nc --arg a "$1" --arg b "$2" '{tool_name:"MultiEdit",tool_input:{file_path:"x",edits:[{old_string:"a",new_string:$a},{old_string:"b",new_string:$b}]}}'; }

real=$(mail jan bedrijf.nl)
ok=$(mail jan example.com)

echo "Moet geblokkeerd worden:"
check BLOK "Write met echt adres"            "$(write "Contact: $real")"
check BLOK "Edit met echt adres"             "$(edit "\"email\": \"$real\"")"
check BLOK "MultiEdit, echt adres in 2e edit" "$(multi "niets" "$real")"
check BLOK "Mix van toegestaan en echt"      "$(write "$ok en $real")"
check BLOK "Subdomein-truc"                  "$(write "$(mail jan example.com.evil.nl)")"

echo
echo "Moet toegestaan worden:"
check OK   "Write met @example.com"          "$(write "Contact: $ok")"
check OK   "Hoofdletters @EXAMPLE.COM"       "$(write "$(mail Jan EXAMPLE.COM)")"
check OK   "Edit zonder adres"               "$(edit "const x = 1;")"
check OK   "Apenstaartje zonder adres"       "$(write "@mention en user@localhost")"

echo
if [ "$fails" = 0 ]; then echo "Alle tests geslaagd."; else echo "$fails test(s) gefaald."; exit 1; fi
