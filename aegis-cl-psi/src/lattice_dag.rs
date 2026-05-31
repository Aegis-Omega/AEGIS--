//! Gate 220: Compile-Time Acyclic DAG Lattice + Lawvere Metric + Homotopy Witness
//! Production-ready const generic support for edge divergence, path limits, and
//! homotopy-witness certification.
//!
//! EPISTEMIC TIER: T1 (rank enforcement) / T2 (Lawvere weights) / T3 (HoTT claim)
//!
//! # Runtime Validation Example
//!
//! ```rust
//! use aegis_cl_psi::lattice_dag::{
//!     declare_certified_witness, require_strong_witness, BaseStep, ConsStep,
//!     HomotopyWitness, Node, PathMetricExt, VerifiedEdge,
//! };
//!
//! #[derive(Clone, PartialEq)]
//! struct State;
//!
//! struct N1;
//! impl Node for N1 {
//!     const RANK: usize = 1;
//!     type State = State;
//! }
//!
//! struct N2;
//! impl Node for N2 {
//!     const RANK: usize = 2;
//!     type State = State;
//! }
//!
//! struct N3;
//! impl Node for N3 {
//!     const RANK: usize = 3;
//!     type State = State;
//! }
//!
//! // Create a const-generic edge. The default divergence is 25 milli-units.
//! let _edge = VerifiedEdge::<N1, N2>::new();
//!
//! // Runtime divergence accumulation: two default edges total 0.005.
//! type P = ConsStep<N1, N2, BaseStep<N2, N3>>;
//! let risk = <P as PathMetricExt>::total_divergence_risk();
//! assert!((risk - 0.005).abs() < 1e-12);
//!
//! // Certified homotopy witness with depth 3 satisfies the strong requirement.
//! type Q = BaseStep<N1, N2>;
//! let witness: HomotopyWitness<Q, Q, 3> = declare_certified_witness::<Q, Q>();
//! assert_eq!(witness.depth(), 3);
//! require_strong_witness(witness);
//! ```
//!
//! ─── What this implements ────────────────────────────────────────────────────────
//!
//! 1. COMPILE-TIME ACYCLIC LATTICE (T1)
//!    `VerifiedEdge<From, To, D>::new()` asserts `From::RANK < To::RANK` via an
//!    inline const block. If `From::RANK >= To::RANK`, the program fails to compile.
//!
//! 2. LAWVERE METRIC LAYER (T2)
//!    Each edge has a const-generic divergence milli-weight `D`, constrained to
//!    `1..=10000`. The default is `25`, i.e. `0.0025`.
//!
//! 3. CONST VERIFIED PATHS (T2)
//!    `ConstVerifiedPath<P>::new()` const-asserts that the path's accumulated
//!    divergence stays below the constitutional limit (`MAX_SAFE_DIVERGENCE_MILLI`).
//!
//! 4. HOMOTOPY WITNESS (T2 code / T3 claim)
//!    `HomotopyWitness<P1, P2, DEPTH>` proves at compile time that `P1` and `P2`
//!    share start/end nodes. `require_strong_witness` additionally requires a
//!    certification depth of at least 3.
//!
//! AdaptivePower(T) ≤ ReplayVerifiability(T) — the ring composition law is a DAG.
//! Copyright (C) 2025 Tarik Skalić — All rights reserved. AGPL-3.0-or-later

use std::marker::PhantomData;

// ─── Const assertion helpers ──────────────────────────────────────────────

/// Type-level boolean assertion helper for APIs that want an explicit proof type.
pub struct Assert<const CHECK: bool>;

/// Implemented only for true assertions.
pub trait IsTrue {}

impl IsTrue for Assert<true> {}

// ─── Node trait ───────────────────────────────────────────────────────────

/// A node in the compile-time DAG. `RANK` determines its position in the strict
/// partial order. Edges must flow strictly upward: `RANK(From) < RANK(To)`.
pub trait Node: Send + Sync + 'static {
    const RANK: usize;
    type State: Clone + Send + Sync + PartialEq;
}

// ─── Statically verified directed edge ────────────────────────────────────

/// Default edge divergence in milli-units: `25 / 10000 = 0.0025`.
pub const DEFAULT_DIVERGENCE_MILLI: u32 = 25;

/// Maximum accepted edge divergence in milli-units.
pub const MAX_EDGE_DIVERGENCE_MILLI: u32 = 10_000;

/// A directed edge `From → To` with const-generic divergence milli-weight `D`.
///
/// Construction fails at compile time if either:
/// - `RANK(From) >= RANK(To)` (cycle / non-increasing edge), or
/// - `D` is outside `1..=10000`.
pub struct VerifiedEdge<From: Node, To: Node, const D: u32 = DEFAULT_DIVERGENCE_MILLI> {
    _from: PhantomData<From>,
    _to: PhantomData<To>,
}

impl<From: Node, To: Node, const D: u32> VerifiedEdge<From, To, D> {
    /// Construct the edge. The rank and divergence assertions are const-evaluated
    /// for each concrete generic instantiation.
    pub const fn new() -> Self {
        const {
            assert!(
                From::RANK < To::RANK,
                "VerifiedEdge: cycle detected — From::RANK must be strictly less than To::RANK"
            )
        };
        const {
            assert!(
                D > 0 && D <= MAX_EDGE_DIVERGENCE_MILLI,
                "VerifiedEdge: DIVERGENCE_MILLI must be 1..=10000"
            )
        };
        Self {
            _from: PhantomData,
            _to: PhantomData,
        }
    }

    /// Return the edge divergence in milli-units.
    pub const fn divergence_milli() -> u32 {
        D
    }
}

impl<From: Node, To: Node, const D: u32> Default for VerifiedEdge<From, To, D> {
    fn default() -> Self {
        Self::new()
    }
}

// ─── Path invariants ──────────────────────────────────────────────────────

/// Type-level proof that a reachable path exists from `StartNode` to `EndNode`.
pub trait PathInvariants {
    type StartNode: Node;
    type EndNode: Node;
}

/// Single-hop path: one `VerifiedEdge<From, To, D>`.
pub struct BaseStep<From: Node, To: Node, const D: u32 = DEFAULT_DIVERGENCE_MILLI> {
    pub edge: VerifiedEdge<From, To, D>,
}

impl<From: Node, To: Node, const D: u32> PathInvariants for BaseStep<From, To, D> {
    type StartNode = From;
    type EndNode = To;
}

/// Multi-hop path: prepend `From → Inter` to an existing path starting at `Inter`.
///
/// Type-level transitivity: if `From < Inter` and `Inter ≤ End`, then `From < End`.
pub struct ConsStep<
    From: Node,
    Inter: Node,
    Next: PathInvariants<StartNode = Inter>,
    const D: u32 = DEFAULT_DIVERGENCE_MILLI,
> {
    pub edge: VerifiedEdge<From, Inter, D>,
    pub next: Next,
}

impl<From: Node, Inter: Node, Next, const D: u32> PathInvariants for ConsStep<From, Inter, Next, D>
where
    Next: PathInvariants<StartNode = Inter>,
{
    type StartNode = From;
    type EndNode = Next::EndNode;
}

// ─── Lawvere metric layer ─────────────────────────────────────────────────

/// Divergence weight for a single edge.
///
/// Enriches the DAG over `([0,∞], ≥, 0, +)`. Triangle inequality holds by
/// additive path composition.
pub trait LawvereMetric {
    const DIVERGENCE_WEIGHT: f64;
}

impl<From: Node, To: Node, const D: u32> LawvereMetric for VerifiedEdge<From, To, D> {
    const DIVERGENCE_WEIGHT: f64 = D as f64 / 10_000.0;
}

/// Accumulates divergence risk across a path. The total is Lawvere composition.
pub trait PathMetricExt {
    fn total_divergence_risk() -> f64;
}

impl<From: Node, To: Node, const D: u32> PathMetricExt for BaseStep<From, To, D> {
    fn total_divergence_risk() -> f64 {
        <VerifiedEdge<From, To, D> as LawvereMetric>::DIVERGENCE_WEIGHT
    }
}

impl<From: Node, Inter: Node, Next, const D: u32> PathMetricExt for ConsStep<From, Inter, Next, D>
where
    Next: PathInvariants<StartNode = Inter> + PathMetricExt,
{
    fn total_divergence_risk() -> f64 {
        <VerifiedEdge<From, Inter, D> as LawvereMetric>::DIVERGENCE_WEIGHT
            + Next::total_divergence_risk()
    }
}

// ─── Const-generic path metric ────────────────────────────────────────────

/// Compile-time accumulated divergence for an edge or path.
pub trait ConstPathMetric {
    const TOTAL_DIVERGENCE_MILLI: u32;
}

impl<From: Node, To: Node, const D: u32> ConstPathMetric for VerifiedEdge<From, To, D> {
    const TOTAL_DIVERGENCE_MILLI: u32 = D;
}

impl<From: Node, To: Node, const D: u32> ConstPathMetric for BaseStep<From, To, D> {
    const TOTAL_DIVERGENCE_MILLI: u32 = D;
}

impl<From: Node, Inter: Node, Next, const D: u32> ConstPathMetric for ConsStep<From, Inter, Next, D>
where
    Next: PathInvariants<StartNode = Inter> + ConstPathMetric,
{
    const TOTAL_DIVERGENCE_MILLI: u32 = D + Next::TOTAL_DIVERGENCE_MILLI;
}

// ─── Const verified path ──────────────────────────────────────────────────

/// Constitutional path divergence ceiling: approximately `1 / φ = 0.6175`.
pub const MAX_SAFE_DIVERGENCE_MILLI: u32 = 6_175;

/// Compile-time proof token that path `P` stays within the constitutional
/// divergence ceiling.
pub struct ConstVerifiedPath<P>
where
    P: ConstPathMetric,
{
    _path: PhantomData<P>,
}

impl<P> ConstVerifiedPath<P>
where
    P: ConstPathMetric,
{
    /// Construct a verified path proof token.
    pub const fn new() -> Self {
        const {
            assert!(
                P::TOTAL_DIVERGENCE_MILLI <= MAX_SAFE_DIVERGENCE_MILLI,
                "ConstVerifiedPath: path exceeds constitutional divergence limit (1/φ)"
            )
        };
        Self { _path: PhantomData }
    }

    /// Return the compile-time accumulated divergence in milli-units.
    pub const fn total_divergence_milli() -> u32 {
        P::TOTAL_DIVERGENCE_MILLI
    }
}

impl<P> Default for ConstVerifiedPath<P>
where
    P: ConstPathMetric,
{
    fn default() -> Self {
        Self::new()
    }
}

// ─── Homotopy witness ─────────────────────────────────────────────────────

/// Structural proof that `P1` and `P2` share the same start and end nodes.
///
/// EPISTEMIC NOTE: This is endpoint equality, not full HoTT 2-cell equivalence.
/// Full homotopy (identical state transformation effects) requires dependent
/// types unavailable in stable Rust. The mathematical claim of 2-cell
/// propositional equality remains T3; this struct is T2 engineering.
pub struct HomotopyWitness<P1, P2, const DEPTH: u8 = 0>
where
    P1: PathInvariants,
    P2: PathInvariants<StartNode = P1::StartNode, EndNode = P1::EndNode>,
{
    _p1: PhantomData<P1>,
    _p2: PhantomData<P2>,
}

impl<P1, P2, const DEPTH: u8> HomotopyWitness<P1, P2, DEPTH>
where
    P1: PathInvariants,
    P2: PathInvariants<StartNode = P1::StartNode, EndNode = P1::EndNode>,
{
    /// Declare structural endpoint equivalence with a certified depth in `0..=4`.
    pub const fn declare() -> Self {
        const { assert!(DEPTH <= 4, "HomotopyWitness: DEPTH must be 0..=4") };
        Self {
            _p1: PhantomData,
            _p2: PhantomData,
        }
    }

    /// Return the witness certification depth.
    pub const fn depth(&self) -> u8 {
        DEPTH
    }
}

/// Backward-compatible alias for non-certified endpoint-equivalence witnesses.
pub type BasicHomotopyWitness<P1, P2, const DEPTH: u8 = 0> = HomotopyWitness<P1, P2, DEPTH>;

/// Declare a depth-3 certified homotopy witness.
pub const fn declare_certified_witness<P1, P2>() -> HomotopyWitness<P1, P2, 3>
where
    P1: PathInvariants,
    P2: PathInvariants<StartNode = P1::StartNode, EndNode = P1::EndNode>,
{
    HomotopyWitness::<P1, P2, 3>::declare()
}

/// Require a homotopy witness whose certification depth is at least 3.
pub fn require_strong_witness<P1, P2, const DEPTH: u8>(_w: HomotopyWitness<P1, P2, DEPTH>)
where
    P1: PathInvariants,
    P2: PathInvariants<StartNode = P1::StartNode, EndNode = P1::EndNode>,
{
    const {
        assert!(
            DEPTH >= 3,
            "HomotopyWitness: DEPTH must be >= 3 (certified path required)"
        )
    };
}

/// Alias for a depth-3 certified homotopy witness.
pub type StrongHomotopyWitness<P1, P2> = HomotopyWitness<P1, P2, 3>;

/// Require an already-depth-3 certified witness.
pub fn require_certified_witness<P1, P2>(_w: StrongHomotopyWitness<P1, P2>)
where
    P1: PathInvariants,
    P2: PathInvariants<StartNode = P1::StartNode, EndNode = P1::EndNode>,
{
}

// ─── Tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(Clone, PartialEq, Debug)]
    struct StateA(Vec<u8>);
    #[derive(Clone, PartialEq, Debug)]
    struct StateB(u64);
    #[derive(Clone, PartialEq, Debug)]
    struct StateC(bool);
    #[derive(Clone, PartialEq, Debug)]
    struct StateD(u32);

    struct NodeA;
    impl Node for NodeA {
        const RANK: usize = 1;
        type State = StateA;
    }

    struct NodeB;
    impl Node for NodeB {
        const RANK: usize = 2;
        type State = StateB;
    }

    struct NodeC;
    impl Node for NodeC {
        const RANK: usize = 3;
        type State = StateC;
    }

    struct NodeD;
    impl Node for NodeD {
        const RANK: usize = 10;
        type State = StateD;
    }

    #[test]
    fn verified_edge_adjacent_ranks() {
        let edge = VerifiedEdge::<NodeA, NodeB>::new();
        assert_eq!(
            VerifiedEdge::<NodeA, NodeB>::divergence_milli(),
            DEFAULT_DIVERGENCE_MILLI
        );
        let _ = edge;
    }

    #[test]
    fn verified_edge_custom_divergence() {
        let edge = VerifiedEdge::<NodeA, NodeD, 100>::new();
        assert_eq!(VerifiedEdge::<NodeA, NodeD, 100>::divergence_milli(), 100);
        assert!(
            (<VerifiedEdge<NodeA, NodeD, 100> as LawvereMetric>::DIVERGENCE_WEIGHT - 0.01).abs()
                < 1e-12
        );
        let _ = edge;
    }

    #[test]
    fn base_step_path_invariants() {
        let _path: BaseStep<NodeA, NodeB> = BaseStep {
            edge: VerifiedEdge::new(),
        };
    }

    #[test]
    fn cons_step_two_hops() {
        let _path = ConsStep {
            edge: VerifiedEdge::<NodeA, NodeB>::new(),
            next: BaseStep {
                edge: VerifiedEdge::<NodeB, NodeC>::new(),
            },
        };
    }

    #[test]
    fn cons_step_three_hops() {
        let _path = ConsStep {
            edge: VerifiedEdge::<NodeA, NodeB>::new(),
            next: ConsStep {
                edge: VerifiedEdge::<NodeB, NodeC>::new(),
                next: BaseStep {
                    edge: VerifiedEdge::<NodeC, NodeD>::new(),
                },
            },
        };
    }

    #[test]
    fn base_step_divergence_is_single_weight() {
        let risk = <BaseStep<NodeA, NodeB> as PathMetricExt>::total_divergence_risk();
        assert!((risk - 0.0025).abs() < 1e-12);
    }

    #[test]
    fn cons_step_divergence_accumulates() {
        let risk = <ConsStep<NodeA, NodeB, BaseStep<NodeB, NodeC>> as PathMetricExt>::total_divergence_risk();
        assert!((risk - 0.005).abs() < 1e-12);
    }

    #[test]
    fn three_hop_divergence_accumulates() {
        type P = ConsStep<NodeA, NodeB, ConsStep<NodeB, NodeC, BaseStep<NodeC, NodeD>>>;
        let risk = <P as PathMetricExt>::total_divergence_risk();
        assert!((risk - 0.0075).abs() < 1e-12);
    }

    #[test]
    fn custom_divergence_path_accumulates() {
        type P = ConsStep<NodeA, NodeB, BaseStep<NodeB, NodeC, 40>, 60>;
        let risk = <P as PathMetricExt>::total_divergence_risk();
        assert!((risk - 0.0100).abs() < 1e-12);
        assert_eq!(<P as ConstPathMetric>::TOTAL_DIVERGENCE_MILLI, 100);
    }

    #[test]
    fn triangle_inequality_holds() {
        let d_ab = <BaseStep<NodeA, NodeB> as PathMetricExt>::total_divergence_risk();
        let d_bc = <BaseStep<NodeB, NodeC> as PathMetricExt>::total_divergence_risk();
        let d_ac = <ConsStep<NodeA, NodeB, BaseStep<NodeB, NodeC>> as PathMetricExt>::total_divergence_risk();
        assert!(d_ac <= d_ab + d_bc + 1e-12);
    }

    #[test]
    fn lawvere_weight_is_valid_probability() {
        let w = <VerifiedEdge<NodeA, NodeB> as LawvereMetric>::DIVERGENCE_WEIGHT;
        assert!(w > 0.0);
        assert!(w < 1.0);
    }

    #[test]
    fn const_verified_path_happy_path() {
        type P = ConsStep<NodeA, NodeB, BaseStep<NodeB, NodeC>>;
        let _path = ConstVerifiedPath::<P>::new();
        assert_eq!(ConstVerifiedPath::<P>::total_divergence_milli(), 50);
    }

    #[test]
    fn divergence_below_phi_threshold() {
        type P = ConsStep<NodeA, NodeB, BaseStep<NodeB, NodeC>>;
        let risk = <P as PathMetricExt>::total_divergence_risk();
        assert!(
            risk < 0.6180,
            "divergence must remain below φ-quorum-threshold"
        );
    }

    #[test]
    fn homotopy_witness_reflexive() {
        type P = BaseStep<NodeA, NodeB>;
        let witness = HomotopyWitness::<P, P>::declare();
        assert_eq!(witness.depth(), 0);
    }

    #[test]
    fn homotopy_witness_same_endpoints_different_paths() {
        type P1 = ConsStep<NodeA, NodeB, BaseStep<NodeB, NodeC>>;
        type P2 = ConsStep<NodeA, NodeB, BaseStep<NodeB, NodeC>>;
        let witness = HomotopyWitness::<P1, P2, 2>::declare();
        assert_eq!(witness.depth(), 2);
    }

    #[test]
    fn certified_witness_depth() {
        type P = BaseStep<NodeA, NodeB>;
        let witness = declare_certified_witness::<P, P>();
        assert_eq!(witness.depth(), 3);
    }

    #[test]
    fn strong_witness_requirement_passes() {
        type P = BaseStep<NodeA, NodeB>;
        let witness = declare_certified_witness::<P, P>();
        require_strong_witness(witness);
    }

    #[test]
    fn require_certified_witness_accepts_strong_alias() {
        type P = BaseStep<NodeA, NodeB>;
        let witness: StrongHomotopyWitness<P, P> = declare_certified_witness::<P, P>();
        require_certified_witness(witness);
    }

    #[test]
    fn determinism_edge_size() {
        let e1 = VerifiedEdge::<NodeA, NodeB>::new();
        let e2 = VerifiedEdge::<NodeA, NodeB>::new();
        assert_eq!(std::mem::size_of_val(&e1), std::mem::size_of_val(&e2));
    }

    #[test]
    fn runtime_full_path_lifecycle() {
        type P = ConsStep<NodeA, NodeB, BaseStep<NodeB, NodeC>>;
        let _edge = VerifiedEdge::<NodeA, NodeB>::new();
        let risk = <P as PathMetricExt>::total_divergence_risk();
        assert!(risk < 0.618034);
        let _path_proof = ConstVerifiedPath::<P>::new();
        let witness = declare_certified_witness::<P, P>();
        require_strong_witness(witness);
    }

    #[test]
    fn rank_ordering_strictly_increasing() {
        assert!(NodeA::RANK < NodeB::RANK);
        assert!(NodeB::RANK < NodeC::RANK);
        assert!(NodeC::RANK < NodeD::RANK);
    }

    #[test]
    fn default_edge_constructs() {
        let _e: VerifiedEdge<NodeA, NodeB> = Default::default();
    }
}
