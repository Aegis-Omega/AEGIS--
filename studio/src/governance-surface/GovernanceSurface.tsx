import type { TelemetrySnapshot } from '../types.js'

interface Props { snapshot: TelemetrySnapshot | null }

export function GovernanceSurface({ snapshot }: Props) {
  if (!snapshot) return <div className="p-4 text-gray-500 text-sm">Awaiting telemetry…</div>

  const healthy = snapshot.pgcs_passes && snapshot.corruption_count === 0 && snapshot.vcg_error < 1.0

  return (
    <div className="p-4 space-y-4">
      <div className="text-xs text-gray-400">Guardian Policy Inspection</div>
      <div className={`p-3 rounded border text-sm font-mono ${healthy ? 'border-green-700 bg-green-950 text-green-300' : 'border-red-700 bg-red-950 text-red-300'}`}>
        {healthy ? 'CONSTITUTIONAL: PERMIT' : 'CONSTITUTIONAL: DENY'}
      </div>
      <div className="space-y-2 text-xs font-mono">
        <div className="text-gray-400">Active Amendments</div>
        {['amd_a1b2c3d4', 'amd_e5f6a7b8'].map(id => (
          <div key={id} className="flex items-center gap-3">
            <span className="text-gray-300">{id}</span>
            <span className="ml-auto text-green-400">APPLIED</span>
          </div>
        ))}
      </div>
      <div className="text-xs text-gray-600">
        Mutation authority: {healthy ? 'ACTIVE (entropy_bounded)' : 'SUSPENDED (violation detected)'}
      </div>
    </div>
  )
}
