// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';

import {
  CURATED_EXPLORE_SPOTS,
  ALL_JAPAN_CITY_GROUPS,
  normalizeCityGroup,
  inferSpotBudgetTier,
  isSpotOpenLate,
  isSpotWalkInFriendly,
  detectTripCityGroups,
} from '@/data/curatedExploreSpots';
import { STARTER_TRIP_TEMPLATES, findStarterTemplate } from '@/data/starterTripTemplates';
import { calculateDayCascadeSchedule, analyzeDayPace } from '@/lib/smartTimeline';
import GourmetRadarModal from '@/components/GourmetRadarModal';
import DiningDecisionPickerModal from '@/components/DiningDecisionPickerModal';
import {
  GoshuinPassportModal,
  resolveGoshuinEmblem,
  computeTripWrappedStats,
} from '@/components/trip-detail/GoshuinPassportModal';
import { TripPlanTab } from '@/components/trip-tabs/TripPlanTab';
import { ItineraryStopCard } from '@/components/trip-detail/ItineraryStopCard';
import { setCustomPlacePhoto } from '@/lib/placeThumbnails';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => React.createElement('a', { href, ...props }, children),
}));

vi.mock('@/lib/confetti', () => ({
  triggerConfetti: vi.fn(),
}));

describe('Package B & C: Nationwide Gourmet Radar, Smart Dining Picker, Day Pace, Rainy Plan B & Goshuin Passport', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    document.body.style.overflow = '';
    try {
      localStorage.clear();
    } catch {}
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    if (container.parentNode) container.parentNode.removeChild(container);
    document.body.querySelectorAll('[role="dialog"]').forEach((el) => el.parentNode?.removeChild(el));
    document.body.style.overflow = '';
    vi.clearAllMocks();
  });

  describe('Package B.1: Nationwide Curated Spots & Universal Metadata Helpers', () => {
    it('covers nationwide Japan cities (Tokyo, Fukuoka, Sapporo, Nagoya, Kanazawa + Kansai) with zero hardcoded old dates', () => {
      const cityGroups = new Set(CURATED_EXPLORE_SPOTS.map((s) => s.cityGroup));
      for (const expected of ['Osaka', 'Kyoto', 'Nara', 'Kobe', 'Tokyo', 'Fukuoka', 'Sapporo', 'Nagoya', 'Kanazawa']) {
        expect(cityGroups.has(expected as any)).toBe(true);
      }
      expect(ALL_JAPAN_CITY_GROUPS.length).toBeGreaterThanOrEqual(9);

      // No old trip dates hardcoded in recommendedTime
      const withOldDates = CURATED_EXPLORE_SPOTS.filter((s) => /(9|11|12|13)\s*ธ\.ค\./.test(s.recommendedTime || ''));
      expect(withOldDates).toEqual([]);
    });

    it('normalizes city groups, infers budget tiers, open-late status, walk-in status, and detects trip cities', () => {
      expect(normalizeCityGroup('Tokyo (Shinjuku)')).toBe('Tokyo');
      expect(normalizeCityGroup('ฟุกุโอกะ Hakata')).toBe('Fukuoka');
      expect(normalizeCityGroup('Sapporo Susukino')).toBe('Sapporo');
      expect(normalizeCityGroup('Kanazawa Omicho')).toBe('Kanazawa');

      expect(inferSpotBudgetTier('¥900 - ¥1,450')).toBe('budget');
      expect(inferSpotBudgetTier('¥1,500 - ¥2,800')).toBe('mid');
      expect(inferSpotBudgetTier('¥4,500 - ¥6,000')).toBe('premium');

      expect(isSpotOpenLate({ recommendedTime: 'เปิดถึง 23:00 น.' })).toBe(true);
      expect(isSpotWalkInFriendly({ recommendedTime: 'มื้อค่ำ (แนะนำจองล่วงหน้า)' })).toBe(false);
      expect(isSpotWalkInFriendly({ recommendedTime: 'มื้อกลางวัน' })).toBe(true);

      const detected = detectTripCityGroups(
        [{ city: 'Tokyo (Shibuya)' }, { city: 'Kanazawa' }],
        'Tokyo - Kanazawa'
      );
      expect(detected).toContain('Tokyo');
      expect(detected).toContain('Kanazawa');
    });
  });

  describe('Package B.2: GourmetRadarModal & DiningDecisionPickerModal Upgrades', () => {
    it('GourmetRadarModal filters by nationwide city, open-late, walk-in, budget tier, and opens ShowToStaffModal', async () => {
      await act(async () => {
        root.render(
          <GourmetRadarModal
            isOpen={true}
            onClose={vi.fn()}
            itinerary={[{ id: 't1', date_label: 'Day 1', city: 'Tokyo (Shinjuku)', main_place: 'Shinjuku' }]}
            tripId="trip-tokyo-1"
            tripDestination="Tokyo"
            availableDays={['Day 1', 'Day 2']}
            onAddToItinerary={vi.fn()}
          />
        );
      });

      const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement;
      expect(dialog).not.toBeNull();
      expect(dialog.textContent).toContain('โตเกียว (Tokyo)');
      expect(dialog.textContent).toContain('เปิดดึก (21:00+)');
      expect(dialog.textContent).toContain('วอล์กอินได้');
      expect(dialog.textContent).toContain('≤¥1,500');

      // Filter by Tokyo -> should show AFURI Ramen
      const tokyoBtn = Array.from(dialog.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('โตเกียว (Tokyo)')
      );
      await act(async () => {
        tokyoBtn?.click();
      });
      expect(dialog.textContent).toContain('AFURI Ramen');

      // Click "โชว์พนักงาน" -> opens ShowToStaffModal
      const staffBtn = Array.from(dialog.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('โชว์พนักงาน')
      );
      expect(staffBtn).toBeDefined();
      await act(async () => {
        staffBtn?.click();
      });
      expect(document.body.querySelectorAll('[role="dialog"]').length).toBeGreaterThanOrEqual(2);
    });

    it('DiningDecisionPickerModal provides interactive "เฉพาะร้านที่ยังไม่เคยไป" toggle and nationwide cities', async () => {
      await act(async () => {
        root.render(
          <DiningDecisionPickerModal
            isOpen={true}
            onClose={vi.fn()}
            itinerary={[]}
            tripId="trip-pick-1"
            tripDestination="Fukuoka"
            availableDays={['Day 1']}
            onAddToItinerary={vi.fn()}
          />
        );
      });

      const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement;
      expect(dialog).not.toBeNull();
      expect(dialog.textContent).toContain('Fukuoka');
      expect(dialog.textContent).toContain('Tokyo');

      const unvisitedBtn = Array.from(dialog.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('เฉพาะร้านที่ยังไม่เคยไป')
      ) as HTMLButtonElement;
      expect(unvisitedBtn).toBeDefined();
      expect(unvisitedBtn.getAttribute('aria-pressed')).toBe('false');
      await act(async () => {
        unvisitedBtn.click();
      });
      expect(unvisitedBtn.getAttribute('aria-pressed')).toBe('true');
    });
  });

  describe('Package C: Day Pace Alert, Rainy Day Plan B Mode, Starter Templates & Goshuin Passport', () => {
    it('analyzeDayPace flags relaxed, balanced, and packed/inter-city conflict days accurately', () => {
      const relaxedStops = [
        { id: '1', city: 'Kyoto', time_slot: '09:00 - 11:00', main_place: 'Kiyomizu' },
        { id: '2', city: 'Kyoto', time_slot: '13:00 - 15:00', main_place: 'Gion' },
      ];
      const relaxedCascade = calculateDayCascadeSchedule(relaxedStops, {});
      expect(analyzeDayPace(relaxedStops, relaxedCascade).level).toBe('relaxed');

      const packedStops = [
        { id: '1', city: 'Osaka', time_slot: '08:00 - 10:00', main_place: 'Osaka Castle' },
        { id: '2', city: 'Kyoto', time_slot: '11:00 - 13:00', main_place: 'Kiyomizu' },
        { id: '3', city: 'Nara', time_slot: '14:00 - 16:00', main_place: 'Todai-ji' },
        { id: '4', city: 'Kobe', time_slot: '17:00 - 19:00', main_place: 'Harborland' },
      ];
      const packedCascade = calculateDayCascadeSchedule(packedStops, {});
      const packedPace = analyzeDayPace(packedStops, packedCascade);
      expect(packedPace.level).toBe('packed');
      expect(packedPace.cityCount).toBe(4);
    });

    it('includes Kansai Classic and Okinawa starter templates', () => {
      expect(STARTER_TRIP_TEMPLATES['Osaka - Kyoto - Nara (Kansai Classic)']?.length).toBeGreaterThanOrEqual(4);
      expect(STARTER_TRIP_TEMPLATES['Okinawa - Naha & Churaumi']?.length).toBeGreaterThanOrEqual(3);
      expect(findStarterTemplate('Okinawa - Naha & Churaumi')).not.toBeNull();
    });

    it('GoshuinPassportModal computes Trip Wrapped stats & renders Stamp Passport + Story Preview tabs', async () => {
      expect(resolveGoshuinEmblem('Fushimi Inari Taisha', 'Kyoto')).toEqual({ emblem: '⛩️', kanji: '参拝' });
      expect(resolveGoshuinEmblem('Ichiran Ramen', 'Osaka')).toEqual({ emblem: '🍜', kanji: '満腹' });

      const stats = computeTripWrappedStats(
        [
          { id: 's1', city: 'Kyoto (Gion)', main_place: 'Fushimi Inari', food_recommendation: 'Matcha Parfait' },
          { id: 's2', city: 'Osaka', main_place: 'Dotonbori', food_recommendation: '-' },
        ],
        [
          { amount: 10000, currency: 'JPY', category: 'food', payer_name: 'Mint' },
          { amount: 2000, currency: 'JPY', category: 'transport', payer_name: 'Ball' },
        ],
        { s1: { visited: true, at: '09:30 น.', by: 'Mint' } },
        'JPY',
        0.23
      );
      expect(stats.visitedCount).toBe(1);
      expect(stats.totalStops).toBe(2);
      expect(stats.completionPct).toBe(50);
      expect(stats.topSpenderName).toBe('Mint');
      expect(stats.totalSpentThb).toBe(Math.round(12000 * 0.23));

      await act(async () => {
        root.render(
          <GoshuinPassportModal
            isOpen={true}
            onClose={vi.fn()}
            trip={{ id: 'trip-gw-1', name: 'Osaka Kyoto Winter', start_date: '2026-12-04', end_date: '2026-12-10' }}
            itinerary={[{ id: 's1', city: 'Kyoto', main_place: 'Fushimi Inari' }]}
            expenses={[{ amount: 5000, currency: 'JPY', category: 'food', payer_name: 'Mint' }]}
            fxRate={0.23}
            tripBaseCurrency="JPY"
          />
        );
      });

      const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement;
      expect(dialog).not.toBeNull();
      expect(dialog.textContent).toContain('Goshuin Passport & Trip Wrapped');

      // Switch to Trip Wrapped tab
      const wrappedTabBtn = Array.from(dialog.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('การ์ดสรุป Trip Wrapped')
      );
      await act(async () => {
        wrappedTabBtn?.click();
      });
      expect(dialog.textContent).toContain('TRIP WRAPPED');
      expect(dialog.textContent).toContain('บันทึกรูป Story (9:16 PNG)');
    });

    it('TripPlanTab renders Day Pace badge and toggles 1-Tap Rainy Day Plan B Mode banner', async () => {
      const itinerary = [
        {
          id: 'st-rain-1',
          trip_id: 'trip-c',
          date_label: '6 ธ.ค.',
          time_slot: '09:00 - 11:00',
          city: 'Kyoto',
          main_place: 'Kiyomizu-dera',
          backup_plan: 'Nishiki Market ในร่ม',
        },
      ];

      await act(async () => {
        root.render(
          <TripPlanTab
            trip={{ id: 'trip-c', name: 'Kyoto Rainy Test', currency: 'JPY' }}
            tripBaseCurrency="JPY"
            fxRate={0.23}
            heroDisplayData={{
              title: 'รวมทั้งทริป',
              spent: 5000,
              targetBudget: 30000,
              remaining: 25000,
              isOver: false,
              diff: 0,
              progress: 16,
              budgetLabel: 'งบทั้งหมด',
            }}
            itinerary={itinerary}
            filteredItinerary={itinerary}
            availableDays={['6 ธ.ค.']}
            selectedDayFilter="6 ธ.ค."
            setSelectedDayFilter={vi.fn()}
            itineraryViewMode="list"
            setItineraryViewMode={vi.fn()}
            showWeatherSection={false}
            setShowWeatherSection={vi.fn()}
            setShowTravelHubModal={vi.fn()}
            setShowPrintableModal={vi.fn()}
            canImportExcel={false}
            handleFileUpload={vi.fn()}
            exportToExcel={vi.fn()}
            canEditPlan={true}
            handleOpenAddActivity={vi.fn()}
            reordering={false}
            expandedPlanB={{}}
            setExpandedPlanB={vi.fn()}
            handleMoveActivity={vi.fn()}
            handleOpenEditActivity={vi.fn()}
            handleDeleteActivity={vi.fn()}
            onSwitchTab={vi.fn()}
            onOpenPassport={vi.fn()}
          />
        );
      });

      // Day Pace badge should appear on selected day summary
      expect(container.textContent).toContain('สบายๆ ชิลล์');

      // Toggle 1-Tap Rainy Day Plan B Mode
      const rainyBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('วันฝนตก')
      ) as HTMLButtonElement;
      expect(rainyBtn).toBeDefined();
      await act(async () => {
        rainyBtn.click();
      });

      expect(container.textContent).toContain('โหมดวันฝนตก (Plan B)');
      expect(container.textContent).toContain('Nishiki Market ในร่ม');
    });

    it('ItineraryStopCard falls back to curated HD photo when custom photo fails and hides "-" empty food note', async () => {
      const brokenCustomUrl = 'https://expired.example.com/broken-hotel.jpg';
      setCustomPlacePhoto("เช็กอินเข้าที่พัก Hotel The M's Kyoto", brokenCustomUrl, 'stop-broken-1');

      const stop = {
        id: 'stop-broken-1',
        trip_id: 'trip-broken-1',
        date_label: '5 ธ.ค.',
        time_slot: '15:00 น.',
        city: 'Kyoto Station',
        main_place: "เช็กอินเข้าที่พัก Hotel The M's Kyoto",
        transport_info: 'เดินเท้าจากสถานีเกียวโต | ฟรี',
        food_recommendation: '-',
        backup_plan: '-',
      };

      await act(async () => {
        root.render(
          <ItineraryStopCard
            item={stop}
            idx={3}
            totalItems={5}
            canEditPlan={true}
            reordering={false}
            isPlanBOpen={false}
            onTogglePlanB={vi.fn()}
            onMoveActivity={vi.fn()}
            onOpenEditActivity={vi.fn()}
            onDeleteActivity={vi.fn()}
          />
        );
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      // Dash-only food_recommendation & backup_plan must not render clutter
      expect(container.textContent).not.toContain('ร้านแนะนำ');
      expect(container.textContent).not.toContain('แผนสำรอง (Plan B)');

      // Initially renders custom photo with no-referrer policy
      let img = container.querySelector('img') as HTMLImageElement;
      expect(img).not.toBeNull();
      expect(img.getAttribute('src')).toBe(brokenCustomUrl);
      expect(img.getAttribute('referrerpolicy')).toBe('no-referrer');
      expect(container.textContent).toContain('รูปของฉัน');

      // Simulate image load error -> must fall back seamlessly to curated photo & hide stale custom badge
      await act(async () => {
        img.dispatchEvent(new Event('error'));
      });
      img = container.querySelector('img') as HTMLImageElement;
      expect(img).not.toBeNull();
      expect(img.getAttribute('src')).not.toBe(brokenCustomUrl);
      expect(img.getAttribute('src')).toBeTruthy();
      expect(container.textContent).not.toContain('รูปของฉัน');
    });
  });
});
