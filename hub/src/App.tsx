import { useEffect, useRef } from 'react'
import { ProductCard } from './components/ProductCard.js'
import { PricingTable } from './components/PricingTable.js'
import { Zap, Lock, RefreshCw, Code } from 'lucide-react'

// Minimal observational analytics — PostHog, determinism_class: 'observational'
// No write-back into governance paths. BigQuery warehouse → dbt metric layer.
function captureEvent(event: string, props?: Record<string, unknown>): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ph = (window as any).posthog
  if (typeof ph?.capture === 'function') ph.capture(event, props)
}

const PRODUCTS = [
  {
    icon: '🎯',
    name: 'Platform Picker',
    tagline: 'Stop guessing which platform fits you',
    description: 'Tell the AI your niche, style, posting schedule, and monetisation goal. Get a scored breakdown across TikTok, YouTube Shorts, Instagram Reels, and Snapchat Spotlight — with a radar chart and one-click share.',
    features: [
      'Radar chart across 4 platforms',
      'Score + reasoning per platform',
      'Tailored to your monetisation goal',
      'Share summary to clipboard',
    ],
    accentColor: '#7C3AED',
    glowColor: '#A78BFA',
    price: 19,
    gumroadUrl: 'https://gumroad.com/l/aegis-platform-picker',
  },
  {
    icon: '⚡',
    name: 'Hook Generator',
    tagline: '10 scroll-stopping hooks in 10 seconds',
    description: 'Input your niche, platform, topic, and tone. The AI returns 10 ranked viral hooks — curiosity gap, controversy, social proof, numbers, pain point — each with a type badge and one-click copy.',
    features: [
      '10 hooks ranked by viral potential',
      'Type-coded with colour badges',
      'Star & save favourites locally',
      'Export all hooks at once',
    ],
    accentColor: '#D97706',
    glowColor: '#FCD34D',
    price: 19,
    gumroadUrl: 'https://gumroad.com/l/aegis-hook-generator',
  },
  {
    icon: '📅',
    name: 'Content Calendar',
    tagline: 'A month of content ideas in one click',
    description: 'Enter your niche, platforms, posting frequency, and 3 content pillars. Get a full 4-week calendar with daily ideas, viral hooks per post, formats, and production notes. Export as TXT or CSV.',
    features: [
      '4 weeks × your posting frequency',
      'Per-post copy buttons',
      'Colour-coded content pillars',
      'Export as TXT or CSV',
    ],
    accentColor: '#16A34A',
    glowColor: '#86EFAC',
    price: 19,
    gumroadUrl: 'https://gumroad.com/l/aegis-content-calendar',
  },
]

const GUARANTEES = [
  {
    icon: Lock,
    title: 'Zero backend',
    desc: 'Runs entirely in your browser. No servers, no accounts, no data collection.',
  },
  {
    icon: Zap,
    title: 'Your API key, your costs',
    desc: 'DashScope free tier covers hundreds of runs. You pay pennies, not subscriptions.',
  },
  {
    icon: Code,
    title: 'Full source code',
    desc: 'Self-host on Vercel in 2 minutes. Fork, modify, make it yours.',
  },
  {
    icon: RefreshCw,
    title: 'Buy once, own forever',
    desc: 'No recurring fees. Future updates included.',
  },
]

export default function App() {
  const trialStartRef = useRef(Date.now())

  useEffect(() => {
    captureEvent('trial_started', { product: 'hub', source: document.referrer || 'direct' })
  }, [])

  const handlePurchaseClick = (product: string, price: number) => {
    const ttv = Math.round((Date.now() - trialStartRef.current) / 1000)
    captureEvent('conversion', { product, price, ttv_seconds: ttv })
  }

  return (
    <div className="min-h-screen bg-hub-bg text-hub-text">

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-4 pt-20 pb-12 text-center">
        <div
          className="animate-fade-up inline-flex items-center gap-2 bg-hub-accent/10 border border-hub-accent/30 rounded-full px-4 py-1.5 text-hub-glow text-sm font-medium mb-8"
          style={{ animationDelay: '0ms' }}
        >
          <Zap size={14} />
          Creator AI Toolkit — 3 tools, one DashScope key
        </div>
        <h1
          className="animate-fade-up text-5xl md:text-6xl font-bold text-hub-text tracking-tight mb-6"
          style={{ animationDelay: '80ms' }}
        >
          AI tools that actually<br />
          <span className="text-hub-glow">help you grow.</span>
        </h1>
        <p
          className="animate-fade-up text-hub-muted text-xl max-w-2xl mx-auto mb-10"
          style={{ animationDelay: '160ms' }}
        >
          Platform Picker. Hook Generator. Content Calendar.
          Zero backend, zero subscription. You own the code.
        </p>
        <div
          className="animate-fade-up flex flex-col sm:flex-row gap-3 justify-center"
          style={{ animationDelay: '240ms' }}
        >
          <a
            href="https://gumroad.com/l/aegis-full-toolkit"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handlePurchaseClick('full-toolkit', 39)}
            className="inline-flex items-center justify-center gap-2 bg-hub-accent text-white font-semibold px-8 py-3.5 rounded-xl hover:opacity-90 transition-opacity text-sm"
          >
            <Zap size={15} />
            Get all 3 tools — $39
          </a>
          <a
            href="#products"
            className="inline-flex items-center justify-center gap-2 border border-hub-border text-hub-muted hover:text-hub-text hover:border-hub-accent/40 font-medium px-8 py-3.5 rounded-xl transition-all text-sm"
          >
            See the tools
          </a>
        </div>
        <p className="text-hub-muted text-xs mt-4">
          One-time payment · Full source code · No subscriptions
        </p>
      </div>

      {/* Product cards */}
      <div id="products" className="max-w-5xl mx-auto px-4 pb-20 scroll-mt-8">
        <div className="grid md:grid-cols-3 gap-6">
          {PRODUCTS.map((p, i) => (
            <ProductCard key={p.name} {...p} delay={300 + i * 100} />
          ))}
        </div>
      </div>

      {/* Guarantees */}
      <div className="max-w-4xl mx-auto px-4 pb-20">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          {GUARANTEES.map(g => (
            <div key={g.title} className="bg-hub-surface border border-hub-border rounded-xl p-5">
              <g.icon size={18} className="text-hub-glow mb-3" />
              <div className="font-semibold text-hub-text text-sm mb-1">{g.title}</div>
              <p className="text-hub-muted text-xs leading-relaxed">{g.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-3xl mx-auto px-4 pb-20 text-center">
        <h2 className="text-2xl font-bold text-hub-text mb-3">Up and running in 5 minutes</h2>
        <p className="text-hub-muted mb-10">
          No backend to set up. No API wrappers to pay for. Just your key and a Vercel deploy.
        </p>
        <div className="grid md:grid-cols-3 gap-4 text-left">
          {[
            {
              step: '1',
              title: 'Get a free DashScope key',
              desc: 'Sign up at dashscope.aliyuncs.com. The free tier covers hundreds of requests — more than enough to start.',
            },
            {
              step: '2',
              title: 'Deploy to Vercel',
              desc: 'Import the repo, set VITE_DASHSCOPE_API_KEY, set Root Directory to the tool you bought. Done in 2 minutes.',
            },
            {
              step: '3',
              title: 'Create content',
              desc: 'Fill in the form, click Generate, get AI results instantly. Copy, share, download — no login required.',
            },
          ].map(item => (
            <div key={item.step} className="bg-hub-surface border border-hub-border rounded-xl p-5">
              <div className="w-7 h-7 rounded-lg bg-hub-accent/20 text-hub-glow font-bold text-sm flex items-center justify-center mb-3">
                {item.step}
              </div>
              <div className="font-semibold text-hub-text text-sm mb-1">{item.title}</div>
              <p className="text-hub-muted text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div id="pricing" className="max-w-3xl mx-auto px-4 pb-20 scroll-mt-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-hub-text mb-2">Simple pricing</h2>
          <p className="text-hub-muted">Buy once. Own it forever. No subscriptions, no upsells.</p>
        </div>
        <PricingTable />
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-hub-text text-center mb-8">FAQ</h2>
        <div className="space-y-4">
          {[
            {
              q: 'What is DashScope / do I need to pay for it?',
              a: 'DashScope is Alibaba Cloud\'s AI API, powered by Qwen. The free tier gives you enough credits to run hundreds of generations per month. Most users never need to upgrade.',
            },
            {
              q: 'Do I need to know how to code?',
              a: 'You need to import the repo to Vercel and set one environment variable. Vercel walks you through it — takes about 2 minutes. No coding required.',
            },
            {
              q: 'What do I actually receive when I buy?',
              a: 'You receive the full source code as a zip file. It\'s a React + TypeScript project that you deploy to Vercel. You own the code — modify it however you like.',
            },
            {
              q: 'Can I use this commercially?',
              a: 'Yes. The code is MIT licensed. Use it for your own content, your agency\'s clients, or build your own paid tool on top of it.',
            },
            {
              q: 'What if the tool doesn\'t work for me?',
              a: 'Email for a refund within 30 days. No questions asked.',
            },
          ].map(item => (
            <div key={item.q} className="bg-hub-surface border border-hub-border rounded-xl p-5">
              <div className="font-semibold text-hub-text text-sm mb-2">{item.q}</div>
              <p className="text-hub-muted text-sm leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cross-sell activation strip */}
      <div className="max-w-3xl mx-auto px-4 pb-12">
        <div className="bg-hub-surface border border-hub-accent/20 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-hub-text text-sm font-semibold">Already using one tool?</p>
            <p className="text-hub-muted text-xs mt-0.5">Get all three for $39 — save $18. Starter Pack (any two) for $29.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <a
              href="https://gumroad.com/l/aegis-starter-pack"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handlePurchaseClick('starter-pack', 29)}
              className="text-xs border border-hub-border text-hub-muted hover:text-hub-text hover:border-hub-accent/40 px-4 py-2 rounded-lg transition-all"
            >
              Any 2 — $29
            </a>
            <a
              href="https://gumroad.com/l/aegis-full-toolkit"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handlePurchaseClick('full-toolkit-crosssell', 39)}
              className="text-xs bg-hub-accent text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              All 3 — $39
            </a>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="max-w-2xl mx-auto px-4 pb-20 text-center">
        <div className="bg-hub-surface border border-hub-accent/20 rounded-2xl p-10">
          <h2 className="text-2xl font-bold text-hub-text mb-3">Ready to start?</h2>
          <p className="text-hub-muted mb-6">All three tools for $39. One-time payment. Full source code.</p>
          <a
            href="https://gumroad.com/l/aegis-full-toolkit"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handlePurchaseClick('full-toolkit', 39)}
            className="inline-flex items-center justify-center gap-2 bg-hub-accent text-white font-semibold px-10 py-4 rounded-xl hover:opacity-90 transition-opacity text-sm"
          >
            <Zap size={15} />
            Get the Full Toolkit — $39
          </a>
          <p className="text-hub-muted text-xs mt-4">
            Or get a single tool for $19 · Starter Pack (any 2) for $29
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-hub-border">
        <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-hub-glow" />
            <span className="text-hub-muted text-sm font-medium">AEGIS Creator Toolkit</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#products" className="text-hub-muted text-xs hover:text-hub-text transition-colors">Products</a>
            <a href="#pricing" className="text-hub-muted text-xs hover:text-hub-text transition-colors">Pricing</a>
            <a
              href="https://gumroad.com/l/aegis-full-toolkit"
              target="_blank"
              rel="noopener noreferrer"
              className="text-hub-glow text-xs font-medium hover:opacity-80 transition-opacity"
            >
              Buy now →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
