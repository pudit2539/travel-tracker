import { describe, it, expect, beforeEach } from 'vitest';
import { 
  saveTripSnapshot, 
  getTripSnapshots, 
  deleteTripSnapshot, 
  exportFullBackupJSON, 
  parseBackupJSON 
} from '../lib/versionSnapshot';

describe('Version Snapshot & Backup System', () => {
  const tripId = 'trip-test-999';

  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and retrieves trip snapshots', () => {
    const mockData = {
      trip: { id: tripId, title: 'Osaka Trip' },
      itinerary: [{ id: 'item-1', main_place: 'Dotonbori' }],
      expenses: [{ id: 'exp-1', amount: 5000 }],
      categories: ['Food', 'Transport'],
      categoryBudgets: { Food: 20000 },
      photos: [],
    };

    const snap = saveTripSnapshot(tripId, mockData, 'Initial Backup');
    expect(snap.label).toBe('Initial Backup');
    expect(snap.trip_id).toBe(tripId);

    const list = getTripSnapshots(tripId);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(snap.id);
  });

  it('deletes snapshots correctly', () => {
    const mockData = { 
      trip: { id: tripId },
      itinerary: [],
      expenses: [],
    };
    const snap1 = saveTripSnapshot(tripId, mockData, 'Snap 1');
    const snap2 = saveTripSnapshot(tripId, mockData, 'Snap 2');

    expect(getTripSnapshots(tripId)).toHaveLength(2);

    deleteTripSnapshot(tripId, snap1.id);
    const list = getTripSnapshots(tripId);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(snap2.id);
  });

  it('parses valid JSON backups accurately', () => {
    const backupPayload = JSON.stringify({
      format: 'TRAVEL_TRACKER_BACKUP_V1',
      exported_at: new Date().toISOString(),
      trip_name: 'Kyoto Trip',
      data: {
        trip: { id: tripId, title: 'Kyoto Trip' },
        itinerary: [{ id: 'item-1', main_place: 'Kiyomizu-dera' }],
        expenses: [{ id: 'exp-1', amount: 3500 }],
      },
    });

    const parsed = parseBackupJSON(backupPayload);

    expect(parsed).not.toBeNull();
    expect(parsed?.trip?.title).toBe('Kyoto Trip');
    expect(parsed?.itinerary).toHaveLength(1);
    expect(parsed?.expenses).toHaveLength(1);
  });
});
