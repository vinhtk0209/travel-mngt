import { ChevronDown, LogOut, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/avatar'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/features/auth/auth-context'
import { useProfile } from '@/features/auth/hooks'
import { resolveAvatarUrl } from '@/features/avatars/api'
import { useAvatarUrls } from '@/features/avatars/hooks'
import { getErrorMessage } from '@/utils/errors'
import { useI18n } from '@/i18n/i18n-context'
import { cn } from '@/utils/cn'

export function UserMenu() {
  const { user, signOut } = useAuth()
  const { t } = useI18n()
  const { displayName, email, data: profile } = useProfile()
  const avatarUrls = useAvatarUrls([profile?.avatar_url])
  const avatarSrc =
    resolveAvatarUrl(profile?.avatar_url, avatarUrls) ??
    (user?.user_metadata?.avatar_url as string | undefined)
  const [open, setOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
      toast.success(t('auth.signOutSuccess'))
      navigate('/login')
    } catch (error) {
      toast.error(getErrorMessage(error, t('auth.signOutError')))
    } finally {
      setIsSigningOut(false)
      setOpen(false)
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex items-center gap-2 rounded-full border border-transparent p-1 pr-2 transition hover:border-border hover:bg-white/70',
          open && 'border-border bg-white/80',
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={displayName} src={avatarSrc} size="sm" />
        <span className="hidden max-w-28 truncate text-sm font-bold text-ink-soft sm:block">
          {displayName}
        </span>
        <ChevronDown
          className={cn('hidden h-4 w-4 text-ink-muted transition sm:block', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-3xl border border-border bg-surface p-2 shadow-lift animate-pop-in"
        >
          <div className="flex items-center gap-3 rounded-2xl bg-cream/70 px-3 py-3">
            <Avatar name={displayName} src={avatarSrc} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-ink">{displayName}</p>
              <p className="truncate text-xs text-ink-muted">{email ?? user?.email}</p>
            </div>
          </div>
          <Link
            to="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-bold text-ink-soft transition hover:bg-coral-50 hover:text-coral-700"
          >
            <UserRound className="h-4 w-4" /> {t('nav.profile')}
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => void handleSignOut()}
            disabled={isSigningOut}
            className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
          >
            {isSigningOut ? <Spinner className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
            {t('nav.signOut')}
          </button>
        </div>
      ) : null}
    </div>
  )
}
