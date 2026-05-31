import { useState, useMemo } from 'react'
import { PricingTable } from './components/PricingTable.js'
import { SuccessPage } from './components/SuccessPage.js'
import { ChatWidget } from './components/ChatWidget.js'
import { Zap, Target, Calendar, ArrowRight, CheckCircle } from 'lucide-react'

function captureEvent(event: string, props?: Record<string, unknown>): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ph = (window as any).posthog
  if (typeof ph?.capture === 'function') ph.capture(event, props)
}

const PLATFORM_PICKER_URL = import.meta.env.VITE_URL_PLATFORM_PICKER as string | undefined
const HOOK_GENERATOR_URL = import.meta.env.VITE_URL_HOOK_GENERATOR as string | undefined
const CONTENT_CALENDAR_URL = import.meta.env.VITE_URL_CONTENT_CALENDAR as string | undefined

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) ?? 'https://rwehltdwpsncnwxzkwik.supabase.co'
const SUPABASE_CHAT_URL = `${SUPABASE_URL}/functions/v1/chat`
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export default function App() {
  const plan = new URLSearchParams(window.location.search).get('plan')
  if (plan) return <SuccessPage />

  const stars = useMemo(() =>
    Array.from({ length: 80 }, (_, i) => ({
      left: (Math.sin(i * 2.399) * 0.5 + 0.5) * 100,
      top: (Math.cos(i * 3.771) * 0.5 + 0.5) * 100,
      size: i % 3 === 0 ? 2 : 1,
      opacity: 0.15 + Math.sin(i) * 0.25,
    })),
    []
  )

  const [demoInput, setDemoInput] = useState('')
  const [demoOutput, setDemoOutput] = useState('')
  const [demoLoading, setDemoLoading] = useState(false)
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)

  async function generateHooks(input: string) {
    if (!input.trim()) return
    setDemoLoading(true)
    setDemoOutput('')
    try {
      const res = await fetch(SUPABASE_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({
          message: `Generate 5 scroll-stopping hooks for this topic: "${input}". Format each hook on a new line starting with a number. Make them punchy, specific, and optimized for social media.`,
          sessionId: 'demo',
        }),
      })
      const data = await res.json()
      setDemoOutput(data.reply ?? 'No response received.')
      captureEvent('demo_generate', { topic: input.slice(0, 50) })
    } catch {
      setDemoOutput('Connection error. Please try again.')
    } finally {
      setDemoLoading(false)
    }
  }

  const tools = [
    {
      icon: <Target color="#A78BFA" size={28} />,
      accent: '#8B5CF6',
      name: 'Platform Picker',
      tagline: 'Know exactly where to post',
      desc: 'Tell the AI your niche, audience size, and content type. Get a ranked breakdown of the best platforms for you — with specific growth strategies for each.',
      features: ['Platform score breakdown', 'Audience-matched strategy', 'Content format recommendations', 'Competitor gap analysis'],
      href: PLATFORM_PICKER_URL || '#pricing',
      price: '$19',
    },
    {
      icon: <Zap color="#06B6D4" size={28} />,
      accent: '#06B6D4',
      name: 'Hook Generator',
      tagline: 'First lines that stop the scroll',
      desc: 'Paste your topic. Get 20 scroll-stopping hooks optimized for your platform — curiosity gaps, controversies, numbers, pain points, social proof. One-click copy.',
      features: ['20 hooks per generation', 'Platform-optimized tone', '7 hook archetypes', 'One-click copy'],
      href: HOOK_GENERATOR_URL || '#pricing',
      price: '$19',
    },
    {
      icon: <Calendar color="#F59E0B" size={28} />,
      accent: '#F59E0B',
      name: 'Content Calendar',
      tagline: 'A month of content in minutes',
      desc: 'Define your pillars and posting frequency. Get a full 30-day content calendar with topics, formats, hooks, and ideal publish times — ready to execute today.',
      features: ['30-day full calendar', 'Multi-platform scheduling', 'Content pillar mapping', 'Export to CSV'],
      href: CONTENT_CALENDAR_URL || '#pricing',
      price: '$19',
    },
  ]

  const stats = [
    { value: '$19', label: 'starts from' },
    { value: 'One-time', label: 'payment, forever' },
    { value: 'Instant', label: 'access' },
    { value: '3 Tools', label: 'in one bundle' },
  ]

  return (
    <div style={{ background: '#030712', minHeight: '100vh', color: '#F1F5F9', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', position: 'relative', overflowX: 'hidden' }}>

      {/* Cosmic background */}
      <div style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(139,92,246,0.12), transparent), radial-gradient(ellipse 50% 40% at 85% 90%, rgba(6,182,212,0.06), transparent)',
      }}>
        {stars.map((star, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: star.size,
              height: star.size,
              borderRadius: '50%',
              background: 'white',
              opacity: star.opacity,
            }}
          />
        ))}
      </div>

      {/* Content wrapper */}
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Navbar */}
        <nav style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(3,7,18,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '0 24px',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ color: '#F59E0B', fontWeight: 700, fontSize: 18, letterSpacing: '0.15em' }}>AEGIS Ω</span>
          <div style={{ display: 'flex', gap: 28 }}>
            {[['Tools', '#tools'], ['Demo', '#demo'], ['Pricing', '#pricing']].map(([label, href]) => (
              <a
                key={label}
                href={href}
                style={{ color: '#64748B', textDecoration: 'none', fontSize: 14, transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#F1F5F9')}
                onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}
              >{label}</a>
            ))}
          </div>
          <a
            href="#pricing"
            style={{
              background: '#8B5CF6',
              color: 'white',
              padding: '8px 16px',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >Get Access</a>
        </nav>

        {/* Hero */}
        <section style={{ padding: '80px 24px 60px', textAlign: 'center' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <div style={{
              display: 'inline-block',
              border: '1px solid rgba(139,92,246,0.4)',
              background: 'rgba(139,92,246,0.08)',
              color: '#A78BFA',
              fontSize: 12,
              borderRadius: 999,
              padding: '4px 12px',
              marginBottom: 24,
            }}>✦ AI Tools for Creators</div>

            <h1 style={{
              fontSize: 'clamp(36px, 6vw, 72px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              color: '#F1F5F9',
              marginBottom: 20,
            }}>Stop guessing. Start creating.</h1>

            <p style={{
              color: '#94A3B8',
              fontSize: 18,
              maxWidth: 580,
              margin: '0 auto 36px',
              lineHeight: 1.6,
            }}>Three AI-powered tools for content creators. Platform Picker, Hook Generator, and Content Calendar — one flat price, no subscription, yours forever.</p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                href="#pricing"
                onClick={() => captureEvent('hero_cta_click', {})}
                style={{
                  background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)',
                  color: 'white',
                  padding: '14px 24px',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 15,
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >Get the Full Toolkit — $39</a>
              <button
                onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
                style={{
                  border: '1px solid rgba(139,92,246,0.4)',
                  color: '#A78BFA',
                  padding: '14px 24px',
                  borderRadius: 12,
                  fontWeight: 600,
                  fontSize: 15,
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >Try the Demo →</button>
            </div>

            {/* Stats strip */}
            <div style={{
              display: 'flex',
              maxWidth: 500,
              margin: '48px auto 0',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 16,
              overflow: 'hidden',
            }}>
              {stats.map((stat, i) => (
                <div key={i} style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '20px 16px',
                  borderRight: i < stats.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'white' }}>{stat.value}</div>
                  <div style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tools section */}
        <section id="tools" style={{ padding: '80px 24px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ color: '#64748B', fontSize: 11, letterSpacing: '0.2em', textAlign: 'center', marginBottom: 12 }}>WHAT YOU GET</div>
            <h2 style={{ fontSize: 32, fontWeight: 700, textAlign: 'center', marginBottom: 8, color: '#F1F5F9' }}>Three tools. Infinite content.</h2>
            <p style={{ color: '#64748B', textAlign: 'center', marginBottom: 48, fontSize: 15 }}>Each tool does one job perfectly. Together they cover the entire content creation workflow.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
              {tools.map((tool, i) => (
                <div
                  key={i}
                  onMouseEnter={() => setHoveredCard(i)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    background: 'rgba(13,17,27,0.9)',
                    border: `1px solid ${hoveredCard === i ? tool.accent + '4d' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: 20,
                    padding: 28,
                    transition: 'border-color 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                  }}
                >
                  <div>
                    <div style={{ marginBottom: 10 }}>{tool.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: 18, color: '#F1F5F9', marginBottom: 4 }}>{tool.name}</div>
                    <div style={{ color: '#64748B', fontSize: 13 }}>{tool.tagline}</div>
                  </div>
                  <p style={{ color: '#94A3B8', fontSize: 14, lineHeight: 1.65, margin: 0 }}>{tool.desc}</p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {tool.features.map((f, fi) => (
                      <li key={fi} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748B', fontSize: 13 }}>
                        <CheckCircle size={14} color={tool.accent} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                    <a href={tool.href} style={{ color: tool.accent, textDecoration: 'none', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      Try it <ArrowRight size={14} />
                    </a>
                    <span style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 16 }}>{tool.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Demo section */}
        <section id="demo" style={{ padding: '80px 24px' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ color: '#64748B', fontSize: 11, letterSpacing: '0.2em', marginBottom: 12 }}>LIVE DEMO</div>
            <h2 style={{ fontSize: 32, fontWeight: 700, color: '#F1F5F9', marginBottom: 8 }}>See the Hook Generator in action</h2>
            <p style={{ color: '#64748B', fontSize: 15, marginBottom: 40 }}>Type any topic and watch the AI generate scroll-stopping hooks instantly. No signup, no API key.</p>

            <div style={{
              border: '1px solid rgba(139,92,246,0.25)',
              borderRadius: 20,
              background: 'rgba(139,92,246,0.04)',
              padding: 32,
            }}>
              <textarea
                rows={3}
                value={demoInput}
                onChange={e => setDemoInput(e.target.value)}
                placeholder="e.g. how to grow on Instagram without posting every day"
                style={{
                  width: '100%',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 12,
                  padding: 14,
                  color: '#F1F5F9',
                  fontSize: 14,
                  resize: 'vertical',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />

              <button
                onClick={() => generateHooks(demoInput)}
                disabled={demoLoading || !demoInput.trim()}
                style={{
                  marginTop: 12,
                  width: '100%',
                  background: '#8B5CF6',
                  color: 'white',
                  padding: '12px 0',
                  borderRadius: 12,
                  fontWeight: 600,
                  fontSize: 14,
                  border: 'none',
                  cursor: demoLoading || !demoInput.trim() ? 'not-allowed' : 'pointer',
                  opacity: demoLoading || !demoInput.trim() ? 0.6 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {demoLoading ? 'Generating...' : 'Generate Hooks'}
              </button>

              {demoOutput && (
                <div style={{
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: 12,
                  padding: 16,
                  marginTop: 16,
                  textAlign: 'left',
                  color: 'white',
                  fontSize: 14,
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                }}>
                  {demoOutput}
                </div>
              )}
            </div>

            <p style={{ marginTop: 16, fontSize: 13, color: '#64748B' }}>
              Want unlimited generations?{' '}
              <a href="#pricing" style={{ color: '#A78BFA', textDecoration: 'none' }}>Get the full toolkit →</a>
            </p>
          </div>
        </section>

        {/* Pricing section */}
        <section id="pricing" style={{ padding: '80px 24px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ color: '#64748B', fontSize: 11, letterSpacing: '0.2em', textAlign: 'center', marginBottom: 12 }}>PRICING</div>
            <h2 style={{ fontSize: 32, fontWeight: 700, textAlign: 'center', color: '#F1F5F9', marginBottom: 8 }}>One-time. Yours forever.</h2>
            <p style={{ color: '#64748B', textAlign: 'center', marginBottom: 40, fontSize: 15 }}>No monthly fees. No API costs. You bring your own Qwen API key (free tier available). We handle the tools.</p>

            <PricingTable />

            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 24, flexWrap: 'wrap' }}>
              {['✓ 30-day refund guarantee', '✓ Instant access', '✓ No subscription', '✓ Full source code'].map((item, i) => (
                <span key={i} style={{ color: '#64748B', fontSize: 13 }}>{item}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '32px 24px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <span style={{ color: '#F59E0B', fontWeight: 700, letterSpacing: '0.15em', marginRight: 12 }}>AEGIS Ω</span>
              <span style={{ color: '#374151', fontSize: 13 }}>© 2026 AEGIS Omega. Built different.</span>
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              {[['Tools', '#tools'], ['Demo', '#demo'], ['Pricing', '#pricing'], ['Contact', 'mailto:info@aegisomega.com']].map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  style={{ color: '#374151', fontSize: 13, textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#64748B')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#374151')}
                >{label}</a>
              ))}
            </div>
          </div>
        </footer>

      </div>

      <ChatWidget />
    </div>
  )
}
