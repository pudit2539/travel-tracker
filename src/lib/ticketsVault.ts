import { syncTripMetadataToSupabase } from '@/lib/tripMetadata';
import { getLocalReceiptPhoto } from '@/lib/localReceipts';

export interface VaultPassItem {
  id: string;
  title: string;
  category: 'vjw' | 'keta' | 'train' | 'flight' | 'attraction' | 'hotel' | 'insurance' | 'other';
  bookingRef?: string;
  qrCodeUrl?: string;
  barcodeData?: string;
  note?: string;
  validDate?: string;
  holderName?: string;
  createdAt: number;
}

export const DEFAULT_PRESET_PASSES: VaultPassItem[] = [
  {
    id: 'preset_vjw_customs',
    title: 'Visit Japan Web (Immigration & Customs QR)',
    category: 'vjw',
    bookingRef: 'VJW-ENTRY-JP',
    note: 'เปิดสแกนที่ด่านตรวจคนเข้าเมืองและศุลกากรสนามบินคันไซ (KIX) สแกนติดเร็วแม้ออฟไลน์',
    validDate: '5 ธ.ค. 2026',
    holderName: 'ปูดิท (ฉัน)',
    createdAt: 1764892800000,
  },
  {
    id: 'preset_keta_approval',
    title: 'K-ETA (Korea Electronic Travel Authorization)',
    category: 'keta',
    bookingRef: 'K-ETA-APPROVED',
    note: 'เอกสารอนุมัติเข้าเกาหลีใต้ พร้อม QR Code สำหรับสแกนที่สนามบินอินชอน/เชจู',
    validDate: 'ใช้ได้ตลอดอายุอนุมัติ',
    holderName: 'ปูดิท (ฉัน)',
    createdAt: 1764892820000,
  },
  {
    id: 'preset_limousine_bus_kix_kyoto',
    title: 'Airport Limousine Bus ชานชาลาที่ 8 (KIX ➔ Kyoto)',
    category: 'train',
    bookingRef: 'KIX-BUS8-KYOTO',
    note: 'รถบัสลีมูซีนจากสนามบินคันไซ (Terminal 1 ชั้น 1 ชานชาลาที่ 8) ตรงไปลงสถานีเกียวโตฝั่ง Hachijo-guchi',
    validDate: '5 ธ.ค. 2026',
    holderName: 'ผู้เดินทางทุกคน',
    createdAt: 1764892840000,
  },
  {
    id: 'preset_usj_pass',
    title: 'Universal Studios Japan (USJ 1-Day Studio Pass)',
    category: 'attraction',
    bookingRef: 'USJ-EXP-2026',
    note: 'บัตรเข้า USJ + Super Nintendo World Area Timed Entry Pass',
    validDate: '12 ธ.ค. 2026',
    holderName: 'ปูดิท (ฉัน)',
    createdAt: 1764892860000,
  },
];

const VAULT_STORAGE_PREFIX = 'ticket_vault_';
const LEGACY_HUB_PREFIX = 'travel_hub_tickets_';
export const TICKETS_VAULT_UPDATED_EVENT = 'travel_tracker_tickets_updated';

function readStoredVault(tripId: string): VaultPassItem[] | null {
  if (typeof window === 'undefined' || !tripId) return null;
  try {
    const raw = localStorage.getItem(`${VAULT_STORAGE_PREFIX}${tripId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function getTicketsVault(tripId?: string, initialPasses?: VaultPassItem[]): VaultPassItem[] {
  if (tripId) {
    const stored = readStoredVault(tripId);
    if (stored && stored.length > 0) return stored;
  }
  if (initialPasses && initialPasses.length > 0) return initialPasses;
  return DEFAULT_PRESET_PASSES;
}

export function saveTicketsVault(
  tripId: string | undefined,
  updated: VaultPassItem[],
  options?: { skipRemoteSync?: boolean }
): VaultPassItem[] {
  if (!tripId) return updated;
  if (typeof window !== 'undefined') {
    try {
      const serialized = JSON.stringify(updated);
      const key = `${VAULT_STORAGE_PREFIX}${tripId}`;
      if (localStorage.getItem(key) !== serialized) {
        localStorage.setItem(key, serialized);
      }
      window.dispatchEvent(new CustomEvent(TICKETS_VAULT_UPDATED_EVENT, { detail: { tripId } }));
    } catch {
      // ignore storage errors
    }
  }
  if (!options?.skipRemoteSync) {
    void syncTripMetadataToSupabase(tripId, { ticketsVault: updated });
  }
  return updated;
}

export function hydrateTicketsVaultFromSupabase(tripId: string, remotePasses: unknown): boolean {
  if (typeof window === 'undefined' || !tripId || !Array.isArray(remotePasses)) return false;
  try {
    const key = `${VAULT_STORAGE_PREFIX}${tripId}`;
    const serialized = JSON.stringify(remotePasses);
    if (localStorage.getItem(key) === serialized) return false;
    localStorage.setItem(key, serialized);
    window.dispatchEvent(new CustomEvent(TICKETS_VAULT_UPDATED_EVENT, { detail: { tripId } }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Migrates any legacy `travel_hub_tickets_<tripId>` entries into the unified
 * `ticket_vault_<tripId>` store once so both modals always share synced data.
 */
export async function migrateLegacyHubTickets(tripId?: string): Promise<VaultPassItem[]> {
  const current = getTicketsVault(tripId);
  if (typeof window === 'undefined' || !tripId) return current;

  const legacyKey = `${LEGACY_HUB_PREFIX}${tripId}`;
  try {
    const rawLegacy = localStorage.getItem(legacyKey);
    if (!rawLegacy) return current;
    const parsedLegacy = JSON.parse(rawLegacy);
    if (!Array.isArray(parsedLegacy) || parsedLegacy.length === 0) {
      localStorage.removeItem(legacyKey);
      return current;
    }

    const hydratedLegacy: VaultPassItem[] = await Promise.all(
      parsedLegacy.map(async (item: any) => {
        let qrUrl = item.imageUrl || item.qrCodeUrl;
        if (!qrUrl && item.imageStorageKey) {
          try {
            qrUrl = (await getLocalReceiptPhoto(item.imageStorageKey)) || undefined;
          } catch {
            qrUrl = undefined;
          }
        }
        return {
          id: String(item.id || `legacy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`),
          title: String(item.title || 'ตั๋วเดินทาง'),
          category: (item.category || 'other') as VaultPassItem['category'],
          qrCodeUrl: qrUrl,
          note: item.note,
          createdAt: Number(item.createdAt || Date.now()),
        };
      })
    );

    const existingIds = new Set(current.map((p) => p.id));
    const additions = hydratedLegacy.filter((p) => !existingIds.has(p.id));
    localStorage.removeItem(legacyKey);

    if (additions.length === 0) return current;
    const merged = [...additions, ...current];
    return saveTicketsVault(tripId, merged);
  } catch {
    return current;
  }
}

export function subscribeTicketsVault(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => { };
  const handler = () => callback();
  window.addEventListener(TICKETS_VAULT_UPDATED_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(TICKETS_VAULT_UPDATED_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

