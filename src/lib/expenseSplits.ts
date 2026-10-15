// src/lib/expenseSplits.ts
import { supabase } from '@/lib/supabase';

export interface ExpenseSplitMap {
  // expenseId -> array of member keys (member.id or member.name normalized)
  [expenseId: string]: string[];
}

const STORAGE_PREFIX = 'travel_tracker_expense_splits_';

/**
 * Get all expense split mappings for a trip
 */
export function getTripExpenseSplits(tripId: string): ExpenseSplitMap {
  if (typeof window === 'undefined' || !tripId) return {};
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${tripId}`);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse expense splits:', err);
    return {};
  }
}

/**
 * Sync expense split mappings to Supabase metadata row (__meta_trip_data__)
 * so splits persist across all devices, browsers, and app reloads.
 */
export async function syncExpenseSplitsToSupabase(
  tripId: string,
  splits: ExpenseSplitMap
): Promise<void> {
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
        // ignore parse error
      }
    }
    payload.splits = splits;

    if (existing?.id) {
      await supabase
        .from('itinerary_items')
        .update({ backup_plan: JSON.stringify(payload) })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('itinerary_items')
        .insert([
          {
            trip_id: tripId,
            date_label: '__meta_trip_data__',
            main_place: 'SYSTEM_TRIP_METADATA',
            backup_plan: JSON.stringify(payload),
            sort_order: -9999,
          },
        ]);
    }
  } catch (err) {
    console.warn('Failed to sync expense splits to Supabase:', err);
  }
}

/**
 * Save expense split mappings for a trip (LocalStorage + Cloud Sync)
 */
export function saveTripExpenseSplits(tripId: string, splits: ExpenseSplitMap): void {
  if (typeof window === 'undefined' || !tripId) return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${tripId}`, JSON.stringify(splits));
    window.dispatchEvent(
      new CustomEvent('travel_tracker_splits_updated', {
        detail: { tripId, splits },
      })
    );
  } catch (err) {
    console.error('Failed to save expense splits to localStorage:', err);
  }

  // Sync to Supabase in background
  syncExpenseSplitsToSupabase(tripId, splits).catch((err) => {
    console.warn('Background sync expense splits failed:', err);
  });
}

/**
 * Set who splits a specific expense
 */
export function setExpenseSplitMembers(
  tripId: string,
  expenseId: string,
  memberIds: string[]
): ExpenseSplitMap {
  const current = getTripExpenseSplits(tripId);
  current[expenseId] = memberIds;
  saveTripExpenseSplits(tripId, current);
  return current;
}

/**
 * Get who splits a specific expense (returns undefined if default/everyone)
 */
export function getExpenseSplitMembers(
  tripId: string,
  expenseId: string
): string[] | undefined {
  const current = getTripExpenseSplits(tripId);
  return current[expenseId];
}

/**
 * Remove split mapping for an expense
 */
export function deleteExpenseSplit(tripId: string, expenseId: string): void {
  const current = getTripExpenseSplits(tripId);
  if (current[expenseId]) {
    delete current[expenseId];
    saveTripExpenseSplits(tripId, current);
  }
}

