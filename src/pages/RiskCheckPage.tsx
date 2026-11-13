import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import EvidenceList from '../components/EvidenceList'
import FlammabilityMap, { shortMissionName } from '../components/FlammabilityMap'
import { Badge, SectionHeader, type Tone } from '../components/ui'
import { flammability } from '../lib/data'
import {
  LIMITS,
  MATERIAL_OPTIONS,
  RELEVANCE_LABELS,
  runRiskCheck,
  validateScenario,
  type Detection,
  type Gravity,
  type MaterialId,
  type Relevance,
  type ReviewItem,
  type Scenario,
  type Suppression,
} from '../lib/risk'

const PRESET_IDS = ['ISS', 'EXPLORATION_8.2_34', 'MARS_HAB', 'SHUTTLE_10.2']
const PRESETS = flammability.missions.filter((m) => PRESET_IDS.includes(m.id))

function presetScenario(id: string): Scenario {
  const m = PRESETS.find((p) => p.id === id)!
  const vent = m.ventilation_cm_s ?? { min: 5, max: 30 }
  return {
    name: shortMissionName(m),
    o2Percent: m.o2_percent,
    pressurePsia: m.pressure_psia,
    ventMin: vent.min,
    ventMax: vent.max,
    gravity: m.id === 'MARS_HAB' ? 'mars' : m.id === 'EXPLORATION_8.2_34' ? 'lunar' : 'micro',
    materials: ['cotton', 'nomex_ht', 'pmma'],
    suppression: 'water_mist',
    detection: 'single',
  }
}

const RELEVANCE_TONE: Record<Relevance, Tone> = { high: 'red', medium: 'amber', low: 'neutral' }
const COVERAGE_TONE = { within: 'green', edge: 'amber', outside: 'red' } as const
const COVERAGE_LABEL = {
  within: 'Within tested range',
  edge: 'At the edge of tested range',
  outside: 'Outside tested range',
} as const

export default function RiskCheckPage() {
  const [presetId, setPresetId] = useState('EXPLORATION_8.2_34')
  const [draft, setDraft] = useState<Scenario>(() => presetScenario('EXPLORATION_8.2_34'))
  const [submitted, setSubmitted] = useState<Scenario>(draft)
  const [showAll, setShowAll] = useState(false)

  const errors = validateScenario(draft)
  const errorFor = (field: keyof Scenario) => errors.find((e) => e.field === field)?.message
  const report = useMemo(() => runRiskCheck(submitted), [submitted])
  const visible = showAll ? report.items : report.items.slice(0, 5)
  const dirty = JSON.stringify(draft) !== JSON.stringify(submitted)

  function set<K extends keyof Scenario>(key: K, value: Scenario[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
    setPresetId('')
  }

  function choosePreset(id: string) {
    setPresetId(id)
    const s = presetScenario(id)
    setDraft(s)
    setSubmitted(s)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="no-print">
        <SectionHeader eyebrow="Rank" title="Mission Risk Check">
          Describe the cabin. EMBER compares it with the conditions NASA tested and lists the fire-safety issues to review
          first, each with its evidence. Ranking uses fixed, published rules, so the same input always gives the same
          brief. It is a research aid, not a certification or a probability of fire.
        </SectionHeader>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
        <form
          className="no-print panel h-fit space-y-5 p-5 lg:sticky lg:top-20"
          onSubmit={(e) => {
            e.preventDefault()
            if (errors.length === 0) {
              setSubmitted(draft)
              setShowAll(false)
            }
          }}
          noValidate
        >
          <fieldset>
            <legend className="label">Start from a mission atmosphere</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {PRESETS.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => choosePreset(m.id)}
                  aria-pressed={presetId === m.id}
                  className={`rounded-md border px-2.5 py-1.5 text-left text-xs ${
                    presetId === m.id ? 'border-cyan-400/70 bg-cyan-400/10 text-white' : 'border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {shortMissionName(m)}
                </button>
              ))}
            </div>
          </fieldset>

          <Field label="Scenario name" error={errorFor('name')}>
            <input
              value={draft.name}
              maxLength={80}
              onChange={(e) => set('name', e.target.value)}
              className="input"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Oxygen (%)" error={errorFor('o2Percent')}>
              <NumberInput value={draft.o2Percent} min={LIMITS.o2Percent[0]} max={LIMITS.o2Percent[1]} step={0.5} onChange={(v) => set('o2Percent', v)} />
            </Field>
            <Field label="Pressure (psia)" error={errorFor('pressurePsia')}>
              <NumberInput value={draft.pressurePsia} min={LIMITS.pressurePsia[0]} max={LIMITS.pressurePsia[1]} step={0.1} onChange={(v) => set('pressurePsia', v)} />
            </Field>
          </div>

          <Field label="Ventilation at surfaces (cm/s)" error={errorFor('ventMin')}>
            <div className="flex items-center gap-2">
              <NumberInput value={draft.ventMin} min={0} max={100} step={1} onChange={(v) => set('ventMin', v)} ariaLabel="Minimum ventilation" />
              <span className="text-slate-500">to</span>
              <NumberInput value={draft.ventMax} min={0} max={100} step={1} onChange={(v) => set('ventMax', v)} ariaLabel="Maximum ventilation" />
            </div>
          </Field>

          <Field label="Gravity">
            <select value={draft.gravity} onChange={(e) => set('gravity', e.target.value as Gravity)} className="input">
              <option value="micro">Microgravity (in orbit or transit)</option>
              <option value="lunar">Lunar surface (0.16 g)</option>
              <option value="mars">Mars surface (0.38 g)</option>
            </select>
          </Field>

          <fieldset>
            <legend className="label">Cabin materials</legend>
            <div className="mt-2 space-y-1.5">
              {MATERIAL_OPTIONS.map((m) => (
                <label key={m.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-cyan-400"
                    checked={draft.materials.includes(m.id)}
                    onChange={(e) =>
                      set(
                        'materials',
                        e.target.checked ? [...draft.materials, m.id] : draft.materials.filter((x: MaterialId) => x !== m.id),
                      )
                    }
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </fieldset>

          <Field label="Fire suppression">
            <select value={draft.suppression} onChange={(e) => set('suppression', e.target.value as Suppression)} className="input">
              <option value="water_mist">Water-mist extinguisher</option>
              <option value="co2">CO2 extinguisher</option>
              <option value="inert_jet">Directed inert-gas jet (N2)</option>
              <option value="unknown">Not decided</option>
            </select>
          </Field>

          <Field label="Smoke detection">
            <select value={draft.detection} onChange={(e) => set('detection', e.target.value as Detection)} className="input">
              <option value="single">Single-principle detector</option>
              <option value="multi">Multi-sensor detector</option>
              <option value="unknown">Not decided</option>
            </select>
          </Field>

          <button type="submit" className="btn-primary w-full" disabled={errors.length > 0}>
            {dirty ? 'Run risk check' : 'Up to date'}
          </button>
        </form>

        <section aria-live="polite">
          <BriefHeader report={report} />

          <div className="no-print mt-6 panel p-4">
            <FlammabilityMap
              missions={[]}
              scenario={{
                label: report.scenario.name || 'Your cabin',
                o2: report.scenario.o2Percent,
                flowMin: report.scenario.ventMin,
                flowMax: report.scenario.ventMax,
              }}
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-white">
              {showAll ? `All ${report.items.length} review items` : 'Top 5 issues to review'}
            </h2>
            <div className="no-print flex gap-2">
              <button className="btn-ghost" onClick={() => setShowAll((v) => !v)}>
                {showAll ? 'Show top 5' : `Show all ${report.items.length}`}
              </button>
              <button className="btn-primary" onClick={() => window.print()}>
                Export Fire Brief (PDF)
              </button>
            </div>
          </div>

          <ol className="mt-4 space-y-4">
            {visible.map((item, i) => (
              <ReviewCard key={item.id} item={item} rank={i + 1} />
            ))}
          </ol>

          <div className="mt-8 rounded-xl border border-slate-800 p-4 text-xs leading-relaxed text-slate-500">
            <p>
              <strong className="text-slate-300">How items are ranked.</strong> Each rule checks the scenario against a
              documented NASA result and assigns a tier: <em>Review first</em>, <em>Review</em> or <em>Note</em>. Items
              are ordered by tier, then gaps in the evidence first, then by the strength of the supporting evidence (measured result and team relevance
              rating), then by how many scenario factors matched. The rules are listed in{' '}
              <Link to="/methodology" className="text-cyan-300">
                Data &amp; methodology
              </Link>
              .
            </p>
            <p className="mt-2">
              EMBER is a research and decision-support aid built for NASA Space Apps 2026. It does not certify designs or
              replace a fire-safety engineer’s analysis.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

function BriefHeader({ report }: { report: ReturnType<typeof runRiskCheck> }) {
  const s = report.scenario
  const gravity = { micro: 'Microgravity', lunar: 'Lunar 0.16 g', mars: 'Mars 0.38 g' }[s.gravity]
  return (
    <div className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="label text-ember-300/90">Mission Fire Brief</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-white">{s.name || 'Custom scenario'}</h2>
        </div>
        <Badge tone={COVERAGE_TONE[report.coverage.level]}>{COVERAGE_LABEL[report.coverage.level]}</Badge>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Fact label="Oxygen" value={`${s.o2Percent}%`} />
        <Fact label="Pressure" value={`${s.pressurePsia} psia`} />
        <Fact label="O2 partial pressure" value={`${report.o2PartialKpa.toFixed(1)} kPa`} />
        <Fact label="Ventilation" value={`${s.ventMin}–${s.ventMax} cm/s`} />
        <Fact label="Gravity" value={gravity} />
        <Fact
          label="Materials"
          value={
            s.materials.length
              ? s.materials.map((id) => MATERIAL_OPTIONS.find((m) => m.id === id)!.label.split(' (')[0]).join(', ')
              : 'None selected'
          }
          className="sm:col-span-3"
        />
      </dl>
      <p className="mt-4 text-sm text-slate-300">{report.coverage.message}</p>
      <p className="mt-1 hidden text-xs print:block">Generated {new Date().toISOString().slice(0, 10)} · EMBER · Sources: NASA PSI, NTRS</p>
    </div>
  )
}

function ReviewCard({ item, rank }: { item: ReviewItem; rank: number }) {
  return (
    <li className="panel break-inside-avoid p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm text-slate-500">#{rank}</span>
        <Badge tone={RELEVANCE_TONE[item.relevance]}>{RELEVANCE_LABELS[item.relevance]}</Badge>
        {item.outsideEvidence && <Badge tone="red">Outside tested evidence</Badge>}
      </div>
      <h3 className="mt-2 font-display text-lg font-semibold text-white">{item.title}</h3>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Block label="Why it applies to this scenario">
          <ul className="space-y-1">
            {item.factors.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-cyan-400" aria-hidden>
                  ▸
                </span>
                {f}
              </li>
            ))}
          </ul>
        </Block>
        <Block label="Compared with NASA tests">{item.comparison}</Block>
      </div>

      <div className="mt-4 rounded-md border-l-2 border-ember-400/70 bg-ember-500/5 px-3 py-2 text-sm text-slate-200">
        <span className="label mb-1 block text-ember-300">Suggested question for the engineering team</span>
        {item.review}
      </div>

      {item.uncertainty && <p className="mt-3 text-xs text-amber-200/80">△ {item.uncertainty}</p>}

      <details className="mt-4 group" open={rank <= 2}>
        <summary className="cursor-pointer text-xs font-medium text-cyan-300 hover:text-cyan-200">
          Documented evidence ({item.evidence.length})
        </summary>
        <div className="mt-3">
          <EvidenceList refs={item.evidence} />
        </div>
      </details>
    </li>
  )
}

function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="text-sm text-slate-300">
      <p className="label mb-1.5">{label}</p>
      {children}
    </div>
  )
}

function Fact({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[11px] uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-mono text-white">{value}</dd>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="mt-1.5">{children}</div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}

function NumberInput({
  value,
  min,
  max,
  step,
  onChange,
  ariaLabel,
}: {
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  ariaLabel?: string
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      aria-label={ariaLabel}
      value={Number.isFinite(value) ? value : ''}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(e.target.value === '' ? Number.NaN : Number(e.target.value))}
      className="input font-mono"
    />
  )
}
