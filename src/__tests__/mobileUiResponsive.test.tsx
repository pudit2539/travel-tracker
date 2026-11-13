// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import fs from 'node:fs';
import path from 'node:path';

import { TripHeroCover } from '@/components/trip-detail/TripHeroCover';
import {
  ItineraryStopCard,
  ItineraryThumbnailCard,
  ItineraryCompactRow,
} from '@/components/trip-detail/ItineraryStopCard';
import { ExpenseThumbnailCard } from '@/components/trip-detail/ExpenseCard';
import LiveTripCard from '@/components/LiveTripCard';
import CurrencyPillSwitcher from '@/components/CurrencyPillSwitcher';
import PocketMoneyWidget from '@/components/PocketMoneyWidget';
import { CustomPlacePhotoModal } from '@/components/trip-detail/CustomPlacePhotoModal';
import SuperAdminModal from '@/components/SuperAdminModal';
import { FlightBoardingPassCard } from '@/components/trip-detail/FlightBoardingPassCard';
import AIAssistantModal from '@/components/AIAssistantModal';
import PackingChecklistModal from '@/components/PackingChecklistModal';
import VersionRollbackModal from '@/components/VersionRollbackModal';
import { DEFAULT_CATEGORIES } from '@/lib/categories';
import { SUPER_ADMIN_EMAILS } from '@/lib/permissions';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => React.createElement('a', { href, ...props }, children),
}));

vi.mock('@/lib/confetti', () => ({
  triggerConfetti: vi.fn(),
}));

vi.mock('@/lib/supabase', () => {
  const chain: any = {
    select: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => Promise.resolve({ data: [] })),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
  };
  const channelMock = {
    on: vi.fn(() => channelMock),
    subscribe: vi.fn(() => channelMock),
  };
  return {
    supabase: {
      from: vi.fn(() => chain),
      channel: vi.fn(() => channelMock),
      removeChannel: vi.fn(),
    },
  };
});

vi.mock('@/lib/flights', () => ({
  getFlights: vi.fn().mockReturnValue([
    {
      id: 'fl-1',
      tripId: 'trip-mob-1',
      direction: 'outbound',
      airline: 'ZIPAIR Tokyo',
      flightNumber: 'ZG 52',
      originCode: 'BKK',
      originCity: 'Bangkok',
      destinationCode: 'KIX',
      destinationCity: 'Osaka',
      departureDate: '2026-12-04',
      departureTime: '00:55',
      arrivalTime: '08:25',
      terminal: '1',
      gate: 'D4',
      seat: '24K',
      bookingRef: 'ABC123',
      paymentStatus: 'paid',
    },
  ]),
  addOrUpdateFlight: vi.fn().mockResolvedValue(true),
  deleteFlight: vi.fn().mockResolvedValue(true),
  toggleFlightPaymentStatus: vi.fn().mockResolvedValue(true),
}));

const LONG_THAI_STOP_TITLE =
  'เดินเล่นย่านบ้านไม้โบราณ Saga Toriimoto Preserved Street & วัดรูปปั้นหินมอสเขียว Otagi Nenbutsu-ji (อาราชิยามะโซนลึก เงียบสงบ ไม่แวะป่าไผ่)';

describe('Comprehensive Mobile UI & Responsive Regression Suite', () => {
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
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        photos: [
          { url: 'https://example.com/p1.jpg', placeName: 'Angle 1' },
          { url: 'https://example.com/p2.jpg', placeName: 'Angle 2' },
          { url: 'https://example.com/p3.jpg', placeName: 'Angle 3' },
        ],
      }),
    }) as any;
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
    document.body.querySelectorAll('[role="dialog"]').forEach((d) => d.parentNode?.removeChild(d));
    document.body.style.overflow = '';
    vi.clearAllMocks();
  });

  describe('1. Editorial Split Cards (Zero Image-Over-Text Collisions on Mobile)', () => {
    it('TripHeroCover keeps background image in absolute inset-0 layer and places long title below photo border', async () => {
      const longTripName = 'Osaka - Kyoto - Arashiyama - Nara - Uji Winter Adventure Grand Tour 2026';
      await act(async () => {
        root.render(
          <TripHeroCover
            trip={{
              id: 'trip-1',
              name: longTripName,
              destination: 'Osaka & Kyoto, Japan',
              start_date: '2026-12-04',
              end_date: '2026-12-15',
            }}
            itineraryCount={51}
            totalSpent={64253}
            currency="THB"
            showBudget={true}
          />
        );
      });

      const img = container.querySelector('img') as HTMLImageElement;
      expect(img).not.toBeNull();
      // Critical regression guard: cover img must stay inside absolute inset-0 layer so top badges are never pushed off-screen
      expect(img.parentElement?.className).toContain('absolute');
      expect(img.parentElement?.className).toContain('inset-0');

      const heading = container.querySelector('h1') as HTMLElement;
      expect(heading).not.toBeNull();
      expect(heading.textContent).toBe(longTripName);
      expect(heading.className).toContain('break-words');
      expect(heading.className).not.toContain('truncate');

      // Top pills live inside the photo banner while heading lives outside it in the editorial title bar
      const topTag = Array.from(container.querySelectorAll('span')).find((s) =>
        s.textContent?.includes('Osaka & Kyoto, Japan')
      );
      expect(topTag).toBeDefined();
      const bannerEl = img.parentElement?.parentElement;
      expect(bannerEl?.contains(topTag!)).toBe(true);
      expect(bannerEl?.contains(heading)).toBe(false);
    });

    it('ItineraryStopCard places long place titles in the solid card body below the hero media strip and keeps admin menu unclipped', async () => {
      const stop = {
        id: 'stop-10',
        trip_id: 'trip-1',
        main_place: LONG_THAI_STOP_TITLE,
        city: 'Kyoto (Saga Toriimoto)',
        date_label: '6 ธ.ค.',
        time_slot: '15:00 - 16:45 น.',
        transport_info: 'Taxi จากโซนสะพาน Togetsukyo | แตะ ICOCA',
        food_recommendation: 'Hirano-ya (ร้านน้ำชาอายุ 400 ปี)',
        indoor_friendly: true,
        locker_available: true,
        accessible_restrooms: true,
      };

      await act(async () => {
        root.render(
          <ItineraryStopCard
            item={stop}
            idx={9}
            totalItems={20}
            canEditPlan={true}
            isPlanBOpen={false}
            reordering={false}
            onTogglePlanB={vi.fn()}
            onMoveActivity={vi.fn()}
            onOpenEditActivity={vi.fn()}
            onDeleteActivity={vi.fn()}
          />
        );
      });

      const titleLink = Array.from(container.querySelectorAll('a')).find((a) =>
        a.textContent?.includes('Otagi Nenbutsu-ji')
      ) as HTMLAnchorElement;
      expect(titleLink).toBeDefined();
      expect(titleLink.className).toContain('break-words');

      // Title link must NOT reside inside the photo hero strip alongside STOP 10 badge
      const stopBadge = Array.from(container.querySelectorAll('span')).find((s) =>
        s.textContent?.includes('STOP 10')
      );
      expect(stopBadge).toBeDefined();
      const mediaStrip = stopBadge?.closest('div.cursor-zoom-in');
      expect(mediaStrip).not.toBeNull();
      expect(mediaStrip?.contains(titleLink)).toBe(false);
      // Media backdrop must not trap dropdown controls inside overflow-hidden on outer hero header
      expect(mediaStrip?.className).not.toContain('overflow-hidden');

      // Open More (⋯) admin menu and verify dropdown renders without clipping ancestor
      const moreBtn = container.querySelector('button[aria-label="ตัวเลือกเพิ่มเติม"]') as HTMLButtonElement;
      expect(moreBtn).not.toBeNull();
      await act(async () => {
        moreBtn.click();
      });
      expect(container.textContent).toContain('เลื่อนขึ้น');
    });

    it('ItineraryThumbnailCard and ItineraryCompactRow avoid mobile overlay collisions and keep CLS aspect ratio', async () => {
      const stop = {
        id: 'stop-2',
        trip_id: 'trip-1',
        main_place: LONG_THAI_STOP_TITLE,
        city: 'Uji',
        date_label: '7 ธ.ค.',
        time_slot: '08:00 น.',
      };

      await act(async () => {
        root.render(
          <ItineraryThumbnailCard
            item={stop}
            idx={1}
            canEditPlan={true}
            onOpenEditActivity={vi.fn()}
          />
        );
      });

      const aspectBox = container.querySelector('[style*="aspect-ratio"]') as HTMLElement;
      expect(aspectBox).not.toBeNull();
      const titleLink = Array.from(container.querySelectorAll('a')).find((a) =>
        a.textContent?.includes('Saga Toriimoto')
      );
      expect(titleLink).toBeDefined();
      expect(aspectBox.contains(titleLink!)).toBe(false);

      await act(async () => {
        root.render(
          <ItineraryCompactRow
            item={stop}
            idx={1}
            canEditPlan={true}
            onOpenEditActivity={vi.fn()}
          />
        );
      });

      const row = container.firstElementChild as HTMLElement;
      expect(row.className).toContain('flex-col');
      expect(row.className).toContain('sm:flex-row');
    });

    it('ExpenseThumbnailCard keeps title and split pill below receipt image banner', async () => {
      const expense = {
        id: 'exp-mob-1',
        trip_id: 'trip-1',
        title: 'มื้อเย็นเนื้อวากิวย่างถ่านพรีเมียม Shinsaibashi Yakiniku',
        amount: 14800,
        currency: 'JPY',
        category: 'food',
        payer_id: 'u1',
        payer_name: 'Mint',
        spent_at: '2026-12-05',
        receipt_url: 'https://example.com/receipt.jpg',
      };

      await act(async () => {
        root.render(
          <ExpenseThumbnailCard
            expense={expense}
            categories={DEFAULT_CATEGORIES}
            userDisplayName="Mint"
            fxRate={0.23}
            canModify={true}
            onOpenReceiptPreview={vi.fn()}
            onDeleteExpense={vi.fn()}
            splitMembers={[
              { id: 'u1', name: 'Mint' },
              { id: 'u2', name: 'Ball' },
            ]}
          />
        );
      });

      const img = container.querySelector('img') as HTMLImageElement;
      expect(img).not.toBeNull();
      expect(img.parentElement?.className).toContain('absolute');
      expect(img.parentElement?.className).toContain('inset-0');

      const heading = container.querySelector('h4') as HTMLElement;
      expect(heading).not.toBeNull();
      expect(heading.textContent).toContain('Shinsaibashi Yakiniku');
      expect(heading.className).toContain('break-words');
      const mediaBanner = img.parentElement?.parentElement;
      expect(mediaBanner?.contains(heading)).toBe(false);
      expect(container.textContent).toContain('หาร ≈');
    });
  });

  describe('2. LiveTripCard & Mobile Chrome Safety', () => {
    it('LiveTripCard renders Japanese Osaka Kuidaore text without Cyrillic typo and keeps avatar tag in normal flow', async () => {
      await act(async () => {
        root.render(
          <LiveTripCard
            trip={{ id: 'trip-osaka', currency: 'JPY', start_date: '2026-12-04', end_date: '2026-12-15' }}
            itinerary={[
              { id: 's1', main_place: 'Dotonbori Glico Sign', city: 'Osaka', date_label: '4 ธ.ค.', time_slot: '18:00 น.' },
            ]}
            availableDays={['4 ธ.ค.']}
            selectedDay="4 ธ.ค."
          />
        );
      });

      expect(container.textContent).toContain('くいだおれ');
      expect(container.textContent).not.toContain('Куいだおれ');

      // Chibi outfit pill must be normal flow below SVG, never absolute -bottom-2 overlapping SVG head
      const absBottom = container.querySelector('.\\-bottom-2');
      expect(absBottom).toBeNull();

      // Mobile GPS/companion action buttons grid collapses to 2 cols on mobile
      const actionGrid = Array.from(container.querySelectorAll('div')).find((d) =>
        d.className.includes('grid-cols-2') && d.className.includes('sm:grid-cols-3')
      );
      expect(actionGrid).toBeDefined();
    });

    it('CurrencyPillSwitcher applies safe-area mobile clearance, compact sizing, and scroll-hide transitions', async () => {
      await act(async () => {
        root.render(
          <CurrencyPillSwitcher
            primaryCurrency="JPY"
            activeView="foreign"
            onToggle={vi.fn()}
            fxRate={0.23}
            onOpenCalculator={vi.fn()}
            hiddenOnScroll={true}
          />
        );
      });

      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper.className).toContain('env(safe-area-inset-bottom');
      expect(wrapper.className).toContain('translate-y-16');
      expect(wrapper.className).toContain('opacity-0');
      expect(wrapper.className).toContain('pointer-events-none');
      expect(wrapper.firstElementChild?.className).toContain('p-0.5');
      expect(wrapper.firstElementChild?.className).toContain('sm:p-1');
    });
  });

  describe('3. Hardened Mobile Modals, Forms & Grids', () => {
    it('PocketMoneyWidget Add Cash & Travel Card modals mount via Portal with dvh cap, safe-area inset, and >=16px inputs', async () => {
      await act(async () => {
        root.render(
          <PocketMoneyWidget tripId="trip-pm-1" currency="JPY" fxRate={0.23} expenses={[]} />
        );
      });

      // Expand compact widget first
      const toggleBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('กระเป๋าเงิน') || b.textContent?.includes('จัดการกระเป๋า')
      );
      expect(toggleBtn).toBeDefined();
      await act(async () => {
        toggleBtn?.click();
      });

      const addCashBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('กดตู้ ATM')
      );
      expect(addCashBtn).toBeDefined();
      await act(async () => {
        addCashBtn?.click();
      });

      const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement;
      expect(dialog).not.toBeNull();
      expect(dialog.className).toContain('items-start');
      expect(dialog.className).toContain('overflow-y-auto');
      expect(dialog.className).toContain('overscroll-contain');

      const panel = dialog.firstElementChild as HTMLElement;
      expect(panel.className).toContain('max-h-[90dvh]');
      expect(panel.className).toContain('env(safe-area-inset-bottom)');
      const numInput = panel.querySelector('input[type="number"]') as HTMLInputElement;
      expect(numInput.className).toContain('text-lg');
      const submitBtn = panel.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(submitBtn.className).toContain('min-h-[44px]');
    });

    it('CustomPlacePhotoModal uses min-w-0 flex search input and grid-cols-3 sm:grid-cols-5 for photo candidates', async () => {
      await act(async () => {
        root.render(
          <CustomPlacePhotoModal
            isOpen={true}
            onClose={vi.fn()}
            placeName="Kiyomizu-dera Temple"
            city="Kyoto"
            currentAutoImageUrl="https://example.com/cur.jpg"
          />
        );
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement;
      expect(dialog).not.toBeNull();

      const searchInput = dialog.querySelector('input[type="text"]') as HTMLInputElement;
      expect(searchInput.className).toContain('min-w-0');
      expect(searchInput.className).toContain('text-base');

      const candidatesGrid = Array.from(dialog.querySelectorAll('div')).find((d) =>
        d.className.includes('grid-cols-3') && d.className.includes('sm:grid-cols-5')
      );
      expect(candidatesGrid).toBeDefined();
    });

    it('SuperAdminModal mounts via Portal with 2-col mobile / 4-col desktop stats grid', async () => {
      await act(async () => {
        root.render(
          <SuperAdminModal
            isOpen={true}
            onClose={vi.fn()}
            currentUser={{ id: 'admin-1', email: SUPER_ADMIN_EMAILS[0] }}
            currentProfile={{ email: SUPER_ADMIN_EMAILS[0] }}
          />
        );
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement;
      expect(dialog).not.toBeNull();
      expect(dialog.className).toContain('overflow-y-auto');
      expect(dialog.className).toContain('items-start');

      const statsBar = Array.from(dialog.querySelectorAll('div')).find((d) =>
        d.className.includes('grid-cols-2') && d.className.includes('sm:grid-cols-4')
      );
      expect(statsBar).toBeDefined();
    });

    it('FlightBoardingPassCard stacks flight metadata grid 2x2 and edit modal fields 1-col cleanly on mobile', async () => {
      await act(async () => {
        root.render(
          <FlightBoardingPassCard
            tripId="trip-mob-1"
            defaultDestination="Osaka"
            tripCurrency="THB"
            defaultOpen={true}
          />
        );
      });
      await act(async () => {
        await Promise.resolve();
      });

      const metaGrid = Array.from(container.querySelectorAll('div')).find((d) =>
        d.className.includes('grid-cols-2') && d.className.includes('sm:grid-cols-4')
      );
      expect(metaGrid).toBeDefined();

      const addFlightBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('เพิ่มเที่ยวบิน')
      );
      expect(addFlightBtn).toBeDefined();
      await act(async () => {
        addFlightBtn?.click();
      });

      const form = document.body.querySelector('form');
      expect(form).not.toBeNull();
      const terminalGrid = Array.from(form!.querySelectorAll('div')).find((d) =>
        d.className.includes('grid-cols-1') && d.className.includes('sm:grid-cols-3')
      );
      expect(terminalGrid).toBeDefined();

      // Booking reference spans must allow mobile long-press selection
      const refSpan = Array.from(container.querySelectorAll('span')).find((s) =>
        s.textContent?.includes('ABC123')
      );
      expect(refSpan?.className).toContain('selectable-text');
    });

    it('secondary modals (AIAssistantModal, PackingChecklistModal, VersionRollbackModal) portal to document.body with safe-area footers and >=16px inputs', async () => {
      // 1. AIAssistantModal
      await act(async () => {
        root.render(<AIAssistantModal isOpen={true} onClose={vi.fn()} currentCity="Kyoto" />);
      });
      expect(container.querySelector('[role="dialog"]')).toBeNull();
      let dialog = document.body.querySelector('[role="dialog"]') as HTMLElement;
      expect(dialog).not.toBeNull();
      expect(dialog.className).toContain('overflow-y-auto');
      expect(dialog.className).toContain('modal-safe-overlay');
      expect(dialog.innerHTML).toContain('env(safe-area-inset-bottom)');
      const aiInputs = Array.from(dialog.querySelectorAll('input[type="text"]')) as HTMLInputElement[];
      expect(aiInputs.length).toBeGreaterThanOrEqual(2);
      aiInputs.forEach((inp) => expect(inp.className).toContain('text-base'));

      // 2. PackingChecklistModal
      await act(async () => {
        root.render(
          <PackingChecklistModal
            isOpen={true}
            onClose={vi.fn()}
            tripId="trip-pack-1"
            tripName="Osaka Winter"
            destinationCity="Osaka"
          />
        );
      });
      expect(container.querySelector('[role="dialog"]')).toBeNull();
      dialog = document.body.querySelector('[role="dialog"]') as HTMLElement;
      expect(dialog).not.toBeNull();
      expect(dialog.className).toContain('overflow-y-auto');
      expect(dialog.innerHTML).toContain('env(safe-area-inset-bottom)');
      const packInput = dialog.querySelector('input[type="text"]') as HTMLInputElement;
      expect(packInput.className).toContain('text-base');
      expect(packInput.className).toContain('min-w-0');

      // 3. VersionRollbackModal
      await act(async () => {
        root.render(
          <VersionRollbackModal
            isOpen={true}
            onClose={vi.fn()}
            tripId="trip-ver-1"
            trip={{ id: 'trip-ver-1', name: 'Kyoto' }}
            itinerary={[]}
            expenses={[]}
            categories={DEFAULT_CATEGORIES}
            categoryBudgets={{}}
            onRestored={vi.fn()}
          />
        );
      });
      expect(container.querySelector('[role="dialog"]')).toBeNull();
      dialog = document.body.querySelector('[role="dialog"]') as HTMLElement;
      expect(dialog).not.toBeNull();
      expect(dialog.className).toContain('overflow-y-auto');
      expect(dialog.className).toContain('modal-safe-overlay');
      expect(dialog.firstElementChild?.className).toContain('modal-safe-card');
      expect(dialog.innerHTML).toContain('env(safe-area-inset-bottom)');
    });
  });

  describe('4. Codebase-Wide Mobile CSS & Viewport Hygiene Invariants', () => {
    const readSrc = (relPath: string) => fs.readFileSync(path.join(process.cwd(), relPath), 'utf8');

    it('globals.css enforces horizontal overflow lock, Android/notch-adaptive .safe-top-nav, selectable text, and <640px 16px input floor', () => {
      const css = readSrc('src/app/globals.css');
      expect(css).toContain('overflow-x: hidden');
      expect(css).toContain('.safe-top-nav');
      expect(css).toContain('@media (display-mode: standalone)');
      expect(css).not.toContain('4.75rem');
      expect(css).toContain('.safe-bottom-nav');
      expect(css).toContain('.ios-safe-modal');
      expect(css).toContain('100dvh');
      expect(css).toContain('env(safe-area-inset-bottom');
      expect(css).toContain('.selectable-text');
      expect(css).toContain('user-select: text');
      expect(css).toContain('@media (max-width: 639px)');
      expect(css).toContain('font-size: 16px');
    });

    it('all secondary full-viewport modals use ModalPortal and mobile-safe scrollable overlays', () => {
      const secondaryModals = [
        'src/components/AIAssistantModal.tsx',
        'src/components/DiningDecisionPickerModal.tsx',
        'src/components/GourmetRadarModal.tsx',
        'src/components/PackingChecklistModal.tsx',
        'src/components/PhotoScrapbookModal.tsx',
        'src/components/PrintableItineraryModal.tsx',
        'src/components/ProfileModal.tsx',
        'src/components/QuickCurrencyCalculator.tsx',
        'src/components/TicketPassLockerModal.tsx',
        'src/components/TravelHubModal.tsx',
        'src/components/VersionRollbackModal.tsx',
        'src/components/WishlistDrawer.tsx',
      ];
      for (const file of secondaryModals) {
        const content = readSrc(file);
        expect(content, `${file} should mount through ModalPortal`).toContain('<ModalPortal>');
        expect(content, `${file} should allow vertical backdrop scroll`).toContain('overflow-y-auto');
        expect(content, `${file} should apply modal-safe-overlay`).toContain('modal-safe-overlay');
      }
    });

    it('ItineraryStopCard marks transit & traveler notes with selectable-text for mobile copy/translate', () => {
      const stopCard = readSrc('src/components/trip-detail/ItineraryStopCard.tsx');
      expect(stopCard).toContain('selectable-text');
    });

    it('modals and sheets use dvh instead of legacy vh heights for iOS keyboard & Safari bar safety', () => {
      const checkedFiles = [
        'src/components/trip-detail/HotelVoucherPreviewModal.tsx',
        'src/components/NotificationBell.tsx',
        'src/components/PhotoScrapbookModal.tsx',
        'src/components/TravelHubModal.tsx',
        'src/app/trips/[id]/page.tsx',
      ];
      for (const file of checkedFiles) {
        const content = readSrc(file);
        expect(content, `${file} should avoid max-h-[..vh] / h-[..vh]`).not.toMatch(/\b(?:max-)?h-\[\d+vh\]/);
      }
      const travelHub = readSrc('src/components/TravelHubModal.tsx');
      expect(travelHub).toContain('grid-cols-2 sm:grid-cols-4');
    });

    it('mobile floating chrome is decluttered on <640px and sticky header gives trip title breathing room', () => {
      const tripPage = readSrc('src/app/trips/[id]/page.tsx');
      const tripPlanTab = readSrc('src/components/trip-tabs/TripPlanTab.tsx');

      // Bottom-left floating AI pill only renders on desktop (hidden sm:block) while mobile uses header Bot button
      expect(tripPage).toContain('hidden sm:block fixed bottom-6 left-6');
      expect(tripPage).toContain('sm:hidden w-8 h-8');
      // Inline WiFi/SuperAdmin header badges collapse cleanly on mobile
      expect(tripPage).toContain('hidden sm:inline-flex');
      // Secondary scroll-jump actions stay hidden on narrow screens
      expect(tripPlanTab).toContain('hidden sm:flex');
      expect(tripPlanTab).toContain('flex-wrap items-center justify-end');
    });

    it('no non-existent Tailwind xs: breakpoint utility classes exist in JSX markup', () => {
      const uiRoots = ['src/app', 'src/components'];
      const walk = (dir: string): string[] =>
        fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) return walk(full);
          return full.endsWith('.tsx') ? [full] : [];
        });

      const offenders: string[] = [];
      for (const rootDir of uiRoots) {
        for (const file of walk(path.join(process.cwd(), rootDir))) {
          const content = fs.readFileSync(file, 'utf8');
          // Match Tailwind xs: variant inside JSX class strings while ignoring CatAvatarBadge size prop `xs: '...'`
          if (/["'`\s]xs:[a-z-]/i.test(content) && !file.endsWith('CatAvatarBadge.tsx')) {
            offenders.push(path.relative(process.cwd(), file));
          }
        }
      }
      expect(offenders).toEqual([]);
    });
  });
});
