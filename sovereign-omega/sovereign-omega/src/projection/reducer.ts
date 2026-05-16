// ============================================================
// SOVEREIGN OMEGA — Projection State & Pure Reducers
// EPISTEMIC TIER: T0
// Arrays only — no Set, no Map. Serialisable, deterministic.
// All reducers are pure functions. withImmutableBoundary wraps.
// ============================================================

import type {
  ProjectionState, EventEnvelope, EventType, SequenceNumber
} from '../core/types.js'
import { EventType as ET } from '../core/types.js'
import { withImmutableBoundary, createInitialState } from '../core/immutable.js'

export const INITIAL_PROJECTION_STATE: ProjectionState = {
  score_accumulator: [],
  strengths: [],
  risks: [],
  positioning_candidates: [],
  ground_truth_refs: [],
  retrieval_context_hashes: [],
  vcg_epoch_id: undefined,
  confidence_type: 'heuristic',
  projection_version: '1.0.0',
  last_updated_sequence: BigInt(0) as SequenceNumber,
  freeze_reason: undefined,
  freeze_timestamp_ms: undefined,
}

const rawApplyEvent = (
  state: Readonly<ProjectionState>,
  event: EventEnvelope
): ProjectionState => {
  // Frozen states cannot be further modified
  if (state.freeze_reason !== undefined) return state

  switch (event.event_type as EventType) {
    case ET.VCG_COMPUTED: {
      const p = event.payload as { vcg_epoch_id: string }
      return { ...state, vcg_epoch_id: p.vcg_epoch_id, last_updated_sequence: event.sequence }
    }
    case ET.CONFIDENCE_CLAIMED: {
      const p = event.payload as { confidence_type: 'verified' | 'heuristic' }
      return { ...state, confidence_type: p.confidence_type, last_updated_sequence: event.sequence }
    }
    case ET.SYSTEM_OUTPUT: {
      const p = event.payload as {
        score?: number
        strengths?: string[]
        risks?: string[]
        positioning?: string
        output_hash?: string
      }
      return {
        ...state,
        score_accumulator: p.score !== undefined
          ? [...state.score_accumulator, p.score]
          : state.score_accumulator,
        strengths: p.strengths ? [...state.strengths, ...p.strengths] : state.strengths,
        risks: p.risks ? [...state.risks, ...p.risks] : state.risks,
        positioning_candidates: p.positioning
          ? [...state.positioning_candidates, [p.positioning, 1.0]]
          : state.positioning_candidates,
        ground_truth_refs: p.output_hash
          ? [...state.ground_truth_refs, p.output_hash]
          : state.ground_truth_refs,
        last_updated_sequence: event.sequence,
      }
    }
    case ET.GATE_FROZEN: {
      return {
        ...state,
        freeze_reason: 'gate_frozen',
        freeze_timestamp_ms: event.timestamp_ms,
        last_updated_sequence: event.sequence,
      }
    }
    case ET.VERIFIER_EVALUATED: {
      const p = event.payload as { artifact_hash?: string }
      return {
        ...state,
        retrieval_context_hashes: p.artifact_hash
          ? [...state.retrieval_context_hashes, p.artifact_hash]
          : state.retrieval_context_hashes,
        last_updated_sequence: event.sequence,
      }
    }
    default:
      return { ...state, last_updated_sequence: event.sequence }
  }
}

export const applyEvent = withImmutableBoundary(rawApplyEvent)

export function createProjectionState(version: string): Readonly<ProjectionState> {
  return createInitialState({ ...INITIAL_PROJECTION_STATE, projection_version: version })
}
