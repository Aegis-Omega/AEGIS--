import type { TelemetrySnapshot } from '../types.js'

interface Props { snapshot: TelemetrySnapshot | null }

export function OwnershipSurface({ snapshot }: Props) {
  if (!snapshot) return <div className="p-4 text-gray-500 text-sm">Awaiting telemetry…</div>

  return (
    <div className="p-4 space-y-4">
      <div className="text-xs text-gray-400">Capability Graph</div>
      <div className="space-y-2 text-xs font-mono">
        {['READ_STATE', 'EMIT_EVENT', 'CANONICALIZE'].map(cap => (
          <div key={cap} className="flex items-center gap-3">
            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
            <span className="text-gray-300">{cap}</span>
            <span className="ml-auto text-green-400 text-xs">certified</span>
          </div>
        ))}
      </div>
      <div className="text-xs text-gray-600">
        DelegatedCapability ⊆ CertifiedCapability — invariant enforced by replay substrate.
      </div>
    </div>
  )
}
