import { Link } from 'react-router-dom'
import { OUTCOME_LABELS, flammability, getFinding } from '../lib/data'
import type { EvidenceRef } from '../lib/risk'
import type { PointSource, SourceRef } from '../lib/types'

interface ResolvedEvidence {
  id: string
  label: string
  text: string
  source: SourceRef | PointSource
  href?: string
  qualifier?: string
}

export function resolveEvidence(ref: EvidenceRef): ResolvedEvidence | null {
  if (ref.kind === 'finding') {
    const f = getFinding(ref.id)
    if (!f) return null
    return {
      id: f.id,
      label: f.experiment,
      text: f.finding,
      source: f.source,
      href: `/explorer?finding=${f.id}`,
      qualifier: f.evidence_type === 'result' ? undefined : f.evidence_type,
    }
  }
  if (ref.kind === 'limit') {
    const l = flammability.limits.find((x) => x.id === ref.id)
    if (!l) return null
    return {
      id: l.id,
      label: l.type === 'model_curve' ? 'Model' : (l.condition ?? 'Reference limit'),
      text: l.description,
      source: l.source,
      qualifier: l.type === 'model_curve' ? 'model' : undefined,
    }
  }
  const p = flammability.points.find((x) => x.id === ref.id)
  if (!p) return null
  return {
    id: p.id,
    label: `${p.experiment} test`,
    text: `${p.material}: ${OUTCOME_LABELS[p.outcome].toLowerCase()} at ${p.o2_percent}% O2, ${p.flow_velocity_cm_s} cm/s. ${p.outcome_detail}`,
    source: p.source,
    qualifier: p.data_quality === 'read_from_figure' ? 'read from figure' : undefined,
  }
}

export default function EvidenceList({ refs }: { refs: EvidenceRef[] }) {
  const items = refs.map(resolveEvidence).filter((e): e is ResolvedEvidence => e !== null)
  return (
    <ul className="space-y-2">
      {items.map((e) => (
        <li key={e.id} className="evidence-item rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {e.href ? (
              <Link to={e.href} className="font-mono text-cyan-300 hover:text-cyan-200">
                {e.id}
              </Link>
            ) : (
              <span className="font-mono text-slate-400">{e.id}</span>
            )}
            <span className="text-slate-400">{e.label}</span>
            {e.qualifier && <span className="rounded bg-amber-400/10 px-1.5 text-[10px] text-amber-200">{e.qualifier}</span>}
          </div>
          <p className="mt-1 text-slate-300">{e.text}</p>
          <a href={e.source.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-[11px] text-slate-500 hover:text-cyan-300">
            {e.source.title} ↗
          </a>
        </li>
      ))}
    </ul>
  )
}
