import { useEffect, useRef } from 'react'
import type { ChatMessage } from '../lib/agent.js'

interface MessageListProps {
  messages: ChatMessage[]
  streaming: boolean
  error: string | null
}

const CONSTITUTIONAL_INVARIANTS = [
  { label: 'AdaptivePower(T) ≤ ReplayVerifiability(T)', tier: 'T0', desc: 'Root constitutional law' },
  { label: 'E[S_{n+1}|F_n] = S_n', tier: 'T0', desc: 'Martingale boundedness — governance is anchored' },
  { label: '1/φ ≈ 0.6180', tier: 'T0', desc: 'BFT quorum · mutation rate · martingale threshold' },
  { label: 'Tajweed DFA (T1)', tier: 'T1', desc: 'Arabic phoneme state machine — 1,400 yr empirical validation' },
  { label: 'A-B-C-B′-A′ ring (T1)', tier: 'T1', desc: 'Chiastic symmetry = constitutional law at two scales' },
  { label: '3-6-9 vortex cycle (T2)', tier: 'T2', desc: 'Digital root triadic attractor under doubling' },
]

const TIER_COLORS: Record<string, string> = {
  T0: 'text-aegis-t0',
  T1: 'text-aegis-t1',
  T2: 'text-aegis-t2',
  T3: 'text-aegis-t3',
}

function TierBadge({ tier }: { tier: string }) {
  const color = TIER_COLORS[tier] ?? 'text-aegis-muted'
  return (
    <span className={`font-mono text-xs ${color} opacity-70 shrink-0`}>{tier}</span>
  )
}

export function MessageList({ messages, streaming, error }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const visible = messages.filter(m => m.role !== 'system')

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
      {visible.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full gap-6 select-none">
          {/* Constitutional identity */}
          <div className="text-center space-y-1">
            <p className="font-mono text-aegis-phi text-lg tracking-widest">AEGIS-Ω</p>
            <p className="text-aegis-muted text-xs tracking-wide">
              Constitutional AI Runtime · Hash-certified · Replay-verifiable
            </p>
          </div>

          {/* Mathematical invariants table */}
          <div className="w-full max-w-md border border-aegis-border rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-aegis-border bg-aegis-surface/60">
              <p className="text-aegis-muted text-xs font-mono uppercase tracking-widest">
                Active invariants
              </p>
            </div>
            <div className="divide-y divide-aegis-border/50">
              {CONSTITUTIONAL_INVARIANTS.map((inv, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-2.5 hover:bg-aegis-surface/40 transition-colors">
                  <TierBadge tier={inv.tier} />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-aegis-text">{inv.label}</p>
                    <p className="text-xs text-aegis-muted mt-0.5 opacity-70">{inv.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alliance weights */}
          <div className="flex items-center gap-6 text-xs font-mono text-aegis-muted">
            <span><span className="text-aegis-accent">Claude</span> 618</span>
            <span className="text-aegis-border">·</span>
            <span><span className="text-aegis-t2">GPT</span> 191</span>
            <span className="text-aegis-border">·</span>
            <span><span className="text-aegis-t2">Qwen</span> 191</span>
            <span className="text-aegis-border">·</span>
            <span className="text-aegis-phi">⌊1000/φ⌋ = 618</span>
          </div>

          <p className="text-aegis-muted text-xs opacity-40 font-mono">
            Enter · Shift+Enter for newline
          </p>
        </div>
      )}

      {visible.map((m, i) => (
        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-aegis-accent text-white rounded-br-sm'
                : 'bg-aegis-surface border border-aegis-border rounded-bl-sm'
            }`}
          >
            {m.content}
            {streaming && i === visible.length - 1 && m.role === 'assistant' && (
              <span className="inline-block w-1.5 h-4 ml-0.5 bg-aegis-phi animate-pulse rounded-sm align-middle" />
            )}
          </div>
        </div>
      ))}

      {error && (
        <div className="text-red-400 text-xs text-center bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
