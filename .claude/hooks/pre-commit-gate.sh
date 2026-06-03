#!/bin/bash
# Pre-commit Gate 8 auto-block.
# Gate sequence: Gate 1 (jcs.test.ts) → typecheck → build.
# Reads git commit command from stdin — exits 0 for non-commit Bash calls.

set -uo pipefail

INPUT=$(cat)
CMD=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('command', ''))
except Exception:
    print('')
" 2>/dev/null || echo "")

if ! echo "$CMD" | grep -q "git commit"; then
  exit 0
fi

# ── Martingale suspension gate (constitutional) ────────────────────────────
# Mutation authority is withdrawn if the metacog/ratification chains are tampered
# (!is_anchored) or adaptation outran 1/φ of self-observation (entropy unbounded).
# A suspended automaton may not commit — AdaptivePower(T) ≤ ReplayVerifiability(T).
MART="/home/user/AEGIS--/.claude/metacog/martingale.mjs"
if [ -f "$MART" ]; then
  if ! MART_OUT=$(node "$MART" gate 2>&1); then
    echo "BLOCKED: martingale suspended — mutation authority withdrawn."
    echo "$MART_OUT"
    echo "Restore: re-anchor the chains (fix tamper) or dilute adaptation with verified observation."
    exit 2
  fi
  echo "  martingale: anchored"
fi

echo "GATE 8 pre-commit: Gate1 → typecheck → build..."
cd /home/user/AEGIS--/sovereign-omega-v2

# Gate 1: T0 canonicalization foundation (fast ~2-5s — must be green always)
GATE1=$(npm run test -- test/unit/jcs.test.ts 2>&1 | tail -6)
if echo "$GATE1" | grep -qE " FAIL | failed|× "; then
  echo "BLOCKED: Gate 1 (jcs.test.ts) failed — T0 canonicalization broken."
  echo "$GATE1"
  exit 2
fi
echo "  Gate 1 (jcs): OK"

# Typecheck: operational closure check
TYPECHECK=$(npm run typecheck 2>&1 | tail -8)
if echo "$TYPECHECK" | grep -qE "error TS|Found [0-9]+ error"; then
  echo "BLOCKED: typecheck failed."
  echo "$TYPECHECK"
  exit 2
fi
echo "  typecheck: OK"

# Build: dist artifact must compile
BUILD=$(npm run build 2>&1 | tail -8)
if echo "$BUILD" | grep -qiE "^error[^s]|Build failed"; then
  echo "BLOCKED: build failed."
  echo "$BUILD"
  exit 2
fi
echo "  build: OK"
echo "Gate 8 passed — commit proceeding."
exit 0
