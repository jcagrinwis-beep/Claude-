#!/usr/bin/env bash
# PostToolUse-hook: controleert elk gewijzigd .js-bestand en draait daarna de tests.
# Exit 2 = Claude krijgt de foutmelding (stderr) te zien en kan die direct herstellen.
input=$(cat)
path=$(jq -r '.tool_input.file_path // ""' <<<"$input")

case "$path" in
  *.js) ;;
  *) exit 0 ;;
esac
[ -f "$path" ] || exit 0

if ! out=$(node --check "$path" 2>&1); then
  echo "Syntaxfout in $path:" >&2
  echo "$out" >&2
  exit 2
fi

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
if ! out=$(node --test 2>&1); then
  echo "Tests falen na de wijziging in $path:" >&2
  echo "$out" | tail -n 40 >&2
  exit 2
fi
exit 0
