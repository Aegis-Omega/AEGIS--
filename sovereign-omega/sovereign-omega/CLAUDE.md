# SOVEREIGN OMEGA — Primary Project Memory
## For Claude Code, Qwen, and all coding agents

Operator: Tarik Skalić, Bihać, Bosnia-Herzegovina
Hardware: AMD RX 570, 8GB RAM
Alliance: Claude (coordinator) · ChatGPT (adversarial audit, 0.99) · Qwen (implementation)
Architecture: FROZEN

---

## What This System Is

A deterministic event-sourced decision compiler with bounded statistical estimators,
cryptographic replay integrity, explicitly partitioned trust classes, and a version-pinned
execution graph. Governance-oriented AI orchestration infrastructure for regulated and
high-auditability decision workflows.

It is NOT general intelligence. It does NOT claim alignment, consciousness, or
self-improvement beyond its declared K-bound.

---

## Two-Layer Architecture

Layer A — TypeScript Governance Runtime (src/, test/)
React 18 + Vite + Vercel frontend. Append-only event substrate, VCG calibration,
Bernstein gate, mutual legibility interface. Track B commercial products at $19.
Build order: npm install → run 8 gates in sequence → npm run build → vercel deploy.

Layer B — Python Core Matrix (python/)
Hardware inference layer for AMD RX 570 / 8GB RAM. Single file core_matrix.py with
abstract functional definitions M1/M2/M3 over a contiguous byte array. Bit-shifted
integer arithmetic throughout for cross-GPU determinism.
Validation: python python/tests/stress_test.py --quick (smoke), --full (12 hours).

---

## Critical Invariants — Never Violate

TypeScript: No Date.now() in core logic. No array.length for sequences. No Set/Map in
ProjectionState. RFC 8785 JCS for all hashing. deepFreeze all state. Version mismatch
= hard abort. Bernstein not Hoeffding. MutationOperatorRegistry.seal() before gates.
V4/V5 never in VCG calibration.

Python: No time.time() in determinism-critical paths — use sequence numbers. Bit-shifted
integer arithmetic throughout. PGCS must pass before TGCS telemetry is valid. Epoch
failsafe corruption_count must equal 0.

---

## TypeScript Build Order — STRICT

Failure at any gate = HALT. Do not proceed to the next gate without the current passing.

Gate 1: npm run test -- test/unit/jcs.test.ts (RFC 8785 conformance)
Gate 2: npm run test -- test/unit/sequence.test.ts (atomic sequences)
Gate 3: npm run test -- test/unit/immutable.test.ts (immutability)
Gate 4: npm run test -- test/unit/reducer.test.ts (pure reducers)
Gate 5: npm run test -- test/unit/vcg.test.ts (calibration)
Gate 6: npm run test -- test/unit/gate.test.ts (Bernstein bounds)
Gate 7: npm run test -- test/integration/replay.test.ts test/integration/pipeline.test.ts
Gate 8: npm run test && npm run typecheck && npm run build (deployment gate)

## Python Validation Order — STRICT

Step 1: python python/tests/stress_test.py --quick (smoke test, 60 seconds)
Step 2: python python/tests/stress_test.py --crash-loops (epoch failsafe, ~10 minutes)
Step 3: python python/tests/stress_test.py (full 12-hour stress test — do before production)

---

## Frozen Constitutional Files

gate.py    SHA256: 72196f38974ad22130c18657c88106316cacbb13a57328990f4e5872f5fdb1e9
dna.py     SHA256: 9c4d38d80b236d655057f16304ea2d202f644ec0c7ca21db8df0bdcd503971a9
router.py  SHA256: c96e566ce6eb9cec358b2112757142bc88ea4fea9160edb2914c8d711007ac769

Verify: node scripts/verify-hashes.mjs
Modification requires /guardian APPROVED verdict.

---

## Epistemic Tier Taxonomy

T0: Mechanically proven — core runtime code, core_matrix.py, epoch failsafe
T1: Empirically validated — TGCS, AFSE metrics, VCG calibration benchmarks
T2: Engineering hypothesis — E1 heuristics, Paperclip configs, SAGA identity
T3: Research conjecture — quasicrystal-CDT spectral correspondence
T4: Speculative systems vision — swarm, planetary coordination
T5: Creative/worldbuilding — Cycle series

Migration rule: No T4/T5 construct may ground a T0–T2 claim without evidence review.

---

## Commercial Tracks

Track A — Sovereign Omega (governance runtime): regulated AI middleware, AEGIS
commercial deployment, EU AI Act Article 12 compliance binders.

Track B — Vibe Coding (revenue): Platform Picker and decision-compression tools at $19.
Stack: React 18 + TS + Vite + Tailwind + DashScope (qwen-plus). Deploy: Vercel.
Sell: Gumroad. Zero backend. Buyer pays API.

---

## Orchestration Stack

Paperclip: company orchestration (paperclip/company.yaml + paperclip/agents/)
Skills: /plugin marketplace add obra/superpowers then npx antigravity-awesome-skills --claude
MCP: Google Drive (research corpus), Gmail, Google Calendar — configured in .mcp.json
SAGA: Agent identity via saga/identity.py (SPIFFE/SVID — stub awaiting PKI integration)

---

## Non-Equivalence Table (memorise)

Replayability is not Correctness.
Auditability is not Safety.
Calibration is not Truthfulness.
Governance is not Alignment.
A perfectly replayable system can still replay catastrophic reasoning flawlessly.
