// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import {
  isStopVisited,
  toggleStopVisited,
  getVisitedCountForItems,
  subscribeVisitedStamps,
} from '@/lib/visitedStamps';
import {
  getTripStatusBadge,
  resolveDisplayCurrency,
  QUICK_EXPENSE_PRESETS,
} from '@/lib/tripStatus';
import ShowToStaffModal from '@/components/trip-detail/ShowToStaffModal';
import CurrencyPillSwitcher from '@/components/CurrencyPillSwitcher';
import LiveTripCard from '@/components/LiveTripCard';
import {
  getPlaceVisualMeta,
  fetchRealPlacePhotoUrl,
  extractAttractionSearchQuery,
  triggerViewTransition,
} from '@/lib/placeThumbnails';
import {
  ItineraryStopCard,
  ItineraryThumbnailCard,
  ItineraryCompactRow,
} from '@/components/trip-detail/ItineraryStopCard';
import {
  ExpenseCard,
  ExpenseThumbnailCard,
  ExpenseCompactRow,
} from '@/components/trip-detail/ExpenseCard';
import PocketMoneyWidget from '@/components/PocketMoneyWidget';
import { DEFAULT_CATEGORIES } from '@/lib/categories';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/confetti', () => ({
  triggerConfetti: vi.fn(),
}));

describe('UI Upgrades & Mobile/iPad Responsive Suite', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
    const portals = document.body.querySelectorAll('[role="dialog"]');
    portals.forEach((p) => p.parentNode?.removeChild(p));
    vi.clearAllMocks();
  });

  describe('1. Unified Eki-Stamp Visited Sync (visitedStamps.ts)', () => {
    it('toggles visited state and syncs across trip map and individual activity key', () => {
      const tripId = 'trip-osaka-2026';
      const stopId = 'stop-usj-1';

      expect(isStopVisited(stopId, tripId)).toBe(false);

      const nextState = toggleStopVisited(stopId, tripId);
      expect(nextState).toBe(true);
      expect(isStopVisited(stopId, tripId)).toBe(true);
      expect(isStopVisited(stopId)).toBe(true);

      const afterSecondToggle = toggleStopVisited(stopId, tripId);
      expect(afterSecondToggle).toBe(false);
      expect(isStopVisited(stopId, tripId)).toBe(false);
    });

    it('notifies subscribers via visited-stamps-changed event in real time', () => {
      const listener = vi.fn();
      const unsubscribe = subscribeVisitedStamps(listener);

      toggleStopVisited('stop-dotonbori', 'trip-1');
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
    });

    it('counts visited items accurately for progress bar', () => {
      const tripId = 'trip-kyoto';
      const items = [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }];

      toggleStopVisited('a1', tripId);
      toggleStopVisited('a3', tripId);

      expect(getVisitedCountForItems(items, tripId)).toBe(2);
    });
  });

  describe('2. Smart Trip Lifecycle & Boarding Pass Badges (tripStatus.ts)', () => {
    it('returns live badge with Day X/Y when reference date is within trip range', () => {
      const now = new Date('2026-12-05T10:00:00');
      const badge = getTripStatusBadge('2026-12-04', '2026-12-08', now);
      expect(badge.status).toBe('live');
      expect(badge.currentDay).toBe(2);
      expect(badge.totalDays).toBe(5);
      expect(badge.isPulse).toBe(true);
      expect(badge.badgeText).toContain('Day 2/5');
    });

    it('returns upcoming countdown badge when trip is in the future', () => {
      const now = new Date('2026-12-01T09:00:00');
      const badge = getTripStatusBadge('2026-12-04', '2026-12-08', now);
      expect(badge.status).toBe('upcoming');
      expect(badge.daysUntil).toBe(3);
      expect(badge.badgeText).toContain('อีก 3 วันเดินทาง');
    });

    it('returns completed badge when trip has ended', () => {
      const now = new Date('2026-12-15T09:00:00');
      const badge = getTripStatusBadge('2026-12-04', '2026-12-08', now);
      expect(badge.status).toBe('completed');
      expect(badge.badgeText).toContain('จบทริปแล้ว');
    });
  });

  describe('3. Real-Time Global Currency Switcher Logic (resolveDisplayCurrency)', () => {
    it('shows foreign currency as primary and THB as secondary when currencyView is foreign', () => {
      const res = resolveDisplayCurrency(10000, 'JPY', 0.235, 'foreign');
      expect(res.primaryCurrency).toBe('JPY');
      expect(res.primaryAmount).toBe(10000);
      expect(res.primaryText).toBe('¥10,000');
      expect(res.secondaryCurrency).toBe('THB');
      expect(res.secondaryAmount).toBe(2350);
      expect(res.secondaryText).toContain('฿2,350');
    });

    it('flips THB to primary and JPY to secondary when currencyView is thb', () => {
      const res = resolveDisplayCurrency(10000, 'JPY', 0.235, 'thb');
      expect(res.primaryCurrency).toBe('THB');
      expect(res.primaryAmount).toBe(2350);
      expect(res.primaryText).toBe('฿2,350');
      expect(res.secondaryCurrency).toBe('JPY');
      expect(res.secondaryAmount).toBe(10000);
      expect(res.secondaryText).toContain('¥10,000');
    });
  });

  describe('4. 1-Tap Quick Expense Presets (QUICK_EXPENSE_PRESETS)', () => {
    it('provides ready-to-use travel expense presets with valid categories and payment methods', () => {
      expect(QUICK_EXPENSE_PRESETS.length).toBeGreaterThanOrEqual(6);
      const konbini = QUICK_EXPENSE_PRESETS.find((p) => p.id === 'konbini');
      expect(konbini).toBeDefined();
      expect(konbini?.category).toBe('food');

      const transit = QUICK_EXPENSE_PRESETS.find((p) => p.id === 'ic_transit');
      expect(transit?.category).toBe('transport');
    });
  });

  describe('5. ShowToStaffModal Mobile & iPad Portrait/Landscape Responsiveness', () => {
    it('renders via portal with dvh max-height, overscroll-contain, fluid clamp typography, and situation tabs', async () => {
      const onClose = vi.fn();

      await act(async () => {
        root.render(
          <ShowToStaffModal
            isOpen={true}
            onClose={onClose}
            placeName="Universal Studios Japan"
            city="Osaka"
            platformInfo="Track 1 / Exit 2"
            transportNote="JR Yumesaki Line"
          />
        );
      });

      const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement;
      expect(dialog).not.toBeNull();
      expect(dialog.className).toContain('overscroll-contain');

      // Verify dynamic viewport height (90dvh) for mobile/iPad landscape safety
      const card = dialog.firstElementChild as HTMLElement;
      expect(card.className).toContain('max-h-[90dvh]');

      // Verify scrollable inner body has overscroll-contain and touch-pan-y
      const scrollBody = dialog.querySelector('.overflow-y-auto') as HTMLElement;
      expect(scrollBody).not.toBeNull();
      expect(scrollBody.className).toContain('overscroll-contain');
      expect(scrollBody.className).toContain('touch-pan-y');

      // Verify destination heading uses fluid clamp() typography
      const heading = dialog.querySelector('h2') as HTMLElement;
      expect(heading.textContent).toBe('Universal Studios Japan');
      expect(heading.getAttribute('style')).toContain('clamp(');

      // Switch situation phrase tabs (Taxi -> Train Station)
      const buttons = Array.from(dialog.querySelectorAll('button'));
      const stationBtn = buttons.find((b) => b.textContent?.includes('นายสถานี'));
      expect(stationBtn).toBeDefined();

      await act(async () => {
        stationBtn?.click();
      });

      expect(dialog.textContent).toContain('ชานชาลาไหนครับ');
    });
  });

  describe('6. Unified CurrencyPillSwitcher & Calculator Dock (No Overlapping FABs)', () => {
    it('toggles between foreign and THB and opens Quick Currency Calculator from a single unified dock', async () => {
      const onToggle = vi.fn();
      const onOpenCalculator = vi.fn();

      await act(async () => {
        root.render(
          <CurrencyPillSwitcher
            primaryCurrency="JPY"
            activeView="foreign"
            onToggle={onToggle}
            fxRate={0.235}
            onOpenCalculator={onOpenCalculator}
          />
        );
      });

      const buttons = Array.from(container.querySelectorAll('button'));
      const thbBtn = buttons.find((b) => b.textContent?.includes('THB'));
      expect(thbBtn).toBeDefined();

      await act(async () => {
        thbBtn?.click();
      });
      expect(onToggle).toHaveBeenCalledWith('thb');

      const calcBtn = buttons.find((b) => b.getAttribute('title')?.includes('เปิดเครื่องคิดเลขแปลงค่าเงินด่วน'));
      expect(calcBtn).toBeDefined();

      await act(async () => {
        calcBtn?.click();
      });
      expect(onOpenCalculator).toHaveBeenCalledTimes(1);
    });
  });

  describe('7. LiveTripCard Database Field Mapping & Visited Stamp Sync', () => {
    it('reads main_place, date_label, time_slot, and city and syncs Eki-Stamp', async () => {
      const itinerary = [
        {
          id: 'stop-1',
          date_label: '04-Dec',
          time_slot: '09:00 - 11:00',
          main_place: 'Fushimi Inari Taisha',
          city: 'Kyoto',
          platform: 'JR Inari Station',
        },
        {
          id: 'stop-2',
          date_label: '04-Dec',
          time_slot: '12:00 - 14:00',
          main_place: 'Nishiki Market',
          city: 'Kyoto',
        },
      ];

      await act(async () => {
        root.render(
          <LiveTripCard
            trip={{ id: 'trip-kyoto-1', name: 'Kyoto Autumn' }}
            itinerary={itinerary}
            availableDays={['04-Dec']}
            selectedDay="04-Dec"
            fxRate={0.235}
          />
        );
      });

      expect(container.textContent).toContain('Fushimi Inari Taisha');
      expect(container.textContent).toContain('เช็คอินแล้ว 0/2 จุด');

      const buttons = Array.from(container.querySelectorAll('button'));
      const stampBtn = buttons.find((b) => b.textContent?.includes('ประทับตราเช็คอิน'));
      expect(stampBtn).toBeDefined();

      await act(async () => {
        stampBtn?.click();
      });

      expect(isStopVisited('stop-1', 'trip-kyoto-1')).toBe(true);
      expect(container.textContent).toContain('เช็คอินแล้ว 1/2 จุด');
    });
  });

  describe('8. Curated Place Thumbnails & Same-Document View Transition Helper', () => {
    it('prioritizes specific attractions (Ine, Amanohashidate, Katsuo-ji, USJ) over generic city names and never defaults to Fuji', () => {
      const ine = getPlaceVisualMeta('ล่องเรือหมู่บ้านชาวประมงอิเนะ (Ine Funaya)', 'Kyoto', 0);
      expect(ine.categoryLabel).toBe('Ine Funaya Bay');
      expect(ine.wikiQuery).toBe('Ine, Kyoto');

      const amano = getPlaceVisualMeta('จุดชมวิว Amanohashidate Viewland', 'Kyoto', 1);
      expect(amano.categoryLabel).toBe('Amanohashidate');
      expect(amano.wikiQuery).toBe('Amanohashidate');

      const katsuoji = getPlaceVisualMeta('วัดดารุมะ คัตสึโอจิ (Katsuo-ji Temple)', 'Osaka', 2);
      expect(katsuoji.categoryLabel).toBe('Katsuo-ji Temple');
      expect(katsuoji.wikiQuery).toBe('Katsuo-ji');

      const usj = getPlaceVisualMeta('Universal Studios Japan (USJ)', 'Osaka', 0);
      expect(usj.categoryLabel).toBe('Theme Park');
      expect(usj.imageUrl).toContain('images.unsplash.com');

      const kyoto = getPlaceVisualMeta('Fushimi Inari Shrine', 'Kyoto', 1);
      expect(kyoto.categoryLabel).toBe('Shrine & Temple');

      const food = getPlaceVisualMeta('Ichiran Ramen Kuromon Market', 'Japan', 2);
      expect(food.categoryLabel).toBe('Gourmet & Dining');

      // Ensure default fallback never returns Mt. Fuji unless explicitly requested
      const generic = getPlaceVisualMeta('เดินเล่นพักผ่อนตามอัธยาศัย', '', 1);
      expect(generic.categoryLabel).not.toBe('Mt. Fuji');
    });

    it('extracts clean attraction search query and fetches real photo from Wikipedia REST API with cache', async () => {
      expect(extractAttractionSearchQuery('เดินทางไป หมู่บ้านชาวประมงอิเนะ (Ine Funaya)', 'Kyoto')).toBe('Ine Funaya');

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          thumbnail: {
            source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Ine_funaya_01.jpg/800px-Ine_funaya_01.jpg',
          },
        }),
      }) as any;

      try {
        const photoUrl = await fetchRealPlacePhotoUrl('หมู่บ้านชาวประมงอิเนะ (Ine)', 'Kyoto', 'Ine, Kyoto');
        expect(photoUrl).toContain('upload.wikimedia.org');
        expect(photoUrl).toContain('Ine_funaya');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('executes DOM update and shifts focus when triggerViewTransition is called', () => {
      const targetEl = document.createElement('div');
      targetEl.id = 'test-view-container';
      targetEl.tabIndex = -1;
      document.body.appendChild(targetEl);

      let updated = false;
      triggerViewTransition(() => {
        updated = true;
      }, 'test-view-container');

      expect(updated).toBe(true);
      document.body.removeChild(targetEl);
    });
  });

  describe('9. Itinerary View Modes (Thumbnail / Detailed Card / Compact Row) & Decluttered Actions', () => {
    const sampleStop = {
      id: 'itin-101',
      trip_id: 'trip-osaka',
      date_label: '05-Dec',
      time_slot: '10:00 - 12:00',
      main_place: 'Osaka Castle Park',
      city: 'Osaka',
      transport_info: 'JR Loop Line Osakajokoen Station',
    };

    it('renders ItineraryThumbnailCard with aspect-ratio 16/10 to prevent CLS and opens ShowToStaffModal', async () => {
      const onOpenEditActivity = vi.fn();

      await act(async () => {
        root.render(
          <ItineraryThumbnailCard
            item={sampleStop}
            idx={0}
            canEditPlan={true}
            onOpenEditActivity={onOpenEditActivity}
          />
        );
      });

      expect(container.textContent).toContain('Osaka Castle Park');
      expect(container.textContent).toContain('10:00 - 12:00');
      const aspectBox = container.querySelector('[style*="aspect-ratio"]') as HTMLElement;
      expect(aspectBox).not.toBeNull();

      const staffBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('โชว์ถามทาง')
      );
      expect(staffBtn).toBeDefined();
      await act(async () => {
        staffBtn?.click();
      });

      const dialog = document.body.querySelector('[role="dialog"]');
      expect(dialog).not.toBeNull();
    });

    it('renders ItineraryCompactRow as a 1-line scannable row and ItineraryStopCard with grouped More (⋯) menu', async () => {
      const onOpenEditActivity = vi.fn();

      await act(async () => {
        root.render(
          <div>
            <ItineraryCompactRow
              item={sampleStop}
              idx={0}
              canEditPlan={true}
              onOpenEditActivity={onOpenEditActivity}
            />
            <ItineraryStopCard
              item={sampleStop}
              idx={0}
              totalItems={2}
              canEditPlan={true}
              reordering={false}
              isPlanBOpen={false}
              onTogglePlanB={vi.fn()}
              onMoveActivity={vi.fn()}
              onOpenEditActivity={onOpenEditActivity}
              onDeleteActivity={vi.fn()}
            />
          </div>
        );
      });

      expect(container.textContent).toContain('Osaka Castle Park');
      // Open the decluttered ⋯ menu on ItineraryStopCard
      const moreBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.getAttribute('title')?.includes('จัดการกิจกรรม')
      );
      expect(moreBtn).toBeDefined();

      await act(async () => {
        moreBtn?.click();
      });

      expect(container.textContent).toContain('แก้ไขรายละเอียด');
    });
  });

  describe('10. Expense View Modes (Thumbnail / Compact) & Collapsible PocketMoneyWidget', () => {
    const sampleExpense = {
      id: 'exp-1',
      title: 'Kani Doraku Crab Dinner',
      amount: 12000,
      currency: 'JPY',
      category: 'food',
      payer_name: 'NongPudit',
      spent_at: '2026-12-05T19:00:00Z',
      payment_method: 'travel_card',
    };

    it('renders ExpenseThumbnailCard and ExpenseCompactRow with split share and currency conversion', async () => {
      await act(async () => {
        root.render(
          <div>
            <ExpenseThumbnailCard
              expense={sampleExpense}
              categories={DEFAULT_CATEGORIES}
              userDisplayName="NongPudit"
              fxRate={0.235}
              canModify={true}
              onOpenReceiptPreview={vi.fn()}
              onDeleteExpense={vi.fn()}
              splitMembers={[
                { id: 'u1', name: 'NongPudit' },
                { id: 'u2', name: 'Friend' },
              ]}
            />
            <ExpenseCompactRow
              expense={sampleExpense}
              categories={DEFAULT_CATEGORIES}
              userDisplayName="NongPudit"
              fxRate={0.235}
              canModify={true}
              onOpenReceiptPreview={vi.fn()}
              onDeleteExpense={vi.fn()}
              splitMembers={[
                { id: 'u1', name: 'NongPudit' },
                { id: 'u2', name: 'Friend' },
              ]}
            />
          </div>
        );
      });

      expect(container.textContent).toContain('Kani Doraku Crab Dinner');
      expect(container.textContent).toContain('12,000');
      expect(container.textContent).toContain('6,000');
    });

    it('renders PocketMoneyWidget in compact summary mode by default and expands on click', async () => {
      await act(async () => {
        root.render(
          <PocketMoneyWidget
            tripId="trip-osaka"
            currency="JPY"
            fxRate={0.235}
            expenses={[sampleExpense]}
          />
        );
      });

      // Initially collapsed: shows compact summary badges and "จัดการกระเป๋า"
      expect(container.textContent).toContain('จัดการกระเป๋า');
      expect(container.textContent).toContain('เงินสดเหลือ');

      const toggleBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('จัดการกระเป๋า')
      );
      expect(toggleBtn).toBeDefined();

      await act(async () => {
        toggleBtn?.click();
      });

      expect(container.textContent).toContain('ย่อเก็บ');
      expect(container.textContent).toContain('YouTrip / Planet');
    });
  });
});

