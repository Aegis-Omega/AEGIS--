// ============================================================
// SOVEREIGN OMEGA — VCG Calibration Tracker
// EPISTEMIC TIER: T1 (empirically validated methodology)
// PRIMITIVE 5: Hard Trust Partitioning (weights per domain)
// Rolling window: 500 claims (default). Min for gating: 100.
// Bootstrap CI uses seeded PRNG — deterministic under replay.
// NOTE: Theoretical VCG floor is non-zero (Vempala-Wilkes).
// ============================================================

import type { VCGMetric, VerifierOutput, Confidence } from '../core/types.js'
import { CalibrationDomain as CD } from '../core/types.js'
import { SeededRNG, deriveSeed } from './rng.js'
import { verifierRegistry } from '../verifier/registry.js'

const DEFAULT_WINDOW = 500
const MIN_GATE_WINDOW = 100
const BOOTSTRAP_SAMPLES = 200
const DECAY_HALF_LIFE_MS = 24 * 60 * 60 * 1000  // 24 hours
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000
const ALERT_THRESHOLD = 0.35
const SUSPEND_THRESHOLD = 0.50

interface CalibrationSample {
  readonly claimed_confidence: number
  readonly actual_correct: boolean
  readonly weight: number
  readonly timestamp_ms: number  // from event substrate
  readonly verifier_id: string
}

export class VCGTracker {
  private readonly samples: CalibrationSample[] = []
  private readonly windowSize: number
  private readonly streamId: string
  private epochId: string
  private lastUpdateMs: number

  constructor(streamId: string, windowSize = DEFAULT_WINDOW) {
    this.streamId = streamId
    this.windowSize = windowSize
    this.epochId = `epoch-${streamId}-0`
    this.lastUpdateMs = 0
  }

  /**
   * Add a verifier result to the calibration window.
   * Only Ground Truth (weight=1.0) and Retrieval-Assisted (weight=0.5) contribute.
   * Advisory-Excluded verifiers are silently ignored.
   * timestamp_ms MUST come from the event substrate, not Date.now().
   */
  addResult(
    output: VerifierOutput,
    claimed_confidence: number,
    timestamp_ms: number  // from event.timestamp_ms
  ): void {
    const weight = verifierRegistry.getCalibrationWeight(output.trust_class)
    if (weight === 0) return  // Advisory-Excluded — never contributes

    const sample: CalibrationSample = Object.freeze({
      claimed_confidence: Math.max(0, Math.min(1, claimed_confidence)),
      actual_correct: output.passed,
      weight,
      timestamp_ms,
      verifier_id: output.verifier_id,
    })

    this.samples.push(sample)
    this.lastUpdateMs = timestamp_ms

    // Trim to window size
    if (this.samples.length > this.windowSize) {
      this.samples.splice(0, this.samples.length - this.windowSize)
    }
  }

  /**
   * Compute the current VCG metric.
   * Uses decay weighting: older samples contribute less.
   * Bootstrap CI uses seeded PRNG (deterministic under replay).
   * currentMs MUST come from the event substrate.
   */
  compute(currentMs: number): VCGMetric {
    const window = [...this.samples]
    if (window.length === 0) {
      return this.emptyMetric(currentMs)
    }

    // Apply exponential decay weighting
    const decayedSamples = window.map(s => ({
      ...s,
      effective_weight: s.weight * this.decayFactor(currentMs - s.timestamp_ms),
    }))

    const totalWeight = decayedSamples.reduce((sum, s) => sum + s.effective_weight, 0)
    if (totalWeight === 0) return this.emptyMetric(currentMs)

    // VCG = weighted mean of |claimed_confidence - actual_correct|
    const vcg = decayedSamples.reduce((sum, s) => {
      const error = Math.abs(s.claimed_confidence - (s.actual_correct ? 1 : 0))
      return sum + error * s.effective_weight
    }, 0) / totalWeight

    // Bootstrap CI (seeded, deterministic)
    const ci = this.bootstrapCI(decayedSamples, totalWeight, currentMs)

    return Object.freeze({
      domain_id: this.streamId,
      weighted_error: vcg,
      bootstrap_ci_95: ci,
      effective_sample_size: this.effectiveSampleSize(decayedSamples),
      decay_factor: this.decayFactor(currentMs - (window[window.length - 1]?.timestamp_ms ?? currentMs)),
      sample_count: window.length,
      epoch_start_ms: this.lastUpdateMs,
    })
  }

  canEmitVerifiedConfidence(currentMs: number): boolean {
    return this.samples.length >= MIN_GATE_WINDOW
  }

  shouldAlert(currentMs: number): boolean {
    const metric = this.compute(currentMs)
    return metric.weighted_error > ALERT_THRESHOLD
  }

  shouldSuspend(currentMs: number): boolean {
    const metric = this.compute(currentMs)
    return metric.weighted_error > SUSPEND_THRESHOLD
  }

  isStale(currentMs: number): boolean {
    if (this.lastUpdateMs === 0) return false
    return (currentMs - this.lastUpdateMs) > STALE_THRESHOLD_MS
  }

  resetEpoch(reason: 'drift' | 'manual' | 'low_sample'): void {
    const epochNum = parseInt(this.epochId.split('-').pop() ?? '0') + 1
    this.epochId = `epoch-${this.streamId}-${epochNum}`
    this.samples.splice(0)
  }

  getEpochId(): string { return this.epochId }

  // ─── Private helpers ───────────────────────────────────

  private decayFactor(ageMs: number): number {
    return Math.exp(-Math.LN2 * ageMs / DECAY_HALF_LIFE_MS)
  }

  private bootstrapCI(
    samples: Array<{ effective_weight: number; claimed_confidence: number; actual_correct: boolean }>,
    totalWeight: number,
    currentMs: number
  ): readonly [number, number] {
    const seed = deriveSeed(this.streamId, this.epochId + ':' + String(Math.floor(currentMs / 60_000)))
    const rng = new SeededRNG(seed)

    const bootstrapVCGs: number[] = []
    for (let b = 0; b < BOOTSTRAP_SAMPLES; b++) {
      let vcgSum = 0
      let wSum = 0
      for (let i = 0; i < samples.length; i++) {
        const idx = Math.floor(rng.next() * samples.length)
        const s = samples[idx]!
        const error = Math.abs(s.claimed_confidence - (s.actual_correct ? 1 : 0))
        vcgSum += error * s.effective_weight
        wSum += s.effective_weight
      }
      bootstrapVCGs.push(wSum > 0 ? vcgSum / wSum : 0)
    }

    bootstrapVCGs.sort((a, b) => a - b)
    const lo = bootstrapVCGs[Math.floor(BOOTSTRAP_SAMPLES * 0.025)] ?? 0
    const hi = bootstrapVCGs[Math.floor(BOOTSTRAP_SAMPLES * 0.975)] ?? 1
    return Object.freeze([lo, hi] as const)
  }

  private effectiveSampleSize(
    samples: Array<{ effective_weight: number }>
  ): number {
    const totalW = samples.reduce((s, x) => s + x.effective_weight, 0)
    const totalW2 = samples.reduce((s, x) => s + x.effective_weight ** 2, 0)
    return totalW2 > 0 ? (totalW ** 2) / totalW2 : 0
  }

  private emptyMetric(currentMs: number): VCGMetric {
    return Object.freeze({
      domain_id: this.streamId,
      weighted_error: 0,
      bootstrap_ci_95: Object.freeze([0, 1] as const),
      effective_sample_size: 0,
      decay_factor: 1,
      sample_count: 0,
      epoch_start_ms: currentMs,
    })
  }
}

/**
 * Build a Confidence value from VCG state.
 * Emits 'verified' type only when window is large enough for statistical validity.
 */
export function buildConfidence(
  tracker: VCGTracker,
  currentMs: number,
  verifierIds: readonly string[],
): Confidence {
  if (!tracker.canEmitVerifiedConfidence(currentMs)) {
    return Object.freeze({
      type: 'heuristic',
      value: 0.3,
      disclaimer: true,
      source: 'INSUFFICIENT_CALIBRATION_WINDOW',
    })
  }

  const metric = tracker.compute(currentMs)
  const calibratedValue = Math.max(0, 1 - metric.weighted_error)

  return Object.freeze({
    type: 'verified',
    value: calibratedValue,
    verifier_ids: Object.freeze([...verifierIds]),
    vcg_epoch: tracker.getEpochId(),
  })
}
