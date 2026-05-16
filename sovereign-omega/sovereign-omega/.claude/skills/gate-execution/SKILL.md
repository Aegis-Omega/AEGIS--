---
name: gate-execution
description: Automatically invoked when the user asks to run tests, execute a build gate, verify a module, or check if a step passes. Also invoked when a new source file has just been written and needs verification. Handles the full gate sequence for the sovereign-runtime build protocol.
---

# Gate Execution Skill

When invoked, run the appropriate gate test for the current build step.
Determine which gate is relevant based on the file just written or the step mentioned.

Gate-to-file mapping:
- canonicalize.ts or JCS → Gate 1: `npm run test -- test/unit/jcs.test.ts`
- store.ts or uuid.ts or sequence → Gate 2: `npm run test -- test/unit/sequence.test.ts`
- immutable.ts → Gate 3: `npm run test -- test/unit/immutable.test.ts`
- reducer.ts or ProjectionState → Gate 4: `npm run test -- test/unit/reducer.test.ts`
- vcg.ts or calibration → Gate 5: `npm run test -- test/unit/vcg.test.ts`
- hoeffding.ts or risk.ts or gate → Gate 6: `npm run test -- test/unit/gate.test.ts`
- pipeline or integration → Gate 7: `npm run test -- test/integration/`
- build or deploy or all → Gate 8: `npm run test && npm run typecheck && npm run build`

Always report the result in the standard format:
GATE [N]: [PASSED/FAILED]
Command: [exact command]
Result: [pass count or error]
Action: [PROCEED / HALT — reason]
