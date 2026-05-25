const BRIDGE = (import.meta.env.VITE_BRIDGE_URL as string | undefined) ?? 'http://localhost:7890'

export interface LiveState {
  node:      NodeDescriptor | null
  network:   NetworkReport | null
  resonance: ResonanceData | null
  telemetry: TelemetryData | null
  coherence: CoherenceData | null
}

export interface NodeDescriptor {
  node_id: string
  t0_verdict: boolean
  constitutional_hash: string
  catalog_hash: string
  sequence: number
  epoch: number
  corruption_count: number
  phi_threshold: number
  drift_risk: number
  chord_bytes?: number[]
  chord_hex?: string
  schema_version: string
}

export interface NetworkReport {
  verdict: 'UNIFIED' | 'CLUSTERED' | 'SPLIT'
  peer_count: number
  below_phi_count: number
  above_phi_count: number
  triadic_count: number
  quorum_triadic: boolean
  distinct_chord_classes: number
  all_below_phi: boolean
  peers: Array<{ node_id: string; chord_bytes: number[]; chord_hex: string; drift_risk: number }>
}

export interface ResonanceData {
  is_resonant: boolean
  is_certified: boolean
  phi_convergent: boolean
  vortex_family: string
  ring_valid: boolean
  sequence_monotone: boolean
  resonance_depth: number
  resonance_coefficient: number
  phi_headroom: number
  divergence_risk: number
}

export interface TelemetryData {
  pgcs_score: number
  vcg_score: number
  epoch: number
  sequence: number
  corruption_count: number
  drift_index: number
}

export interface CoherenceData {
  global_section_exists: boolean
  satisfied_count: number
  first_obstruction: number | null
  coherence_score: number
  epoch: number
  levels: {
    l0_ralph_frame: boolean
    l1_mutation_authority: boolean
    l2_resonance: boolean
    l3_chord_unity: boolean
    l4_autopoietic: boolean
  }
  frame_hex: string
}

async function safeFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BRIDGE}${path}`, { signal: AbortSignal.timeout(4_000) })
    return res.ok ? (await res.json()) as T : null
  } catch { return null }
}

export async function fetchLiveState(): Promise<LiveState> {
  const [node, network, resonance, telemetry, coherence] = await Promise.all([
    safeFetch<NodeDescriptor>('/node'),
    safeFetch<NetworkReport>('/network'),
    safeFetch<ResonanceData>('/resonance'),
    safeFetch<TelemetryData>('/telemetry'),
    safeFetch<CoherenceData>('/coherence'),
  ])
  return { node, network, resonance, telemetry, coherence }
}

export function subscribeLiveState(
  onUpdate: (state: LiveState) => void,
  intervalMs = 5_000,
): () => void {
  let active = true
  const poll = () => { if (active) fetchLiveState().then(onUpdate) }
  poll()
  const id = setInterval(poll, intervalMs)
  return () => { active = false; clearInterval(id) }
}
