import { useState } from 'react'
import { Sparkles, Loader2, AlertCircle, TrendingUp } from 'lucide-react'
import { rankPlatforms, type MatcherInput, type PlatformRanking } from './lib/matcher.js'

const PLATFORM_EMOJI: Record<string, string> = {
  'TikTok': '🎵',
  'YouTube Shorts': '▶️',
  'Instagram Reels': '📸',
  'Snapchat Spotlight': '👻',
}

const FIELDS: { key: keyof MatcherInput; label: string; placeholder: string }[] = [
  { key: 'niche', label: 'Your niche', placeholder: 'e.g. fitness, cooking, comedy, finance…' },
  { key: 'content_style', label: 'Content style', placeholder: 'e.g. talking head, B-roll, tutorials, skits…' },
  { key: 'target_age', label: 'Target age group', placeholder: 'e.g. 18–24, 25–34, teens…' },
  { key: 'posting_frequency', label: 'Posting frequency', placeholder: 'e.g. daily, 3x/week, weekends only…' },
  { key: 'monetisation_goal', label: 'Monetisation goal', placeholder: 'e.g. brand deals, creator fund, sell products…' },
  { key: 'current_following', label: 'Current following', placeholder: 'e.g. 0 (starting), 5k, 50k…' },
]

type State = 'idle' | 'loading' | 'results' | 'error'

const EMPTY: MatcherInput = { niche: '', content_style: '', target_age: '', posting_frequency: '', monetisation_goal: '', current_following: '' }

export default function App() {
  const [form, setForm] = useState<MatcherInput>(EMPTY)
  const [state, setState] = useState<State>('idle')
  const [results, setResults] = useState<PlatformRanking[]>([])
  const [errorMsg, setErrorMsg] = useState('')

  const valid = Object.values(form).every(v => v.trim().length > 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || state === 'loading') return
    setState('loading')
    try {
      const rankings = await rankPlatforms(form)
      setResults(rankings)
      setState('results')
    } catch (err) {
      setErrorMsg((err as Error).message)
      setState('error')
    }
  }

  const reset = () => { setForm(EMPTY); setState('idle'); setResults([]); setErrorMsg('') }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <div className="max-w-2xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-brand-accent/10 border border-brand-accent/30 rounded-full px-4 py-1.5 text-brand-glow text-sm font-medium mb-6">
            <Sparkles size={14} />
            AI-powered platform matching
          </div>
          <h1 className="text-4xl font-bold text-brand-text mb-3 tracking-tight">
            Platform Picker
          </h1>
          <p className="text-brand-muted text-lg">
            Tell us about your content. Get ranked recommendations for TikTok, YouTube Shorts, Reels & Spotlight.
          </p>
        </div>

        {/* Form */}
        {(state === 'idle' || state === 'error') && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {FIELDS.map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-brand-muted mb-1.5">
                  {f.label}
                </label>
                <input
                  type="text"
                  value={form[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-3 text-sm text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-glow transition-colors"
                />
              </div>
            ))}

            {state === 'error' && (
              <div className="flex items-start gap-2 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3 text-sm">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!valid}
              className="w-full bg-brand-accent hover:bg-brand-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Sparkles size={16} />
              Find my best platform
            </button>
          </form>
        )}

        {/* Loading */}
        {state === 'loading' && (
          <div className="text-center py-20">
            <Loader2 size={36} className="animate-spin text-brand-glow mx-auto mb-4" />
            <p className="text-brand-muted text-sm">Analysing your profile…</p>
          </div>
        )}

        {/* Results */}
        {state === 'results' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp size={18} className="text-brand-glow" />
              <h2 className="font-semibold text-brand-text">Your platform ranking</h2>
            </div>

            {results.map((r, i) => (
              <div
                key={r.platform}
                className={`bg-brand-surface border rounded-2xl p-5 transition-all ${
                  i === 0
                    ? 'border-brand-glow/50 shadow-lg shadow-brand-accent/10'
                    : 'border-brand-border'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{PLATFORM_EMOJI[r.platform] ?? '📱'}</span>
                    <span className="font-semibold text-brand-text">{r.platform}</span>
                    {i === 0 && (
                      <span className="text-xs bg-brand-accent/20 text-brand-glow border border-brand-glow/30 rounded-full px-2 py-0.5 font-medium">
                        Best match
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-brand-glow">{r.score}<span className="text-sm text-brand-muted font-normal">/10</span></div>
                </div>

                {/* Score bar */}
                <div className="w-full bg-brand-border rounded-full h-1.5 mb-3">
                  <div
                    className="bg-brand-glow h-1.5 rounded-full transition-all"
                    style={{ width: `${r.score * 10}%` }}
                  />
                </div>

                <p className="text-brand-muted text-sm mb-1">{r.reason}</p>
                <p className="text-brand-glow/80 text-xs font-medium">{r.best_for}</p>
              </div>
            ))}

            <button
              onClick={reset}
              className="w-full mt-4 border border-brand-border text-brand-muted hover:border-brand-glow hover:text-brand-glow py-3 rounded-xl text-sm transition-colors"
            >
              Try another profile
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
