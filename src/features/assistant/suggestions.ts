export type TripIdeaTag = 'beach' | 'mountain' | 'city' | 'food' | 'culture' | 'nature' | 'chill'
export type TripBudget = 'budget' | 'mid' | 'comfort'

import { getActiveLocale, translate, type TranslationKey } from '@/i18n/translate'
import type { Locale } from '@/lib/supabase/database.types'

export type TripIdea = {
  id: string
  name: string
  destination: string
  description: string
  durationDays: number
  budget: TripBudget
  tags: TripIdeaTag[]
  highlights: string[]
  aliases?: string[]
}

export type AssistantReply = {
  text: string
  ideas: TripIdea[]
}

export const SUGGESTION_PROMPTS = [
  '3 days by the beach',
  'Cool mountain escape for 2 days',
  'Food-focused city weekend',
  'A budget trip for 4 days',
  'Surprise me somewhere new',
] as const

const IDEAS: TripIdea[] = [
  {
    id: 'da-lat-slow',
    name: 'Da Lat Slow Weekend',
    destination: 'Da Lat, Vietnam',
    description: 'Pine air, lake-side coffee and a night market that smells like grilled rice paper.',
    durationDays: 3,
    budget: 'budget',
    tags: ['mountain', 'chill', 'food', 'nature'],
    highlights: ['Morning coffee by the lake', 'Waterfall and pine forest walk', 'Night market snack crawl'],
  },
  {
    id: 'hoi-an-da-nang',
    name: 'Hoi An & Da Nang',
    destination: 'Hoi An, Vietnam',
    description: 'Lanterns, long beaches and the best bowl of cao lau you will ever have.',
    durationDays: 4,
    budget: 'mid',
    tags: ['beach', 'city', 'food', 'culture'],
    highlights: ['Old town lantern walk', 'An Bang beach morning', 'Seafood dinner by the Han River'],
    aliases: ['danang', 'da nang'],
  },
  {
    id: 'cat-ba',
    name: 'Ha Long Bay & Cat Ba',
    destination: 'Cat Ba Island, Vietnam',
    description: 'Limestone islands, kayak caves and sunsets that make everyone go quiet.',
    durationDays: 3,
    budget: 'mid',
    tags: ['beach', 'nature', 'chill'],
    highlights: ['Bay cruise through the karsts', 'Kayak and swim stop', 'Seafood on the harbour'],
    aliases: ['halong', 'ha long'],
  },
  {
    id: 'sa-pa',
    name: 'Sa Pa Rice Terraces',
    destination: 'Sa Pa, Vietnam',
    description: 'Cool mountain mornings, village homestays and terraces that look painted on.',
    durationDays: 4,
    budget: 'budget',
    tags: ['mountain', 'nature', 'culture'],
    highlights: ['Terraced valley trek', 'Hmong village homestay', 'Fansipan viewpoint'],
    aliases: ['sapa'],
  },
  {
    id: 'phu-quoc',
    name: 'Phu Quoc Escape',
    destination: 'Phu Quoc, Vietnam',
    description: 'Barefoot days, warm water and a night market built for seafood lovers.',
    durationDays: 5,
    budget: 'comfort',
    tags: ['beach', 'chill', 'food'],
    highlights: ['Sunset beach swim', 'Snorkel and island hop', 'Night market seafood feast'],
    aliases: ['phuquoc'],
  },
  {
    id: 'ninh-binh',
    name: 'Ninh Binh Rice Paddies',
    destination: 'Ninh Binh, Vietnam',
    description: 'A two-day reset of boat rides, limestone peaks and very quiet country roads.',
    durationDays: 2,
    budget: 'budget',
    tags: ['nature', 'culture', 'chill'],
    highlights: ['Trang An boat ride', 'Hang Mua viewpoint climb', 'Village cycling loop'],
  },
  {
    id: 'hue-heritage',
    name: 'Hue Heritage Days',
    destination: 'Hue, Vietnam',
    description: 'Imperial history, river boats and a food scene that deserves its own trip.',
    durationDays: 3,
    budget: 'budget',
    tags: ['culture', 'food', 'city'],
    highlights: ['Imperial City at sunrise', 'Perfume River boat ride', 'Bun bo Hue tasting'],
  },
  {
    id: 'bangkok-bites',
    name: 'Bangkok Street Bites',
    destination: 'Bangkok, Thailand',
    description: 'Skytrain hops, temple mornings and street food until you cannot move.',
    durationDays: 4,
    budget: 'mid',
    tags: ['city', 'food', 'culture'],
    highlights: ['Chinatown food walk', 'Temple and river ferry day', 'Rooftop sunset drink'],
  },
  {
    id: 'bali-reset',
    name: 'Bali Reset',
    destination: 'Ubud, Indonesia',
    description: 'Rice terraces, slow breakfasts and a beach day at the end of the week.',
    durationDays: 6,
    budget: 'mid',
    tags: ['nature', 'chill', 'beach', 'culture'],
    highlights: ['Rice terrace sunrise walk', 'Waterfall and temple loop', 'Beach club afternoon'],
  },
  {
    id: 'tokyo-week',
    name: 'Tokyo in a Week',
    destination: 'Tokyo, Japan',
    description: 'Neon nights, tiny bars and day trips that make a week feel too short.',
    durationDays: 7,
    budget: 'comfort',
    tags: ['city', 'food', 'culture'],
    highlights: ['Shibuya and Shinjuku nights', 'Sushi breakfast at the market', 'Kamakura day trip'],
  },
]

const IDEA_COPY_VI: Record<string, Pick<TripIdea, 'name' | 'description' | 'highlights'>> = {
  'da-lat-slow': {
    name: 'Đà Lạt cuối tuần chậm',
    description: 'Không khí thông reo, cà phê bên hồ và chợ đêm thơm mùi bánh tráng nướng.',
    highlights: ['Cà phê sáng bên hồ', 'Đi bộ trong rừng thông và thác', 'Ăn vặt chợ đêm'],
  },
  'hoi-an-da-nang': {
    name: 'Hội An & Đà Nẵng',
    description: 'Đèn lồng, bãi biển dài và tô cao lầu ngon nhất bạn từng thử.',
    highlights: ['Dạo phố cổ đèn lồng', 'Sáng ở biển An Bàng', 'Hải sản bên sông Hàn'],
  },
  'cat-ba': {
    name: 'Vịnh Hạ Long & Cát Bà',
    description: 'Đảo đá vôi, hang kayak và hoàng hôn khiến mọi người lặng đi.',
    highlights: ['Du thuyền qua các đảo đá', 'Dừng chèo kayak và tắm', 'Hải sản ở cảng'],
  },
  'sa-pa': {
    name: 'Ruộng bậc thang Sa Pa',
    description: 'Sáng núi mát, homestay bản làng và ruộng bậc thang như tranh vẽ.',
    highlights: ['Trek thung lũng bậc thang', 'Homestay bản H\'Mông', 'Ngắm Fansipan'],
  },
  'phu-quoc': {
    name: 'Phú Quốc thư giãn',
    description: 'Ngày chân trần, nước ấm và chợ đêm dành cho người mê hải sản.',
    highlights: ['Tắm biển lúc hoàng hôn', 'Lặn ngắm san hô và đảo', 'Đại tiệc hải sản chợ đêm'],
  },
  'ninh-binh': {
    name: 'Ruộng lúa Ninh Bình',
    description: 'Hai ngày thuyền, núi đá vôi và đường quê yên tĩnh để nạp lại năng lượng.',
    highlights: ['Thuyền Tràng An', 'Leo Hang Múa', 'Đạp xe vòng quanh làng'],
  },
  'hue-heritage': {
    name: 'Huế di sản',
    description: 'Lịch sử cung đình, thuyền sông và ẩm thực xứng đáng một chuyến riêng.',
    highlights: ['Đại Nội lúc bình minh', 'Thuyền trên sông Hương', 'Thử bún bò Huế'],
  },
  'bangkok-bites': {
    name: 'Bangkok ẩm thực đường phố',
    description: 'Tàu điện, chùa buổi sáng và đồ ăn đường phố đến khi no nê.',
    highlights: ['Food tour phố người Hoa', 'Ngày chùa và phà sông', 'Ngắm hoàng hôn trên sân thượng'],
  },
  'bali-reset': {
    name: 'Bali nạp lại',
    description: 'Ruộng bậc thang, bữa sáng chậm và một ngày biển cuối tuần.',
    highlights: ['Đi bộ ruộng bậc thang lúc bình minh', 'Thác nước và chùa', 'Chiều ở beach club'],
  },
  'tokyo-week': {
    name: 'Tokyo trong một tuần',
    description: 'Đêm neon, quán nhỏ và chuyến đi trong ngày khiến một tuần thành quá ngắn.',
    highlights: ['Đêm Shibuya và Shinjuku', 'Sushi sáng ở chợ', 'Đi trong ngày đến Kamakura'],
  },
}

function localizeIdea(idea: TripIdea, locale: Locale): TripIdea {
  if (locale !== 'vi') return idea
  const copy = IDEA_COPY_VI[idea.id]
  return copy ? { ...idea, ...copy } : idea
}

const TAG_LABELS: Record<TripIdeaTag, TranslationKey> = {
  beach: 'suggestions.tag.beach',
  mountain: 'suggestions.tag.mountain',
  city: 'suggestions.tag.city',
  food: 'suggestions.tag.food',
  culture: 'suggestions.tag.culture',
  nature: 'suggestions.tag.nature',
  chill: 'suggestions.tag.chill',
}

const TAG_PATTERNS: Record<TripIdeaTag, RegExp> = {
  beach:
    /beach|beaches|sea|seaside|island|islands|coast|sand|snorkel|surf|biển|bien|đảo|dao|hải|hai/,
  mountain:
    /mountain|mountains|hike|hiking|trek|trekking|hill|cool|cold|pine|núi|nui|đồi|doi|lạnh|lanh|cool weather/,
  city: /city|urban|shopping|mall|nightlife|club|bar|metropolitan|thành phố|thanh pho|phố|pho/,
  food: /food|eat|eating|cuisine|street food|coffee|cafe|market|ăn|am thuc|ẩm thực|cà phê|ca phe|quán|quan/,
  culture:
    /culture|cultural|history|historic|temple|pagoda|heritage|museum|di tích|di tich|chùa|chua|đền|den/,
  nature: /nature|waterfall|national park|forest|lake|river|cave|thác|thac|hồ|ho|rừng|rung/,
  chill: /chill|relax|slow|quiet|spa|resort|calm|peace|thư giãn|thu gian|nghỉ|nghi/,
}

function parseDays(text: string): number | null {
  const numeric = text.match(
    /(\d{1,2})\s*(?:-|to|or)?\s*(day|days|night|nights|ngay|ngày|dem|đêm)/,
  )
  if (numeric) {
    const value = Number(numeric[1])
    if (value >= 1 && value <= 21) return value
  }
  if (/weekend|cuối tuần|cuoi tuan/.test(text)) return 3
  if (/\bweek\b|tuần|tuan/.test(text)) return 7
  return null
}

function parseBudget(text: string): TripBudget {
  if (/luxury|premium|splurge|comfort|resort|sang|cao cấp|cao cap/.test(text)) return 'comfort'
  if (/budget|cheap|affordable|student|tiết kiệm|tiet kiem|rẻ|re|low cost/.test(text)) {
    return 'budget'
  }
  return 'mid'
}

function scoreIdea(
  idea: TripIdea,
  wanted: TripIdeaTag[],
  days: number | null,
  budget: TripBudget,
  text: string,
): number {
  let score = 0
  for (const tag of wanted) {
    if (idea.tags.includes(tag)) score += 3
  }

  const destinationKey = idea.destination.split(',')[0].trim().toLowerCase()
  if (destinationKey && text.includes(destinationKey)) score += 12
  if (idea.aliases?.some((alias) => text.includes(alias))) score += 12
  if (text.includes(idea.name.toLowerCase())) score += 12

  if (days) {
    const difference = Math.abs(idea.durationDays - days)
    if (difference === 0) score += 3
    else if (difference === 1) score += 1
    else if (difference > 2) score -= 2
  }

  if (budget === idea.budget) score += 2
  else if (budget === 'mid' && idea.budget !== 'comfort') score += 1

  return score
}

export function suggestTrips(input: string, locale: Locale = getActiveLocale()): AssistantReply {
  const text = input.trim().toLowerCase()
  const days = parseDays(text)
  const budget = parseBudget(text)
  const wanted = (Object.keys(TAG_PATTERNS) as TripIdeaTag[]).filter((tag) =>
    TAG_PATTERNS[tag].test(text),
  )

  const ranked = IDEAS.map((idea) => ({
    idea,
    score: scoreIdea(idea, wanted, days, budget, text),
  })).sort((a, b) => b.score - a.score)

  const ideas = ranked.slice(0, 4).map((entry) => entry.idea)

  const localized = ideas.map((idea) => localizeIdea(idea, locale))

  if (wanted.length > 0 && days) {
    return {
      text: translate('suggestions.replyTagsDays', {
        days,
        tags: describeTags(wanted, locale),
      }),
      ideas: localized,
    }
  }

  if (wanted.length > 0) {
    return {
      text: translate('suggestions.replyTags', { tags: describeTags(wanted, locale) }),
      ideas: localized,
    }
  }

  if (days) {
    return {
      text: translate('suggestions.replyDays', { days }),
      ideas: localized,
    }
  }

  return {
    text: translate('suggestions.replyGeneral'),
    ideas: localized,
  }
}

function describeTags(tags: TripIdeaTag[], locale: Locale): string {
  const labels = tags.map((tag) => translate(TAG_LABELS[tag], undefined, locale))
  if (labels.length === 1) return labels[0]
  return `${labels.slice(0, -1).join(', ')} ${translate('suggestions.and', undefined, locale)} ${labels[labels.length - 1]}`
}
