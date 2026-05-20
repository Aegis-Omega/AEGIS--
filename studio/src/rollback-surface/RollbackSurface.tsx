import type { TelemetrySnapshot } from '../types.js'

interface Props { snapshot: TelemetrySnapshot | null }

export function RollbackSurface({ snapshot }: Props) {
  if (!snapshot) return <div className="p-4 text-gray-500 text-sm">Awaiting telemetry…</div>

  const canRollback = snapshot.pgcs_passes && snapshot.corruption_count === 0

  return (
    <div className="p-4 space-y-4">
      <div className="text-xs text-gray-400">Rollback Certification</div>
      <div className={`p-3 rounded border text-sm ${canRollback ? 'border-green-700 bg-green-950 text-green-300' : 'border-red-700 bg-red-950 text-red-300'}`}>
        {canRollback
          ? 'Rollback certified — replay reconstruction available'
          : 'Rollback blocked — integrity violation detected'}
      </div>
      <div className="text-xs text-gray-500">
        Rollback target: epoch {Math.max(1, snapshot.epoch_sequence - 1)}
      </div>
      <div className="text-xs text-gray-600 italic">
        All rollback actions enter via EventEnvelope → replay certification → governance validation.
        Studio possesses no direct mutation authority.
      </div>
    </div>
  )
}
