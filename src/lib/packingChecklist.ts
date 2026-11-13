import { syncTripMetadataToSupabase } from '@/lib/tripMetadata';

export interface ChecklistItem {
  id: string;
  category: 'docs' | 'tech' | 'health' | 'cloth' | 'custom';
  title: string;
  checked: boolean;
  isAiSuggested?: boolean;
  weatherTag?: string;
  assignee?: string;
}

export const DEFAULT_PACKING_ITEMS: Omit<ChecklistItem, 'id'>[] = [
  // 1. Documents
  { category: 'docs', title: 'หนังสือเดินทาง (Passport) อายุเหลือเกิน 6 เดือน', checked: false },
  { category: 'docs', title: 'ลงทะเบียน Visit Japan Web (QR Code เข้าเมือง/ศุลกากร)', checked: false },
  { category: 'docs', title: 'กรมธรรม์ประกันการเดินทางต่างประเทศ (Travel Insurance)', checked: false },
  { category: 'docs', title: 'ตั๋วเครื่องบิน E-Ticket & ใบจองโรงแรมทุกคืน', checked: false },
  { category: 'docs', title: 'บัตรเครดิต / Travel Card (YouTrip, Boarding Card, KBank)', checked: false },

  // 2. Tech
  { category: 'tech', title: 'eSIM หรือ ซิมเน็ตโรมมิ่ง / Pocket WiFi', checked: false },
  { category: 'tech', title: 'Power Bank (แบตสำรอง พกขึ้นเครื่อง ห้ามโหลดใต้เครื่อง)', checked: false },
  { category: 'tech', title: 'หัวแปลงปลั๊กไฟ (Adapter สำหรับประเทศปลายทาง)', checked: false },
  { category: 'tech', title: 'สายชาร์จมือถือ & กล้องถ่ายรูป', checked: false },

  // 3. Health & Personal Care
  { category: 'health', title: 'ยาประจำตัว + ยาแก้หวัด/แก้แพ้/ยาแก้ปวดพารา', checked: false },
  { category: 'health', title: 'แผ่นแปะแก้ปวดเมื่อยขา/เท้า (สำหรับการเดินชมเมือง)', checked: false },
  { category: 'health', title: 'ลิปมัน & ครีมทาผิวบำรุงความชุ่มชื้น', checked: false },

  // 4. Clothes
  { category: 'cloth', title: 'เสื้อโค้ท / เสื้อแจ็คเก็ตกันลม', checked: false },
  { category: 'cloth', title: 'รองเท้าผ้าใบเดินสบาย (เดินวันละ 15,000-20,000 ก้าว)', checked: false },
  { category: 'cloth', title: 'ร่มพับน้ำหนักเบา หรือ เสื้อกันฝน', checked: false },
];

const STORAGE_PREFIX = 'travel_tracker_packing_';
export const PACKING_UPDATED_EVENT = 'travel_tracker_packing_updated';

export function buildDefaultPackingItems(): ChecklistItem[] {
  const now = Date.now();
  return DEFAULT_PACKING_ITEMS.map((it, idx) => ({
    ...it,
    id: `default_${idx}_${now}`,
  }));
}

export function getPackingChecklist(tripId?: string): ChecklistItem[] {
  if (typeof window === 'undefined' || !tripId) return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${tripId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore storage errors
  }
  const initial = buildDefaultPackingItems();
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${tripId}`, JSON.stringify(initial));
  } catch {
    // ignore storage errors
  }
  return initial;
}

export function savePackingChecklist(
  tripId: string | undefined,
  updated: ChecklistItem[],
  options?: { skipRemoteSync?: boolean }
): ChecklistItem[] {
  if (!tripId) return updated;
  if (typeof window !== 'undefined') {
    try {
      const key = `${STORAGE_PREFIX}${tripId}`;
      const serialized = JSON.stringify(updated);
      if (localStorage.getItem(key) !== serialized) {
        localStorage.setItem(key, serialized);
      }
      window.dispatchEvent(new CustomEvent(PACKING_UPDATED_EVENT, { detail: { tripId } }));
    } catch {
      // ignore storage errors
    }
  }
  if (!options?.skipRemoteSync) {
    void syncTripMetadataToSupabase(tripId, { packingChecklist: updated });
  }
  return updated;
}

export function hydratePackingChecklistFromSupabase(tripId: string, remoteItems: unknown): boolean {
  if (typeof window === 'undefined' || !tripId || !Array.isArray(remoteItems)) return false;
  try {
    const key = `${STORAGE_PREFIX}${tripId}`;
    const serialized = JSON.stringify(remoteItems);
    if (localStorage.getItem(key) === serialized) return false;
    localStorage.setItem(key, serialized);
    window.dispatchEvent(new CustomEvent(PACKING_UPDATED_EVENT, { detail: { tripId } }));
    return true;
  } catch {
    return false;
  }
}

export function subscribePackingChecklist(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => { };
  const handler = () => callback();
  window.addEventListener(PACKING_UPDATED_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(PACKING_UPDATED_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

