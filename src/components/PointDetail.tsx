import { OUTCOME_LABELS } from '../lib/data'
import type { FlammabilityPoint } from '../lib/types'
import { OUTCOME_COLORS } from './mapStyles'
import { Badge, SourceLink } from './ui'

export default function PointDetail({ point, onClose }: { point: FlammabilityPoint; onClose: () => void }) {
  return (
    <div className="space-y-4 rounded-xl border border-cyan-500/30 bg-slate-950/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] text-slate-500">
            {point.id} · {point.psi_id}
          </p>
          <h3 className="mt-1 font-display text-base font-semibold text-white">{point.material}</h3>
          <p className="text-xs text-slate-400">
            {point.experiment} · {point.geometry}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          Close
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm text-white">
          <span
            className="h-2.5 w-2.5 rounded-full border"
            style={{
              background: OUTCOME_COLORS[point.outcome].fill,
              borderColor: OUTCOME_COLORS[point.outcome].stroke,
            }}
          />
          {OUTCOME_LABELS[point.outcome]}
        </span>
        <Badge tone={point.data_quality === 'reported' ? 'green' : 'amber'}>
          {point.data_quality === 'reported' ? 'Value reported in source' : 'Read from a figure'}
        </Badge>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-slate-500">Oxygen</dt>
        <dd className="font-mono text-slate-200">{point.o2_percent}%</dd>
        <dt className="text-slate-500">Flow</dt>
        <dd className="font-mono text-slate-200">{point.flow_velocity_cm_s} cm/s</dd>
        <dt className="text-slate-500">Direction</dt>
        <dd className="text-slate-200">{point.flow_direction}</dd>
        <dt className="text-slate-500">Pressure</dt>
        <dd className="font-mono text-slate-200">{point.pressure_kpa} kPa</dd>
        {point.flame_spread_mm_s != null && (
          <>
            <dt className="text-slate-500">Spread rate</dt>
            <dd className="font-mono text-slate-200">{point.flame_spread_mm_s} mm/s</dd>
          </>
        )}
      </dl>

      <p className="text-sm text-slate-300">{point.outcome_detail}</p>

      {point.uncertain.length > 0 && (
        <div>
          <p className="label mb-1.5">Caveats</p>
          <ul className="space-y-1 text-xs text-amber-200/80">
            {point.uncertain.map((u) => (
              <li key={u} className="flex gap-2">
                <span aria-hidden>△</span>
                {u}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="label mb-1.5">Source</p>
        <SourceLink source={point.source} />
      </div>
    </div>
  )
}
