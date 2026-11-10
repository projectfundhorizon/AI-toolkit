#!/usr/bin/env bash
# Installs the toolkit's agents and commands for your user, so they work in every repo.
# Safe to run again to update. Existing different files are backed up with a .bak suffix.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
dest="${CLAUDE_HOME:-$HOME/.claude}"
for kind in agents commands; do
  mkdir -p "$dest/$kind"
  for f in "$here/$kind"/*.md; do
    target="$dest/$kind/$(basename "$f")"
    if [ -f "$target" ] && ! cmp -s "$f" "$target"; then cp "$target" "$target.bak"; fi
    cp "$f" "$target"
    echo "installed $kind/$(basename "$f")"
  done
done
echo "Done. Open Claude Code in any repo and type /plan, /prompt, /test, /audit, /review."
