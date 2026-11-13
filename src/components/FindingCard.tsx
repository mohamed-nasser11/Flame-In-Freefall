import { EVIDENCE_LABELS, HAZARD_LABELS } from '../lib/data'
import type { Finding } from '../lib/types'
import { Badge } from './ui'

export default function FindingCard({
  finding: f,
  matched,
  onOpen,
}: {
  finding: Finding
  matched?: string[]
  onOpen: () => void
}) {
  return (
    <article className="panel flex h-full flex-col p-5 transition-colors hover:border-slate-600">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] text-slate-500">{f.id}</span>
        <Badge tone="ember">{HAZARD_LABELS[f.hazard_type]}</Badge>
        <Badge tone={f.evidence_type === 'result' ? 'neutral' : 'amber'} title={EVIDENCE_LABELS[f.evidence_type].hint}>
          {EVIDENCE_LABELS[f.evidence_type].label}
        </Badge>
        <ScoreDots score={f.safety_score} />
      </div>
      <p className="mt-2 text-xs font-medium text-cyan-200/80">{f.experiment}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-200">{f.finding}</p>
      <p className="mt-3 text-xs text-slate-500">
        <span className="text-slate-400">Conditions:</span> {f.conditions}
      </p>
      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <p className="line-clamp-1 text-[11px] text-slate-500" title={f.source.title}>
          {f.source.title}
        </p>
        <button onClick={onOpen} className="shrink-0 text-xs font-medium text-cyan-300 hover:text-cyan-200">
          Details →
        </button>
      </div>
      {matched && matched.length > 0 && (
        <p className="mt-2 text-[11px] text-slate-600">matched: {matched.join(', ')}</p>
      )}
    </article>
  )
}

export function ScoreDots({ score }: { score: number }) {
  return (
    <span
      className="ml-auto inline-flex items-center gap-0.5"
      title={`Team safety-relevance rating ${score} of 5 (editorial judgement, not a risk probability)`}
      aria-label={`Safety relevance ${score} of 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`h-1.5 w-3 rounded-sm ${i <= score ? 'bg-ember-400' : 'bg-slate-700'}`} />
      ))}
    </span>
  )
}
