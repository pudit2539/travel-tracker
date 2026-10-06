// src/lib/accommodations.ts

export interface AccommodationVoucherFile {
  name: string;             // ชื่อไฟล์ เช่น Agoda_Tokyo_Hotel.pdf
  type: string;             // MIME type เช่น application/pdf หรือ image/jpeg
  size?: number;            // ขนาดไฟล์ (bytes)
  storageKey?: string;      // IndexedDB storage key
  dataUrl?: string;         // Base64 dataUrl สำหรับ preview / download ทันที
  uploadedAt?: number;
}

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
  voucherFile?: AccommodationVoucherFile; // เอกสารใบจองโรงแรม (PDF หรือ รูปภาพ)
  createdAt: number;
}

import { supabase } from '@/lib/supabase';
import { deleteLocalReceiptPhoto, getLocalReceiptPhoto } from '@/lib/localReceipts';

const STORAGE_PREFIX = 'travel_tracker_accommodations_';

/**
 * Remove massive base64 dataUrl before saving to localStorage and Supabase payload
 * to avoid exceeding browser localStorage (5MB) or PostgreSQL json row size.
 */
function sanitizeStaysForStorage(stays: AccommodationStay[]): AccommodationStay[] {
  return stays.map((stay) => {
    if (stay.voucherFile && stay.voucherFile.storageKey) {
      const { dataUrl, ...restVoucher } = stay.voucherFile;
      return {
        ...stay,
        voucherFile: restVoucher,
      };
    }
    return stay;
  });
}

export async function syncAccommodationsToSupabase(tripId: string, stays: AccommodationStay[]): Promise<void> {
  if (!tripId) return;
  try {
    const { data: existing } = await supabase
      .from('itinerary_items')
      .select('id, backup_plan')
      .eq('trip_id', tripId)
      .eq('date_label', '__meta_trip_data__')
      .maybeSingle();

    let payload: any = {};
    if (existing?.backup_plan) {
      try {
        payload = JSON.parse(existing.backup_plan);
      } catch {
        // ignore malformed JSON
      }
    }
    // Retain full accommodation data (including voucherFile.dataUrl) so mobile and all devices can view & download
    payload.accommodations = stays;

    if (existing?.id) {
      await supabase
        .from('itinerary_items')
        .update({ backup_plan: JSON.stringify(payload) })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('itinerary_items')
        .insert([{
          trip_id: tripId,
          date_label: '__meta_trip_data__',
          main_place: 'SYSTEM_TRIP_METADATA',
          backup_plan: JSON.stringify(payload),
          sort_order: -9999
        }]);
    }
  } catch (err) {
    console.warn('Failed to sync accommodations to Supabase:', err);
  }
}

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
  if (!tripId) return;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${tripId}`, JSON.stringify(stays));
    } catch {
      // If browser localStorage quota (5MB) is reached, save sanitized version in localStorage
      try {
        const sanitized = sanitizeStaysForStorage(stays);
        localStorage.setItem(`${STORAGE_PREFIX}${tripId}`, JSON.stringify(sanitized));
      } catch (err) {
        console.error('Failed to save accommodations to localStorage:', err);
      }
    }
  }
  // Async sync FULL stays to Supabase for multi-device cross-platform availability
  syncAccommodationsToSupabase(tripId, stays).catch(() => {});
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
  const stayToDelete = current.find((s) => s.id === stayId);
  if (stayToDelete?.voucherFile?.storageKey) {
    deleteLocalReceiptPhoto(stayToDelete.voucherFile.storageKey).catch(() => {});
  }
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

/**
 * Format bytes into human readable format (e.g. "1.5 MB", "420 KB")
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Download hotel booking voucher file directly
 */
export function downloadVoucherFile(voucher: AccommodationVoucherFile, fallbackStayName: string): void {
  if (typeof window === 'undefined' || !voucher.dataUrl) return;
  const link = document.createElement('a');
  link.href = voucher.dataUrl;
  const defaultExt = voucher.type?.includes('pdf') ? '.pdf' : '.jpg';
  const cleanHotelName = (fallbackStayName || 'Hotel').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
  const safeName = voucher.name || `Hotel_Voucher_${cleanHotelName}${defaultExt}`;
  link.download = safeName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Open voucher data URL in new browser tab / window safely
 */
export function openVoucherInNewTab(dataUrl: string, mimeType?: string): void {
  if (typeof window === 'undefined' || !dataUrl) return;
  try {
    if (dataUrl.startsWith('data:')) {
      const arr = dataUrl.split(',');
      const mime = mimeType || arr[0].match(/:(.*?);/)?.[1] || 'application/pdf';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      return;
    }
    window.open(dataUrl, '_blank');
  } catch (err) {
    console.error('Failed to open voucher blob URL:', err);
    window.open(dataUrl, '_blank');
  }
}

/**
 * Hydrate dataUrl for a stay's voucherFile from IndexedDB if not present
 */
export async function hydrateStayVoucher(stay: AccommodationStay): Promise<AccommodationStay> {
  if (stay.voucherFile?.storageKey && !stay.voucherFile.dataUrl) {
    try {
      const dataUrl = await getLocalReceiptPhoto(stay.voucherFile.storageKey);
      if (dataUrl) {
        return {
          ...stay,
          voucherFile: {
            ...stay.voucherFile,
            dataUrl,
          },
        };
      }
    } catch (e) {
      console.warn('Could not hydrate voucher for stay:', stay.name, e);
    }
  }
  return stay;
}
