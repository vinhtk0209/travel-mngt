import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { FullPageSpinner } from '@/components/ui/spinner'
import { getSafeRedirectPath } from '@/utils/redirect'
import { useAuth } from '../auth-context'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <FullPageSpinner label="Opening Wanderlist…" />
  }

  if (!session) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }

  return <>{children}</>
}

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { session, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <FullPageSpinner label="Just a moment…" />
  }

  if (session) {
    const params = new URLSearchParams(location.search)
    return <Navigate to={getSafeRedirectPath(params.get('redirect'))} replace />
  }

  return <>{children}</>
}
