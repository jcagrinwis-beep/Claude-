#!/usr/bin/env bash
# Test voor .claude/hooks/time-promise-guard.sh: blokkeert de hook tijdsbeloftes
# in kennisbankartikelen, en laat hij al het andere door?
# Draai met: bash test/hooks/time-promise-guard.test.sh
cd "$(dirname "$0")/../.." || exit 1
export CLAUDE_PROJECT_DIR=$PWD
hook=.claude/hooks/time-promise-guard.sh
fails=0

check() {
  local expect=$1 label=$2 json=$3 e got
  echo "$json" | "$hook" 2>/dev/null
  e=$?
  if [ "$e" = 2 ]; then got=BLOK; else got=OK; fi
  if [ "$got" = "$expect" ]; then mark="goed"; else mark="FOUT"; fails=$((fails + 1)); fi
  printf '%-4s  verwacht %-4s kreeg %-4s  %s\n' "$mark" "$expect" "$got" "$label"
}

kb="docs/kb/test-artikel.md"
write() { jq -nc --arg p "${2:-$kb}" --arg c "$1" '{tool_name:"Write",tool_input:{file_path:$p,content:$c}}'; }
edit()  { jq -nc --arg p "$kb" --arg c "$1" '{tool_name:"Edit",tool_input:{file_path:$p,old_string:"a",new_string:$c}}'; }
multi() { jq -nc --arg p "$kb" --arg a "$1" --arg b "$2" '{tool_name:"MultiEdit",tool_input:{file_path:$p,edits:[{old_string:"a",new_string:$a},{old_string:"b",new_string:$b}]}}'; }

echo "Moet geblokkeerd worden:"
check BLOK "binnen 24 uur"                "$(write "Support lost dit binnen 24 uur op.")"
check BLOK "binnen twee werkdagen"        "$(write "Binnen twee werkdagen is het verholpen.")"
check BLOK "zo snel mogelijk"             "$(write "We helpen je zo snel mogelijk.")"
check BLOK "vandaag nog"                  "$(write "Je hoort vandaag nog van ons.")"
check BLOK "morgen"                       "$(write "Morgen werkt het weer.")"
check BLOK "uiterlijk vrijdag"            "$(write "Uiterlijk vrijdag is het opgelost.")"
check BLOK "einde van de dag"             "$(write "Voor het einde van de dag is het klaar.")"
check BLOK "Edit met belofte"             "$(edit "Binnen een uur opgelost.")"
check BLOK "MultiEdit, belofte in 2e"     "$(multi "Stap 1" "binnen 3 dagen opgelost")"

echo
echo "Moet toegestaan worden:"
check OK   "bestaand artikel"             "$(write "$(cat docs/kb/inloggen-na-update.md)")"
check OK   "neem contact op"              "$(write "Lukt het niet? Neem dan contact op met support.")"
check OK   "met voorrang"                 "$(write "Je melding wordt met voorrang behandeld.")"
check OK   "uiterlijk van de app"         "$(write "Het uiterlijk van de app is veranderd.")"
check OK   "goedemorgen"                  "$(write "Goedemorgen! Open het menu.")"
check OK   "binnen het menu"              "$(write "Kies binnen het menu voor Instellingen.")"
check OK   "belofte buiten docs/kb"       "$(write "binnen 24 uur" "src/notes.md")"
check OK   "belofte in kb-script, geen md" "$(write "binnen 24 uur" "docs/kb/script.sh")"

echo
if [ "$fails" = 0 ]; then echo "Alle tests geslaagd."; else echo "$fails test(s) gefaald."; exit 1; fi
