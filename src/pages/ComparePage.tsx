import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge, Panel, SectionHeader, SourceLink } from '../components/ui'
import { MATERIALS, OUTCOME_LABELS, flammability } from '../lib/data'
import type { BurnOutcome, FlammabilityPoint } from '../lib/types'

const DEFAULT = ['Nomex HT90-40 fabric, 12 mil', 'Nomex-III fabric', 'Cotton-fiberglass (SIBAL) fabric']
const MAX_SELECTED = 3

interface Summary {
  material: string
  points: FlammabilityPoint[]
  experiments: string[]
  fuelClasses: string[]
  directions: string[]
  o2: [number, number]
  flow: [number, number]
  outcomes: Partial<Record<BurnOutcome, number>>
  spread: number[]
  caveats: number
}

function summarize(material: string): Summary {
  const points = flammability.points.filter((p) => p.material === material)
  const uniq = (xs: string[]) => [...new Set(xs)]
  const range = (xs: number[]): [number, number] => [Math.min(...xs), Math.max(...xs)]
  const outcomes: Summary['outcomes'] = {}
  for (const p of points) outcomes[p.outcome] = (outcomes[p.outcome] ?? 0) + 1
  return {
    material,
    points,
    experiments: uniq(points.map((p) => p.experiment)),
    fuelClasses: uniq(points.map((p) => p.fuel_class)),
    directions: uniq(points.map((p) => p.flow_direction)),
    o2: range(points.map((p) => p.o2_percent)),
    flow: range(points.map((p) => p.flow_velocity_cm_s)),
    outcomes,
    spread: points.map((p) => p.flame_spread_mm_s).filter((v): v is number => v != null),
    caveats: points.filter((p) => p.uncertain.length > 0 || p.data_quality !== 'reported').length,
  }
}

const fmtRange = ([a, b]: [number, number], unit: string) => (a === b ? `${a} ${unit}` : `${a}–${b} ${unit}`)

export default function ComparePage() {
  const [params, setParams] = useSearchParams()
  const selected = useMemo(() => {
    const fromUrl = params.getAll('m').filter((m) => MATERIALS.includes(m))
    return fromUrl.length ? fromUrl.slice(0, MAX_SELECTED) : DEFAULT
  }, [params])
  const summaries = selected.map(summarize)

  function toggle(material: string) {
    const next = selected.includes(material)
      ? selected.filter((m) => m !== material)
      : [...selected, material].slice(-MAX_SELECTED)
    const p = new URLSearchParams()
    next.forEach((m) => p.append('m', m))
    setParams(p, { replace: true })
  }

  const warnings: string[] = []
  if (new Set(summaries.flatMap((s) => s.fuelClasses)).size > 1) {
    warnings.push(
      'These materials were tested as different fuel types (thin fabric or film vs thick rod or slab). Flame spread over thick and thin fuels follows different physics.',
    )
  }
  if (new Set(summaries.flatMap((s) => s.directions)).size > 1) {
    warnings.push(
      'Flow direction differs between tests. Concurrent spread was about twice as fast as opposed spread at the same speed in BASS (F15), so spread rates are not directly comparable.',
    )
  }
  if (new Set(summaries.flatMap((s) => s.experiments)).size > 1) {
    warnings.push('Results come from different experiments with different sample sizes and hardware.')
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <SectionHeader eyebrow="Explore" title="Compare materials">
        Put up to three tested materials side by side using the flight data on the flammability map. ZeroG Flame flags
        when the test conditions differ enough that the numbers should not be compared directly.
      </SectionHeader>

      <Panel className="mt-8 p-5">
        <p className="label">
          Materials ({selected.length}/{MAX_SELECTED})
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {MATERIALS.map((m) => (
            <button
              key={m}
              onClick={() => toggle(m)}
              aria-pressed={selected.includes(m)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                selected.includes(m)
                  ? 'border-cyan-400/70 bg-cyan-400/10 text-white'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </Panel>

      {warnings.length > 0 && (
        <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
          <p className="label text-amber-200">Comparison limits</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-100/80">
            {warnings.map((w) => (
              <li key={w}>△ {w}</li>
            ))}
          </ul>
        </div>
      )}

      {summaries.length === 0 ? (
        <p className="mt-10 text-center text-slate-400">Select at least one material.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="w-44 p-3 text-left label">Measure</th>
                {summaries.map((s) => (
                  <th key={s.material} className="p-3 text-left font-display text-base font-semibold text-white">
                    {s.material}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="[&_td]:border-t [&_td]:border-slate-800 [&_td]:p-3 [&_td]:align-top [&_th]:border-t [&_th]:border-slate-800">
              <Row label="Experiments" values={summaries.map((s) => s.experiments.join(', '))} />
              <Row label="Flight tests" values={summaries.map((s) => String(s.points.length))} mono />
              <Row label="Oxygen tested" values={summaries.map((s) => fmtRange(s.o2, '% O2'))} mono />
              <Row label="Flow tested" values={summaries.map((s) => fmtRange(s.flow, 'cm/s'))} mono />
              <Row label="Flow direction" values={summaries.map((s) => s.directions.join(', '))} />
              <tr>
                <th className="p-3 text-left text-xs font-medium text-slate-400">Observed outcomes</th>
                {summaries.map((s) => (
                  <td key={s.material}>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(s.outcomes).map(([o, n]) => (
                        <Badge key={o} tone={o === 'burned' ? 'ember' : o === 'near_limit' ? 'amber' : 'cyan'}>
                          {OUTCOME_LABELS[o as BurnOutcome]} × {n}
                        </Badge>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
              <Row
                label="Flame spread rate"
                values={summaries.map((s) =>
                  s.spread.length ? fmtRange([Math.min(...s.spread), Math.max(...s.spread)], 'mm/s') : 'Not reported',
                )}
                mono
              />
              <Row
                label="Points with caveats"
                values={summaries.map((s) => `${s.caveats} of ${s.points.length}`)}
                mono
              />
              <tr>
                <th className="p-3 text-left text-xs font-medium text-slate-400">Sources</th>
                {summaries.map((s) => (
                  <td key={s.material} className="space-y-2">
                    {[...new Map(s.points.map((p) => [p.source.url, p.source])).values()].map((src) => (
                      <SourceLink key={src.url} source={src} compact />
                    ))}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Row({ label, values, mono = false }: { label: string; values: string[]; mono?: boolean }) {
  return (
    <tr>
      <th className="p-3 text-left text-xs font-medium text-slate-400">{label}</th>
      {values.map((v, i) => (
        <td key={i} className={`text-slate-200 ${mono ? 'font-mono text-[13px]' : ''}`}>
          {v}
        </td>
      ))}
    </tr>
  )
}
