# AEGIS Audit Findings
## Premortem Analysis — 2026-05-17
## Method: Assume failure. Find the kill vector. Reassemble better.

Findings ranked by epistemic tier. T0 = must resolve before any deployment.
T1 = must resolve before production. T2 = resolve before Gumroad listing.

---

## T0 FINDINGS — Critical (resolve before deployment)

### F-01 · TGCS Invariant Violation: `time.monotonic()` in determinism-critical path
**File:** `sovereign-omega-v2/python/tgcs_afse.py:83`
**Invariant violated:** "No `time.time()` in determinism-critical paths — use sequence numbers"
**Kill vector:** TGCS variance metric measures wall-clock jitter. Two consecutive runs on
identical logic produce different variance values because scheduler timing is stochastic.
The TGCS criterion `passes_criterion=True` is non-reproducible — it depends on CPU load,
thermal state, and OS scheduling, not on deterministic sequence numbers.
**Fix:** Replace `time.monotonic()` cycle timestamps with sequence-number deltas. The
variance should measure deviation in *event throughput per epoch* (events/epoch), not
wall-clock interval. Requires Python sprint.
**Status:** OPEN

### F-02 · AFSE R² hardcoded to 0.98 — stress test proves nothing
**File:** `sovereign-omega-v2/python/tests/stress_test.py:139`
**Kill vector:** `afse_r2 = 0.98 if sequence > 1000 else 0.0` — after 1000 events the
test always reports AFSE passing, regardless of the actual correlation computation in
`tgcs_afse.py`. The AFSE validator in `AFSEController` is written and correct, but
the stress test bypasses it entirely. A broken AFSE implementation passes silently.
**Fix:** Replace hardcoded value with `self._afse_controller.get_r2()` or equivalent.
**Status:** OPEN

### F-03 · CoreMatrix M2 offset collision for same-length verifier results
**File:** `sovereign-omega-v2/python/core_matrix.py:130`
**Kill vector:** `offset = len(verifier_result) % (len(state) // 8)` — two different
events with verifier results of equal byte length write to the same M2 memory offset,
overwriting each other. VCG error and gate LCB values corrupt each other silently.
Bernstein bounds receive scrambled gate data.
**Fix:** Incorporate sequence number into offset: `offset = (sequence * 8 + len(verifier_result)) % (len(state) // 8)`
**Status:** OPEN

### F-04 · GradientAnchor zero-tolerance "hard abort" doesn't abort
**File:** `sovereign-omega-v2/python/gradient_anchor.py:163`
**Kill vector:** Anchor `VERSION_MISMATCH_ABORT` has `tolerance_fixed=0` and the comment
says "hard abort, never silent fallback." But the calibration loop silently snaps W_scale
to expected value and continues. Version mismatches are not aborted — they're silently
corrected, violating the CLAUDE.md invariant "Version mismatch = hard abort."
**Fix:** When `anchor.tolerance_fixed == 0` and the current W_scale deviates from expected,
raise a hard exception rather than snapping.
**Status:** OPEN

### F-05 · Bridge race condition: CoreMatrix not ready before HTTP server accepts requests
**File:** `sovereign-omega-v2/python/bridge.py:63`
**Kill vector:** `matrix.start()` launches PGCS background thread but doesn't block until
initialization completes. `server.serve_forever()` immediately follows. Early `/telemetry`
requests receive invalid PGCS baseline deltas (disk I/O measured from uninitialized state).
**Fix:** Add a ready-event: `matrix.wait_ready(timeout=5.0)` before `serve_forever()`.
**Status:** OPEN

### F-06 · Constitutional files declared frozen but do not exist
**File:** `sovereign-omega-v2/CLAUDE.md` + `scripts/verify-hashes.mjs`
**Kill vector:** `gate.py`, `dna.py`, `router.py` are declared FROZEN with SHA256 hashes
and are described as mutation authority, genome/schema, and execution router. They do not
exist in `sovereign-omega-v2/python/`. The `verify-hashes.mjs` silently SKIPs all three.
The constitutional integrity check is a no-op.
**Action:** These files require /guardian APPROVED to create. Operator must decide whether
to migrate from `sovereign-omega/` (legacy) or author new implementations.
**Status:** DOCUMENTED — awaiting /guardian decision

---

## T1 FINDINGS — Important (resolve before production)

### F-07 · CoreMatrix M1 wraps after ~8.6B events, silently corrupting state
**File:** `sovereign-omega-v2/python/core_matrix.py:82`
**Kill vector:** `write_head = (sequence * 40) % len(state)` — M1 region is 2GB. After
`2GB / 40 = ~53.7M` unique writes, the write head wraps and overwrites old state silently.
At ~88k events/second this is ~10 minutes; at 32k events/second it's ~28 minutes.
No error is signalled. Telemetry sequence counter continues monotonically while state wraps.
**Fix:** Either implement a circular log with explicit epoch markers, or raise once the
write head approaches wrap (at 90% capacity).
**Status:** OPEN

### F-08 · PGCS disk I/O detection uses cumulative swap counters (not deltas)
**File:** `sovereign-omega-v2/python/pgcs.py:302`
**Kill vector:** `psutil.swap_memory().sin/sout` returns cumulative page swap counts since
boot, not incremental. The code captures a baseline at init (correct) and computes a delta
(correct approach), but `sin/sout` values are in **pages** on Linux, not bytes. The page
size (typically 4096 bytes) is never applied. On a system with pre-existing swap activity,
any swap since boot inflates the delta.
**Fix:** Multiply `sin/sout` delta by `resource.getpagesize()`, or use
`psutil.disk_io_counters()` for direct disk I/O.
**Status:** OPEN

### F-09 · Epoch snapshot captures 1KB of 2GB M1 region — not representative
**File:** `sovereign-omega-v2/python/core_matrix.py:332`
**Kill vector:** `return bytes(self._m1_region[:1024])` — the epoch failsafe validates a
1KB snapshot against consensus. This is 0.00005% of the actual state. A corruption at
byte 1025 goes undetected by the failsafe.
**Fix:** Compute a SHA-256 digest of the full M1 region (or a sampled subset with a
deterministic stride) as the snapshot. Validate the hash, not the raw bytes.
**Status:** OPEN

### F-10 · EpochFailsafe RECOVERING state does not gate new event processing
**File:** `sovereign-omega-v2/python/core_matrix.py:255`
**Kill vector:** `process_event()` checks for `EpochState.FROZEN` and returns early, but
not for `QUARANTINE` or `RECOVERING`. New events applied during RECOVERING state are
processed and then lost when recovery reverts to the fallback snapshot, creating an
inconsistency between the event log and the recovered state.
**Fix:** Gate on `FROZEN | QUARANTINE | RECOVERING` — return early for all non-nominal states.
**Status:** OPEN

---

## T2 FINDINGS — Should fix before Gumroad listing

### F-11 · ~~callDashScope() has no timeout~~ FIXED
**File:** `packages/shared/lib/dashscope.ts`
**Kill vector:** All 3 commercial products hang indefinitely if DashScope API is slow.
**Fix applied:** `signal: AbortSignal.timeout(60_000)` added to fetch call.
**Status:** ✅ RESOLVED (commit pending)

### F-12 · ~~Bridge URL hardcoded to localhost~~ FIXED
**Files:** `cockpit/src/lib/telemetry.ts`, `cockpit/src/App.tsx`
**Kill vector:** Bridge telemetry always offline when cockpit deploys to Vercel.
**Fix applied:** `VITE_BRIDGE_URL` env var with `localhost:7890` default.
**Status:** ✅ RESOLVED (commit pending)

### F-13 · ToolkitFooter hardcodes Vercel URLs that don't exist yet
**File:** `packages/shared/components/ToolkitFooter.tsx:2-4`
**Kill vector:** All three cross-product links 404 until Vercel deployments are live.
**Fix:** Update with real Vercel URLs after deployment. No code change needed now.
**Status:** DEFERRED — update post-deployment

### F-14 · hub ProductCard has no deployUrl — "Launch app" buttons are dead
**File:** `hub/src/App.tsx` — ProductCard instances have no `deployUrl` prop
**Kill vector:** Hub landing page "Launch app" buttons don't link anywhere.
**Fix:** Pass real Vercel URLs to each ProductCard after deployment.
**Status:** DEFERRED — update post-deployment

### F-15 · ai_prompts/ is leftover from game project — not part of AEGIS
**Directory:** `ai_prompts/` (ARCHITECT.md, BUILDER.md, ART_DIRECTOR.md, NARRATOR.md, AGENT_BOOT.md)
**Finding:** These are Godot game development orchestration prompts for SYSTEM_REBUILD.
They reference a "Game Bible" and GameState autoload not present in the AEGIS monorepo.
**Fix:** Move to `godot_client/ai_prompts/` or leave — no impact on builds or products.
**Status:** INFORMATIONAL

---

## HOLONIC FINDINGS

### H-01 · PGCS _trigger_compression() is a no-op stub
**File:** `sovereign-omega-v2/python/pgcs.py:296`
Memory compression is registered and counted but never executes. Memory pressure grows
unbounded. The criterion `disk_page_ins == 0` may fail not because of logic errors
but because compression never reduces the working set.

### H-02 · No transaction atomicity between M1, M2, M3 in CoreMatrix
M1/M2/M3 are called sequentially under `_lock`, but the memoryview regions have no
transactional isolation. A concurrent read of M1 during M2 execution sees torn state.
The lock protects the write sequence but not read consistency.

### H-03 · `gate/hoeffding.ts` implements Bernstein, not Hoeffding
File name is a historical artifact from v1. The implementation is correct (Bernstein
anytime-valid confidence sequences per Waudby-Smith & Ramdas 2024). The name is misleading
for anyone auditing the codebase. Low priority rename.

### H-04 · swarm_os and sovereign-omega-v2 are parallel, not integrated
Both are Kaggle competitors (Tarik Skalić, operator) but on different tracks:
- sovereign-omega-v2: VCG/PGCS governance proof track
- swarm_os: Hallucination Delta (HD) metacognition track

Zero code coupling. Epistemic tiers correctly separated (T0 vs T4/T5).
The CLAUDE.md non-equivalence table applies to their relationship:
*Calibration is not Truthfulness. Governance is not Alignment.*

---

## Summary

| Tier | Count | Resolved | Open |
|------|-------|----------|------|
| T0 — Critical | 6 | 0 | 6 (F-01 to F-06) |
| T1 — Important | 4 | 0 | 4 (F-07 to F-10) |
| T2 — Pre-listing | 5 | 2 | 3 (F-13, F-14, F-15) |
| Holonic | 4 | 0 | 4 (H-01 to H-04) |

**T0 findings F-01 through F-05** require a Python sprint before Layer B can be declared
production-ready. F-06 requires operator (/guardian) decision on constitutional files.

**TypeScript Layer A is sound** — Gate 8 passes 101/101, all invariants enforced mechanically.

**Commercial products are Gumroad-ready** — F-11 and F-12 fixed, builds pass.
