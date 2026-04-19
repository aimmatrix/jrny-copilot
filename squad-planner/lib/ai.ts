import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

let _zai: OpenAI | null = null
let _gemini: GoogleGenerativeAI | null = null

export function getZai(): OpenAI {
  if (!_zai) {
    _zai = new OpenAI({
      apiKey: process.env.Z_AI_KEY ?? 'missing',
      baseURL: 'https://api.z.ai/api/paas/v4',
    })
  }
  return _zai
}

export function getGemini(): GoogleGenerativeAI {
  if (!_gemini) {
    _gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? 'missing')
  }
  return _gemini
}
