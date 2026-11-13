import Anthropic from '@anthropic-ai/sdk'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  INSUFFICIENT_EVIDENCE,
  SYSTEM_PROMPT,
  buildEvidenceBlock,
  enforceCitations,
  retrievalOnlyResponse,
  retrieve,
  toCitedSource,
  validateAskRequest,
  type AskResponse,
} from '../src/lib/assistant.js'

const MODEL = process.env.EMBER_MODEL || 'claude-opus-5-5'
const WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 12
const recent = new Map<string, number[]>()

function rateLimited(ip: string) {
  const now = Date.now()
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  hits.push(now)
  recent.set(ip, hits)
  return hits.length > MAX_REQUESTS_PER_WINDOW
}

function log(event: string, data: Record<string, unknown>) {
  console.log(JSON.stringify({ at: new Date().toISOString(), event, ...data }))
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  const ip = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || 'unknown'
  if (rateLimited(ip)) {
    return res.status(429).json({ error: 'Too many questions in a short time. Please wait a minute.' })
  }

  const parsed = validateAskRequest(req.body)
  if (!parsed.ok) return res.status(400).json({ error: parsed.error })
  const { question, history = [] } = parsed.value

  const hits = retrieve(question, history)
  if (hits.length === 0) {
    log('ask.insufficient', { reason: 'no_retrieval' })
    const body: AskResponse = { mode: 'insufficient_evidence', answer: INSUFFICIENT_EVIDENCE, sources: [] }
    return res.status(200).json(body)
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    log('ask.fallback', { reason: 'no_api_key' })
    return res
      .status(200)
      .json(retrievalOnlyResponse(hits, 'The AI assistant is not configured, so these are the closest records from the knowledge base.'))
  }

  const started = Date.now()
  try {
    const client = new Anthropic({ timeout: 45_000, maxRetries: 1 })
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 1500,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: SYSTEM_PROMPT,
      messages: [
        ...history.map((t) => ({ role: t.role, content: t.content })),
        {
          role: 'user',
          content: `EVIDENCE\n\n${buildEvidenceBlock(hits)}\n\nQUESTION\n${question}`,
        },
      ],
    })

    if (response.stop_reason === 'refusal') {
      log('ask.refusal', { ms: Date.now() - started })
      return res.status(200).json(retrievalOnlyResponse(hits, 'The assistant could not answer this question, so these are the closest records.'))
    }

    const raw = response.content
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('')
      .trim()

    if (!raw || raw.includes('INSUFFICIENT_EVIDENCE')) {
      log('ask.insufficient', { reason: 'model', ms: Date.now() - started })
      const body: AskResponse = { mode: 'insufficient_evidence', answer: INSUFFICIENT_EVIDENCE, sources: [] }
      return res.status(200).json(body)
    }

    const allowed = new Set(hits.map((h) => h.doc.id))
    const { text, cited, dropped } = enforceCitations(raw, allowed)
    const byId = new Map(hits.map((h) => [h.doc.id, h.doc]))
    const body: AskResponse = {
      mode: 'answer',
      answer: text,
      sources: cited.map((id) => toCitedSource(byId.get(id)!)),
      ...(dropped.length ? { droppedCitations: dropped } : {}),
    }
    log('ask.answer', { ms: Date.now() - started, retrieved: hits.length, cited: cited.length, dropped: dropped.length, model: response.model })
    return res.status(200).json(body)
  } catch (err) {
    const status = err instanceof Anthropic.APIError ? err.status : undefined
    log('ask.error', { status, message: err instanceof Error ? err.message : 'unknown', ms: Date.now() - started })
    return res
      .status(200)
      .json(retrievalOnlyResponse(hits, 'The AI assistant is unavailable right now, so these are the closest records from the knowledge base.'))
  }
}
