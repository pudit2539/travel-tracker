// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';

import {
  inferExpenseCategoryFromStop,
  resolveStopExpenseDate,
  buildQuickExpensePrefillFromStop,
  computeDaySummaries,
  pickRecommendedFocusDay,
} from '@/lib/quickStopExpense';
import { TripToolsSheet } from '@/components/trip-detail/TripToolsSheet';
import { ItineraryStopCard } from '@/components/trip-detail/ItineraryStopCard';
import { TripPlanTab } from '@/components/trip-tabs/TripPlanTab';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => React.createElement('a', { href, ...props }, children),
}));

vi.mock('@/lib/confetti', () => ({
  triggerConfetti: vi.fn(),
}));

describe('Package A: On-Trip Focus Mode, Tools Sheet, 1-Tap Stop Expense & Smart Day Pills', () => {
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

  describe('1. Quick Stop Expense Prefill & Smart Day Summary Helpers', () => {
    it('infers accurate expense categories from Japanese/Thai itinerary stop metadata', () => {
      expect(inferExpenseCategoryFromStop({ main_place: 'Ichiran Ramen Dotonbori' })).toBe('food');
      expect(inferExpenseCategoryFromStop({ main_place: 'Universal Studios Japan (USJ)' })).toBe('ticket');
      expect(inferExpenseCategoryFromStop({ main_place: 'Rinku Premium Outlets ช้อปปิ้ง' })).toBe('shopping');
      expect(inferExpenseCategoryFromStop({ main_place: 'นั่งรถไฟ Shinkansen ไปเกียวโต' })).toBe('transport');
      expect(inferExpenseCategoryFromStop({ main_place: 'เช็คอินโรงแรม Hotel Musse Kyoto' })).toBe('hotel');
      expect(inferExpenseCategoryFromStop({ main_place: 'สนามบินคันไซ (KIX)' })).toBe('flight');
    });

    it('resolves Thai & English date labels into ISO dates anchored to trip start year', () => {
      expect(resolveStopExpenseDate('6 ธ.ค.', '2026-12-04')).toBe('2026-12-06');
      expect(resolveStopExpenseDate('Day 2 (15-Dec)', '2026-12-04')).toBe('2026-12-15');
      expect(resolveStopExpenseDate('2027-01-08', '2026-12-04')).toBe('2027-01-08');
    });

    it('builds prefill payload with clean stop title, inferred category, currency, and date', () => {
      const prefill = buildQuickExpensePrefillFromStop(
        {
          main_place: 'Kiyomizu-dera Temple วัดน้ำใส',
          date_label: '6 ธ.ค.',
        },
        'jpy',
        '2026-12-04'
      );
      expect(prefill.title).toBe('Kiyomizu-dera Temple วัดน้ำใส');
      expect(prefill.category).toBe('ticket');
      expect(prefill.currency).toBe('JPY');
      expect(prefill.spent_at).toBe('2026-12-06');
    });

    it('computes Smart Day summaries and picks the first incomplete day for Focus Mode', () => {
      const days = ['4 ธ.ค.', '5 ธ.ค.', '6 ธ.ค.'];
      const itinerary = [
        { id: 's1', date_label: '4 ธ.ค.', city: 'Osaka (Namba)', main_place: 'Dotonbori' },
        { id: 's2', date_label: '5 ธ.ค.', city: 'Kyoto (Higashiyama)', main_place: 'Kiyomizu' },
        { id: 's3', date_label: '5 ธ.ค.', city: 'Kyoto (Gion)', main_place: 'Gion' },
        { id: 's4', date_label: '6 ธ.ค.', city: 'Nara', main_place: 'Todai-ji' },
      ];
      const visited = { s1: true, s2: true };

      const summaries = computeDaySummaries(days, itinerary, visited);
      expect(summaries[0]).toMatchObject({ day: '4 ธ.ค.', primaryCity: 'Osaka', visitedStops: 1, totalStops: 1, progressPct: 100, isComplete: true });
      expect(summaries[1]).toMatchObject({ day: '5 ธ.ค.', primaryCity: 'Kyoto', visitedStops: 1, totalStops: 2, progressPct: 50, isComplete: false });
      expect(summaries[2]).toMatchObject({ day: '6 ธ.ค.', primaryCity: 'Nara', visitedStops: 0, totalStops: 1, progressPct: 0, isComplete: false });

      expect(pickRecommendedFocusDay(summaries)).toBe('5 ธ.ค.');
    });
  });

  describe('2. TripToolsSheet (Categorized Bottom Sheet via ModalPortal)', () => {
    it('mounts into document.body with 3 organized tool categories and executes & closes on tile tap', async () => {
      const onClose = vi.fn();
      const onOpenPacking = vi.fn();
      const onOpenDiningDecision = vi.fn();

      await act(async () => {
        root.render(
          <TripToolsSheet
            isOpen={true}
            onClose={onClose}
            staysCount={3}
            shoppingBoughtCount={2}
            shoppingTotalCount={5}
            canSeeMoney={true}
            spentSummaryText="¥42,000"
            showFlights={false}
            showHotels={false}
            showBudget={false}
            showWeather={false}
            onToggleFlights={vi.fn()}
            onToggleHotels={vi.fn()}
            onToggleBudget={vi.fn()}
            onToggleWeather={vi.fn()}
            onOpenTicketLocker={vi.fn()}
            onOpenGourmetRadar={vi.fn()}
            onOpenDiningDecision={onOpenDiningDecision}
            onOpenShoppingBag={vi.fn()}
            onOpenWishlist={vi.fn()}
            onOpenPacking={onOpenPacking}
            onOpenScrapbook={vi.fn()}
            onOpenAIAssistant={vi.fn()}
            onOpenTravelHub={vi.fn()}
            onOpenPrintable={vi.fn()}
          />
        );
      });

      expect(container.querySelector('[role="dialog"]')).toBeNull();
      const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement;
      expect(dialog).not.toBeNull();
      expect(dialog.className).toContain('overflow-y-auto');
      expect(dialog.className).toContain('modal-safe-overlay');
      expect(dialog.innerHTML).toContain('env(safe-area-inset-bottom)');
      expect(dialog.textContent).toContain('เอกสาร & การเดินทาง');
      expect(dialog.textContent).toContain('ของกิน & ช้อปปิ้ง');
      expect(dialog.textContent).toContain('วางแผน & ความทรงจำ');

      const packingBtn = Array.from(dialog.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('จัดกระเป๋า')
      );
      expect(packingBtn).toBeDefined();
      await act(async () => {
        packingBtn?.click();
      });
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onOpenPacking).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. ItineraryStopCard 1-Tap Expense & Focus Mode Cleanup', () => {
    it('renders 1-tap จดจ่ายจุดนี้ CTA and hides admin edit menu in Focus Mode', async () => {
      const onLogExpenseForStop = vi.fn();
      const stop = {
        id: 'stop-ux-1',
        trip_id: 'trip-ux-1',
        date_label: '6 ธ.ค.',
        time_slot: '12:00',
        city: 'Kyoto',
        main_place: 'Kiyomizu-dera Temple',
        transport_info: 'Bus 206',
        food_recommendation: '% Arabica Kyoto',
      };

      await act(async () => {
        root.render(
          <ItineraryStopCard
            item={stop}
            idx={0}
            totalItems={2}
            canEditPlan={true}
            reordering={false}
            isPlanBOpen={false}
            onTogglePlanB={vi.fn()}
            onMoveActivity={vi.fn()}
            onOpenEditActivity={vi.fn()}
            onDeleteActivity={vi.fn()}
            onLogExpenseForStop={onLogExpenseForStop}
            focusMode={true}
          />
        );
      });

      // Admin menu button should be hidden in focus mode
      expect(container.querySelector('button[aria-label="ตัวเลือกเพิ่มเติม"]')).toBeNull();

      // 1-tap quick expense button should be visible & invoke callback with the stop
      const expenseBtn = container.querySelector('button[aria-label="จดรายจ่ายจุดนี้"]') as HTMLButtonElement;
      expect(expenseBtn).not.toBeNull();
      await act(async () => {
        expenseBtn.click();
      });
      expect(onLogExpenseForStop).toHaveBeenCalledWith(stop);
    });
  });

  describe('4. TripPlanTab Integration: Tools Sheet, Focus Mode & Smart Sticky Day Pills', () => {
    it('declutters top tray, renders Smart Day Pills with city/progress, and toggles On-Trip Focus Mode', async () => {
      const setSelectedDayFilter = vi.fn();
      const itinerary = [
        { id: 'st-1', trip_id: 'trip-a', date_label: '4 ธ.ค.', time_slot: '10:00', city: 'Osaka (Namba)', main_place: 'Dotonbori' },
        { id: 'st-2', trip_id: 'trip-a', date_label: '5 ธ.ค.', time_slot: '09:00', city: 'Kyoto (Higashiyama)', main_place: 'Kiyomizu-dera' },
      ];

      await act(async () => {
        root.render(
          <TripPlanTab
            trip={{ id: 'trip-a', name: 'Osaka Kyoto', start_date: '2026-12-04', end_date: '2026-12-06', currency: 'JPY' }}
            tripBaseCurrency="JPY"
            fxRate={0.23}
            heroDisplayData={{
              title: 'รวมทั้งทริป',
              spent: 15000,
              targetBudget: 50000,
              remaining: 35000,
              isOver: false,
              diff: 0,
              progress: 30,
              budgetLabel: 'งบทั้งหมด',
            }}
            itinerary={itinerary}
            filteredItinerary={itinerary}
            availableDays={['4 ธ.ค.', '5 ธ.ค.']}
            selectedDayFilter="all"
            setSelectedDayFilter={setSelectedDayFilter}
            itineraryViewMode="list"
            setItineraryViewMode={vi.fn()}
            showWeatherSection={false}
            setShowWeatherSection={vi.fn()}
            setShowTravelHubModal={vi.fn()}
            setShowPrintableModal={vi.fn()}
            canImportExcel={true}
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
            onOpenTicketLocker={vi.fn()}
            onOpenGourmetRadar={vi.fn()}
            onOpenDiningDecision={vi.fn()}
            onOpenPacking={vi.fn()}
            onOpenScrapbook={vi.fn()}
            onOpenAIAssistant={vi.fn()}
            onLogExpenseForStop={vi.fn()}
          />
        );
      });

      // Sticky Smart Day Bar shows city & progress counter
      const dayBar = container.querySelector('#itinerary-day-bar') as HTMLElement;
      expect(dayBar).not.toBeNull();
      expect(dayBar.className).toContain('sticky');
      expect(dayBar.textContent).toContain('D1');
      expect(dayBar.textContent).toContain('Osaka');
      expect(dayBar.textContent).toContain('0/1');
      expect(dayBar.textContent).toContain('Kyoto');

      // Planning controls visible before Focus Mode
      expect(container.textContent).toContain('เพิ่มกิจกรรม');

      // Opening Tools Sheet via single clean trigger button
      const toolsBtn = container.querySelector('button[aria-label="เปิดศูนย์รวมเครื่องมือทริปทั้งหมด"]') as HTMLButtonElement;
      expect(toolsBtn).not.toBeNull();
      await act(async () => {
        toolsBtn.click();
      });
      expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain('เครื่องมือทริปทั้งหมด');
      // Close tools sheet
      const closeToolsBtn = document.body.querySelector('button[aria-label="ปิดหน้าต่างเครื่องมือ"]') as HTMLButtonElement;
      await act(async () => {
        closeToolsBtn?.click();
      });

      // Toggle On-Trip Focus Mode
      const focusBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.getAttribute('aria-pressed') !== null
      ) as HTMLButtonElement;
      expect(focusBtn).toBeDefined();
      await act(async () => {
        focusBtn.click();
      });

      // Heavy planning controls hidden & On-Trip Focus banner displayed & auto-picked day
      expect(container.textContent).toContain('โหมดลุยหน้างาน');
      expect(container.textContent).not.toContain('เพิ่มกิจกรรม');
      expect(setSelectedDayFilter).toHaveBeenCalledWith('4 ธ.ค.');
    });
  });
});
