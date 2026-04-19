import { NextRequest, NextResponse } from 'next/server'
import { getZai } from '@/lib/ai'

const SYSTEM_PROMPT = `You are analysing a social media post link. Extract:
- title: short catchy title describing the activity or place (max 8 words)
- summary: what this activity, event, or place is about (2-3 sentences)
- location: venue or place name if mentioned, else null
- category: one of restaurant|activity|event|travel|other
- platform: detected from URL domain (twitter|instagram|tiktok|youtube|other)
Return JSON only. No markdown, no explanation, no extra keys.`

const FALLBACK = {
  title: 'Untitled Activity',
  summary: 'Could not summarise this link. Add it manually.',
  location: null,
  category: 'other',
  platform: 'other',
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json(FALLBACK)
    }

    const completion = await getZai().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: url },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 300,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) return NextResponse.json(FALLBACK)

    const data = JSON.parse(content)
    return NextResponse.json({
      title: data.title ?? FALLBACK.title,
      summary: data.summary ?? FALLBACK.summary,
      location: data.location ?? null,
      category: data.category ?? 'other',
      platform: data.platform ?? 'other',
    })
  } catch {
    return NextResponse.json(FALLBACK)
  }
}
