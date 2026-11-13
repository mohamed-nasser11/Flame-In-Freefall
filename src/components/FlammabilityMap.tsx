import { scaleLinear, scaleLog } from 'd3-scale'
import { useMemo, useState } from 'react'
import { OUTCOME_LABELS, flammability } from '../lib/data'
import type { BurnOutcome, FlammabilityPoint, FuelClass, MissionAtmosphere } from '../lib/types'
import { OUTCOME_COLORS, shortMissionName } from './mapStyles'

export interface ScenarioMarker {
  label: string
  o2: number
  flowMin: number
  flowMax: number
}

interface Props {
  missions: MissionAtmosphere[]
  activeMissionId?: string
  showDroplets?: boolean
  scenario?: ScenarioMarker
  selectedPointId?: string
  onSelectPoint?: (point: FlammabilityPoint) => void
}

const W = 860
const H = 520
const M = { top: 28, right: 160, bottom: 58, left: 60 }
const ZERO_X = M.left + 22
const LOG_LEFT = M.left + 56
const FLOW_DOMAIN: [number, number] = [0.5, 60]
const O2_DOMAIN: [number, number] = [10, 40]
const FLOW_TICKS = [0.5, 1, 2, 5, 10, 20, 50]
const O2_TICKS = [10, 15, 20, 25, 30, 35, 40]
/** Spacecraft ventilation range used when a mission has no value of its own. */
const DEFAULT_VENT = { min: 5, max: 30 }

const FUEL_LABELS: Record<FuelClass, string> = {
  thin_solid: 'Thin solid (fabric, film)',
  thick_solid: 'Thick solid (PMMA rod, slab, sphere)',
  liquid_droplet: 'Liquid droplet (FLEX, no flow)',
}

/**
 * Shape of the thin-fuel model boundary. Only the 7 cm/s and 20 cm/s values are labelled in
 * the source figure; the quenching and blowoff arms are drawn to show the U-shape only.
 */
const MODEL_CURVE = [
  { f: 0.7, o2: 26 },
  { f: 1, o2: 21.5 },
  { f: 2, o2: 16 },
  { f: 4, o2: 13.2 },
  { f: 7, o2: 12.5 },
  { f: 12, o2: 13.3 },
  { f: 20, o2: 14.5 },
  { f: 35, o2: 17.5 },
  { f: 60, o2: 22 },
]

export default function FlammabilityMap({
  missions,
  activeMissionId,
  showDroplets = false,
  scenario,
  selectedPointId,
  onSelectPoint,
}: Props) {
  const [hovered, setHovered] = useState<FlammabilityPoint | null>(null)

  const xLog = useMemo(
    () =>
      scaleLog()
        .domain(FLOW_DOMAIN)
        .range([LOG_LEFT, W - M.right])
        .clamp(true),
    [],
  )
  const y = useMemo(
    () =>
      scaleLinear()
        .domain(O2_DOMAIN)
        .range([H - M.bottom, M.top])
        .clamp(true),
    [],
  )
  const x = (flow: number) => (flow <= 0 ? ZERO_X : xLog(flow))

  const points = flammability.points.filter((p) => showDroplets || p.fuel_class !== 'liquid_droplet')

  const curve = MODEL_CURVE.map((p, i) => `${i ? 'L' : 'M'}${xLog(p.f)},${y(p.o2)}`).join(' ')
  const flammableArea = `${curve} L${xLog(60)},${M.top} L${xLog(0.7)},${M.top} Z`

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <div className="relative min-w-[620px]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full select-none"
          role="img"
          aria-label="Flammability map: oxygen concentration against air flow speed, with NASA microgravity test results and mission cabin atmospheres"
        >
          <defs>
            <linearGradient id="fm-flammable" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.03" />
            </linearGradient>
          </defs>

          {/* Grid */}
          {O2_TICKS.map((t) => (
            <g key={`y${t}`}>
              <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke="#1e293b" />
              <text
                x={M.left - 10}
                y={y(t)}
                dy="0.32em"
                textAnchor="end"
                className="fill-slate-400 font-mono text-[11px]"
              >
                {t}%
              </text>
            </g>
          ))}
          {FLOW_TICKS.map((t) => (
            <g key={`x${t}`}>
              <line x1={xLog(t)} x2={xLog(t)} y1={M.top} y2={H - M.bottom} stroke="#1e293b" />
              <text
                x={xLog(t)}
                y={H - M.bottom + 18}
                textAnchor="middle"
                className="fill-slate-400 font-mono text-[11px]"
              >
                {t}
              </text>
            </g>
          ))}
          <line x1={ZERO_X} x2={ZERO_X} y1={M.top} y2={H - M.bottom} stroke="#1e293b" strokeDasharray="2 3" />
          <text x={ZERO_X} y={H - M.bottom + 18} textAnchor="middle" className="fill-slate-400 font-mono text-[11px]">
            0
          </text>
          <line
            x1={(ZERO_X + LOG_LEFT) / 2}
            x2={(ZERO_X + LOG_LEFT) / 2}
            y1={H - M.bottom - 4}
            y2={H - M.bottom + 4}
            stroke="#475569"
          />

          {/* Model boundary */}
          <path d={flammableArea} fill="url(#fm-flammable)" />
          <path d={curve} fill="none" stroke="#fb923c" strokeOpacity={0.8} strokeWidth={1.75} strokeDasharray="6 5" />
          <text x={xLog(9)} y={y(11.1)} textAnchor="middle" className="fill-ember-300/80 text-[11px]">
            thin-fuel limit (model, schematic)
          </text>
          <text x={xLog(1.3)} y={y(37.5)} className="fill-ember-300/70 text-[12px] font-medium tracking-wide">
            FLAMMABLE SIDE
          </text>

          {/* Axis titles */}
          <text x={(M.left + W - M.right) / 2} y={H - 14} textAnchor="middle" className="fill-slate-300 text-[12px]">
            Air flow speed past the material, cm/s (log scale; 0 = no forced flow)
          </text>
          <text
            transform={`translate(16 ${(M.top + H - M.bottom) / 2}) rotate(-90)`}
            textAnchor="middle"
            className="fill-slate-300 text-[12px]"
          >
            Oxygen concentration (% by volume)
          </text>

          {/* Mission atmospheres */}
          {groupByAtmosphere(missions).map((group) => {
            const m = group[0]
            const vent = m.ventilation_cm_s ?? DEFAULT_VENT
            const active = group.some((g) => g.id === activeMissionId)
            const offChart = m.o2_percent > O2_DOMAIN[1]
            const yy = offChart ? M.top - 6 : y(m.o2_percent)
            const x1 = xLog(vent.min)
            const x2 = xLog(vent.max)
            return (
              <g
                key={group.map((g) => g.id).join('+')}
                opacity={active || !activeMissionId ? 1 : 0.4}
                pointerEvents="none"
              >
                <line
                  x1={x1}
                  x2={x2}
                  y1={yy}
                  y2={yy}
                  stroke={active ? '#e2e8f0' : '#94a3b8'}
                  strokeWidth={active ? 4 : 2.5}
                  strokeLinecap="round"
                  strokeDasharray={m.ventilation_cm_s ? undefined : '1 6'}
                />
                <circle cx={x2} cy={yy} r={active ? 4.5 : 3} fill="#e2e8f0" />
                <text
                  x={W - M.right + 8}
                  y={yy - (group.length - 1) * 7}
                  dy="0.32em"
                  className={`text-[11px] ${active ? 'fill-white font-semibold' : 'fill-slate-400'}`}
                >
                  {group.map((g, gi) => (
                    <tspan key={g.id} x={W - M.right + 8} dy={gi === 0 ? '0.32em' : '1.2em'}>
                      {shortMissionName(g)}
                      {offChart && gi === 0 ? ` (${m.o2_percent}% ↑)` : ''}
                    </tspan>
                  ))}
                </text>
                <line x1={x2 + 6} x2={W - M.right + 4} y1={yy} y2={yy} stroke="#334155" strokeDasharray="2 3" />
              </g>
            )
          })}

          {scenario && (
            <g pointerEvents="none">
              <rect
                x={xLog(Math.max(scenario.flowMin, FLOW_DOMAIN[0]))}
                y={y(scenario.o2) - 7}
                width={Math.max(
                  xLog(Math.max(scenario.flowMax, 0.6)) - xLog(Math.max(scenario.flowMin, FLOW_DOMAIN[0])),
                  4,
                )}
                height={14}
                rx={7}
                fill="#22d3ee"
                fillOpacity={0.18}
                stroke="#22d3ee"
                strokeWidth={1.5}
              />
              <text
                x={xLog(Math.max(scenario.flowMin, FLOW_DOMAIN[0]))}
                y={y(scenario.o2) - 12}
                className="fill-cyan-300 text-[11px] font-semibold"
              >
                {scenario.label}
              </text>
            </g>
          )}

          {/* NASA test points */}
          {points.map((p) => {
            const c = OUTCOME_COLORS[p.outcome]
            const cx = x(p.flow_velocity_cm_s)
            const cy = y(p.o2_percent)
            const selected = p.id === selectedPointId
            const dash = p.data_quality === 'read_from_figure' || p.uncertain.length > 0 ? '2.5 2' : undefined
            return (
              <g
                key={p.id}
                tabIndex={0}
                role="button"
                aria-label={`${p.experiment}, ${p.material}: ${OUTCOME_LABELS[p.outcome]} at ${p.o2_percent}% oxygen and ${p.flow_velocity_cm_s} cm/s`}
                className="cursor-pointer outline-none"
                onMouseEnter={() => setHovered(p)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(p)}
                onBlur={() => setHovered(null)}
                onClick={() => onSelectPoint?.(p)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelectPoint?.(p)
                  }
                }}
              >
                {selected && <circle cx={cx} cy={cy} r={13} fill="none" stroke="#22d3ee" strokeWidth={2} />}
                <Marker fuel={p.fuel_class} cx={cx} cy={cy} fill={c.fill} stroke={c.stroke} dash={dash} />
                <circle cx={cx} cy={cy} r={12} fill="transparent" />
              </g>
            )
          })}
        </svg>

        {hovered && (
          <PointTooltip
            point={hovered}
            left={(x(hovered.flow_velocity_cm_s) / W) * 100}
            top={(y(hovered.o2_percent) / H) * 100}
          />
        )}
      </div>
    </div>
  )
}

/** Missions that share an atmosphere are drawn as one line with a combined label. */
function groupByAtmosphere(missions: MissionAtmosphere[]) {
  const groups = new Map<string, MissionAtmosphere[]>()
  for (const m of missions) {
    const key = `${m.o2_percent}|${m.pressure_psia}`
    groups.set(key, [...(groups.get(key) ?? []), m])
  }
  return [...groups.values()]
}

function Marker({
  fuel,
  cx,
  cy,
  fill,
  stroke,
  dash,
  size = 6,
}: {
  fuel: FuelClass
  cx: number
  cy: number
  fill: string
  stroke: string
  dash?: string
  size?: number
}) {
  const common = { fill, stroke, strokeWidth: 1.8, strokeDasharray: dash }
  if (fuel === 'thick_solid') {
    return <rect x={cx - size} y={cy - size} width={size * 2} height={size * 2} rx={1.5} {...common} />
  }
  if (fuel === 'liquid_droplet') {
    const s = size + 1
    return <path d={`M${cx},${cy - s} L${cx + s},${cy + s * 0.8} L${cx - s},${cy + s * 0.8} Z`} {...common} />
  }
  return <circle cx={cx} cy={cy} r={size} {...common} />
}

function PointTooltip({ point, left, top }: { point: FlammabilityPoint; left: number; top: number }) {
  const flipX = left > 55
  const flipY = top > 70
  return (
    <div
      className="pointer-events-none absolute z-10 w-72 rounded-lg border border-slate-700 bg-slate-950/95 p-3 text-xs shadow-2xl"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        transform: `translate(${flipX ? 'calc(-100% - 16px)' : '16px'}, ${flipY ? '-90%' : '-30%'})`,
      }}
    >
      <p className="font-medium text-white">{point.material}</p>
      <p className="mt-0.5 text-slate-400">
        {point.experiment} · {point.geometry}
      </p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-slate-300">
        <dt className="text-slate-500">Outcome</dt>
        <dd>{OUTCOME_LABELS[point.outcome]}</dd>
        <dt className="text-slate-500">Oxygen</dt>
        <dd className="font-mono">{point.o2_percent}%</dd>
        <dt className="text-slate-500">Flow</dt>
        <dd>
          <span className="font-mono">{point.flow_velocity_cm_s} cm/s</span> · {point.flow_direction}
        </dd>
        <dt className="text-slate-500">Pressure</dt>
        <dd className="font-mono">{point.pressure_kpa} kPa</dd>
        {point.flame_spread_mm_s != null && (
          <>
            <dt className="text-slate-500">Spread</dt>
            <dd className="font-mono">{point.flame_spread_mm_s} mm/s</dd>
          </>
        )}
      </dl>
      <p className="mt-2 text-slate-400">{point.outcome_detail}</p>
      <p className="mt-2 text-[11px] text-cyan-300/80">Click for source and caveats</p>
    </div>
  )
}

export function MapLegend() {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs text-slate-300">
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
        {(Object.keys(OUTCOME_COLORS) as BurnOutcome[]).map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <circle
                cx="7"
                cy="7"
                r="5"
                fill={OUTCOME_COLORS[k].fill}
                stroke={OUTCOME_COLORS[k].stroke}
                strokeWidth="1.8"
              />
            </svg>
            {OUTCOME_LABELS[k]}
          </li>
        ))}
      </ul>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-slate-400">
        {(Object.keys(FUEL_LABELS) as FuelClass[]).map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <Marker fuel={k} cx={7} cy={7} size={4.5} fill="none" stroke="#cbd5e1" />
            </svg>
            {FUEL_LABELS[k]}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            <circle cx="7" cy="7" r="5" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="2.5 2" />
          </svg>
          Value has a caveat
        </li>
        <li className="flex items-center gap-1.5">
          <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden>
            <line x1="1" y1="7" x2="21" y2="7" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />
          </svg>
          Cabin O2 across its ventilation range
        </li>
      </ul>
    </div>
  )
}
