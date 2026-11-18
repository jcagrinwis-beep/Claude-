#!/usr/bin/env bash
# PreToolUse-hook voor de subagent kb-schrijver: staat Write en Edit alleen toe
# op Markdown-bestanden binnen docs/kb/. Wordt geregistreerd in de frontmatter
# van .claude/agents/kb-schrijver.md en geldt dus alleen terwijl die agent draait.
input=$(cat)
path=$(jq -r '.tool_input.file_path // ""' <<<"$input")
root=$(realpath -m "${CLAUDE_PROJECT_DIR:-.}")
kb="$root/docs/kb"

# Maak het pad absoluut en los ../ op, zodat docs/kb/../../src niet door de controle glipt.
case "$path" in
  /*) full=$(realpath -m "$path") ;;
  *) full=$(realpath -m "$root/$path") ;;
esac

case "$full" in
  "$kb"/*.md) exit 0 ;;
esac

echo "Geblokkeerd door kb-only.sh: kb-schrijver mag alleen Markdown-bestanden in docs/kb/ schrijven, niet ${full#"$root"/}." >&2
exit 2
