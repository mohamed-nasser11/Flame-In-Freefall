import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import FlammabilityMap, { MapLegend } from '../components/FlammabilityMap'
import MissionCoverage from '../components/MissionCoverage'
import PointDetail from '../components/PointDetail'
import { Badge, Panel } from '../components/ui'
import { HAZARD_LABELS, datasetStats, findings, flammability } from '../lib/data'
import type { FlammabilityPoint } from '../lib/types'

const MAP_MISSIONS = ['ISS', 'EXPLORATION_8.2_34', 'MARS_HAB', 'SHUTTLE_10.2']

export default function HomePage() {
  const stats = useMemo(() => datasetStats(), [])
  const missions = flammability.missions.filter((m) => MAP_MISSIONS.includes(m.id))
  const [missionId, setMissionId] = useState('EXPLORATION_8.2_34')
  const [showDroplets, setShowDroplets] = useState(false)
  const [point, setPoint] = useState<FlammabilityPoint | null>(null)
  const mission = missions.find((m) => m.id === missionId)!

  const topFindings = findings.filter((f) => f.evidence_type === 'result' && f.safety_score === 5).slice(0, 4)

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
      <section className="pt-12 pb-10 sm:pt-16">
        <p className="label text-cyan-300/80">NASA Space Apps 2026 · Flame in Freefall</p>
        <h1 className="mt-3 max-w-4xl font-display text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl">
          Fire behaves differently in space.
          <span className="text-ember-400">
            {' '}
            ZeroG&nbsp;Flame turns NASA’s flight evidence into fire-safety decisions.
          </span>
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
          Check a mission’s fire risks, explore what NASA measured, and see what is still untested. Every claim links to
          its NASA source.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/risk-check" className="btn-primary">
            Run a mission risk check
          </Link>
          <Link to="/explorer" className="btn-ghost">
            Explore the evidence
          </Link>
          <Link to="/ask" className="btn-ghost">
            Ask a research question
          </Link>
        </div>
      </section>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-800 bg-slate-800 sm:grid-cols-3 lg:grid-cols-6">
        <Stat value={stats.findings} label="curated findings" detail={`${stats.measuredResults} measured results`} />
        <Stat value={stats.investigations} label="NASA PSI investigations" />
        <Stat value={stats.testPoints} label="flight test conditions" detail="on the flammability map" />
        <Stat value={stats.solidMaterials} label="solid materials tested" />
        <Stat value={stats.hazardTypes} label="hazard categories" />
        <Stat value={stats.sources} label="NASA source documents" />
      </dl>

      <Panel className="mt-10 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label text-ember-300/90">Interpret · Flammability Map</p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-white">
              Where does your cabin sit against NASA’s fire tests?
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Each marker is one microgravity test from Saffire, BASS, BASS-II or FLEX. Lines show cabin oxygen across
              the ventilation range. Hover a marker for its result, click it for the source.
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              className="h-4 w-4 accent-cyan-400"
              checked={showDroplets}
              onChange={(e) => setShowDroplets(e.target.checked)}
            />
            Show FLEX droplet tests
          </label>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] [&>*]:min-w-0">
          <div>
            <FlammabilityMap
              missions={missions}
              activeMissionId={missionId}
              showDroplets={showDroplets}
              selectedPointId={point?.id}
              onSelectPoint={setPoint}
            />
            {showDroplets && (
              <p className="mt-3 rounded-md border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-xs text-amber-200/90">
                Droplet tests burned liquid fuel with no airflow, some at reduced pressure. They are not directly
                comparable with the solid-material tests, so read them as a separate series.
              </p>
            )}
            <div className="mt-4">
              <MapLegend />
            </div>
          </div>

          <div className="space-y-4">
            <div role="radiogroup" aria-label="Mission atmosphere" className="grid grid-cols-2 gap-2">
              {missions.map((m) => (
                <button
                  key={m.id}
                  role="radio"
                  aria-checked={m.id === missionId}
                  onClick={() => setMissionId(m.id)}
                  className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                    m.id === missionId
                      ? 'border-cyan-400/70 bg-cyan-400/10 text-white'
                      : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  }`}
                >
                  <span className="block font-medium">{m.name.split('(')[0].trim()}</span>
                  <span className="mt-0.5 block font-mono text-[11px] opacity-80">
                    {m.o2_percent}% O2 · {m.pressure_psia} psia
                  </span>
                </button>
              ))}
            </div>
            {point ? (
              <PointDetail point={point} onClose={() => setPoint(null)} />
            ) : (
              <MissionCoverage mission={mission} />
            )}
          </div>
        </div>
      </Panel>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        <Pillar
          step="Summarize"
          title="Research Explorer"
          to="/explorer"
          text="Search and filter curated findings from nine NASA investigations. Each card separates the measured result from its safety meaning."
        />
        <Pillar
          step="Rank"
          title="Mission Risk Check"
          to="/risk-check"
          text="Enter cabin oxygen, pressure, airflow and materials. Get the issues to review first, ranked by transparent rules, as a printable brief."
        />
        <Pillar
          step="Interpret"
          title="Ask ZeroG Flame"
          to="/ask"
          text="Ask a question in plain language. Answers come only from the knowledge base, with a clickable citation for every claim."
        />
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Panel className="p-6">
          <h2 className="font-display text-lg font-semibold text-white">Findings by hazard</h2>
          <ul className="mt-5 space-y-3">
            {stats.hazardCounts.map(({ hazard, count }) => (
              <li key={hazard}>
                <Link to={`/explorer?hazard=${hazard}`} className="group block">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300 group-hover:text-white">{HAZARD_LABELS[hazard]}</span>
                    <span className="font-mono text-slate-400">{count}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-ember-600 to-ember-400"
                      style={{ width: `${(count / stats.hazardCounts[0].count) * 100}%` }}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-lg font-semibold text-white">Highest-relevance measured results</h2>
            <Link to="/explorer?sort=relevance" className="text-xs text-cyan-300 hover:text-cyan-200">
              View all →
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-slate-800">
            {topFindings.map((f) => (
              <li key={f.id} className="py-3">
                <Link to={`/explorer?finding=${f.id}`} className="group block">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] text-slate-500">{f.id}</span>
                    <Badge tone="ember">{HAZARD_LABELS[f.hazard_type]}</Badge>
                    <span className="text-xs text-slate-500">{f.experiment}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-300 group-hover:text-white">{f.safety_implication}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </section>
    </div>
  )
}

function Stat({ value, label, detail }: { value: number; label: string; detail?: string }) {
  return (
    <div className="bg-slate-950/80 px-5 py-4">
      <dt className="sr-only">{label}</dt>
      <dd className="font-display text-3xl font-semibold text-white">{value}</dd>
      <dd className="mt-0.5 text-xs text-slate-400">{label}</dd>
      {detail && <dd className="text-[11px] text-slate-500">{detail}</dd>}
    </div>
  )
}

function Pillar({ step, title, text, to }: { step: string; title: string; text: string; to: string }) {
  return (
    <Link to={to} className="panel group block p-6 transition-colors hover:border-slate-600">
      <p className="label text-ember-300/90">{step}</p>
      <h3 className="mt-1 font-display text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{text}</p>
      <span className="mt-4 inline-block text-sm text-cyan-300 group-hover:text-cyan-200">Open →</span>
    </Link>
  )
}
