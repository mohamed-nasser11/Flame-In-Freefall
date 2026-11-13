import { NavLink, Outlet } from 'react-router-dom'
import OrbitBackdrop from './OrbitBackdrop'

const NAV = [
  { to: '/', label: 'Overview', end: true },
  { to: '/explorer', label: 'Research Explorer' },
  { to: '/risk-check', label: 'Mission Risk Check' },
  { to: '/ask', label: 'Ask EMBER' },
  { to: '/compare', label: 'Compare' },
  { to: '/gaps', label: 'Knowledge Gaps' },
]

export default function Layout() {
  return (
    <div className="relative isolate flex min-h-screen flex-col">
      <OrbitBackdrop />
      <header className="no-print sticky top-0 z-20 border-b border-slate-800 bg-space-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3 sm:px-6">
          <NavLink to="/" className="flex items-center gap-2">
            <img src="/favicon.svg" alt="" className="h-7 w-7" />
            <span className="font-display text-lg font-semibold tracking-wide text-white">EMBER</span>
          </NavLink>
          <nav className="-mx-1 flex flex-1 gap-1 overflow-x-auto text-sm">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-md px-3 py-1.5 transition-colors ${
                    isActive ? 'bg-space-700 text-white' : 'text-slate-400 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="no-print border-t border-slate-800 py-6 text-xs text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-2 px-4 sm:px-6">
          <span>EMBER · NASA Space Apps Challenge 2026 · “Flame in Freefall”</span>
          <span className="flex gap-4">
            <NavLink to="/methodology" className="hover:text-slate-300">
              Data &amp; methodology
            </NavLink>
            <span>Research and decision support only. Not a certified safety tool.</span>
          </span>
        </div>
      </footer>
    </div>
  )
}
