const PARTICLES = Array.from({ length: 36 }, (_, i) => {
  // Deterministic pseudo-random layout so the backdrop is stable between renders.
  const a = Math.sin(i * 12.9898) * 43758.5453
  const b = Math.sin(i * 78.233) * 12345.6789
  return { x: (a - Math.floor(a)) * 100, y: (b - Math.floor(b)) * 100, r: 0.6 + ((i * 7) % 5) * 0.25 }
})

export default function OrbitBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <svg className="absolute -right-[20%] -top-[30%] h-[110vh] w-[110vh] opacity-[0.22]" viewBox="0 0 200 200">
        <g fill="none" stroke="#38bdf8" strokeWidth="0.15">
          <ellipse cx="100" cy="100" rx="96" ry="38" transform="rotate(-18 100 100)" />
          <ellipse cx="100" cy="100" rx="78" ry="30" transform="rotate(-18 100 100)" strokeDasharray="0.8 1.6" />
          <ellipse cx="100" cy="100" rx="58" ry="58" stroke="#f97316" strokeOpacity="0.6" />
          <ellipse cx="100" cy="100" rx="40" ry="40" strokeDasharray="0.5 2" />
        </g>
        <circle cx="13" cy="85" r="1.1" fill="#f97316" />
        <circle cx="168" cy="62" r="0.8" fill="#38bdf8" />
      </svg>
      <svg className="absolute inset-0 h-full w-full opacity-40">
        {PARTICLES.map((p, i) => (
          <circle key={i} cx={`${p.x}%`} cy={`${p.y}%`} r={p.r} fill="#cbd5e1" fillOpacity={0.18} />
        ))}
      </svg>
    </div>
  )
}
