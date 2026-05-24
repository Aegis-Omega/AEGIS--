# AEGIS-Omega — Founding Stewardship Record

## Founding Architect

**Tarik Skalic** (tarikskalic33@gmail.com)
Bihac, Bosnia-Herzegovina

Originating architect of the AEGIS-Omega Constitutional Runtime. Author of:

- The Constitutional Governance Substrate (Gates 1–200)
- The Sovereign Cognition Protocol (Four-Directive Constitution)
- The 1/phi Holonic Governance Triad (martingale x swarm x router)
- The Seven-Pillar Distributed Agent Runtime (aegis-runtime)
- Multi-model BFT consensus at 1/phi

## Stewardship Scope

Stewardship is not authority. It is accountability: the founder is the named
custodian of the system's constitutional identity, not its controller.
The constitution governs; the founder authored it.

This founding record is anchored in the system's constitutional hash chain via
`buildCanonicalFounderRecord()` in `sovereign-omega-v2/src/constitutional/founder.ts`.
The `constitution_hash` in the founder record commits to the exact text of the four
directives at time of founding — if the directives change, the founder_hash
becomes invalid (immutable stewardship proof).

## License

AGPL-3.0-or-later — free to use, study, modify, and distribute;
derivative works must be released under the same terms.

See LICENSE for the full text.

## Constitutional Invariant

`genesis_sequence = 0n` — the founder record is anchored before any other
sequence in the chain. This is not a privilege; it is an accountability marker.
