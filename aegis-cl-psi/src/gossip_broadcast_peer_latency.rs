//! Gate 423 — Gossip Broadcast Peer Latency Monitor (T2)
//! Tracks high-latency peer rate per gossip broadcast epoch.
//! LATENCY_THRESHOLD = 20: latency_rate_pct > 20 → excessive_latency

use sha2::{Sha256, Digest};

pub const PEER_LATENCY_GENESIS_HASH: [u8; 32] = [0u8; 32];
pub const LATENCY_THRESHOLD: u32 = 20;

// ─── GossipBroadcastPeerLatencyEntry ─────────────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
pub struct GossipBroadcastPeerLatencyEntry {
    pub epoch_end:         u64,
    pub high_latency_peers: u32,
    pub total_peers:       u32,
    pub latency_rate_pct:  u32,
    pub excessive_latency: bool,
    pub entry_hash:        [u8; 32],
    pub prev_hash:         [u8; 32],
}

fn compute_peer_latency_hash(
    prev:                &[u8; 32],
    epoch_end:           u64,
    high_latency_peers:  u32,
    total_peers:         u32,
    latency_rate_pct:    u32,
    excessive_latency:   bool,
) -> [u8; 32] {
    let mut h = Sha256::new();
    h.update(prev);
    h.update(epoch_end.to_be_bytes());
    h.update(high_latency_peers.to_be_bytes());
    h.update(total_peers.to_be_bytes());
    h.update(latency_rate_pct.to_be_bytes());
    h.update([excessive_latency as u8]);
    h.finalize().into()
}

// ─── GossipBroadcastPeerLatencyLog ───────────────────────────────────────────

pub struct GossipBroadcastPeerLatencyLog {
    entries: Vec<GossipBroadcastPeerLatencyEntry>,
}

impl GossipBroadcastPeerLatencyLog {
    pub fn new() -> Self { Self { entries: Vec::new() } }

    pub fn entry_count(&self) -> usize { self.entries.len() }
    pub fn is_empty(&self)    -> bool  { self.entries.is_empty() }
    pub fn entries(&self)     -> &[GossipBroadcastPeerLatencyEntry] { &self.entries }
    pub fn latest(&self)      -> Option<&GossipBroadcastPeerLatencyEntry> { self.entries.last() }

    /// Count of epochs where excessive_latency == true.
    pub fn excessive_latency_count(&self) -> usize {
        self.entries.iter().filter(|e| e.excessive_latency).count()
    }

    /// Sum of all high_latency_peers values across all epochs.
    pub fn total_high_latency_peers(&self) -> u64 {
        self.entries.iter().map(|e| e.high_latency_peers as u64).sum()
    }

    /// Integer mean of all per-epoch latency_rate_pct values. Returns 0 if empty.
    pub fn mean_latency_rate_pct(&self) -> u32 {
        if self.entries.is_empty() { return 0; }
        let sum: u64 = self.entries.iter().map(|e| e.latency_rate_pct as u64).sum();
        (sum / self.entries.len() as u64) as u32
    }

    /// Record peer latency stats for one epoch.
    /// latency_rate_pct = (high_latency_peers * 100) / max(total_peers, 1), capped at 100.
    /// excessive_latency = latency_rate_pct > LATENCY_THRESHOLD.
    pub fn record(
        &mut self,
        epoch_end:          u64,
        high_latency_peers: u32,
        total_peers:        u32,
    ) -> &GossipBroadcastPeerLatencyEntry {
        let denom = total_peers.max(1) as u64;
        let latency_rate_pct = ((high_latency_peers as u64 * 100) / denom).min(100) as u32;
        let excessive_latency = latency_rate_pct > LATENCY_THRESHOLD;

        let prev = self.entries.last()
            .map(|e| e.entry_hash)
            .unwrap_or(PEER_LATENCY_GENESIS_HASH);

        let entry_hash = compute_peer_latency_hash(
            &prev, epoch_end, high_latency_peers, total_peers, latency_rate_pct, excessive_latency,
        );

        self.entries.push(GossipBroadcastPeerLatencyEntry {
            epoch_end,
            high_latency_peers,
            total_peers,
            latency_rate_pct,
            excessive_latency,
            entry_hash,
            prev_hash: prev,
        });
        self.entries.last().unwrap()
    }

    pub fn verify_chain(&self) -> (bool, Option<usize>) {
        let mut prev = PEER_LATENCY_GENESIS_HASH;
        for (i, e) in self.entries.iter().enumerate() {
            if e.prev_hash != prev {
                return (false, Some(i));
            }
            let expected = compute_peer_latency_hash(
                &prev, e.epoch_end, e.high_latency_peers, e.total_peers,
                e.latency_rate_pct, e.excessive_latency,
            );
            if e.entry_hash != expected {
                return (false, Some(i));
            }
            prev = e.entry_hash;
        }
        (true, None)
    }
}

impl Default for GossipBroadcastPeerLatencyLog {
    fn default() -> Self { Self::new() }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // 1. record fields correct (latency_rate_pct computed, excessive_latency=true when > 20)
    #[test]
    fn record_fields_correct() {
        let mut log = GossipBroadcastPeerLatencyLog::new();
        let e = log.record(1, 25, 100);
        assert_eq!(e.epoch_end, 1);
        assert_eq!(e.high_latency_peers, 25);
        assert_eq!(e.total_peers, 100);
        assert_eq!(e.latency_rate_pct, 25); // 25*100/100 = 25
        assert!(e.excessive_latency);       // 25 > 20
    }

    // 2. excessive_latency=false when latency_rate_pct == 20 (exactly at threshold)
    #[test]
    fn at_threshold_not_excessive() {
        let mut log = GossipBroadcastPeerLatencyLog::new();
        let e = log.record(1, 20, 100);
        assert_eq!(e.latency_rate_pct, 20);
        assert!(!e.excessive_latency); // == 20 is NOT > 20
    }

    // 3. latency_rate_pct capped at 100
    #[test]
    fn latency_rate_capped_at_100() {
        let mut log = GossipBroadcastPeerLatencyLog::new();
        let e = log.record(1, 200, 100);
        assert_eq!(e.latency_rate_pct, 100);
    }

    // 4. total_peers=0 → no div-by-zero (max(0,1)=1)
    #[test]
    fn total_peers_zero_no_div_by_zero() {
        let mut log = GossipBroadcastPeerLatencyLog::new();
        let e = log.record(1, 0, 0);
        assert_eq!(e.latency_rate_pct, 0);
        assert!(!e.excessive_latency);
    }

    // 5. LATENCY_THRESHOLD == 20
    #[test]
    fn latency_threshold_is_20() {
        assert_eq!(LATENCY_THRESHOLD, 20);
    }

    // 6. entry_hash is 32 bytes and non-zero
    #[test]
    fn entry_hash_nonzero() {
        let mut log = GossipBroadcastPeerLatencyLog::new();
        let e = log.record(1, 5, 100);
        assert_ne!(e.entry_hash, [0u8; 32]);
        assert_eq!(e.entry_hash.len(), 32);
    }

    // 7. first entry prev_hash == PEER_LATENCY_GENESIS_HASH
    #[test]
    fn first_entry_prev_hash_is_genesis() {
        let mut log = GossipBroadcastPeerLatencyLog::new();
        let e = log.record(1, 5, 100);
        assert_eq!(e.prev_hash, PEER_LATENCY_GENESIS_HASH);
    }

    // 8. second entry prev_hash == first entry_hash
    #[test]
    fn second_entry_prev_hash_links_to_first() {
        let mut log = GossipBroadcastPeerLatencyLog::new();
        log.record(1, 5, 100);
        let h0 = log.entries()[0].entry_hash;
        log.record(2, 8, 100);
        assert_eq!(log.entries()[1].prev_hash, h0);
    }

    // 9. verify_chain empty → (true, None)
    #[test]
    fn verify_chain_empty_ok() {
        let log = GossipBroadcastPeerLatencyLog::new();
        let (ok, idx) = log.verify_chain();
        assert!(ok);
        assert!(idx.is_none());
    }

    // 10. verify_chain 1-entry → (true, None)
    #[test]
    fn verify_chain_one_entry_ok() {
        let mut log = GossipBroadcastPeerLatencyLog::new();
        log.record(1, 5, 100);
        let (ok, idx) = log.verify_chain();
        assert!(ok);
        assert!(idx.is_none());
    }

    // 11. verify_chain 3-entry → (true, None)
    #[test]
    fn verify_chain_three_entries_ok() {
        let mut log = GossipBroadcastPeerLatencyLog::new();
        log.record(1, 5, 100);
        log.record(2, 10, 100);
        log.record(3, 25, 100);
        let (ok, idx) = log.verify_chain();
        assert!(ok);
        assert!(idx.is_none());
    }

    // 12. verify_chain tamper entry[0].entry_hash → (false, Some(0))
    #[test]
    fn verify_chain_tamper_entry0_detected() {
        let mut log = GossipBroadcastPeerLatencyLog::new();
        log.record(1, 5, 100);
        log.record(2, 10, 100);
        log.record(3, 25, 100);
        log.entries[0].entry_hash[0] ^= 0xFF;
        let (ok, idx) = log.verify_chain();
        assert!(!ok);
        assert_eq!(idx, Some(0));
    }

    // 13. verify_chain tamper entry[1].entry_hash → (false, Some(1)) on 3-entry log
    #[test]
    fn verify_chain_tamper_entry1_detected() {
        let mut log = GossipBroadcastPeerLatencyLog::new();
        log.record(1, 5, 100);
        log.record(2, 10, 100);
        log.record(3, 25, 100);
        log.entries[1].entry_hash[0] ^= 0xFF;
        let (ok, idx) = log.verify_chain();
        assert!(!ok);
        assert_eq!(idx, Some(1));
    }

    // 14. determinism: same inputs ×3 independent logs → same entry_hash
    #[test]
    fn entry_hash_deterministic() {
        let mut l1 = GossipBroadcastPeerLatencyLog::new();
        let mut l2 = GossipBroadcastPeerLatencyLog::new();
        let mut l3 = GossipBroadcastPeerLatencyLog::new();
        let h1 = l1.record(7, 15, 60).entry_hash;
        let h2 = l2.record(7, 15, 60).entry_hash;
        let h3 = l3.record(7, 15, 60).entry_hash;
        assert_eq!(h1, h2);
        assert_eq!(h2, h3);
    }

    // 15. excessive_latency_count() correct for mixed log
    #[test]
    fn excessive_latency_count_correct() {
        let mut log = GossipBroadcastPeerLatencyLog::new();
        log.record(1, 10, 100); // 10% — ok
        log.record(2, 25, 100); // 25% — excessive
        log.record(3, 20, 100); // 20% — at threshold, not excessive
        log.record(4, 50, 100); // 50% — excessive
        assert_eq!(log.excessive_latency_count(), 2);
    }

    // 16. total_high_latency_peers() sums correctly
    #[test]
    fn total_high_latency_peers_correct() {
        let mut log = GossipBroadcastPeerLatencyLog::new();
        log.record(1, 3, 50);
        log.record(2, 7, 80);
        log.record(3, 2, 30);
        assert_eq!(log.total_high_latency_peers(), 12);
    }

    // 17. mean_latency_rate_pct() empty → 0
    #[test]
    fn mean_latency_rate_pct_empty_zero() {
        let log = GossipBroadcastPeerLatencyLog::new();
        assert_eq!(log.mean_latency_rate_pct(), 0);
    }

    // 18. mean_latency_rate_pct() multi-entry correct (integer avg)
    #[test]
    fn mean_latency_rate_pct_multi_entry_correct() {
        let mut log = GossipBroadcastPeerLatencyLog::new();
        log.record(1, 10, 100); // 10%
        log.record(2, 20, 100); // 20%
        log.record(3, 30, 100); // 30%
        // (10 + 20 + 30) / 3 = 20
        assert_eq!(log.mean_latency_rate_pct(), 20);
    }

    // 19. Default → 0 entries
    #[test]
    fn default_has_zero_entries() {
        let log = GossipBroadcastPeerLatencyLog::default();
        assert_eq!(log.entry_count(), 0);
        assert!(log.is_empty());
    }
}
