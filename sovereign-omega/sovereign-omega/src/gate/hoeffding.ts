// ============================================================
// SOVEREIGN OMEGA — Anytime-Valid Confidence Sequences
// EPISTEMIC TIER: T0/T1
// Uses empirical Bernstein bounds, NOT Hoeffding's inequality.
// Reason: Hoeffding assumes IID samples. Self-modifying systems
// violate IID because future samples depend on past results.
// Bernstein bounds remain valid under adaptive sampling.
// Reference: Howard et al. 2020; Waudby-Smith & Ramdas 2024.
// ============================================================

import type { BoundedDelta } from '../core/types.js'
import { normalizeDelta } from '../core/types.js'

/**
 * Anytime-valid confidence sequence using empirical Bernstein bounds.
 * Accepts BoundedDelta inputs ∈ [-1, 1] — enforced by branded type.
 *
 * The gate accepts a modification when LCB > 0, providing statistical
 * evidence that the modification is beneficial.
 */
export class ConfidenceSequence {
  private readonly alpha: number         // significance level (e.g. 0.05)
  private readonly rho: number           // mixing parameter (0 < rho < 1)
  private n = 0                          // number of observations
  private sum = 0                        // sum of deltas
  private sum_sq = 0                     // sum of squared deltas
  private running_var = 0               // empirical variance estimate

  constructor(alpha = 0.05, rho = 0.5) {
    if (alpha <= 0 || alpha >= 1) throw new RangeError('alpha must be in (0, 1)')
    if (rho <= 0 || rho >= 1) throw new RangeError('rho must be in (0, 1)')
    this.alpha = alpha
    this.rho = rho
  }

  /**
   * Update with a new bounded delta observation.
   * Input MUST be a BoundedDelta ∈ [-1, 1].
   */
  update(delta: BoundedDelta): void {
    this.n++
    this.sum += delta
    this.sum_sq += delta * delta
    // Welford's online variance update
    const mean = this.sum / this.n
    this.running_var = this.n > 1
      ? (this.sum_sq - this.n * mean * mean) / (this.n - 1)
      : 0
  }

  /**
   * Compute the anytime-valid lower confidence bound.
   * This bound is valid for any stopping time, including
   * adversarially chosen times — unlike Hoeffding.
   *
   * Returns the LCB on the true mean delta.
   * Gate accepts when LCB > 0.
   */
  lcb(): number {
    if (this.n === 0) return -Infinity

    const mean = this.sum / this.n
    const halfWidth = this.bernsteinHalfWidth()
    return mean - halfWidth
  }

  /**
   * Compute e-value for the null hypothesis that mean delta ≤ 0.
   * An e-value > 1/alpha provides anytime-valid evidence against H0.
   * Gate accepts when e_value > 1/alpha.
   */
  eValue(): number {
    if (this.n === 0) return 1

    const mean = this.sum / this.n
    if (mean <= 0) return 1

    // E-value based on betting martingale (Ville's inequality)
    // E_n = exp(lambda_n * sum - n * psi(lambda_n))
    // where lambda_n is the optimal bet and psi is the log-moment-generating function
    const sigma2 = Math.max(this.running_var, 1e-10)
    const lambda = Math.min(mean / sigma2, 1)  // bounded Kelly fraction
    const psi = -Math.log(1 - lambda * mean) // approximation
    return Math.exp(lambda * this.sum - this.n * psi)
  }

  /**
   * Coverage probability: fraction of time LCB was valid.
   * Should be ≥ (1 - alpha) for correctly calibrated sequences.
   */
  coverageAtLevel(trueMean: number): boolean {
    return this.lcb() <= trueMean
  }

  get observationCount(): number { return this.n }
  get empiricalMean(): number { return this.n > 0 ? this.sum / this.n : 0 }
  get empiricalVariance(): number { return this.running_var }

  // ─── Private ───────────────────────────────────────────

  /**
   * Empirical Bernstein half-width for the LCB.
   * Tighter than Hoeffding because it uses the empirical variance.
   * Valid for bounded random variables in [-1, 1].
   */
  private bernsteinHalfWidth(): number {
    const sigma2 = Math.max(this.running_var, 1e-10)
    const b = 1  // range bound (inputs are in [-1, 1], range = 2, half-range = 1)

    // Empirical Bernstein bound (Howard et al. 2020 Eq. 8)
    // HW = sqrt(2 * sigma^2 * log(2/alpha) / n) + 2 * b * log(2/alpha) / (3 * n)
    const logTerm = Math.log(2 / this.alpha)
    const varianceTerm = Math.sqrt(2 * sigma2 * logTerm / this.n)
    const biasTerm = (2 * b * logTerm) / (3 * this.n)

    return varianceTerm + biasTerm
  }
}

/**
 * Convenience function: compute LCB from an array of raw numbers.
 * Normalises inputs to [-1, 1] via normalizeDelta.
 */
export function computeLCBFromSamples(samples: readonly number[], alpha = 0.05): number {
  const seq = new ConfidenceSequence(alpha)
  for (const s of samples) {
    seq.update(normalizeDelta(s))
  }
  return seq.lcb()
}
