import type { DivergenceClass, TelemetrySnapshot } from '../types.js'

interface Props { snapshot: TelemetrySnapshot | null }

const CLASS_COLOR: Record<DivergenceClass, string> = {
  D0: 'text-gray-400',
  D1: 'text-yellow-400',
  D2: 'text-orange-400',
  D3: 'text-red-400',
  D4: 'text-red-600 font-bold',
}

function classifyDrift(snapshot: TelemetrySnapshot): DivergenceClass {
  if (snapshot.corruption_count > 0) return 'D4'
  if (snapshot.drift_index > 0.5) return 'D3'
  if (snapshot.drift_index > 0.2) return 'D2'
  if (snapshot.drift_index > 0.05) return 'D1'
  return 'D0'
}

export function DivergenceSurface({ snapshot }: Props) {
  if (!snapshot) return <div className="p-4 text-gray-500 text-sm">Awaiting telemetry…</div>

  const cls = classifyDrift(snapshot)
  const frozen = snapshot.drift_index > 0.2 || snapshot.corruption_count > 0

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400">Divergence Class</span>
        <span className={`text-2xl font-mono ${CLASS_COLOR[cls]}`}>{cls}</span>
        {frozen && <span className="text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded">MUTATION FROZEN</span>}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="text-gray-400">drift_index</div><div className="text-white">{snapshot.drift_index.toFixed(4)}</div>
        <div className="text-gray-400">corruption_count</div><div className={snapshot.corruption_count > 0 ? 'text-red-400' : 'text-white'}>{snapshot.corruption_count}</div>
        <div className="text-gray-400">vcg_error</div><div className="text-white">{snapshot.vcg_error.toFixed(4)}</div>
      </div>
      <div className="text-xs text-gray-600">
        D0: observational · D1: serializer · D2: topology · D3: ownership · D4: constitutional
      </div>
    </div>
  )
}
