import { MapPin, Send, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/utils/cn'
import {
  SUGGESTION_PROMPTS,
  suggestTrips,
  type TripBudget,
  type TripIdea,
} from '../suggestions'

type ChatMessage = {
  id: string
  role: 'bot' | 'user'
  text: string
  ideas?: TripIdea[]
}

type TripAssistantDialogProps = {
  open: boolean
  onClose: () => void
  onPlanTrip: (idea: TripIdea) => void
}

const BUDGET_LABELS: Record<TripBudget, string> = {
  budget: 'Budget-friendly',
  mid: 'Mid-range',
  comfort: 'Comfort',
}

function greetingMessage(): ChatMessage {
  return {
    id: 'greeting',
    role: 'bot',
    text: "Hi, I'm Wanderbot. I know a handful of trips by heart. Tell me a vibe, a budget or how many days you have, and I'll suggest something worth stealing.",
    ideas: [],
  }
}

export function TripAssistantDialog({ open, onClose, onPlanTrip }: TripAssistantDialogProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [greetingMessage()])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const messageId = useRef(0)
  const timer = useRef<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setMessages([greetingMessage()])
    setInput('')
    setThinking(false)
    messageId.current = 0
    if (timer.current) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }, [open])

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

  const sendMessage = (raw: string) => {
    const text = raw.trim()
    if (!text || thinking) return

    setInput('')
    setMessages((current) => [
      ...current,
      { id: `user-${++messageId.current}`, role: 'user', text },
    ])
    setThinking(true)

    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      const reply = suggestTrips(text)
      setMessages((current) => [
        ...current,
        {
          id: `bot-${++messageId.current}`,
          role: 'bot',
          text: reply.text,
          ideas: reply.ideas,
        },
      ])
      setThinking(false)
      timer.current = null
    }, 450)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Wanderbot trip ideas"
      description="A tiny offline assistant with a soft spot for good itineraries."
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
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask for a vibe, budget or destination…"
            aria-label="Message Wanderbot"
          />
          <Button
            type="submit"
            size="icon"
            disabled={thinking || input.trim().length === 0}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      }
    >
      <div className="space-y-3">
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
                          <Button
                            size="sm"
                            variant="secondary"
                            className="shrink-0"
                            onClick={() => onPlanTrip(idea)}
                            leftIcon={<Sparkles className="h-3.5 w-3.5" />}
                          >
                            Plan
                          </Button>
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

          {thinking ? (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-border/70 bg-white/70 px-3.5 py-2.5 text-sm text-ink-muted">
                Thinking of somewhere good…
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {SUGGESTION_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => sendMessage(prompt)}
              disabled={thinking}
              className="rounded-full border border-border bg-white/70 px-2.5 py-1 text-[11px] font-bold text-ink-soft transition hover:border-coral-200 hover:bg-coral-50 hover:text-coral-700 disabled:opacity-60"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}
