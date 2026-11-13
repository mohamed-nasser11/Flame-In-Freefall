import { assessCoverage } from '../lib/coverage'
import { MISSION_STATUS_LABELS } from '../lib/data'
import type { MissionAtmosphere } from '../lib/types'
import { Badge, SourceLink, type Tone } from './ui'

const LEVEL: Record<string, { label: string; tone: Tone }> = {
  within: { label: 'Within tested range', tone: 'green' },
  edge: { label: 'At the edge of tested range', tone: 'amber' },
  outside: { label: 'Outside tested range', tone: 'red' },
}

const STATUS_TONE: Record<string, Tone> = {
  operational: 'green',
  under_study: 'amber',
  assumption: 'red',
}

export default function MissionCoverage({ mission }: { mission: MissionAtmosphere }) {
  const coverage = assessCoverage(mission.o2_percent, mission.pressure_kpa)
  const level = LEVEL[coverage.level]
  return (
    <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
      <div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={STATUS_TONE[mission.status] ?? 'neutral'}>{MISSION_STATUS_LABELS[mission.status]}</Badge>
          <Badge tone={level.tone}>{level.label}</Badge>
        </div>
        <h3 className="mt-3 font-display text-base font-semibold text-white">{mission.name}</h3>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Metric label="O2" value={`${mission.o2_percent}%`} />
          <Metric label="Pressure" value={`${mission.pressure_psia} psia`} />
          <Metric label="O2 partial" value={`${mission.o2_partial_pressure_kpa} kPa`} />
        </dl>
      </div>

      <p className="text-sm leading-relaxed text-slate-300">{coverage.message}</p>

      {mission.uncertain && mission.uncertain.length > 0 && (
        <ul className="space-y-1.5 text-xs text-amber-200/80">
          {mission.uncertain.map((u) => (
            <li key={u} className="flex gap-2">
              <span aria-hidden>△</span>
              <span>{u}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <p className="label">Atmosphere source</p>
        <SourceLink source={mission.sources[0]} />
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-900 px-2 py-2">
      <dt className="text-[10px] uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm text-white">{value}</dd>
    </div>
  )
}
