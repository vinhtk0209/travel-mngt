import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/auth-context'
import { useI18n } from '@/i18n/i18n-context'
import { queryKeys } from '@/lib/query-keys'
import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/lib/supabase/database.types'

type TripNotification = Tables<'trip_notifications'>

async function fetchNotifications(userId: string): Promise<TripNotification[]> {
  const { data, error } = await supabase.from('trip_notifications').select('*')
    .eq('user_id', userId).order('created_at', { ascending: false }).limit(50)
  if (error) throw error
  return data ?? []
}

export function NotificationMenu() {
  const { user } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const query = useQuery({ queryKey: queryKeys.notifications(user?.id),
    queryFn: () => fetchNotifications(user!.id), enabled: Boolean(user), staleTime: 10_000 })
  const notifications = query.data ?? []
  const unread = notifications.filter((item) => !item.read_at).length

  useEffect(() => {
    if (!user) return
    const channel = supabase.channel(`notifications-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trip_notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
        const item = payload.new as TripNotification
        void client.invalidateQueries({ queryKey: queryKeys.notifications(user.id) })
        const label = t(`notifications.${item.kind}`)
        toast.info(label)
        if ('Notification' in window && Notification.permission === 'granted') {
          const browser = new Notification(t('notifications.title'), { body: label })
          browser.onclick = () => { window.focus(); navigate(`/trips/${item.trip_id}?tab=${item.kind === 'chat' || item.kind === 'mention' ? 'chat' : 'feed'}`); browser.close() }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trip_notifications', filter: `user_id=eq.${user.id}` }, () => {
        void client.invalidateQueries({ queryKey: queryKeys.notifications(user.id) })
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [user, client, navigate, t])

  const openMenu = () => {
    setOpen((value) => !value)
    if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission()
  }
  const go = async (item: TripNotification) => {
    if (!item.read_at) await supabase.from('trip_notifications').update({ read_at: new Date().toISOString() }).eq('id', item.id)
    setOpen(false)
    navigate(`/trips/${item.trip_id}?tab=${item.kind === 'chat' || item.kind === 'mention' ? 'chat' : 'feed'}`)
  }

  return <div className="relative">
    <button type="button" onClick={openMenu} aria-label={t('notifications.title')} aria-expanded={open}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-soft hover:bg-surface">
      <Bell className="h-5 w-5" />
      {unread ? <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-coral-500 px-1 text-[10px] font-bold text-white">{Math.min(unread, 99)}</span> : null}
    </button>
    {open ? <div className="absolute right-0 top-full z-40 mt-2 max-h-96 w-[min(20rem,90vw)] overflow-y-auto rounded-2xl border border-border bg-surface p-2 shadow-lift">
      <p className="px-2 py-2 text-sm font-bold text-ink">{t('notifications.title')}</p>
      {!notifications.length ? <p className="px-2 pb-3 text-xs text-ink-muted">{t('notifications.empty')}</p> : null}
      {notifications.map((item) => <button key={item.id} type="button" onClick={() => void go(item)}
        className={`block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-cream ${item.read_at ? 'text-ink-muted' : 'bg-coral-50 text-ink font-bold'}`}>
        {t(`notifications.${item.kind}`)}
        <span className="mt-0.5 block text-[10px] font-normal">{new Date(item.created_at).toLocaleString()}</span>
      </button>)}
    </div> : null}
  </div>
}
