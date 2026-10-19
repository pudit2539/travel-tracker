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
}

// In-memory Mutex Queue per tripId to serialize concurrent writes and prevent race conditions
const tripSyncQueues = new Map<string, Promise<any>>();

/**
 * Universal Cloud Synchronizer for Trip Metadata (__meta_trip_data__)
 * Persists all non-relational trip states (splits, payment methods, budgets, vouchers, etc.)
 * safely into Supabase without clobbering each other using atomic queue serialization & robust query ordering.
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

      // Deep merge updates into payload with granular field preserving
      const merged: TripMetadataPayload = {
        ...payload,
        ...updates,
        splits: updates.splits ? { ...payload.splits, ...updates.splits } : payload.splits,
        paymentMethods: updates.paymentMethods ? { ...payload.paymentMethods, ...updates.paymentMethods } : payload.paymentMethods,
        categoryBudgets: updates.categoryBudgets ? { ...payload.categoryBudgets, ...updates.categoryBudgets } : payload.categoryBudgets,
        memberBudgets: updates.memberBudgets ? { ...payload.memberBudgets, ...updates.memberBudgets } : payload.memberBudgets,
        settledTransfers: updates.settledTransfers ? { ...payload.settledTransfers, ...updates.settledTransfers } : payload.settledTransfers,
        checkedInSpots: updates.checkedInSpots ? { ...payload.checkedInSpots, ...updates.checkedInSpots } : payload.checkedInSpots,
        ticketsVault: updates.ticketsVault !== undefined ? updates.ticketsVault : payload.ticketsVault,
        accommodations: updates.accommodations !== undefined ? updates.accommodations : payload.accommodations,
        flights: updates.flights !== undefined ? updates.flights : payload.flights,
        flight: updates.flight !== undefined ? updates.flight : payload.flight,
        customPlacePhotos: updates.customPlacePhotos !== undefined 
          ? { ...(payload.customPlacePhotos || {}), ...updates.customPlacePhotos }
          : payload.customPlacePhotos,
      };

      const jsonString = JSON.stringify(merged);

      if (existing?.id) {
        await supabase
          .from('itinerary_items')
          .update({ backup_plan: jsonString })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('itinerary_items')
          .insert([
            {
              trip_id: tripId,
              date_label: '__meta_trip_data__',
              main_place: 'SYSTEM_TRIP_METADATA',
              backup_plan: jsonString,
              sort_order: -9999,
            },
          ]);
      }
    } catch (err) {
      console.warn('Failed to sync trip metadata to Supabase:', err);
    }
  })();

  tripSyncQueues.set(tripId, currentTask);
  return currentTask;
}
