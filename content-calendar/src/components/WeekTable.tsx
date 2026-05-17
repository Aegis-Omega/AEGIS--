import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import type { WeekPlan } from '../lib/calendar-ai.js'

const DAY_NAMES = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const PILLAR_COLORS = [
  'bg-blue-500/15 text-blue-300 border-blue-500/25',
  'bg-purple-500/15 text-purple-300 border-purple-500/25',
  'bg-orange-500/15 text-orange-300 border-orange-500/25',
]

interface WeekTableProps {
  week: WeekPlan
  pillars: [string, string, string]
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      aria-label="Copy post to clipboard"
      className="opacity-0 group-hover:opacity-100 text-cal-muted hover:text-cal-glow transition-all shrink-0"
    >
      {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
    </button>
  )
}

export function WeekTable({ week, pillars }: WeekTableProps) {
  return (
    <div className="bg-cal-surface border border-cal-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-cal-border">
        <span className="text-xs font-medium text-cal-muted">Week {week.week}</span>
        <span className="font-semibold text-cal-text text-sm">{week.theme}</span>
      </div>
      <div className="divide-y divide-cal-border">
        {week.posts.map((post, i) => {
          const pillarIdx = pillars.indexOf(post.content_pillar)
          const colorClass = PILLAR_COLORS[pillarIdx] ?? PILLAR_COLORS[0]
          const copyText = `${DAY_NAMES[post.day] ?? `D${post.day}`} | ${post.platform} | ${post.content_pillar}\nHook: "${post.hook}"\nFormat: ${post.format}\n${post.notes}`
          return (
            <div key={i} className="px-5 py-3 flex flex-col gap-1.5 group">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-semibold text-cal-glow w-8">
                  {DAY_NAMES[post.day] ?? `D${post.day}`}
                </span>
                <span className="text-xs text-cal-muted">{post.platform}</span>
                <span className={`text-xs border rounded-full px-2 py-0.5 ${colorClass}`}>
                  {post.content_pillar}
                </span>
                <span className="text-xs text-cal-muted ml-auto">{post.format}</span>
                <CopyButton text={copyText} />
              </div>
              <p className="text-cal-text text-sm ml-10">&ldquo;{post.hook}&rdquo;</p>
              <p className="text-cal-muted text-xs ml-10">{post.notes}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
