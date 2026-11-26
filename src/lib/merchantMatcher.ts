// src/lib/merchantMatcher.ts

export interface MerchantTagMatch {
  emoji: string;
  label: string;
  suggestedCategory: 'food' | 'shopping' | 'transport' | 'hotel' | 'ticket' | 'other';
  badgeClass: string;
}

const MERCHANT_RULES: Array<{
  pattern: RegExp;
  match: MerchantTagMatch;
}> = [
  {
    pattern: /7-?eleven|เซเว่น|lawson|ลอว์สัน|family\s?mart|แฟมิลี่|konbini|onigiri/i,
    match: {
      emoji: '🏪',
      label: 'Konbini',
      suggestedCategory: 'food',
      badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/30',
    },
  },
  {
    pattern: /don\s?quijote|ดองกี้|donki|matsumoto|มัตสึโมโตะ|drug|ร้านยา|tsuruha|sundrug/i,
    match: {
      emoji: '💊',
      label: 'Tax-Free / Drugstore',
      suggestedCategory: 'shopping',
      badgeClass: 'bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-400/30',
    },
  },
  {
    pattern: /uniqlo|ยูนิโคล่|gu\b|muji|มูจิ|aeon|อิออน|takashimaya|daimaru|outlet|rinku/i,
    match: {
      emoji: '🛍️',
      label: 'Department / Fashion',
      suggestedCategory: 'shopping',
      badgeClass: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-400/30',
    },
  },
  {
    pattern: /ichiran|อิชิรัน|ramen|ราเมง|sushi|ซูชิ|gyukatsu|yakiniku|wagyu|matcha|มัทฉะ|starbucks|arabica|cafe|คาเฟ่|coffee/i,
    match: {
      emoji: '🍜',
      label: 'Dining / Cafe',
      suggestedCategory: 'food',
      badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/30',
    },
  },
  {
    pattern: /jr\b|shinkansen|ชินคันเซ็น|icoca|suica|subway|metro|รถไฟ|haruka|limousine|bus|taxi|แท็กซี่|kix|airport/i,
    match: {
      emoji: '🚅',
      label: 'Transit / Rail',
      suggestedCategory: 'transport',
      badgeClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-400/30',
    },
  },
  {
    pattern: /usj|universal|disney|teamlab|aquarium|kaiyukan|ไคยูคัง|harukas|temple|วัด|shrine|ศาลเจ้า|ticket|ตั๋ว/i,
    match: {
      emoji: '🎟️',
      label: 'Attraction / Ticket',
      suggestedCategory: 'ticket',
      badgeClass: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-400/30',
    },
  },
  {
    pattern: /hotel|โรงแรม|ที่พัก|inn\b|ryokan|เรียวกัง|check-?in/i,
    match: {
      emoji: '🏨',
      label: 'Stay / Hotel',
      suggestedCategory: 'hotel',
      badgeClass: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-400/30',
    },
  },
];

/**
 * Matches common Japan & travel merchant names to an icon, label, and category suggestion.
 */
export function matchMerchantTag(title?: string): MerchantTagMatch | null {
  const clean = (title || '').trim();
  if (clean.length < 2) return null;
  for (const rule of MERCHANT_RULES) {
    if (rule.pattern.test(clean)) {
      return rule.match;
    }
  }
  return null;
}
