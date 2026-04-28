// Single source of truth for which model the demos call.
// Works with vanilla OpenAI, Azure AI Foundry, or any OpenAI-compatible endpoint.
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { createOpenAI } from '@ai-sdk/openai'

// Load demos/.env regardless of where tsx was launched from.
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '.env'), quiet: true })

const provider = createOpenAI({
  baseURL: process.env.OPENAI_BASE_URL, // omit for api.openai.com; set for Azure Foundry / proxies
  apiKey:  process.env.OPENAI_API_KEY,
})

export const model = provider.chat(process.env.OPENAI_MODEL ?? 'gpt-5.4-mini')
