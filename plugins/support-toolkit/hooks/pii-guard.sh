#!/usr/bin/env bash
# PreToolUse-hook: blokkeert Write en Edit als de nieuwe inhoud een e-mailadres bevat.
# Adressen op @example.com zijn toegestaan; dat domein is gereserveerd voor voorbeelden.
#
# Waar staat de nieuwe inhoud?
#   Write     -> tool_input.content
#   Edit      -> tool_input.new_string
#   MultiEdit -> tool_input.edits[].new_string
input=$(cat)

content=$(jq -r '
  [ .tool_input.content,
    .tool_input.new_string,
    (.tool_input.edits // [] | .[].new_string)
  ] | map(select(. != null)) | join("\n")
' <<<"$input")

# Alle e-mailadressen, behalve die op example.com (hoofdletterongevoelig).
found=$(grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' <<<"$content" \
  | grep -viE '@example\.com$' \
  | sort -u)

if [ -n "$found" ]; then
  # Toon de adressen gemaskeerd, zodat de melding zelf geen persoonsgegevens herhaalt.
  masked=$(sed -E 's/^(.)[^@]*@/\1***@/' <<<"$found" | paste -sd ', ' -)
  path=$(jq -r '.tool_input.file_path // "?"' <<<"$input")
  echo "Geblokkeerd door pii-guard.sh: $(basename "$path") zou e-mailadressen bevatten ($masked)." >&2
  echo "Gebruik fictieve adressen op @example.com, bijvoorbeeld klant@example.com." >&2
  exit 2
fi
exit 0
