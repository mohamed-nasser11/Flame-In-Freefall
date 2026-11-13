import { describe, expect, it } from 'vitest'
import { search, tokenize } from '../src/lib/search'

describe('tokenize', () => {
  it('drops stopwords and normalises suffixes', () => {
    expect(tokenize('How does the flame spread?')).toEqual(['flame', 'spread'])
    expect(tokenize('Detectors and detection')).toContain('detector')
  })
})

describe('search', () => {
  it('finds the nitrogen jet result', () => {
    const hits = search('nitrogen jet extinguisher')
    expect(hits[0]?.doc.id).toBe('F10')
  })

  it('uses domain synonyms', () => {
    const ids = search('smoke detectors').map((h) => h.doc.id)
    expect(ids).toEqual(expect.arrayContaining(['F24', 'F25']))
  })

  it('returns nothing for unrelated questions', () => {
    expect(search('best pizza topping recipe')).toEqual([])
  })

  it('respects the kind filter and limit', () => {
    const hits = search('oxygen limit microgravity', { kinds: ['limit'], limit: 3 })
    expect(hits.length).toBeLessThanOrEqual(3)
    expect(hits.every((h) => h.doc.kind === 'limit')).toBe(true)
  })
})
