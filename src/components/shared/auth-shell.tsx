import { CalendarDays, Camera, Coffee, MapPin, Sparkles, Utensils } from 'lucide-react'
import type { ReactNode } from 'react'
import { Logo } from './logo'
import { ThemeToggle } from './theme-toggle'

type AuthShellProps = {
  title: string
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.02fr_0.98fr]">
      <div className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-14">
        <div className="flex items-center justify-between">
          <Logo to="/" />
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-md">
            <div className="mb-7 text-center lg:text-left">
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
              {subtitle ? (
                <p className="mt-2 text-sm leading-relaxed text-ink-soft sm:text-base">
                  {subtitle}
                </p>
              ) : null}
            </div>
            <div className="surface-card p-6 sm:p-8">{children}</div>
            {footer ? <div className="mt-6 text-center text-sm text-ink-soft">{footer}</div> : null}
          </div>
        </div>

        <p className="text-center text-xs text-ink-muted lg:text-left">
          Plan slowly, travel often. Wanderlist keeps every little idea in one happy place.
        </p>
      </div>

      <aside className="relative m-3 hidden overflow-hidden rounded-4xl bg-gradient-to-br from-coral-200 via-butter-200 to-mint-200 lg:m-4 lg:block">
        <div className="absolute -left-16 top-20 h-56 w-56 rounded-full bg-white/35 blur-2xl" />
        <div className="absolute -right-10 bottom-10 h-64 w-64 rounded-full bg-lavender-200/70 blur-3xl" />
        <div className="relative flex h-full flex-col justify-center px-12 py-16">
          <span className="mb-6 inline-flex w-fit items-center gap-2 rounded-full bg-white/60 px-3 py-1.5 text-xs font-extrabold uppercase tracking-widest text-ink-soft backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-coral-500" />
            Plan together
          </span>
          <h2 className="max-w-md font-display text-4xl font-extrabold leading-tight text-ink">
            Every trip starts with a tiny, happy list.
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
            Collect places, tag the good stuff, add photos, and build the itinerary with the
            people you love.
          </p>

          <div className="mt-9 max-w-sm rounded-3xl border border-white/70 bg-white/75 p-5 shadow-lift backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-lg font-extrabold">Da Lat weekend</p>
                <p className="flex items-center gap-1 text-xs font-semibold text-ink-muted">
                  <CalendarDays className="h-3.5 w-3.5" /> 12 – 14 March
                </p>
              </div>
              <span className="flex -space-x-2">
                <span className="h-7 w-7 rounded-full bg-coral-300 ring-2 ring-white" />
                <span className="h-7 w-7 rounded-full bg-mint-300 ring-2 ring-white" />
                <span className="h-7 w-7 rounded-full bg-lavender-300 ring-2 ring-white" />
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              {[
                { icon: Coffee, label: 'Morning coffee at the lake', tag: 'Đi ăn', done: true },
                { icon: Camera, label: 'Sunset photo walk', tag: 'Check-in', done: true },
                { icon: Utensils, label: 'Night market food crawl', tag: 'Quán ăn', done: false },
                { icon: MapPin, label: 'Waterfall day trip', tag: 'Đi chơi', done: false },
              ].map((place) => (
                <div
                  key={place.label}
                  className="flex items-center gap-3 rounded-2xl border border-white bg-white/80 px-3 py-2"
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                      place.done ? 'bg-mint-100 text-mint-600' : 'bg-coral-100 text-coral-500'
                    }`}
                  >
                    <place.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-ink">{place.label}</p>
                    <span className="rounded-full bg-cream px-1.5 py-0.5 text-[10px] font-bold text-ink-muted">
                      {place.tag}
                    </span>
                  </div>
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      place.done ? 'bg-mint-400' : 'bg-coral-200'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
