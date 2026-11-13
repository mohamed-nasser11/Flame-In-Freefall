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
import type { EvidenceType, Finding, HazardType, MissionTag } from '../lib/types'

type SortKey = 'relevance' | 'score' | 'id' | 'experiment'

const MISSIONS: MissionTag[] = ['ISS', 'Moon', 'Mars']

export default function ExplorerPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const hazard = (params.get('hazard') ?? '') as HazardType | ''
  const experiment = params.get('experiment') ?? ''
  const material = params.get('material') ?? ''
  const mission = (params.get('mission') ?? '') as MissionTag | ''
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

  const results = useMemo(() => {
    let list: { f: Finding; score?: number; matched?: string[] }[]
    if (q.trim()) {
      list = search(q, { limit: 50, relativeCutoff: 0.08, kinds: ['finding'] }).map((h) => ({
        f: (h.doc as Extract<typeof h.doc, { kind: 'finding' }>).finding,
        score: h.score,
        matched: h.matched,
      }))
    } else {
      list = findings.map((f) => ({ f }))
    }
    list = list.filter(
      ({ f }) =>
        (!hazard || f.hazard_type === hazard) &&
        (!experiment || experimentsOf(f).includes(experiment)) &&
        (!material || materialsOf(f).includes(material)) &&
        (!mission || f.missions.includes(mission)) &&
        (!evidence || f.evidence_type === evidence),
    )
    const sorted = [...list]
    if (sort === 'score' || (sort === 'relevance' && !q)) {
      sorted.sort((a, b) => b.f.safety_score - a.f.safety_score || a.f.id.localeCompare(b.f.id))
    } else if (sort === 'id') {
      sorted.sort((a, b) => a.f.id.localeCompare(b.f.id))
    } else if (sort === 'experiment') {
      sorted.sort((a, b) => a.f.experiment.localeCompare(b.f.experiment) || a.f.id.localeCompare(b.f.id))
    }
    return sorted
  }, [q, hazard, experiment, material, mission, evidence, sort])

  const activeFilters = [hazard, experiment, material, mission, evidence].filter(Boolean).length

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
          <Select
            id="hazard"
            label="Hazard"
            value={hazard}
            onChange={(v) => update('hazard', v)}
            options={findingsDataset.hazard_types.map((h) => [h, HAZARD_LABELS[h]])}
          />
          <Select
            id="experiment"
            label="Experiment"
            value={experiment}
            onChange={(v) => update('experiment', v)}
            options={EXPERIMENTS.map((e) => [e, e])}
          />
          <Select
            id="material"
            label="Material"
            value={material}
            onChange={(v) => update('material', v)}
            options={FINDING_MATERIALS.map((m) => [m, m])}
          />
          <Select
            id="mission"
            label="Relevant to mission"
            value={mission}
            onChange={(v) => update('mission', v)}
            options={MISSIONS.map((m) => [m, m])}
          />
          <Select
            id="evidence"
            label="Evidence type"
            value={evidence}
            onChange={(v) => update('evidence', v)}
            options={(Object.keys(EVIDENCE_LABELS) as EvidenceType[]).map((e) => [e, EVIDENCE_LABELS[e].label])}
          />
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
              <p className="text-white">No findings match these filters.</p>
              <p className="mt-1 text-sm text-slate-400">
                The knowledge base covers ignition, flame spread, materials, extinguishment and smoke detection. Try a
                broader term or clear a filter.
              </p>
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
  options: [string, string][]
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
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  )
}
