import { QueryClientProvider } from '@tanstack/react-query'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { SetupNotice } from '@/components/shared/setup-notice'
import { AuthProvider } from '@/features/auth/auth-context'
import { I18nProvider } from '@/i18n/i18n-context'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { queryClient } from './query-client'
import { router } from './router'
import { ThemeProvider, useTheme } from './theme-provider'

function AppToaster() {
  const { resolved } = useTheme()
  return (
    <Toaster
      theme={resolved}
      position="top-center"
      toastOptions={{
        className: 'font-sans font-semibold',
      }}
    />
  )
}

export function App() {
  return (
    <ThemeProvider>
      {isSupabaseConfigured ? (
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <I18nProvider>
              <RouterProvider router={router} />
              <AppToaster />
            </I18nProvider>
          </AuthProvider>
        </QueryClientProvider>
      ) : (
        <SetupNotice />
      )}
      <Analytics />
      <SpeedInsights />
    </ThemeProvider>
  )
}
