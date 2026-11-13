import { describe, expect, it } from 'vitest'
import { assessCoverage } from '../src/lib/coverage'
import { flammability, getFinding } from '../src/lib/data'
import { rankItems, runRiskCheck, validateScenario, type Scenario } from '../src/lib/risk'

const iss: Scenario = {
  name: 'ISS',
  o2Percent: 21,
  pressurePsia: 14.7,
  ventMin: 5,
  ventMax: 30,
  gravity: 'micro',
  materials: ['cotton', 'nomex_ht'],
  suppression: 'water_mist',
  detection: 'single',
}

const exploration: Scenario = { ...iss, name: 'Exploration', o2Percent: 34, pressurePsia: 8.2, gravity: 'lunar' }

describe('validateScenario', () => {
  it('accepts a valid scenario', () => {
    expect(validateScenario(iss)).toEqual([])
  })

  it('rejects out-of-range and inconsistent values', () => {
    expect(validateScenario({ ...iss, o2Percent: 150 })[0].field).toBe('o2Percent')
    expect(validateScenario({ ...iss, pressurePsia: Number.NaN })[0].field).toBe('pressurePsia')
    expect(validateScenario({ ...iss, ventMin: 20, ventMax: 5 })[0].field).toBe('ventMin')
  })
})

describe('coverage', () => {
  it('treats ISS air as within the tested range', () => {
    expect(assessCoverage(21, 101.3).level).toBe('within')
  })

  it('treats the 34% / 8.2 psia atmosphere as outside the tested range', () => {
    expect(assessCoverage(34, 56.5).level).toBe('outside')
  })
})

describe('runRiskCheck', () => {
  it('is deterministic', () => {
    expect(runRiskCheck(exploration)).toEqual(runRiskCheck(exploration))
  })

  it('puts evidence gaps first for the exploration atmosphere', () => {
    const { items } = runRiskCheck(exploration)
    expect(items[0].outsideEvidence).toBe(true)
    expect(items.slice(0, 2).map((i) => i.id)).toContain('o2-outside-evidence')
  })

  it('does not flag ISS air as outside the evidence', () => {
    const ids = runRiskCheck(iss).items.map((i) => i.id)
    expect(ids).not.toContain('o2-outside-evidence')
    expect(ids).toContain('ventilation-worst-case')
  })

  it('ranks a directed inert-gas jet above water mist', () => {
    const jet = runRiskCheck({ ...iss, suppression: 'inert_jet' }).items.find((i) => i.id === 'suppression')
    const mist = runRiskCheck(iss).items.find((i) => i.id === 'suppression')
    expect(jet?.relevance).toBe('high')
    expect(mist?.relevance).toBe('low')
  })

  it('flags partial gravity as outside the evidence', () => {
    const fanOff = runRiskCheck(exploration).items.find((i) => i.id === 'fan-off')
    expect(fanOff?.outsideEvidence).toBe(true)
  })

  it('only cites evidence that exists', () => {
    const limitIds = new Set(flammability.limits.map((l) => l.id))
    const pointIds = new Set(flammability.points.map((p) => p.id))
    for (const s of [
      iss,
      exploration,
      { ...iss, materials: ['pmma', 'nomex_iii', 'liquid', 'ultem', 'silicone'] } as Scenario,
    ]) {
      for (const item of runRiskCheck(s).items) {
        expect(item.evidence.length).toBeGreaterThan(0)
        for (const e of item.evidence) {
          if (e.kind === 'finding') expect(getFinding(e.id), e.id).toBeDefined()
          if (e.kind === 'limit') expect(limitIds.has(e.id), e.id).toBe(true)
          if (e.kind === 'point') expect(pointIds.has(e.id), e.id).toBe(true)
        }
      }
    }
  })

  it('orders by tier before anything else', () => {
    const ranked = rankItems([
      { id: 'b', title: '', relevance: 'low', factors: ['x', 'y'], comparison: '', review: '', evidence: [] },
      { id: 'a', title: '', relevance: 'high', factors: [], comparison: '', review: '', evidence: [] },
    ])
    expect(ranked.map((i) => i.id)).toEqual(['a', 'b'])
  })
})
