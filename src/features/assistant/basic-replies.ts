import type { Locale } from '@/lib/supabase/database.types'
import { getActiveLocale } from '@/i18n/translate'
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

function placeLabel(context: BasicContext, locale: Locale): string {
  if (context.destination) return context.destination
  if (context.tripName) return context.tripName
  return locale === 'vi' ? 'chuyến đi của bạn' : 'your trip'
}

const VI_REPLIES: Record<BasicTopic, (place: string) => string> = {
  packing: (place) =>
    `Cẩm nang đóng gói cơ bản cho ${place}: chọn các lớp áo dễ phối, một đôi giày đi bộ êm và một đôi gọn hơn, bình nước tái sử dụng, sạc dự phòng, kem chống nắng và một túi nhỏ trong ngày. Thêm áo mưa nếu dự báo thất thường, và để trống 20% vali cho đồ mua dọc đường.`,
  budget: (place) =>
    `Quy tắc ngân sách cơ bản cho ${place}: chia 50% cho chỗ ở và di chuyển, 30% cho ăn uống và hoạt động, 20% dự phòng. Theo dõi hai ngày đầu để biết mức chi thật, rồi đặt hạn mức tiền mặt cho những ngày còn lại. Đi bộ và ăn ở chợ thường tiết kiệm nhất mà vẫn vui.`,
  timing: (place) =>
    `Để chọn ngày cho ${place}, hãy so sánh mùa vừa với mùa cao điểm: thời tiết thường tương tự nhưng ít đông hơn. Tránh các dịp lễ lớn nếu có thể, và giữ một ngày linh hoạt cho thời tiết. Xem dự báo khoảng một tuần trước thay vì trước vài tháng.`,
  food: (place) =>
    `Kế hoạch ăn uống cơ bản cho ${place}: chọn một khu chợ, một quán trong khu phố và một bữa thật đặc biệt. Ăn nơi có người địa phương xếp hàng, hỏi món đang mùa và mang theo đồ ăn nhẹ cho ngày di chuyển dài. Nếu có yêu cầu ăn kiêng, hãy lưu sẵn câu cần nói bằng tiếng địa phương.`,
  transport: (place) =>
    `Để đi lại ở ${place}, hãy so sánh vé ngày với vé lẻ sau khi đã phác hai ngày đầu. Đi bộ kết hợp một chuyến xe chung thường nhanh hơn chạy giữa các điểm tham quan trả phí. Chừa 60–90 phút quanh mỗi lần chuyển tuyến và chụp lại lộ trình phòng khi mất mạng.`,
  safety: (place) =>
    `Danh sách an toàn cơ bản cho ${place}: chia sẻ kế hoạch sơ bộ với người ở nhà, giữ bản sao giấy và bản số của giấy tờ quan trọng, chia tiền và thẻ ở nhiều nơi, lưu số khẩn cấp địa phương. Thống nhất điểm hẹn trước một đêm đi chơi. Nếu thấy không ổn, hãy rời đi — không điểm nào đáng để mạo hiểm.`,
  itinerary: (place) =>
    `Một nhịp cơ bản nhẹ nhàng cho ${place}: một hoạt động chính buổi sáng, bữa trưa dài, một khoảng chiều linh hoạt và buổi tối nhẹ nhàng. Nhóm các điểm theo khu phố để giảm thời gian di chuyển. Để trống mỗi khoảng thứ ba để có thể nhận một gợi ý hay mà không phải đổi cả ngày.`,
  family: (place) =>
    `Khi đi cùng trẻ ở ${place}, hãy lên kế hoạch quanh một hoạt động lớn mỗi ngày và để buổi chiều rảnh. Mang đồ ăn nhẹ, khăn ướt và một bộ quần áo dự phòng. Chọn chỗ ở có bếp hoặc máy giặt nếu được, và kiểm tra lối đi xe đẩy trước khi chọn tuyến đi bộ dài.`,
  solo: (place) =>
    `Cho chuyến đi một mình đến ${place}: ở nơi có khu sinh hoạt chung dễ trò chuyện, đặt phòng đêm đầu trước khi đến và giữ một buổi báo an toàn mỗi ngày với người ở nhà. Ngồi quầy bar, tham gia một hoạt động nhóm nhỏ và có phương án dự phòng cho chuyến đến muộn.`,
  documents: (place) =>
    `Kiểm tra giấy tờ cơ bản cho ${place}: xác nhận hộ chiếu còn hiệu lực cho cả chuyến đi, kiểm tra quy định visa hoặc nhập cảnh trên trang chính thức của chính phủ, và lưu bản offline hộ chiếu, bảo hiểm và đặt chỗ. Quy định có thể thay đổi, nên hãy kiểm tra sát ngày đi.`,
  thanks: () =>
    'Không có gì. Cho mình biết điểm đến, số ngày hoặc không khí bạn muốn, mình có thể gợi ý một kế hoạch khởi đầu.',
  greeting: () =>
    'Chào bạn! Mình là Wanderbot ở chế độ Cơ bản. Mình có thể giúp về đóng gói, ngân sách, thời điểm, ăn uống, di chuyển, an toàn và lịch trình đơn giản. Muốn trò chuyện tự do, hãy chuyển mình sang Gemini AI.',
  ideas: () =>
    'Mình đang ở chế độ Cơ bản nên trả lời từ một bộ cẩm nang nhỏ: đóng gói, ngân sách, thời điểm, ăn uống, di chuyển, an toàn, lịch trình, gia đình và đi một mình. Thử hỏi “Mình nên mang gì?” hoặc “Lên ngân sách cho chuyến này thế nào?”. Chuyển sang Gemini AI để được tư vấn tự do.',
  fallback: () =>
    'Mình đang ở chế độ Cơ bản nên trả lời từ một bộ cẩm nang nhỏ: đóng gói, ngân sách, thời điểm, ăn uống, di chuyển, an toàn, lịch trình, gia đình và đi một mình. Thử hỏi “Mình nên mang gì?” hoặc “Lên ngân sách cho chuyến này thế nào?”. Chuyển sang Gemini AI để được tư vấn tự do.',
}

function replyFor(topic: BasicTopic, context: BasicContext, locale: Locale): string {
  const place = placeLabel(context, locale)

  if (locale === 'vi') {
    return VI_REPLIES[topic](place)
  }

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
export function basicTravelReply(
  input: string,
  context: BasicContext = {},
  locale: Locale = getActiveLocale(),
): BasicReply {
  const text = input.trim().toLowerCase()
  if (!text) return { topic: 'fallback', text: replyFor('fallback', context, locale), ideas: [] }

  const matched = PATTERNS.find((entry) => entry.pattern.test(text))
  if (matched && matched.topic !== 'thanks' && matched.topic !== 'greeting') {
    const ideaReply = suggestTrips(input, locale)
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
    return { topic: matched.topic, text: replyFor(matched.topic, context, locale), ideas: [] }
  }

  if (matched) {
    return { topic: matched.topic, text: replyFor(matched.topic, context, locale), ideas: [] }
  }

  const ideaReply = suggestTrips(input, locale)
  const hasIdeaSignal =
    /(\d{1,2})\s*(day|days|night|nights|ngay|ngày)|weekend|beach|mountain|city|budget|surprise|biển|núi|thành phố|đi /.test(
      text,
    )

  if (hasIdeaSignal) {
    return { topic: 'ideas', text: ideaReply.text, ideas: ideaReply.ideas }
  }

  return { topic: 'fallback', text: replyFor('fallback', context, locale), ideas: [] }
}
