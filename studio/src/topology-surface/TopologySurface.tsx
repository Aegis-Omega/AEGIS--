import type { TelemetrySnapshot } from '../types.js'

interface Props { snapshot: TelemetrySnapshot | null }

export function TopologySurface({ snapshot }: Props) {
  if (!snapshot) return <div className="p-4 text-gray-500 text-sm">Awaiting telemetry…</div>

  const rows: Array<[string, string]> = [
    ['sitr_state', snapshot.failsafe_state],
    ['vcg_error', snapshot.vcg_error.toFixed(6)],
    ['drift_index', snapshot.drift_index.toFixed(6)],
    ['epoch_sequence', String(snapshot.epoch_sequence)],
    ['gate_acceptance_rate', (snapshot.gate_acceptance_rate * 100).toFixed(2) + '%'],
  ]

  return (
    <div className="p-4 space-y-2">
      <div className="text-xs text-gray-400 mb-3">Governance Topology</div>
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-center gap-4 text-xs font-mono">
          <span className="text-gray-500 w-36">{k}</span>
          <span className="text-white">{v}</span>
        </div>
      ))}
    </div>
  )
}
