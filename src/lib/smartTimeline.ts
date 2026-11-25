import { syncTripMetadataToSupabase } from './tripMetadata';

export type AmenityTagId =
  | 'rainy-day'
  | 'luggage-storage'
  | 'restroom'
  | 'near-station'
  | 'wheelchair'
  | 'advance-booking'
  | 'tax-free'
  | 'kid-friendly';

export interface AmenityTagInfo {
  id: AmenityTagId;
  label: string;
  emoji: string;
  colorClass: string;
}

export const AMENITY_TAG_CATALOG: Record<AmenityTagId, AmenityTagInfo> = {
  'rainy-day': {
    id: 'rainy-day',
    label: 'ในร่ม/ฝนตกเที่ยวได้',
    emoji: '☔',
    colorClass: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60',
  },
  'luggage-storage': {
    id: 'luggage-storage',
    label: 'มีตู้ฝากกระเป๋า',
    emoji: '🧳',
    colorClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
  },
  restroom: {
    id: 'restroom',
    label: 'ห้องน้ำสะดวก',
    emoji: '🚻',
    colorClass: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/60',
  },
  'near-station': {
    id: 'near-station',
    label: 'ติดสถานีรถไฟ',
    emoji: '🚉',
    colorClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60',
  },
  wheelchair: {
    id: 'wheelchair',
    label: 'ทางราบ/เดินสบาย',
    emoji: '♿',
    colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
  },
  'advance-booking': {
    id: 'advance-booking',
    label: 'ควรจองล่วงหน้า',
    emoji: '🎟️',
    colorClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
  },
  'tax-free': {
    id: 'tax-free',
    label: 'Tax-Free 10%',
    emoji: '🛍️',
    colorClass: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950/40 dark:text-fuchsia-300 dark:border-fuchsia-800/60',
  },
  'kid-friendly': {
    id: 'kid-friendly',
    label: 'เหมาะทุกวัย',
    emoji: '👨‍👩‍👧',
    colorClass: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60',
  },
};

export interface StopPinnedNote {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface StopSmartMeta {
  skipped?: boolean;
  skippedAt?: string;
  durationMin?: number;
  fixedStartTime?: string; // HH:MM
  openTime?: string; // HH:MM
  closeTime?: string; // HH:MM
  travelModeToNext?: 'walk' | 'train' | 'metro' | 'shinkansen' | 'bus' | 'taxi';
  travelMinToNext?: number;
  fareToNext?: number; // JPY
  goers?: string[]; // Member names attending this stop (empty/undefined = everyone)
  pinnedNotes?: StopPinnedNote[];
  amenityTags?: AmenityTagId[];
  optionVotes?: Record<string, string[]>; // optionKey (e.g. "food:0", "planb:1") -> array of voter names
}

const STORAGE_PREFIX = 'travel_stop_smart_meta_v1_';
const EVENT_NAME = 'stop-smart-meta-updated';

export function getStopPlaceName(item: { main_place?: string; location_name?: string }): string {
  return (item.main_place || item.location_name || '').trim();
}

export function getStopKey(item: {
  id?: string;
  main_place?: string;
  location_name?: string;
  date_label?: string;
}): string {
  if (item.id) return item.id;
  return `${item.date_label || ''}::${getStopPlaceName(item)}`;
}

const stopMetaMemoryCache = new Map<string, { raw: string | null; parsed: Record<string, StopSmartMeta> }>();
const EMPTY_STOP_META: StopSmartMeta = Object.freeze({});

export function getTripStopMetaMap(tripId: string): Record<string, StopSmartMeta> {
  if (typeof window === 'undefined' || !tripId) return {};
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${tripId}`);
    const cached = stopMetaMemoryCache.get(tripId);
    if (cached && cached.raw === raw) {
      return cached.parsed;
    }
    if (!raw) {
      const empty: Record<string, StopSmartMeta> = {};
      stopMetaMemoryCache.set(tripId, { raw: null, parsed: empty });
      return empty;
    }
    const parsed = JSON.parse(raw);
    const valid = parsed && typeof parsed === 'object' ? parsed : {};
    stopMetaMemoryCache.set(tripId, { raw, parsed: valid });
    return valid;
  } catch {
    return {};
  }
}

export function getStopMeta(
  tripId: string,
  stopKey: string,
  fallbackLocationName?: string
): StopSmartMeta {
  const map = getTripStopMetaMap(tripId);
  if (map[stopKey]) return map[stopKey];
  if (fallbackLocationName && map[fallbackLocationName.trim()]) {
    return map[fallbackLocationName.trim()];
  }
  return EMPTY_STOP_META;
}

export function updateStopMeta(
  tripId: string,
  stopKey: string,
  patch: Partial<StopSmartMeta>
): Record<string, StopSmartMeta> {
  if (typeof window === 'undefined' || !tripId || !stopKey) return {};
  const currentMap = getTripStopMetaMap(tripId);
  const existing = currentMap[stopKey] || {};
  const nextMeta: StopSmartMeta = {
    ...existing,
    ...patch,
  };
  const nextMap: Record<string, StopSmartMeta> = {
    ...currentMap,
    [stopKey]: nextMeta,
  };
  try {
    const serialized = JSON.stringify(nextMap);
    localStorage.setItem(`${STORAGE_PREFIX}${tripId}`, serialized);
    stopMetaMemoryCache.set(tripId, { raw: serialized, parsed: nextMap });
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { tripId, stopKey } }));
    syncTripMetadataToSupabase(tripId, { stopMetaMap: nextMap });
  } catch {
    // ignore storage errors
  }
  return nextMap;
}

export function hydrateStopMetaFromSupabase(tripId: string, remoteMap: unknown): boolean {
  if (typeof window === 'undefined' || !tripId || !remoteMap || typeof remoteMap !== 'object') {
    return false;
  }
  try {
    const incoming = remoteMap as Record<string, StopSmartMeta>;
    const current = getTripStopMetaMap(tripId);
    const merged: Record<string, StopSmartMeta> = { ...current, ...incoming };
    const serialized = JSON.stringify(merged);
    if (JSON.stringify(current) === serialized) return false;
    localStorage.setItem(`${STORAGE_PREFIX}${tripId}`, serialized);
    stopMetaMemoryCache.set(tripId, { raw: serialized, parsed: merged });
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { tripId } }));
    return true;
  } catch {
    return false;
  }
}

export function subscribeStopMeta(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener('storage', handler);
  };
}

/**
 * Automatically detects TabiPlan-style amenity & weather readiness tags from stop text,
 * merged with any custom tags set by the user.
 */
export function detectStopAmenities(
  item: {
    main_place?: string;
    location_name?: string;
    details?: string;
    food_recommendation?: string;
    transport_info?: string;
    backup_plan?: string;
    category?: string;
  },
  customTags?: AmenityTagId[]
): AmenityTagInfo[] {
  const tags = new Set<AmenityTagId>(customTags || []);
  const placeName = getStopPlaceName(item);
  const text = `${placeName} ${item.details || ''} ${item.food_recommendation || ''} ${item.transport_info || ''} ${item.backup_plan || ''}`.toLowerCase();

  // Rainy-day / indoor detection
  if (
    /ในร่ม|ห้าง|ตลาดในร่ม|aquarium|museum|พิพิธภัณฑ์|shinsaibashi|kuromon|outlet|เอาท์เล็ท|don quijote|ดองกี้|หอคอย|station|สถานี|ศูนย์การค้า|อิออน|aeon|parco|daimaru|takashimaya|คาเฟ่|ร้านอาหาร/.test(
      text
    )
  ) {
    tags.add('rainy-day');
  }

  // Coin locker / luggage storage
  if (
    /locker|ล็อกเกอร์|ฝากกระเป๋า|station|สถานี|สนามบิน|kix|kansai airport|kyoto|namba|umeda|tennoji|rinku|outlet/.test(
      text
    )
  ) {
    tags.add('luggage-storage');
  }

  // Near station
  if (/ติดสถานี|เดิน\s*[1-5]\s*นาที|station|สถานี|metro|jr |nankai|kintetsu|keihan|hankyu|ทางออก|exit/i.test(text)) {
    tags.add('near-station');
  }

  // Tax-free shopping
  if (
    item.category === 'shopping' ||
    /tax-free|tax free|ปลอดภาษี|ดองกี้|don quijote|uniqlo|gu |outlet|เอาท์เล็ท|ห้าง|ช้อปปิ้ง|den den|bic camera|yodobashi|matsumoto/.test(
      text
    )
  ) {
    tags.add('tax-free');
  }

  // Advance booking
  if (/จอง|คิว|ตัวแทน|klook|ตั๋ว|แลกบัตร|reserve|booking|rapi:t|haruka/.test(text)) {
    tags.add('advance-booking');
  }

  // Restroom friendly
  if (/ห้าง|วัด|ศาลเจ้า|สวน|ตลาด|สถานี|สนามบิน|outlet|aquarium/.test(text)) {
    tags.add('restroom');
  }

  return Array.from(tags)
    .map((id) => AMENITY_TAG_CATALOG[id])
    .filter(Boolean);
}

export interface StationElevatorAndLastTrainInfo {
  elevatorTip?: string;
  lastTrainTip?: string;
}

/**
 * Provides real-world Japan station elevator exit tips (for hotel check-in/out & luggage transfers)
 * and last-train warnings for evening stops in Osaka, Kyoto, Nara, and Kobe.
 */
export function detectStationElevatorAndLastTrain(
  item: {
    main_place?: string;
    location_name?: string;
    city?: string;
    time_slot?: string;
    transport_info?: string;
    backup_plan?: string;
  },
  computedSchedule?: ComputedStopSchedule
): StationElevatorAndLastTrainInfo {
  const text = [
    item.main_place || '',
    item.location_name || '',
    item.city || '',
    item.transport_info || '',
    item.backup_plan || '',
  ]
    .join(' ')
    .toLowerCase();

  const timeText = (item.time_slot || '').toLowerCase();
  let elevatorTip: string | undefined;
  let lastTrainTip: string | undefined;

  const isHotelOrLuggageOrTransfer =
    /hotel|โรงแรม|ที่พัก|เช็คอิน|เช็กอิน|เช็คเอาท์|เช็กเอาต์|check-in|check in|check-out|check out|กระเป๋า|ย้ายโรงแรม|ย้ายเมือง|ลีมูซีน|limousine|ชานชาลาที่ 8|haruka|rapi:t|สนามบิน|airport/.test(
      text
    );

  if (isHotelOrLuggageOrTransfer) {
    if (/ลีมูซีน|limousine|ชานชาลาที่ 8|kix -> kyoto/.test(text)) {
      elevatorTip =
        'จุดขึ้นรถบัสลีมูซีน KIX ➔ Kyoto: ชั้น 1 หน้าอาคารผู้โดยสารขาเข้า Terminal 1 ชานชาลาที่ 8 (Bus Stop No. 8) จอดส่งที่สถานีเกียวโตฝั่ง Hachijo-guchi เดินทางราบเข้าโรงแรม Hotel The M\'s Kyoto ได้เลยใน 3 นาที';
    } else if (/m's kyoto|ms kyoto|kyoto station|สถานีเกียวโต|haruka/.test(text)) {
      elevatorTip =
        'ลิฟต์สถานี Kyoto (ฝั่งโรงแรม The M\'s Kyoto): ออกทาง Hachijo East Exit (八条東口) มีลิฟต์ลงชั้น 1 เดินทางราบ 5 นาทีถึงโรงแรม';
    } else if (/musse|kawaramachi|คาวาระมาจิ|shijo|ชิโจ|gion-shijo/.test(text)) {
      elevatorTip =
        'ลิฟต์สถานี Kyoto-Kawaramachi (Hankyu): ใช้ลิฟต์ใหญ่ที่ทางออก Exit 3 (หน้า Takashimaya/Kotocross) หรือสถานี Karasuma Exit 12 มีลิฟต์ขึ้นระดับถนน';
    } else if (/quintessa|shinsaibashi|ชินไซบาชิ|nagahoribashi/.test(text)) {
      elevatorTip =
        'ลิฟต์สถานี Shinsaibashi (ไปโรงแรม Quintessa): ลงทางเชื่อมใต้ดิน Crysta Nagahori มีลิฟต์ขึ้นระดับถนนที่ทางออก North 4 / North 5 เดินทางราบถึงหน้าโรงแรม';
    } else if (/odysis|rinku|ริงกุ|kix|kansai airport/.test(text)) {
      elevatorTip =
        'ลิฟต์สถานี Rinku-Town (ไปโรงแรม Odysis Suites): ออกประตูตรวจตั๋วชั้น 2 เดินตามทางเชื่อมในร่มเข้าตึก SiS Rinku Tower มีลิฟต์ขึ้นล็อบบี้โดยตรง ไม่ต้องยกกระเป๋าขึ้นลงบันได';
    } else if (/namba|นัมบะ/.test(text)) {
      elevatorTip =
        'ลิฟต์สถานี Namba: โซน Nankai ใช้ลิฟต์โถงกลางชั้น 1F–3F, โซน Metro Midosuji ใช้ลิฟต์ที่ทางออก Exit 15B หรือ Exit 5';
    }
  }

  // Detect evening/night stop (after 18:30 or evening dinner/illumination)
  const isEveningStop =
    (computedSchedule && !computedSchedule.skipped && computedSchedule.arriveMinutes >= 18 * 60 + 30) ||
    /(18|19|20|21|22|23)[:.]\d{2}|ค่ำ|มื้อเย็น|ดึก|night|illumination|ไฟประดับ/.test(timeText + ' ' + text);

  if (isEveningStop && !/โรงแรม|เข้าที่พัก|พักผ่อนตามอัธยาศัย|odysis/.test((item.main_place || '').toLowerCase())) {
    if (/nara|นารา/.test(text)) {
      lastTrainTip =
        'ขบวนสุดท้ายจาก Nara กลับ Osaka-Namba (สาย Kintetsu Nara): รอบประมาณ 23:25 น. (แนะนำขึ้นก่อน 22:30 น.)';
    } else if (/kobe|โกเบ|sannomiya/.test(text)) {
      lastTrainTip =
        'ขบวนสุดท้ายจาก Kobe (Sannomiya) กลับ Osaka/Umeda: สาย JR / Hankyu / Hanshin รอบประมาณ 23:40–23:55 น.';
    } else if (/kyoto|เกียวโต|uji|อุจิ|fushimi|kiyomizu|gion|arashiyama|kawaramachi/.test(text)) {
      lastTrainTip =
        'รถไฟขบวนสุดท้ายในเกียวโต (Keihan / Hankyu / Subway): ประมาณ 23:30–23:45 น. (รถบัสเมืองเกียวโตส่วนใหญ่หมด 22:00–22:30 น.)';
    } else {
      lastTrainTip =
        'รถไฟขบวนสุดท้ายกลับ Shinsaibashi (สายสีแดง Osaka Metro Midosuji): รอบสุดท้ายจาก Umeda/Tennoji ประมาณ 23:55–00:05 น.';
    }
  }

  return { elevatorTip, lastTrainTip };
}

// ---------------------------------------------------------------------------
// Smart Cascade Timeline Calculator (TabiPlan Engine)
// ---------------------------------------------------------------------------

export interface CascadeStopInput {
  id?: string;
  date_label?: string;
  time_slot?: string;
  main_place?: string;
  location_name?: string;
  city?: string;
  details?: string;
  transport_info?: string;
  category?: string;
  cost_yen?: number;
  lat?: number | null;
  lng?: number | null;
}

export interface ComputedStopSchedule {
  stopKey: string;
  skipped: boolean;
  arriveMinutes: number; // minutes from 00:00
  leaveMinutes: number;
  arriveTime: string; // "HH:MM"
  leaveTime: string; // "HH:MM"
  durationMin: number;
  travelMinToNext: number;
  travelModeToNext: 'walk' | 'train' | 'metro' | 'shinkansen' | 'bus' | 'taxi';
  fareToNext: number;
  waitMin: number; // Waiting for store opening or fixed appointment
  lateMin: number; // Running late past fixedStartTime or closeTime
  lateReason?: string;
}

export interface DayCascadeResult {
  byStopKey: Record<string, ComputedStopSchedule>;
  totalSightseeingMin: number;
  totalTravelMin: number;
  totalWaitMin: number;
  totalTransitFareJpy: number;
  activeStopsCount: number;
  skippedStopsCount: number;
  lateStopsCount: number;
  dayStartTime: string;
  dayEndTime: string;
}

export function parseTimeHHMMToMinutes(str?: string): number | null {
  if (!str) return null;
  const match = str.match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 29 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export function formatMinutesToHHMM(totalMin: number): string {
  const normalized = ((Math.round(totalMin) % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function inferDurationAndStartFromSlot(
  timeSlot?: string,
  category?: string
): { slotStartMin: number | null; slotDurationMin: number } {
  if (timeSlot) {
    const rangeMatch = timeSlot.match(/(\d{1,2})[:.](\d{2})\s*[-–~ถึง]\s*(\d{1,2})[:.](\d{2})/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10) * 60 + parseInt(rangeMatch[2], 10);
      let end = parseInt(rangeMatch[3], 10) * 60 + parseInt(rangeMatch[4], 10);
      if (end < start) end += 24 * 60;
      const diff = Math.max(20, Math.min(360, end - start));
      return { slotStartMin: start, slotDurationMin: diff };
    }
    const single = parseTimeHHMMToMinutes(timeSlot);
    if (single !== null) {
      const defaultDur =
        category === 'food' ? 60 : category === 'transit' ? 40 : category === 'hotel' ? 45 : 90;
      return { slotStartMin: single, slotDurationMin: defaultDur };
    }
  }
  const fallbackDur =
    category === 'food' ? 60 : category === 'transit' ? 40 : category === 'hotel' ? 45 : 90;
  return { slotStartMin: null, slotDurationMin: fallbackDur };
}

function inferTravelFromTransportInfo(transportInfo?: string): {
  mode: 'walk' | 'train' | 'metro' | 'shinkansen' | 'bus' | 'taxi';
  travelMin: number;
  fareJpy: number;
} {
  if (!transportInfo) {
    return { mode: 'train', travelMin: 20, fareJpy: 0 };
  }
  const text = transportInfo.toLowerCase();

  let mode: 'walk' | 'train' | 'metro' | 'shinkansen' | 'bus' | 'taxi' = 'train';
  if (/เดิน|walk/.test(text) && !/รถไฟ|metro|jr|สาย/.test(text)) mode = 'walk';
  else if (/shinkansen|ชินคันเซ็น/.test(text)) mode = 'shinkansen';
  else if (/metro|ใต้ดิน|midosuji|chuo|tanimachi|sakaisuji/.test(text)) mode = 'metro';
  else if (/bus|รถบัส|บัส/.test(text)) mode = 'bus';
  else if (/taxi|แท็กซี่/.test(text)) mode = 'taxi';

  let travelMin = mode === 'walk' ? 12 : 25;
  const minMatch = transportInfo.match(/(\d{1,3})\s*(?:นาที|min|mins)/i);
  if (minMatch) {
    travelMin = Math.max(5, Math.min(180, parseInt(minMatch[1], 10)));
  }

  let fareJpy = 0;
  const yenMatch =
    transportInfo.match(/[¥￥]\s*([\d,]+)/) ||
    transportInfo.match(/([\d,]+)\s*(?:เยน|yen|jpy)/i);
  if (yenMatch) {
    const parsed = parseInt(yenMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 30000) {
      fareJpy = parsed;
    }
  }

  return { mode, travelMin, fareJpy };
}

export function calculateDayCascadeSchedule(
  items: CascadeStopInput[],
  stopMetaMap: Record<string, StopSmartMeta>
): DayCascadeResult {
  const byStopKey: Record<string, ComputedStopSchedule> = {};
  let totalSightseeingMin = 0;
  let totalTravelMin = 0;
  let totalWaitMin = 0;
  let totalTransitFareJpy = 0;
  let activeStopsCount = 0;
  let skippedStopsCount = 0;
  let lateStopsCount = 0;

  let cursorMin: number | null = null;
  let firstStartMin: number | null = null;
  let lastLeaveMin: number | null = null;

  items.forEach((item, index) => {
    const stopKey = getStopKey(item);
    const placeName = getStopPlaceName(item);
    const meta = stopMetaMap[stopKey] || stopMetaMap[placeName] || {};
    const skipped = Boolean(meta.skipped);

    const { slotStartMin, slotDurationMin } = inferDurationAndStartFromSlot(
      item.time_slot,
      item.category
    );
    const inferredTransit = inferTravelFromTransportInfo(item.transport_info);

    const durationMin = meta.durationMin ?? slotDurationMin;
    const isLast = index === items.length - 1;
    const travelMinToNext = isLast ? 0 : meta.travelMinToNext ?? inferredTransit.travelMin;
    const travelModeToNext = meta.travelModeToNext ?? inferredTransit.mode;
    const fareToNext = meta.fareToNext ?? inferredTransit.fareJpy;

    if (skipped) {
      skippedStopsCount += 1;
      const fallbackMin = cursorMin ?? slotStartMin ?? 9 * 60;
      byStopKey[stopKey] = {
        stopKey,
        skipped: true,
        arriveMinutes: fallbackMin,
        leaveMinutes: fallbackMin,
        arriveTime: formatMinutesToHHMM(fallbackMin),
        leaveTime: formatMinutesToHHMM(fallbackMin),
        durationMin,
        travelMinToNext: 0,
        travelModeToNext,
        fareToNext: 0,
        waitMin: 0,
        lateMin: 0,
      };
      return;
    }

    activeStopsCount += 1;

    // Determine arrival time by cascading from previous stop or starting from first slot
    let arriveMin: number;
    if (cursorMin === null) {
      arriveMin = slotStartMin ?? 8 * 60 + 30; // Default 08:30
    } else {
      arriveMin = cursorMin;
    }

    let waitMin = 0;
    let lateMin = 0;
    let lateReason: string | undefined;

    const openMin = parseTimeHHMMToMinutes(meta.openTime);
    if (openMin !== null && arriveMin < openMin) {
      waitMin += openMin - arriveMin;
      arriveMin = openMin;
    }

    const fixedStartMin = parseTimeHHMMToMinutes(meta.fixedStartTime);
    if (fixedStartMin !== null) {
      if (arriveMin < fixedStartMin) {
        waitMin += fixedStartMin - arriveMin;
        arriveMin = fixedStartMin;
      } else if (arriveMin > fixedStartMin) {
        lateMin = arriveMin - fixedStartMin;
        lateReason = `สายกว่าเวลานัด (${meta.fixedStartTime}) ${lateMin} นาที`;
      }
    }

    const leaveMin = arriveMin + durationMin;

    const closeMin = parseTimeHHMMToMinutes(meta.closeTime);
    if (closeMin !== null && leaveMin > closeMin && lateMin === 0) {
      lateMin = leaveMin - closeMin;
      lateReason = `เกินเวลาปิดร้าน (${meta.closeTime}) ${lateMin} นาที`;
    }

    if (lateMin > 0) {
      lateStopsCount += 1;
    }

    if (firstStartMin === null) firstStartMin = arriveMin;
    lastLeaveMin = leaveMin;

    totalSightseeingMin += durationMin;
    totalWaitMin += waitMin;
    if (!isLast) {
      totalTravelMin += travelMinToNext;
      totalTransitFareJpy += fareToNext;
    }

    byStopKey[stopKey] = {
      stopKey,
      skipped: false,
      arriveMinutes: arriveMin,
      leaveMinutes: leaveMin,
      arriveTime: formatMinutesToHHMM(arriveMin),
      leaveTime: formatMinutesToHHMM(leaveMin),
      durationMin,
      travelMinToNext,
      travelModeToNext,
      fareToNext,
      waitMin,
      lateMin,
      lateReason,
    };

    cursorMin = leaveMin + travelMinToNext;
  });

  return {
    byStopKey,
    totalSightseeingMin,
    totalTravelMin,
    totalWaitMin,
    totalTransitFareJpy,
    activeStopsCount,
    skippedStopsCount,
    lateStopsCount,
    dayStartTime: firstStartMin !== null ? formatMinutesToHHMM(firstStartMin) : '08:30',
    dayEndTime: lastLeaveMin !== null ? formatMinutesToHHMM(lastLeaveMin) : '20:00',
  };
}

// ---------------------------------------------------------------------------
// Google Maps 5-Stop Chunked Deep-Link Route Builder + Apple Maps Support
// ---------------------------------------------------------------------------

export interface ChunkedRouteLeg {
  index: number;
  label: string;
  rangeText: string;
  fromName: string;
  toName: string;
  stopsCount: number;
  googleMapsUrl: string;
  appleMapsUrl: string;
}

function cleanPlaceQuery(name: string): string {
  const cleaned = name
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\(.*?\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (/japan|osaka|kyoto|nara|kobe|uji|rinku/i.test(cleaned)) {
    return cleaned;
  }
  return `${cleaned} Kansai Japan`;
}

export function buildChunkedDayRoutes(
  items: CascadeStopInput[],
  stopMetaMap: Record<string, StopSmartMeta>,
  travelMode: 'transit' | 'walking' | 'driving' = 'transit'
): ChunkedRouteLeg[] {
  // Filter out skipped stops and non-Japan transit nodes (like Suvarnabhumi)
  const validStops = items.filter((item) => {
    const key = getStopKey(item);
    const placeName = getStopPlaceName(item);
    const meta = stopMetaMap[key] || stopMetaMap[placeName];
    if (meta?.skipped) return false;
    if (/สุวรรณภูมิ|suvarnabhumi|bkk|ดอนเมือง/i.test(placeName)) return false;
    return Boolean(placeName);
  });

  if (validStops.length === 0) return [];

  if (validStops.length === 1) {
    const s = validStops[0];
    const placeName = getStopPlaceName(s);
    const q =
      s.lat && s.lng
        ? `${s.lat},${s.lng}`
        : encodeURIComponent(cleanPlaceQuery(`${placeName} ${s.city || ''}`));
    return [
      {
        index: 1,
        label: 'นำทางจุดเดียว',
        rangeText: 'จุดที่ 1',
        fromName: placeName,
        toName: placeName,
        stopsCount: 1,
        googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${q}`,
        appleMapsUrl: `https://maps.apple.com/?q=${q}`,
      },
    ];
  }

  const legs: ChunkedRouteLeg[] = [];
  // Step by 4 so each chunk of 5 shares its last stop as the start of the next chunk (1..5, 5..9, etc.)
  for (let i = 0; i < validStops.length; i += 4) {
    const chunk = validStops.slice(i, i + 5);
    if (chunk.length < 2) break;

    const first = chunk[0];
    const last = chunk[chunk.length - 1];
    const middle = chunk.slice(1, -1);

    const toCoordOrQuery = (s: CascadeStopInput) => {
      const placeName = getStopPlaceName(s);
      return s.lat && s.lng ? `${s.lat},${s.lng}` : cleanPlaceQuery(`${placeName} ${s.city || ''}`);
    };

    const origin = encodeURIComponent(toCoordOrQuery(first));
    const destination = encodeURIComponent(toCoordOrQuery(last));
    const waypoints =
      middle.length > 0
        ? `&waypoints=${encodeURIComponent(middle.map(toCoordOrQuery).join('|'))}`
        : '';

    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints}&travelmode=${travelMode}`;
    const appleDirFlg = travelMode === 'walking' ? 'w' : travelMode === 'driving' ? 'd' : 'r';
    const appleMapsUrl = `https://maps.apple.com/?saddr=${origin}&daddr=${destination}&dirflg=${appleDirFlg}`;

    const startNum = i + 1;
    const endNum = i + chunk.length;
    const legIndex = legs.length + 1;

    legs.push({
      index: legIndex,
      label: validStops.length <= 5 ? 'เปิดเส้นทางทั้งวัน' : `ช่วงที่ ${legIndex} (จุด ${startNum}–${endNum})`,
      rangeText: `จุด ${startNum}–${endNum}`,
      fromName: getStopPlaceName(first),
      toName: getStopPlaceName(last),
      stopsCount: chunk.length,
      googleMapsUrl,
      appleMapsUrl,
    });

    if (i + 5 >= validStops.length) break;
  }

  return legs;
}

// ---------------------------------------------------------------------------
// Kansai & Japan Smart Transit Autocomplete Dictionary
// ---------------------------------------------------------------------------

export interface TransitSuggestion {
  label: string;
  category: 'line' | 'station' | 'route-template';
  insertText: string;
  badge: string;
}

export const KANSAI_TRANSIT_SUGGESTIONS: TransitSuggestion[] = [
  // Route Templates
  {
    label: 'Airport Limousine Bus ชานชาลาที่ 8 (KIX ➔ Kyoto)',
    category: 'route-template',
    insertText:
      'รถบัสลีมูซีนสนามบิน (Airport Limousine Bus) ขึ้นที่ชานชาลาที่ 8 (ชั้น 1 หน้าอาคารขาเข้า Terminal 1) ตรงไปลงสถานีเกียวโตฝั่ง Hachijo-guchi (85–90 นาที / ¥2,600–2,800)',
    badge: '🚌 สนามบิน',
  },
  {
    label: 'Nankai Rapi:t (KIX ➔ Namba 38 นาที)',
    category: 'route-template',
    insertText: 'รถไฟด่วน Nankai Limited Express Rapi:t จาก KIX ➔ สถานี Nankai Namba (38 นาที / ¥1,450)',
    badge: '✈️ สนามบิน',
  },
  {
    label: 'Osaka Metro Midosuji (Umeda ⟷ Namba ⟷ Tennoji)',
    category: 'route-template',
    insertText: 'รถไฟใต้ดินสายสีแดง Osaka Metro Midosuji Line (20 นาที / ¥240)',
    badge: '🚇 โอซาก้า',
  },
  {
    label: 'Keihan Main Line (Osaka ➔ Fushimi Inari / Gion / Uji)',
    category: 'route-template',
    insertText: 'รถไฟสาย Keihan Main Line ลงสถานี Fushimi-Inari / Gion-Shijo (50 นาที / ¥430)',
    badge: '⛩️ เกียวโต/อุจิ',
  },
  {
    label: 'Kintetsu Nara Line (Osaka-Namba ➔ Kintetsu-Nara)',
    category: 'route-template',
    insertText: 'รถไฟด่วน Kintetsu Rapid Express จาก Osaka-Namba ➔ Kintetsu-Nara (39 นาที / ¥680)',
    badge: '🦌 นารา',
  },
  {
    label: 'Hankyu Kyoto Line (Umeda ➔ Kawaramachi)',
    category: 'route-template',
    insertText: 'รถไฟสาย Hankyu Kyoto Limited Express จาก Osaka-Umeda ➔ Kyoto-Kawaramachi (43 นาที / ¥410)',
    badge: '🍁 เกียวโต',
  },
  {
    label: 'Osaka Metro Chuo Line (ไป Osaka Aquarium Kaiyukan)',
    category: 'route-template',
    insertText: 'รถไฟใต้ดินสายสีเขียว Osaka Metro Chuo Line ลงสถานี Osakako ทางออก 1 (25 นาที / ¥290)',
    badge: '🦈 ไคยูคัง',
  },
  {
    label: 'เดินชิลล์เชื่อมต่อจุดใกล้เคียง (10 นาที)',
    category: 'route-template',
    insertText: 'เดินเท้าเชื่อมต่อย่านใกล้เคียง (ประมาณ 10 นาที / ¥0)',
    badge: '🚶 เดินเท้า',
  },
  // Major Stations
  {
    label: 'สถานี Namba / Osaka-Namba',
    category: 'station',
    insertText: 'สถานี Namba (Osaka Metro / Nankai / Kintetsu)',
    badge: '🚉 สถานี',
  },
  {
    label: 'สถานี Umeda / JR Osaka',
    category: 'station',
    insertText: 'สถานี Umeda / JR Osaka Station',
    badge: '🚉 สถานี',
  },
  {
    label: 'สถานี Kyoto Station',
    category: 'station',
    insertText: 'สถานี JR Kyoto Station',
    badge: '🚉 สถานี',
  },
  {
    label: 'สถานี Kintetsu-Nara',
    category: 'station',
    insertText: 'สถานี Kintetsu-Nara (เดิน 5 นาทีถึงสวนกวาง)',
    badge: '🚉 สถานี',
  },
  {
    label: 'สถานี Uji (Keihan / JR)',
    category: 'station',
    insertText: 'สถานี Uji (เดินข้ามสะพานสู่ถนนชาเขียว Byodoin Omotesando)',
    badge: '🚉 สถานี',
  },
  {
    label: 'สถานี Rinku-Town (เอาท์เล็ท / ชิงช้าสวรรค์)',
    category: 'station',
    insertText: 'สถานี Rinku-Town (JR / Nankai เดิน 6 นาทีถึง Rinku Premium Outlets)',
    badge: '🚉 สถานี',
  },
];

// ---------------------------------------------------------------------------
// Day Pace & Conflict Analyzer (Package C - Smart Planning)
// ---------------------------------------------------------------------------

export interface DayPaceAnalysis {
  level: 'relaxed' | 'balanced' | 'packed';
  emoji: string;
  badgeLabel: string;
  detailTip: string;
  cityCount: number;
  cities: string[];
  hasConflict: boolean;
}

/**
 * Evaluates a single day's stop density, inter-city transfers, and schedule conflicts
 * so travelers can spot overpacked days or timing collisions at a glance.
 */
export function analyzeDayPace(
  stops: CascadeStopInput[],
  cascade: DayCascadeResult
): DayPaceAnalysis {
  const activeCount = cascade.activeStopsCount || stops.length;
  const citySet = new Set<string>();
  for (const s of stops) {
    const raw = (s.city || '').split(/[(\/→➔\-–]/)[0].trim();
    if (raw) citySet.add(raw);
  }
  const cities = Array.from(citySet);
  const cityCount = cities.length;
  const sightseeingHours = cascade.totalSightseeingMin / 60;
  const hasConflict = cascade.lateStopsCount > 0;

  if (hasConflict || activeCount >= 7 || sightseeingHours >= 9.5 || cityCount >= 3 || cascade.totalTravelMin >= 150) {
    const reasons: string[] = [];
    if (hasConflict) reasons.push(`เวลาซ้อน/สาย ${cascade.lateStopsCount} จุด`);
    if (cityCount >= 3) reasons.push(`ย้ายข้าม ${cityCount} เมืองในวันเดียว`);
    if (activeCount >= 7 || sightseeingHours >= 9.5) reasons.push(`${activeCount} จุด (${sightseeingHours.toFixed(1)} ชม.)`);
    if (cascade.totalTravelMin >= 150) reasons.push(`เดินทางรวม ${cascade.totalTravelMin} นาที`);

    return {
      level: 'packed',
      emoji: '🔴',
      badgeLabel: hasConflict ? 'แผนชน / เวลาซ้อน' : 'แผนแน่นมาก',
      detailTip: reasons.length > 0 ? `${reasons.join(' • ')} — แนะนำกดข้ามจุดรองหรือย้ายบางจุดไปวันอื่น` : 'ตารางค่อนข้างแน่น เผื่อเวลาต่อรถเพิ่ม',
      cityCount,
      cities,
      hasConflict,
    };
  }

  if (activeCount >= 4 || sightseeingHours >= 5.5 || cityCount === 2) {
    return {
      level: 'balanced',
      emoji: '🟡',
      badgeLabel: 'กำลังพอดี',
      detailTip:
        cityCount === 2
          ? `เที่ยว 2 โซน (${cities.join(' ➔ ')}) เวลาลงตัวพอดี`
          : `จังหวะกำลังดี มีเวลาพักกินข้าวและถ่ายรูปสบายๆ`,
      cityCount,
      cities,
      hasConflict: false,
    };
  }

  return {
    level: 'relaxed',
    emoji: '🟢',
    badgeLabel: 'สบายๆ ชิลล์',
    detailTip: 'ตารางโปร่ง เดินเล่นแวะคาเฟ่หรือสุ่มร้านนอกแพลนเพิ่มได้สบาย',
    cityCount,
    cities,
    hasConflict: false,
  };
}

/**
 * Toggles a member's thumbs-up vote on a stop's multi-option choice (e.g., recommended restaurants or Plan B spots).
 */
export function toggleStopOptionVote(
  tripId: string,
  stopKey: string,
  optionKey: string,
  voterName: string
): string[] {
  if (!tripId || !stopKey || !optionKey) return [];
  const cleanVoter = (voterName || 'ฉัน').trim();
  const map = getTripStopMetaMap(tripId);
  const currentMeta = map[stopKey] || {};
  const existingVotes = currentMeta.optionVotes || {};
  const list = Array.isArray(existingVotes[optionKey]) ? existingVotes[optionKey] : [];
  const hasVoted = list.includes(cleanVoter);
  const nextList = hasVoted ? list.filter((v) => v !== cleanVoter) : [...list, cleanVoter];

  updateStopMeta(tripId, stopKey, {
    optionVotes: {
      ...existingVotes,
      [optionKey]: nextList,
    },
  });
  return nextList;
}

export interface JapanGoldenHourInfo {
  month: number;
  goldenHourStart: string; // HH:MM
  sunsetTime: string; // HH:MM
  blueHourEnd: string; // HH:MM
  seasonLabel: string;
  badgeText: string;
}

const MONTH_SUNSET_TABLE_KANSAI: Record<
  number,
  { goldenStart: string; sunset: string; blueEnd: string; season: string }
> = {
  1: { goldenStart: '16:15', sunset: '17:08', blueEnd: '17:36', season: 'ฤดูหนาว (มืดเร็ว)' },
  2: { goldenStart: '16:50', sunset: '17:42', blueEnd: '18:08', season: 'ปลายฤดูหนาว' },
  3: { goldenStart: '17:20', sunset: '18:08', blueEnd: '18:35', season: 'ฤดูใบไม้ผลิ' },
  4: { goldenStart: '17:45', sunset: '18:34', blueEnd: '19:02', season: 'ซากุระ / ใบไม้ผลิ' },
  5: { goldenStart: '18:10', sunset: '18:58', blueEnd: '19:28', season: 'ปลายใบไม้ผลิ' },
  6: { goldenStart: '18:25', sunset: '19:15', blueEnd: '19:46', season: 'ต้นฤดูร้อน' },
  7: { goldenStart: '18:22', sunset: '19:12', blueEnd: '19:42', season: 'ฤดูร้อน' },
  8: { goldenStart: '17:55', sunset: '18:45', blueEnd: '19:14', season: 'ปลายฤดูร้อน' },
  9: { goldenStart: '17:15', sunset: '18:04', blueEnd: '18:31', season: 'ต้นฤดูใบไม้ร่วง' },
  10: { goldenStart: '16:35', sunset: '17:24', blueEnd: '17:51', season: 'ใบไม้เปลี่ยนสี' },
  11: { goldenStart: '16:02', sunset: '16:54', blueEnd: '17:22', season: 'ใบไม้แดง (มืดเร็ว)' },
  12: { goldenStart: '15:55', sunset: '16:48', blueEnd: '17:18', season: 'ฤดูหนาว (มืดเร็ว)' },
};

function parseMonthFromLabelOrDate(dateLabel?: string, tripStartDate?: string): number {
  const text = `${dateLabel || ''} ${tripStartDate || ''}`.toLowerCase();
  if (/dec|ธ\.ค\.|ธันวา|-12-/.test(text)) return 12;
  if (/nov|พ\.ย\.|พฤศจิกา|-11-/.test(text)) return 11;
  if (/jan|ม\.ค\.|มกรา|-01-/.test(text)) return 1;
  if (/feb|ก\.พ\.|กุมภา|-02-/.test(text)) return 2;
  if (/mar|มี\.ค\.|มีนา|-03-/.test(text)) return 3;
  if (/apr|เม\.ย\.|เมษา|-04-/.test(text)) return 4;
  if (/may|พ\.ค\.|พฤษภา|-05-/.test(text)) return 5;
  if (/jun|มิ\.ย\.|มิถุนา|-06-/.test(text)) return 6;
  if (/jul|ก\.ค\.|กรกฎา|-07-/.test(text)) return 7;
  if (/aug|ส\.ค\.|สิงหา|-08-/.test(text)) return 8;
  if (/sep|ก\.ย\.|กันยา|-09-/.test(text)) return 9;
  if (/oct|ต\.ค\.|ตุลา|-10-/.test(text)) return 10;
  return 12;
}

/**
 * Computes Golden Hour photography window and Sunset time for Japan cities by month.
 */
export function getJapanGoldenHourInfo(
  dateLabel?: string,
  city?: string,
  tripStartDate?: string
): JapanGoldenHourInfo {
  const month = parseMonthFromLabelOrDate(dateLabel, tripStartDate);
  const base = MONTH_SUNSET_TABLE_KANSAI[month] || MONTH_SUNSET_TABLE_KANSAI[12];
  const isEastOrNorth = /tokyo|โตเกียว|sapporo|ซัปโปโร|hakodate|otaru|sendai/i.test(city || '');
  const shiftMin = isEastOrNorth ? -16 : 0;

  const shiftTimeStr = (hhmm: string, delta: number): string => {
    if (!delta) return hhmm;
    const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
    const total = Math.max(0, h * 60 + m + delta);
    const nh = String(Math.floor(total / 60)).padStart(2, '0');
    const nm = String(total % 60).padStart(2, '0');
    return `${nh}:${nm}`;
  };

  const goldenHourStart = shiftTimeStr(base.goldenStart, shiftMin);
  const sunsetTime = shiftTimeStr(base.sunset, shiftMin);
  const blueHourEnd = shiftTimeStr(base.blueEnd, shiftMin);

  return {
    month,
    goldenHourStart,
    sunsetTime,
    blueHourEnd,
    seasonLabel: base.season,
    badgeText: `🌅 แสงทอง ${goldenHourStart}–${sunsetTime} · อาทิตย์ตก ${sunsetTime}`,
  };
}

const OUTDOOR_DAYLIGHT_PATTERN =
  /วัด|ศาลเจ้า|สวน|ป่าไผ่|อาราชิยามะ|arashiyama|kiyomizu|น้ำใส|fushimi|ฟุชิมิ|โทไดจิ|todai|nara park|กวาง|kinkaku|วัดทอง|ginkaku|วัดเงิน|uji|อุจิ|เบียวโดอิน|byodoin|ปราสาท|castle|philosopher|สะพานโทเก็ตสึ|togetsukyo|minoh|มิโนะ/i;

const INDOOR_OR_NIGHT_OK_PATTERN =
  /illumination|ไฟประดับ|teamlab|aquarium|ไคยูคัง|aeon|mall|ห้าง|ดองกี้|donki|dotonbori|โดทงโบริ|shinsaibashi|ชินไซบาชิ|umeda sky|harukas|หอคอย|tower|ออนเซ็น|onsen|ซูชิ|ราเมง|อิซากายะ|คาเฟ่|สนามบิน|airport/i;

export function isOutdoorDaylightSpot(placeName?: string): boolean {
  const name = (placeName || '').trim();
  if (!name) return false;
  if (INDOOR_OR_NIGHT_OK_PATTERN.test(name)) return false;
  return OUTDOOR_DAYLIGHT_PATTERN.test(name);
}

export interface AfterSunsetStopWarning {
  stopKey: string;
  placeName: string;
  arriveTime: string;
  sunsetTime: string;
  tip: string;
}

/**
 * Flags outdoor scenic spots (temples, parks, bamboo forest) whose scheduled arrival is after sunset.
 */
export function findOutdoorStopsAfterSunset(
  stops: Array<Record<string, any>>,
  cascadeByStopKey: Record<string, { arriveTime?: string; skipped?: boolean }> = {},
  sunsetTime: string = '16:48'
): AfterSunsetStopWarning[] {
  const toMin = (hhmm?: string): number | null => {
    if (!hhmm) return null;
    const match = hhmm.match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  };

  const sunsetMin = toMin(sunsetTime) ?? 16 * 60 + 48;
  const warnings: AfterSunsetStopWarning[] = [];

  for (const stop of stops || []) {
    if (!stop) continue;
    const placeName = getStopPlaceName(stop);
    if (!isOutdoorDaylightSpot(placeName)) continue;
    const stopKey = getStopKey(stop);
    const sched = cascadeByStopKey[stopKey];
    if (sched?.skipped) continue;

    const arriveStr = sched?.arriveTime || stop.time_slot || '';
    const arriveMin = toMin(arriveStr);
    if (arriveMin !== null && arriveMin >= sunsetMin) {
      const cleanArrive = arriveStr.match(/\d{1,2}:\d{2}/)?.[0] || arriveStr;
      warnings.push({
        stopKey,
        placeName,
        arriveTime: cleanArrive,
        sunsetTime,
        tip: `🌅 "${placeName}" จัดไว้เวลา ${cleanArrive} หลังพระอาทิตย์ตก (${sunsetTime}) แนะนำขยับมาช่วงแสงทองถ่ายรูปสวยกว่า`,
      });
    }
  }

  return warnings;
}

