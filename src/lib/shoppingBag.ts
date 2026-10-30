import { syncTripMetadataToSupabase } from './tripMetadata';

export type ShoppingItemCategory =
  | 'souvenir-food'
  | 'cosmetics'
  | 'clothing'
  | 'shoes'
  | 'bag'
  | 'game'
  | 'plush'
  | 'amulet'
  | 'drink'
  | 'other';

export type ShoppingItemStatus = 'planned' | 'bought' | 'out_of_stock' | 'skipped';

export interface ShoppingBagItem {
  id: string;
  name: string;
  category: ShoppingItemCategory;
  estPrice: number; // JPY
  actualPrice?: number; // JPY
  quantity: number;
  store?: string;
  dayLabel?: string;
  stopId?: string;
  stopName?: string;
  forWhom?: string;
  note?: string;
  taxFreeEligible?: boolean;
  status: ShoppingItemStatus;
  boughtAt?: string;
  linkedExpenseId?: string;
}

export const SHOPPING_CATEGORY_META: Record<
  ShoppingItemCategory,
  { label: string; emoji: string; propLabel: string }
> = {
  'souvenir-food': { label: 'ขนม/ของฝาก', emoji: '🍡', propLabel: 'กล่องขนมของฝาก' },
  cosmetics: { label: 'เครื่องสำอาง/ยา', emoji: '💄', propLabel: 'ถุงดรักสโตร์' },
  clothing: { label: 'เสื้อผ้า/แฟชั่น', emoji: '🧥', propLabel: 'ถุงช้อปปิ้งแฟชั่น' },
  shoes: { label: 'รองเท้า', emoji: '👟', propLabel: 'กล่องรองเท้า' },
  bag: { label: 'กระเป๋า', emoji: '👜', propLabel: 'ถุงแบรนด์เนม' },
  game: { label: 'เกม/ฟิกเกอร์', emoji: '🎮', propLabel: 'ถุงฟิกเกอร์อนิเมะ' },
  plush: { label: 'ตุ๊กตา/กashapon', emoji: '🧸', propLabel: 'ตุ๊กตาน่ารัก' },
  amulet: { label: 'เครื่องรางวัด', emoji: '⛩️', propLabel: 'ถุงเครื่องรางโอมะโมริ' },
  drink: { label: 'มัทฉะ/เครื่องดื่ม', emoji: '🍵', propLabel: 'กระป๋องมัทฉะแท้' },
  other: { label: 'ของจิปาถะ', emoji: '🛍️', propLabel: 'ถุงช้อปปิ้ง' },
};

export const DEFAULT_KANSAI_SHOPPING_BAG: ShoppingBagItem[] = [
  {
    id: 'shop-uji-matcha',
    name: 'ผงมัทฉะแท้ & ชาเขียวโฮจิฉะ Nakamura Tokichi',
    category: 'drink',
    estPrice: 2800,
    quantity: 2,
    store: 'Nakamura Tokichi Honten (Uji)',
    dayLabel: 'Day 2 (11 ธ.ค.)',
    stopName: 'เมืองชาเขียวอุจิ (Uji) & วัดเบียวโดอิน',
    forWhom: 'ตัวเอง & ครอบครัว',
    note: 'เกรด Ceremonial ชงลาเต้หอมมาก มี Tax-Free ถ้ารวมครบ ¥5,500',
    taxFreeEligible: true,
    status: 'planned',
  },
  {
    id: 'shop-fushimi-amulet',
    name: 'เครื่องรางจิ้งจอกขาวเรียกทรัพย์ & ค้าขายรุ่งเรือง',
    category: 'amulet',
    estPrice: 1000,
    quantity: 2,
    store: 'ศาลเจ้าฟุชิมิ อินาริ (Fushimi Inari Taisha)',
    dayLabel: 'Day 2 (11 ธ.ค.)',
    stopName: 'ศาลเจ้าฟุชิมิ อินาริ (Fushimi Inari Taisha)',
    forWhom: 'ตัวเอง & เพื่อนสนิท',
    note: 'จุดจำหน่ายเครื่องรางหน้าวิหารหลัก รับเฉพาะเงินสด',
    taxFreeEligible: false,
    status: 'planned',
  },
  {
    id: 'shop-kiyomizu-yatsuhashi',
    name: 'ขนมโมจิอบเชย Nama Yatsuhashi ไส้มัทฉะ/สตรอว์เบอร์รี',
    category: 'souvenir-food',
    estPrice: 1400,
    quantity: 3,
    store: 'Honke Nishio Yatsuhashi (ทางขึ้นวัดคิโยมิสึ)',
    dayLabel: 'Day 2 (11 ธ.ค.)',
    stopName: 'วัดคิโยมิสึเดระ (วัดน้ำใส / Kiyomizu-dera)',
    forWhom: 'ที่ทำงาน',
    note: 'ชิมฟรีก่อนซื้อได้ทุกรส เก็บได้ประมาณ 10–14 วัน',
    taxFreeEligible: false,
    status: 'planned',
  },
  {
    id: 'shop-nara-pudding',
    name: 'พุดดิ้งพระใหญ่คัสตาร์ดเนียนนุ่ม (Daibutsu Pudding)',
    category: 'souvenir-food',
    estPrice: 900,
    quantity: 2,
    store: 'Mahoroba Daibutsu Pudding Honpo (สถานี Kintetsu-Nara)',
    dayLabel: 'Day 3 (12 ธ.ค.)',
    stopName: 'สวนกวางนารา & วัดโทไดจิ (Nara Park & Todai-ji)',
    forWhom: 'ทานด้วยกัน',
    note: 'ขวดแก้วลายกวางน่ารักมาก เก็บขวดกลับบ้านได้',
    taxFreeEligible: false,
    status: 'planned',
  },
  {
    id: 'shop-denden-gashapon',
    name: 'ฟิกเกอร์อนิเมะ & กาชาปองลิมิเต็ดญี่ปุ่น',
    category: 'game',
    estPrice: 4500,
    quantity: 1,
    store: 'Animate / Kotobukiya / Super Potato (Den Den Town)',
    dayLabel: 'Day 3 (12 ธ.ค.)',
    stopName: 'ย่านเด็นเด็นทาวน์ (Den Den Town / Nipponbashi)',
    forWhom: 'ตัวเอง',
    note: 'พกพาสปอร์ตตัวจริงลด Tax-Free 10% ที่เคาน์เตอร์',
    taxFreeEligible: true,
    status: 'planned',
  },
  {
    id: 'shop-donki-cosmetics',
    name: 'แผ่นแปะเท้าขจัดความเมื่อย + ยาหยอดตาญี่ปุ่น + กันแดด Biore/Anessa',
    category: 'cosmetics',
    estPrice: 6500,
    quantity: 1,
    store: 'Don Quijote Dotonbori / Matsumoto Kiyoshi',
    dayLabel: 'Day 4 (13 ธ.ค.)',
    stopName: 'ย่านชินไซบาชิ & โดทงโบริ (Shinsaibashi & Dotonbori)',
    forWhom: 'ตัวเอง & แม่',
    note: 'รวมบิลให้เกิน ¥5,500 เพื่อทำ Tax-Free 10% และใช้คูปองลดเพิ่ม 5%',
    taxFreeEligible: true,
    status: 'planned',
  },
  {
    id: 'shop-uniqlo-heattech',
    name: 'เสื้อฟลีซ & Heattech Ultra Warm (ราคาญี่ปุ่นถูกกว่าไทย 30%)',
    category: 'clothing',
    estPrice: 5900,
    quantity: 1,
    store: 'UNIQLO / GU Shinsaibashi Flagship',
    dayLabel: 'Day 4 (13 ธ.ค.)',
    stopName: 'ย่านชินไซบาชิ & โดทงโบริ (Shinsaibashi & Dotonbori)',
    forWhom: 'ตัวเอง',
    note: 'เคาน์เตอร์ Tax-Free อยู่ชั้นบน แสดงพาสปอร์ตลดทันที',
    taxFreeEligible: true,
    status: 'planned',
  },
  {
    id: 'shop-rinku-shoes',
    name: 'รองเท้าผ้าใบ New Balance / Nike / Onitsuka Tiger',
    category: 'shoes',
    estPrice: 12500,
    quantity: 1,
    store: 'Rinku Premium Outlets (ใกล้สนามบิน KIX)',
    dayLabel: 'Day 5 (14 ธ.ค.)',
    stopName: 'ริงกุ พรีเมียม เอาท์เล็ทส์ (Rinku Premium Outlets)',
    forWhom: 'ตัวเอง',
    note: 'แวะขอ QR Coupon Book ที่ Information Center ก่อนช้อป ลดเพิ่มอีก 5–10%',
    taxFreeEligible: true,
    status: 'planned',
  },
];

const STORAGE_PREFIX = 'travel_shopping_bag_v1_';
const EVENT_NAME = 'shopping-bag-updated';
const shoppingBagMemoryCache = new Map<string, { raw: string; parsed: ShoppingBagItem[] }>();
export const EMPTY_SHOPPING_ITEMS: ShoppingBagItem[] = [];

export function getShoppingBag(tripId: string): ShoppingBagItem[] {
  if (typeof window === 'undefined' || !tripId) return DEFAULT_KANSAI_SHOPPING_BAG;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${tripId}`);
    if (!raw) {
      const seedRaw = JSON.stringify(DEFAULT_KANSAI_SHOPPING_BAG);
      localStorage.setItem(`${STORAGE_PREFIX}${tripId}`, seedRaw);
      shoppingBagMemoryCache.set(tripId, { raw: seedRaw, parsed: DEFAULT_KANSAI_SHOPPING_BAG });
      return DEFAULT_KANSAI_SHOPPING_BAG;
    }
    const cached = shoppingBagMemoryCache.get(tripId);
    if (cached && cached.raw === raw) {
      return cached.parsed;
    }
    const parsed = JSON.parse(raw);
    const valid = Array.isArray(parsed) ? parsed : DEFAULT_KANSAI_SHOPPING_BAG;
    shoppingBagMemoryCache.set(tripId, { raw, parsed: valid });
    return valid;
  } catch {
    return DEFAULT_KANSAI_SHOPPING_BAG;
  }
}

export function saveShoppingBag(tripId: string, items: ShoppingBagItem[]): ShoppingBagItem[] {
  if (typeof window === 'undefined' || !tripId) return items;
  try {
    const serialized = JSON.stringify(items);
    localStorage.setItem(`${STORAGE_PREFIX}${tripId}`, serialized);
    shoppingBagMemoryCache.set(tripId, { raw: serialized, parsed: items });
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { tripId } }));
    syncTripMetadataToSupabase(tripId, { shoppingBag: items });
  } catch {
    // ignore storage errors
  }
  return items;
}

export function addShoppingBagItem(
  tripId: string,
  item: Omit<ShoppingBagItem, 'id'>
): ShoppingBagItem[] {
  const current = getShoppingBag(tripId);
  const created: ShoppingBagItem = {
    ...item,
    id: `shop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
  return saveShoppingBag(tripId, [created, ...current]);
}

export function updateShoppingBagItem(
  tripId: string,
  itemId: string,
  patch: Partial<ShoppingBagItem>
): ShoppingBagItem[] {
  const current = getShoppingBag(tripId);
  const next = current.map((it) => (it.id === itemId ? { ...it, ...patch } : it));
  return saveShoppingBag(tripId, next);
}

export function deleteShoppingBagItem(tripId: string, itemId: string): ShoppingBagItem[] {
  const current = getShoppingBag(tripId);
  const next = current.filter((it) => it.id !== itemId);
  return saveShoppingBag(tripId, next);
}

export function hydrateShoppingBagFromSupabase(tripId: string, remoteItems: unknown): boolean {
  if (typeof window === 'undefined' || !tripId || !Array.isArray(remoteItems)) return false;
  try {
    const current = getShoppingBag(tripId);
    if (JSON.stringify(current) === JSON.stringify(remoteItems)) return false;
    localStorage.setItem(`${STORAGE_PREFIX}${tripId}`, JSON.stringify(remoteItems));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { tripId } }));
    return true;
  } catch {
    return false;
  }
}

export function subscribeShoppingBag(callback: () => void): () => void {
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
 * Matches shopping bag items that belong to a specific stop (by ID or fuzzy location name match).
 */
export function getShoppingItemsForStop(
  items: ShoppingBagItem[],
  stop: { id?: string; main_place?: string; location_name?: string; date_label?: string }
): ShoppingBagItem[] {
  const rawName = stop.main_place || stop.location_name || '';
  if (!rawName) return [];
  const stopNameLower = rawName.toLowerCase();

  return items.filter((item) => {
    if (stop.id && item.stopId && item.stopId === stop.id) return true;
    if (item.stopName) {
      const target = item.stopName.toLowerCase();
      if (stopNameLower.includes(target) || target.includes(stopNameLower)) return true;
      // Match key landmarks
      const keywords = [
        'uji',
        'อุจิ',
        'fushimi',
        'ฟุชิมิ',
        'kiyomizu',
        'คิโยมิสึ',
        'วัดน้ำใส',
        'nara',
        'นารา',
        'den den',
        'เด็นเด็น',
        'shinsaibashi',
        'ชินไซบาชิ',
        'dotonbori',
        'โดทงโบริ',
        'rinku',
        'ริงกุ',
        'kuromon',
        'คุโรมง',
        'kobe',
        'โกเบ',
      ];
      for (const kw of keywords) {
        if (stopNameLower.includes(kw) && target.includes(kw)) {
          return true;
        }
      }
    }
    return false;
  });
}

export function getShoppingBagSummary(items: ShoppingBagItem[]) {
  const totalCount = items.length;
  const boughtItems = items.filter((i) => i.status === 'bought');
  const plannedItems = items.filter((i) => i.status === 'planned');
  const totalEstJpy = items
    .filter((i) => i.status !== 'skipped')
    .reduce((sum, i) => sum + (i.estPrice || 0) * Math.max(1, i.quantity || 1), 0);
  const totalBoughtJpy = boughtItems.reduce(
    (sum, i) => sum + (i.actualPrice ?? i.estPrice ?? 0) * Math.max(1, i.quantity || 1),
    0
  );
  const taxFreeBoughtJpy = boughtItems
    .filter((i) => i.taxFreeEligible)
    .reduce(
      (sum, i) => sum + (i.actualPrice ?? i.estPrice ?? 0) * Math.max(1, i.quantity || 1),
      0
    );

  // Build character visual props from bought items (TabiPlan Chibi Companion integration)
  const propCategories = Array.from(new Set(boughtItems.map((i) => i.category)));
  const characterProps = propCategories.map((cat) => ({
    category: cat,
    ...SHOPPING_CATEGORY_META[cat],
  }));

  return {
    totalCount,
    boughtCount: boughtItems.length,
    plannedCount: plannedItems.length,
    totalEstJpy,
    totalBoughtJpy,
    taxFreeBoughtJpy,
    taxSavedJpy: Math.round(taxFreeBoughtJpy * 0.1),
    characterProps,
  };
}
