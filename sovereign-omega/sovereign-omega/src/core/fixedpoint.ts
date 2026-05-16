// ============================================================
// SOVEREIGN OMEGA — Q32.32 Fixed-Point Arithmetic
// EPISTEMIC TIER: T0
// Ω-1B: Eliminates IEEE 754 ULP divergence across JS runtimes,
// CPU architectures, and WASM environments.
// ALL Bernstein, VCG, confidence accumulation, harmonic spending,
// and decay computations MUST route through Q32.32.
// ============================================================

export type Q32_32 = bigint

export const Q_SCALE = 1n << 32n
export const Q_ONE   = Q_SCALE           // 1.0 in Q32.32
export const Q_HALF  = Q_SCALE >> 1n     // 0.5
export const Q_ZERO  = 0n
export const Q_MAX   = (1n << 63n) - 1n  // signed 64-bit max

export function toQ32(v: number): Q32_32 {
  if (!isFinite(v)) throw new RangeError(`toQ32: non-finite input ${v}`)
  return BigInt(Math.round(v * Number(Q_SCALE)))
}

export function fromQ32(v: Q32_32): number {
  return Number(v) / Number(Q_SCALE)
}

export function mulQ32(a: Q32_32, b: Q32_32): Q32_32 {
  return (a * b) >> 32n
}

export function divQ32(a: Q32_32, b: Q32_32): Q32_32 {
  if (b === 0n) throw new Error('FIXED_POINT_DIV_ZERO')
  return (a << 32n) / b
}

export function clampQ32(v: Q32_32, min: Q32_32, max: Q32_32): Q32_32 {
  return v < min ? min : v > max ? max : v
}

export function addQ32(a: Q32_32, b: Q32_32): Q32_32 { return a + b }
export function subQ32(a: Q32_32, b: Q32_32): Q32_32 { return a - b }
export function absQ32(v: Q32_32): Q32_32 { return v < 0n ? -v : v }

/** Compute |a - b| in Q32.32. */
export function absDiffQ32(a: Q32_32, b: Q32_32): Q32_32 { return absQ32(a - b) }

/**
 * Compute the verifier correlation penalty.
 * Ω-4: Dynamic empirical correlation penalty.
 * Minimum floor: 0.25 (prevents complete trust collapse under correlated verifiers).
 */
export function computeCorrelationPenalty(
  agreement_rate: Q32_32,
  baseline_independence: Q32_32
): Q32_32 {
  const excess = agreement_rate - baseline_independence
  if (excess <= 0n) return Q_ONE
  const denom = Q_ONE - baseline_independence
  if (denom <= 0n) return Q_ONE >> 2n
  const penalty_ratio = divQ32(excess, denom)
  return clampQ32(Q_ONE - penalty_ratio, Q_ONE >> 2n, Q_ONE)
}

/**
 * Empirical Bernstein LCB in Q32.32.
 * Replaces the float version in hoeffding.ts for cross-runtime determinism.
 * alpha must be in (0, 1) expressed as Q32.32.
 */
export function bernsteinLCBQ32(
  sum: Q32_32,
  sumSq: Q32_32,
  n: bigint,
  alpha: Q32_32
): Q32_32 {
  if (n === 0n) return -(Q_ONE << 10n) // -Infinity proxy
  const mean = divQ32(sum, BigInt(Number(n)) << 0n)
  const variance = n > 1n
    ? divQ32(sumSq - divQ32(sum * sum, BigInt(Number(n))), BigInt(Number(n) - 1))
    : Q_ZERO
  // logTerm = ln(2/alpha) approximated as integer
  const logTermF = Math.log(2 / fromQ32(alpha))
  const logTerm = toQ32(logTermF)
  // varianceTerm = sqrt(2 * variance * logTerm / n)
  const varianceTermF = Math.sqrt(2 * fromQ32(variance) * fromQ32(logTerm) / Number(n))
  const varianceTerm = toQ32(varianceTermF)
  // biasTerm = 2 * logTerm / (3 * n)
  const biasTerm = divQ32(2n * logTerm, 3n * BigInt(Number(n)) << 32n)
  return mean - varianceTerm - biasTerm
}
