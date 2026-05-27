//! Gate 424 — Gossip Broadcast Retry Rate Monitor (T2)
//! Tracks message retry rate per gossip broadcast epoch.
//! RETRY_THRESHOLD = 8: retry_rate_pct > 8 → high_retry_rate

use sha2::{Sha256, Digest};

pub const RETRY_GENESIS_HASH: [u8; 32] = [0u8; 32];
pub const RETRY_THRESHOLD: u32 = 8;

// ─── GossipBroadcastRetryEntry ────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
pub struct GossipBroadcastRetryEntry {
    pub epoch_end:      u64,
    pub retry_count:    u32,
    pub total_sent:     u32,
    pub retry_rate_pct: u32,
    pub high_retry_rate: bool,
    pub entry_hash:     [u8; 32],
    pub prev_hash:      [u8; 32],
}

fn compute_retry_hash(
    prev:           &[u8; 32],
    epoch_end:      u64,
    retry_count:    u32,
    total_sent:     u32,
    retry_rate_pct: u32,
    high_retry_rate: bool,
) -> [u8; 32] {
    let mut h = Sha256::new();
    h.update(prev);
    h.update(epoch_end.to_be_bytes());
    h.update(retry_count.to_be_bytes());
    h.update(total_sent.to_be_bytes());
    h.update(retry_rate_pct.to_be_bytes());
    h.update([high_retry_rate as u8]);
    h.finalize().into()
}

// ─── GossipBroadcastRetryLog ──────────────────────────────────────────────────

pub struct GossipBroadcastRetryLog {
    pub entries: Vec<GossipBroadcastRetryEntry>,
}

impl GossipBroadcastRetryLog {
    pub fn new() -> Self { Self { entries: Vec::new() } }

    pub fn entries(&self) -> &[GossipBroadcastRetryEntry] { &self.entries }

    /// Count of epochs where high_retry_rate == true.
    pub fn high_retry_rate_count(&self) -> usize {
        self.entries.iter().filter(|e| e.high_retry_rate).count()
    }

    /// Sum of all retry_count values across all epochs.
    pub fn total_retries(&self) -> u64 {
        self.entries.iter().map(|e| e.retry_count as u64).sum()
    }

    /// Integer mean of all per-epoch retry_rate_pct values. Returns 0 if empty.
    pub fn mean_retry_rate_pct(&self) -> u32 {
        if self.entries.is_empty() { return 0; }
        let sum: u64 = self.entries.iter().map(|e| e.retry_rate_pct as u64).sum();
        (sum / self.entries.len() as u64) as u32
    }

    /// Record broadcast retry stats for one epoch.
    /// retry_rate_pct = (retry_count * 100) / max(total_sent, 1), capped at 100.
    /// high_retry_rate = retry_rate_pct > RETRY_THRESHOLD.
    pub fn record(
        &mut self,
        epoch_end:   u64,
        retry_count: u32,
        total_sent:  u32,
    ) -> &GossipBroadcastRetryEntry {
        let denom = total_sent.max(1) as u64;
        let retry_rate_pct = ((retry_count as u64 * 100) / denom).min(100) as u32;
        let high_retry_rate = retry_rate_pct > RETRY_THRESHOLD;

        let prev = self.entries.last()
            .map(|e| e.entry_hash)
            .unwrap_or(RETRY_GENESIS_HASH);

        let entry_hash = compute_retry_hash(
            &prev, epoch_end, retry_count, total_sent, retry_rate_pct, high_retry_rate,
        );

        self.entries.push(GossipBroadcastRetryEntry {
            epoch_end,
            retry_count,
            total_sent,
            retry_rate_pct,
            high_retry_rate,
            entry_hash,
            prev_hash: prev,
        });
        self.entries.last().unwrap()
    }

    pub fn verify_chain(&self) -> (bool, Option<usize>) {
        let mut prev = RETRY_GENESIS_HASH;
        for (i, e) in self.entries.iter().enumerate() {
            if e.prev_hash != prev {
                return (false, Some(i));
            }
            let expected = compute_retry_hash(
                &prev, e.epoch_end, e.retry_count, e.total_sent,
                e.retry_rate_pct, e.high_retry_rate,
            );
            if e.entry_hash != expected {
                return (false, Some(i));
            }
            prev = e.entry_hash;
        }
        (true, None)
    }
}

impl Default for GossipBroadcastRetryLog {
    fn default() -> Self { Self::new() }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // Test 1: record fields correct (retry_rate_pct computed, high_retry_rate=true when > 8)
    #[test]
    fn record_fields_correct() {
        let mut log = GossipBroadcastRetryLog::new();
        // 9*100/100 = 9 > 8 → high_retry_rate = true
        let e = log.record(1, 9, 100);
        assert_eq!(e.epoch_end, 1);
        assert_eq!(e.retry_count, 9);
        assert_eq!(e.total_sent, 100);
        assert_eq!(e.retry_rate_pct, 9);
        assert!(e.high_retry_rate);
    }

    // Test 2: high_retry_rate=false when retry_rate_pct == 8 (exactly at threshold)
    #[test]
    fn high_retry_rate_false_at_threshold() {
        let mut log = GossipBroadcastRetryLog::new();
        // 8*100/100 = 8 — exactly at threshold, NOT > 8
        let e = log.record(1, 8, 100);
        assert_eq!(e.retry_rate_pct, 8);
        assert!(!e.high_retry_rate);
    }

    // Test 3: retry_rate_pct capped at 100
    #[test]
    fn retry_rate_pct_capped_at_100() {
        let mut log = GossipBroadcastRetryLog::new();
        // retry_count > total_sent — cannot exceed 100%
        let e = log.record(1, 200, 50);
        assert_eq!(e.retry_rate_pct, 100);
    }

    // Test 4: total_sent=0 → no div-by-zero
    #[test]
    fn total_sent_zero_no_div_by_zero() {
        let mut log = GossipBroadcastRetryLog::new();
        let e = log.record(1, 0, 0);
        assert_eq!(e.retry_rate_pct, 0);
        assert!(!e.high_retry_rate);
    }

    // Test 5: RETRY_THRESHOLD == 8
    #[test]
    fn retry_threshold_is_8() {
        assert_eq!(RETRY_THRESHOLD, 8);
    }

    // Test 6: entry_hash is 32 bytes and non-zero
    #[test]
    fn entry_hash_is_32_bytes_nonzero() {
        let mut log = GossipBroadcastRetryLog::new();
        let e = log.record(1, 5, 50);
        assert_eq!(e.entry_hash.len(), 32);
        assert_ne!(e.entry_hash, [0u8; 32]);
    }

    // Test 7: first entry prev_hash == RETRY_GENESIS_HASH
    #[test]
    fn first_entry_prev_hash_is_genesis() {
        let mut log = GossipBroadcastRetryLog::new();
        let e = log.record(1, 5, 50);
        assert_eq!(e.prev_hash, RETRY_GENESIS_HASH);
    }

    // Test 8: second entry prev_hash == first entry_hash
    #[test]
    fn second_entry_prev_hash_equals_first_entry_hash() {
        let mut log = GossipBroadcastRetryLog::new();
        log.record(1, 5, 50);
        let h0 = log.entries()[0].entry_hash;
        log.record(2, 8, 80);
        assert_eq!(log.entries()[1].prev_hash, h0);
    }

    // Test 9: verify_chain empty → (true, None)
    #[test]
    fn verify_chain_empty_ok() {
        let log = GossipBroadcastRetryLog::new();
        let (ok, idx) = log.verify_chain();
        assert!(ok);
        assert!(idx.is_none());
    }

    // Test 10: verify_chain 1-entry → (true, None)
    #[test]
    fn verify_chain_one_entry_ok() {
        let mut log = GossipBroadcastRetryLog::new();
        log.record(1, 5, 50);
        let (ok, idx) = log.verify_chain();
        assert!(ok);
        assert!(idx.is_none());
    }

    // Test 11: verify_chain 3-entry → (true, None)
    #[test]
    fn verify_chain_three_entries_ok() {
        let mut log = GossipBroadcastRetryLog::new();
        log.record(1, 5, 50);
        log.record(2, 9, 100);
        log.record(3, 3, 75);
        let (ok, idx) = log.verify_chain();
        assert!(ok);
        assert!(idx.is_none());
    }

    // Test 12: verify_chain tamper entry[0].entry_hash → (false, Some(0))
    #[test]
    fn verify_chain_tamper_entry0_entry_hash() {
        let mut log = GossipBroadcastRetryLog::new();
        log.record(1, 5, 50);
        log.record(2, 9, 100);
        log.entries[0].entry_hash[0] ^= 0xFF;
        let (ok, idx) = log.verify_chain();
        assert!(!ok);
        assert_eq!(idx, Some(0));
    }

    // Test 13: verify_chain tamper entry[1].entry_hash → (false, Some(1)) on 3-entry log
    #[test]
    fn verify_chain_tamper_entry1_entry_hash_three_entry_log() {
        let mut log = GossipBroadcastRetryLog::new();
        log.record(1, 5, 50);
        log.record(2, 9, 100);
        log.record(3, 3, 75);
        log.entries[1].entry_hash[0] ^= 0xFF;
        let (ok, idx) = log.verify_chain();
        assert!(!ok);
        assert_eq!(idx, Some(1));
    }

    // Test 14: determinism: same inputs ×3 independent logs → same entry_hash
    #[test]
    fn determinism_same_inputs_same_hash() {
        let mut l1 = GossipBroadcastRetryLog::new();
        let mut l2 = GossipBroadcastRetryLog::new();
        let mut l3 = GossipBroadcastRetryLog::new();
        let h1 = l1.record(7, 15, 60).entry_hash;
        let h2 = l2.record(7, 15, 60).entry_hash;
        let h3 = l3.record(7, 15, 60).entry_hash;
        assert_eq!(h1, h2);
        assert_eq!(h2, h3);
    }

    // Test 15: high_retry_rate_count() correct for mixed log
    #[test]
    fn high_retry_rate_count_mixed_log() {
        let mut log = GossipBroadcastRetryLog::new();
        log.record(1, 5, 100);  // 5%  — below threshold
        log.record(2, 8, 100);  // 8%  — at threshold, not high
        log.record(3, 9, 100);  // 9%  — above threshold, high
        log.record(4, 20, 100); // 20% — above threshold, high
        assert_eq!(log.high_retry_rate_count(), 2);
    }

    // Test 16: total_retries() sums correctly
    #[test]
    fn total_retries_sums_correctly() {
        let mut log = GossipBroadcastRetryLog::new();
        log.record(1, 3, 50);
        log.record(2, 7, 80);
        log.record(3, 11, 100);
        assert_eq!(log.total_retries(), 21);
    }

    // Test 17: mean_retry_rate_pct() empty → 0
    #[test]
    fn mean_retry_rate_pct_empty_is_zero() {
        let log = GossipBroadcastRetryLog::new();
        assert_eq!(log.mean_retry_rate_pct(), 0);
    }

    // Test 18: mean_retry_rate_pct() multi-entry correct (integer avg)
    #[test]
    fn mean_retry_rate_pct_multi_entry_correct() {
        let mut log = GossipBroadcastRetryLog::new();
        log.record(1, 6, 100);  // 6%
        log.record(2, 12, 100); // 12%
        log.record(3, 9, 100);  // 9%
        // (6 + 12 + 9) / 3 = 27 / 3 = 9
        assert_eq!(log.mean_retry_rate_pct(), 9);
    }

    // Test 19: Default → 0 entries
    #[test]
    fn default_has_zero_entries() {
        let log = GossipBroadcastRetryLog::default();
        assert_eq!(log.entries().len(), 0);
    }
}
