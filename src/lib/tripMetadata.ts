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
}

/**
 * Universal Cloud Synchronizer for Trip Metadata (__meta_trip_data__)
 * Persists all non-relational trip states (splits, payment methods, budgets, vouchers, etc.)
 * safely into Supabase without clobbering each other.
 */
export async function syncTripMetadataToSupabase(
  tripId: string,
  updates: Partial<TripMetadataPayload>
): Promise<void> {
  if (!tripId) return;

  try {
    const { data: existing } = await supabase
      .from('itinerary_items')
      .select('id, backup_plan')
      .eq('trip_id', tripId)
      .eq('date_label', '__meta_trip_data__')
      .maybeSingle();

    let payload: TripMetadataPayload = {};
    if (existing?.backup_plan) {
      try {
        payload = JSON.parse(existing.backup_plan);
      } catch {
        payload = {};
      }
    }

    // Deep merge updates into payload
    const merged: TripMetadataPayload = {
      ...payload,
      ...updates,
      splits: updates.splits ? { ...payload.splits, ...updates.splits } : payload.splits,
      paymentMethods: updates.paymentMethods ? { ...payload.paymentMethods, ...updates.paymentMethods } : payload.paymentMethods,
      categoryBudgets: updates.categoryBudgets ? { ...payload.categoryBudgets, ...updates.categoryBudgets } : payload.categoryBudgets,
      memberBudgets: updates.memberBudgets ? { ...payload.memberBudgets, ...updates.memberBudgets } : payload.memberBudgets,
      settledTransfers: updates.settledTransfers ? { ...payload.settledTransfers, ...updates.settledTransfers } : payload.settledTransfers,
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
}
