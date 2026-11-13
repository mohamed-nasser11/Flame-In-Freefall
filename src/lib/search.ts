import { HAZARD_LABELS, findings, flammability } from './data'
import type { Finding, FlammabilityLimit } from './types'

/**
 * Lexical retrieval over the knowledge base (BM25 with field weights and a small
 * domain synonym table). The corpus is a few dozen short, curated records, so exact
 * term matching is easy to inspect and test, and needs no embedding service.
 */

export type KnowledgeDoc =
  | { kind: 'finding'; id: string; title: string; text: string; finding: Finding }
  | { kind: 'limit'; id: string; title: string; text: string; limit: FlammabilityLimit }

export interface SearchHit {
  doc: KnowledgeDoc
  score: number
  matched: string[]
}

const STOPWORDS = new Set(
  `a an and are as at be by can could do does did for from has have how in into is it its of on or
  than that the their them then there these they this to was were what when where which while who why
  will with would about any more most other some such only also our your you we i me my much many
  very`.split(/\s+/),
)

const SYNONYMS: Record<string, string[]> = {
  fire: ['flame', 'burn', 'combustion'],
  flame: ['fire', 'burn'],
  burn: ['flame', 'flammab', 'combustion'],
  flammab: ['burn', 'ignit'],
  oxygen: ['o2'],
  o2: ['oxygen'],
  ventilation: ['flow', 'airflow', 'fan'],
  airflow: ['flow', 'ventilation'],
  fan: ['ventilation', 'flow'],
  flow: ['ventilation', 'airflow'],
  extinguish: ['extinction', 'suppress', 'suppressant', 'extinguisher'],
  extinguisher: ['extinguish', 'suppress', 'suppressant'],
  suppress: ['extinguish', 'suppressant'],
  extinction: ['extinguish', 'quench'],
  smoke: ['detector', 'particle', 'detect'],
  detector: ['smoke', 'detect'],
  detect: ['detector', 'smoke'],
  moon: ['lunar', 'artemis', 'partial'],
  lunar: ['moon', 'artemis', 'partial'],
  artemis: ['moon', 'lunar', 'exploration'],
  mars: ['martian', 'partial'],
  microgravity: ['low', 'gravity', 'space'],
  gravity: ['microgravity'],
  material: ['fabric', 'sample', 'solid'],
  fabric: ['material', 'cotton', 'nomex'],
  solid: ['material', 'fabric', 'pmma'],
  acrylic: ['pmma'],
  pmma: ['acrylic'],
  droplet: ['liquid', 'fuel', 'heptane', 'methanol'],
  liquid: ['droplet', 'fuel'],
  spread: ['growth', 'rate'],
  ignit: ['ignition', 'ignite', 'flammab'],
  test: ['standard', 'screening'],
  earth: ['normal', 'ground', '1-g'],
}

function stem(token: string): string {
  if (token.length <= 4) return token
  if (token.startsWith('flammab')) return 'flammab'
  if (token.startsWith('ignit')) return 'ignit'
  for (const suffix of ['ations', 'ation', 'ings', 'ing', 'ers', 'ies', 'ed', 'es', 's']) {
    if (token.endsWith(suffix) && token.length - suffix.length >= 4) {
      return suffix === 'ies' ? token.slice(0, -3) + 'y' : token.slice(0, -suffix.length)
    }
  }
  return token
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/o₂/g, 'o2')
    .split(/[^a-z0-9.%-]+/)
    .map((t) => t.replace(/^[.-]+|[.-]+$/g, ''))
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map(stem)
}

function expandQuery(tokens: string[]): Map<string, number> {
  const weights = new Map<string, number>()
  for (const t of tokens) {
    weights.set(t, Math.max(weights.get(t) ?? 0, 1))
    for (const syn of SYNONYMS[t] ?? []) {
      const s = stem(syn)
      weights.set(s, Math.max(weights.get(s) ?? 0, 0.4))
    }
  }
  return weights
}

function findingDoc(f: Finding): KnowledgeDoc {
  return {
    kind: 'finding',
    id: f.id,
    title: `${f.id} · ${f.experiment}`,
    text: f.finding,
    finding: f,
  }
}

function limitDoc(l: FlammabilityLimit): KnowledgeDoc {
  return { kind: 'limit', id: l.id, title: l.condition ?? l.type, text: l.description, limit: l }
}

/** Fields and the weight each one carries in the score. */
function weightedFields(doc: KnowledgeDoc): [string, number][] {
  if (doc.kind === 'finding') {
    const f = doc.finding
    return [
      [f.finding, 2],
      [f.safety_implication, 1.5],
      [`${f.experiment} ${HAZARD_LABELS[f.hazard_type]} ${f.missions.join(' ')}`, 1.5],
      [f.conditions, 1],
      [f.score_reason, 0.5],
    ]
  }
  const l = doc.limit
  return [
    [l.description, 2],
    [`${l.condition ?? ''} ${l.values ? Object.keys(l.values).join(' ') : ''}`, 1.5],
    [l.source.title, 0.5],
  ]
}

interface Indexed {
  doc: KnowledgeDoc
  tf: Map<string, number>
  length: number
}

function buildIndex(docs: KnowledgeDoc[]) {
  const indexed: Indexed[] = docs.map((doc) => {
    const tf = new Map<string, number>()
    let length = 0
    for (const [text, weight] of weightedFields(doc)) {
      for (const token of tokenize(text)) {
        tf.set(token, (tf.get(token) ?? 0) + weight)
        length += weight
      }
    }
    return { doc, tf, length }
  })
  const df = new Map<string, number>()
  for (const d of indexed) for (const t of d.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1)
  const avgLength = indexed.reduce((s, d) => s + d.length, 0) / Math.max(indexed.length, 1)
  return { indexed, df, avgLength, size: indexed.length }
}

export const KNOWLEDGE_BASE: KnowledgeDoc[] = [
  ...findings.map(findingDoc),
  ...flammability.limits.map(limitDoc),
]

const INDEX = buildIndex(KNOWLEDGE_BASE)
const K1 = 1.2
const B = 0.75

export interface SearchOptions {
  limit?: number
  /** Hits scoring below this fraction of the best hit are dropped. */
  relativeCutoff?: number
  kinds?: KnowledgeDoc['kind'][]
}

export function search(query: string, options: SearchOptions = {}): SearchHit[] {
  const { limit = 8, relativeCutoff = 0.2, kinds } = options
  const terms = expandQuery(tokenize(query))
  if (terms.size === 0) return []

  const hits: SearchHit[] = []
  for (const { doc, tf, length } of INDEX.indexed) {
    if (kinds && !kinds.includes(doc.kind)) continue
    let score = 0
    const matched: string[] = []
    for (const [term, qWeight] of terms) {
      const freq = tf.get(term)
      if (!freq) continue
      const df = INDEX.df.get(term) ?? 0
      const idf = Math.log(1 + (INDEX.size - df + 0.5) / (df + 0.5))
      score += qWeight * idf * ((freq * (K1 + 1)) / (freq + K1 * (1 - B + (B * length) / INDEX.avgLength)))
      if (qWeight === 1) matched.push(term)
    }
    if (score > 0 && matched.length > 0) hits.push({ doc, score, matched })
  }
  hits.sort((a, b) => b.score - a.score)
  const best = hits[0]?.score ?? 0
  return hits.filter((h) => h.score >= best * relativeCutoff).slice(0, limit)
}

export function getDoc(id: string): KnowledgeDoc | undefined {
  return KNOWLEDGE_BASE.find((d) => d.id === id)
}
