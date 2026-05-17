const PLATFORMS = ['TikTok', 'YouTube Shorts', 'Instagram Reels', 'Snapchat Spotlight'] as const

export type Platform = (typeof PLATFORMS)[number]

export interface PlatformRanking {
  platform: Platform
  score: number       // 1–10
  reason: string
  best_for: string
}

export interface MatcherInput {
  niche: string
  content_style: string
  target_age: string
  posting_frequency: string
  monetisation_goal: string
  current_following: string
}

const SYSTEM_PROMPT = `You are a short-form video platform expert.
Given a creator's profile, rank these platforms: ${PLATFORMS.join(', ')}.
Respond ONLY as valid JSON — an array of objects with keys:
  "platform" (one of the platforms above),
  "score" (integer 1-10, higher = better fit),
  "reason" (one sentence why),
  "best_for" (2-4 word label e.g. "viral dance content").
Sort descending by score. No markdown, no explanation outside the JSON array.`

export async function rankPlatforms(input: MatcherInput): Promise<PlatformRanking[]> {
  const apiKey = import.meta.env.VITE_DASHSCOPE_API_KEY
  if (!apiKey) throw new Error('VITE_DASHSCOPE_API_KEY is not configured')

  const model = import.meta.env.VITE_DASHSCOPE_MODEL ?? 'qwen-plus'
  const userMessage = `
Niche: ${input.niche}
Content style: ${input.content_style}
Target age group: ${input.target_age}
Posting frequency: ${input.posting_frequency}
Monetisation goal: ${input.monetisation_goal}
Current following size: ${input.current_following}
`.trim()

  const res = await fetch(
    'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
      }),
    },
  )

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`DashScope ${res.status}: ${body}`)
  }

  const data = await res.json() as { choices: { message: { content: string } }[] }
  let raw = data.choices[0]?.message?.content ?? ''

  // Strip markdown fences if the API ignores response_format
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

  // Handle both array and {rankings:[...]} shapes
  const parsed: unknown = JSON.parse(raw)
  const rankings: unknown[] = Array.isArray(parsed)
    ? parsed
    : (parsed as Record<string, unknown[]>)[Object.keys(parsed as object)[0]] ?? []

  return rankings as PlatformRanking[]
}
