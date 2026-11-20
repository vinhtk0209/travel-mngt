import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

export function useTripTyping(tripId: string, userId: string | undefined) {
  const [typingIds, setTypingIds] = useState<string[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const lastSent = useRef(0)
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const active = useRef(new Map<string, number>())

  useEffect(() => {
    if (!userId) return
    const channel = supabase.channel(`trip-typing-${tripId}`, { config: { private: true } })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const sender = payload.userId
        if (typeof sender !== 'string' || sender === userId) return
        if (payload.typing) active.current.set(sender, Date.now() + 5_000)
        else active.current.delete(sender)
        setTypingIds([...active.current.keys()])
      })
      .subscribe()
    channelRef.current = channel
    const sweep = setInterval(() => {
      for (const [id, expiry] of active.current) {
        if (expiry < Date.now()) active.current.delete(id)
      }
      setTypingIds([...active.current.keys()])
    }, 1_000)
    return () => {
      if (stopTimer.current) clearTimeout(stopTimer.current)
      clearInterval(sweep)
      void supabase.removeChannel(channel)
      channelRef.current = null
      active.current.clear()
    }
  }, [tripId, userId])

  const stopTyping = useCallback(() => {
    if (!userId) return
    if (stopTimer.current) clearTimeout(stopTimer.current)
    void channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { userId, typing: false } })
  }, [userId])

  const signalTyping = useCallback(() => {
    if (!userId) return
    if (Date.now() - lastSent.current > 1_000) {
      lastSent.current = Date.now()
      void channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { userId, typing: true } })
    }
    if (stopTimer.current) clearTimeout(stopTimer.current)
    stopTimer.current = setTimeout(stopTyping, 5_000)
  }, [stopTyping, userId])

  return { typingIds, signalTyping, stopTyping }
}
