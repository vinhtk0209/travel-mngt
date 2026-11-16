import type { ComponentType } from 'react'
import { Navigate, createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute, PublicOnlyRoute } from '@/features/auth/components/route-guards'
import { NotFoundPage } from './not-found-page'

type PageModule = { default: ComponentType }

const loadPage = (loader: () => Promise<PageModule>) => async () => {
  const { default: Page } = await loader()
  return { Component: Page }
}

const loadPublicPage = (loader: () => Promise<PageModule>) => async () => {
  const { default: Page } = await loader()
  return {
    Component: () => (
      <PublicOnlyRoute>
        <Page />
      </PublicOnlyRoute>
    ),
  }
}

const loadProtectedPage = (loader: () => Promise<PageModule>) => async () => {
  const { default: Page } = await loader()
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
    path: '/invite/:token',
    lazy: loadProtectedPage(() =>
      import('@/features/trip-invitations/pages/invitation-page').then((module) => ({
        default: module.InvitationPage,
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
