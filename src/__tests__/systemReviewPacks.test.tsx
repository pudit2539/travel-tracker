// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  checkPlacePhotoRateLimit,
  resetPlacePhotoRateLimiterForTests,
  isAllowedPlacePhotoOrigin,
  GET as placePhotoGET,
} from '@/app/api/place-photo/route';
import {
  checkScanReceiptRateLimit,
  resetScanReceiptRateLimiterForTests,
  isAllowedScanReceiptOrigin,
} from '@/app/api/scan-receipt/route';
import {
  checkAiAssistantRateLimit,
  resetAiAssistantRateLimiterForTests,
  isAllowedAiAssistantOrigin,
} from '@/app/api/ai-assistant/route';
import {
  calculateJapanTaxFree,
  isFxRateLocked,
  setFxRateLocked,
  syncLiveJpyToThb,
  setCustomJpyToThbRate,
} from '@/lib/currency';
import {
  ScanExpenseModal,
  findPotentialDuplicateExpenses,
} from '@/components/trip-detail/modals/ScanExpenseModal';
import { ShareTripModal } from '@/components/trip-detail/modals/ShareTripModal';
import { ItineraryCompactRow } from '@/components/trip-detail/ItineraryStopCard';
import {
  enqueueOfflineExpense,
  getOfflineExpenseQueue,
  resetOfflineMemoryCachesForTests,
} from '@/hooks/useOfflineSync';
import { publishLivePresence } from '@/lib/livePresence';
import { mergeMetadataEntityArray, slimMetadataPayload } from '@/lib/tripMetadata';
import { getCatAvatar } from '@/lib/avatars';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const mockSend = vi.fn().mockResolvedValue('ok');

vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((cb?: (status: string) => void) => {
        cb?.('SUBSCRIBED');
        return {};
      }),
      send: mockSend,
    })),
    removeChannel: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

describe('System Review Packs 1–3 Verification', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    localStorage.clear();
    resetPlacePhotoRateLimiterForTests();
    resetScanReceiptRateLimiterForTests();
    resetAiAssistantRateLimiterForTests();
    resetOfflineMemoryCachesForTests();
    mockSend.mockClear();
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    if (container.parentNode) container.parentNode.removeChild(container);
    document.body.querySelectorAll('[role="dialog"]').forEach((el) => el.parentNode?.removeChild(el));
    document.body.style.overflow = '';
  });

  describe('Pack 1: /api/place-photo Rate Limiter & Cross-Origin Guard + Realtime Presence', () => {
    it('enforces sliding-window rate limits per IP and returns retryAfterSec', () => {
      for (let i = 0; i < 60; i++) {
        const res = checkPlacePhotoRateLimit('203.0.113.42', false);
        expect(res.allowed).toBe(true);
      }
      const blocked = checkPlacePhotoRateLimit('203.0.113.42', false);
      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfterSec).toBeGreaterThan(0);

      // Separate IP remains unaffected
      expect(checkPlacePhotoRateLimit('198.51.100.7', false).allowed).toBe(true);
    });

    it('blocks cross-site Sec-Fetch-Site and untrusted Origin headers on /api/place-photo', async () => {
      const crossSiteReq = new NextRequest('https://app.example.com/api/place-photo?q=Fushimi+Inari', {
        headers: {
          host: 'app.example.com',
          'sec-fetch-site': 'cross-site',
        },
      });
      expect(isAllowedPlacePhotoOrigin(crossSiteReq)).toBe(false);

      const res = await placePhotoGET(crossSiteReq);
      expect(res.status).toBe(403);

      const sameOriginReq = new NextRequest('https://app.example.com/api/place-photo?q=Fushimi+Inari', {
        headers: {
          host: 'app.example.com',
          origin: 'https://app.example.com',
          'sec-fetch-site': 'same-origin',
        },
      });
      expect(isAllowedPlacePhotoOrigin(sameOriginReq)).toBe(true);
    });

    it('publishes live GPS presence via ephemeral Realtime channel without writing to DB', async () => {
      const ok = await publishLivePresence(
        'trip-ephemeral-1',
        {
          privacyLevel: 'district',
          district: 'Kyoto · Arashiyama',
          progressPct: 50,
          updatedAt: new Date().toISOString(),
        },
        { force: true }
      );
      expect(ok).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'broadcast',
          event: 'companion_presence',
        })
      );
    });
  });

  describe('Pack 2: Live FX Lock, 1-Tap Japan Tax-Free, Compact Drag Reorder & Read-Only Share', () => {
    it('calculates Japan 10% standard and 8% snack tax-free net amounts and ¥5,500 threshold', () => {
      const below = calculateJapanTaxFree(3300);
      expect(below.isEligible).toBe(false);
      expect(below.shortfallJpy).toBe(2200);
      expect(below.netAmount10).toBe(3000);

      const eligible = calculateJapanTaxFree(5500);
      expect(eligible.isEligible).toBe(true);
      expect(eligible.shortfallJpy).toBe(0);
      expect(eligible.netAmount10).toBe(5000);
      expect(eligible.savedTax10).toBe(500);
      expect(eligible.netAmount8).toBe(5093);
      expect(eligible.savedTax8).toBe(407);
    });

    it('respects manual FX rate lock during auto-sync and allows forced live refresh with fallback', async () => {
      setCustomJpyToThbRate(0.241);
      setFxRateLocked(true);
      expect(isFxRateLocked()).toBe(true);

      const lockedRes = await syncLiveJpyToThb();
      expect(lockedRes.locked).toBe(true);
      expect(lockedRes.success).toBe(false);
      expect(lockedRes.rate).toBe(0.241);

      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockRejectedValueOnce(new Error('Primary offline'))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ rates: { THB: 0.2285 } }), { status: 200 })
        );

      const forcedRes = await syncLiveJpyToThb({ force: true });
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(forcedRes.success).toBe(true);
      expect(forcedRes.rate).toBeCloseTo(0.2285, 4);
    });

    it('applies 1-tap -10% Tax-Free deduction inside ScanExpenseModal', async () => {
      let currentData: any = {
        title: 'Don Quijote Kyoto Avanti',
        amount: '5500',
        currency: 'JPY',
        category: 'shopping',
        spent_at: '2026-12-07',
        payer_id: 'me',
        payment_method: 'credit_card',
        items: [],
      };
      const setScannedData = vi.fn((updater: any) => {
        currentData = typeof updater === 'function' ? updater(currentData) : updater;
      });

      await act(async () => {
        root.render(
          <ScanExpenseModal
            isOpen={true}
            mounted={true}
            onClose={() => {}}
            userCat={getCatAvatar('cat_pink')}
            scanning={false}
            savingExpense={false}
            hasSavedGeminiKey={true}
            onOpenAiKeyModal={() => {}}
            onReceiptImageChange={() => {}}
            ocrErrorToast={null}
            ocrSuccessToast={null}
            scannedData={currentData}
            setScannedData={setScannedData}
            fxRate={0.235}
            categories={[{ id: 'shopping', label: 'ช้อปปิ้ง', icon: '🛍️', color: 'pink' }]}
            allMembersForSplit={[{ id: 'me', name: 'Pudit (ฉัน)', avatar: 'cat_pink' }]}
            addSplitMode="all"
            setAddSplitMode={() => {}}
            addSplitWith={['me']}
            setAddSplitWith={() => {}}
            splitAsSeparateExpenses={false}
            setSplitAsSeparateExpenses={() => {}}
            onSaveExpense={() => {}}
          />
        );
      });

      const deduct10Btn = document.body.querySelector('button[aria-label="หัก Tax-Free 10%"]') as HTMLButtonElement;
      expect(deduct10Btn).toBeTruthy();
      await act(async () => {
        deduct10Btn.click();
      });
      expect(currentData.amount).toBe('5000');
    });

    it('renders Public Read-Only link (?view=readonly) in ShareTripModal', async () => {
      const setSharePrivacy = vi.fn();
      await act(async () => {
        root.render(
          <ShareTripModal
            isOpen={true}
            isOwner={true}
            mounted={true}
            tripId="kyoto-2026"
            copiedLink={false}
            copiedAuthLink={false}
            copiedCode={false}
            sharePrivacy={{ hideDates: false, hideHotels: false, allowPublicReadOnly: true }}
            setSharePrivacy={setSharePrivacy}
            onClose={() => {}}
            onNativeShare={() => {}}
            onCopyInviteLink={() => {}}
            onCopyAuthInviteLink={() => {}}
            onCopyTripCode={() => {}}
          />
        );
      });

      const inputs = Array.from(document.body.querySelectorAll('input[type="text"]')) as HTMLInputElement[];
      expect(inputs.some((inp) => inp.value.includes('/trips/kyoto-2026?view=readonly'))).toBe(true);
    });

    it('supports Drag & Drop and ArrowUp/ArrowDown keyboard reorder on ItineraryCompactRow', async () => {
      const onDragStartStop = vi.fn();
      const onDropOnStop = vi.fn();
      const onKeyboardMoveStop = vi.fn();

      await act(async () => {
        root.render(
          <ItineraryCompactRow
            item={{
              id: 'stop-aeon-kyoto',
              trip_id: 'kyoto-2026',
              main_place: 'AEON MALL KYOTO',
              city: 'Kyoto Station',
              time_slot: '18:00 - 20:30',
            }}
            idx={2}
            canEditPlan={true}
            onOpenEditActivity={() => {}}
            onDragStartStop={onDragStartStop}
            onDropOnStop={onDropOnStop}
            onKeyboardMoveStop={onKeyboardMoveStop}
          />
        );
      });

      const handleBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        (b.getAttribute('aria-label') || '').includes('สลับลำดับ AEON MALL KYOTO')
      ) as HTMLButtonElement;
      expect(handleBtn).toBeTruthy();

      await act(async () => {
        handleBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      });
      expect(onKeyboardMoveStop).toHaveBeenCalledWith('stop-aeon-kyoto', 'up');

      const row = container.querySelector('[draggable="true"]') as HTMLElement;
      expect(row).toBeTruthy();
      await act(async () => {
        const dropEvt = new Event('drop', { bubbles: true, cancelable: true }) as any;
        dropEvt.dataTransfer = { getData: () => 'stop-fushimi' };
        row.dispatchEvent(dropEvt);
      });
      expect(onDropOnStop).toHaveBeenCalled();
    });
  });

  describe('Pack 3: Quota-Resilient Dual-Layer Offline Queue (IndexedDB + In-Memory Fallback)', () => {
    it('retains queued offline expenses even when localStorage throws QuotaExceededError', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      });

      const queued = enqueueOfflineExpense('trip-quota-test', {
        trip_id: 'trip-quota-test',
        title: 'AEON Mall Supermarket Tax-Free',
        amount: 6200,
        currency: 'JPY',
        category: 'shopping',
        spent_at: '2026-12-08',
      });

      expect(queued.localId).toMatch(/^offline-exp-/);
      const items = getOfflineExpenseQueue('trip-quota-test');
      expect(items).toHaveLength(1);
      expect(items[0].payload.title).toBe('AEON Mall Supermarket Tax-Free');

      setItemSpy.mockRestore();
      resetOfflineMemoryCachesForTests();
    });
  });

  describe('Pack 4 & 5.4: Metadata ID-Based Smart Merge, AI Rate Limiters & Duplicate Bill Detector', () => {
    it('merges concurrent multi-device shoppingBag & packingChecklist updates without clobbering checked items', () => {
      // Device A checked item-1 at t=2000; Device B checked item-2 at t=2500 while its copy of item-1 was still planned (no updatedAt)
      const remoteOnCloud = [
        { id: 'item-1', name: 'Uji Matcha', status: 'bought', updatedAt: 2000 },
        { id: 'item-2', name: 'Heattech', status: 'planned', updatedAt: 1000 },
      ];
      const incomingFromDeviceB = [
        { id: 'item-1', name: 'Uji Matcha', status: 'planned' },
        { id: 'item-2', name: 'Heattech', status: 'bought', updatedAt: 2500 },
      ];

      const merged = mergeMetadataEntityArray(remoteOnCloud, incomingFromDeviceB);
      expect(merged.find((i) => i.id === 'item-1')?.status).toBe('bought');
      expect(merged.find((i) => i.id === 'item-2')?.status).toBe('bought');

      // Explicit deletion via deletedEntityIds removes the deleted item cleanly
      const afterDelete = mergeMetadataEntityArray(merged, incomingFromDeviceB, { 'item-1': 3000 });
      expect(afterDelete.find((i) => i.id === 'item-1')).toBeUndefined();
      expect(afterDelete).toHaveLength(1);

      // Oversized base64 blobs (>180KB) in ticketsVault are slimmed automatically
      const hugeBase64 = `data:image/png;base64,${'A'.repeat(200_000)}`;
      const slimmed = slimMetadataPayload({
        ticketsVault: [{ id: 'vjw-1', title: 'Visit Japan Web', qrCodeUrl: hugeBase64 }],
      });
      expect(slimmed.ticketsVault?.[0].qrCodeUrl).toBeUndefined();
      expect(slimmed.ticketsVault?.[0].hasLargeLocalQr).toBe(true);
    });

    it('enforces burst rate limits and cross-origin guards on /api/scan-receipt and /api/ai-assistant', () => {
      for (let i = 0; i < 15; i++) {
        expect(checkScanReceiptRateLimit('203.0.113.88').allowed).toBe(true);
      }
      expect(checkScanReceiptRateLimit('203.0.113.88').allowed).toBe(false);

      for (let i = 0; i < 25; i++) {
        expect(checkAiAssistantRateLimit('203.0.113.99').allowed).toBe(true);
      }
      expect(checkAiAssistantRateLimit('203.0.113.99').allowed).toBe(false);

      const crossReq = new Request('https://app.example.com/api/scan-receipt', {
        method: 'POST',
        headers: { host: 'app.example.com', 'sec-fetch-site': 'cross-site' },
      });
      expect(isAllowedScanReceiptOrigin(crossReq)).toBe(false);
      expect(isAllowedAiAssistantOrigin(crossReq)).toBe(false);
    });

    it('detects duplicate bills by amount, currency, date, and merchant/category and guards double-saving in ScanExpenseModal', async () => {
      const existingExpenses = [
        {
          id: 'exp-101',
          title: 'AEON MALL KYOTO',
          amount: 5500,
          currency: 'JPY',
          category: 'shopping',
          spent_at: '2026-12-07',
          payer_name: 'Pudit',
        },
      ];

      const dups = findPotentialDuplicateExpenses(
        {
          title: 'AEON MALL KYOTO Supermarket',
          amount: '5500',
          currency: 'JPY',
          category: 'shopping',
          spent_at: '2026-12-07',
        },
        existingExpenses
      );
      expect(dups).toHaveLength(1);
      expect(dups[0].reason).toBe('exact_title_amount_date');

      const onSaveExpense = vi.fn();
      await act(async () => {
        root.render(
          <ScanExpenseModal
            isOpen={true}
            mounted={true}
            onClose={() => {}}
            userCat={getCatAvatar('cat_pink')}
            scanning={false}
            savingExpense={false}
            hasSavedGeminiKey={true}
            onOpenAiKeyModal={() => {}}
            onReceiptImageChange={() => {}}
            ocrErrorToast={null}
            ocrSuccessToast={null}
            scannedData={{
              title: 'AEON MALL KYOTO',
              amount: '5500',
              currency: 'JPY',
              category: 'shopping',
              spent_at: '2026-12-07',
              payer_id: 'me',
              payment_method: 'cash',
              items: [],
            }}
            setScannedData={() => {}}
            fxRate={0.235}
            categories={[{ id: 'shopping', label: 'ช้อปปิ้ง', icon: '🛍️', color: 'pink' }]}
            allMembersForSplit={[{ id: 'me', name: 'Pudit (ฉัน)', avatar: 'cat_pink' }]}
            addSplitMode="all"
            setAddSplitMode={() => {}}
            addSplitWith={['me']}
            setAddSplitWith={() => {}}
            splitAsSeparateExpenses={false}
            setSplitAsSeparateExpenses={() => {}}
            onSaveExpense={onSaveExpense}
            existingExpenses={existingExpenses}
          />
        );
      });

      const alertBanner = document.body.querySelector('[role="alert"]');
      expect(alertBanner?.textContent).toContain('พบรายการยอดซ้ำในวันเดียวกัน');

      // First click on Save button asks for duplicate confirmation instead of immediately saving
      const saveBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
        (b.textContent || '').includes('ยืนยันบันทึกซ้ำ?')
      ) as HTMLButtonElement;
      expect(saveBtn).toBeTruthy();

      await act(async () => {
        saveBtn.click();
      });
      expect(onSaveExpense).not.toHaveBeenCalled();

      // Second click after confirmation proceeds with save
      await act(async () => {
        saveBtn.click();
      });
      expect(onSaveExpense).toHaveBeenCalledTimes(1);
    });
  });
});
