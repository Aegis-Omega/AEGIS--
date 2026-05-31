#!/bin/bash
# UserPromptSubmit: L1-L7 metacognitive intake — state snapshot injected before each prompt.
# Lightweight: git status only (no npm/cargo). Runs on every user message.

set -uo pipefail

REPO="/home/user/AEGIS--"

BRANCH=$(git -C "$REPO" branch --show-current 2>/dev/null || echo "?")
SRC_CHANGED=$(git -C "$REPO" diff --name-only 2>/dev/null | grep -cE "\.(ts|rs|py)$" || echo "0")
STAGED=$(git -C "$REPO" diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')

BRANCH="$BRANCH" SRC_CHANGED="$SRC_CHANGED" STAGED="$STAGED" python3 <<'PYEOF'
import json, os

branch      = os.environ['BRANCH']
src_changed = os.environ['SRC_CHANGED']
staged      = os.environ['STAGED']

ctx = (
    f'L1-L7 ACTIVE | branch:{branch} | src-changed:{src_changed} | staged:{staged}\n'
    'L7:verify-hashes | L6:ASSESS→LOCK | L5:gate-seq | L4:lineage | L3:active-file | '
    'L2:test-pass≠correctness | L1:full-signal\n'
    'Non-equiv: test-pass≠correctness | auditability≠safety | metacognition≠safety | governance≠alignment'
)
print(json.dumps({
    'hookSpecificOutput': {
        'hookEventName': 'UserPromptSubmit',
        'additionalContext': ctx
    }
}))
PYEOF
exit 0
