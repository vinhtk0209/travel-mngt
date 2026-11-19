import { Bot, MapPin, Send, Sparkles, Wand2 } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import type { AssistantMode } from '@/lib/supabase/database.types'
import { cn } from '@/utils/cn'
import { getErrorMessage } from '@/utils/errors'
import { useI18n } from '@/i18n/i18n-context'
import type { TranslationKey } from '@/i18n/translate'
import { basicTravelReply } from '../basic-replies'
import { useAskTripAssistant, useAssistantPreference, useSetAssistantPreference } from '../hooks'
import type { TripBudget, TripIdea } from '../suggestions'
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

const BUDGET_KEYS: Record<TripBudget, TranslationKey> = {
  budget: 'assistant.budgetBudget',
  mid: 'assistant.budgetMid',
  comfort: 'assistant.budgetComfort',
}

const SUGGESTION_KEYS: TranslationKey[] = [
  'assistant.suggest1',
  'assistant.suggest2',
  'assistant.suggest3',
  'assistant.suggest4',
  'assistant.suggest5',
]

type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string

function greetingMessage(mode: AssistantMode, hasTrip: boolean, t: Translate): ChatMessage {
  if (mode === 'gemini') {
    return {
      id: 'greeting',
      role: 'bot',
      text: hasTrip ? t('assistant.greetingGeminiTrip') : t('assistant.greetingGemini'),
      ideas: [],
    }
  }

  return {
    id: 'greeting',
    role: 'bot',
    text: hasTrip ? t('assistant.greetingBasicTrip') : t('assistant.greetingBasic'),
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
  const { t } = useI18n()
  const preferenceQuery = useAssistantPreference(tripId)
  const setPreference = useSetAssistantPreference(tripId)
  const askAssistant = useAskTripAssistant(tripId)

  const hasTrip = Boolean(tripId)
  const [mode, setMode] = useState<AssistantMode>(defaultMode)
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    greetingMessage(defaultMode, hasTrip, t),
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
    setMessages([greetingMessage(nextMode, hasTrip, t)])
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
    setMessages([greetingMessage(nextMode, hasTrip, t)])
    setInput('')
    if (tripId) {
      setPreference.mutate(nextMode, {
        onError: (mutationError) => {
          setError(getErrorMessage(mutationError, t('assistant.preferenceError')))
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
      const message = getErrorMessage(requestError, t('assistant.errorBody'))
      setError(message)
      appendReply({
        role: 'bot',
        text: `${message}\n\n${t('assistant.errorSuffix')}`,
        error: true,
      })
    }
  }

  const sendMessage = (raw: string) => {
    const text = raw.trim()
    if (!text || busy) return
    userInteracted.current = true
    if (mode === 'gemini' && !tripId) {
      setError(t('assistant.geminiNeedsTrip'))
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

  const modeLabel = mode === 'gemini' ? t('assistant.gemini') : t('assistant.basic')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('assistant.title')}
      description={hasTrip ? t('assistant.descriptionTrip') : t('assistant.descriptionGlobal')}
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
                ? t('assistant.placeholderGemini')
                : t('assistant.placeholderBasic')
            }
            aria-label={t('assistant.messageLabel')}
            disabled={busy}
          />
          <Button
            type="submit"
            size="icon"
            disabled={busy || input.trim().length === 0}
            aria-label={t('assistant.send')}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      }
    >
      <div className="space-y-3">
        {hasTrip ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/70 bg-cream/60 p-2">
            <div className="flex items-center gap-1.5" role="group" aria-label={t('assistant.modeGroup')}>
              <ModeButton
                active={mode === 'basic'}
                onClick={() => handleModeChange('basic')}
                icon={<Bot className="h-3.5 w-3.5" />}
                label={t('assistant.basic')}
                disabled={busy || setPreference.isPending}
              />
              <ModeButton
                active={mode === 'gemini'}
                onClick={() => handleModeChange('gemini')}
                icon={<Sparkles className="h-3.5 w-3.5" />}
                label={t('assistant.gemini')}
                disabled={busy || setPreference.isPending}
              />
            </div>
            <span className="px-1 text-[11px] font-semibold text-ink-muted">
              {mode === 'gemini' ? t('assistant.freeForm') : t('assistant.curated')}
              {preferenceQuery.data ? t('assistant.yourChoice') : t('assistant.tripDefault')}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-2xl border border-border/70 bg-cream/60 px-3 py-2 text-[11px] font-bold text-ink-muted">
            <Bot className="h-3.5 w-3.5" /> {t('assistant.basicOnly')}
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
                              {t('assistant.plan')}
                            </Button>
                          ) : null}
                        </div>

                        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                          {idea.description}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-bold text-ink-muted">
                            {t('assistant.days', { count: idea.durationDays })}
                          </span>
                          <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-bold text-ink-muted">
                            {t(BUDGET_KEYS[idea.budget])}
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
                {mode === 'gemini' ? t('assistant.thinkingGemini') : t('assistant.thinkingBasic')}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">
            {modeLabel}
          </span>
          {mode === 'basic' ? (
            SUGGESTION_KEYS.map((promptKey) => {
              const prompt = t(promptKey)
              return (
                <button
                  key={promptKey}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  disabled={busy}
                  className="rounded-full border border-border bg-white/70 px-2.5 py-1 text-[11px] font-bold text-ink-soft transition hover:border-coral-200 hover:bg-coral-50 hover:text-coral-700 disabled:opacity-60"
                >
                  {prompt}
                </button>
              )
            })
          ) : (
            <span className="text-[11px] font-semibold text-ink-muted">
              {t('assistant.disclaimer')}
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
