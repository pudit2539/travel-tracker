// src/lib/placeThumbnails.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface PlacePhotoCandidate {
  url: string;
  author?: string;
  placeName?: string;
}

export interface PlaceVisualMeta {
  imageUrl: string;
  gradient: string;
  emoji: string;
  tagLabel: string;
  categoryLabel: string;
  wikiQuery?: string;
  /** Photo source attribution ('Google Maps' | 'Wikimedia HD' | 'Custom' | 'Curated HD') */
  photoSource?: 'google_places' | 'wikimedia_hd' | 'custom' | 'curated';
  attributionText?: string;
  isCustomPhoto?: boolean;
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
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85',
    gradient: 'from-cyan-700 via-teal-600 to-blue-800',
    emoji: '🛥️',
    tagLabel: 'Ine Funaya Bay',
    wikiQuery: 'Ine, Kyoto',
  },
  // 2. Amanohashidate (Sandbar & Viewland / Kasamatsu Park)
  {
    keywords: ['amanohashidate', 'kasamatsu', 'viewland', 'อามาโนะฮาชิดาเตะ', 'สะพานสู่สรวงสวรรค์', 'มิยาสึ', 'miyazu'],
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=85',
    gradient: 'from-sky-600 via-cyan-600 to-teal-700',
    emoji: '🌲',
    tagLabel: 'Amanohashidate',
    wikiQuery: 'Amanohashidate',
  },
  // 3. Katsuo-ji Temple (Daruma Temple, Minoh)
  {
    keywords: ['katsuoji', 'katsuo-ji', 'daruma', 'minoh', 'คัตสึโอจิ', 'วัดดารุมะ', 'ดารุมะ', 'มิโนะ', 'น้ำตกมิโนะ'],
    imageUrl: 'https://images.unsplash.com/photo-1528164344705-475426879c0d?auto=format&fit=crop&w=1200&q=85',
    gradient: 'from-red-600 via-rose-600 to-orange-600',
    emoji: '🎯',
    tagLabel: 'Katsuo-ji Temple',
    wikiQuery: 'Katsuo-ji',
  },
  // 4. Uji & Byodo-in (Matcha Town)
  {
    keywords: ['uji', 'byodoin', 'byodo-in', 'อูจิ', 'อุจิ', 'เบียวโดอิน', 'nakamura tokichi', 'มัทฉะ'],
    imageUrl: 'https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?auto=format&fit=crop&w=1200&q=85',
    gradient: 'from-emerald-700 via-green-600 to-teal-700',
    emoji: '🍵',
    tagLabel: 'Uji & Byodo-in',
    wikiQuery: 'Byōdō-in',
  },
  // 5. Universal Studios Japan (USJ)
  {
    keywords: ['usj', 'universal', 'nintendo', 'harry potter', 'ยูนิเวอร์แซล'],
    imageUrl: 'https://images.unsplash.com/photo-1613376023733-0a73315d9b06?auto=format&fit=crop&w=1200&q=85',
    gradient: 'from-blue-600 via-indigo-600 to-purple-700',
    emoji: '🎢',
    tagLabel: 'Theme Park',
    wikiQuery: 'Universal Studios Japan',
  },
  // 6. Hotel & Check-in / Check-out (placed BEFORE district names like Shinsaibashi/Kyoto so hotel stops don't get misclassified as Dotonbori)
  {
    keywords: ['hotel', 'check-in', 'check in', 'check-out', 'check out', 'เช็คอิน', 'เช็กอิน', 'เช็กเอาต์', 'เช็คเอาท์', 'ที่พัก', 'โรงแรม', 'ฝากกระเป๋า', 'hostel', 'ryokan'],
    imageUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85',
    gradient: 'from-teal-600 via-emerald-600 to-slate-700',
    emoji: '🏨',
    tagLabel: 'Hotel & Stay',
  },
  // 7. Fushimi Inari Taisha
  {
    keywords: ['fushimi', 'inari', 'torii', 'ฟูชิมิ', 'อินาริ', 'เสาแดง', 'เสาโทริอิ'],
    imageUrl: 'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?auto=format&fit=crop&w=1200&q=85',
    gradient: 'from-red-600 via-orange-600 to-amber-600',
    emoji: '⛩️',
    tagLabel: 'Shrine & Temple',
    wikiQuery: 'Fushimi Inari-taisha',
  },
  // 8. Arashiyama / Bamboo Grove / Togetsukyo / Sagano / Tenryu-ji
  {
    keywords: ['arashiyama', 'bamboo', 'togetsukyo', 'sagano', 'tenryuji', 'tenryu-ji', 'อาราชิยามะ', 'ป่าไผ่', 'สะพานโทเง็ตสึเคียว', 'รถไฟสายโรแมนติก', 'เทนริวจิ'],
    imageUrl: 'https://images.unsplash.com/photo-1576675466969-38eeae4b41f6?auto=format&fit=crop&w=1200&q=85',
    gradient: 'from-emerald-600 via-teal-600 to-green-700',
    emoji: '🎋',
    tagLabel: 'Arashiyama',
    wikiQuery: 'Arashiyama',
  },
  // 9. Kiyomizu-dera / Higashiyama / Sannenzaka / Ninenzaka
  {
    keywords: ['kiyomizu', 'sannenzaka', 'ninenzaka', 'higashiyama', 'วัดน้ำใส', 'คิโยมิซุ', 'ซันเนนซากะ', 'นินเนนซากะ'],
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=85',
    gradient: 'from-amber-600 via-orange-600 to-rose-700',
    emoji: '🍁',
    tagLabel: 'Kiyomizu-dera',
    wikiQuery: 'Kiyomizu-dera',
  },
  // 10. Kinkaku-ji (Golden Pavilion) & Ginkaku-ji (Silver Pavilion)
  {
    keywords: ['kinkaku', 'golden pavilion', 'วัดทอง', 'คินคะคุจิ', 'ginkaku', 'วัดเงิน'],
    imageUrl: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=1200&q=85',
    gradient: 'from-amber-500 via-yellow-600 to-orange-700',
    emoji: '✨',
    tagLabel: 'Kinkaku-ji',
    wikiQuery: 'Kinkaku-ji',
  },
  // 11. Namba Yasaka Shrine (Lion Head Shrine) - placed before generic 'yasaka' or 'namba'
  {
    keywords: ['namba yasaka', 'หัวสิงโต', 'นัมบะยาซากะ'],
    imageUrl: 'https://images.unsplash.com/photo-1578469645742-46cae010e5d4?auto=format&fit=crop&w=1200&q=85',
    gradient: 'from-emerald-600 via-teal-600 to-slate-800',
    emoji: '🦁',
    tagLabel: 'Namba Yasaka',
    wikiQuery: 'Namba Yasaka Shrine',
  },
  // 12. Gion / Yasaka Shrine / Kamogawa / Pontocho
  {
    keywords: ['gion', 'yasaka', 'hanamikoji', 'kamogawa', 'pontocho', 'กิออน', 'ยาซากะ', 'ฮานามิโคจิ', 'พอนโตะโจ'],
    imageUrl: 'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?auto=format&fit=crop&w=1200&q=85',
    gradient: 'from-rose-600 via-amber-600 to-orange-700',
    emoji: '🏮',
    tagLabel: 'Gion District',
    wikiQuery: 'Gion',
  },
  // 13. Dotonbori / Shinsaibashi / Namba / Glico
  {
    keywords: ['dotonbori', 'shinsaibashi', 'glico', 'โดทงโบริ', 'ชินไซบาชิ', 'กูลิโกะ', 'ป้ายกูลิโกะ', 'นัมบะ', 'namba'],
    imageUrl: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?auto=format&fit=crop&w=1200&q=85',
    gradient: 'from-rose-600 via-orange-500 to-amber-500',
    emoji: '🦀',
    tagLabel: 'Dotonbori & Namba',
    wikiQuery: 'Dōtonbori',
  },
  // 14. Osaka Castle
  {
    keywords: ['osaka castle', 'ปราสาทโอซาก้า', 'osakajo'],
    imageUrl: 'https://images.unsplash.com/photo-1589452271712-64b8a66c7b71?auto=format&fit=crop&w=1200&q=85',
    gradient: 'from-emerald-600 via-teal-600 to-cyan-700',
    emoji: '🏯',
    tagLabel: 'Osaka Castle',
    wikiQuery: 'Osaka Castle',
  },
  // 15. Shinsekai & Tsutenkaku Tower & Harukas 300 / Tennoji
  {
    keywords: ['shinsekai', 'tsutenkaku', 'harukas', 'abeno', 'tennoji', 'ชินเซไก', 'ซึเทนคาคุ', 'หอคอยซึเทนคาคุ', 'ฮารุคัส', 'เทนโนจิ'],
    imageUrl: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?auto=format&fit=crop&w=1200&q=85',
    gradient: 'from-amber-600 via-rose-600 to-purple-700',
    emoji: '🗼',
    tagLabel: 'Shinsekai & Tsutenkaku',
    wikiQuery: 'Tsūtenkaku',
  },
  // 16. Umeda Sky Building & Hep Five
  {
    keywords: ['umeda', 'hep five', 'อุเมดะ', 'ชิงช้าสวรรค์แดง'],
    imageUrl: 'https://images.unsplash.com/photo-1513407030348-c983a97b98d8?auto=format&fit=crop&w=1200&q=85',
    gradient: 'from-blue-600 via-indigo-600 to-slate-800',
    emoji: '🌆',
    tagLabel: 'Umeda Sky',
    wikiQuery: 'Umeda Sky Building',
  },
  // 17. Osaka Aquarium Kaiyukan & Tempozan
  {
    keywords: ['kaiyukan', 'tempozan', 'aquarium', 'ไคยูคัง', 'พิพิธภัณฑ์สัตว์น้ำ', 'เทมโปซาน'],
    imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=85',
    gradient: 'from-blue-700 via-cyan-600 to-teal-600',
    emoji: '🦈',
    tagLabel: 'Kaiyukan Aquarium',
    wikiQuery: 'Osaka Aquarium Kaiyukan',
  },
  // 18. Nara Park & Todai-ji & Kasuga Taisha
  {
    keywords: ['nara', 'นารา', 'กวาง', 'todaiji', 'todai-ji', 'kasuga', 'วัดโทไดจิ', 'คาซึกะ'],
    imageUrl: 'https://images.unsplash.com/photo-1570459027562-4a916cc6113f?auto=format&fit=crop&w=1200&q=85',
    gradient: 'from-emerald-600 via-green-600 to-lime-600',
    emoji: '🦌',
    tagLabel: 'Nara Park',
    wikiQuery: 'Tōdai-ji',
  },
  // 19. Kobe / Harborland / Nunobiki / Arima Onsen / Himeji
  {
    keywords: ['kobe', 'harborland', 'meriken', 'nunobiki', 'arima', 'himeji', 'โกเบ', 'ฮาร์เบอร์แลนด์', 'อาริมะ', 'ฮิเมจิ'],
    imageUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=85',
    gradient: 'from-rose-600 via-indigo-600 to-slate-800',
    emoji: '⚓',
    tagLabel: 'Kobe Port',
    wikiQuery: 'Kobe Port Tower',
  },
  // 20. Kuromon Market / Nishiki Market / Kizu Market / Food & Dining
  {
    keywords: ['kuromon', 'nishiki', 'kizu', 'tsukiji', 'market', 'ตลาดปลา', 'ตลาดคุโรมง', 'ตลาดนิชิกิ', 'ตลาดคิซุ', 'ramen', 'sushi', 'yakiniku', 'izakaya', 'ราเมง', 'ซูชิ', 'เนื้อย่าง', 'คาเฟ่', 'cafe'],
    imageUrl: 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=1200&q=85',
    gradient: 'from-orange-500 via-amber-500 to-rose-500',
    emoji: '🍜',
    tagLabel: 'Gourmet & Dining',
    wikiQuery: 'Kuromon Ichiba Market',
  },
  // 20.1 Den Den Town & Nipponbashi (Anime & Model District)
  {
    keywords: ['den den', 'denden', 'nipponbashi', 'นิปปอนบาชิ', 'เด็นเด็น', 'เดนเดน', 'joshin', 'surugaya', 'super kids land', 'mandarake', 'gashapon', 'ของเล่น', 'กันพลา'],
    imageUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=1200&q=85',
    gradient: 'from-indigo-600 via-purple-600 to-pink-600',
    emoji: '🤖',
    tagLabel: 'Den Den Town',
    wikiQuery: 'Nipponbashi',
  },
  // 20.2 Ikuno Korea Town & Tsuruhashi
  {
    keywords: ['korea town', 'koreatown', 'ikuno', 'tsuruhashi', 'สึรุฮาชิ', 'โคเรียทาวน์', 'เกาหลี', 'miyuki-dori'],
    imageUrl: 'https://images.unsplash.com/photo-1583224964978-2257b96073d3?auto=format&fit=crop&w=1200&q=85',
    gradient: 'from-red-600 via-rose-600 to-amber-600',
    emoji: '🥘',
    tagLabel: 'Korea Town',
    wikiQuery: 'Tsuruhashi Station',
  },
  // 21. Rinku Premium Outlets & Shopping
  {
    keywords: ['rinku', 'outlet', 'donki', 'shopping', 'りんくう', 'gu', 'uniqlo', 'ช้อปปิ้ง', 'ดองกี้', 'เอาท์เล็ท', 'ริงกุ'],
    imageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=85',
    gradient: 'from-pink-600 via-rose-500 to-amber-500',
    emoji: '🛍️',
    tagLabel: 'Shopping',
    wikiQuery: 'Rinku Town',
  },
  // 22. Airport & Flights (KIX / Narita / Suvarnabhumi)
  {
    keywords: ['airport', 'kansai', 'kix', 'narita', 'haneda', 'suvarnabhumi', 'สนามบิน', 'สุวรรณภูมิ', 'คันไซ', 'นาริตะ'],
    imageUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=85',
    gradient: 'from-blue-600 via-sky-600 to-cyan-600',
    emoji: '✈️',
    tagLabel: 'Airport & Flight',
    wikiQuery: 'Kansai International Airport',
  },
  // 23. Mt. Fuji / Kawaguchiko (ONLY when explicitly mentioned!)
  {
    keywords: ['fuji', 'kawaguchiko', 'ฟูจิ', 'คาวากุจิโกะ', 'hakone', 'ฮาโกเน่', 'chureito'],
    imageUrl: 'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?auto=format&fit=crop&w=1200&q=85',
    gradient: 'from-sky-600 via-blue-600 to-indigo-700',
    emoji: '🗻',
    tagLabel: 'Mt. Fuji',
    wikiQuery: 'Mount Fuji',
  },
  // 24. Hokkaido / Sapporo / Otaru
  {
    keywords: ['hokkaido', 'sapporo', 'otaru', 'ฮอกไกโด', 'ซัปโปโร', 'โอตารุ'],
    imageUrl: 'https://images.unsplash.com/photo-1542931287-023b922fa89b?auto=format&fit=crop&w=1200&q=85',
    gradient: 'from-cyan-600 via-sky-600 to-blue-700',
    emoji: '❄️',
    tagLabel: 'Hokkaido',
    wikiQuery: 'Otaru Canal',
  },
  // 25. Tokyo / Shibuya / Shinjuku / Asakusa
  {
    keywords: ['tokyo', 'shibuya', 'shinjuku', 'asakusa', 'sensoji', 'harajuku', 'ginza', 'akihabara', 'โตเกียว', 'ชิบูย่า', 'ชินจูกุ', 'อาซากุสะ'],
    imageUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=85',
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
    imageUrl: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?auto=format&fit=crop&w=1200&q=85',
    gradient: 'from-emerald-600 via-teal-600 to-cyan-700',
    emoji: '🏯',
    tagLabel: 'Osaka Landmark',
    wikiQuery: 'Osaka',
  },
  {
    keywords: ['kyoto', 'เกียวโต'],
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=85',
    gradient: 'from-amber-600 via-orange-600 to-rose-700',
    emoji: '🍁',
    tagLabel: 'Kyoto Heritage',
    wikiQuery: 'Kyoto',
  },
];

const DEFAULT_VISUALS: PlaceVisualMeta[] = [
  {
    imageUrl: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?auto=format&fit=crop&w=1200&q=85',
    gradient: 'from-blue-600 via-indigo-600 to-slate-800',
    emoji: '🗾',
    tagLabel: 'Japan Destination',
    categoryLabel: 'Japan Destination',
  },
  {
    imageUrl: 'https://images.unsplash.com/photo-1589452271712-64b8a66c7b71?auto=format&fit=crop&w=1200&q=85',
    gradient: 'from-indigo-600 via-purple-600 to-slate-800',
    emoji: '✨',
    tagLabel: 'Highlight Stop',
    categoryLabel: 'Highlight Stop',
  },
  {
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=85',
    gradient: 'from-emerald-600 via-teal-600 to-slate-800',
    emoji: '📍',
    tagLabel: 'City Stop',
    categoryLabel: 'City Stop',
  },
];

/**
 * Extracts a clean search query from a raw itinerary `main_place` string
 * so Google Places API (New) and Wikimedia Commons can find the exact real attraction or hotel photo.
 */
export function extractAttractionSearchQuery(placeName?: string, city?: string): string {
  if (!placeName) return city || '';

  // Remove bracket tags e.g. [ปรับใหม่], [ไฮไลต์]
  let cleaned = placeName.replace(/\[.*?\]/g, ' ').trim();
  // Remove common Thai action prefixes
  cleaned = cleaned
    .replace(
      /^(เข้าเช็คอินและฝากกระเป๋าเดินทางที่โรงแรม|เข้าเช็กอินและฝากกระเป๋าเดินทางที่โรงแรม|เช็กเอาต์จาก|เช็คเอาท์จาก|เช็กอินที่|เช็คอินที่|ฝากกระเป๋าเดินทางที่|ฝากกระเป๋าที่|นั่งรถไฟไป|เดินทางไป|เดินทางสู่|แวะเที่ยว|แวะชม|แวะ|เดินชม|เดินเล่น|เที่ยวชม|เที่ยว|ล่องเรือ|เช็กอิน|เช็คอิน|เช็กเอาต์|ช่วงเช้า|ช่วงบ่าย|ช่วงเย็น)\s*/gi,
      ''
    )
    .trim();

  // Prefer English landmark or hotel phrases if present (e.g. "Hotel Musse Kyoto Shijo Kawaramachi", "Quintessa Hotel Osaka Shinsaibashi Comic & Books", "Ine Funaya")
  const englishPhrases = cleaned.match(/[A-Za-z][A-Za-z0-9\s&'-]{2,}/g);
  if (englishPhrases && englishPhrases.length > 0) {
    const valid = englishPhrases
      .map((s) => s.trim())
      .filter((s) => s.length >= 3 && !/^(day|plan|trip|and|the|from|to|icoca|jr)$/i.test(s));
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

  // Step 1: Match against `placeName` FIRST so specific stops (like Ine, Amanohashidate, Katsuo-ji, or Hotels)
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
        photoSource: 'curated',
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
        photoSource: 'curated',
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
        photoSource: 'curated',
      };
    }
  }

  return DEFAULT_VISUALS[Math.abs(index) % DEFAULT_VISUALS.length];
}

// ============================================================================
// Option 3: Custom User-Uploaded / Pasted / URL Photo Overrides
// ============================================================================

const CUSTOM_PLACE_PHOTO_STORAGE_KEY = 'travel_tracker_custom_place_photos_v1';
export const CUSTOM_PHOTO_CHANGED_EVENT = 'custom-place-photo-changed';
const memoryCustomPhotoCache = new Map<string, string>();

export function getCustomPlacePhotoKey(placeName?: string, itemId?: string): string {
  if (itemId) return `item:${itemId}`;
  return `place:${(placeName || '').trim().toLowerCase()}`;
}

function readCustomPhotoMap(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CUSTOM_PLACE_PHOTO_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getCustomPlacePhoto(placeName?: string, itemId?: string): string | null {
  const itemKey = itemId ? `item:${itemId}` : '';
  const placeKey = placeName ? `place:${placeName.trim().toLowerCase()}` : '';

  if (itemKey && memoryCustomPhotoCache.has(itemKey)) {
    return memoryCustomPhotoCache.get(itemKey)!;
  }
  if (placeKey && memoryCustomPhotoCache.has(placeKey)) {
    return memoryCustomPhotoCache.get(placeKey)!;
  }

  const map = readCustomPhotoMap();
  if (itemKey && typeof map[itemKey] === 'string' && map[itemKey]) {
    memoryCustomPhotoCache.set(itemKey, map[itemKey]);
    return map[itemKey];
  }
  if (placeKey && typeof map[placeKey] === 'string' && map[placeKey]) {
    memoryCustomPhotoCache.set(placeKey, map[placeKey]);
    return map[placeKey];
  }
  return null;
}

const syncedTripIds = new Set<string>();
const inflightTripSync = new Map<string, Promise<void>>();

/**
 * Hydrates in-memory + localStorage custom place photo cache from a remote `customPlacePhotos` map
 * (used both by `page.tsx` during initial/Realtime `fetchTripData` and by `loadCustomPlacePhotosFromSupabase`).
 */
export function hydrateCustomPlacePhotosFromMap(
  remoteMap?: Record<string, string> | null,
  tripId?: string
): void {
  if (typeof window === 'undefined' || !remoteMap || typeof remoteMap !== 'object') return;
  if (tripId) {
    syncedTripIds.add(tripId);
  }

  const localMap = readCustomPhotoMap();
  let changed = false;

  for (const [k, v] of Object.entries(remoteMap)) {
    if (typeof v === 'string' && v && localMap[k] !== v) {
      localMap[k] = v;
      memoryCustomPhotoCache.set(k, v);
      changed = true;
    }
  }

  if (changed) {
    try {
      localStorage.setItem(CUSTOM_PLACE_PHOTO_STORAGE_KEY, JSON.stringify(localMap));
    } catch {}
    window.dispatchEvent(new CustomEvent(CUSTOM_PHOTO_CHANGED_EVENT, { detail: { tripId } }));
  }
}

/**
 * Syncs custom place photos into the trip's `__meta_trip_data__` row in Supabase
 * so custom PNG screenshots and selected Google Maps photos appear across PC, Mobile, and iPad.
 * Only deletes keys explicitly passed in `deletedKeys` so a new device with empty localStorage
 * never wipes out custom photos uploaded from another device.
 */
export async function syncCustomPlacePhotosToSupabase(
  tripId: string,
  deletedKeys: string[] = []
): Promise<void> {
  if (!tripId) return;
  try {
    const map = readCustomPhotoMap();
    const { data: rows } = await supabase
      .from('itinerary_items')
      .select('id, backup_plan')
      .eq('trip_id', tripId)
      .eq('date_label', '__meta_trip_data__')
      .order('id', { ascending: true })
      .limit(1);

    const existing = Array.isArray(rows) ? rows[0] : (rows as any);

    let payload: any = {};
    if (existing?.backup_plan) {
      try {
        payload = JSON.parse(existing.backup_plan);
      } catch {}
    }

    const mergedPhotos: Record<string, string> = {
      ...(payload.customPlacePhotos || {}),
      ...map,
    };

    // Only remove keys that were explicitly reset by the user
    for (const delKey of deletedKeys) {
      if (delKey) {
        delete mergedPhotos[delKey];
      }
    }

    payload.customPlacePhotos = mergedPhotos;

    if (existing?.id) {
      await supabase
        .from('itinerary_items')
        .update({ backup_plan: JSON.stringify(payload) })
        .eq('id', existing.id);
    } else {
      await supabase.from('itinerary_items').insert([
        {
          trip_id: tripId,
          date_label: '__meta_trip_data__',
          main_place: 'SYSTEM_TRIP_METADATA',
          backup_plan: JSON.stringify(payload),
          sort_order: -9999,
        },
      ]);
    }
  } catch {}
}

/**
 * Loads custom place photos from the trip's `__meta_trip_data__` row in Supabase (once per tripId)
 * and merges them into local cache so all devices see the same custom photos.
 */
export async function loadCustomPlacePhotosFromSupabase(
  tripId?: string,
  force = false
): Promise<void> {
  if (!tripId || typeof window === 'undefined') return;
  if (!force && syncedTripIds.has(tripId)) return;
  if (inflightTripSync.has(tripId)) return inflightTripSync.get(tripId)!;

  const p = (async () => {
    try {
      syncedTripIds.add(tripId);
      const { data: rows } = await supabase
        .from('itinerary_items')
        .select('backup_plan')
        .eq('trip_id', tripId)
        .eq('date_label', '__meta_trip_data__')
        .order('id', { ascending: true })
        .limit(1);

      const metaRow = Array.isArray(rows) ? rows[0] : (rows as any);
      if (!metaRow?.backup_plan) return;
      const parsed = JSON.parse(metaRow.backup_plan);
      hydrateCustomPlacePhotosFromMap(parsed?.customPlacePhotos, tripId);
    } catch {
      // ignore network/parse errors in offline mode
    } finally {
      inflightTripSync.delete(tripId);
    }
  })();

  inflightTripSync.set(tripId, p);
  return p;
}

export function setCustomPlacePhoto(
  placeName: string | undefined,
  imageUrlOrDataUrl: string | null,
  itemId?: string,
  tripId?: string
): void {
  const itemKey = itemId ? `item:${itemId}` : '';
  const placeKey = placeName ? `place:${placeName.trim().toLowerCase()}` : '';

  const map = readCustomPhotoMap();
  const deletedKeys: string[] = [];

  if (!imageUrlOrDataUrl) {
    if (itemKey) {
      memoryCustomPhotoCache.delete(itemKey);
      delete map[itemKey];
      deletedKeys.push(itemKey);
    }
    if (placeKey) {
      memoryCustomPhotoCache.delete(placeKey);
      delete map[placeKey];
      deletedKeys.push(placeKey);
    }
  } else {
    if (itemKey) {
      memoryCustomPhotoCache.set(itemKey, imageUrlOrDataUrl);
      map[itemKey] = imageUrlOrDataUrl;
    }
    if (placeKey) {
      memoryCustomPhotoCache.set(placeKey, imageUrlOrDataUrl);
      map[placeKey] = imageUrlOrDataUrl;
    }
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CUSTOM_PLACE_PHOTO_STORAGE_KEY, JSON.stringify(map));
    } catch {}
    window.dispatchEvent(
      new CustomEvent(CUSTOM_PHOTO_CHANGED_EVENT, {
        detail: { placeName, itemId, tripId, imageUrl: imageUrlOrDataUrl },
      })
    );
  }

  if (tripId) {
    syncCustomPlacePhotosToSupabase(tripId, deletedKeys).catch(() => {});
  }
}

/**
 * Fetches up to 5 photo candidates from Google Places API (New) via `/api/place-photo?candidates=1`
 * so the user can visually pick their favorite angle in CustomPlacePhotoModal.
 */
export async function fetchGooglePlacesPhotoCandidates(
  query: string,
  city?: string,
  rawQuery = false
): Promise<PlacePhotoCandidate[]> {
  if (!query || typeof window === 'undefined' || typeof fetch !== 'function') return [];
  try {
    const cleanQ = rawQuery ? query.trim() : extractAttractionSearchQuery(query, city) || query;
    const res = await fetch(
      `/api/place-photo?q=${encodeURIComponent(cleanQ)}&city=${encodeURIComponent(
        city || ''
      )}&candidates=1`
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data?.photos) && data.photos.length > 0) {
      return data.photos;
    }
    if (data?.photoUrl) {
      return [{ url: data.photoUrl, placeName: data.placeName, author: data.author }];
    }
  } catch {}
  return [];
}

/**
 * Builds a Google Maps Street View / Place Panorama lookup URL for finding storefronts & hotel entrances.
 */
export function buildStreetViewUrl(placeName?: string, city?: string): string {
  const cleanQuery = extractAttractionSearchQuery(placeName, city) || placeName || 'Japan';
  const cleanCity = (city || 'Japan').split(/->|→/)[0].trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${cleanQuery} ${cleanCity}`
  )}`;
}

/**
 * Compresses and resizes an uploaded PNG/JPG or clipboard image into a sharp Data URL
 * so it can be persisted cleanly in localStorage / metadata.
 */
export function compressImageFileToDataUrl(
  file: File | Blob,
  maxWidth = 1000,
  quality = 0.84
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      if (typeof document === 'undefined' || typeof Image === 'undefined') {
        resolve(rawDataUrl);
        return;
      }
      const img = new Image();
      img.onload = () => {
        try {
          let width = img.width || maxWidth;
          let height = img.height || Math.round(maxWidth * 0.625);
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawDataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed && compressed.length > 32 ? compressed : rawDataUrl);
        } catch {
          resolve(rawDataUrl);
        }
      };
      img.onerror = () => resolve(rawDataUrl);
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// Option 1 + 2: Hybrid Real Place Photo Resolver
//   Layer 1: Google Maps Platform Places API (New) via `/api/place-photo` (1200px HD)
//   Layer 2: Wikimedia / Wikipedia HD Photo Resolver (1280px HD)
// ============================================================================

const PHOTO_CACHE_STORAGE_KEY = 'travel_tracker_real_place_photos_v3';

export interface ResolvedPhotoRecord {
  url: string;
  source: 'google_places' | 'wikimedia_hd';
  attribution?: string;
}

const memoryPhotoCache = new Map<string, ResolvedPhotoRecord>();
const inflightRequests = new Map<string, Promise<ResolvedPhotoRecord | null>>();

function loadCachedPhotoRecord(cacheKey: string): ResolvedPhotoRecord | null {
  if (memoryPhotoCache.has(cacheKey)) {
    return memoryPhotoCache.get(cacheKey)!;
  }
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PHOTO_CACHE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const entry = parsed?.[cacheKey];
    if (typeof entry === 'string' && entry) {
      const rec: ResolvedPhotoRecord = { url: entry, source: 'wikimedia_hd' };
      memoryPhotoCache.set(cacheKey, rec);
      return rec;
    }
    if (entry && typeof entry.url === 'string') {
      memoryPhotoCache.set(cacheKey, entry);
      return entry;
    }
  } catch {}
  return null;
}

function saveCachedPhotoRecord(cacheKey: string, record: ResolvedPhotoRecord): void {
  memoryPhotoCache.set(cacheKey, record);
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(PHOTO_CACHE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[cacheKey] = record;
    localStorage.setItem(PHOTO_CACHE_STORAGE_KEY, JSON.stringify(parsed));
  } catch {}
}

/**
 * Upscales a Wikimedia thumbnail URL (e.g. `/320px-Dotonbori.jpg`) to crisp 1280px HD (`/1280px-Dotonbori.jpg`)
 * so images never look blurry on retina cards.
 */
export function upscaleWikimediaThumbUrl(url: string, targetWidthPx = 1280): string {
  if (!url) return url;
  return url.replace(/\/(\d+)px-/g, (_, widthStr) => {
    const currentWidth = parseInt(widthStr, 10);
    return currentWidth < targetWidthPx ? `/${targetWidthPx}px-` : `/${widthStr}px-`;
  });
}

async function queryGooglePlacesPhotoProxy(
  query: string,
  city?: string
): Promise<ResolvedPhotoRecord | null> {
  // Only call relative `/api/place-photo` when running in a browser context with a valid origin
  if (typeof window === 'undefined' || typeof fetch !== 'function') return null;
  try {
    const apiUrl = `/api/place-photo?q=${encodeURIComponent(query)}&city=${encodeURIComponent(
      city || ''
    )}`;
    const res = await fetch(apiUrl);
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.photoUrl && /^https?:\/\//i.test(data.photoUrl)) {
      return {
        url: data.photoUrl,
        source: 'google_places',
        attribution: data.attribution || 'Google Maps',
      };
    }
  } catch {}
  return null;
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
    const rawThumb: string | undefined = data?.thumbnail?.source || data?.originalimage?.source;
    if (rawThumb && /^https?:\/\//i.test(rawThumb) && !rawThumb.endsWith('.svg') && !rawThumb.includes('Flag_of_')) {
      return upscaleWikimediaThumbUrl(rawThumb, 1280);
    }
  } catch {}
  return null;
}

async function queryWikipediaThumbnail(query: string, lang: 'en' | 'th'): Promise<string | null> {
  if (!query || typeof fetch !== 'function') return null;
  try {
    const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      query
    )}&gsrlimit=3&prop=pageimages&piprop=thumbnail&pithumbsize=1280&format=json&origin=*`;
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
        return upscaleWikimediaThumbUrl(src, 1280);
      }
    }
  } catch {}
  return null;
}

/**
 * Fetches a high-resolution real photograph of the attraction/hotel:
 * 1. Tries Google Maps Platform Places API (New) via `/api/place-photo` using the specific extracted place/hotel name.
 * 2. Falls back to 1280px HD Wikipedia / Wikimedia Commons API.
 */
export async function fetchRealPlacePhotoRecord(
  placeName?: string,
  city?: string,
  explicitWikiQuery?: string
): Promise<ResolvedPhotoRecord | null> {
  const extractedPlaceQuery = extractAttractionSearchQuery(placeName, city).trim();
  const baseQuery = (extractedPlaceQuery || explicitWikiQuery || '').trim();
  if (!baseQuery) return null;

  const cacheKey = `${baseQuery.toLowerCase()}|${(explicitWikiQuery || '').toLowerCase()}|${(city || '').toLowerCase()}`;
  const cached = loadCachedPhotoRecord(cacheKey);
  if (cached) return cached;

  if (inflightRequests.has(cacheKey)) {
    return inflightRequests.get(cacheKey)!;
  }

  const promise = (async (): Promise<ResolvedPhotoRecord | null> => {
    // Layer 1: Try Google Places API (New) via server-side `/api/place-photo` proxy using the exact extracted place/hotel name
    const googleQuery = extractedPlaceQuery || explicitWikiQuery || baseQuery;
    const googleRecord = await queryGooglePlacesPhotoProxy(googleQuery, city);
    if (googleRecord) {
      saveCachedPhotoRecord(cacheKey, googleRecord);
      inflightRequests.delete(cacheKey);
      return googleRecord;
    }

    // Layer 2: Fallback to 1280px HD Wikipedia / Wikimedia Commons API
    const wikiTarget = (explicitWikiQuery || extractedPlaceQuery || baseQuery).trim();
    const hasThai = /[\u0E00-\u0E7F]/.test(wikiTarget);
    let wikiUrl: string | null = null;

    if (explicitWikiQuery && !/[\u0E00-\u0E7F]/.test(explicitWikiQuery)) {
      wikiUrl = await queryWikipediaRestSummary(explicitWikiQuery, 'en');
    }

    if (!wikiUrl) {
      if (hasThai) {
        wikiUrl = await queryWikipediaThumbnail(`${wikiTarget} ญี่ปุ่น`, 'th');
        if (!wikiUrl) wikiUrl = await queryWikipediaThumbnail(wikiTarget, 'th');
      } else {
        wikiUrl = await queryWikipediaRestSummary(wikiTarget, 'en');
        if (!wikiUrl) wikiUrl = await queryWikipediaThumbnail(wikiTarget, 'en');
        if (!wikiUrl && city) {
          wikiUrl = await queryWikipediaThumbnail(`${wikiTarget} ${city}`, 'en');
        }
      }
    }

    if (wikiUrl) {
      const record: ResolvedPhotoRecord = {
        url: wikiUrl,
        source: 'wikimedia_hd',
        attribution: 'Wikimedia Commons HD',
      };
      saveCachedPhotoRecord(cacheKey, record);
      inflightRequests.delete(cacheKey);
      return record;
    }

    inflightRequests.delete(cacheKey);
    return null;
  })();

  inflightRequests.set(cacheKey, promise);
  return promise;
}

export async function fetchRealPlacePhotoUrl(
  placeName?: string,
  city?: string,
  explicitWikiQuery?: string
): Promise<string | null> {
  const rec = await fetchRealPlacePhotoRecord(placeName, city, explicitWikiQuery);
  return rec ? rec.url : null;
}

/**
 * React hook that returns `PlaceVisualMeta` immediately and automatically upgrades `imageUrl`:
 * - Priority 0: User custom uploaded PNG / pasted screenshot / custom URL (`getCustomPlacePhoto`)
 * - Priority 1: Google Maps Places API (New) 1200px HD photo (`/api/place-photo`)
 * - Priority 2: Wikimedia Commons 1280px HD photo
 * - Priority 3: Curated 1200px HD fallback
 */
export function usePlaceVisualMeta(
  placeName?: string,
  city?: string,
  index = 0,
  itemId?: string,
  tripId?: string
): PlaceVisualMeta {
  const baseMeta = getPlaceVisualMeta(placeName, city, index);

  const [customPhoto, setCustomPhotoState] = useState<string | null>(() =>
    getCustomPlacePhoto(placeName, itemId)
  );

  const [resolvedRecord, setResolvedRecord] = useState<ResolvedPhotoRecord | null>(() => {
    const extracted = extractAttractionSearchQuery(placeName, city).trim();
    const baseQuery = (extracted || baseMeta.wikiQuery || '').trim();
    if (!baseQuery) return null;
    const cacheKey = `${baseQuery.toLowerCase()}|${(baseMeta.wikiQuery || '').toLowerCase()}|${(city || '').toLowerCase()}`;
    return loadCachedPhotoRecord(cacheKey);
  });

  // Listen to custom photo changes (upload PNG / paste screenshot / reset / Supabase cloud sync)
  useEffect(() => {
    const syncCustom = () => {
      setCustomPhotoState(getCustomPlacePhoto(placeName, itemId));
    };
    syncCustom();
    if (tripId) {
      loadCustomPlacePhotosFromSupabase(tripId).catch(() => {});
    }
    if (typeof window !== 'undefined') {
      window.addEventListener(CUSTOM_PHOTO_CHANGED_EVENT, syncCustom);
      return () => window.removeEventListener(CUSTOM_PHOTO_CHANGED_EVENT, syncCustom);
    }
  }, [placeName, itemId, tripId]);

  // Fetch real place photo from Google Maps Places API (New) -> Wikimedia HD
  useEffect(() => {
    if (customPhoto) return;
    let cancelled = false;
    const extracted = extractAttractionSearchQuery(placeName, city).trim();
    const baseQuery = (extracted || baseMeta.wikiQuery || '').trim();
    if (!baseQuery) return;

    fetchRealPlacePhotoRecord(placeName, city, baseMeta.wikiQuery).then((rec) => {
      if (!cancelled && rec) {
        setResolvedRecord(rec);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [placeName, city, baseMeta.wikiQuery, customPhoto]);

  if (customPhoto) {
    return {
      ...baseMeta,
      imageUrl: customPhoto,
      photoSource: 'custom',
      attributionText: 'รูปที่คุณเลือกเอง',
      isCustomPhoto: true,
    };
  }

  if (resolvedRecord) {
    return {
      ...baseMeta,
      imageUrl: resolvedRecord.url,
      photoSource: resolvedRecord.source,
      attributionText: resolvedRecord.attribution,
      isCustomPhoto: false,
    };
  }

  return baseMeta;
}

/**
 * Progressive-enhancement wrapper for the Same-Document View Transitions API.
 * Per modern-web-guidance (same-document-transitions):
 * - Feature-detects `document.startViewTransition`
 * - Respects `prefers-reduced-motion: reduce`
 * - Optionally shifts focus to a container after transition completes for a11y
 */
export function triggerViewTransition(
  updateCallback: () => void,
  focusTarget?: HTMLElement | string | null
): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    updateCallback();
    return;
  }

  const resolveTarget = (): HTMLElement | null => {
    if (!focusTarget) return null;
    if (typeof focusTarget === 'string') {
      return document.getElementById(focusTarget);
    }
    return focusTarget;
  };

  const prefersReducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const docWithVT = document as Document & {
    startViewTransition?: (cb: () => void) => { finished: Promise<void> };
  };

  if (prefersReducedMotion || typeof docWithVT.startViewTransition !== 'function') {
    updateCallback();
    const el = resolveTarget();
    if (el) {
      el.focus({ preventScroll: true });
    }
    return;
  }

  const transition = docWithVT.startViewTransition(() => {
    updateCallback();
  });

  if (transition?.finished) {
    transition.finished
      .then(() => {
        const el = resolveTarget();
        if (el) {
          el.focus({ preventScroll: true });
        }
      })
      .catch(() => {});
  }
}
