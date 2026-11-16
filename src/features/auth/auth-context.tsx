import type { Session, User } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '@/lib/supabase/client'
import { signOut as signOutRequest } from './api'

type AuthContextValue = {
  session: Session | null
  user: User | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const queryClient = useQueryClient()

  useEffect(() => {
    let isActive = true

    const applySession = (nextSession: Session | null) => {
      if (!isActive) return
      setSession(nextSession)
      setIsLoading(false)

      if (nextSession?.access_token) {
        void supabase.realtime.setAuth(nextSession.access_token)
      }
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (!isActive) return
      applySession(data.session)
      if (data.session?.access_token) {
        void supabase.realtime.setAuth(data.session.access_token)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      applySession(nextSession)

      if (event === 'SIGNED_OUT') {
        queryClient.clear()
      } else if (nextSession) {
        void queryClient.invalidateQueries()
      }
    })

    return () => {
      isActive = false
      subscription.unsubscribe()
    }
  }, [queryClient])

  const handleSignOut = useCallback(async () => {
    await signOutRequest()
    queryClient.clear()
  }, [queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      signOut: handleSignOut,
    }),
    [session, isLoading, handleSignOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
