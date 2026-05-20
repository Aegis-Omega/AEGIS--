import { useState } from 'react'
import { useTelemetry } from './useTelemetry.js'
import { ReplaySurface } from './replay-surface/ReplaySurface.js'
import { EpochSurface } from './epoch-surface/EpochSurface.js'
import { DivergenceSurface } from './divergence-surface/DivergenceSurface.js'
import { RollbackSurface } from './rollback-surface/RollbackSurface.js'
import { LineageSurface } from './lineage-surface/LineageSurface.js'
import { TopologySurface } from './topology-surface/TopologySurface.js'
import { OwnershipSurface } from './ownership-surface/OwnershipSurface.js'
import { CapsuleSurface } from './capsule-surface/CapsuleSurface.js'
import { ObservabilitySurface } from './observability-surface/ObservabilitySurface.js'
import { GovernanceSurface } from './governance-surface/GovernanceSurface.js'

type Surface = 'replay' | 'epoch' | 'divergence' | 'rollback' | 'lineage' |
  'topology' | 'ownership' | 'capsule' | 'observability' | 'governance'

const NAV: Array<{ id: Surface; label: string }> = [
  { id: 'replay', label: 'Replay' },
  { id: 'epoch', label: 'Epoch' },
  { id: 'divergence', label: 'Divergence' },
  { id: 'rollback', label: 'Rollback' },
  { id: 'lineage', label: 'Lineage' },
  { id: 'topology', label: 'Topology' },
  { id: 'ownership', label: 'Ownership' },
  { id: 'capsule', label: 'Capsule' },
  { id: 'observability', label: 'Observability' },
  { id: 'governance', label: 'Governance' },
]

export function App() {
  const [active, setActive] = useState<Surface>('replay')
  const { snapshot, error } = useTelemetry()

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="border-b border-gray-800 px-4 py-3 flex items-center gap-4 flex-shrink-0">
        <span className="text-sm font-semibold tracking-wide text-white">AEGIS Studio</span>
        <span className="text-xs text-gray-500">Constitutional Observability — Projection Only</span>
        {error && (
          <span className="ml-auto text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded">
            bridge: {error}
          </span>
        )}
        {!error && snapshot && (
          <span className="ml-auto text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded">
            live · epoch {snapshot.epoch_sequence}
          </span>
        )}
      </header>
      <div className="flex flex-1 min-h-0">
        <nav className="w-36 border-r border-gray-800 flex-shrink-0 py-2">
          {NAV.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`w-full text-left px-4 py-2 text-xs transition-colors ${
                active === id
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
        <main className="flex-1 overflow-auto">
          {active === 'replay' && <ReplaySurface snapshot={snapshot} />}
          {active === 'epoch' && <EpochSurface snapshot={snapshot} />}
          {active === 'divergence' && <DivergenceSurface snapshot={snapshot} />}
          {active === 'rollback' && <RollbackSurface snapshot={snapshot} />}
          {active === 'lineage' && <LineageSurface snapshot={snapshot} />}
          {active === 'topology' && <TopologySurface snapshot={snapshot} />}
          {active === 'ownership' && <OwnershipSurface snapshot={snapshot} />}
          {active === 'capsule' && <CapsuleSurface snapshot={snapshot} />}
          {active === 'observability' && <ObservabilitySurface snapshot={snapshot} />}
          {active === 'governance' && <GovernanceSurface snapshot={snapshot} />}
        </main>
      </div>
    </div>
  )
}
