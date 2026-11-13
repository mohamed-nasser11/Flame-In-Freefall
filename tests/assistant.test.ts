import { describe, expect, it } from 'vitest'
import {
  INSUFFICIENT_EVIDENCE,
  buildEvidenceBlock,
  enforceCitations,
  retrievalOnlyResponse,
  retrieve,
  validateAskRequest,
} from '../src/lib/assistant'

describe('validateAskRequest', () => {
  it('accepts a normal question and trims it', () => {
    const r = validateAskRequest({ question: '  Why does smoke behave differently?  ' })
    expect(r.ok && r.value.question).toBe('Why does smoke behave differently?')
  })

  it('rejects missing, short and oversized questions', () => {
    expect(validateAskRequest(null).ok).toBe(false)
    expect(validateAskRequest({ question: 42 }).ok).toBe(false)
    expect(validateAskRequest({ question: 'a' }).ok).toBe(false)
    expect(validateAskRequest({ question: 'x'.repeat(501) }).ok).toBe(false)
  })

  it('rejects malformed history and caps its length', () => {
    expect(validateAskRequest({ question: 'valid question', history: [{ role: 'system', content: 'x' }] }).ok).toBe(false)
    const long = Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'turn' }))
    const r = validateAskRequest({ question: 'valid question', history: long })
    expect(r.ok && r.value.history?.length).toBe(6)
  })
})

describe('enforceCitations', () => {
  it('keeps known citations and removes invented ones', () => {
    const allowed = new Set(['F10', 'F21'])
    const { text, cited, dropped } = enforceCitations(
      'Nitrogen jets can feed flames [F10]. Limits are lower [F21][F99]. Made up [NASA-1].',
      allowed,
    )
    expect(cited).toEqual(['F10', 'F21'])
    expect(dropped).toEqual(['F99', 'NASA-1'])
    expect(text).not.toContain('F99')
    expect(text).not.toContain('NASA-1')
    expect(text).toContain('[F10]')
  })
})

describe('retrieval for the assistant', () => {
  it('builds an evidence block that only contains retrieved ids', () => {
    const hits = retrieve('Does turning off ventilation stop a fire?')
    expect(hits.length).toBeGreaterThan(0)
    const block = buildEvidenceBlock(hits)
    for (const h of hits) expect(block).toContain(`[${h.doc.id}]`)
  })

  it('falls back to records when the model is unavailable', () => {
    const hits = retrieve('nitrogen suppressant jet')
    const r = retrievalOnlyResponse(hits, 'offline')
    expect(r.mode).toBe('retrieval_only')
    expect(r.sources.length).toBeGreaterThan(0)
    for (const s of r.sources) expect(r.answer).toContain(`[${s.id}]`)
  })

  it('reports insufficient evidence when nothing is retrieved', () => {
    const r = retrievalOnlyResponse([], 'offline')
    expect(r.mode).toBe('insufficient_evidence')
    expect(r.answer).toBe(INSUFFICIENT_EVIDENCE)
  })
})
