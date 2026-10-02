// src/lib/accommodations.ts

export interface AccommodationStay {
  id: string;
  tripId: string;
  name: string;             // ชื่อโรงแรม/ที่พัก (เช่น Shinjuku Granbell Hotel)
  city?: string;            // เมือง/ย่าน (เช่น Tokyo, Osaka, Hakone)
  checkInDate: string;      // วันเช็คอิน เช่น 2026-12-04 หรือ Day 1 (04-Dec)
  checkOutDate: string;     // วันเช็คเอาท์ เช่น 2026-12-07 หรือ Day 4 (07-Dec)
  nights: number;           // จำนวนคืน เช่น 3
  roomType?: string;        // เช่น Deluxe Twin, Japanese Tatami
  bookingRef?: string;      // เลขที่การจอง (Agoda, Booking.com, Airbnb, etc.)
  address?: string;         // ที่อยู่
  googleMapsUrl?: string;   // ลิงก์ Google Maps
  phone?: string;           // เบอร์โทรศัพท์
  price?: number;           // ราคาที่จ่าย (เช่น 45000)
  currency?: string;        // สกุลเงินที่จ่าย (เช่น JPY หรือ THB)
  notes?: string;           // โน้ต เช่น รวมอาหารเช้า, เช็คอินได้หลัง 15:00 น., ฝากกระเป๋าได้
  expenseId?: string;       // เชื่อมกับ Expense ใน Supabase ถ้าส่งเข้ารายการแล้ว
  createdAt: number;
}

const STORAGE_PREFIX = 'travel_tracker_accommodations_';

export function getAccommodations(tripId: string): AccommodationStay[] {
  if (typeof window === 'undefined' || !tripId) return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${tripId}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse accommodations:', err);
    return [];
  }
}

export function saveAccommodations(tripId: string, stays: AccommodationStay[]): void {
  if (typeof window === 'undefined' || !tripId) return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${tripId}`, JSON.stringify(stays));
  } catch (err) {
    console.error('Failed to save accommodations:', err);
  }
}

export function addAccommodation(
  tripId: string, 
  data: Omit<AccommodationStay, 'id' | 'createdAt' | 'tripId'>
): AccommodationStay[] {
  const current = getAccommodations(tripId);
  const newStay: AccommodationStay = {
    ...data,
    id: 'stay_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
    tripId,
    createdAt: Date.now(),
  };
  const updated = [...current, newStay];
  saveAccommodations(tripId, updated);
  return updated;
}

export function updateAccommodation(tripId: string, stay: AccommodationStay): AccommodationStay[] {
  const current = getAccommodations(tripId);
  const updated = current.map((s) => (s.id === stay.id ? stay : s));
  saveAccommodations(tripId, updated);
  return updated;
}

export function deleteAccommodation(tripId: string, stayId: string): AccommodationStay[] {
  const current = getAccommodations(tripId);
  const updated = current.filter((s) => s.id !== stayId);
  saveAccommodations(tripId, updated);
  return updated;
}

/**
 * Generate a Google Maps search URL fallback if no direct URL is provided
 */
export function getGoogleMapsUrl(stay: AccommodationStay): string {
  if (stay.googleMapsUrl && stay.googleMapsUrl.trim().length > 0) {
    return stay.googleMapsUrl.trim();
  }
  const query = [stay.name, stay.city, stay.address].filter(Boolean).join(' ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
