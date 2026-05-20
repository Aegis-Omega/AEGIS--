import type { TelemetrySnapshot } from '../types.js'

interface Props { snapshot: TelemetrySnapshot | null }

export function EpochSurface({ snapshot }: Props) {
  if (!snapshot) return <div className="p-4 text-gray-500 text-sm">Awaiting telemetry…</div>

  const epochs = Math.min(snapshot.epoch_sequence, 10)
  const links = Array.from({ length: epochs }, (_, i) => ({
    seq: i + 1,
    hash: `epoch_${i + 1}`.padEnd(16, '0'),
    valid: snapshot.vcg_error < 1.0,
  }))

  return (
    <div className="p-4 space-y-1">
      <div className="text-xs text-gray-400 mb-3">Epoch Chain — {epochs} links</div>
      {links.map(l => (
        <div key={l.seq} className="flex items-center gap-3 text-xs font-mono">
          <span className="text-gray-500 w-4">{l.seq}</span>
          <span className={`w-2 h-2 rounded-full ${l.valid ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-gray-300">{l.hash}</span>
        </div>
      ))}
    </div>
  )
}
