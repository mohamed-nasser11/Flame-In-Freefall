import { describe, expect, it } from 'vitest'
import { datasetStats, findings, flammability, getFinding } from '../src/lib/data'

describe('findings dataset', () => {
  it('loads every finding with the required fields', () => {
    expect(findings.length).toBeGreaterThan(0)
    for (const f of findings) {
      expect(f.id).toMatch(/^F\d{2}$/)
      expect(f.finding.length).toBeGreaterThan(20)
      expect(['result', 'objective', 'hypothesis']).toContain(f.evidence_type)
      expect(f.safety_score).toBeGreaterThanOrEqual(1)
      expect(f.safety_score).toBeLessThanOrEqual(5)
      expect(f.source.url).toMatch(/^https?:\/\//)
      expect(f.source.title.length).toBeGreaterThan(5)
    }
  })

  it('has unique ids', () => {
    expect(new Set(findings.map((f) => f.id)).size).toBe(findings.length)
  })

  it('resolves findings by id', () => {
    expect(getFinding('F10')?.experiment).toBe('BASS')
    expect(getFinding('F99')).toBeUndefined()
  })
})

describe('flammability dataset', () => {
  it('has physically valid test conditions', () => {
    for (const p of flammability.points) {
      expect(p.o2_percent).toBeGreaterThan(0)
      expect(p.o2_percent).toBeLessThanOrEqual(100)
      expect(p.flow_velocity_cm_s).toBeGreaterThanOrEqual(0)
      expect(p.pressure_kpa).toBeGreaterThan(0)
      expect(['burned', 'extinguished', 'did_not_burn', 'near_limit']).toContain(p.outcome)
      expect(p.source.url).toMatch(/^https?:\/\//)
    }
  })

  it('has unique point ids', () => {
    const ids = flammability.points.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('labels the exploration atmosphere as not adopted', () => {
    const exploration = flammability.missions.find((m) => m.id === 'EXPLORATION_8.2_34')
    expect(exploration?.status).toBe('under_study')
    expect(flammability.missions.find((m) => m.id === 'MARS_HAB')?.status).toBe('assumption')
  })
})

describe('dataset stats', () => {
  it('are computed from the data', () => {
    const s = datasetStats()
    expect(s.findings).toBe(findings.length)
    expect(s.testPoints).toBe(flammability.points.length)
    expect(s.hazardCounts.reduce((sum, h) => sum + h.count, 0)).toBe(findings.length)
  })
})
