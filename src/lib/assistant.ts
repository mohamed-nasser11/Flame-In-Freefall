import { HAZARD_LABELS } from './data.js'
import { search, type KnowledgeDoc, type SearchHit } from './search.js'

/** Shared by the API route and the client fallback so both cite exactly the same records. */

export const MAX_QUESTION_LENGTH = 500
export const MAX_HISTORY_TURNS = 6
export const RETRIEVAL_LIMIT = 8

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface AskRequest {
  question: string
  history?: ChatTurn[]
}

export interface CitedSource {
  id: string
  kind: KnowledgeDoc['kind']
  label: string
  excerpt: string
  evidenceType?: string
  sourceTitle: string
  url: string
  location?: string
}

export interface AskResponse {
  mode: 'answer' | 'retrieval_only' | 'insufficient_evidence'
  answer: string
  sources: CitedSource[]
  /** Ids the model cited that were not in the retrieved set; removed from the answer. */
  droppedCitations?: string[]
  notice?: string
}

export const INSUFFICIENT_EVIDENCE =
  'The EMBER knowledge base does not contain enough evidence to answer this. It covers 28 curated findings and reference limits from NASA microgravity combustion experiments (Saffire, BASS, BASS-II, FLEX, FLEX-2, SAME, SAME-R), not NASA’s full research archive.'

export const SYSTEM_PROMPT = `You are EMBER, a research assistant for spacecraft fire-safety engineers.
You answer only from the EVIDENCE records supplied in the user turn. These records are curated from NASA microgravity combustion experiments and reports. You have no other knowledge source for this task.

Rules:
- Every factual sentence must end with one or more citations in square brackets using the record ids exactly as given, for example [F12] or [F09][LIM-MARGIN].
- Cite only ids that appear in the EVIDENCE block. Never invent ids, experiments, numbers, URLs or results.
- Keep the evidence type visible: if a record is an objective or a hypothesis, say so in the sentence.
- If the evidence does not answer the question, reply with exactly: INSUFFICIENT_EVIDENCE
- If the evidence answers only part of the question, answer that part and state plainly what the records do not cover.
- Do not give operational emergency instructions and do not certify anything as safe.

Format (plain text, no tables):
## What the evidence shows
Two to five short sentences, each with citations.
## Interpretation
One to three sentences on what this may mean for spacecraft design, clearly framed as interpretation, with citations to the records it rests on.
## Not covered by the evidence
One sentence, only if something in the question is not covered.`

export function validateAskRequest(body: unknown): { ok: true; value: AskRequest } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Request body must be a JSON object.' }
  const { question, history } = body as Record<string, unknown>
  if (typeof question !== 'string') return { ok: false, error: '`question` must be a string.' }
  const q = question.trim()
  if (q.length < 3) return { ok: false, error: 'Please ask a longer question.' }
  if (q.length > MAX_QUESTION_LENGTH) {
    return { ok: false, error: `Questions are limited to ${MAX_QUESTION_LENGTH} characters.` }
  }
  const turns: ChatTurn[] = []
  if (history !== undefined) {
    if (!Array.isArray(history)) return { ok: false, error: '`history` must be an array.' }
    for (const t of history.slice(-MAX_HISTORY_TURNS)) {
      if (
        !t ||
        typeof t !== 'object' ||
        !['user', 'assistant'].includes((t as ChatTurn).role) ||
        typeof (t as ChatTurn).content !== 'string'
      ) {
        return { ok: false, error: 'Malformed history entry.' }
      }
      turns.push({ role: (t as ChatTurn).role, content: (t as ChatTurn).content.slice(0, 2000) })
    }
  }
  return { ok: true, value: { question: q, history: turns } }
}

export function retrieve(question: string, history: ChatTurn[] = []): SearchHit[] {
  const hits = search(question, { limit: RETRIEVAL_LIMIT })
  if (hits.length >= 3 || history.length === 0) return hits
  // Follow-up questions ("what about Mars?") often need the previous question's terms.
  const lastUser = [...history].reverse().find((t) => t.role === 'user')
  if (!lastUser) return hits
  const merged = new Map(hits.map((h) => [h.doc.id, h]))
  for (const h of search(`${lastUser.content} ${question}`, { limit: RETRIEVAL_LIMIT })) {
    if (!merged.has(h.doc.id)) merged.set(h.doc.id, h)
  }
  return [...merged.values()].slice(0, RETRIEVAL_LIMIT)
}

export function toCitedSource(doc: KnowledgeDoc): CitedSource {
  if (doc.kind === 'finding') {
    const f = doc.finding
    return {
      id: f.id,
      kind: 'finding',
      label: `${f.experiment} · ${HAZARD_LABELS[f.hazard_type]}`,
      excerpt: f.finding,
      evidenceType: f.evidence_type,
      sourceTitle: f.source.title,
      url: f.source.url,
      location: f.source.location,
    }
  }
  const l = doc.limit
  return {
    id: l.id,
    kind: 'limit',
    label: l.condition ?? (l.type === 'model_curve' ? 'Model curve' : 'Reference limit'),
    excerpt: l.description,
    evidenceType: l.type === 'model_curve' ? 'model' : 'result',
    sourceTitle: l.source.title,
    url: l.source.url,
    location: l.source.page,
  }
}

/** Renders retrieved records as the evidence block the model is allowed to cite. */
export function buildEvidenceBlock(hits: SearchHit[]): string {
  return hits
    .map(({ doc }) => {
      if (doc.kind === 'finding') {
        const f = doc.finding
        return [
          `[${f.id}] experiment: ${f.experiment} | hazard: ${HAZARD_LABELS[f.hazard_type]} | evidence type: ${f.evidence_type}`,
          `finding: ${f.finding}`,
          `conditions: ${f.conditions}`,
          `team safety note: ${f.safety_implication}`,
          `source: ${f.source.title}${f.source.location ? `, ${f.source.location}` : ''}`,
        ].join('\n')
      }
      const l = doc.limit
      return [
        `[${l.id}] reference ${l.type.replace(/_/g, ' ')}${l.condition ? ` | condition: ${l.condition}` : ''}`,
        `statement: ${l.description}`,
        ...(l.uncertain?.length ? [`caveats: ${l.uncertain.join('; ')}`] : []),
        `source: ${l.source.title}, ${l.source.page}`,
      ].join('\n')
    })
    .join('\n\n')
}

const CITATION = /\[([A-Za-z0-9.\-_]+)\]/g

/**
 * Removes any citation that does not point to a retrieved record, so the UI can only
 * ever link to real sources. Returns the cleaned text, cited ids in order, and dropped ids.
 */
export function enforceCitations(answer: string, allowedIds: Set<string>) {
  const cited: string[] = []
  const dropped: string[] = []
  const text = answer.replace(CITATION, (match, id: string) => {
    if (allowedIds.has(id)) {
      if (!cited.includes(id)) cited.push(id)
      return match
    }
    if (!dropped.includes(id)) dropped.push(id)
    return ''
  })
  return { text: text.replace(/[ \t]+([.,;])/g, '$1').replace(/[ \t]{2,}/g, ' ').trim(), cited, dropped }
}

/** Answer used when the language model is not configured or fails. */
export function retrievalOnlyResponse(hits: SearchHit[], notice: string): AskResponse {
  if (hits.length === 0) return { mode: 'insufficient_evidence', answer: INSUFFICIENT_EVIDENCE, sources: [] }
  const top = hits.slice(0, 4)
  return {
    mode: 'retrieval_only',
    answer: top.map(({ doc }) => `${doc.text} [${doc.id}]`).join('\n\n'),
    sources: top.map(({ doc }) => toCitedSource(doc)),
    notice,
  }
}
