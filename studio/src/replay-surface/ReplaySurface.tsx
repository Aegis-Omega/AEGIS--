import type { ReplayEvent, TelemetrySnapshot } from '../types.js'

interface Props {
  snapshot: TelemetrySnapshot | null
}

function ReplayNode({ event }: { event: ReplayEvent }) {
  return (
    <div className="flex items-center gap-2 py-1 border-b border-gray-800 text-xs font-mono">
      <span className="text-gray-500 w-8 text-right">{event.sequence}</span>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${event.is_replay_reconstructable ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className="text-blue-400 w-32 flex-shrink-0">{event.kind}</span>
      <span className="text-gray-400 truncate">{event.hash.slice(0, 16)}…</span>
    </div>
  )
}

function buildDemoEvents(snapshot: TelemetrySnapshot): ReplayEvent[] {
  const n = Math.min(snapshot.epoch_sequence, 20)
  return Array.from({ length: n }, (_, i) => ({
    sequence: i + 1,
    kind: i % 3 === 0 ? 'TOPOLOGY_TRANSITION' : i % 3 === 1 ? 'CAPABILITY_EVOLUTION' : 'DFA_PHASE',
    hash: `${'a'.charCodeAt(0) + (i % 26)}`.padEnd(64, '0'),
    is_replay_reconstructable: true,
  }))
}

export function ReplaySurface({ snapshot }: Props) {
  if (!snapshot) {
    return (
      <div className="p-4 text-gray-500 text-sm">
        Awaiting bridge telemetry…
      </div>
    )
  }

  const events = buildDemoEvents(snapshot)

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 border-b border-gray-800 flex items-center gap-4">
        <span className="text-xs text-gray-400">epoch</span>
        <span className="text-sm font-mono text-white">{snapshot.epoch_sequence}</span>
        <span className="text-xs text-gray-400 ml-4">gate_rate</span>
        <span className="text-sm font-mono text-white">{(snapshot.gate_acceptance_rate * 100).toFixed(1)}%</span>
        <span className={`ml-auto text-xs px-2 py-0.5 rounded ${snapshot.pgcs_passes ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
          {snapshot.pgcs_passes ? 'PGCS PASS' : 'PGCS FAIL'}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {events.length === 0
          ? <p className="text-gray-600 text-xs">No replay events yet.</p>
          : events.map(ev => <ReplayNode key={ev.sequence} event={ev} />)
        }
      </div>
    </div>
  )
}
