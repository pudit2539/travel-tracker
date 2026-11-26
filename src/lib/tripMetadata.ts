// src/lib/tripMetadata.ts
import { supabase } from '@/lib/supabase';

export interface TripMetadataPayload {
  accommodations?: any[];
  flights?: any[];
  flight?: any;
  splits?: Record<string, string[]>;
  paymentMethods?: Record<string, string>;
  customCategories?: any[];
  categoryBudgets?: Record<string, number>;
  memberBudgets?: Record<string, number>;
  photos?: any[];
  settledTransfers?: Record<string, boolean>;
  fxRate?: number;
  checkedInSpots?: Record<string, boolean>;
  ticketsVault?: any[];
  customPlacePhotos?: Record<string, string>;
  stopMetaMap?: Record<string, any>;
  shoppingBag?: any[];
  trainBookings?: any[];
  sharedFunds?: any[];
  guardianMap?: Record<string, string>;
  livePresence?: Record<string, any>;
  packingChecklist?: any[];
  starredPlaces?: any[];
  deletedEntityIds?: Record<string, number>;
  sharePrivacy?: {
    hideDates?: boolean;
    hideLodging?: boolean;
    hideHotels?: boolean;
    allowPublicReadOnly?: boolean;
  };
}

const MAX_INLINE_BASE64_CHARS = 180_000;

function toTimestampMs(val: unknown): number {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string' && val.trim()) {
    const parsed = Date.parse(val);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

function isCompletedStatus(item: Record<string, any>): boolean {
  return (
    item.status === 'bought' ||
    item.checked === true ||
    item.paymentStatus === 'paid'
  );
}

/**
 * ID-based Smart Merge for concurrent multi-device updates to metadata arrays
 * (shoppingBag, packingChecklist, ticketsVault, accommodations, flights).
 * Prevents Device B from clobbering an item Device A just checked off or updated,
 * while respecting explicit deletions tracked via `deletedIds` or intentional list removal.
 */
export function mergeMetadataEntityArray<T extends Record<string, any>>(
  existingArr: T[] | undefined,
  incomingArr: T[] | undefined,
  deletedIds?: Record<string, number>
): T[] {
  if (incomingArr === undefined) return existingArr || [];
  if (!Array.isArray(existingArr) || existingArr.length === 0) {
    return incomingArr.filter((it) => !(it?.id && deletedIds?.[String(it.id)]));
  }
  if (incomingArr.length === 0) return [];

  const existingById = new Map<string, T>();
  for (const item of existingArr) {
    if (item && item.id) {
      existingById.set(String(item.id), item);
    }
  }

  const incomingIds = new Set<string>();
  const mergedList: T[] = incomingArr
    .filter((item) => !(item?.id && deletedIds?.[String(item.id)]))
    .map((incomingItem) => {
      if (!incomingItem || !incomingItem.id) return incomingItem;
      const id = String(incomingItem.id);
      incomingIds.add(id);
      const existingItem = existingById.get(id);
      if (!existingItem) return incomingItem;

      const existingTs = toTimestampMs(
        existingItem.updatedAt ?? existingItem.boughtAt ?? existingItem.createdAt
      );
      const incomingTs = toTimestampMs(
        incomingItem.updatedAt ?? incomingItem.boughtAt ?? incomingItem.createdAt
      );

      // If existing remote record has a strictly newer timestamp, keep its newer fields
      if (existingTs > 0 && incomingTs > 0 && existingTs > incomingTs) {
        return { ...incomingItem, ...existingItem };
      }

      // If existing item was already marked completed (bought/checked) with a timestamp
      // and incoming item has NO updatedAt timestamp and is still uncompleted, preserve completed state
      if (
        isCompletedStatus(existingItem) &&
        !isCompletedStatus(incomingItem) &&
        existingTs > 0 &&
        incomingTs === 0
      ) {
        return { ...incomingItem, ...existingItem };
      }

      return { ...existingItem, ...incomingItem };
    });

  // Preserve newly created items on another device that carry an updatedAt/createdAt timestamp
  // and were not explicitly deleted
  for (const existingItem of existingArr) {
    if (!existingItem?.id) continue;
    const id = String(existingItem.id);
    if (incomingIds.has(id) || deletedIds?.[id]) continue;
    const existingTs = toTimestampMs(existingItem.updatedAt ?? existingItem.createdAt);
    if (existingTs > 0 && incomingArr.length >= existingArr.length) {
      mergedList.push(existingItem);
    }
  }

  return mergedList;
}

/**
 * Prevents `__meta_trip_data__` JSON row bloat by stripping oversized raw base64 blobs
 * (>180KB) from cloud metadata arrays while preserving normal URLs, local:// keys, and compact QRs.
 */
export function slimMetadataPayload(payload: TripMetadataPayload): TripMetadataPayload {
  const slimmed: TripMetadataPayload = { ...payload };

  if (Array.isArray(slimmed.ticketsVault)) {
    slimmed.ticketsVault = slimmed.ticketsVault.map((pass) => {
      if (
        pass &&
        typeof pass.qrCodeUrl === 'string' &&
        pass.qrCodeUrl.startsWith('data:image/') &&
        pass.qrCodeUrl.length > MAX_INLINE_BASE64_CHARS
      ) {
        const rest = { ...pass };
        delete rest.qrCodeUrl;
        return { ...rest, hasLargeLocalQr: true };
      }
      return pass;
    });
  }

  if (Array.isArray(slimmed.photos)) {
    slimmed.photos = slimmed.photos.map((photo) => {
      if (
        photo &&
        typeof photo.url === 'string' &&
        photo.url.startsWith('data:image/') &&
        photo.url.length > MAX_INLINE_BASE64_CHARS
      ) {
        return { ...photo, url: '' };
      }
      return photo;
    });
  }

  return slimmed;
}

// In-memory Mutex Queue per tripId to serialize concurrent writes and prevent race conditions
const tripSyncQueues = new Map<string, Promise<any>>();

/**
 * Universal Cloud Synchronizer for Trip Metadata (__meta_trip_data__)
 * Persists all non-relational trip states (splits, payment methods, budgets, vouchers, etc.)
 * safely into Supabase without clobbering each other using atomic queue serialization & ID-based Smart Merge.
 */
export async function syncTripMetadataToSupabase(
  tripId: string,
  updates: Partial<TripMetadataPayload>
): Promise<void> {
  if (!tripId) return;

  const previousTask = tripSyncQueues.get(tripId) || Promise.resolve();

  const currentTask = (async () => {
    try {
      await previousTask;
    } catch {}

    try {
      const query = supabase
        .from('itinerary_items')
        .select('id, backup_plan')
        .eq('trip_id', tripId)
        .eq('date_label', '__meta_trip_data__');

      let existing: { id: string; backup_plan?: string | null } | null = null;

      if (typeof (query as any).order === 'function') {
        const { data: rows } = await (query as any).order('id', { ascending: true }).limit(1);
        existing = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
      } else if (typeof (query as any).maybeSingle === 'function') {
        const { data } = await (query as any).maybeSingle();
        existing = data || null;
      } else {
        const { data } = await query;
        existing = Array.isArray(data) ? data[0] : data;
      }

      let payload: TripMetadataPayload = {};
      if (existing?.backup_plan) {
        try {
          payload = JSON.parse(existing.backup_plan);
        } catch {
          payload = {};
        }
      }

      const deletedEntityIds = updates.deletedEntityIds
        ? { ...(payload.deletedEntityIds || {}), ...updates.deletedEntityIds }
        : payload.deletedEntityIds;

      // Deep merge updates into payload with granular field & ID-based entity array preserving
      const merged: TripMetadataPayload = slimMetadataPayload({
        ...payload,
        ...updates,
        deletedEntityIds,
        splits: updates.splits ? { ...payload.splits, ...updates.splits } : payload.splits,
        paymentMethods: updates.paymentMethods
          ? { ...payload.paymentMethods, ...updates.paymentMethods }
          : payload.paymentMethods,
        categoryBudgets: updates.categoryBudgets
          ? { ...payload.categoryBudgets, ...updates.categoryBudgets }
          : payload.categoryBudgets,
        memberBudgets: updates.memberBudgets
          ? { ...payload.memberBudgets, ...updates.memberBudgets }
          : payload.memberBudgets,
        settledTransfers: updates.settledTransfers
          ? { ...payload.settledTransfers, ...updates.settledTransfers }
          : payload.settledTransfers,
        checkedInSpots: updates.checkedInSpots
          ? { ...payload.checkedInSpots, ...updates.checkedInSpots }
          : payload.checkedInSpots,
        ticketsVault:
          updates.ticketsVault !== undefined
            ? mergeMetadataEntityArray(payload.ticketsVault, updates.ticketsVault, deletedEntityIds)
            : payload.ticketsVault,
        accommodations:
          updates.accommodations !== undefined
            ? mergeMetadataEntityArray(payload.accommodations, updates.accommodations, deletedEntityIds)
            : payload.accommodations,
        flights:
          updates.flights !== undefined
            ? mergeMetadataEntityArray(payload.flights, updates.flights, deletedEntityIds)
            : payload.flights,
        flight: updates.flight !== undefined ? updates.flight : payload.flight,
        customPlacePhotos:
          updates.customPlacePhotos !== undefined
            ? { ...(payload.customPlacePhotos || {}), ...updates.customPlacePhotos }
            : payload.customPlacePhotos,
        stopMetaMap:
          updates.stopMetaMap !== undefined
            ? { ...(payload.stopMetaMap || {}), ...updates.stopMetaMap }
            : payload.stopMetaMap,
        shoppingBag:
          updates.shoppingBag !== undefined
            ? mergeMetadataEntityArray(payload.shoppingBag, updates.shoppingBag, deletedEntityIds)
            : payload.shoppingBag,
        packingChecklist:
          updates.packingChecklist !== undefined
            ? mergeMetadataEntityArray(payload.packingChecklist, updates.packingChecklist, deletedEntityIds)
            : payload.packingChecklist,
        starredPlaces:
          updates.starredPlaces !== undefined
            ? mergeMetadataEntityArray(payload.starredPlaces, updates.starredPlaces, deletedEntityIds)
            : payload.starredPlaces,
        trainBookings:
          updates.trainBookings !== undefined
            ? mergeMetadataEntityArray(payload.trainBookings, updates.trainBookings, deletedEntityIds)
            : payload.trainBookings,
        sharedFunds:
          updates.sharedFunds !== undefined ? updates.sharedFunds : payload.sharedFunds,
        guardianMap:
          updates.guardianMap !== undefined
            ? { ...(payload.guardianMap || {}), ...updates.guardianMap }
            : payload.guardianMap,
        livePresence:
          updates.livePresence !== undefined
            ? { ...(payload.livePresence || {}), ...updates.livePresence }
            : payload.livePresence,
        sharePrivacy:
          updates.sharePrivacy !== undefined
            ? { ...(payload.sharePrivacy || {}), ...updates.sharePrivacy }
            : payload.sharePrivacy,
      });

      const jsonStr = JSON.stringify(merged);

      if (existing?.id) {
        await supabase
          .from('itinerary_items')
          .update({ backup_plan: jsonStr })
          .eq('id', existing.id);
      } else {
        await supabase.from('itinerary_items').insert([
          {
            trip_id: tripId,
            date_label: '__meta_trip_data__',
            main_place: 'Metadata System Record',
            backup_plan: jsonStr,
            sort_order: 999999,
          },
        ]);
      }
    } catch (err) {
      console.warn('Cloud metadata sync warning:', err);
    }
  })();

  tripSyncQueues.set(tripId, currentTask);
  return currentTask;
}
