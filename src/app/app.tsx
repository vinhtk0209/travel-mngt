import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { SetupNotice } from '@/components/shared/setup-notice'
import { AuthProvider } from '@/features/auth/auth-context'
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
            <RouterProvider router={router} />
            <AppToaster />
          </AuthProvider>
        </QueryClientProvider>
      ) : (
        <SetupNotice />
      )}
    </ThemeProvider>
  )
}
