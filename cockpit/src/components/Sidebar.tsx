import { Plus, Trash2, Circle } from 'lucide-react'
import type { Session } from '../hooks/useSessions.js'
import type { Provider } from '../lib/agent.js'
import { TelemetryPanel } from './TelemetryPanel.js'

// OrchestrationAlliance weights — Claude(618) + GPT(191) + Qwen(191) = 1000
// Claude weight = ⌊1000/φ⌋ = 618. Not decoration — enforced by BFT quorum.
const PROVIDERS: { value: Provider; label: string; weight?: number; color?: string }[] = [
  { value: 'claude',     label: 'Claude (constitutional)',   weight: 618, color: '#60A5FA' },
  { value: 'dashscope',  label: 'Qwen (implementation)',     weight: 191, color: '#A78BFA' },
  { value: 'ollama',     label: 'Ollama (local)',             color: '#6B6B7A' },
]

const COUNCIL = [
  {
    id: 'claude',
    name: 'Claude',
    role: 'Coordinator',
    weight: '618/1000',
    color: '#60A5FA',
    status: 'active',
    tier: 'T2',
  },
  {
    id: 'qwen',
    name: 'Qwen',
    role: 'Implementer',
    weight: '191/1000',
    color: '#A78BFA',
    status: 'active',
    tier: 'T2',
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    role: 'Adversarial audit',
    weight: '191/1000',
    color: '#34D399',
    status: 'advisory',
    tier: 'T2',
  },
  {
    id: 'operator',
    name: 'Tarik Skalić',
    role: 'Operator · Guardian',
    weight: 'veto',
    color: '#C8A96E',
    status: 'veto',
    tier: 'T5',
  },
]

interface SidebarProps {
  sessions: Session[]
  activeId: string | null
  provider: Provider
  onNewChat: () => void
  onSelectSession: (id: string) => void
  onDeleteSession: (id: string) => void
  onProviderChange: (p: Provider) => void
}

export function Sidebar({
  sessions, activeId, provider,
  onNewChat, onSelectSession, onDeleteSession, onProviderChange,
}: SidebarProps) {
  return (
    <aside className="w-60 flex-shrink-0 flex flex-col border-r border-aegis-border bg-aegis-surface overflow-y-auto">
      {/* Identity header */}
      <div className="p-4 border-b border-aegis-border">
        <div className="flex items-baseline gap-2">
          <span className="font-mono font-semibold text-aegis-phi tracking-wider">AEGIS-Ω</span>
          <span className="text-aegis-muted text-xs opacity-60">constitutional</span>
        </div>
        <p className="text-aegis-muted text-xs mt-0.5 opacity-50 font-mono">
          1/φ ≈ 0.6180 · E[S&#8407;|F] = S
        </p>
      </div>

      <div className="p-2">
        <button
          onClick={onNewChat}
          aria-label="New chat"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-aegis-muted hover:text-aegis-text hover:bg-aegis-border transition-colors"
        >
          <Plus size={15} />
          New session
        </button>
      </div>

      <nav className="p-2 space-y-0.5 border-b border-aegis-border">
        {sessions.length === 0 && (
          <p className="text-aegis-muted text-xs px-3 py-4 text-center opacity-60">No sessions yet</p>
        )}
        {sessions.map(s => (
          <div
            key={s.id}
            className={`group flex items-center gap-1 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
              s.id === activeId
                ? 'bg-aegis-border text-aegis-text'
                : 'text-aegis-muted hover:bg-aegis-border hover:text-aegis-text'
            }`}
            onClick={() => onSelectSession(s.id)}
          >
            <span className="flex-1 truncate">{s.title}</span>
            <button
              onClick={e => { e.stopPropagation(); onDeleteSession(s.id) }}
              aria-label={`Delete session ${s.title}`}
              className="opacity-0 group-hover:opacity-100 text-aegis-muted hover:text-red-400 transition-all"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </nav>

      {/* Orchestration Alliance */}
      <div className="p-3 border-b border-aegis-border">
        <p className="text-aegis-muted text-xs font-mono uppercase tracking-widest px-1 mb-2">
          Alliance · total 1000
        </p>
        <div className="space-y-1">
          {COUNCIL.map(agent => (
            <div key={agent.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-aegis-border transition-colors">
              <Circle
                size={7}
                fill={agent.status === 'active' ? agent.color : agent.status === 'veto' ? '#C8A96E' : '#3F3F4A'}
                color={agent.status === 'active' ? agent.color : agent.status === 'veto' ? '#C8A96E' : '#3F3F4A'}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-aegis-text truncate">{agent.name}</span>
                  <span className="font-mono text-xs opacity-50 ml-1" style={{ color: agent.color }}>
                    {agent.weight}
                  </span>
                </div>
                <div className="text-xs text-aegis-muted truncate opacity-70">{agent.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <TelemetryPanel />

      {/* Provider selector */}
      <div className="p-3 border-t border-aegis-border space-y-2 mt-auto">
        <p className="text-aegis-muted text-xs font-mono opacity-50 px-1">Inference route</p>
        <div className="space-y-1">
          {PROVIDERS.map(p => (
            <button
              key={p.value}
              onClick={() => onProviderChange(p.value)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                provider === p.value
                  ? 'bg-aegis-border text-aegis-text'
                  : 'text-aegis-muted hover:bg-aegis-border hover:text-aegis-text'
              }`}
            >
              <Circle
                size={6}
                fill={p.color ?? '#6B6B7A'}
                color={p.color ?? '#6B6B7A'}
              />
              <span className="flex-1 text-left">{p.label}</span>
              {p.weight !== undefined && (
                <span className="font-mono opacity-50">{p.weight}</span>
              )}
            </button>
          ))}
        </div>
        <p className="text-aegis-muted text-xs text-center opacity-30 font-mono pt-1">
          sovereign-runtime v0.5.3
        </p>
      </div>
    </aside>
  )
}
