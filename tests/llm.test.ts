import { describe, expect, it } from 'vitest'
import { activeProvider, parseGemini } from '../api/_llm'

describe('activeProvider', () => {
  it('returns null without keys', () => {
    expect(activeProvider({})).toBeNull()
  })
  it('uses Gemini when only its key is set', () => {
    expect(activeProvider({ GEMINI_API_KEY: 'g' })).toBe('gemini')
  })
  it('prefers Anthropic when both keys are set', () => {
    expect(activeProvider({ GEMINI_API_KEY: 'g', ANTHROPIC_API_KEY: 'a' })).toBe('anthropic')
  })
})

describe('parseGemini', () => {
  it('joins text parts and skips reasoning parts', () => {
    const r = parseGemini(
      {
        candidates: [
          {
            content: { parts: [{ text: 'thinking', thought: true }, { text: 'Flames quench [F13].' }] },
            finishReason: 'STOP',
          },
        ],
        modelVersion: 'gemini-x',
      },
      'fallback',
    )
    expect(r).toEqual({ kind: 'text', text: 'Flames quench [F13].', model: 'gemini-x' })
  })
  it('treats a blocked prompt as a refusal', () => {
    expect(parseGemini({ promptFeedback: { blockReason: 'SAFETY' } }, 'm').kind).toBe('refusal')
  })
  it('treats a safety stop as a refusal', () => {
    expect(parseGemini({ candidates: [{ finishReason: 'SAFETY' }] }, 'm').kind).toBe('refusal')
  })
})
