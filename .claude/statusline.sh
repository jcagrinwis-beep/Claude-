#!/usr/bin/env bash
# Status line voor Claude Code (oefening 4.1).
# Claude Code stuurt bij elke update een JSON-object op stdin; de eerste regel
# die dit script op stdout schrijft, verschijnt onderin het scherm.
# Toont: model | git-branch | gebruikte context in procenten | open tickets.
input=$(cat)

model=$(jq -r '.model.display_name // .model.id // "?"' <<<"$input")
dir=$(jq -r '.workspace.current_dir // .cwd // "."' <<<"$input")

# Branch van de map waarin Claude werkt; leeg buiten een git-repository.
branch=$(git -C "$dir" branch --show-current 2>/dev/null)
[ -z "$branch" ] && branch=$(git -C "$dir" rev-parse --short HEAD 2>/dev/null)

# Context: gebruik het kant-en-klare percentage als Claude Code dat meestuurt,
# reken het anders uit uit de tokens van de laatste beurt.
pct=$(jq -r '
  .context_window as $c
  | if $c == null then empty
    elif $c.used_percentage != null then $c.used_percentage
    elif $c.current_usage != null and ($c.context_window_size // 0) > 0 then
      ( ($c.current_usage.input_tokens // 0)
      + ($c.current_usage.cache_creation_input_tokens // 0)
      + ($c.current_usage.cache_read_input_tokens // 0) ) * 100 / $c.context_window_size
    else empty end
  | floor' <<<"$input" 2>/dev/null)

# Aantal open tickets: alles zonder status "closed".
tickets_file="${CLAUDE_PROJECT_DIR:-$dir}/data/tickets.json"
open=$(jq '[.[] | select(.status != "closed")] | length' "$tickets_file" 2>/dev/null)

line="$model"
[ -n "$branch" ] && line="$line | ⎇ $branch"
line="$line | context ${pct:-0}%"
[ -n "$open" ] && line="$line | $open open tickets"

echo "$line"
