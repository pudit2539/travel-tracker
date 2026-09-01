// src/lib/versionSnapshot.ts
import { supabase } from './supabase';

export interface TripSnapshot {
  id: string;
  trip_id: string;
  label: string;
  created_at: string;
  version: string;
  data: {
    trip: any;
    itinerary: any[];
    expenses: any[];
    categories?: any[];
    categoryBudgets?: any;
    photos?: any[];
  };
}

const SNAPSHOT_KEY_PREFIX = 'travel_tracker_snapshots_';

export function getTripSnapshots(tripId: string): TripSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${SNAPSHOT_KEY_PREFIX}${tripId}`);
    if (!raw) return [];
    const list: TripSnapshot[] = JSON.parse(raw);
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch {
    return [];
  }
}

export function saveTripSnapshot(
  tripId: string, 
  data: TripSnapshot['data'], 
  label: string = 'Auto Snapshot'
): TripSnapshot {
  const snapshots = getTripSnapshots(tripId);
  const newSnapshot: TripSnapshot = {
    id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    trip_id: tripId,
    label: label.trim() || 'Snapshot ' + new Date().toLocaleString('th-TH'),
    created_at: new Date().toISOString(),
    version: `v1.${snapshots.length + 1}`,
    data,
  };

  // Keep up to 10 latest snapshots
  const updated = [newSnapshot, ...snapshots].slice(0, 10);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${SNAPSHOT_KEY_PREFIX}${tripId}`, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save snapshot to localStorage', e);
    }
  }
  return newSnapshot;
}

export function deleteTripSnapshot(tripId: string, snapshotId: string): TripSnapshot[] {
  const snapshots = getTripSnapshots(tripId).filter(s => s.id !== snapshotId);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${SNAPSHOT_KEY_PREFIX}${tripId}`, JSON.stringify(snapshots));
    } catch (e) {
      console.error('Failed to delete snapshot', e);
    }
  }
  return snapshots;
}

export async function restoreTripSnapshot(snapshot: TripSnapshot): Promise<{ success: boolean; error?: string }> {
  try {
    const { trip, itinerary, expenses, categories, categoryBudgets, photos } = snapshot.data;
    const tripId = snapshot.trip_id;

    // 1. Restore trip metadata in Supabase
    if (trip) {
      await supabase.from('trips').update({
        name: trip.name || trip.title,
        total_budget: trip.total_budget ?? trip.budget ?? 0,
        currency: trip.currency || 'JPY',
        start_date: trip.start_date || null,
        end_date: trip.end_date || null,
      }).eq('id', tripId);
    }

    // 2. Restore itinerary items in Supabase
    if (itinerary && Array.isArray(itinerary)) {
      // Clear current itinerary for this trip
      await supabase.from('itinerary_items').delete().eq('trip_id', tripId);
      
      const cleanItinerary = itinerary.map((item, idx) => ({
        trip_id: tripId,
        date_label: item.date_label || '',
        time_slot: item.time_slot || '',
        city: item.city || '',
        main_place: item.main_place || '',
        main_place_links: item.main_place_links || [],
        food_recommendation: item.food_recommendation || '',
        food_links: item.food_links || [],
        backup_plan: item.backup_plan || '',
        backup_links: item.backup_links || [],
        transport_info: item.transport_info || '',
        sort_order: item.sort_order !== undefined ? item.sort_order : idx,
      }));

      if (cleanItinerary.length > 0) {
        await supabase.from('itinerary_items').insert(cleanItinerary);
      }
    }

    // 3. Restore expenses in Supabase
    if (expenses && Array.isArray(expenses)) {
      await supabase.from('expenses').delete().eq('trip_id', tripId);

      const cleanExpenses = expenses.map(e => ({
        trip_id: tripId,
        title: e.title,
        amount: Number(e.amount),
        currency: e.currency || 'JPY',
        category: e.category || 'other',
        spent_at: e.spent_at,
        payer_id: e.payer_id || null,
        payer_name: e.payer_name || 'สมาชิก',
        payer_avatar: e.payer_avatar || 'cat_pink',
        receipt_url: e.receipt_url || null,
      }));

      if (cleanExpenses.length > 0) {
        await supabase.from('expenses').insert(cleanExpenses);
      }
    }

    // 4. Restore local category budgets & custom categories
    if (typeof window !== 'undefined') {
      if (categories) {
        localStorage.setItem(`travel_tracker_custom_categories_${tripId}`, JSON.stringify(categories.filter((c: any) => c.isCustom)));
      }
      if (categoryBudgets) {
        localStorage.setItem(`travel_tracker_cat_budgets_${tripId}`, JSON.stringify(categoryBudgets));
      }
      if (photos) {
        localStorage.setItem(`travel_tracker_photos_${tripId}`, JSON.stringify(photos));
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Snapshot restore failed:', err);
    return { success: false, error: err.message || 'Restore failed' };
  }
}

export function exportFullBackupJSON(data: TripSnapshot['data'], tripName: string = 'Trip') {
  const jsonStr = JSON.stringify({
    format: 'TRAVEL_TRACKER_BACKUP_V1',
    exported_at: new Date().toISOString(),
    trip_name: tripName,
    data,
  }, null, 2);

  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Backup_${tripName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseBackupJSON(jsonStr: string): TripSnapshot['data'] | null {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.format === 'TRAVEL_TRACKER_BACKUP_V1' && parsed.data) {
      return parsed.data;
    }
    // Fallback if raw data object
    if (parsed.itinerary || parsed.expenses) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
