//! Pillar 7 — Non-Linear Hysteresis Peer Reputation Filter
//!
//! EPISTEMIC TIER: T2 (engineering hypothesis)
//!
//! Prevents network flapping and state-manipulation exploits. Peers that emit
//! malformed packets or drift from consensus are throttled via an exponential
//! dampening curve. The penalty scales non-linearly — isolated errors cause
//! minimal degradation; recurring faults create a steep mathematical cliff.
//!
//! Reputation score: 0–10000 (scaled integer, 10000 = fully trusted).
//! Recovery rate decreases exponentially with demotion count.
//! Quarantine threshold: score < QUARANTINE_THRESHOLD.
//!
//! Constitutional invariants:
//! - No floating-point — all arithmetic is integer
//! - BTreeMap<PeerId, PeerRecord> — deterministic iteration
//! - Recovery is strictly bounded: can never exceed MAX_SCORE
//! - Penalty is non-linear: each demotion doubles the penalty weight (bit-shift)

use std::collections::BTreeMap;

pub type PeerId = u64;

/// Maximum reputation score (fully trusted).
pub const MAX_SCORE: u16 = 10_000;

/// Score below which a peer is quarantined (no messages routed).
pub const QUARANTINE_THRESHOLD: u16 = 2_000;

/// Score below which a peer is soft-throttled (messages delayed).
pub const THROTTLE_THRESHOLD: u16 = 5_000;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PeerStatus {
    Trusted,
    Throttled,
    Quarantined,
}

/// Per-peer reputation record.
#[derive(Clone, Debug)]
pub struct PeerRecord {
    pub peer_id: PeerId,
    pub score: u16,
    pub demotion_count: u16,
    pub penalty_events: u32,
    pub recovery_events: u32,
}

impl PeerRecord {
    pub fn new(peer_id: PeerId) -> Self {
        Self { peer_id, score: MAX_SCORE, demotion_count: 0, penalty_events: 0, recovery_events: 0 }
    }

    pub fn status(&self) -> PeerStatus {
        if self.score < QUARANTINE_THRESHOLD { PeerStatus::Quarantined }
        else if self.score < THROTTLE_THRESHOLD { PeerStatus::Throttled }
        else { PeerStatus::Trusted }
    }

    pub fn is_quarantined(&self) -> bool { self.status() == PeerStatus::Quarantined }
}

/// Non-linear penalty weight for the n-th demotion event.
/// penalty_weight(0) = 500, penalty_weight(1) = 1000, penalty_weight(2) = 2000...
/// Capped at MAX_SCORE to prevent overflow.
///
/// Fixes the spec's `calculate_hysteresis_recovery` bug (1i16.checked_shr always returns 0).
pub fn penalty_weight(demotion_count: u16) -> u16 {
    let shift = demotion_count.min(4) as u32; // cap at shift=4 → max weight 8000
    let base: u32 = 500u32 << shift;          // 500 * 2^n
    base.min(MAX_SCORE as u32) as u16
}

/// Recovery increment after n demotions — halves with each demotion.
/// recovery_increment(0) = 200, (1) = 100, (2) = 50, (3) = 25, ... floor at 1.
pub fn recovery_increment(demotion_count: u16) -> u16 {
    let shift = demotion_count.min(7) as u32;
    let inc: u32 = 200u32 >> shift;
    inc.max(1) as u16
}

/// The peer reputation registry and filter.
pub struct HysteresisFilter {
    peers: BTreeMap<PeerId, PeerRecord>,
    total_quarantined: u32,
    total_penalties: u32,
}

impl HysteresisFilter {
    pub fn new() -> Self {
        Self { peers: BTreeMap::new(), total_quarantined: 0, total_penalties: 0 }
    }

    /// Register a new peer at full trust.
    pub fn register_peer(&mut self, id: PeerId) {
        self.peers.entry(id).or_insert_with(|| PeerRecord::new(id));
    }

    /// Apply a penalty event (malformed packet, consensus drift, etc.).
    /// Returns the new status.
    pub fn penalize(&mut self, id: PeerId) -> PeerStatus {
        let rec = self.peers.entry(id).or_insert_with(|| PeerRecord::new(id));
        let weight = penalty_weight(rec.demotion_count);
        rec.score = rec.score.saturating_sub(weight);
        rec.demotion_count += 1;
        rec.penalty_events += 1;
        self.total_penalties += 1;
        let status = rec.status();
        if status == PeerStatus::Quarantined { self.total_quarantined += 1; }
        status
    }

    /// Apply a recovery tick (positive behavior observed).
    /// Returns the new score.
    pub fn recover(&mut self, id: PeerId) -> u16 {
        let rec = self.peers.entry(id).or_insert_with(|| PeerRecord::new(id));
        let inc = recovery_increment(rec.demotion_count);
        rec.score = rec.score.saturating_add(inc).min(MAX_SCORE);
        rec.recovery_events += 1;
        rec.score
    }

    pub fn get_peer(&self, id: PeerId) -> Option<&PeerRecord> { self.peers.get(&id) }
    pub fn peer_count(&self) -> usize { self.peers.len() }
    pub fn quarantined_count(&self) -> u32 { self.total_quarantined }
    pub fn total_penalties(&self) -> u32 { self.total_penalties }

    /// Active quarantine count — peers currently below threshold.
    pub fn active_quarantines(&self) -> u16 {
        self.peers.values().filter(|r| r.is_quarantined()).count() as u16
    }
}

impl Default for HysteresisFilter { fn default() -> Self { Self::new() } }

#[cfg(test)]
mod tests {
    use super::*;

    #[test] fn new_peer_is_trusted() {
        let mut f = HysteresisFilter::new();
        f.register_peer(1);
        assert_eq!(f.get_peer(1).unwrap().status(), PeerStatus::Trusted);
    }

    #[test] fn single_penalty_reduces_score() {
        let mut f = HysteresisFilter::new();
        f.register_peer(1);
        f.penalize(1);
        let score = f.get_peer(1).unwrap().score;
        assert!(score < MAX_SCORE);
    }

    #[test] fn repeated_penalties_quarantine() {
        let mut f = HysteresisFilter::new();
        f.register_peer(42);
        // Apply enough penalties to drop below QUARANTINE_THRESHOLD
        for _ in 0..8 { f.penalize(42); }
        assert!(f.get_peer(42).unwrap().is_quarantined());
    }

    #[test] fn penalty_weight_increases_nonlinearly() {
        let w0 = penalty_weight(0);
        let w1 = penalty_weight(1);
        let w2 = penalty_weight(2);
        assert!(w0 < w1 && w1 < w2, "penalty must be non-linear: w0={} w1={} w2={}", w0, w1, w2);
        assert_eq!(w1, w0 * 2); // exactly doubles
    }

    #[test] fn recovery_decreases_with_demotions() {
        let r0 = recovery_increment(0);
        let r1 = recovery_increment(1);
        let r3 = recovery_increment(3);
        assert!(r0 > r1 && r1 > r3);
    }

    #[test] fn recovery_floor_is_1() {
        assert_eq!(recovery_increment(100), 1);
    }

    #[test] fn penalty_weight_capped_at_max() {
        assert!(penalty_weight(100) <= MAX_SCORE);
    }

    #[test] fn recovery_cannot_exceed_max_score() {
        let mut f = HysteresisFilter::new();
        f.register_peer(1);
        for _ in 0..1000 { f.recover(1); }
        assert_eq!(f.get_peer(1).unwrap().score, MAX_SCORE);
    }

    #[test] fn active_quarantines_counts_correctly() {
        let mut f = HysteresisFilter::new();
        for id in 1..=3u64 { f.register_peer(id); }
        for _ in 0..8 { f.penalize(1); f.penalize(2); }
        assert_eq!(f.active_quarantines(), 2);
    }

    #[test] fn btreemap_peer_order_deterministic() {
        let mut f = HysteresisFilter::new();
        for id in [5u64, 2, 8, 1, 3] { f.register_peer(id); }
        let ids: Vec<PeerId> = f.peers.keys().copied().collect();
        assert_eq!(ids, vec![1, 2, 3, 5, 8]);
    }
}
