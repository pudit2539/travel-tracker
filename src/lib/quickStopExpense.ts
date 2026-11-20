// src/lib/quickStopExpense.ts

export interface QuickExpensePrefill {
  title: string;
  category: string;
  currency: string;
  spent_at: string;
}

export interface DaySummaryInfo {
  day: string;
  dayNumber: number;
  totalStops: number;
  visitedStops: number;
  primaryCity: string;
  progressPct: number;
  isComplete: boolean;
}

const THAI_MONTH_MAP: Record<string, number> = {
  'ม.ค.': 1, 'มกราคม': 1,
  'ก.พ.': 2, 'กุมภาพันธ์': 2,
  'มี.ค.': 3, 'มีนาคม': 3,
  'เม.ย.': 4, 'เมษายน': 4,
  'พ.ค.': 5, 'พฤษภาคม': 5,
  'มิ.ย.': 6, 'มิถุนายน': 6,
  'ก.ค.': 7, 'กรกฎาคม': 7,
  'ส.ค.': 8, 'สิงหาคม': 8,
  'ก.ย.': 9, 'กันยายน': 9,
  'ต.ค.': 10, 'ตุลาคม': 10,
  'พ.ย.': 11, 'พฤศจิกายน': 11,
  'ธ.ค.': 12, 'ธันวาคม': 12,
};

const ENG_MONTH_MAP: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/**
 * Infers the best DEFAULT_CATEGORIES id from an itinerary stop's name & metadata.
 */
export function inferExpenseCategoryFromStop(item?: any): string {
  if (!item) return 'food';
  const text = `${item.main_place || item.title || ''} ${item.food_recommendation || ''} ${item.category || ''}`.toLowerCase();

  if (/(สนามบิน|airport|flight|เที่ยวบิน|บิน|kix|nrt|hnd|suvarnabhumi|สุวรรณภูมิ)/.test(text)) {
    return 'flight';
  }
  if (/(โรงแรม|ที่พัก|เช็คอินที่พัก|เช็กอินโรงแรม|hotel|ryokan|hostel|inn|check-in hotel)/.test(text)) {
    return 'hotel';
  }
  if (/(ชินคันเซ็น|รถไฟ|รถบัส|แท็กซี่|สถานี|shinkansen|haruka|limousine|taxi|subway|metro|station|transfer|icoca|suica)/.test(text)) {
    return 'transport';
  }
  if (/(usj|universal|disney|aquarium|ไคยูคัง|ปราสาท|วัด|ศาลเจ้า|พิพิธภัณฑ์|museum|temple|shrine|castle|tower|sky|teamlab|observatory|ticket|บัตรเข้า)/.test(text)) {
    return 'ticket';
  }
  if (/(ช้อป|ชอปปิง|ตลาด|outlet|donki|don quijote|parco|loft|shopping|mall|department|mitsui|rinku|bic camera|matsumoto|drugstore|ของฝาก|ย่านการค้า)/.test(text)) {
    return 'shopping';
  }
  if (/(ราเมง|ซูชิ|เนื้อ|วากิว|คาเฟ่|กาแฟ|มัทฉะ|ชาเขียว|ขนม|บุฟเฟ่ต์|อิซากายะ|อาหาร|มื้อ|ramen|sushi|wagyu|yakiniku|cafe|coffee|matcha|izakaya|restaurant|curry|tempura|udon|bakery|street food|kuromon|ตลาดปลา)/.test(text)) {
    return 'food';
  }
  return 'other';
}

/**
 * Resolves a YYYY-MM-DD date string from a stop's `date_label` (e.g. "6 ธ.ค.", "04-Dec")
 * falling back to today's local date.
 */
export function resolveStopExpenseDate(dateLabel?: string | null, tripStartDate?: string | null): string {
  const todayIso = new Date().toISOString().split('T')[0];
  if (!dateLabel) return todayIso;

  const yearFromTrip = (() => {
    if (tripStartDate) {
      const m = tripStartDate.match(/^(\d{4})/);
      if (m) return Number(m[1]);
    }
    return new Date().getFullYear();
  })();

  // Match ISO date YYYY-MM-DD inside label
  const isoMatch = dateLabel.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  // Match Thai format like "6 ธ.ค." or "12 ธันวาคม"
  for (const [thaiMonth, monthNum] of Object.entries(THAI_MONTH_MAP)) {
    if (dateLabel.includes(thaiMonth)) {
      const dayMatch = dateLabel.match(/(\d{1,2})\s*(?=[ก-ฮ])/);
      if (dayMatch) {
        const dd = String(Number(dayMatch[1])).padStart(2, '0');
        const mm = String(monthNum).padStart(2, '0');
        return `${yearFromTrip}-${mm}-${dd}`;
      }
    }
  }

  // Match English format like "04-Dec" or "4 Dec"
  const engMatch = dateLabel.match(/(\d{1,2})[\s\-/]+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i);
  if (engMatch) {
    const dd = String(Number(engMatch[1])).padStart(2, '0');
    const mm = String(ENG_MONTH_MAP[engMatch[2].toLowerCase()]).padStart(2, '0');
    return `${yearFromTrip}-${mm}-${dd}`;
  }

  return todayIso;
}

/**
 * Builds a clean pre-filled expense draft when tapping "จดจ่ายจุดนี้" on an itinerary stop.
 */
export function buildQuickExpensePrefillFromStop(
  item: any | null | undefined,
  tripBaseCurrency = 'JPY',
  tripStartDate?: string | null
): QuickExpensePrefill {
  const rawTitle = (item?.main_place || item?.title || '').trim();
  // Trim overly long parenthetical descriptions while keeping meaningful stop names
  const cleanTitle = rawTitle.length > 64 ? `${rawTitle.slice(0, 61).trim()}...` : rawTitle;
  return {
    title: cleanTitle,
    category: inferExpenseCategoryFromStop(item),
    currency: (tripBaseCurrency || 'JPY').toUpperCase(),
    spent_at: resolveStopExpenseDate(item?.date_label, tripStartDate),
  };
}

/**
 * Extracts a concise primary city token from a stop's `city` string (e.g. "Kyoto (Higashiyama)" -> "Kyoto").
 */
export function extractShortCityName(city?: string): string {
  if (!city) return '';
  const cleaned = city.split(/[(\/→➔\-–]/)[0].trim();
  return cleaned.length > 14 ? cleaned.slice(0, 14).trim() : cleaned;
}

/**
 * Computes rich per-day progress & city metadata for Smart Day Pills and On-Trip Focus Mode.
 */
export function computeDaySummaries(
  availableDays: string[],
  itinerary: any[],
  visitedStamps: Record<string, boolean>
): DaySummaryInfo[] {
  return availableDays.map((day, idx) => {
    const stops = itinerary.filter((it) => it.date_label === day);
    const totalStops = stops.length;
    let visitedStops = 0;
    const cityCounts: Record<string, number> = {};

    for (const stop of stops) {
      const key = stop.id || stop.main_place || '';
      if (key && (visitedStamps[key] || (stop.main_place && visitedStamps[stop.main_place]))) {
        visitedStops += 1;
      }
      const shortCity = extractShortCityName(stop.city);
      if (shortCity) {
        cityCounts[shortCity] = (cityCounts[shortCity] || 0) + 1;
      }
    }

    const primaryCity =
      Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    const progressPct = totalStops > 0 ? Math.round((visitedStops / totalStops) * 100) : 0;

    return {
      day,
      dayNumber: idx + 1,
      totalStops,
      visitedStops,
      primaryCity,
      progressPct,
      isComplete: totalStops > 0 && visitedStops >= totalStops,
    };
  });
}

/**
 * Picks the most relevant day when activating On-Trip Focus Mode:
 * the first day that still has unvisited stops, or the first available day.
 */
export function pickRecommendedFocusDay(summaries: DaySummaryInfo[]): string | null {
  if (summaries.length === 0) return null;
  const active = summaries.find((s) => s.totalStops > 0 && !s.isComplete);
  return active ? active.day : summaries[0].day;
}
