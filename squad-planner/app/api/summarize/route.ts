import { NextRequest, NextResponse } from 'next/server'
import { getZai, getGemini } from '@/lib/ai'

const FALLBACK = {
  title: 'Untitled Activity',
  summary: 'Could not summarise this link. Add it manually.',
  location: null,
  category: 'other',
  platform: 'other',
}

function detectPlatform(url: string): string {
  if (url.includes('tiktok.com')) return 'tiktok'
  if (url.includes('instagram.com')) return 'instagram'
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter'
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  return 'other'
}

async function fetchOgTags(url: string): Promise<{ title: string; description: string }> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GoTogetherBot/1.0)',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return { title: '', description: '' }
    const html = await res.text()

    const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1]
      ?? html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i)?.[1]
      ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
      ?? ''

    const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1]
      ?? html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i)?.[1]
      ?? html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1]
      ?? ''

    return { title: ogTitle.trim(), description: ogDesc.trim() }
  } catch {
    return { title: '', description: '' }
  }
}

function buildPrompt(url: string, og: { title: string; description: string }): string {
  const context = og.title || og.description
    ? `Page title: ${og.title}\nPage description: ${og.description}`
    : `URL: ${url}`

  return `You are analysing a social media post or web link about an activity, event, restaurant, or place.

${context}
URL: ${url}

Extract and return ONLY a JSON object with these exact keys:
- title: short catchy title describing the activity or place (max 8 words)
- summary: what this activity, event, or place is about (2-3 sentences, engaging and specific)
- location: venue or place name if mentioned, else null
- category: one of restaurant|activity|event|travel|other
- platform: detected from URL domain (twitter|instagram|tiktok|youtube|other)

Return JSON only. No markdown, no explanation, no extra keys.`
}

function buildFromOg(
  url: string,
  og: { title: string; description: string }
): Record<string, unknown> | null {
  if (!og.title && !og.description) return null
  const words = (og.title || og.description).replace(/\s+/g, ' ').trim().split(' ')
  const title = words.slice(0, 8).join(' ')
  const summary = og.description ? og.description.slice(0, 300) : og.title
  return {
    title,
    summary,
    location: null,
    category: 'other',
    platform: detectPlatform(url),
  }
}

function parseJson(content: string) {
  const cleaned = content.replace(/```json\n?|\n?```/g, '').trim()
  return JSON.parse(cleaned)
}

async function summariseWithZai(prompt: string) {
  const completion = await getZai().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 300,
  })
  const content = completion.choices[0]?.message?.content
  if (!content) throw new Error('empty zai response')
  return parseJson(content)
}

async function summariseWithGemini(prompt: string) {
  const model = getGemini().getGenerativeModel({ model: 'gemini-1.5-flash' })
  const result = await model.generateContent(prompt)
  const content = result.response.text()
  if (!content) throw new Error('empty gemini response')
  return parseJson(content)
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url || typeof url !== 'string') return NextResponse.json(FALLBACK)

    const og = await fetchOgTags(url)
    const prompt = buildPrompt(url, og)
    const platform = detectPlatform(url)

    let data: Record<string, unknown> | null = null

    try {
      data = await summariseWithZai(prompt)
    } catch {
      try {
        data = await summariseWithGemini(prompt)
      } catch {
        data = buildFromOg(url, og)
      }
    }

    if (!data) return NextResponse.json(FALLBACK)

    return NextResponse.json({
      title: typeof data.title === 'string' && data.title ? data.title : FALLBACK.title,
      summary: typeof data.summary === 'string' && data.summary ? data.summary : FALLBACK.summary,
      location: typeof data.location === 'string' ? data.location : null,
      category: ['restaurant','activity','event','travel','other'].includes(data.category as string) ? data.category : 'other',
      platform: data.platform ?? platform,
    })
  } catch {
    return NextResponse.json(FALLBACK)
  }
}
