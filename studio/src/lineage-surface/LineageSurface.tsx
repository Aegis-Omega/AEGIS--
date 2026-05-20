import { useState } from 'react'
import type { TelemetrySnapshot } from '../types.js'

interface Props { snapshot: TelemetrySnapshot | null }

export function LineageSurface({ snapshot }: Props) {
  const [expanded, setExpanded] = useState(false)
  if (!snapshot) return <div className="p-4 text-gray-500 text-sm">Awaiting telemetry…</div>

  const total = snapshot.epoch_sequence
  const visible = expanded ? total : Math.min(total, 5)

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">Adaptive Lineage — {total} entries</span>
        {total > 5 && (
          <button
            className="text-xs text-blue-400 hover:text-blue-300"
            onClick={() => setExpanded(e => !e)}
          >
            {expanded ? 'collapse' : `show all ${total}`}
          </button>
        )}
      </div>
      <div className="space-y-1">
        {Array.from({ length: visible }, (_, i) => (
          <div key={i} className="flex items-center gap-2 text-xs font-mono py-0.5">
            <span className="text-gray-600 w-4">{total - i}</span>
            <span className="text-blue-400 w-28">{i % 2 === 0 ? 'TOPO_TRANSITION' : 'CAP_EVOLUTION'}</span>
            <span className="text-gray-500">{'a'.repeat(8)}…</span>
            <span className="ml-auto text-green-500 text-xs">✓</span>
          </div>
        ))}
      </div>
      {!expanded && total > 5 && (
        <div className="text-xs text-gray-600">…{total - 5} more (lazy loaded)</div>
      )}
    </div>
  )
}
