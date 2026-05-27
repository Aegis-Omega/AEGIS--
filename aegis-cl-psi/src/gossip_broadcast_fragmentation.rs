//! Gate 425 — Gossip Broadcast Fragmentation Monitor (T2)
//! Tracks fragmentation rate per gossip broadcast epoch.
//! HIGH_FRAGMENTATION_THRESHOLD = 25: rate_pct > 25 → high_fragmentation

use sha2::{Sha256, Digest};

pub const FRAGMENTATION_GENESIS_HASH: [u8; 32] = [0u8; 32];
pub const HIGH_FRAGMENTATION_THRESHOLD: u32 = 25;

#[derive(Debug, Clone, PartialEq)]
pub struct GossipFragmentationEntry {
    pub epoch_end:          u64,
    pub fragmented_msgs:    u32,
    pub total_msgs:         u32,
    pub fragmented_rate_pct: u32,
    pub high_fragmentation: bool,
    pub entry_hash:         [u8; 32],
    pub prev_hash:          [u8; 32],
}

fn compute_hash(
    prev: &[u8; 32],
    epoch_end: u64,
    fragmented_msgs: u32,
    total_msgs: u32,
    rate_pct: u32,
    high_fragmentation: bool,
) -> [u8; 32] {
    let mut h = Sha256::new();
    h.update(prev);
    h.update(epoch_end.to_be_bytes());
    h.update(fragmented_msgs.to_be_bytes());
    h.update(total_msgs.to_be_bytes());
    h.update(rate_pct.to_be_bytes());
    h.update([high_fragmentation as u8]);
    h.finalize().into()
}

pub struct GossipFragmentationLog {
    pub entries: Vec<GossipFragmentationEntry>,
}

impl GossipFragmentationLog {
    pub fn new() -> Self {
        Self { entries: Vec::new() }
    }

    pub fn record(
        &mut self,
        epoch_end: u64,
        fragmented_msgs: u32,
        total_msgs: u32,
    ) -> &GossipFragmentationEntry {
        let denom = total_msgs.max(1) as u64;
        let fragmented_rate_pct = ((fragmented_msgs as u64).saturating_mul(100) / denom)
            .min(100) as u32;
        let high_fragmentation = fragmented_rate_pct > HIGH_FRAGMENTATION_THRESHOLD;
        let prev = self
            .entries
            .last()
            .map(|e| e.entry_hash)
            .unwrap_or(FRAGMENTATION_GENESIS_HASH);
        let entry_hash = compute_hash(
            &prev,
            epoch_end,
            fragmented_msgs,
            total_msgs,
            fragmented_rate_pct,
            high_fragmentation,
        );
        self.entries.push(GossipFragmentationEntry {
            epoch_end,
            fragmented_msgs,
            total_msgs,
            fragmented_rate_pct,
            high_fragmentation,
            entry_hash,
            prev_hash: prev,
        });
        self.entries.last().unwrap()
    }

    pub fn high_fragmentation_count(&self) -> usize {
        self.entries.iter().filter(|e| e.high_fragmentation).count()
    }

    pub fn total_fragmented_msgs(&self) -> u64 {
        self.entries.iter().map(|e| e.fragmented_msgs as u64).sum()
    }

    pub fn mean_rate_pct(&self) -> u32 {
        if self.entries.is_empty() {
            return 0;
        }
        let sum: u64 = self.entries.iter().map(|e| e.fragmented_rate_pct as u64).sum();
        (sum / self.entries.len() as u64) as u32
    }

    pub fn verify_chain(&self) -> (bool, Option<usize>) {
        let mut prev = FRAGMENTATION_GENESIS_HASH;
        for (i, e) in self.entries.iter().enumerate() {
            if e.prev_hash != prev {
                return (false, Some(i));
            }
            let expected = compute_hash(
                &prev,
                e.epoch_end,
                e.fragmented_msgs,
                e.total_msgs,
                e.fragmented_rate_pct,
                e.high_fragmentation,
            );
            if e.entry_hash != expected {
                return (false, Some(i));
            }
            prev = e.entry_hash;
        }
        (true, None)
    }
}

impl Default for GossipFragmentationLog {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_record_fields_correct_flag_true() {
        let mut log = GossipFragmentationLog::new();
        let e = log.record(1000, 30, 100);
        assert_eq!(e.epoch_end, 1000);
        assert_eq!(e.fragmented_msgs, 30);
        assert_eq!(e.total_msgs, 100);
        assert_eq!(e.fragmented_rate_pct, 30);
        assert!(e.high_fragmentation);
    }

    #[test]
    fn test_flag_false_when_exactly_at_threshold() {
        let mut log = GossipFragmentationLog::new();
        // rate_pct = 25, which is NOT > 25, so flag = false
        let e = log.record(2000, 25, 100);
        assert_eq!(e.fragmented_rate_pct, 25);
        assert!(!e.high_fragmentation);
    }

    #[test]
    fn test_rate_pct_capped_at_100() {
        let mut log = GossipFragmentationLog::new();
        // 200 fragmented out of 100 total → raw rate 200, capped at 100
        let e = log.record(3000, 200, 100);
        assert_eq!(e.fragmented_rate_pct, 100);
        assert!(e.high_fragmentation);
    }

    #[test]
    fn test_total_msgs_zero_no_div_by_zero() {
        let mut log = GossipFragmentationLog::new();
        let e = log.record(4000, 0, 0);
        assert_eq!(e.fragmented_rate_pct, 0);
        assert!(!e.high_fragmentation);
    }

    #[test]
    fn test_threshold_constant_value() {
        assert_eq!(HIGH_FRAGMENTATION_THRESHOLD, 25);
    }

    #[test]
    fn test_entry_hash_non_zero() {
        let mut log = GossipFragmentationLog::new();
        let e = log.record(5000, 10, 50);
        assert_ne!(e.entry_hash, [0u8; 32]);
    }

    #[test]
    fn test_first_prev_hash_is_genesis() {
        let mut log = GossipFragmentationLog::new();
        let e = log.record(6000, 5, 20);
        assert_eq!(e.prev_hash, FRAGMENTATION_GENESIS_HASH);
    }

    #[test]
    fn test_second_prev_hash_equals_first_entry_hash() {
        let mut log = GossipFragmentationLog::new();
        log.record(7000, 5, 20);
        let first_hash = log.entries[0].entry_hash;
        log.record(8000, 10, 40);
        let second_prev = log.entries[1].prev_hash;
        assert_eq!(second_prev, first_hash);
    }

    #[test]
    fn test_verify_chain_empty() {
        let log = GossipFragmentationLog::new();
        assert_eq!(log.verify_chain(), (true, None));
    }

    #[test]
    fn test_verify_chain_one_entry() {
        let mut log = GossipFragmentationLog::new();
        log.record(9000, 3, 10);
        assert_eq!(log.verify_chain(), (true, None));
    }

    #[test]
    fn test_verify_chain_three_entries() {
        let mut log = GossipFragmentationLog::new();
        log.record(10000, 5, 20);
        log.record(11000, 10, 40);
        log.record(12000, 15, 60);
        assert_eq!(log.verify_chain(), (true, None));
    }

    #[test]
    fn test_verify_chain_tamper_entry_0() {
        let mut log = GossipFragmentationLog::new();
        log.record(13000, 5, 20);
        log.record(14000, 10, 40);
        log.entries[0].fragmented_msgs = 99;
        let (valid, idx) = log.verify_chain();
        assert!(!valid);
        assert_eq!(idx, Some(0));
    }

    #[test]
    fn test_verify_chain_tamper_entry_1() {
        let mut log = GossipFragmentationLog::new();
        log.record(15000, 5, 20);
        log.record(16000, 10, 40);
        log.entries[1].fragmented_msgs = 99;
        let (valid, idx) = log.verify_chain();
        assert!(!valid);
        assert_eq!(idx, Some(1));
    }

    #[test]
    fn test_determinism_same_inputs_same_hash() {
        let mut log1 = GossipFragmentationLog::new();
        let e1 = log1.record(17000, 7, 30).entry_hash;

        let mut log2 = GossipFragmentationLog::new();
        let e2 = log2.record(17000, 7, 30).entry_hash;

        let mut log3 = GossipFragmentationLog::new();
        let e3 = log3.record(17000, 7, 30).entry_hash;

        assert_eq!(e1, e2);
        assert_eq!(e2, e3);
    }

    #[test]
    fn test_high_fragmentation_count_mixed_log() {
        let mut log = GossipFragmentationLog::new();
        log.record(18000, 5, 100);   // rate=5, flag=false
        log.record(19000, 30, 100);  // rate=30, flag=true
        log.record(20000, 25, 100);  // rate=25, flag=false (boundary)
        log.record(21000, 50, 100);  // rate=50, flag=true
        assert_eq!(log.high_fragmentation_count(), 2);
    }

    #[test]
    fn test_total_fragmented_msgs_sums_correctly() {
        let mut log = GossipFragmentationLog::new();
        log.record(22000, 10, 100);
        log.record(23000, 20, 100);
        log.record(24000, 30, 100);
        assert_eq!(log.total_fragmented_msgs(), 60u64);
    }

    #[test]
    fn test_mean_rate_pct_empty_returns_zero() {
        let log = GossipFragmentationLog::new();
        assert_eq!(log.mean_rate_pct(), 0);
    }

    #[test]
    fn test_mean_rate_pct_multi_entry_correct() {
        let mut log = GossipFragmentationLog::new();
        log.record(25000, 10, 100); // rate=10
        log.record(26000, 20, 100); // rate=20
        log.record(27000, 30, 100); // rate=30
        // mean = (10+20+30)/3 = 20
        assert_eq!(log.mean_rate_pct(), 20);
    }

    #[test]
    fn test_default_has_zero_entries() {
        let log = GossipFragmentationLog::default();
        assert_eq!(log.entries.len(), 0);
    }
}