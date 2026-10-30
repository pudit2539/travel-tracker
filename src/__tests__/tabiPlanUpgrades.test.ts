import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateDayCascadeSchedule,
  buildChunkedDayRoutes,
  detectStopAmenities,
  getStopMeta,
  updateStopMeta,
} from '@/lib/smartTimeline';
import {
  getShoppingBag,
  addShoppingBagItem,
  updateShoppingBagItem,
  deleteShoppingBagItem,
  getShoppingBagSummary,
} from '@/lib/shoppingBag';

describe('TabiPlan Upgrades — Smart Timeline & Shopping Bag', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('calculates cascading day schedule and skips skipped stops cleanly', () => {
    const items = [
      {
        id: 'stop-1',
        time_slot: '09:00 - 10:30',
        main_place: 'Fushimi Inari Taisha',
        transport_info: 'รถไฟ Keihan Main Line (20 นาที / ¥220)',
      },
      {
        id: 'stop-2',
        time_slot: '11:00 - 12:30',
        main_place: 'Kiyomizu-dera Temple',
        transport_info: 'เดินเท้า (15 นาที / ¥0)',
      },
      {
        id: 'stop-3',
        time_slot: '13:00 - 14:00',
        main_place: 'Nishiki Market',
      },
    ];

    const fullResult = calculateDayCascadeSchedule(items, {});
    expect(fullResult.activeStopsCount).toBe(3);
    expect(fullResult.skippedStopsCount).toBe(0);
    expect(fullResult.totalTransitFareJpy).toBe(220);
    expect(fullResult.byStopKey['stop-1'].arriveTime).toBe('09:00');
    expect(fullResult.byStopKey['stop-1'].leaveTime).toBe('10:30');

    // Skip stop-2 and verify cascade skips over it
    const skippedResult = calculateDayCascadeSchedule(items, {
      'stop-2': { skipped: true },
    });
    expect(skippedResult.activeStopsCount).toBe(2);
    expect(skippedResult.skippedStopsCount).toBe(1);
    expect(skippedResult.byStopKey['stop-2'].skipped).toBe(true);
  });

  it('detects late arrival and waiting before opening hours', () => {
    const items = [
      {
        id: 'stop-a',
        time_slot: '08:00 - 09:00',
        main_place: 'Uji Bridge',
        transport_info: 'เดินเท้า (10 นาที)',
      },
      {
        id: 'stop-b',
        time_slot: '09:10 - 10:10',
        main_place: 'Nakamura Tokichi Honten',
      },
    ];

    const schedule = calculateDayCascadeSchedule(items, {
      'stop-b': {
        openTime: '10:00',
        closeTime: '17:00',
      },
    });

    // Arrives at 09:10, opens at 10:00 -> waits 50 min
    expect(schedule.byStopKey['stop-b'].waitMin).toBe(50);
    expect(schedule.byStopKey['stop-b'].arriveTime).toBe('10:00');
  });

  it('builds 5-stop chunked Google Maps and Apple Maps routes without dropping stops', () => {
    const items = Array.from({ length: 8 }, (_, idx) => ({
      id: `s-${idx + 1}`,
      main_place: `Osaka Spot ${idx + 1}`,
      city: 'Osaka',
    }));

    const chunks = buildChunkedDayRoutes(items, {}, 'transit');
    expect(chunks.length).toBe(2);
    expect(chunks[0].stopsCount).toBe(5);
    expect(chunks[0].googleMapsUrl).toContain('google.com/maps/dir');
    expect(chunks[0].appleMapsUrl).toContain('maps.apple.com');
    // Overlapping handoff from stop 5 to stop 8 (4 stops in chunk 2)
    expect(chunks[1].stopsCount).toBe(4);
  });

  it('auto-detects amenities from stop descriptions', () => {
    const tags = detectStopAmenities({
      main_place: 'Don Quijote Dotonbori & Shinsaibashi Covered Arcade',
      backup_plan: 'มีตู้ล็อกเกอร์ฝากกระเป๋า Coin Locker ในร่ม วันฝนตกเดินได้ Tax-Free',
    });
    const tagIds = tags.map((t) => t.id);
    expect(tagIds).toContain('rainy-day');
    expect(tagIds).toContain('luggage-storage');
    expect(tagIds).toContain('tax-free');
  });

  it('manages stop-linked shopping bag items and computes character props', () => {
    const tripId = 'test-trip-123';
    const initial = getShoppingBag(tripId);
    expect(initial.length).toBeGreaterThan(0);

    const added = addShoppingBagItem(tripId, {
      name: 'Gundam RG Model',
      store: 'Joshin Super Kids Land',
      dayLabel: 'Day 8 (11 ธ.ค.)',
      stopName: 'Den Den Town',
      category: 'game',
      estPrice: 4500,
      quantity: 1,
      status: 'planned',
    });

    const boughtList = updateShoppingBagItem(tripId, added[0].id, {
      status: 'bought',
      actualPrice: 4200,
    });

    const summary = getShoppingBagSummary(boughtList);
    expect(summary.boughtCount).toBeGreaterThanOrEqual(1);
    expect(summary.characterProps.length).toBeGreaterThanOrEqual(1);

    const afterDelete = deleteShoppingBagItem(tripId, added[0].id);
    expect(afterDelete.find((i) => i.id === added[0].id)).toBeUndefined();
  });

  it('persists and retrieves StopSmartMeta per stop', () => {
    const tripId = 'test-trip-meta';
    updateStopMeta(tripId, 'stop-99', {
      durationMin: 120,
      goers: ['Pudit', 'Friend'],
    });
    const meta = getStopMeta(tripId, 'stop-99');
    expect(meta.durationMin).toBe(120);
    expect(meta.goers).toEqual(['Pudit', 'Friend']);
  });
});
