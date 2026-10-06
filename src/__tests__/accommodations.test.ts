import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  formatFileSize, 
  getAccommodations, 
  saveAccommodations, 
  addAccommodation, 
  deleteAccommodation,
  hydrateStayVoucher,
  AccommodationStay 
} from '../lib/accommodations';
import * as localReceipts from '../lib/localReceipts';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

describe('Accommodation Voucher Features', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('correctly formats file sizes into human readable strings', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });

  it('saves accommodation and strips heavy dataUrl from localStorage payload', () => {
    const tripId = 'test-trip-1';
    const newStay = addAccommodation(tripId, {
      name: 'Shinjuku Prince Hotel',
      checkInDate: '2026-12-01',
      checkOutDate: '2026-12-04',
      nights: 3,
      voucherFile: {
        name: 'agoda_voucher.pdf',
        type: 'application/pdf',
        size: 1048576,
        storageKey: 'voucher_key_123',
        dataUrl: 'data:application/pdf;base64,JVBERi0xLjQK...',
      },
    });

    expect(newStay.length).toBe(1);
    expect(newStay[0].name).toBe('Shinjuku Prince Hotel');
    expect(newStay[0].voucherFile?.name).toBe('agoda_voucher.pdf');

    // Check localStorage saved value (dataUrl should be omitted to preserve quota)
    const stored = getAccommodations(tripId);
    expect(stored.length).toBe(1);
    expect(stored[0].voucherFile?.storageKey).toBe('voucher_key_123');
    expect(stored[0].voucherFile?.dataUrl).toBeUndefined();
  });

  it('hydrates voucher dataUrl from IndexedDB store', async () => {
    vi.spyOn(localReceipts, 'getLocalReceiptPhoto').mockResolvedValue('data:image/jpeg;base64,mocked_image_bytes');

    const mockStay: AccommodationStay = {
      id: 'stay-1',
      tripId: 'test-trip-2',
      name: 'Hakone Ryokan',
      checkInDate: '2026-12-05',
      checkOutDate: '2026-12-06',
      nights: 1,
      createdAt: Date.now(),
      voucherFile: {
        name: 'ryokan_confirmation.jpg',
        type: 'image/jpeg',
        size: 500000,
        storageKey: 'voucher_key_456',
      },
    };

    const hydrated = await hydrateStayVoucher(mockStay);
    expect(hydrated.voucherFile?.dataUrl).toBe('data:image/jpeg;base64,mocked_image_bytes');
  });

  it('cleans up local receipt photo when stay is deleted', () => {
    const deleteSpy = vi.spyOn(localReceipts, 'deleteLocalReceiptPhoto').mockResolvedValue();

    const tripId = 'test-trip-3';
    const stays = addAccommodation(tripId, {
      name: 'Kyoto Machiya',
      checkInDate: '2026-12-07',
      checkOutDate: '2026-12-09',
      nights: 2,
      voucherFile: {
        name: 'machiya_voucher.pdf',
        type: 'application/pdf',
        size: 200000,
        storageKey: 'voucher_machiya_789',
      },
    });

    expect(stays.length).toBe(1);
    const updated = deleteAccommodation(tripId, stays[0].id);
    expect(updated.length).toBe(0);
    expect(deleteSpy).toHaveBeenCalledWith('voucher_machiya_789');
  });
});
