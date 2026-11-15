import Anthropic from '@anthropic-ai/sdk'
import type { ChatTurn } from '../src/lib/assistant.js'

export type LlmResult = { kind: 'text'; text: string; model: string } | { kind: 'refusal'; model: string }

interface LlmRequest {
  system: string
  history: ChatTurn[]
  prompt: string
}

const MAX_OUTPUT_TOKENS = 1500
/** Free-tier Gemini models, fastest first; the next is tried when one is busy or retired. */
export const GEMINI_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash']
const TIMEOUT_MS = 30_000

/** Which provider answers, based on the keys present. Anthropic wins when both are set. */
export function activeProvider(env: NodeJS.ProcessEnv = process.env): 'anthropic' | 'gemini' | null {
  if (env.ANTHROPIC_API_KEY) return 'anthropic'
  if (env.GEMINI_API_KEY) return 'gemini'
  return null
}

export async function generate(req: LlmRequest, env: NodeJS.ProcessEnv = process.env): Promise<LlmResult> {
  const provider = activeProvider(env)
  if (provider === 'anthropic') return generateAnthropic(req, env.ANTHROPIC_MODEL || 'claude-opus-5-5')
  if (provider === 'gemini') {
    const models = env.GEMINI_MODEL ? [env.GEMINI_MODEL, ...GEMINI_MODELS] : GEMINI_MODELS
    return generateGemini(req, env.GEMINI_API_KEY!, [...new Set(models)])
  }
  throw new Error('No language model is configured.')
}

async function generateAnthropic({ system, history, prompt }: LlmRequest, model: string): Promise<LlmResult> {
  const client = new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 1 })
  const response = await client.beta.messages.create({
    model,
    max_tokens: MAX_OUTPUT_TOKENS,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low' },
    system,
    messages: [...history.map((t) => ({ role: t.role, content: t.content })), { role: 'user', content: prompt }],
  })
  if (response.stop_reason === 'refusal') return { kind: 'refusal', model: response.model }
  const text = response.content
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('')
    .trim()
  return { kind: 'text', text, model: response.model }
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[]
  promptFeedback?: { blockReason?: string }
  modelVersion?: string
}

const GEMINI_BLOCKED = new Set(['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII'])

export function parseGemini(body: GeminiResponse, model: string): LlmResult {
  const used = body.modelVersion ?? model
  if (body.promptFeedback?.blockReason) return { kind: 'refusal', model: used }
  const candidate = body.candidates?.[0]
  if (!candidate || GEMINI_BLOCKED.has(candidate.finishReason ?? '')) return { kind: 'refusal', model: used }
  const text = (candidate.content?.parts ?? [])
    .filter((p) => !p.thought)
    .map((p) => p.text ?? '')
    .join('')
    .trim()
  return { kind: 'text', text, model: used }
}

async function generateGemini(req: LlmRequest, key: string, models: string[]): Promise<LlmResult> {
  let lastError: Error | undefined
  for (const model of models) {
    try {
      return await callGemini(req, key, model)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      const status = (err as { status?: number }).status
      // Busy, rate-limited or retired models are worth skipping; anything else is not.
      if (status !== undefined && status !== 404 && status !== 429 && status < 500) throw err
    }
  }
  throw lastError ?? new Error('No Gemini model answered.')
}

async function callGemini({ system, history, prompt }: LlmRequest, key: string, model: string): Promise<LlmResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
  const res = await fetch(url, {
    method: 'POST',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [
        ...history.map((t) => ({ role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.content }] })),
        { role: 'user', parts: [{ text: prompt }] },
      ],
      // Room for the model's internal reasoning on top of the ~1500-token answer.
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: MAX_OUTPUT_TOKENS * 4,
        thinkingConfig: { thinkingLevel: 'low' },
      },
    }),
  })
  if (!res.ok) {
    throw Object.assign(new Error(`Gemini ${model} request failed with status ${res.status}`), { status: res.status })
  }
  return parseGemini((await res.json()) as GeminiResponse, model)
}
