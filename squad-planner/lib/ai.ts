import OpenAI from 'openai'

let _zai: OpenAI | null = null

export function getZai(): OpenAI {
  if (!_zai) {
    _zai = new OpenAI({
      apiKey: process.env.Z_AI_KEY ?? 'missing',
      baseURL: 'https://api.z.ai/api/paas/v4',
    })
  }
  return _zai
}
