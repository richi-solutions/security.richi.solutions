#!/usr/bin/env bash
# Sync shared .claude/ content to all local richi-solutions repos
#
# Usage: bash scripts/sync-local.sh
#
# This is the local equivalent of sync-dotclaude.yml.
# It copies shared .claude/ content from the orchestrator to all
# sibling *.richi.solutions repos and pulls latest from remote.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ORCHESTRATOR_DIR="$(dirname "$SCRIPT_DIR")"
PARENT_DIR="$(dirname "$ORCHESTRATOR_DIR")"
SOURCE="${ORCHESTRATOR_DIR}/.claude"

if [ ! -d "$SOURCE" ]; then
  echo "Error: Orchestrator .claude/ not found at $SOURCE"
  exit 1
fi

echo "Source: $SOURCE"
echo ""

for repo_dir in "$PARENT_DIR"/*.richi.solutions; do
  repo_name=$(basename "$repo_dir")

  # Skip orchestrator itself
  if [ "$repo_name" = "orchestrator.richi.solutions" ]; then
    continue
  fi

  if [ ! -d "$repo_dir/.git" ]; then
    echo "[$repo_name] Not a git repo — skipping"
    continue
  fi

  echo "[$repo_name] Syncing..."

  # Pull latest from remote first
  git -C "$repo_dir" pull --ff-only 2>/dev/null || {
    echo "  Warning: git pull failed (dirty working tree?). Syncing .claude/ anyway."
  }

  # Ensure .claude/ exists
  mkdir -p "$repo_dir/.claude"

  # Sync shared content (same excludes as the workflow)
  rsync -a --delete \
    --exclude='CLAUDE.md' \
    --exclude='CLAUDE.local.md' \
    --exclude='settings.local.json' \
    --exclude='.mcp.json' \
    --exclude='reviews/' \
    "$SOURCE/" "$repo_dir/.claude/"

  # Copy config files to repo root
  if [ -d "$repo_dir/.claude/sync" ]; then
    cp -r "$repo_dir/.claude/sync/." "$repo_dir/"
  fi

  # Check for changes
  if [ -z "$(git -C "$repo_dir" status --porcelain)" ]; then
    echo "  Already up to date"
  else
    echo "  Changes detected:"
    git -C "$repo_dir" diff --stat
    git -C "$repo_dir" add -A
    git -C "$repo_dir" commit -m "chore: sync .claude from orchestrator" \
      -m "Synced shared .claude/ content and config files." \
      -m "Automated by scripts/sync-local.sh"
    git -C "$repo_dir" push
    echo "  Synced and pushed"
  fi

  echo ""
done

echo "Done."
