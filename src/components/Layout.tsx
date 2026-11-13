import { NavLink, Outlet } from 'react-router-dom'

const NAV = [
  { to: '/', label: 'Flammability Map', end: true },
  { to: '/brief', label: 'Mission Fire Brief' },
  { to: '/evidence', label: 'Evidence' },
  { to: '/gaps', label: 'Knowledge Gaps' },
  { to: '/ask', label: 'Ask EMBER' },
]

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print sticky top-0 z-20 border-b border-space-700 bg-space-900/85 backdrop-blur">
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

      <footer className="no-print border-t border-space-700 py-6 text-xs text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-2 px-4 sm:px-6">
          <span>EMBER · NASA Space Apps Challenge 2026 · “Flame in Freefall”</span>
          <NavLink to="/about" className="hover:text-slate-300">
            Data &amp; methodology
          </NavLink>
        </div>
      </footer>
    </div>
  )
}
