// src/lib/placeThumbnails.ts

export interface PlaceVisualMeta {
  imageUrl: string;
  gradient: string;
  emoji: string;
  tagLabel: string;
  categoryLabel: string;
}

const DESTINATION_THUMBNAILS: Array<{
  keywords: string[];
  imageUrl: string;
  gradient: string;
  emoji: string;
  tagLabel: string;
}> = [
  {
    keywords: ['usj', 'universal', 'nintendo', 'harry potter', 'ยูนิเวอร์แซล'],
    imageUrl: 'https://images.unsplash.com/photo-1613376023733-0a73315d9b06?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-blue-600 via-indigo-600 to-purple-700',
    emoji: '🎢',
    tagLabel: 'Theme Park',
  },
  {
    keywords: ['dotonbori', 'shinsaibashi', 'namba', 'glico', 'โดทงโบริ', 'นัมบะ', 'ชินไซบาชิ'],
    imageUrl: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-rose-600 via-orange-500 to-amber-500',
    emoji: '🦀',
    tagLabel: 'Nightlife & Food',
  },
  {
    keywords: ['osaka castle', 'ปราสาทโอซาก้า', 'osaka', 'โอซาก้า', 'umeda', 'shinsekai', 'tsutenkaku'],
    imageUrl: 'https://images.unsplash.com/photo-1589452271712-64b8a66c7b71?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-emerald-600 via-teal-600 to-cyan-700',
    emoji: '🏯',
    tagLabel: 'Osaka Landmark',
  },
  {
    keywords: ['fushimi', 'inari', 'torii', 'ฟูชิมิ', 'อินาริ', 'เสาแดง'],
    imageUrl: 'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-red-600 via-orange-600 to-amber-600',
    emoji: '⛩️',
    tagLabel: 'Shrine & Temple',
  },
  {
    keywords: ['kiyomizu', 'arashiyama', 'kinkaku', 'gion', 'kyoto', 'เกียวโต', 'วัดน้ำใส', 'ป่าไผ่', 'วัดทอง'],
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-amber-600 via-orange-600 to-rose-700',
    emoji: '🍁',
    tagLabel: 'Kyoto Heritage',
  },
  {
    keywords: ['nara', 'นารา', 'กวาง', 'todaiji', 'kasuga'],
    imageUrl: 'https://images.unsplash.com/photo-1570459027562-4a916cc6113f?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-emerald-600 via-green-600 to-lime-600',
    emoji: '🦌',
    tagLabel: 'Nara Park',
  },
  {
    keywords: ['fuji', 'kawaguchiko', 'ฟูจิ', 'คาวากุจิโกะ', 'hakone', 'ฮาโกเน่', 'chureito'],
    imageUrl: 'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-sky-600 via-blue-600 to-indigo-700',
    emoji: '🗻',
    tagLabel: 'Mt. Fuji',
  },
  {
    keywords: ['tokyo', 'shibuya', 'shinjuku', 'asakusa', 'sensoji', 'harajuku', 'ginza', 'akihabara', 'โตเกียว', 'ชิบูย่า', 'ชินจูกุ', 'อาซากุสะ'],
    imageUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-indigo-600 via-purple-600 to-pink-600',
    emoji: '🗼',
    tagLabel: 'Tokyo City',
  },
  {
    keywords: ['hokkaido', 'sapporo', 'otaru', 'ฮอกไกโด', 'ซัปโปโร', 'โอตารุ'],
    imageUrl: 'https://images.unsplash.com/photo-1542931287-023b922fa89b?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-cyan-600 via-sky-600 to-blue-700',
    emoji: '❄️',
    tagLabel: 'Hokkaido',
  },
  {
    keywords: ['kuromon', 'nishiki', 'tsukiji', 'market', 'ตลาดปลา', 'ตลาด', 'ramen', 'sushi', 'yakiniku', 'izakaya', 'ราเมง', 'ซูชิ', 'เนื้อย่าง', 'คาเฟ่', 'cafe'],
    imageUrl: 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-orange-500 via-amber-500 to-rose-500',
    emoji: '🍜',
    tagLabel: 'Gourmet & Dining',
  },
  {
    keywords: ['airport', 'kansai', 'kix', 'narita', 'haneda', 'suvarnabhumi', 'สนามบิน', 'สุวรรณภูมิ', 'คันไซ', 'นาริตะ'],
    imageUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-blue-600 via-sky-600 to-cyan-600',
    emoji: '✈️',
    tagLabel: 'Airport & Flight',
  },
  {
    keywords: ['hotel', 'check-in', 'check in', 'เช็คอิน', 'ที่พัก', 'โรงแรม', 'ฝากกระเป๋า'],
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-teal-600 via-emerald-600 to-slate-700',
    emoji: '🏨',
    tagLabel: 'Hotel & Stay',
  },
  {
    keywords: ['donki', 'shopping', 'outlet', 'りんくう', 'rinku', 'gu', 'uniqlo', 'ช้อปปิ้ง', 'ดองกี้', 'เอาท์เล็ท'],
    imageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-pink-600 via-rose-500 to-amber-500',
    emoji: '🛍️',
    tagLabel: 'Shopping',
  },
];

const DEFAULT_VISUALS: PlaceVisualMeta[] = [
  {
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-blue-600 via-indigo-600 to-slate-800',
    emoji: '🗾',
    tagLabel: 'Japan Destination',
    categoryLabel: 'Japan Destination',
  },
  {
    imageUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-indigo-600 via-purple-600 to-slate-800',
    emoji: '✨',
    tagLabel: 'Highlight Stop',
    categoryLabel: 'Highlight Stop',
  },
  {
    imageUrl: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?auto=format&fit=crop&w=800&q=80',
    gradient: 'from-emerald-600 via-teal-600 to-slate-800',
    emoji: '📍',
    tagLabel: 'City Stop',
    categoryLabel: 'City Stop',
  },
];

export function getPlaceVisualMeta(placeName?: string, city?: string, index = 0): PlaceVisualMeta {
  const combined = `${placeName || ''} ${city || ''}`.toLowerCase();
  for (const entry of DESTINATION_THUMBNAILS) {
    if (entry.keywords.some((kw) => combined.includes(kw))) {
      return {
        imageUrl: entry.imageUrl,
        gradient: entry.gradient,
        emoji: entry.emoji,
        tagLabel: entry.tagLabel,
        categoryLabel: entry.tagLabel,
      };
    }
  }
  return DEFAULT_VISUALS[Math.abs(index) % DEFAULT_VISUALS.length];
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

