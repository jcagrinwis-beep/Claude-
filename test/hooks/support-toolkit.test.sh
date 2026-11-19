#!/usr/bin/env bash
# Test voor de plugin plugins/support-toolkit: werken de hooks zoals hooks.json
# ze aanroept, vanuit een lege map buiten dit project?
# Draai met: bash test/hooks/support-toolkit.test.sh
cd "$(dirname "$0")/../.." || exit 1
export CLAUDE_PLUGIN_ROOT=$PWD/plugins/support-toolkit
unset CLAUDE_PROJECT_DIR
hooks_json=$CLAUDE_PLUGIN_ROOT/hooks/hooks.json
fails=0

# Een lege map, zodat niets uit dit project meedoet.
empty=$(mktemp -d)
cd "$empty" || exit 1

# Precies het commando uit hooks.json, met ${CLAUDE_PLUGIN_ROOT} ingevuld door de shell.
guard=$(jq -r '.hooks.PreToolUse[0].hooks[0].command' "$hooks_json")
pii=$(jq -r '.hooks.PreToolUse[1].hooks[0].command' "$hooks_json")

check() {
  local expect=$1 label=$2 hook=$3 json=$4 e got
  echo "$json" | bash -c "$hook" 2>/dev/null
  e=$?
  if [ "$e" = 2 ]; then got=BLOK; else got=OK; fi
  if [ "$got" = "$expect" ]; then mark="goed"; else mark="FOUT"; fails=$((fails + 1)); fi
  printf '%-4s  verwacht %-4s kreeg %-4s  %s\n' "$mark" "$expect" "$got" "$label"
}

bash_cmd() { jq -nc --arg c "$1" '{tool_name:"Bash",tool_input:{command:$c}}'; }
write()    { jq -nc --arg p "$1" --arg c "$2" '{tool_name:"Write",tool_input:{file_path:$p,content:$c}}'; }
real=$(printf '%s@%s' jan bedrijf.nl)

echo "guard.sh:"
check BLOK "rm met -r en -f"        "$guard" "$(bash_cmd "rm -r -f oud")"
check BLOK "find met -delete"       "$guard" "$(bash_cmd "find . -name x -delete")"
check BLOK "Write naar .env"        "$guard" "$(write ".env" "x")"
check OK   "ls"                     "$guard" "$(bash_cmd "ls -la")"
check OK   "Write naar .env.example" "$guard" "$(write ".env.example" "x")"

echo
echo "pii-guard.sh:"
check BLOK "echt e-mailadres"       "$pii" "$(write "a.txt" "Contact: $real")"
check OK   "adres op example.com"   "$pii" "$(write "a.txt" "klant@example.com")"

echo
echo "Agents aanwezig met frontmatter:"
for a in code-reviewer ticket-triager; do
  f=$CLAUDE_PLUGIN_ROOT/agents/$a.md
  if head -5 "$f" 2>/dev/null | grep -q "^name: $a$"; then
    printf 'goed  %s\n' "$a"
  else
    printf 'FOUT  %s ontbreekt of heeft geen name\n' "$a"; fails=$((fails + 1))
  fi
done

rmdir "$empty"
echo
if [ "$fails" = 0 ]; then echo "Alle tests geslaagd."; else echo "$fails test(s) gefaald."; exit 1; fi
