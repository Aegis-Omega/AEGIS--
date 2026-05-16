// ============================================================
// SOVEREIGN OMEGA — UUIDv7 Generation
// EPISTEMIC TIER: T0
// UUIDv7 is time-ordered, monotonic, and suitable for
// use as event_id with lexicographic ordering guarantees.
// ============================================================

import type { UUIDv7 } from '../core/types.js'

let lastMs = 0
let seq = 0

/**
 * Generate a time-ordered UUIDv7.
 * Monotonic within the same millisecond via sequence counter.
 */
export function generateUUIDv7(): UUIDv7 {
  const now = Date.now()  // Only permitted use of Date.now() — for UUID generation only
  if (now === lastMs) {
    seq++
  } else {
    lastMs = now
    seq = 0
  }

  const msHex = now.toString(16).padStart(12, '0')
  const seqHex = seq.toString(16).padStart(4, '0')

  const rand = new Uint8Array(10)
  crypto.getRandomValues(rand)
  const randHex = Array.from(rand).map(b => b.toString(16).padStart(2, '0')).join('')

  // UUIDv7 format: xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx
  const uuid = [
    msHex.slice(0, 8),
    msHex.slice(8, 12),
    '7' + seqHex.slice(0, 3),
    ((parseInt(seqHex.slice(3, 4), 16) & 0x3 | 0x8).toString(16)) + randHex.slice(0, 3),
    randHex.slice(3, 15),
  ].join('-')

  return uuid as UUIDv7
}
