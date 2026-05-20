import type { TelemetrySnapshot } from '../types.js'

interface Props { snapshot: TelemetrySnapshot | null }

function Metric({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-4 text-xs font-mono">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className="text-gray-400 w-36">{label}</span>
      <span className={ok ? 'text-white' : 'text-red-400'}>{value}</span>
    </div>
  )
}

export function ObservabilitySurface({ snapshot }: Props) {
  if (!snapshot) return <div className="p-4 text-gray-500 text-sm">Awaiting telemetry…</div>

  return (
    <div className="p-4 space-y-3">
      <div className="text-xs text-gray-400 mb-3">Runtime Metrics</div>
      <Metric label="pgcs_passes" value={String(snapshot.pgcs_passes)} ok={snapshot.pgcs_passes} />
      <Metric label="corruption_count" value={String(snapshot.corruption_count)} ok={snapshot.corruption_count === 0} />
      <Metric label="vcg_error" value={snapshot.vcg_error.toFixed(4)} ok={snapshot.vcg_error < 1.0} />
      <Metric label="drift_index" value={snapshot.drift_index.toFixed(4)} ok={snapshot.drift_index < 0.2} />
      <Metric label="gate_acceptance_rate" value={(snapshot.gate_acceptance_rate * 100).toFixed(1) + '%'} ok={snapshot.gate_acceptance_rate > 0.8} />
      <Metric label="failsafe_state" value={snapshot.failsafe_state} ok={snapshot.failsafe_state === 'OPERATIONAL'} />
    </div>
  )
}
