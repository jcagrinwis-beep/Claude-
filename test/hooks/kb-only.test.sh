#!/usr/bin/env bash
# Test voor .claude/hooks/kb-only.sh: mag kb-schrijver alleen in docs/kb/ schrijven?
# Draai met: bash test/hooks/kb-only.test.sh
cd "$(dirname "$0")/../.." || exit 1
export CLAUDE_PROJECT_DIR=$PWD
hook=.claude/hooks/kb-only.sh
fails=0

check() {
  local expect=$1 path=$2 e got
  jq -nc --arg p "$path" '{tool_name:"Write",tool_input:{file_path:$p,content:"x"}}' | "$hook" 2>/dev/null
  e=$?
  if [ "$e" = 2 ]; then got=BLOK; else got=OK; fi
  if [ "$got" = "$expect" ]; then mark="goed"; else mark="FOUT"; fails=$((fails + 1)); fi
  printf '%-4s  verwacht %-4s kreeg %-4s  %s\n' "$mark" "$expect" "$got" "$path"
}

echo "Moet toegestaan worden:"
check OK   "docs/kb/inloggen-na-update.md"
check OK   "$PWD/docs/kb/factuur-opnieuw.md"
check OK   "docs/kb/account/gebruiker-toevoegen.md"

echo
echo "Moet geblokkeerd worden:"
check BLOK "src/triage.js"
check BLOK "data/tickets.json"
check BLOK "docs/kb/../../src/triage.js"
check BLOK "docs/kbx/artikel.md"
check BLOK "docs/kb/script.sh"
check BLOK "/tmp/docs/kb/artikel.md"
check BLOK ".claude/agents/kb-schrijver.md"

echo
if [ "$fails" = 0 ]; then echo "Alle tests geslaagd."; else echo "$fails test(s) gefaald."; exit 1; fi
