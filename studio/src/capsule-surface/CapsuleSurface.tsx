import type { TelemetrySnapshot } from '../types.js'

interface Props { snapshot: TelemetrySnapshot | null }

export function CapsuleSurface({ snapshot }: Props) {
  if (!snapshot) return <div className="p-4 text-gray-500 text-sm">Awaiting telemetry…</div>

  return (
    <div className="p-4 space-y-4">
      <div className="text-xs text-gray-400">Capsule Manifests</div>
      {['cap-alpha', 'cap-beta'].map(id => (
        <div key={id} className="border border-gray-800 rounded p-3 space-y-1 text-xs font-mono">
          <div className="text-gray-300 font-bold">{id}</div>
          <div className="text-gray-500">entropy_budget: 100</div>
          <div className="text-gray-500">capabilities: READ_STATE, EMIT_EVENT</div>
          <div className="text-green-400">sealed: true</div>
        </div>
      ))}
    </div>
  )
}
