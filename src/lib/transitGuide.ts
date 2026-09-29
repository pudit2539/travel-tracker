// src/lib/transitGuide.ts

export interface TransitGuide {
  platform: string;
  bestTip: string;
  details: string;
  hasGuide: boolean;
}

/**
 * Parses transport information string to extract platform, best route recommendation, and clean details.
 */
export function parseTransitInfo(raw?: string): TransitGuide {
  if (!raw || typeof raw !== 'string') {
    return { platform: '', bestTip: '', details: '', hasGuide: false };
  }

  let platform = '';
  let bestTip = '';
  let details = raw;

  // 1. Check for explicit bracket tags [ชานชาลา: ...] or [Platform: ...]
  const platformMatch = details.match(/\[(?:ชานชาลา|Platform|Track|ประตูทางออก|จุดขึ้นรถ):\s*([^\]]+)\]/i);
  if (platformMatch) {
    platform = platformMatch[1].trim();
    details = details.replace(platformMatch[0], '').trim();
  }

  // 2. Check for explicit bracket tags [คำแนะนำ: ...] or [Best Option: ...] or [Tip: ...]
  const tipMatch = details.match(/\[(?:คำแนะนำ|ทางเลือกที่ดีที่สุด|จุดขึ้นรถ|Best Option|Tip):\s*([^\]]+)\]/i);
  if (tipMatch) {
    bestTip = tipMatch[1].trim();
    details = details.replace(tipMatch[0], '').trim();
  }

  // 3. Natural Language extraction if not explicitly tagged:
  if (!platform) {
    // Look for e.g. "ชานชาลา 2", "ชานชาลาที่ 3", "Track 4", "Platform 2"
    const nlPlatform = details.match(/(?:ชานชาลา(?:ที่)?|Track|Platform)\s*([0-9A-Za-z]+(?:\s*(?:-[0-9A-Za-z]+|\([^\)]+\)))?)/i);
    if (nlPlatform) {
      platform = `ชานชาลา ${nlPlatform[1]}`;
    } else {
      // Look for Exit / ทางออก
      const exitMatch = details.match(/(?:ทางออก|Exit)\s*([0-9A-Za-z]+)/i);
      if (exitMatch) {
        platform = `ทางออก ${exitMatch[1]}`;
      }
    }
  }

  if (!bestTip) {
    // Look for phrases like "แนะนำ...", "ขึ้นตู้...", "เร็วที่สุด..."
    const nlTip = details.match(/(?:แนะนำ|ทางเลือกที่ดีที่สุด|ขึ้นตู้|โบกี้|เร็วที่สุด|ไม่ต้องเปลี่ยนสาย)[^,\n.]+/i);
    if (nlTip) {
      bestTip = nlTip[0].trim();
    }
  }

  return {
    platform,
    bestTip,
    details: details.trim(),
    hasGuide: Boolean(platform || bestTip || details.trim()),
  };
}

/**
 * Formats platform, best route recommendation, and details into a clean persistent string.
 */
export function formatTransitInfo(platform?: string, bestTip?: string, details?: string): string {
  const parts: string[] = [];
  if (platform && platform.trim()) {
    parts.push(`[ชานชาลา: ${platform.trim()}]`);
  }
  if (bestTip && bestTip.trim()) {
    parts.push(`[คำแนะนำ: ${bestTip.trim()}]`);
  }
  if (details && details.trim()) {
    parts.push(details.trim());
  }
  return parts.join('\n');
}
