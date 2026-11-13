import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  TRIP_MEDIA_BUCKET,
  uploadTripMedia,
  extractMediaStoragePath,
  deleteTripMedia,
} from '../lib/mediaStorage';
import * as localReceipts from '../lib/localReceipts';
import { supabase } from '../lib/supabase';

const uploadMock = vi.fn();
const getPublicUrlMock = vi.fn();
const removeMock = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: uploadMock,
        getPublicUrl: getPublicUrlMock,
        remove: removeMock,
      })),
    },
  },
}));

describe('Universal Trip Media Storage', () => {
  const origSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://demo-project.supabase.co';
    vi.spyOn(localReceipts, 'saveLocalReceiptPhoto').mockResolvedValue(true);
    vi.spyOn(localReceipts, 'deleteLocalReceiptPhoto').mockResolvedValue();
  });

  afterEach(() => {
    if (origSupabaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = origSupabaseUrl;
    }
    vi.restoreAllMocks();
  });

  it('uploads PDF voucher to Supabase Storage bucket and omits dataUrl unless requested', async () => {
    uploadMock.mockResolvedValue({ data: { path: 'trip_1/vouchers/doc.pdf' }, error: null });
    getPublicUrlMock.mockReturnValue({
      data: {
        publicUrl: `https://demo-project.supabase.co/storage/v1/object/public/${TRIP_MEDIA_BUCKET}/trip_1/vouchers/doc.pdf`,
      },
    });

    const pdfFile = new File(['%PDF-1.4 fake voucher content'], 'hotel.pdf', {
      type: 'application/pdf',
    });

    const res = await uploadTripMedia({
      tripId: 'trip_1',
      folder: 'vouchers',
      file: pdfFile,
    });

    expect(supabase.storage.from).toHaveBeenCalledWith(TRIP_MEDIA_BUCKET);
    expect(uploadMock).toHaveBeenCalledTimes(1);
    expect(res.isRemote).toBe(true);
    expect(res.url).toContain(`/storage/v1/object/public/${TRIP_MEDIA_BUCKET}/trip_1/vouchers/`);
    expect(res.storagePath).toMatch(/^trip_1\/vouchers\/.+\.pdf$/);
    expect(res.dataUrl).toBeUndefined();
    expect(res.mimeType).toBe('application/pdf');
  });

  it('gracefully falls back to compressed dataUrl + IndexedDB when bucket is missing or upload fails', async () => {
    uploadMock.mockResolvedValue({
      data: null,
      error: { message: 'Bucket not found' },
    });

    const smallPngDataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    const res = await uploadTripMedia({
      tripId: 'trip_offline',
      folder: 'scrapbook',
      dataUrl: smallPngDataUrl,
    });

    expect(res.isRemote).toBe(false);
    expect(res.fallbackReason).toBe('Bucket not found');
    expect(res.url).toBe(smallPngDataUrl);
    expect(res.dataUrl).toBe(smallPngDataUrl);
    expect(localReceipts.saveLocalReceiptPhoto).toHaveBeenCalledWith(
      res.storageKey,
      smallPngDataUrl
    );
  });

  it('extracts Supabase Storage object paths safely and ignores data/external URLs', () => {
    expect(
      extractMediaStoragePath(
        'https://demo.supabase.co/storage/v1/object/public/trip-media/trip1/scrapbook/pic%201.jpg'
      )
    ).toBe('trip1/scrapbook/pic 1.jpg');

    expect(
      extractMediaStoragePath(
        'https://demo.supabase.co/storage/v1/object/sign/trip-media/trip1/vouchers/doc.pdf?token=abc123'
      )
    ).toBe('trip1/vouchers/doc.pdf');

    expect(extractMediaStoragePath('trip1/places/custom.jpg')).toBe('trip1/places/custom.jpg');
    expect(extractMediaStoragePath('data:image/jpeg;base64,abc')).toBeNull();
    expect(extractMediaStoragePath('blob:http://localhost:3000/123')).toBeNull();
    expect(extractMediaStoragePath('https://upload.wikimedia.org/example.jpg')).toBeNull();
  });

  it('deletes remote bucket objects and IndexedDB fallback keys cleanly', async () => {
    removeMock.mockResolvedValue({ data: [], error: null });

    const remoteUrl = `https://demo-project.supabase.co/storage/v1/object/public/${TRIP_MEDIA_BUCKET}/trip_1/passes/qr.jpg`;
    const deleted = await deleteTripMedia({
      urlOrPath: remoteUrl,
      storageKey: 'passes_trip_1_abc',
    });

    expect(deleted).toBe(true);
    expect(localReceipts.deleteLocalReceiptPhoto).toHaveBeenCalledWith('passes_trip_1_abc');
    expect(removeMock).toHaveBeenCalledWith(['trip_1/passes/qr.jpg']);

    const nonBucketDeleted = await deleteTripMedia({
      urlOrPath: 'https://images.unsplash.com/photo-123',
    });
    expect(nonBucketDeleted).toBe(false);
    expect(removeMock).toHaveBeenCalledTimes(1);
  });
});

