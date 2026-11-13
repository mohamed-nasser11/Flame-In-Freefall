import EvidenceList from '../components/EvidenceList'
import { Badge, InterpretationNote, Panel, SectionHeader } from '../components/ui'
import type { EvidenceRef } from '../lib/risk'

interface Gap {
  id: string
  title: string
  known: string
  missing: string
  why: string
  next: string
  evidence: EvidenceRef[]
}

const GAPS: Gap[] = [
  {
    id: 'lunar',
    title: 'Fire on the lunar surface (0.16 g)',
    known:
      'All flight fire data in EMBER was taken in microgravity in orbit. NASA notes that materials ignite more easily where natural convection is weak, which includes partial gravity.',
    missing: 'No flame spread, ignition or extinction measurement at lunar gravity is in the data set.',
    why: 'Weak buoyancy on the Moon adds roughly 10 cm/s of induced flow even with fans off, which is close to the airflow at which NASA measured the lowest oxygen limits.',
    next: 'Measure flame spread and oxygen limits for candidate habitat fabrics at 0.16 g, for example on a lunar lander payload or a rotating rig.',
    evidence: [
      { id: 'F18', kind: 'finding' },
      { id: 'LIM-FAN-OFF', kind: 'limit' },
      { id: 'F12', kind: 'finding' },
    ],
  },
  {
    id: 'mars',
    title: 'Fire in a Mars habitat (0.38 g)',
    known: 'No NASA Mars habitat atmosphere baseline was found; EMBER uses the 8.2 psia / 34% O2 exploration atmosphere as an assumption.',
    missing: 'Neither the gravity level nor the atmosphere has any matching flight test.',
    why: 'Buoyancy at 0.38 g adds about 15 cm/s of induced flow, so the ISS response of shutting down fans may not starve a fire.',
    next: 'Combine partial-gravity tests with the planned habitat atmosphere before the Mars cabin material list is fixed.',
    evidence: [{ id: 'LIM-FAN-OFF', kind: 'limit' }, { id: 'F13', kind: 'finding' }],
  },
  {
    id: 'exploration-atmosphere',
    title: 'The 34% oxygen, 8.2 psia exploration atmosphere',
    known:
      'NASA is studying 8.2 psia / 34% O2 for Artemis-era habitats to shorten spacewalk pre-breathe. Solid-material flight tests in EMBER cover 13.6–22.2% O2 at about 1 atm.',
    missing: 'No solid-material microgravity test at 34% O2 or at 8.2 psia. The nearest data are FLEX liquid droplets at 30–34% O2 and about 0.7 atm.',
    why: 'Materials already burn at 1–2.4 points lower oxygen in microgravity than in Earth tests, so a cabin twelve points above the tested range has no direct evidence.',
    next: 'Repeat Saffire-style large-sample tests in the exploration atmosphere for the materials planned for Artemis habitats.',
    evidence: [
      { id: 'F09', kind: 'finding' },
      { id: 'LIM-MARGIN', kind: 'limit' },
      { id: 'LIM-UG-ROD-CONC', kind: 'limit' },
    ],
  },
  {
    id: 'smoke-growth',
    title: 'Do smoke particles grow too large for detectors?',
    known: 'SAME showed much pre-fire smoke is below 500 nm and that detection lags are longer than on Earth.',
    missing: 'SAME-R was designed to test whether particles grow larger without buoyancy. Our sources state the hypothesis but not its result.',
    why: 'If confirmed, some current detector types could fail to alarm in a spacecraft.',
    next: 'Add the published SAME-R results to the knowledge base and compare them with detector response curves.',
    evidence: [
      { id: 'F27', kind: 'finding' },
      { id: 'F24', kind: 'finding' },
      { id: 'F26', kind: 'finding' },
    ],
  },
  {
    id: 'large-suppression',
    title: 'Putting out a realistic-size fire',
    known:
      'Saffire showed a full-size fabric fire releases about a kilowatt. Suppression evidence in EMBER comes from small BASS samples and FLEX droplets.',
    missing: 'No record covers suppression of a large, spreading solid fire in microgravity.',
    why: 'A small-scale nitrogen jet could feed rather than smother a flame, so scaling suppression from small tests is uncertain.',
    next: 'Test water-mist and inert-gas discharge against a Saffire-scale fire in an uncrewed vehicle.',
    evidence: [
      { id: 'F01', kind: 'finding' },
      { id: 'F10', kind: 'finding' },
      { id: 'F21', kind: 'finding' },
      { id: 'F28', kind: 'finding' },
    ],
  },
  {
    id: 'aging',
    title: 'Materials after years in space',
    known: 'BASS and Saffire compared fabrics and films side by side, but none of the records describe the age or exposure history of the samples.',
    missing: 'No record covers how radiation, outgassing or wear over a multi-year mission change flammability.',
    why: 'Mars missions will rely on the same cabin materials for years without resupply.',
    next: 'Return aged samples from long-duration ISS hardware and repeat BASS-style flammability tests.',
    evidence: [{ id: 'F16', kind: 'finding' }],
  },
]

type Cell = 'solid' | 'droplet' | 'none'

const MATRIX: { gravity: string; cells: Cell[] }[] = [
  { gravity: 'Microgravity (orbit)', cells: ['solid', 'none', 'droplet', 'none'] },
  { gravity: 'Lunar surface, 0.16 g', cells: ['none', 'none', 'none', 'none'] },
  { gravity: 'Mars surface, 0.38 g', cells: ['none', 'none', 'none', 'none'] },
]
const ATMOSPHERES = ['21% O2 · 14.7 psia', '26.5% O2 · 10.2 psia', '30–34% O2 · 10.3 psia', '34% O2 · 8.2 psia']
const CELL: Record<Cell, { label: string; className: string }> = {
  solid: { label: 'Solid-material flight tests', className: 'bg-emerald-400/15 text-emerald-200 border-emerald-400/30' },
  droplet: { label: 'Liquid droplets only', className: 'bg-amber-400/10 text-amber-200 border-amber-400/30' },
  none: { label: 'No flight data', className: 'bg-red-500/10 text-red-200/80 border-red-400/20' },
}

export default function GapsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <SectionHeader eyebrow="Interpret · limits of the evidence" title="Knowledge Gaps">
        Where NASA’s microgravity fire data stops. Each gap lists what the records show, what they do not, and an
        experiment that would close it. The proposed experiments are the EMBER team’s suggestions, not NASA plans.
      </SectionHeader>

      <Panel className="mt-8 overflow-x-auto p-5">
        <h2 className="font-display text-lg font-semibold text-white">Evidence coverage: gravity × cabin atmosphere</h2>
        <table className="mt-4 w-full min-w-[640px] border-separate border-spacing-1 text-xs">
          <thead>
            <tr>
              <th className="p-2 text-left font-medium text-slate-500" />
              {ATMOSPHERES.map((a) => (
                <th key={a} className="p-2 text-left font-mono font-medium text-slate-400">
                  {a}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATRIX.map((row) => (
              <tr key={row.gravity}>
                <th className="p-2 text-left font-medium text-slate-300">{row.gravity}</th>
                {row.cells.map((c, i) => (
                  <td key={i} className={`rounded-md border p-2 ${CELL[c].className}`}>
                    {CELL[c].label}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[11px] text-slate-500">
          Built from the flight test conditions in EMBER’s flammability data set. ISS cabin air is the only atmosphere with
          solid-material evidence.
        </p>
      </Panel>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {GAPS.map((g, i) => (
          <Panel key={g.id} className="flex flex-col p-6">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-500">GAP {String(i + 1).padStart(2, '0')}</span>
              <Badge tone="red">Not covered</Badge>
            </div>
            <h2 className="mt-2 font-display text-xl font-semibold text-white">{g.title}</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="label">What the records show</dt>
                <dd className="mt-1 text-slate-300">{g.known}</dd>
              </div>
              <div>
                <dt className="label text-amber-200/90">What is missing</dt>
                <dd className="mt-1 text-slate-300">{g.missing}</dd>
              </div>
              <div>
                <dt className="label">Why it matters</dt>
                <dd className="mt-1 text-slate-300">{g.why}</dd>
              </div>
            </dl>
            <div className="mt-4">
              <InterpretationNote label="Proposed next experiment (team suggestion)">{g.next}</InterpretationNote>
            </div>
            <details className="mt-4">
              <summary className="cursor-pointer text-xs font-medium text-cyan-300">Related evidence ({g.evidence.length})</summary>
              <div className="mt-3">
                <EvidenceList refs={g.evidence} />
              </div>
            </details>
          </Panel>
        ))}
      </div>
    </div>
  )
}
