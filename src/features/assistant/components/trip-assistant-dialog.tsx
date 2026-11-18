import { Bot, MapPin, Send, Sparkles, Wand2 } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import type { AssistantMode } from '@/lib/supabase/database.types'
import { cn } from '@/utils/cn'
import { getErrorMessage } from '@/utils/errors'
import { basicTravelReply } from '../basic-replies'
import { useAskTripAssistant, useAssistantPreference, useSetAssistantPreference } from '../hooks'
import {
  SUGGESTION_PROMPTS,
  type TripBudget,
  type TripIdea,
} from '../suggestions'
import type { AssistantTurn } from '../api'

type ChatMessage = {
  id: string
  role: 'bot' | 'user'
  text: string
  ideas?: TripIdea[]
  error?: boolean
}

type TripAssistantDialogProps = {
  open: boolean
  onClose: () => void
  onPlanTrip?: (idea: TripIdea) => void
  tripId?: string
  tripName?: string
  tripDestination?: string
  defaultMode?: AssistantMode
}

const BUDGET_LABELS: Record<TripBudget, string> = {
  budget: 'Budget-friendly',
  mid: 'Mid-range',
  comfort: 'Comfort',
}

function greetingMessage(mode: AssistantMode, hasTrip: boolean): ChatMessage {
  if (mode === 'gemini') {
    return {
      id: 'greeting',
      role: 'bot',
      text: hasTrip
        ? "Hi, I'm Wanderbot with Gemini AI. I can see this trip's name, destination and dates, so ask me anything about pacing, food, neighbourhoods or what to book next."
        : 'Hi, I\'m Wanderbot with Gemini AI. Ask me anything about planning a trip.',
      ideas: [],
    }
  }

  return {
    id: 'greeting',
    role: 'bot',
    text: hasTrip
      ? "Hi, I'm Wanderbot in Basic mode. I answer from a small set of travel playbooks — packing, budgets, timing, food, transport, safety and simple itineraries. For free-form planning, switch me to Gemini AI."
      : "Hi, I'm Wanderbot in Basic mode. Tell me a vibe, a budget or how many days you have, and I'll suggest a trip worth stealing.",
    ideas: [],
  }
}

export function TripAssistantDialog({
  open,
  onClose,
  onPlanTrip,
  tripId,
  tripName,
  tripDestination,
  defaultMode = 'basic',
}: TripAssistantDialogProps) {
  const preferenceQuery = useAssistantPreference(tripId)
  const setPreference = useSetAssistantPreference(tripId)
  const askAssistant = useAskTripAssistant(tripId)

  const hasTrip = Boolean(tripId)
  const [mode, setMode] = useState<AssistantMode>(defaultMode)
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    greetingMessage(defaultMode, hasTrip),
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messageId = useRef(0)
  const timer = useRef<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const wasOpen = useRef(false)
  const userInteracted = useRef(false)
  const appliedPreference = useRef<AssistantMode | null>(null)

  useEffect(() => {
    if (!open) {
      wasOpen.current = false
      return
    }

    const opening = !wasOpen.current
    if (opening) {
      wasOpen.current = true
      userInteracted.current = false
      appliedPreference.current = null
    }

    if (userInteracted.current) return

    const nextMode = preferenceQuery.data ?? defaultMode
    if (!opening && appliedPreference.current === nextMode) return
    if (!opening && preferenceQuery.data == null) return

    appliedPreference.current = nextMode
    setMode(nextMode)
    setMessages([greetingMessage(nextMode, hasTrip)])
    setInput('')
    setThinking(false)
    setError(null)
    messageId.current = 0
    if (timer.current) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }, [open, preferenceQuery.data, defaultMode, hasTrip])

  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current)
    },
    [],
  )

  const busy = thinking || askAssistant.isPending

  const handleModeChange = (nextMode: AssistantMode) => {
    if (busy || nextMode === mode) return
    userInteracted.current = true
    setMode(nextMode)
    setError(null)
    setMessages([greetingMessage(nextMode, hasTrip)])
    setInput('')
    if (tripId) {
      setPreference.mutate(nextMode, {
        onError: (mutationError) => {
          setError(getErrorMessage(mutationError, 'Could not save your assistant preference'))
        },
      })
    }
  }

  const appendReply = (message: Omit<ChatMessage, 'id'>) => {
    setMessages((current) => [
      ...current,
      { ...message, id: `bot-${++messageId.current}` },
    ])
  }

  const sendBasic = (text: string) => {
    setThinking(true)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      const reply = basicTravelReply(text, {
        tripName,
        destination: tripDestination,
      })
      appendReply({ role: 'bot', text: reply.text, ideas: reply.ideas })
      setThinking(false)
      timer.current = null
    }, 400)
  }

  const sendGemini = async (text: string, history: ChatMessage[]) => {
    const turns: AssistantTurn[] = history
      .filter((message) => !message.error && message.text.trim().length > 0)
      .slice(-10)
      .map((message) => ({
        role: message.role === 'user' ? 'user' : 'model',
        text: message.text,
      }))
    turns.push({ role: 'user', text })

    try {
      const answer = await askAssistant.mutateAsync(turns)
      appendReply({ role: 'bot', text: answer.text })
    } catch (requestError) {
      const message = getErrorMessage(
        requestError,
        'The AI assistant could not answer. Try again or switch to Basic mode.',
      )
      setError(message)
      appendReply({
        role: 'bot',
        text: `${message}\n\nYou can keep chatting in Basic mode without an API key.`,
        error: true,
      })
    }
  }

  const sendMessage = (raw: string) => {
    const text = raw.trim()
    if (!text || busy) return
    userInteracted.current = true
    if (mode === 'gemini' && !tripId) {
      setError('Gemini AI is available inside a trip. Open a trip and try again.')
      return
    }

    setError(null)
    setInput('')
    const history = messages
    setMessages((current) => [
      ...current,
      { id: `user-${++messageId.current}`, role: 'user', text },
    ])

    if (mode === 'gemini') {
      void sendGemini(text, history)
    } else {
      sendBasic(text)
    }
  }

  const modeLabel = mode === 'gemini' ? 'Gemini AI' : 'Basic'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Wanderbot trip ideas"
      description={
        hasTrip
          ? 'A shared travel assistant. Basic mode works offline; Gemini AI adds free-form answers.'
          : 'A tiny offline assistant with a soft spot for good itineraries.'
      }
      size="md"
      footer={
        <form
          className="flex w-full items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            sendMessage(input)
          }}
        >
          <Input
            autoFocus
            value={input}
            onChange={(event) => {
              userInteracted.current = true
              setInput(event.target.value)
            }}
            placeholder={
              mode === 'gemini'
                ? 'Ask about food, pacing, neighbourhoods…'
                : 'Ask about packing, budget, timing…'
            }
            aria-label="Message Wanderbot"
            disabled={busy}
          />
          <Button
            type="submit"
            size="icon"
            disabled={busy || input.trim().length === 0}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      }
    >
      <div className="space-y-3">
        {hasTrip ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/70 bg-cream/60 p-2">
            <div className="flex items-center gap-1.5" role="group" aria-label="Assistant mode">
              <ModeButton
                active={mode === 'basic'}
                onClick={() => handleModeChange('basic')}
                icon={<Bot className="h-3.5 w-3.5" />}
                label="Basic"
                disabled={busy || setPreference.isPending}
              />
              <ModeButton
                active={mode === 'gemini'}
                onClick={() => handleModeChange('gemini')}
                icon={<Sparkles className="h-3.5 w-3.5" />}
                label="Gemini AI"
                disabled={busy || setPreference.isPending}
              />
            </div>
            <span className="px-1 text-[11px] font-semibold text-ink-muted">
              {mode === 'gemini' ? 'Free-form AI answers' : 'Curated tips, no API key'}
              {preferenceQuery.data ? ' · your choice' : ' · trip default'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-2xl border border-border/70 bg-cream/60 px-3 py-2 text-[11px] font-bold text-ink-muted">
            <Bot className="h-3.5 w-3.5" /> Basic mode · curated responses
          </div>
        )}

        {error ? (
          <div
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700"
          >
            {error}
          </div>
        ) : null}

        <div ref={scrollRef} className="scrollbar-thin h-[44vh] space-y-3 overflow-y-auto pr-1">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[94%] space-y-2 rounded-2xl px-3.5 py-2.5 text-sm',
                  message.role === 'user'
                    ? 'bg-coral-500 text-white'
                    : message.error
                      ? 'border border-rose-200 bg-rose-50 text-rose-700'
                      : 'border border-border/70 bg-white/70 text-ink-soft',
                )}
              >
                <p className="whitespace-pre-line leading-relaxed">{message.text}</p>

                {message.ideas && message.ideas.length > 0 ? (
                  <div className="space-y-2">
                    {message.ideas.map((idea) => (
                      <article
                        key={idea.id}
                        className="rounded-2xl border border-border/70 bg-surface p-3 text-ink"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-extrabold leading-tight">{idea.name}</p>
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{idea.destination}</span>
                            </p>
                          </div>
                          {onPlanTrip ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="shrink-0"
                              onClick={() => onPlanTrip(idea)}
                              leftIcon={<Sparkles className="h-3.5 w-3.5" />}
                            >
                              Plan
                            </Button>
                          ) : null}
                        </div>

                        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                          {idea.description}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-bold text-ink-muted">
                            {idea.durationDays} days
                          </span>
                          <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-bold text-ink-muted">
                            {BUDGET_LABELS[idea.budget]}
                          </span>
                        </div>

                        <ul className="mt-2 space-y-1 text-[11px] text-ink-muted">
                          {idea.highlights.map((highlight) => (
                            <li key={highlight} className="flex items-start gap-1.5">
                              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-coral-300" />
                              {highlight}
                            </li>
                          ))}
                        </ul>
                      </article>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}

          {thinking || askAssistant.isPending ? (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-white/70 px-3.5 py-2.5 text-sm text-ink-muted">
                <Wand2 className="h-4 w-4 animate-pulse" />
                {mode === 'gemini' ? 'Asking Gemini…' : 'Thinking of somewhere good…'}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">
            {modeLabel}
          </span>
          {mode === 'basic' ? (
            SUGGESTION_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendMessage(prompt)}
                disabled={busy}
                className="rounded-full border border-border bg-white/70 px-2.5 py-1 text-[11px] font-bold text-ink-soft transition hover:border-coral-200 hover:bg-coral-50 hover:text-coral-700 disabled:opacity-60"
              >
                {prompt}
              </button>
            ))
          ) : (
            <span className="text-[11px] font-semibold text-ink-muted">
              Gemini answers are generated by Google and may be inaccurate.
            </span>
          )}
        </div>
      </div>
    </Modal>
  )
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
  disabled,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition disabled:opacity-60',
        active
          ? 'bg-white text-coral-700 shadow-card'
          : 'text-ink-soft hover:bg-white/60 hover:text-ink',
      )}
    >
      {icon}
      {label}
    </button>
  )
}
