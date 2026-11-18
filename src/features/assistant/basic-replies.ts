import { suggestTrips, type TripIdea } from './suggestions'

export type BasicTopic =
  | 'greeting'
  | 'packing'
  | 'budget'
  | 'timing'
  | 'food'
  | 'transport'
  | 'safety'
  | 'itinerary'
  | 'family'
  | 'solo'
  | 'documents'
  | 'thanks'
  | 'ideas'
  | 'fallback'

export type BasicReply = {
  topic: BasicTopic
  text: string
  ideas: TripIdea[]
}

type BasicContext = {
  tripName?: string
  destination?: string
}

const PATTERNS: { topic: BasicTopic; pattern: RegExp }[] = [
  {
    topic: 'packing',
    pattern: /pack|packing|bring|luggage|suitcase|đồ|do dung|hành lý|hanh ly|mang theo/,
  },
  {
    topic: 'budget',
    pattern: /budget|cost|price|money|cheap|expensive|save|tiết kiệm|tiet kiem|chi phí|chi phi|ngân sách|ngan sach/,
  },
  {
    topic: 'timing',
    pattern: /best time|when to|season|weather|rain|hot|cold|mùa|mua|thời tiết|thoi tiet|mưa|mua/,
  },
  {
    topic: 'food',
    pattern: /food|eat|restaurant|cuisine|dish|breakfast|lunch|dinner|ăn|an uong|ẩm thực|am thuc|quán|quan/,
  },
  {
    topic: 'transport',
    pattern: /transport|get around|bus|train|taxi|grab|motorbike|scooter|flight|xe|di chuyển|di chuyen/,
  },
  {
    topic: 'safety',
    pattern: /safe|safety|scam|emergency|insurance|an toàn|an toan|lừa đảo|lua dao/,
  },
  {
    topic: 'itinerary',
    pattern: /itinerary|schedule|plan my|lịch trình|lich trinh|kế hoạch|ke hoach/,
  },
  {
    topic: 'family',
    pattern: /kids|children|family|baby|trẻ|tre em|gia đình|gia dinh/,
  },
  {
    topic: 'solo',
    pattern: /solo|alone|by myself|một mình|mot minh/,
  },
  {
    topic: 'documents',
    pattern: /visa|passport|document|hộ chiếu|ho chieu|thị thực|thi thuc/,
  },
  { topic: 'thanks', pattern: /thanks|thank you|cảm ơn|cam on/ },
  { topic: 'greeting', pattern: /^(hi|hello|hey|xin chào|xin chao|chào|chao)\b/ },
]

function placeLabel(context: BasicContext): string {
  if (context.destination) return context.destination
  if (context.tripName) return context.tripName
  return 'your trip'
}

function replyFor(topic: BasicTopic, context: BasicContext): string {
  const place = placeLabel(context)

  switch (topic) {
    case 'packing':
      return `Basic packing playbook for ${place}: layers you can mix, one comfortable walking pair plus one smarter pair, a refillable bottle, a compact charger, sunscreen, and a small day bag. Add rain gear if the forecast is unsettled, and leave 20% of the suitcase empty for things you pick up.`
    case 'budget':
      return `Basic budget rule for ${place}: split your spend into 50% beds and transport, 30% food and activities, 20% buffer. Track the first two days to find your real daily number, then set a cash limit for the rest. Free walking routes and market meals usually save the most without thinning the trip.`
    case 'timing':
      return `To choose dates for ${place}, compare the shoulder season with the busy season: you usually get similar weather and fewer crowds. Avoid the biggest public-holiday weekends if you can, and keep one flexible day for weather. Check a local forecast about a week out rather than months ahead.`
    case 'food':
      return `Basic food plan for ${place}: pick one market, one neighbourhood restaurant and one special meal. Eat where the queue is local, ask what is in season, and keep a backup snack for long transfer days. If you have dietary needs, save the phrase in the local language before you go.`
    case 'transport':
      return `For getting around ${place}, compare a day pass against single tickets after you map your first two days. Walking plus one shared ride is often faster than hopping between paid attractions. Keep 60–90 minutes of slack around any transfer, and screenshot the route in case the signal drops.`
    case 'safety':
      return `Basic safety checklist for ${place}: share your rough plan with someone at home, keep a digital and paper copy of key documents, split cards and cash, and save the local emergency number. Agree on a meeting point before a busy night out. If something feels off, leave — no attraction is worth the risk.`
    case 'itinerary':
      return `A calm basic shape for ${place}: one anchor activity in the morning, a long lunch, one flexible afternoon block, and a low-effort evening. Group stops by neighbourhood to cut travel time. Leave every third slot empty so a good recommendation can fit without reshuffling the whole day.`
    case 'family':
      return `With kids in ${place}, plan around one big activity per day and keep afternoons free. Pack snacks, wipes and a change of clothes in the day bag. Choose stays with a kitchen or laundry when possible, and check stroller access before committing to a long walking route.`
    case 'solo':
      return `For a solo trip to ${place}: stay somewhere with a social common area, book the first night before you arrive, and keep a simple daily check-in with someone at home. Eat at the counter, join one small group activity, and keep a backup plan for late arrivals.`
    case 'documents':
      return `Basic document check for ${place}: confirm passport validity for the whole trip, check the visa or entry rules on the official government site, and keep offline copies of your passport, insurance and bookings. Rules can change, so verify close to departure.`
    case 'thanks':
      return 'Anytime. Tell me a destination, a number of days or a vibe, and I can suggest a starting plan.'
    case 'greeting':
      return 'Hi! I am Wanderbot in Basic mode. I can help with packing, budgets, timing, food, transport, safety and a simple itinerary. For free-form conversation, switch me to Gemini AI.'
    case 'ideas':
    case 'fallback':
    default:
      return 'I am in Basic mode, so I answer from a small set of travel playbooks: packing, budgets, timing, food, transport, safety, itineraries, family and solo trips. Try “What should I pack?” or “How do I budget for this trip?”. Switch to Gemini AI for free-form planning.'
  }
}

/**
 * Deterministic Basic-mode responder. It never calls a remote model and never
 * pretends to be one: unmatched questions get an explicit fallback.
 */
export function basicTravelReply(input: string, context: BasicContext = {}): BasicReply {
  const text = input.trim().toLowerCase()
  if (!text) return { topic: 'fallback', text: replyFor('fallback', context), ideas: [] }

  const matched = PATTERNS.find((entry) => entry.pattern.test(text))
  if (matched && matched.topic !== 'thanks' && matched.topic !== 'greeting') {
    const ideaReply = suggestTrips(input)
    const asksForIdeas = /suggest|idea|where should|where to|surprise me|recommend a trip|gợi ý|goi y|đi đâu|di dau/.test(text)
    const looksLikeIdeaRequest =
      !asksForIdeas &&
      /(\d{1,2})\s*(day|days|night|nights|ngay|ngày)|weekend|beach|mountain|city|food trip|surprise/.test(
        text,
      ) &&
      !/\b(what|how|should|can|could|why|when|where)\b/.test(text)
    if (looksLikeIdeaRequest) {
      return { topic: 'ideas', text: ideaReply.text, ideas: ideaReply.ideas }
    }
    return { topic: matched.topic, text: replyFor(matched.topic, context), ideas: [] }
  }

  if (matched) {
    return { topic: matched.topic, text: replyFor(matched.topic, context), ideas: [] }
  }

  const ideaReply = suggestTrips(input)
  const hasIdeaSignal =
    /(\d{1,2})\s*(day|days|night|nights|ngay|ngày)|weekend|beach|mountain|city|budget|surprise|biển|núi|thành phố|đi /.test(
      text,
    )

  if (hasIdeaSignal) {
    return { topic: 'ideas', text: ideaReply.text, ideas: ideaReply.ideas }
  }

  return { topic: 'fallback', text: replyFor('fallback', context), ideas: [] }
}
