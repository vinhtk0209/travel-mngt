import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { SetupNotice } from '@/components/shared/setup-notice'
import { AuthProvider } from '@/features/auth/auth-context'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { queryClient } from './query-client'
import { router } from './router'

export function App() {
  if (!isSupabaseConfigured) {
    return <SetupNotice />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster
          position="top-center"
          toastOptions={{
            className: 'font-sans font-semibold',
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  )
}
