// src/lib/expenseSplits.ts

import { supabase } from '@/lib/supabase';

export interface ExpenseSplitMap {
  // expenseId -> array of member keys (member.id or member.name normalized)
  [expenseId: string]: string[];
}

const STORAGE_PREFIX = 'travel_tracker_expense_splits_';

/**
 * Sync expense splits to Supabase __meta_trip_data__ row so all devices get the split
 */
export async function syncSplitsToSupabase(tripId: string, splits: ExpenseSplitMap): Promise<void> {
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
      } catch (e) {}
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
        .insert([{
          trip_id: tripId,
          date_label: '__meta_trip_data__',
          main_place: 'SYSTEM_TRIP_METADATA',
          backup_plan: JSON.stringify(payload),
          sort_order: -9999
        }]);
    }
  } catch (err) {
    console.warn('Sync splits to supabase warn:', err);
  }
}

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
 * Save expense split mappings for a trip
 */
export function saveTripExpenseSplits(tripId: string, splits: ExpenseSplitMap): void {
  if (typeof window === 'undefined' || !tripId) return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${tripId}`, JSON.stringify(splits));
  } catch (err) {
    console.error('Failed to save expense splits:', err);
  }
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
  syncSplitsToSupabase(tripId, current).catch(() => {});
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
    syncSplitsToSupabase(tripId, current).catch(() => {});
  }
}

