import { Compass } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { Logo } from './logo'
import { UserMenu } from './user-menu'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/50 bg-cream/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Logo />
            <nav className="hidden items-center gap-1 sm:flex">
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold transition ${
                    isActive
                      ? 'bg-white text-coral-600 shadow-card'
                      : 'text-ink-soft hover:bg-white/60 hover:text-ink'
                  }`
                }
              >
                <Compass className="h-4 w-4" />
                My trips
              </NavLink>
            </nav>
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-10">{children}</main>

      <footer className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
        <p className="text-center text-xs text-ink-muted">
          Made for slow mornings, long walks and shared plans.
        </p>
      </footer>
    </div>
  )
}
