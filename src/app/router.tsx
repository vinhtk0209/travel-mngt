import type { ComponentType } from 'react'
import { Navigate, createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute, PublicOnlyRoute } from '@/features/auth/components/route-guards'
import { NotFoundPage } from './not-found-page'

type PageModule = { default: ComponentType }

const CHUNK_RELOAD_KEY = 'wanderlist.chunk-reload'

function isStaleChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|chunkloaderror/i.test(
    message,
  )
}

async function loadChunk(loader: () => Promise<PageModule>): Promise<PageModule> {
  try {
    const module = await loader()
    sessionStorage.removeItem(CHUNK_RELOAD_KEY)
    return module
  } catch (error) {
    if (isStaleChunkError(error) && !sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
      window.location.reload()
      return new Promise<PageModule>(() => {})
    }
    throw error
  }
}

const loadPage = (loader: () => Promise<PageModule>) => async () => {
  const { default: Page } = await loadChunk(loader)
  return { Component: Page }
}

const loadPublicPage = (loader: () => Promise<PageModule>) => async () => {
  const { default: Page } = await loadChunk(loader)
  return {
    Component: () => (
      <PublicOnlyRoute>
        <Page />
      </PublicOnlyRoute>
    ),
  }
}

const loadProtectedPage = (loader: () => Promise<PageModule>) => async () => {
  const { default: Page } = await loadChunk(loader)
  return {
    Component: () => (
      <ProtectedRoute>
        <Page />
      </ProtectedRoute>
    ),
  }
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/login',
    lazy: loadPublicPage(() =>
      import('@/features/auth/pages/login-page').then((module) => ({
        default: module.LoginPage,
      })),
    ),
  },
  {
    path: '/auth/callback',
    lazy: loadPage(() =>
      import('@/features/auth/pages/auth-callback-page').then((module) => ({
        default: module.AuthCallbackPage,
      })),
    ),
  },
  {
    path: '/share/:token',
    lazy: loadPage(() =>
      import('@/features/sharing/pages/share-trip-page').then((module) => ({
        default: module.ShareTripPage,
      })),
    ),
  },
  {
    path: '/dashboard',
    lazy: loadProtectedPage(() =>
      import('@/features/trips/pages/dashboard-page').then((module) => ({
        default: module.DashboardPage,
      })),
    ),
  },
  {
    path: '/trips/:tripId',
    lazy: loadProtectedPage(() =>
      import('@/features/trips/pages/trip-detail-page').then((module) => ({
        default: module.TripDetailPage,
      })),
    ),
  },
  {
    path: '/trips/:tripId/settings',
    lazy: loadProtectedPage(() =>
      import('@/features/trips/pages/trip-settings-page').then((module) => ({
        default: module.TripSettingsPage,
      })),
    ),
  },
  {
    path: '/profile',
    lazy: loadProtectedPage(() =>
      import('@/features/auth/pages/profile-page').then((module) => ({
        default: module.ProfilePage,
      })),
    ),
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
