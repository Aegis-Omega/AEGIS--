//! AEGIS-Ω Distributed Agent Swarm Runtime
//!
//! EPISTEMIC TIER: T2 (engineering hypothesis)
//! Constitutional root: AdaptivePower(T) ≤ ReplayVerifiability(T)
//!
//! # Seven Technical Pillars
//!
//! 1. `state_anchor`     — Root cryptographic state anchor (SHA-256 hash-chained ledger)
//! 2. `domain_firewall`  — Strict domain-isolated memory sandbox (OpaqueSegmentKey)
//! 3. `affine_canvas`    — Deterministic affine multi-agent coordinate space
//! 4. `semantic_graph`   — Hierarchical sparse-matrix semantic knowledge graph
//! 5. `validation_dfa`   — Syntactic validation DFA (compile-time state table)
//! 6. `gossip_emitter`   — Zero-copy UDP scatter-gather gossip protocol
//! 7. `hysteresis`       — Non-linear hysteresis peer reputation filter
//!
//! # Constitutional Invariants
//! - BTreeMap throughout — no HashMap; deterministic iteration order enforced
//! - No tokio — std::thread + std::net::UdpSocket only
//! - No wall-clock time in determinism-critical paths — sequence numbers drive cadence
//! - active_violations == 0 required for T0 pass (mirrors corruption_count)

pub mod affine_canvas;
pub mod domain_firewall;
pub mod gossip_emitter;
pub mod hysteresis;
pub mod semantic_graph;
pub mod state_anchor;
pub mod validation_dfa;

pub const AEGIS_PROTOCOL_MAGIC: u16 = 0xE0E0;
pub const MAXIMUM_SWARM_NODES: usize = 1024;
pub const SCHEMA_VERSION: u16 = 0x0001;
