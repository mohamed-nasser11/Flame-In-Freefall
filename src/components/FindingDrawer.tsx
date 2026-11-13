import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { EVIDENCE_LABELS, HAZARD_LABELS, findingCaveats, flammability, materialsOf } from '../lib/data'
import type { Finding } from '../lib/types'
import { Badge, InterpretationNote, SourceLink } from './ui'
import { ScoreDots } from './FindingCard'

export default function FindingDrawer({ finding: f, onClose }: { finding: Finding; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const caveats = findingCaveats(f)
  const materials = materialsOf(f)
  const experimentNames = f.experiment.split('/').map((e) => e.trim())
  const mapPoints = flammability.points.filter((p) => experimentNames.includes(p.experiment))

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <button
        aria-label="Close details"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative h-full w-full max-w-xl overflow-y-auto border-l border-slate-800 bg-slate-950 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-slate-500">{f.id}</span>
            <Badge tone="ember">{HAZARD_LABELS[f.hazard_type]}</Badge>
            <Badge tone={f.evidence_type === 'result' ? 'neutral' : 'amber'}>
              {EVIDENCE_LABELS[f.evidence_type].label}
            </Badge>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            Close
          </button>
        </div>

        <h2 id="drawer-title" className="mt-4 font-display text-xl font-semibold text-white">
          {f.experiment}
          <span className="ml-2 font-mono text-sm font-normal text-slate-500">{f.psi_id}</span>
        </h2>

        <section className="mt-6">
          <p className="label text-ember-300/90">What NASA reported</p>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-100">{f.finding}</p>
        </section>

        <section className="mt-6">
          <p className="label">Experimental conditions</p>
          <p className="mt-2 text-sm text-slate-300">{f.conditions}</p>
          {materials.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {materials.map((m) => (
                <Badge key={m}>{m}</Badge>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 space-y-3">
          <InterpretationNote label="What it may mean for a spacecraft (EMBER team interpretation)">
            {f.safety_implication}
          </InterpretationNote>
          <div className="flex items-center gap-3 rounded-md border border-slate-800 px-3 py-2 text-xs text-slate-400">
            <ScoreDots score={f.safety_score} />
            <span>
              Relevance {f.safety_score}/5: {f.score_reason}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            The 1 to 5 rating is the team’s editorial judgement of how directly a finding affects spacecraft design. It
            is not a probability or a certified risk score.
          </p>
        </section>

        {caveats.length > 0 && (
          <section className="mt-6">
            <p className="label">Limitations and caveats</p>
            <ul className="mt-2 space-y-1.5 text-sm text-amber-200/80">
              {caveats.map((c) => (
                <li key={c} className="flex gap-2">
                  <span aria-hidden>△</span>
                  {c}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-6">
          <p className="label">Source</p>
          <div className="mt-2">
            <SourceLink source={f.source} />
          </div>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to={`/ask?q=${encodeURIComponent(`Explain finding ${f.id} and what it means for cabin design`)}`}
            className="btn-ghost"
          >
            Ask EMBER about this
          </Link>
          {mapPoints.length > 0 && (
            <Link to="/" className="btn-ghost">
              See {mapPoints.length} {experimentNames.join(' / ')} points on the map
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
