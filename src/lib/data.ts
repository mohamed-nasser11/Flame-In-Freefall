import findingsJson from '../data/findings.json'
import flammabilityJson from '../data/flammability.json'
import type {
  BurnOutcome,
  EvidenceType,
  Finding,
  FindingsDataset,
  FlammabilityDataset,
  HazardType,
  MissionStatus,
} from './types'

export const findingsDataset = findingsJson as FindingsDataset
export const findings: Finding[] = findingsDataset.findings
export const flammability = flammabilityJson as FlammabilityDataset

const findingById = new Map(findings.map((f) => [f.id, f]))

export function getFinding(id: string): Finding | undefined {
  return findingById.get(id)
}

export const HAZARD_LABELS: Record<HazardType, string> = {
  ignition: 'Ignition',
  flame_spread: 'Flame spread',
  material_flammability: 'Material flammability',
  extinguishment: 'Extinguishment',
  smoke_detection: 'Smoke detection',
  method: 'Test method',
}

export const EVIDENCE_LABELS: Record<EvidenceType, { label: string; hint: string }> = {
  result: { label: 'Measured result', hint: 'Reported outcome of a flight experiment.' },
  objective: { label: 'Experiment objective', hint: 'What the experiment set out to measure, not a result.' },
  hypothesis: { label: 'Hypothesis', hint: 'A hypothesis under test; not confirmed in our sources.' },
}

export const OUTCOME_LABELS: Record<BurnOutcome, string> = {
  burned: 'Burned',
  near_limit: 'Near limit',
  extinguished: 'Flame went out',
  did_not_burn: 'Did not burn',
}

export const MISSION_STATUS_LABELS: Record<MissionStatus, string> = {
  operational: 'Operational',
  under_study: 'Proposed, under study',
  historical: 'Historical',
  historical_recommendation: 'Earlier recommendation',
  test_condition: 'Test condition',
  assumption: 'Assumption',
}

/** Individual experiment names, splitting combined labels such as "SAFFIRE-I / SAFFIRE-III". */
export function experimentsOf(f: Finding): string[] {
  return f.experiment.split('/').map((e) => e.trim())
}

export const EXPERIMENTS = Array.from(new Set(findings.flatMap(experimentsOf))).sort()

export const MATERIALS = Array.from(
  new Set(flammability.points.filter((p) => p.fuel_class !== 'liquid_droplet').map((p) => p.material)),
).sort()

const PSI_PATTERN = /PSI-\d+/g

/** Headline numbers for the overview page, all derived from the data files. */
export function datasetStats() {
  const psiIds = new Set<string>()
  for (const f of findings) for (const id of f.psi_id.match(PSI_PATTERN) ?? []) psiIds.add(id)
  for (const p of flammability.points) for (const id of p.psi_id.match(PSI_PATTERN) ?? []) psiIds.add(id)

  const sourceUrls = new Set<string>([
    ...findings.map((f) => f.source.url),
    ...flammability.points.map((p) => p.source.url),
    ...flammability.limits.map((l) => l.source.url),
  ])

  const hazardCounts = findingsDataset.hazard_types
    .map((h) => ({ hazard: h, count: findings.filter((f) => f.hazard_type === h).length }))
    .sort((a, b) => b.count - a.count)

  return {
    findings: findings.length,
    measuredResults: findings.filter((f) => f.evidence_type === 'result').length,
    investigations: psiIds.size,
    testPoints: flammability.points.length,
    solidMaterials: MATERIALS.length,
    hazardTypes: findingsDataset.hazard_types.length,
    sources: sourceUrls.size,
    hazardCounts,
  }
}

const MATERIAL_KEYWORDS: [string, RegExp][] = [
  ['Cotton-fiberglass fabric', /cotton/i],
  ['Nomex', /nomex/i],
  ['Silicone', /silicone/i],
  ['PMMA (acrylic)', /pmma|acrylic/i],
  ['Ultem', /ultem/i],
  ['Kapton', /kapton/i],
  ['Teflon', /teflon/i],
  ['Cellulose', /cellulose/i],
  ['Heptane', /heptane/i],
  ['Methanol', /methanol/i],
  ['Fire-retardant foam', /pyrell|foam/i],
]

/** Materials named in a finding's text or test conditions. */
export function materialsOf(f: Finding): string[] {
  const text = `${f.finding} ${f.conditions}`
  return MATERIAL_KEYWORDS.filter(([, re]) => re.test(text)).map(([name]) => name)
}

export const FINDING_MATERIALS = Array.from(new Set(findings.flatMap(materialsOf))).sort()

/** Caveats that follow from the record itself, shown next to every finding. */
export function findingCaveats(f: Finding): string[] {
  const caveats: string[] = []
  if (f.evidence_type === 'objective') {
    caveats.push('This card states what the experiment set out to study. It is not a measured result.')
  }
  if (f.evidence_type === 'hypothesis') {
    caveats.push('This is a hypothesis under test. Our sources do not confirm or reject it.')
  }
  if (f.missions.some((m) => m !== 'ISS')) {
    caveats.push(
      'Tested in microgravity at about 1 atm. Lunar and Martian partial gravity and the proposed 34% O2 exploration atmosphere were not part of the test.',
    )
  }
  if (/General|program|operations/i.test(f.experiment)) {
    caveats.push('Summarises several experiments or a programme, so specific test conditions are not given.')
  }
  if (!f.source.file) {
    caveats.push('Taken from the online investigation page; no archived copy of the document is in our data set.')
  }
  return caveats
}
