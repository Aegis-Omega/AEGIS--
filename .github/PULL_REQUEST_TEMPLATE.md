## Summary

<!-- What does this PR do and why? -->

## Gate results

<!-- Run the full gate sequence for any sovereign-omega-v2 changes. Copy output here. -->

```
Gate 1 (JCS):        PASS / FAIL
Gate 2 (sequence):   PASS / FAIL
Gate 3 (immutable):  PASS / FAIL
Gate 4 (reducer):    PASS / FAIL
Gate 5 (VCG):        PASS / FAIL
Gate 6 (gate):       PASS / FAIL
Gate 7 (integration):PASS / FAIL
Gate 8 (full):       PASS / FAIL  — X/184 tests
```

<!-- For Track B (commercial products) only: -->
```
platform-picker build:  PASS / FAIL / N/A
hook-generator build:   PASS / FAIL / N/A
content-calendar build: PASS / FAIL / N/A
```

## Invariants checklist

- [ ] No `Date.now()` outside `src/event/uuid.ts`
- [ ] No `Set`/`Map` in `ProjectionState`
- [ ] No `JSON.stringify` for integrity hashing
- [ ] `deepFreeze` applied to all new state objects
- [ ] Version mismatch triggers hard abort (no silent fallback)
- [ ] No T4/T5 claim grounds T0–T2 assertion without evidence review

## Constitutional files

<!-- If any frozen file was touched, explain why and confirm /guardian approval. -->
- [ ] `gate.py` — not modified
- [ ] `dna.py` — not modified
- [ ] `router.py` — not modified

## Test plan

<!-- How did you verify this change works correctly? -->
