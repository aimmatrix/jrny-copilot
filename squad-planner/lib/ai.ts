import OpenAI from 'openai'

export const zai = new OpenAI({
  apiKey: process.env.Z_AI_KEY,
  baseURL: 'https://api.z.ai/api/paas/v4',
})
