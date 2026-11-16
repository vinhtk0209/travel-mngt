import { Compass } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '@/components/shared/logo'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-10 text-center">
      <Logo to="/dashboard" className="mb-8" />
      <span className="mb-5 rounded-3xl bg-coral-100 p-5 text-coral-500">
        <Compass className="h-10 w-10" />
      </span>
      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-coral-500">404</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold">This path is off the map</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-soft">
        The page you were looking for does not exist. Let us get you back to planning.
      </p>
      <Button
        className="mt-6"
        leftIcon={<Compass className="h-4 w-4" />}
        onClick={() => navigate('/dashboard')}
      >
        Back to my trips
      </Button>
    </div>
  )
}
