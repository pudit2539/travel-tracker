import { supabase } from '@/lib/supabase';
import { compressReceiptImage } from '@/lib/imageCompressor';
import { saveLocalReceiptPhoto, deleteLocalReceiptPhoto } from '@/lib/localReceipts';

export const TRIP_MEDIA_BUCKET = 'trip-media';

export type TripMediaFolder =
  | 'scrapbook'
  | 'places'
  | 'passes'
  | 'vouchers'
  | 'receipts';

export interface UploadTripMediaOptions {
  tripId: string;
  folder: TripMediaFolder;
  file?: File;
  dataUrl?: string;
  fileName?: string;
  maxWidth?: number;
  quality?: number;
  compress?: boolean;
  storageKey?: string;
  cacheOffline?: boolean;
  includeDataUrl?: boolean;
}

export interface UploadTripMediaResult {
  /** Public Supabase Storage URL when uploaded remotely, or compressed dataUrl on fallback. */
  url: string;
  storagePath?: string;
  storageKey: string;
  dataUrl?: string;
  mimeType: string;
  size: number;
  isRemote: boolean;
  fallbackReason?: string;
}

function isSupabaseConfigured(): boolean {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  return Boolean(configuredUrl) && !configuredUrl.includes('placeholder.supabase.co');
}

function sanitizeSegment(input: string): string {
  const cleaned = input.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
  return cleaned.slice(0, 64) || 'trip';
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function extensionFromMime(mimeType: string, originalName?: string): string {
  const lower = mimeType.toLowerCase();
  if (lower.includes('pdf')) return 'pdf';
  if (lower.includes('png')) return 'png';
  if (lower.includes('webp')) return 'webp';
  if (lower.includes('gif')) return 'gif';
  if (lower.includes('jpeg') || lower.includes('jpg')) return 'jpg';

  const extMatch = originalName?.toLowerCase().match(/\.([a-z0-9]{2,5})$/);
  if (extMatch) return extMatch[1];
  return 'jpg';
}

export function dataUrlToBlob(dataUrl: string): { blob: Blob; mimeType: string } {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) {
    throw new Error('Invalid data URL format');
  }

  const header = dataUrl.slice(0, commaIdx);
  const body = dataUrl.slice(commaIdx + 1);
  const mimeMatch = header.match(/data:([^;]+)/i);
  const mimeType = mimeMatch?.[1] || 'application/octet-stream';

  const isBase64 = /;base64/i.test(header);
  if (!isBase64) {
    const decoded = decodeURIComponent(body);
    return { blob: new Blob([decoded], { type: mimeType }), mimeType };
  }

  const binaryStr = atob(body);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return { blob: new Blob([bytes], { type: mimeType }), mimeType };
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read blob as data URL'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Compress & upload media (image or PDF) to Supabase Storage `trip-media` bucket,
 * falling back cleanly to compressed dataUrl + IndexedDB if Storage is offline
 * or the bucket hasn't been provisioned yet.
 */
export async function uploadTripMedia(
  options: UploadTripMediaOptions
): Promise<UploadTripMediaResult> {
  const {
    tripId,
    folder,
    file,
    dataUrl: inputDataUrl,
    fileName,
    maxWidth = 1400,
    quality = 0.84,
    compress = true,
    cacheOffline = false,
    includeDataUrl = false,
  } = options;

  if (!file && !inputDataUrl) {
    throw new Error('uploadTripMedia requires either a file or a dataUrl');
  }

  const uniqueId = generateId();
  const storageKey = options.storageKey || `${folder}_${sanitizeSegment(tripId)}_${uniqueId}`;

  let uploadBlob: Blob;
  let mimeType = file?.type || 'image/jpeg';
  let preparedDataUrl: string | undefined = inputDataUrl;

  if (file) {
    const isCompressibleImage =
      compress &&
      file.type.startsWith('image/') &&
      file.type !== 'image/svg+xml' &&
      file.type !== 'image/gif';

    if (isCompressibleImage) {
      try {
        const compressed = await compressReceiptImage(file, maxWidth, quality);
        if (compressed.compressedSize > 0 && compressed.compressedSize < file.size * 0.98) {
          const converted = dataUrlToBlob(compressed.dataUrl);
          uploadBlob = converted.blob;
          mimeType = converted.mimeType;
          preparedDataUrl = compressed.dataUrl;
        } else {
          uploadBlob = file;
        }
      } catch {
        uploadBlob = file;
      }
    } else {
      uploadBlob = file;
    }
  } else {
    const converted = dataUrlToBlob(inputDataUrl!);
    uploadBlob = converted.blob;
    mimeType = converted.mimeType;
  }

  const ext = extensionFromMime(mimeType, fileName || file?.name);
  const storagePath = `${sanitizeSegment(tripId)}/${folder}/${uniqueId}.${ext}`;

  let remoteUrl: string | null = null;
  let fallbackReason: string | undefined;

  if (isSupabaseConfigured()) {
    try {
      const { error: uploadError } = await supabase.storage
        .from(TRIP_MEDIA_BUCKET)
        .upload(storagePath, uploadBlob, {
          contentType: mimeType,
          cacheControl: '31536000',
          upsert: true,
        });

      if (uploadError) {
        fallbackReason = uploadError.message;
      } else {
        const { data: publicData } = supabase.storage
          .from(TRIP_MEDIA_BUCKET)
          .getPublicUrl(storagePath);

        if (publicData?.publicUrl) {
          remoteUrl = publicData.publicUrl;
        } else {
          fallbackReason = 'Missing publicUrl from Supabase Storage';
        }
      }
    } catch (err) {
      fallbackReason = err instanceof Error ? err.message : 'Storage upload failed';
    }
  } else {
    fallbackReason = 'Supabase Storage not configured';
  }

  if (remoteUrl) {
    if ((cacheOffline || includeDataUrl) && !preparedDataUrl) {
      try {
        preparedDataUrl = await blobToDataUrl(uploadBlob);
      } catch {
        // Non-critical: remote URL is already ready
      }
    }
    if (cacheOffline && preparedDataUrl) {
      saveLocalReceiptPhoto(storageKey, preparedDataUrl).catch(() => {});
    }

    return {
      url: remoteUrl,
      storagePath,
      storageKey,
      ...(includeDataUrl && preparedDataUrl ? { dataUrl: preparedDataUrl } : {}),
      mimeType,
      size: uploadBlob.size,
      isRemote: true,
    };
  }

  // Fallback path: persist locally in IndexedDB + return compressed dataUrl
  if (!preparedDataUrl) {
    preparedDataUrl = await blobToDataUrl(uploadBlob);
  }
  saveLocalReceiptPhoto(storageKey, preparedDataUrl).catch(() => {});

  return {
    url: preparedDataUrl,
    storageKey,
    dataUrl: preparedDataUrl,
    mimeType,
    size: uploadBlob.size,
    isRemote: false,
    fallbackReason,
  };
}

/**
 * Extract the object path inside `trip-media` from a Supabase public/signed URL
 * or direct bucket-relative path. Returns null for data URLs or external domains.
 */
export function extractMediaStoragePath(urlOrPath?: string | null): string | null {
  if (!urlOrPath) return null;
  const trimmed = urlOrPath.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return null;
  }

  const markers = [
    `/storage/v1/object/public/${TRIP_MEDIA_BUCKET}/`,
    `/storage/v1/object/sign/${TRIP_MEDIA_BUCKET}/`,
    `/storage/v1/object/${TRIP_MEDIA_BUCKET}/`,
  ];

  for (const marker of markers) {
    const idx = trimmed.indexOf(marker);
    if (idx !== -1) {
      const rest = trimmed.slice(idx + marker.length);
      const cleanPath = rest.split('?')[0].split('#')[0];
      return cleanPath ? decodeURIComponent(cleanPath) : null;
    }
  }

  if (!/^https?:\/\//i.test(trimmed) && trimmed.includes('/')) {
    return trimmed;
  }

  return null;
}

/**
 * Best-effort cleanup of a remote object in Supabase Storage `trip-media`
 * (and optional IndexedDB key). Never throws.
 */
export async function deleteTripMedia(options: {
  urlOrPath?: string | null;
  storageKey?: string | null;
}): Promise<boolean> {
  const { urlOrPath, storageKey } = options;

  if (storageKey) {
    deleteLocalReceiptPhoto(storageKey).catch(() => {});
  }

  const objectPath = extractMediaStoragePath(urlOrPath);
  if (!objectPath || !isSupabaseConfigured()) {
    return false;
  }

  try {
    const { error } = await supabase.storage
      .from(TRIP_MEDIA_BUCKET)
      .remove([objectPath]);
    return !error;
  } catch {
    return false;
  }
}

