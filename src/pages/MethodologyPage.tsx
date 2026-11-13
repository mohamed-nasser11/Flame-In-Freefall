import type { ReactNode } from 'react'
import { Panel, SectionHeader } from '../components/ui'
import { datasetStats, findingsDataset, flammability } from '../lib/data'

const RULES: [string, string, string][] = [
  ['Oxygen outside tested range', 'O2 and pressure have no nearby solid-material flight test', 'F09, LIM-MARGIN, LIM-UG-ROD-CONC'],
  ['Ventilation near worst case', 'Ventilation range overlaps 5–20 cm/s', 'F12, F11, F15, model curve'],
  ['Earth screening not conservative', 'Any solid material selected', 'F09, F14, LIM-MARGIN, LIM-ROD-OPP-LINK'],
  ['Material-specific results', 'Cotton, Nomex-III, PMMA, Nomex HT90-40, Ultem or silicone selected', 'F01, F05, F16, F17, LIM-ULOI, map points'],
  ['Liquid fuels', 'Liquid fuels or lubricants selected', 'F21, F22'],
  ['Suppression method', 'Suppression type (inert-gas jet ranks highest)', 'F10, F21, F28'],
  ['Smoke detection', 'Detector type (single-principle ranks higher)', 'F24–F27'],
  ['Fan-off response', 'Gravity level (partial gravity is outside the evidence)', 'LIM-FAN-OFF, F13, F02'],
  ['Fire scale and ignition', 'Always included, lower tier', 'F01, F03, F04, F18, F20'],
]

export default function MethodologyPage() {
  const stats = datasetStats()
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <SectionHeader eyebrow="Validity" title="Data & methodology">
        How EMBER turns NASA documents into findings, map points and review items, and where its limits are.
      </SectionHeader>

      <div className="mt-8 space-y-6">
        <Section title="Data">
          <p>
            <strong>Findings ({stats.findings}).</strong> One-sentence results extracted from NASA reports for nine PSI
            investigations (Saffire I–III, BASS, BASS-II, FLEX, FLEX-2, SAME, SAME-R). Each card records the experiment,
            conditions, a safety note, an evidence type ({findingsDataset.findings.filter((f) => f.evidence_type === 'result').length}{' '}
            measured results, the rest objectives or hypotheses) and the document location it came from.
          </p>
          <p>
            <strong>Flammability map ({flammability.points.length} points).</strong> Test conditions from Saffire, BASS,
            BASS-II and FLEX: oxygen, pressure, flow speed and direction, and outcome. Values are copied from the source;
            nothing is interpolated. Points read from a plot or with an assumed value are drawn with a dashed outline and
            list their caveats.
          </p>
          <p>
            <strong>Mission atmospheres.</strong> ISS air is operational. The 8.2 psia / 34% O2 exploration atmosphere is a
            NASA proposal under study, not an adopted Artemis requirement. The Mars preset reuses it as an assumption.
          </p>
          <p>
            Sources are the PSI Data Repository and the Researcher’s Guide listed on the challenge page, and NASA Technical
            Reports Server papers that publish the experiments’ results. A few BASS-II limits come from conference and
            journal papers written by the NASA experiment teams, cited with page numbers.
          </p>
        </Section>

        <Section title="Mission Risk Check rules">
          <p>
            Each rule ties one scenario condition to documented evidence and returns a tier: <em>Review first</em>,{' '}
            <em>Review</em> or <em>Note</em>. Items are ordered by tier, then evidence gaps first, then evidence strength
            (measured result and team relevance rating), then number of matched factors. No probabilities or numeric risk
            scores are produced, because the data cannot support them.
          </p>
          <div className="overflow-x-auto">
            <table className="mt-2 w-full min-w-[560px] text-left text-xs">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">Rule</th>
                  <th className="py-2 pr-3 font-medium">Triggered by</th>
                  <th className="py-2 font-medium">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {RULES.map(([rule, trigger, evidence]) => (
                  <tr key={rule}>
                    <td className="py-2 pr-3 text-slate-200">{rule}</td>
                    <td className="py-2 pr-3 text-slate-400">{trigger}</td>
                    <td className="py-2 font-mono text-[11px] text-cyan-300/80">{evidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Ask EMBER">
          <ol className="list-decimal space-y-1 pl-5">
            <li>The question is matched against findings and reference limits with BM25 keyword ranking, field weights and a small table of domain synonyms.</li>
            <li>The top records are sent to the language model with instructions to answer only from them and to cite a record id after every factual sentence.</li>
            <li>The server removes any citation that is not one of the retrieved records before the answer reaches the page.</li>
            <li>If nothing relevant is retrieved, or the model reports that the records do not answer the question, EMBER returns a fixed “insufficient evidence” message.</li>
            <li>If the model is unavailable, EMBER shows the retrieved records themselves, clearly labelled.</li>
          </ol>
          <p>
            With a few dozen short records, keyword ranking is accurate, fast and easy to audit. Embedding search would add
            a second service without improving answers at this size.
          </p>
        </Section>

        <Section title="Known limitations">
          <ul className="list-disc space-y-1 pl-5">
            <li>The knowledge base is a curated subset of NASA research, not the full archive.</li>
            <li>All solid-material flight tests were at about 1 atm and 13.6–22.2% O2. Nothing covers partial gravity.</li>
            <li>The relevance rating (1–5) on findings is the team’s editorial judgement.</li>
            <li>The model boundary on the map is schematic: only two values are labelled in the source figure.</li>
            <li>EMBER is a research aid. It does not certify materials or designs and gives no emergency instructions.</li>
          </ul>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Panel className="p-6">
      <h2 className="font-display text-lg font-semibold text-white">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-300">{children}</div>
    </Panel>
  )
}
