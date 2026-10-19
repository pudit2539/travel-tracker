// src/lib/placeThumbnails.ts
import { useState, useEffect } from 'react';

export interface PlaceVisualMeta {
  imageUrl: string;
  gradient: string;
  emoji: string;
  tagLabel: string;
  categoryLabel: string;
  wikiQuery?: string;
}

interface LandmarkRule {
  keywords: string[];
  imageUrl: string;
  gradient: string;
  emoji: string;
  tagLabel: string;
  /** Exact Wikipedia page or search query for fetching real Wikimedia Commons photo */
  wikiQuery?: string;
}

/**
 * Specific Attractions Dictionary (checked against `placeName` FIRST before `city` so
 * a day trip to Ine or Amanohashidate inside a Kyoto/Osaka itinerary never gets overridden by generic city photos).
 */
const SPECIFIC_ATTRACTION_THUMBNAILS: LandmarkRule[] = [
  // 1. Ine Funaya (Kyoto by the Sea - Fishing Village & Bay)
  {
    keywords: ['ine', 'funaya', 'อิเนะ', 'หมู่บ้านชาวประมง', 'อ่าวอิเนะ', 'ine bay', 'ineura'],
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-cyan-700 via-teal-600 to-blue-800',
    emoji: '🛥️',
    tagLabel: 'Ine Funaya Bay',
    wikiQuery: 'Ine, Kyoto',
  },
  // 2. Amanohashidate (Sandbar & Viewland / Kasamatsu Park)
  {
    keywords: ['amanohashidate', 'kasamatsu', 'viewland', 'อามาโนะฮาชิดาเตะ', 'สะพานสู่สรวงสวรรค์', 'มิยาสึ', 'miyazu'],
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-sky-600 via-cyan-600 to-teal-700',
    emoji: '🌲',
    tagLabel: 'Amanohashidate',
    wikiQuery: 'Amanohashidate',
  },
  // 3. Katsuo-ji Temple (Daruma Temple, Minoh)
  {
    keywords: ['katsuoji', 'katsuo-ji', 'daruma', 'minoh', 'คัตสึโอจิ', 'วัดดารุมะ', 'ดารุมะ', 'มิโนะ', 'น้ำตกมิโนะ'],
    imageUrl: 'https://images.unsplash.com/photo-1528164344705-475426879c0d?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-red-600 via-rose-600 to-orange-600',
    emoji: '🎯',
    tagLabel: 'Katsuo-ji Temple',
    wikiQuery: 'Katsuo-ji',
  },
  // 4. Uji & Byodo-in (Matcha Town)
  {
    keywords: ['uji', 'byodoin', 'byodo-in', 'อูจิ', 'อุจิ', 'เบียวโดอิน', 'nakamura tokichi', 'มัทฉะ'],
    imageUrl: 'https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-emerald-700 via-green-600 to-teal-700',
    emoji: '🍵',
    tagLabel: 'Uji & Byodo-in',
    wikiQuery: 'Byōdō-in',
  },
  // 5. Universal Studios Japan (USJ)
  {
    keywords: ['usj', 'universal', 'nintendo', 'harry potter', 'ยูนิเวอร์แซล'],
    imageUrl: 'https://images.unsplash.com/photo-1613376023733-0a73315d9b06?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-blue-600 via-indigo-600 to-purple-700',
    emoji: '🎢',
    tagLabel: 'Theme Park',
    wikiQuery: 'Universal Studios Japan',
  },
  // 6. Fushimi Inari Taisha
  {
    keywords: ['fushimi', 'inari', 'torii', 'ฟูชิมิ', 'อินาริ', 'เสาแดง', 'เสาโทริอิ'],
    imageUrl: 'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-red-600 via-orange-600 to-amber-600',
    emoji: '⛩️',
    tagLabel: 'Shrine & Temple',
    wikiQuery: 'Fushimi Inari-taisha',
  },
  // 7. Arashiyama / Bamboo Grove / Togetsukyo / Sagano / Tenryu-ji
  {
    keywords: ['arashiyama', 'bamboo', 'togetsukyo', 'sagano', 'tenryuji', 'tenryu-ji', 'อาราชิยามะ', 'ป่าไผ่', 'สะพานโทเง็ตสึเคียว', 'รถไฟสายโรแมนติก', 'เทนริวจิ'],
    imageUrl: 'https://images.unsplash.com/photo-1576675466969-38eeae4b41f6?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-emerald-600 via-teal-600 to-green-700',
    emoji: '🎋',
    tagLabel: 'Arashiyama',
    wikiQuery: 'Arashiyama',
  },
  // 8. Kiyomizu-dera / Higashiyama / Sannenzaka / Ninenzaka
  {
    keywords: ['kiyomizu', 'sannenzaka', 'ninenzaka', 'higashiyama', 'วัดน้ำใส', 'คิโยมิซุ', 'ซันเนนซากะ', 'นินเนนซากะ'],
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-amber-600 via-orange-600 to-rose-700',
    emoji: '🍁',
    tagLabel: 'Kiyomizu-dera',
    wikiQuery: 'Kiyomizu-dera',
  },
  // 9. Kinkaku-ji (Golden Pavilion) & Ginkaku-ji (Silver Pavilion)
  {
    keywords: ['kinkaku', 'golden pavilion', 'วัดทอง', 'คินคะคุจิ', 'ginkaku', 'วัดเงิน'],
    imageUrl: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-amber-500 via-yellow-600 to-orange-700',
    emoji: '✨',
    tagLabel: 'Kinkaku-ji',
    wikiQuery: 'Kinkaku-ji',
  },
  // 10. Namba Yasaka Shrine (Lion Head Shrine) - placed before generic 'yasaka' or 'namba'
  {
    keywords: ['namba yasaka', 'หัวสิงโต', 'นัมบะยาซากะ'],
    imageUrl: 'https://images.unsplash.com/photo-1578469645742-46cae010e5d4?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-emerald-600 via-teal-600 to-slate-800',
    emoji: '🦁',
    tagLabel: 'Namba Yasaka',
    wikiQuery: 'Namba Yasaka Shrine',
  },
  // 11. Gion / Yasaka Shrine / Kamogawa / Pontocho
  {
    keywords: ['gion', 'yasaka', 'hanamikoji', 'kamogawa', 'pontocho', 'กิออน', 'ยาซากะ', 'ฮานามิโคจิ', 'พอนโตะโจ'],
    imageUrl: 'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-rose-600 via-amber-600 to-orange-700',
    emoji: '🏮',
    tagLabel: 'Gion District',
    wikiQuery: 'Gion',
  },
  // 12. Dotonbori / Shinsaibashi / Namba / Glico
  {
    keywords: ['dotonbori', 'shinsaibashi', 'glico', 'โดทงโบริ', 'ชินไซบาชิ', 'กูลิโกะ', 'ป้ายกูลิโกะ', 'นัมบะ', 'namba'],
    imageUrl: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-rose-600 via-orange-500 to-amber-500',
    emoji: '🦀',
    tagLabel: 'Dotonbori & Namba',
    wikiQuery: 'Dōtonbori',
  },
  // 13. Osaka Castle
  {
    keywords: ['osaka castle', 'ปราสาทโอซาก้า', 'osakajo'],
    imageUrl: 'https://images.unsplash.com/photo-1589452271712-64b8a66c7b71?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-emerald-600 via-teal-600 to-cyan-700',
    emoji: '🏯',
    tagLabel: 'Osaka Castle',
    wikiQuery: 'Osaka Castle',
  },
  // 14. Shinsekai & Tsutenkaku Tower & Harukas 300 / Tennoji
  {
    keywords: ['shinsekai', 'tsutenkaku', 'harukas', 'abeno', 'tennoji', 'ชินเซไก', 'ซึเทนคาคุ', 'หอคอยซึเทนคาคุ', 'ฮารุคัส', 'เทนโนจิ'],
    imageUrl: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-amber-600 via-rose-600 to-purple-700',
    emoji: '🗼',
    tagLabel: 'Shinsekai & Tsutenkaku',
    wikiQuery: 'Tsūtenkaku',
  },
  // 15. Umeda Sky Building & Hep Five
  {
    keywords: ['umeda', 'hep five', 'อุเมดะ', 'ชิงช้าสวรรค์แดง'],
    imageUrl: 'https://images.unsplash.com/photo-1513407030348-c983a97b98d8?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-blue-600 via-indigo-600 to-slate-800',
    emoji: '🌆',
    tagLabel: 'Umeda Sky',
    wikiQuery: 'Umeda Sky Building',
  },
  // 16. Osaka Aquarium Kaiyukan & Tempozan
  {
    keywords: ['kaiyukan', 'tempozan', 'aquarium', 'ไคยูคัง', 'พิพิธภัณฑ์สัตว์น้ำ', 'เทมโปซาน'],
    imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-blue-700 via-cyan-600 to-teal-600',
    emoji: '🦈',
    tagLabel: 'Kaiyukan Aquarium',
    wikiQuery: 'Osaka Aquarium Kaiyukan',
  },
  // 17. Nara Park & Todai-ji & Kasuga Taisha
  {
    keywords: ['nara', 'นารา', 'กวาง', 'todaiji', 'todai-ji', 'kasuga', 'วัดโทไดจิ', 'คาซึกะ'],
    imageUrl: 'https://images.unsplash.com/photo-1570459027562-4a916cc6113f?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-emerald-600 via-green-600 to-lime-600',
    emoji: '🦌',
    tagLabel: 'Nara Park',
    wikiQuery: 'Tōdai-ji',
  },
  // 18. Kobe / Harborland / Nunobiki / Arima Onsen / Himeji
  {
    keywords: ['kobe', 'harborland', 'meriken', 'nunobiki', 'arima', 'himeji', 'โกเบ', 'ฮาร์เบอร์แลนด์', 'อาริมะ', 'ฮิเมจิ'],
    imageUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-rose-600 via-indigo-600 to-slate-800',
    emoji: '⚓',
    tagLabel: 'Kobe Port',
    wikiQuery: 'Kobe Port Tower',
  },
  // 19. Kuromon Market / Nishiki Market / Kizu Market / Food & Dining
  {
    keywords: ['kuromon', 'nishiki', 'kizu', 'tsukiji', 'market', 'ตลาดปลา', 'ตลาดคุโรมง', 'ตลาดนิชิกิ', 'ตลาดคิซุ', 'ramen', 'sushi', 'yakiniku', 'izakaya', 'ราเมง', 'ซูชิ', 'เนื้อย่าง', 'คาเฟ่', 'cafe'],
    imageUrl: 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-orange-500 via-amber-500 to-rose-500',
    emoji: '🍜',
    tagLabel: 'Gourmet & Dining',
    wikiQuery: 'Kuromon Ichiba Market',
  },
  // 20. Rinku Premium Outlets & Shopping
  {
    keywords: ['rinku', 'outlet', 'donki', 'shopping', 'りんくう', 'gu', 'uniqlo', 'ช้อปปิ้ง', 'ดองกี้', 'เอาท์เล็ท', 'ริงกุ'],
    imageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-pink-600 via-rose-500 to-amber-500',
    emoji: '🛍️',
    tagLabel: 'Shopping',
    wikiQuery: 'Rinku Town',
  },
  // 21. Airport & Flights (KIX / Narita / Suvarnabhumi)
  {
    keywords: ['airport', 'kansai', 'kix', 'narita', 'haneda', 'suvarnabhumi', 'สนามบิน', 'สุวรรณภูมิ', 'คันไซ', 'นาริตะ'],
    imageUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-blue-600 via-sky-600 to-cyan-600',
    emoji: '✈️',
    tagLabel: 'Airport & Flight',
    wikiQuery: 'Kansai International Airport',
  },
  // 22. Hotel & Check-in
  {
    keywords: ['hotel', 'check-in', 'check in', 'เช็คอิน', 'ที่พัก', 'โรงแรม', 'ฝากกระเป๋า'],
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-teal-600 via-emerald-600 to-slate-700',
    emoji: '🏨',
    tagLabel: 'Hotel & Stay',
  },
  // 23. Mt. Fuji / Kawaguchiko (ONLY when explicitly mentioned!)
  {
    keywords: ['fuji', 'kawaguchiko', 'ฟูจิ', 'คาวากุจิโกะ', 'hakone', 'ฮาโกเน่', 'chureito'],
    imageUrl: 'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-sky-600 via-blue-600 to-indigo-700',
    emoji: '🗻',
    tagLabel: 'Mt. Fuji',
    wikiQuery: 'Mount Fuji',
  },
  // 24. Hokkaido / Sapporo / Otaru
  {
    keywords: ['hokkaido', 'sapporo', 'otaru', 'ฮอกไกโด', 'ซัปโปโร', 'โอตารุ'],
    imageUrl: 'https://images.unsplash.com/photo-1542931287-023b922fa89b?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-cyan-600 via-sky-600 to-blue-700',
    emoji: '❄️',
    tagLabel: 'Hokkaido',
    wikiQuery: 'Otaru Canal',
  },
  // 25. Tokyo / Shibuya / Shinjuku / Asakusa
  {
    keywords: ['tokyo', 'shibuya', 'shinjuku', 'asakusa', 'sensoji', 'harajuku', 'ginza', 'akihabara', 'โตเกียว', 'ชิบูย่า', 'ชินจูกุ', 'อาซากุสะ'],
    imageUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-indigo-600 via-purple-600 to-pink-600',
    emoji: '🗼',
    tagLabel: 'Tokyo City',
    wikiQuery: 'Sensō-ji',
  },
];

/**
 * Broad City Fallbacks (ONLY checked if `placeName` didn't match any specific attraction above)
 */
const CITY_FALLBACK_THUMBNAILS: LandmarkRule[] = [
  {
    keywords: ['osaka', 'โอซาก้า'],
    imageUrl: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-emerald-600 via-teal-600 to-cyan-700',
    emoji: '🏯',
    tagLabel: 'Osaka Landmark',
    wikiQuery: 'Osaka',
  },
  {
    keywords: ['kyoto', 'เกียวโต'],
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-amber-600 via-orange-600 to-rose-700',
    emoji: '🍁',
    tagLabel: 'Kyoto Heritage',
    wikiQuery: 'Kyoto',
  },
];

const DEFAULT_VISUALS: PlaceVisualMeta[] = [
  {
    imageUrl: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-blue-600 via-indigo-600 to-slate-800',
    emoji: '🗾',
    tagLabel: 'Japan Destination',
    categoryLabel: 'Japan Destination',
  },
  {
    imageUrl: 'https://images.unsplash.com/photo-1589452271712-64b8a66c7b71?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-indigo-600 via-purple-600 to-slate-800',
    emoji: '✨',
    tagLabel: 'Highlight Stop',
    categoryLabel: 'Highlight Stop',
  },
  {
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-emerald-600 via-teal-600 to-slate-800',
    emoji: '📍',
    tagLabel: 'City Stop',
    categoryLabel: 'City Stop',
  },
];

/**
 * Extracts a clean search query from a raw itinerary `main_place` string
 * so Wikipedia/Wikimedia API can find the exact real attraction photo.
 */
export function extractAttractionSearchQuery(placeName?: string, city?: string): string {
  if (!placeName) return city || '';

  // Remove bracket tags e.g. [ปรับใหม่], [ไฮไลต์]
  let cleaned = placeName.replace(/\[.*?\]/g, ' ').trim();
  // Remove common Thai action prefixes
  cleaned = cleaned
    .replace(
      /^(นั่งรถไฟไป|เดินทางไป|เดินทางสู่|แวะเที่ยว|แวะชม|แวะ|เดินชม|เดินเล่น|เที่ยวชม|เที่ยว|ล่องเรือ|เช็กอิน|เช็คอิน|เช็กเอาต์|ฝากกระเป๋าที่|ช่วงเช้า|ช่วงบ่าย|ช่วงเย็น)\s*/gi,
      ''
    )
    .trim();

  // Prefer English landmark words if present (e.g. "Ine Funaya", "Amanohashidate", "Katsuo-ji Temple")
  const englishPhrases = cleaned.match(/[A-Za-z][A-Za-z0-9\s'-]{2,}/g);
  if (englishPhrases && englishPhrases.length > 0) {
    const valid = englishPhrases
      .map((s) => s.trim())
      .filter((s) => s.length >= 3 && !/^(day|plan|trip|and|the|from|to)$/i.test(s));
    if (valid.length > 0) {
      valid.sort((a, b) => b.length - a.length);
      return valid[0];
    }
  }

  // Otherwise take the first concise Thai segment before punctuation
  const firstSegment = cleaned.split(/[,()/•\n-]/)[0].trim();
  return firstSegment || cleaned;
}

function matchesKeyword(textLower: string, kw: string): boolean {
  if (!textLower || !kw) return false;
  // Short ASCII-only keywords (e.g. 'ine', 'uji', 'gu', 'kix', 'usj') must match on word boundaries
  // so 'ine' does not falsely match 'shrine'/'line' and 'uji' does not falsely match 'fuji'.
  if (/^[a-z0-9]+$/i.test(kw) && kw.length <= 4) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(textLower);
  }
  return textLower.includes(kw.toLowerCase());
}

export function getPlaceVisualMeta(placeName?: string, city?: string, index = 0): PlaceVisualMeta {
  const placeLower = (placeName || '').toLowerCase();
  const cityLower = (city || '').toLowerCase();

  // Step 1: Match against `placeName` FIRST so specific stops (like Ine, Amanohashidate, Katsuo-ji)
  // are never shadowed by a broad `city` field like "Kyoto" or "Osaka".
  for (const entry of SPECIFIC_ATTRACTION_THUMBNAILS) {
    if (entry.keywords.some((kw) => matchesKeyword(placeLower, kw))) {
      return {
        imageUrl: entry.imageUrl,
        gradient: entry.gradient,
        emoji: entry.emoji,
        tagLabel: entry.tagLabel,
        categoryLabel: entry.tagLabel,
        wikiQuery: entry.wikiQuery,
      };
    }
  }

  // Step 2: Check `city` against specific attractions (e.g. if city itself is "Ine" or "Nara" or "Uji")
  for (const entry of SPECIFIC_ATTRACTION_THUMBNAILS) {
    if (entry.keywords.some((kw) => matchesKeyword(cityLower, kw))) {
      return {
        imageUrl: entry.imageUrl,
        gradient: entry.gradient,
        emoji: entry.emoji,
        tagLabel: entry.tagLabel,
        categoryLabel: entry.tagLabel,
        wikiQuery: entry.wikiQuery,
      };
    }
  }

  // Step 3: Broad city fallback (Osaka / Kyoto)
  const combined = `${placeLower} ${cityLower}`;
  for (const entry of CITY_FALLBACK_THUMBNAILS) {
    if (entry.keywords.some((kw) => matchesKeyword(combined, kw))) {
      return {
        imageUrl: entry.imageUrl,
        gradient: entry.gradient,
        emoji: entry.emoji,
        tagLabel: entry.tagLabel,
        categoryLabel: entry.tagLabel,
        wikiQuery: entry.wikiQuery,
      };
    }
  }

  return {
    ...DEFAULT_VISUALS[Math.abs(index) % DEFAULT_VISUALS.length],
    wikiQuery: extractAttractionSearchQuery(placeName, city),
  };
}

// In-memory + localStorage cache for real Wikipedia/Wikimedia place photos
const WIKI_CACHE_STORAGE_KEY = 'travel_tracker_real_place_photos_v2';
const memoryPhotoCache = new Map<string, string>();
const inflightRequests = new Map<string, Promise<string | null>>();

function loadCachedPhotoUrl(cacheKey: string): string | null {
  if (memoryPhotoCache.has(cacheKey)) {
    return memoryPhotoCache.get(cacheKey)!;
  }
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(WIKI_CACHE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed[cacheKey] === 'string') {
      memoryPhotoCache.set(cacheKey, parsed[cacheKey]);
      return parsed[cacheKey];
    }
  } catch {}
  return null;
}

function saveCachedPhotoUrl(cacheKey: string, url: string): void {
  memoryPhotoCache.set(cacheKey, url);
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(WIKI_CACHE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[cacheKey] = url;
    localStorage.setItem(WIKI_CACHE_STORAGE_KEY, JSON.stringify(parsed));
  } catch {}
}

async function queryWikipediaRestSummary(title: string, lang: 'en' | 'th'): Promise<string | null> {
  if (!title || typeof fetch !== 'function') return null;
  try {
    const summaryUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      title.replace(/\s+/g, '_')
    )}`;
    const res = await fetch(summaryUrl);
    if (!res.ok) return null;
    const data = await res.json();
    const src: string | undefined = data?.thumbnail?.source || data?.originalimage?.source;
    if (src && /^https?:\/\//i.test(src) && !src.endsWith('.svg') && !src.includes('Flag_of_')) {
      return src;
    }
  } catch {}
  return null;
}

async function queryWikipediaThumbnail(query: string, lang: 'en' | 'th'): Promise<string | null> {
  if (!query || typeof fetch !== 'function') return null;
  try {
    const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      query
    )}&gsrlimit=3&prop=pageimages&piprop=thumbnail&pithumbsize=800&format=json&origin=*`;
    const res = await fetch(searchUrl);
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data?.query?.pages;
    if (!pages) return null;

    const pageList = Object.values(pages) as any[];
    pageList.sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
    for (const p of pageList) {
      const src: string | undefined = p?.thumbnail?.source;
      if (src && /^https?:\/\//i.test(src) && !src.endsWith('.svg') && !src.includes('Flag_of_')) {
        return src;
      }
    }
  } catch {}
  return null;
}

/**
 * Fetches a real photograph of the attraction from Wikipedia / Wikimedia Commons API.
 */
export async function fetchRealPlacePhotoUrl(
  placeName?: string,
  city?: string,
  explicitWikiQuery?: string
): Promise<string | null> {
  const baseQuery = (explicitWikiQuery || extractAttractionSearchQuery(placeName, city)).trim();
  if (!baseQuery) return null;

  const cacheKey = `${baseQuery.toLowerCase()}|${(city || '').toLowerCase()}`;
  const cached = loadCachedPhotoUrl(cacheKey);
  if (cached) return cached;

  if (inflightRequests.has(cacheKey)) {
    return inflightRequests.get(cacheKey)!;
  }

  const promise = (async () => {
    const hasThai = /[\u0E00-\u0E7F]/.test(baseQuery);
    let url: string | null = null;

    if (explicitWikiQuery && !hasThai) {
      // Fast path: direct Wikipedia REST page summary for known landmark title
      url = await queryWikipediaRestSummary(explicitWikiQuery, 'en');
    }

    if (!url) {
      if (hasThai) {
        url = await queryWikipediaThumbnail(`${baseQuery} ญี่ปุ่น`, 'th');
        if (!url) url = await queryWikipediaThumbnail(baseQuery, 'th');
      } else {
        url = await queryWikipediaThumbnail(baseQuery, 'en');
        if (!url && city) {
          url = await queryWikipediaThumbnail(`${baseQuery} ${city}`, 'en');
        }
      }
    }

    if (url) {
      saveCachedPhotoUrl(cacheKey, url);
    }
    inflightRequests.delete(cacheKey);
    return url;
  })();

  inflightRequests.set(cacheKey, promise);
  return promise;
}

/**
 * React hook that returns `PlaceVisualMeta` immediately and automatically upgrades `imageUrl`
 * with the real attraction photograph fetched from Wikipedia / Wikimedia Commons.
 */
export function usePlaceVisualMeta(placeName?: string, city?: string, index = 0): PlaceVisualMeta {
  const baseMeta = getPlaceVisualMeta(placeName, city, index);
  const [realPhotoUrl, setRealPhotoUrl] = useState<string | null>(() => {
    const q = (baseMeta.wikiQuery || extractAttractionSearchQuery(placeName, city)).trim();
    if (!q) return null;
    return loadCachedPhotoUrl(`${q.toLowerCase()}|${(city || '').toLowerCase()}`);
  });

  useEffect(() => {
    let cancelled = false;
    const q = (baseMeta.wikiQuery || extractAttractionSearchQuery(placeName, city)).trim();
    if (!q) return;

    const cached = loadCachedPhotoUrl(`${q.toLowerCase()}|${(city || '').toLowerCase()}`);
    if (cached) {
      setRealPhotoUrl(cached);
      return;
    }

    fetchRealPlacePhotoUrl(placeName, city, baseMeta.wikiQuery).then((url) => {
      if (!cancelled && url) {
        setRealPhotoUrl(url);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [placeName, city, baseMeta.wikiQuery]);

  if (realPhotoUrl) {
    return {
      ...baseMeta,
      imageUrl: realPhotoUrl,
    };
  }
  return baseMeta;
}

/**
 * Progressive-enhancement wrapper around View Transitions API (same-document-transitions)
 * with accessibility focus routing and fallback for unsupported browsers/test environments.
 */
export function triggerViewTransition(updateDOM: () => void, focusElementId?: string): void {
  if (typeof document === 'undefined' || typeof (document as any).startViewTransition !== 'function') {
    updateDOM();
    if (focusElementId && typeof document !== 'undefined') {
      document.getElementById(focusElementId)?.focus({ preventScroll: true });
    }
    return;
  }

  try {
    const transition = (document as any).startViewTransition(() => {
      updateDOM();
    });
    if (focusElementId && transition?.finished) {
      transition.finished.finally(() => {
        document.getElementById(focusElementId)?.focus({ preventScroll: true });
      });
    }
  } catch {
    updateDOM();
  }
}


