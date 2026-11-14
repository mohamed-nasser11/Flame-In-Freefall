import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import FindingCard from '../components/FindingCard'
import FindingDrawer from '../components/FindingDrawer'
import { SectionHeader } from '../components/ui'
import {
  EVIDENCE_LABELS,
  EXPERIMENTS,
  FINDING_MATERIALS,
  HAZARD_LABELS,
  experimentsOf,
  findings,
  findingsDataset,
  getFinding,
  materialsOf,
} from '../lib/data'
import { search } from '../lib/search'
import type { EvidenceType, Finding, HazardType } from '../lib/types'

type SortKey = 'relevance' | 'score' | 'id' | 'experiment'

type Row = { f: Finding; score?: number; matched?: string[] }
type FilterKey = 'hazard' | 'experiment' | 'material' | 'evidence'
interface Option {
  value: string
  label: string
  count: number
}

const FILTER_KEYS: FilterKey[] = ['hazard', 'experiment', 'material', 'evidence']

const MATCHERS: Record<FilterKey, (f: Finding, value: string) => boolean> = {
  hazard: (f, v) => f.hazard_type === v,
  experiment: (f, v) => experimentsOf(f).includes(v),
  material: (f, v) => materialsOf(f).includes(v),
  evidence: (f, v) => f.evidence_type === v,
}

export default function ExplorerPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const hazard = (params.get('hazard') ?? '') as HazardType | ''
  const experiment = params.get('experiment') ?? ''
  const material = params.get('material') ?? ''
  const evidence = (params.get('evidence') ?? '') as EvidenceType | ''
  const sort = (params.get('sort') ?? (q ? 'relevance' : 'score')) as SortKey
  const openId = params.get('finding')
  const open = openId ? getFinding(openId) : undefined

  function update(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: key !== 'finding' })
  }

  const searched = useMemo(() => {
    if (!q.trim()) return findings.map((f) => ({ f }) as Row)
    return search(q, { limit: 50, relativeCutoff: 0.08, kinds: ['finding'] }).map((h): Row => ({
      f: (h.doc as Extract<typeof h.doc, { kind: 'finding' }>).finding,
      score: h.score,
      matched: h.matched,
    }))
  }, [q])

  const active: Partial<Record<FilterKey, string>> = { hazard, experiment, material, evidence }

  /** Rows that pass every active filter except `skip`, used for the option counts. */
  function passing(skip?: FilterKey) {
    return searched.filter(({ f }) =>
      FILTER_KEYS.every((key) => key === skip || !active[key] || MATCHERS[key](f, active[key]!)),
    )
  }

  function optionsFor(key: FilterKey, values: [string, string][]): Option[] {
    const pool = passing(key)
    return values.map(([value, label]) => ({
      value,
      label,
      count: pool.filter(({ f }) => MATCHERS[key](f, value)).length,
    }))
  }

  const hazardOptions = optionsFor(
    'hazard',
    findingsDataset.hazard_types.map((h) => [h, HAZARD_LABELS[h]]),
  )
  const moreCount = [experiment, material, evidence].filter(Boolean).length
  const moreOpen = moreCount > 0

  const results = (() => {
    const sorted = passing()
    if (sort === 'score' || (sort === 'relevance' && !q)) {
      sorted.sort((a, b) => b.f.safety_score - a.f.safety_score || a.f.id.localeCompare(b.f.id))
    } else if (sort === 'id') {
      sorted.sort((a, b) => a.f.id.localeCompare(b.f.id))
    } else if (sort === 'experiment') {
      sorted.sort((a, b) => a.f.experiment.localeCompare(b.f.experiment) || a.f.id.localeCompare(b.f.id))
    }
    return sorted
  })()

  const activeFilters = [hazard, experiment, material, evidence].filter(Boolean).length

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <SectionHeader eyebrow="Summarize" title="NASA Research Explorer">
        {findings.length} findings curated from NASA flight experiments and reports. Every card shows what was measured,
        under which conditions, what it means for a spacecraft, and where it comes from.
      </SectionHeader>

      <div className="mt-8 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] [&>*]:min-w-0">
        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <div>
            <label htmlFor="q" className="label">
              Search
            </label>
            <input
              id="q"
              type="search"
              value={q}
              onChange={(e) => update('q', e.target.value)}
              placeholder="e.g. nitrogen jet, smoke, Nomex"
              maxLength={200}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div>
            <p className="label">Hazard</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {[{ value: '', label: 'All', count: passing('hazard').length }, ...hazardOptions].map((o) => (
                <button
                  key={o.value || 'all'}
                  onClick={() => update('hazard', o.value)}
                  disabled={o.count === 0 && o.value !== hazard}
                  aria-pressed={hazard === o.value}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-35 ${
                    hazard === o.value
                      ? 'border-ember-400/60 bg-ember-500/15 text-ember-200'
                      : 'border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
                  }`}
                >
                  {o.label} <span className="text-slate-500">{o.count}</span>
                </button>
              ))}
            </div>
          </div>
          <details className="group" open={moreOpen || undefined}>
            <summary className="label cursor-pointer list-none select-none text-cyan-300 hover:text-cyan-200">
              <span className="group-open:hidden">More filters{moreCount ? ` (${moreCount} on)` : ''} +</span>
              <span className="hidden group-open:inline">Fewer filters −</span>
            </summary>
            <div className="mt-4 space-y-5">
              <Select
                id="experiment"
                label="Experiment"
                value={experiment}
                onChange={(v) => update('experiment', v)}
                options={optionsFor(
                  'experiment',
                  EXPERIMENTS.map((e) => [e, e]),
                )}
              />
              <Select
                id="material"
                label="Material"
                value={material}
                onChange={(v) => update('material', v)}
                options={optionsFor(
                  'material',
                  FINDING_MATERIALS.map((m) => [m, m]),
                )}
              />
              <Select
                id="evidence"
                label="Evidence type"
                value={evidence}
                onChange={(v) => update('evidence', v)}
                options={optionsFor(
                  'evidence',
                  (Object.keys(EVIDENCE_LABELS) as EvidenceType[]).map((e) => [e, EVIDENCE_LABELS[e].label]),
                )}
              />
            </div>
          </details>
          {activeFilters > 0 && (
            <button
              className="text-xs text-cyan-300 hover:text-cyan-200"
              onClick={() => {
                const next = new URLSearchParams()
                if (q) next.set('q', q)
                setParams(next)
              }}
            >
              Clear {activeFilters} filter{activeFilters > 1 ? 's' : ''}
            </button>
          )}
        </aside>

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-400" aria-live="polite">
              {results.length} of {findings.length} findings
            </p>
            <label className="flex items-center gap-2 text-sm text-slate-400">
              Sort by
              <select
                value={sort}
                onChange={(e) => update('sort', e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-200"
              >
                {q && <option value="relevance">Search match</option>}
                <option value="score">Safety relevance</option>
                <option value="experiment">Experiment</option>
                <option value="id">Finding ID</option>
              </select>
            </label>
          </div>

          {results.length === 0 ? (
            <div className="panel p-10 text-center">
              <p className="text-white">No findings match this combination.</p>
              <p className="mt-1 text-sm text-slate-400">
                Remove one of these to widen the results. The counts in each list show how many findings every option
                would leave.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {q && (
                  <button className="chip" onClick={() => update('q', '')}>
                    Search “{q}” ×
                  </button>
                )}
                {FILTER_KEYS.filter((key) => active[key]).map((key) => (
                  <button key={key} className="chip" onClick={() => update(key, '')}>
                    {FILTER_LABELS[key]}: {displayValue(key, active[key]!)} ×
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ul className="grid gap-4 xl:grid-cols-2">
              {results.map(({ f, matched }) => (
                <li key={f.id}>
                  <FindingCard finding={f} matched={matched} onOpen={() => update('finding', f.id)} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {open && <FindingDrawer finding={open} onClose={() => update('finding', '')} />}
    </div>
  )
}

const FILTER_LABELS: Record<FilterKey, string> = {
  hazard: 'Hazard',
  experiment: 'Experiment',
  material: 'Material',
  evidence: 'Evidence',
}

function displayValue(key: FilterKey, value: string): string {
  if (key === 'hazard') return HAZARD_LABELS[value as HazardType] ?? value
  if (key === 'evidence') return EVIDENCE_LABELS[value as EvidenceType]?.label ?? value
  return value
}

function Select({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string
  label: string
  value: string
  options: Option[]
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.count === 0 && o.value !== value}>
            {o.label} ({o.count})
          </option>
        ))}
      </select>
    </div>
  )
}
