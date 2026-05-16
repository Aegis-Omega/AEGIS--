---
name: vcg-calibration
description: Automatically invoked when the user mentions calibration, VCG, confidence scores, verifier results, or asks about the reliability of system outputs. Ensures VCG tracker usage follows the frozen spec and trust partitioning rules.
---

# VCG Calibration Skill

When invoked, verify that any VCG computation or confidence emission follows the
spec requirements from Section 4 of SOVEREIGN_OMEGA_INTEGRATED_SPEC_v2.md.

Key constraints to enforce:

Rolling window is 500 claims by default. The minimum window for gate activation is
100 claims — below this threshold, only heuristic confidence may be emitted, never
verified confidence. If a verified confidence value is being emitted with fewer than
100 claims in the window, flag it as a calibration violation.

The Vempala-Wilkes floor applies. VCG cannot reach zero for correctly operating
autoregressive models on well-defined verifiable tasks. Any code that treats VCG=0
as a success condition or a target is incorrect. VCG=0 in practice indicates a
measurement error or a trivially easy verifier, not perfect calibration.

V4 (LLM judges) and V5 (human review) verifier results must never enter the VCG
computation. The CalibrationDomain.ADVISORY_EXCLUDED partition has calibration weight
zero. If advisory verifier results appear in a VCG sum, flag it immediately.

Bootstrap CI uses the seeded PRNG from src/calibration/rng.ts with seeds derived
from the event substrate. If Date.now() or Math.random() appears in any bootstrap
CI computation, flag it as a determinism violation.

CALIBRATION_STALE fires when no new verifier results have arrived within 24 hours.
This event must be logged to the event substrate, not silently swallowed.
