import type { ReactNode } from 'react'
import type { PointSource, SourceRef } from '../lib/types'

export function SourceLink({ source, compact = false }: { source: SourceRef | PointSource; compact?: boolean }) {
  const location = 'page' in source ? source.page : source.location
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="group block rounded-md border border-slate-700/80 bg-slate-950/40 px-3 py-2 text-xs transition-colors hover:border-cyan-500/60"
    >
      <span className="text-slate-200 group-hover:text-cyan-200">{source.title}</span>
      {!compact && location && <span className="mt-0.5 block text-slate-500">{location}</span>}
      <span className="mt-1 block truncate font-mono text-[10px] text-cyan-400/80">{source.url.replace(/^https?:\/\//, '')} ↗</span>
    </a>
  )
}

const TONES = {
  neutral: 'border-slate-600 text-slate-300',
  ember: 'border-ember-500/50 bg-ember-500/10 text-ember-300',
  cyan: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200',
  amber: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
  red: 'border-red-400/40 bg-red-500/10 text-red-200',
  green: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
} as const

export type Tone = keyof typeof TONES

export function Badge({ children, tone = 'neutral', title }: { children: ReactNode; tone?: Tone; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONES[tone]}`}>
      {children}
    </span>
  )
}

export function SectionHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="max-w-3xl">
      <p className="label text-cyan-300/80">{eyebrow}</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
      {children && <div className="mt-3 text-[15px] leading-relaxed text-slate-400">{children}</div>}
    </div>
  )
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{children}</section>
}

/** Visually separates text written by the team or the model from what NASA reported. */
export function InterpretationNote({ children, label = 'Interpretation' }: { children: ReactNode; label?: string }) {
  return (
    <div className="rounded-md border-l-2 border-cyan-400/60 bg-cyan-400/5 px-3 py-2 text-sm text-slate-300">
      <span className="label mb-1 block text-cyan-300/90">{label}</span>
      {children}
    </div>
  )
}
