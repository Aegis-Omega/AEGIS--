#!/bin/bash
set -euo pipefail

# Only run in Claude Code remote (web) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

REPO="${CLAUDE_PROJECT_DIR:-/home/user/AEGIS--}"

install_npm() {
  local dir="$1"
  if [ -f "$REPO/$dir/package.json" ] && [ ! -d "$REPO/$dir/node_modules" ]; then
    echo "Installing $dir deps..."
    npm install --prefix "$REPO/$dir" --prefer-offline --no-audit --no-fund
  fi
}

# Governance runtime (Gate 8 / 2790 tests depend on this — install first)
install_npm sovereign-omega-v2

# Shared infrastructure (commercial products depend on this)
install_npm packages/shared

# Commercial products
install_npm cockpit
install_npm platform-picker
install_npm hook-generator
install_npm content-calendar
install_npm hub

# Studio + enterprise
install_npm studio
install_npm enterprise

# Python bridge deps
if [ -f "$REPO/sovereign-omega-v2/requirements.txt" ]; then
  pip install --quiet -r "$REPO/sovereign-omega-v2/requirements.txt"
fi

# Verify constitutional file hashes (must exit 0)
cd "$REPO/sovereign-omega-v2"
node scripts/verify-hashes.mjs
