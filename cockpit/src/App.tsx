import { useEffect, useRef, useState, useCallback } from 'react'
import { useAgent } from './hooks/useAgent.js'
import { useSessions } from './hooks/useSessions.js'
import { subscribeTelemetry, type TelemetryState } from './lib/telemetry.js'
import type { Provider } from './lib/agent.js'

// ── AegisMark SVG ────────────────────────────────────────────
function AegisMark({ size = 32, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color}>
      <rect x="0.5" y="0.5" width="63" height="63" strokeWidth="1" vectorEffect="non-scaling-stroke"/>
      <path d="M 32 32 L 32 14 M 32 32 L 16.4 41 M 32 32 L 47.6 41" strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
      <circle cx="32" cy="12" r="4" strokeWidth="1.6" vectorEffect="non-scaling-stroke"/>
      <circle cx="14.7" cy="42" r="4" strokeWidth="1.6" vectorEffect="non-scaling-stroke"/>
      <circle cx="49.3" cy="42" r="4" strokeWidth="1.6" vectorEffect="non-scaling-stroke"/>
      <circle cx="32" cy="32" r="5" fill={color} stroke="none"/>
    </svg>
  )
}

// ── Constants ─────────────────────────────────────────────────
const DEFAULT_SYSTEM = `You are AEGIS, sovereign intelligence assistant of the Sovereign Omega governance runtime.

Epistemic tiers: T0 (mechanically proven) · T1 (empirically validated) · T2 (engineering hypothesis) · T3–T5 (conjecture/speculative/creative). Never ground T0–T2 claims on T4–T5.

When asked for governance decisions, structure output as JSON:
{ "score": 0–100, "strengths": [3], "risks": [3], "positioning": "…", "actions": [3], "confidence": "heuristic|retrieval|ground_truth" }

Invariants: Replayability ≠ Correctness. Calibration ≠ Truthfulness. Be concise, precise, epistemically honest.`

const BRIDGE_URL = (import.meta.env.VITE_BRIDGE_URL as string | undefined) ?? 'http://localhost:7890'

const INVARIANTS = [
  { tier: 'T0', eq: 'R ≠ C', desc: 'Replayability ≠ Correctness' },
  { tier: 'T0', eq: 'K ≠ T', desc: 'Calibration ≠ Truthfulness' },
  { tier: 'T1', eq: 'Δε < ε₀', desc: 'Bernstein bounds hold — no Hoeffding' },
  { tier: 'T1', eq: 'seq(n+1) > seq(n)', desc: 'Sequence monotonic — IndexedDB allocator' },
  { tier: 'T2', eq: 'JCS(s)', desc: 'Canonical state via RFC 8785' },
]

const TIER_COLORS: Record<string, string> = {
  T0: '#34D399',
  T1: '#60A5FA',
  T2: '#A78BFA',
  T3: '#F59E0B',
}

const PROMPT_CHIPS = [
  'Evaluate my platform strategy',
  'Analyse sequence integrity',
  'Generate governance score',
  'Summarise epoch state',
]

async function postBridgeEvent(type: string, payload: Record<string, unknown>): Promise<void> {
  try {
    await fetch(`${BRIDGE_URL}/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, payload, timestamp_ms: Date.now() }),
      signal: AbortSignal.timeout(2000),
    })
  } catch { /* bridge offline — silent */ }
}

// ── Main App ──────────────────────────────────────────────────
export default function App() {
  const [provider, setProvider] = useState<Provider>('dashscope')
  const [systemPrompt] = useState(DEFAULT_SYSTEM)
  const [input, setInput] = useState('')
  const [latticeOpen, setLatticeOpen] = useState(false)
  const [telemetry, setTelemetry] = useState<TelemetryState>({ status: 'offline' })

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const prevStreamingRef = useRef(false)

  const { messages, streaming, error, send, reset, loadMessages } = useAgent(provider)
  const { sessions, activeId, setActiveId, createSession, updateSession, deleteSession } = useSessions()

  // Subscribe to telemetry
  useEffect(() => {
    return subscribeTelemetry(setTelemetry)
  }, [])

  // Persist messages to session
  useEffect(() => {
    if (activeId) updateSession(activeId, messages)
  }, [messages, activeId, updateSession])

  // Bridge event on response
  useEffect(() => {
    if (prevStreamingRef.current && !streaming) {
      const last = messages.at(-1)
      if (last?.role === 'assistant') {
        void postBridgeEvent('RESPONSE_GENERATED', { content_length: last.content.length })
      }
    }
    prevStreamingRef.current = streaming
  }, [streaming, messages])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  // Auto-resize textarea
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  }, [])

  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    const context = messages.length === 0 && systemPrompt.trim()
      ? [{ role: 'system' as const, content: systemPrompt }]
      : undefined
    void send(text, context)
  }, [input, streaming, messages, systemPrompt, send])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const handleNewChat = useCallback(() => { reset(); createSession() }, [reset, createSession])

  const handleSelectSession = useCallback((id: string) => {
    const session = sessions.find(s => s.id === id)
    loadMessages(session?.messages ?? [])
    setActiveId(id)
  }, [sessions, loadMessages, setActiveId])

  const handleChip = useCallback((text: string) => {
    setInput(text)
    textareaRef.current?.focus()
  }, [])

  const handleExport = useCallback(() => {
    const text = messages
      .filter(m => m.role !== 'system')
      .map(m => `[${m.role.toUpperCase()}]\n${m.content}`)
      .join('\n\n---\n\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aegis-chat-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [messages])

  const visibleMessages = messages.filter(m => m.role !== 'system')
  const isEmpty = visibleMessages.length === 0

  return (
    <div className="cp-shell">
      {/* ── Sidebar ── */}
      <aside className="cp-sidebar">
        {/* Brand */}
        <div className="cp-brand">
          <div className="cp-brand-mark">
            <AegisMark size={32} color="var(--cockpit-phi)" />
          </div>
          <div>
            <div className="word">AEGIS-Ω</div>
            <div className="sub">COCKPIT · v0.1</div>
          </div>
        </div>

        {/* New chat */}
        <button className="cp-row" onClick={handleNewChat}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
          <span className="lbl">New chat</span>
        </button>

        {/* Provider selector */}
        <div style={{ padding: '4px 16px 8px' }}>
          <div className="cp-section-label" style={{ padding: 0, marginBottom: 6 }}>Provider</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['dashscope', 'ollama'] as Provider[]).map(p => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  borderRadius: 8,
                  border: `1px solid ${provider === p ? 'rgba(200,169,110,0.4)' : 'rgba(255,255,255,0.05)'}`,
                  background: provider === p ? 'rgba(200,169,110,0.08)' : 'transparent',
                  color: provider === p ? 'var(--cockpit-phi)' : 'var(--cockpit-muted)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  transition: 'all 0.2s',
                }}
              >
                {p === 'dashscope' ? 'Qwen' : 'Ollama'}
              </button>
            ))}
          </div>
        </div>

        {/* Session list */}
        {sessions.length > 0 && (
          <>
            <div className="cp-section-label">Sessions</div>
            {sessions.map(s => (
              <button
                key={s.id}
                className={`cp-row ${s.id === activeId ? 'active' : ''}`}
                onClick={() => handleSelectSession(s.id)}
              >
                <span className="lbl">{s.title}</span>
                <span
                  className="del"
                  role="button"
                  aria-label="Delete session"
                  onClick={e => { e.stopPropagation(); deleteSession(s.id) }}
                >
                  ✕
                </span>
              </button>
            ))}
          </>
        )}

        {/* Export */}
        {messages.length > 0 && (
          <button
            className="cp-row"
            onClick={handleExport}
            style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.04)', borderRadius: 0, margin: 'auto 0 0', paddingLeft: 18 }}
          >
            <span style={{ fontSize: 13 }}>↓</span>
            <span className="lbl">Export</span>
          </button>
        )}
      </aside>

      {/* ── Main ── */}
      <div className="cp-main">
        {/* Status strip */}
        <div className="cp-status-strip">
          <span className="lit" style={{ color: 'var(--aegis-T0)' }}>R≠C</span>
          <span className="sep">·</span>
          <span className="lit" style={{ color: 'var(--aegis-T0)' }}>K≠T</span>
          <span className="sep">·</span>
          <span className="lit" style={{ color: 'var(--aegis-T1)' }}>Δε&lt;ε₀</span>
          <span className="sep">·</span>
          <span className="lit" style={{ color: 'var(--aegis-T2)' }}>JCS(s)</span>
          <span className="sep">·</span>
          <span className="lit" style={{ color: 'var(--cockpit-muted)', fontSize: 10 }}>seq(n+1)&gt;seq(n)</span>

          <div className="cp-crown">
            <span className="ind" />
            Gate 321 · RESONANT
          </div>
        </div>

        {/* Messages */}
        <div className="cp-messages">
          {isEmpty ? (
            <div className="cp-empty">
              <div style={{ color: 'var(--cockpit-phi)', animation: 'cp-breathe 5.5s ease-in-out infinite' }}>
                <AegisMark size={64} color="var(--cockpit-phi)" />
              </div>
              <p className="invite">
                Ask anything.
                <em>AEGIS-Ω meets you where you are.</em>
              </p>
              <div className="chips">
                {PROMPT_CHIPS.map(chip => (
                  <button key={chip} className="cp-chip" onClick={() => handleChip(chip)}>
                    {chip}
                  </button>
                ))}
              </div>
              <p className="hint">Shift+Enter for newline · Enter to send</p>
            </div>
          ) : (
            visibleMessages.map((msg, i) => {
              const isUser = msg.role === 'user'
              const isLast = i === visibleMessages.length - 1
              const showCursor = isLast && streaming && !isUser

              if (isUser) {
                return (
                  <div key={i} className="cp-bubble-user">
                    {msg.content}
                  </div>
                )
              }

              return (
                <div key={i} className="cp-bubble-asst-wrap">
                  <div className="cp-omega">
                    <AegisMark size={18} color="var(--cockpit-phi)" />
                  </div>
                  <div className="cp-bubble-asst">
                    {msg.content}
                    {showCursor && <span className="cp-cursor" />}
                  </div>
                </div>
              )
            })
          )}

          {error && (
            <div style={{
              padding: '12px 16px', borderRadius: 12,
              background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
              color: '#F87171', fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <div className="cp-input-wrap">
          <div className="cp-input">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask AEGIS…"
              rows={1}
              disabled={streaming}
            />
            <button
              className={`cp-send ${input.trim() && !streaming ? 'ready' : ''}`}
              onClick={handleSend}
              disabled={!input.trim() || streaming}
              aria-label="Send"
            >
              ↑
            </button>
          </div>
          <div className="cp-input-hint">Shift+Enter for newline · AEGIS-Ω · {provider}</div>
        </div>
      </div>

      {/* ── System Lattice ── */}
      <div
        className={`cp-lattice ${latticeOpen ? 'expanded' : 'collapsed'}`}
        onClick={!latticeOpen ? () => setLatticeOpen(true) : undefined}
        role={!latticeOpen ? 'button' : undefined}
        aria-label={!latticeOpen ? 'Open System Lattice' : undefined}
      >
        {!latticeOpen ? (
          <div className="cp-lattice-rail">
            <div className="strip" />
            <span className="vlabel">LATTICE</span>
            <div className="strip" />
          </div>
        ) : (
          <>
            <div className="cp-lattice-head">
              <span className="title">System Lattice</span>
              <button onClick={() => setLatticeOpen(false)} aria-label="Collapse">✕</button>
            </div>
            <div className="cp-lattice-body">

              {/* Invariants */}
              <div className="cp-inv">
                <div className="cp-inv-head">
                  <span className="l">Invariants</span>
                  <span className="r">ACTIVE</span>
                </div>
                {INVARIANTS.map((inv, i) => (
                  <div key={i} className="cp-inv-row">
                    <span
                      className="cp-tier"
                      style={{ color: TIER_COLORS[inv.tier] ?? 'var(--cockpit-muted)' }}
                    >
                      {inv.tier}
                    </span>
                    <div>
                      <div className="cp-inv-eq">{inv.eq}</div>
                      <div className="cp-inv-desc">{inv.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Telemetry */}
              <div className="cp-card">
                <div className="cp-card-head">
                  <span>Runtime Telemetry</span>
                  <span
                    className="cp-card-badge"
                    style={telemetry.status === 'offline' ? {
                      color: 'var(--cockpit-muted)',
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.1)',
                      boxShadow: 'none',
                    } : undefined}
                  >
                    {telemetry.status === 'online' ? 'ONLINE' : telemetry.status === 'error' ? 'ERROR' : 'OFFLINE'}
                  </span>
                </div>
                {telemetry.status === 'online' ? (
                  <>
                    <div className="cp-card-row">
                      <span className="k">sequence</span>
                      <span className="v">{telemetry.data.sequence}</span>
                    </div>
                    <div className="cp-card-row">
                      <span className="k">epoch</span>
                      <span className="v">{telemetry.data.epoch}</span>
                    </div>
                    <div className="cp-card-row">
                      <span className="k">avg_vcg_error</span>
                      <span className="v">{telemetry.data.avg_vcg_error.toFixed(4)}</span>
                    </div>
                    <div className="cp-card-row">
                      <span className="k">drift_index</span>
                      <span className="v">{telemetry.data.drift_index.toFixed(4)}</span>
                    </div>
                    <div className="cp-card-row">
                      <span className="k">pgcs_passes</span>
                      <span className={telemetry.data.pgcs_passes ? 'ok' : 'v'} style={!telemetry.data.pgcs_passes ? { color: 'var(--aegis-error)' } : undefined}>
                        {telemetry.data.pgcs_passes ? 'true' : 'false'}
                      </span>
                    </div>
                    <div className="cp-card-row">
                      <span className="k">corruption_count</span>
                      <span
                        className={telemetry.data.corruption_count === 0 ? 'ok' : 'v'}
                        style={telemetry.data.corruption_count !== 0 ? { color: 'var(--aegis-error)' } : undefined}
                      >
                        {telemetry.data.corruption_count}
                      </span>
                    </div>
                    <div className="cp-card-row">
                      <span className="k">failsafe_state</span>
                      <span className="v">{telemetry.data.failsafe_state}</span>
                    </div>
                    <div className="cp-card-row">
                      <span className="k">calibrator_100k</span>
                      <span className={telemetry.data.calibrator_passes_100k ? 'ok' : 'v'}>
                        {telemetry.data.calibrator_passes_100k ? 'pass' : 'fail'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="cp-card-row">
                    <span className="k">bridge</span>
                    <span className="v" style={{ color: 'var(--cockpit-muted)' }}>
                      {telemetry.status === 'error' ? (telemetry as { status: 'error'; message: string }).message : 'localhost:7890 offline'}
                    </span>
                  </div>
                )}
              </div>

              {/* Gate 321 */}
              <div className="cp-card">
                <div className="cp-card-head">
                  <span>Gate 321 Resonance</span>
                  <span className="cp-card-badge">RESONANT</span>
                </div>
                <div className="cp-card-row">
                  <span className="k">gate_id</span>
                  <span className="v">321</span>
                </div>
                <div className="cp-card-row">
                  <span className="k">state</span>
                  <span className="ok">RESONANT</span>
                </div>
                <div className="cp-card-row">
                  <span className="k">JCS</span>
                  <span className="ok">verified</span>
                </div>
                <div className="cp-card-row">
                  <span className="k">hash_anchor</span>
                  <span className="v" style={{ fontSize: 9 }}>bbe942b8…f3d0fc</span>
                </div>
              </div>

              {/* Alliance */}
              <div className="cp-card">
                <div className="cp-card-head">
                  <span>Orchestration Alliance</span>
                </div>
                <div className="cp-card-row">
                  <span className="k">Claude</span>
                  <span className="v" style={{ color: 'var(--alliance-claude)' }}>coordinator · 618</span>
                </div>
                <div className="cp-card-row">
                  <span className="k">Qwen</span>
                  <span className="v" style={{ color: 'var(--alliance-qwen)' }}>implementer · 191</span>
                </div>
                <div className="cp-card-row">
                  <span className="k">ChatGPT</span>
                  <span className="v" style={{ color: 'var(--alliance-chatgpt)' }}>adversarial · 191</span>
                </div>
                <div className="cp-card-row">
                  <span className="k">Guardian</span>
                  <span className="v" style={{ color: 'var(--alliance-guardian)' }}>Tarik · veto · ∞</span>
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  )
}
