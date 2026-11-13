import { Fragment, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge, SectionHeader } from '../components/ui'
import { MAX_QUESTION_LENGTH, type AskResponse, type ChatTurn, type CitedSource } from '../lib/assistant'

const SUGGESTED = [
  'How does microgravity change the oxygen level at which materials burn?',
  'Does turning off cabin ventilation help put out a fire?',
  'Why might a nitrogen extinguisher make a fire worse in space?',
  'What did the Saffire experiments show about large fires?',
  'How should smoke detectors differ on a spacecraft?',
  'Is there any evidence for fire behaviour on the Moon or Mars?',
]

interface Exchange {
  question: string
  response?: AskResponse
  error?: string
}

export default function AskPage() {
  const [params, setParams] = useSearchParams()
  const [input, setInput] = useState('')
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const prefilled = useRef(false)

  async function ask(question: string) {
    const q = question.trim()
    if (!q || loading) return
    const history: ChatTurn[] = exchanges
      .filter((e) => e.response?.mode === 'answer')
      .flatMap((e) => [
        { role: 'user' as const, content: e.question },
        { role: 'assistant' as const, content: e.response!.answer },
      ])
    setExchanges((list) => [...list, { question: q }])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, history }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok || !body) throw new Error(body?.error ?? `Request failed (${res.status})`)
      setExchanges((list) => list.map((e, i) => (i === list.length - 1 ? { ...e, response: body as AskResponse } : e)))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.'
      setExchanges((list) => list.map((e, i) => (i === list.length - 1 ? { ...e, error: message } : e)))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const q = params.get('q')
    if (q && !prefilled.current) {
      prefilled.current = true
      setParams({}, { replace: true })
      void ask(q)
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [exchanges, loading])

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void ask(input)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <SectionHeader eyebrow="Interpret" title="Ask EMBER">
        Ask about microgravity fire behaviour in plain language. Answers are written only from EMBER’s knowledge base of
        NASA findings, and every claim links to its record. If the records do not cover a question, EMBER says so.
      </SectionHeader>

      {exchanges.length === 0 && (
        <div className="mt-8">
          <p className="label">Try one of these</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {SUGGESTED.map((s) => (
              <button
                key={s}
                onClick={() => void ask(s)}
                className="panel px-4 py-3 text-left text-sm text-slate-300 transition-colors hover:border-cyan-500/50 hover:text-white"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 space-y-8">
        {exchanges.map((e, i) => (
          <div key={i} className="space-y-3">
            <div className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-slate-800 px-4 py-2.5 text-sm text-white">{e.question}</p>
            </div>
            {e.response && <Answer response={e.response} />}
            {e.error && (
              <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-200">
                {e.error}{' '}
                <button className="ml-1 underline" onClick={() => void ask(e.question)} disabled={loading}>
                  Try again
                </button>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="panel flex items-center gap-3 p-4 text-sm text-slate-400" aria-live="polite">
            <span className="h-2 w-2 animate-pulse rounded-full bg-ember-400" />
            Searching the knowledge base and writing a cited answer…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={onSubmit} className="sticky bottom-4 mt-8">
        <div className="panel flex items-end gap-2 bg-slate-950/95 p-2">
          <label htmlFor="question" className="sr-only">
            Your question
          </label>
          <textarea
            id="question"
            rows={1}
            value={input}
            maxLength={MAX_QUESTION_LENGTH}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void ask(input)
              }
            }}
            placeholder="Ask about ignition, flame spread, materials, extinguishment or smoke…"
            className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none"
          />
          <button type="submit" className="btn-primary" disabled={loading || input.trim().length < 3}>
            Ask
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-slate-600">
          Research aid only. Answers are limited to the curated NASA records in EMBER and may be incomplete.
        </p>
      </form>
    </div>
  )
}

function Answer({ response }: { response: AskResponse }) {
  const sources = new Map(response.sources.map((s) => [s.id, s]))
  const index = new Map(response.sources.map((s, i) => [s.id, i + 1]))

  if (response.mode === 'insufficient_evidence') {
    return (
      <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
        <Badge tone="amber">Insufficient evidence</Badge>
        <p className="mt-2 text-sm text-slate-300">{response.answer}</p>
        <Link to="/gaps" className="mt-2 inline-block text-xs text-cyan-300">
          See what NASA has not tested yet →
        </Link>
      </div>
    )
  }

  return (
    <div className="panel p-5">
      {response.mode === 'retrieval_only' && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge tone="amber">Records only, no AI summary</Badge>
          <span className="text-xs text-slate-400">{response.notice}</span>
        </div>
      )}
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-200">
        {renderAnswer(response.answer, index, response.mode === 'answer')}
      </div>
      {response.droppedCitations && response.droppedCitations.length > 0 && (
        <p className="mt-3 text-[11px] text-slate-500">
          {response.droppedCitations.length} citation(s) that did not match a retrieved record were removed.
        </p>
      )}
      {sources.size > 0 && (
        <div className="mt-5 border-t border-slate-800 pt-4">
          <p className="label mb-2">Sources cited</p>
          <ol className="space-y-2">
            {response.sources.map((s, i) => (
              <SourceItem key={s.id} n={i + 1} source={s} />
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

function renderAnswer(text: string, index: Map<string, number>, structured: boolean): ReactNode[] {
  return text
    .split(/\n{1,}/)
    .filter((line) => line.trim())
    .map((line, i) => {
      const heading = line.match(/^#{1,3}\s+(.*)$/)
      if (heading) {
        const title = heading[1].trim()
        const isInterpretation = /interpretation/i.test(title)
        return (
          <h3
            key={i}
            className={`label pt-2 ${isInterpretation ? 'text-cyan-300' : /not covered/i.test(title) ? 'text-amber-200' : 'text-ember-300'}`}
          >
            {title}
            {isInterpretation && structured && <span className="ml-2 normal-case tracking-normal text-slate-500">(model reasoning over the cited records)</span>}
          </h3>
        )
      }
      return <p key={i}>{withCitations(line, index)}</p>
    })
}

function withCitations(line: string, index: Map<string, number>): ReactNode[] {
  const parts = line.split(/(\[[A-Za-z0-9.\-_]+\])/g)
  return parts.map((part, i) => {
    const m = part.match(/^\[([A-Za-z0-9.\-_]+)\]$/)
    if (m && index.has(m[1])) {
      return (
        <a
          key={i}
          href={`#src-${m[1]}`}
          title={m[1]}
          className="mx-0.5 inline-flex -translate-y-0.5 items-center rounded bg-cyan-400/15 px-1.5 font-mono text-[11px] text-cyan-200 hover:bg-cyan-400/30"
        >
          {index.get(m[1])}
        </a>
      )
    }
    return <Fragment key={i}>{part}</Fragment>
  })
}

function SourceItem({ n, source: s }: { n: number; source: CitedSource }) {
  return (
    <li id={`src-${s.id}`} className="scroll-mt-24 rounded-md border border-slate-800 bg-slate-950/40 p-3 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-cyan-400/15 px-1.5 font-mono text-cyan-200">{n}</span>
        {s.kind === 'finding' ? (
          <Link to={`/explorer?finding=${s.id}`} className="font-mono text-cyan-300 hover:text-cyan-200">
            {s.id}
          </Link>
        ) : (
          <span className="font-mono text-slate-400">{s.id}</span>
        )}
        <span className="text-slate-400">{s.label}</span>
        {s.evidenceType && s.evidenceType !== 'result' && <Badge tone="amber">{s.evidenceType}</Badge>}
      </div>
      <p className="mt-1.5 text-slate-300">{s.excerpt}</p>
      <a href={s.url} target="_blank" rel="noreferrer" className="mt-1.5 block text-slate-500 hover:text-cyan-300">
        {s.sourceTitle}
        {s.location ? ` · ${s.location}` : ''} ↗
      </a>
    </li>
  )
}
