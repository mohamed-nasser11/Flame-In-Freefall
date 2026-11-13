import { assessCoverage, type Coverage } from './coverage.js'
import { flammability, getFinding } from './data.js'
import type { FlammabilityPoint } from './types.js'

/**
 * Mission Risk Check engine.
 *
 * Each rule looks at the scenario, decides whether a documented NASA result applies, and
 * returns a review item with a qualitative relevance tier. There are no probabilities and
 * no model in the loop: the same input always produces the same output, and every item
 * lists the factors that triggered it and the evidence behind it.
 */

export type Gravity = 'micro' | 'lunar' | 'mars'
export type Suppression = 'water_mist' | 'co2' | 'inert_jet' | 'unknown'
export type Detection = 'single' | 'multi' | 'unknown'

export const MATERIAL_OPTIONS = [
  { id: 'cotton', label: 'Cotton / cotton-fiberglass fabric' },
  { id: 'nomex_ht', label: 'Nomex HT90-40 fabric' },
  { id: 'nomex_iii', label: 'Nomex-III fabric' },
  { id: 'ultem', label: 'Ultem 1000 film' },
  { id: 'silicone', label: 'Silicone' },
  { id: 'pmma', label: 'PMMA (acrylic)' },
  { id: 'liquid', label: 'Liquid fuels or lubricants' },
] as const

export type MaterialId = (typeof MATERIAL_OPTIONS)[number]['id']

export interface Scenario {
  name: string
  o2Percent: number
  pressurePsia: number
  ventMin: number
  ventMax: number
  gravity: Gravity
  materials: MaterialId[]
  suppression: Suppression
  detection: Detection
}

export const LIMITS = {
  o2Percent: [5, 100],
  pressurePsia: [1, 16],
  vent: [0, 100],
} as const

export type Relevance = 'high' | 'medium' | 'low'

export interface EvidenceRef {
  /** Finding id (F01...), limit id (LIM-...) or map point id. */
  id: string
  kind: 'finding' | 'limit' | 'point'
}

export interface ReviewItem {
  id: string
  title: string
  relevance: Relevance
  /** Scenario factors that triggered this item, in plain words. */
  factors: string[]
  /** How the scenario compares with the tested conditions. */
  comparison: string
  /** Suggested question for the engineer. Never an instruction. */
  review: string
  evidence: EvidenceRef[]
  uncertainty?: string
  outsideEvidence?: boolean
}

export interface RiskReport {
  scenario: Scenario
  coverage: Coverage
  o2PartialKpa: number
  pressureKpa: number
  items: ReviewItem[]
}

export interface ValidationError {
  field: keyof Scenario
  message: string
}

const PSI_TO_KPA = 6.894757
const SOLID_POINTS = flammability.points.filter((p) => p.fuel_class !== 'liquid_droplet')
const SOLID_O2_MAX = Math.max(...SOLID_POINTS.map((p) => p.o2_percent))
const ULOI = flammability.limits.find((l) => l.id === 'LIM-ULOI')?.values ?? {}

export function validateScenario(s: Scenario): ValidationError[] {
  const errors: ValidationError[] = []
  const inRange = (v: number, [lo, hi]: readonly [number, number]) => Number.isFinite(v) && v >= lo && v <= hi
  if (!inRange(s.o2Percent, LIMITS.o2Percent)) {
    errors.push({ field: 'o2Percent', message: `Oxygen must be between ${LIMITS.o2Percent[0]} and ${LIMITS.o2Percent[1]}%.` })
  }
  if (!inRange(s.pressurePsia, LIMITS.pressurePsia)) {
    errors.push({
      field: 'pressurePsia',
      message: `Pressure must be between ${LIMITS.pressurePsia[0]} and ${LIMITS.pressurePsia[1]} psia.`,
    })
  }
  if (!inRange(s.ventMin, LIMITS.vent) || !inRange(s.ventMax, LIMITS.vent)) {
    errors.push({ field: 'ventMin', message: `Ventilation must be between ${LIMITS.vent[0]} and ${LIMITS.vent[1]} cm/s.` })
  } else if (s.ventMin > s.ventMax) {
    errors.push({ field: 'ventMin', message: 'Minimum ventilation cannot be higher than the maximum.' })
  }
  if (s.name.length > 80) errors.push({ field: 'name', message: 'Scenario name is limited to 80 characters.' })
  return errors
}

const finding = (id: string): EvidenceRef => ({ id, kind: 'finding' })
const limit = (id: string): EvidenceRef => ({ id, kind: 'limit' })
const point = (id: string): EvidenceRef => ({ id, kind: 'point' })

function o2Gap(s: Scenario) {
  return s.o2Percent - SOLID_O2_MAX
}

function closestPoint(predicate: (p: FlammabilityPoint) => boolean, o2: number): FlammabilityPoint | undefined {
  return SOLID_POINTS.filter(predicate).sort((a, b) => Math.abs(a.o2_percent - o2) - Math.abs(b.o2_percent - o2))[0]
}

function describePoint(p: FlammabilityPoint, s: Scenario) {
  const d = s.o2Percent - p.o2_percent
  const delta = Math.abs(d) < 0.5 ? 'about the same oxygen' : `${Math.abs(d).toFixed(1)} points ${d > 0 ? 'more' : 'less'} oxygen`
  return `Closest test: ${p.experiment}, ${p.material}, ${p.o2_percent}% O2 at ${p.flow_velocity_cm_s} cm/s (${p.outcome.replace(/_/g, ' ')}). Your cabin has ${delta}.`
}

type Rule = (s: Scenario, ctx: { coverage: Coverage }) => ReviewItem | null

const RULES: Rule[] = [
  // Oxygen above anything tested with solid materials
  (s, { coverage }) => {
    if (coverage.level === 'within') return null
    const gap = o2Gap(s)
    return {
      id: 'o2-outside-evidence',
      title: 'Cabin oxygen is outside the tested range for solid materials',
      relevance: gap > 0 ? 'high' : 'medium',
      outsideEvidence: true,
      factors: [`${s.o2Percent}% O2 at ${s.pressurePsia} psia`],
      comparison: coverage.message,
      review:
        'Which cabin materials have flammability data at this oxygen level and pressure? Can the material list be screened at the actual mission atmosphere before flight?',
      evidence: [finding('F09'), limit('LIM-MARGIN'), limit('LIM-UG-ROD-CONC')],
      uncertainty:
        'EMBER cannot say whether this cabin is safe or unsafe. It can only say that no flight test in this data set matches it.',
    }
  },

  // Ventilation near the worst case for spread
  (s) => {
    const overlapsWorst = s.ventMax >= 5 && s.ventMin <= 20
    if (!overlapsWorst && s.ventMax > 0) {
      return {
        id: 'ventilation-band',
        title: 'Ventilation speed controls how fast a fire grows',
        relevance: 'medium',
        factors: [`Ventilation ${s.ventMin}–${s.ventMax} cm/s`],
        comparison: 'Your ventilation range sits outside the 5–20 cm/s band where NASA reports the lowest oxygen limit and fastest spread.',
        review: 'Check flame spread at the actual design airflow, including fan transients and local jets near equipment.',
        evidence: [finding('F02'), finding('F13')],
      }
    }
    if (!overlapsWorst) return null
    return {
      id: 'ventilation-worst-case',
      title: 'Cabin airflow is in the range where flames survive at the lowest oxygen',
      relevance: 'high',
      factors: [`Ventilation ${s.ventMin}–${s.ventMax} cm/s overlaps 5–20 cm/s`],
      comparison:
        'NASA reports the minimum oxygen for flames over solids at flows of about 10 cm/s, which is also typical spacecraft ventilation. BASS measured concurrent spread of 2.55 mm/s at ~10 cm/s.',
      review:
        'How fast can ventilation be shut down after a fire alarm, and is fire spread downstream of air outlets covered by detection and response?',
      evidence: [finding('F12'), finding('F11'), finding('F15'), limit('LIM-MODEL-THIN')],
    }
  },

  // Earth screening tests are not conservative
  (s) => {
    const solids = s.materials.filter((m) => m !== 'liquid')
    if (solids.length === 0) return null
    return {
      id: 'earth-screening',
      title: 'Earth flammability screening may not cover microgravity',
      relevance: s.o2Percent >= 21 ? 'high' : 'medium',
      factors: [`${solids.length} solid material type(s) selected`, `${s.o2Percent}% O2`],
      comparison:
        'BASS and BASS-II found materials burning at 1–2.4 points lower oxygen in microgravity than in normal-gravity tests (13.6% vs 15.4–17% for PMMA rods).',
      review:
        'Are material oxygen limits from NASA-STD-6001 Test 1 derated for microgravity? NASA researchers suggest a margin of at least 2.4% O2.',
      evidence: [finding('F09'), finding('F14'), limit('LIM-MARGIN'), limit('LIM-ROD-OPP-LINK')],
    }
  },

  // Specific materials
  (s) => {
    if (!s.materials.includes('cotton')) return null
    const p = closestPoint((p) => /cotton/i.test(p.material), s.o2Percent)
    return {
      id: 'material-cotton',
      title: 'Cotton-fiberglass fabric burned completely in every large-scale test',
      relevance: 'high',
      factors: ['Cotton or cotton-blend fabric selected'],
      comparison: p ? describePoint(p, s) : 'Saffire burned 40 × 94 cm samples at ~21.5% O2.',
      review: 'Where is cotton-based fabric used, how much of it is there, and can it be replaced or separated from ignition sources?',
      evidence: [finding('F01'), finding('F05'), ...(p ? [point(p.id)] : [])],
    }
  },
  (s) => {
    if (!s.materials.includes('nomex_iii')) return null
    const uloi = ULOI['Nomex-III']
    return {
      id: 'material-nomex-iii',
      title: 'Nomex-III burned in microgravity at ISS oxygen levels',
      relevance: s.o2Percent >= 21 ? 'high' : 'medium',
      factors: ['Nomex-III selected', `${s.o2Percent}% O2`],
      comparison: `BASS saw Nomex-III burn at 22% O2 and 14 cm/s. Its normal-gravity upward limiting oxygen index is ${uloi}%.`,
      review: 'Can Nomex-III be replaced with a fabric that resisted burning in BASS, such as Nomex HT90-40?',
      evidence: [finding('F16'), point('BASS-NOMEX-III'), limit('LIM-ULOI')],
    }
  },
  (s) => {
    const picked = (['nomex_ht', 'ultem', 'silicone'] as const).filter((m) => s.materials.includes(m))
    if (picked.length === 0) return null
    const names = picked.map((m) => MATERIAL_OPTIONS.find((o) => o.id === m)!.label)
    const aboveUloi = s.o2Percent >= 23.5 && picked.some((m) => m !== 'silicone')
    const untested = s.o2Percent > SOLID_O2_MAX
    return {
      id: 'material-resistant',
      title: aboveUloi
        ? 'Fire-resistant materials would be above their tested oxygen limit'
        : 'Materials that resisted burning were only tested near 21–22% O2',
      relevance: aboveUloi ? 'high' : untested ? 'medium' : 'low',
      outsideEvidence: untested,
      factors: names,
      comparison: aboveUloi
        ? `Ultem 1000 and Nomex HT90-40 have a normal-gravity upward limiting oxygen index of 23.5%. Your cabin is at ${s.o2Percent}%.`
        : 'Ultem 1000, Nomex HT90-40 and silicone did not burn in BASS or Saffire-II at 21–22% O2.',
      review: untested
        ? 'These results do not carry over to a higher-oxygen cabin. Request flammability data at the mission atmosphere.'
        : 'Keep these materials on the preferred list, and confirm that thickness and geometry match the tested samples.',
      evidence: [finding('F16'), finding('F05'), limit('LIM-ULOI'), point('BASS-ULTEM'), point('BASS-NOMEX-HT')],
    }
  },
  (s) => {
    if (!s.materials.includes('pmma')) return null
    return {
      id: 'material-pmma',
      title: 'PMMA (acrylic) burned down to 13.6% O2 in microgravity',
      relevance: 'high',
      factors: ['PMMA selected'],
      comparison: 'BASS-II concurrent-flow PMMA rods sustained flames at 13.6% O2, well below cabin air.',
      review: 'Where is acrylic used (windows, covers, enclosures), and is it shielded from ignition sources?',
      evidence: [limit('LIM-UG-ROD-CONC'), point('B2-ROD-13.6'), finding('F17')],
    }
  },
  (s) => {
    if (!s.materials.includes('liquid')) return null
    return {
      id: 'liquid-fuels',
      title: 'Liquid fuel fires can keep burning after the flame looks out',
      relevance: 'medium',
      factors: ['Liquid fuels or lubricants selected'],
      comparison:
        'FLEX droplets kept reacting as an invisible “cool flame” after visible extinction, and inert-gas limits were lower than on Earth.',
      review: 'How would crews or sensors confirm full extinction of a liquid fire? Are suppressant concentrations derated for microgravity?',
      evidence: [finding('F22'), finding('F21')],
    }
  },

  // Suppression
  (s) => {
    if (s.suppression === 'water_mist') {
      return {
        id: 'suppression',
        title: 'Water-mist extinguishers are the current ISS direction',
        relevance: 'low',
        factors: ['Water-mist suppression'],
        comparison: 'Water-mist portable extinguishers were sent to the ISS from 2015 to replace CO2 units.',
        review: 'Has the discharge pattern been checked against microgravity flame behaviour for this cabin layout?',
        evidence: [finding('F28'), finding('F10')],
      }
    }
    return {
      id: 'suppression',
      title:
        s.suppression === 'inert_jet'
          ? 'A local inert-gas jet can feed a flame instead of putting it out'
          : 'Inert-gas suppression needs more margin in microgravity',
      relevance: s.suppression === 'inert_jet' ? 'high' : 'medium',
      factors: [
        s.suppression === 'inert_jet' ? 'Directed inert-gas (e.g. N2) jet' : s.suppression === 'co2' ? 'CO2 extinguishers' : 'Suppression not specified',
      ],
      comparison:
        'In BASS a nitrogen jet entrained air and could sustain or strengthen the flame. FLEX found inert-gas flammability limits lower in microgravity than Earth standards assume.',
      review: 'Is the suppressant concentration derated for microgravity, and is the discharge method validated against a burning solid?',
      evidence: [finding('F10'), finding('F21'), finding('F28')],
    }
  },

  // Detection
  (s) => ({
    id: 'detection',
    title: 'Smoke reaches detectors later and with smaller particles in microgravity',
    relevance: s.detection === 'multi' ? 'medium' : 'high',
    factors: [
      s.detection === 'single' ? 'Single-principle smoke detection' : s.detection === 'multi' ? 'Multi-sensor detection' : 'Detection not specified',
    ],
    comparison:
      'SAME found much of the pre-fire smoke below 500 nm and longer transport lags than in normal gravity; detectors measuring more than one property performed better.',
    review: 'Are detectors placed near likely sources and in the ventilation path, and are they sensitive to sub-micron particles?',
    evidence: [finding('F24'), finding('F25'), finding('F26'), finding('F27')],
  }),

  // Response: ventilation shutdown
  (s) => {
    const partial = s.gravity !== 'micro'
    return {
      id: 'fan-off',
      title: partial
        ? 'Turning fans off may not stop a fire in partial gravity'
        : 'Shutting down ventilation starved flames in BASS-II',
      relevance: partial ? 'high' : 'medium',
      outsideEvidence: partial,
      factors: [partial ? `${s.gravity === 'lunar' ? 'Lunar (0.16 g)' : 'Martian (0.38 g)'} gravity` : 'Microgravity'],
      comparison: partial
        ? `Buoyancy adds roughly ${s.gravity === 'lunar' ? '10' : '15'} cm/s of induced flow even with fans off (BASS-II authors' estimate). No flight test covers this.`
        : 'Flames always quenched when the BASS-II fan was turned off, and concurrent spread stopped near 1 cm/s.',
      review: partial
        ? 'What is the fire response if fan shutdown does not quench the flame? This needs partial-gravity test data.'
        : 'Is fan shutdown the first automatic step after detection, and how quickly does airflow decay?',
      evidence: [limit('LIM-FAN-OFF'), finding('F13'), finding('F02')],
      uncertainty: partial
        ? 'The BASS-II authors warn that the fan-off result may not hold in high-oxygen, low-pressure atmospheres or partial gravity.'
        : undefined,
    }
  },

  // Fire size and geometry
  () => ({
    id: 'fire-scale',
    title: 'A realistic-size fire releases about a kilowatt and depends on enclosure geometry',
    relevance: 'medium',
    factors: ['Applies to every crewed cabin'],
    comparison: 'Saffire-I measured about 1200 W from one large fabric sample, and spread was more sensitive to duct size than expected.',
    review: 'Do cabin fire scenarios use large-scale data rather than small coupon tests?',
    evidence: [finding('F01'), finding('F04'), finding('F03')],
  }),

  // Ignition sources
  () => ({
    id: 'ignition-sources',
    title: 'Overheated surfaces ignite materials more easily without buoyant cooling',
    relevance: 'low',
    factors: ['Applies to every cabin with electronics or heaters'],
    comparison: 'NASA notes less convective cooling in low gravity and a strong effect of external radiant heat on ignition.',
    review: 'Are hot surfaces and electronics separated from flammable materials and monitored for overheat?',
    evidence: [finding('F18'), finding('F20')],
  }),
]

const TIER: Record<Relevance, number> = { high: 3, medium: 2, low: 1 }

function evidenceStrength(item: ReviewItem) {
  return item.evidence.reduce((max, e) => {
    if (e.kind !== 'finding') return Math.max(max, 3)
    const f = getFinding(e.id)
    if (!f) return max
    return Math.max(max, f.evidence_type === 'result' ? f.safety_score : f.safety_score - 2)
  }, 0)
}

/**
 * Orders items by tier, then puts gaps in the evidence ahead of covered issues, then by the
 * strongest supporting evidence, then by the number of matched factors.
 */
export function rankItems(items: ReviewItem[]): ReviewItem[] {
  return [...items].sort(
    (a, b) =>
      TIER[b.relevance] - TIER[a.relevance] ||
      Number(Boolean(b.outsideEvidence)) - Number(Boolean(a.outsideEvidence)) ||
      evidenceStrength(b) - evidenceStrength(a) ||
      b.factors.length - a.factors.length ||
      a.id.localeCompare(b.id),
  )
}

export function runRiskCheck(scenario: Scenario): RiskReport {
  const pressureKpa = scenario.pressurePsia * PSI_TO_KPA
  const coverage = assessCoverage(scenario.o2Percent, pressureKpa)
  const items = RULES.map((rule) => rule(scenario, { coverage })).filter((i): i is ReviewItem => i !== null)
  return {
    scenario,
    coverage,
    pressureKpa,
    o2PartialKpa: (scenario.o2Percent / 100) * pressureKpa,
    items: rankItems(items),
  }
}

export const RELEVANCE_LABELS: Record<Relevance, string> = {
  high: 'Review first',
  medium: 'Review',
  low: 'Note',
}
