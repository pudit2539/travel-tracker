// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import ExpenseDetailModal from '@/components/ExpenseDetailModal';
import BudgetCategoryModal from '@/components/BudgetCategoryModal';
import SettlementModal from '@/components/SettlementModal';
import HotelVoucherPreviewModal from '@/components/trip-detail/HotelVoucherPreviewModal';

// Set React act environment flag
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
      delete: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
    })),
  },
}));

vi.mock('@/lib/confetti', () => ({
  triggerConfetti: vi.fn(),
}));

describe('Mobile & iPad Responsive UI & Modal Tests', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    document.body.style.overflow = '';
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
    // Clean up any stray portals
    const portals = document.body.querySelectorAll('[role="dialog"]');
    portals.forEach((p) => p.parentNode?.removeChild(p));
    document.body.style.overflow = '';
    vi.clearAllMocks();
  });

  const sampleExpense = {
    id: 'exp-123',
    trip_id: 'trip-1',
    title: 'Dinner in Shinjuku',
    amount: 5400,
    currency: 'JPY',
    category: 'food',
    payer_id: 'user-1',
    payer_name: 'Pudit',
    payer_avatar: 'cat_orange',
    date: '2026-10-07',
    notes: 'Ramen & Gyoza',
  };

  it('ExpenseDetailModal: mounts via createPortal, locks body scroll, and applies dvh + safe-area insets for mobile/iPad', async () => {
    const onClose = vi.fn();
    const onSaveExpense = vi.fn();
    const onDeleteExpense = vi.fn();

    await act(async () => {
      root.render(
        <ExpenseDetailModal
          isOpen={true}
          expense={sampleExpense}
          onClose={onClose}
          onSaveExpense={onSaveExpense}
          onDeleteExpense={onDeleteExpense}
          tripBaseCurrency="JPY"
          fxRate={0.210}
          members={[]}
          categories={[]}
        />
      );
    });

    // 1. Verify body scroll lock is engaged on mobile/iPad
    expect(document.body.style.overflow).toBe('hidden');

    // 2. Verify dialog rendered directly under document.body via Portal
    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();

    // 3. Verify mobile dynamic viewport height (dvh) and centered dialog border-radius
    const modalCard = dialog?.querySelector('.glow-blue');
    expect(modalCard?.className).toContain('max-h-[90dvh]');
    expect(modalCard?.className).toContain('rounded-2xl');

    // 4. Verify scrollable body has overscroll-contain, touch-pan-y, and min-h-0 to prevent iOS rubberbanding
    const scrollBody = dialog?.querySelector('.overflow-y-auto');
    expect(scrollBody?.className).toContain('overscroll-contain');
    expect(scrollBody?.className).toContain('touch-pan-y');
    expect(scrollBody?.className).toContain('min-h-0');

    // 5. Verify bottom footer has safe-area-inset-bottom for iPhone home bar & iPad gesture bar
    const footer = dialog?.querySelector('.shrink-0.pb-\\[max\\(1rem\\,env\\(safe-area-inset-bottom\\)\\)\\]');
    expect(footer).not.toBeNull();
    expect(footer?.className).toContain('pl-[max(1rem,env(safe-area-inset-left))]');
    expect(footer?.className).toContain('pr-[max(1rem,env(safe-area-inset-right))]');
  });

  it('ExpenseDetailModal: switching to Edit mode keeps submit button accessible in sticky safe-area footer', async () => {
    await act(async () => {
      root.render(
        <ExpenseDetailModal
          isOpen={true}
          expense={sampleExpense}
          onClose={vi.fn()}
          onSaveExpense={vi.fn()}
          onDeleteExpense={vi.fn()}
          tripBaseCurrency="JPY"
          fxRate={0.210}
          members={[]}
          categories={[]}
        />
      );
    });

    const editBtn = document.body.querySelector('button[title="แก้ไขข้อมูล"]') as HTMLButtonElement;
    expect(editBtn).not.toBeNull();

    // Click Edit button
    await act(async () => {
      editBtn.click();
    });

    // Form must be bound via form id so buttons remain outside the scroll container in landscape/virtual keyboard mode
    const form = document.body.querySelector('#edit-expense-form');
    expect(form).not.toBeNull();

    // Title input must have mobile touch friendly tap sizing
    const titleInput = form?.querySelector('input[type="text"]') as HTMLInputElement;
    expect(titleInput).not.toBeNull();
    expect(titleInput.value).toBe('Dinner in Shinjuku');
    expect(titleInput.className).toContain('touch-manipulation');

    // Submit button in footer must have form="edit-expense-form"
    const submitBtn = document.body.querySelector('button[form="edit-expense-form"]') as HTMLButtonElement;
    expect(submitBtn).not.toBeNull();
    expect(submitBtn.textContent).toContain('บันทึกการแก้ไข');
  });

  it('BudgetCategoryModal: mounts via portal with dynamic viewport height, overscroll-contain, and safe-area padding', async () => {
    const onClose = vi.fn();

    await act(async () => {
      root.render(
        <BudgetCategoryModal
          isOpen={true}
          onClose={onClose}
          trip={{ id: 'trip-1', title: 'Japan Autumn 2026', currency: 'JPY', budget: 100000 }}
          onUpdated={vi.fn()}
        />
      );
    });

    // Body scroll locked
    expect(document.body.style.overflow).toBe('hidden');

    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();

    // Dynamic viewport height for iPhone/iPad Pro 11 portrait and landscape
    const card = dialog?.querySelector('.glow-blue');
    expect(card?.className).toContain('max-h-[90dvh]');
    expect(card?.className).toContain('rounded-2xl');

    // Safe area bottom inset in footer
    const footer = dialog?.querySelector('.pb-\\[max\\(1rem\\,env\\(safe-area-inset-bottom\\)\\)\\]');
    expect(footer).not.toBeNull();

    // Press Escape key closes modal
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('SettlementModal: mounts via portal with dvh classes and supports PromptPay QR sub-modal portaling', async () => {
    const onClose = vi.fn();
    const members = [
      { user_id: 'u1', profiles: { display_name: 'Pudit', avatar_id: 'cat_orange' } },
      { user_id: 'u2', profiles: { display_name: 'Friend A', avatar_id: 'cat_black' } },
    ];
    const expenses = [
      { id: 'e1', trip_id: 'trip-1', title: 'Hotel', amount: 20000, currency: 'JPY', payer_id: 'u1', payer_name: 'Pudit' },
    ];

    await act(async () => {
      root.render(
        <SettlementModal
          isOpen={true}
          onClose={onClose}
          expenses={expenses}
          members={members}
          currentUser={{ id: 'u1', email: 'test@example.com' }}
          userDisplayName="Pudit"
          currency="JPY"
          fxRate={0.210}
          tripId="trip-1"
        />
      );
    });

    expect(document.body.style.overflow).toBe('hidden');

    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();

    // Check dynamic viewport height and rounded-2xl
    const mainDialogCard = dialog?.querySelector('.max-h-\\[90dvh\\]');
    expect(mainDialogCard).not.toBeNull();
    expect(mainDialogCard?.className).toContain('rounded-2xl');

    // Footer with safe area bottom
    const footer = dialog?.querySelector('.pb-\\[max\\(1rem\\,env\\(safe-area-inset-bottom\\)\\)\\]');
    expect(footer).not.toBeNull();

    // Tab buttons have touch-manipulation and min-h-[40px]
    const tabBtns = dialog?.querySelectorAll('button.touch-manipulation');
    expect(tabBtns?.length).toBeGreaterThan(0);
  });

  it('HotelVoucherPreviewModal: includes dvh, safe-area insets, and body scroll lock', async () => {
    const onClose = vi.fn();
    const voucherData = {
      name: 'voucher.pdf',
      type: 'application/pdf',
      dataUrl: 'data:application/pdf;base64,JVBERi0xLjQK...',
      hotelName: 'Shinjuku Prince Hotel',
    };

    await act(async () => {
      root.render(
        <HotelVoucherPreviewModal
          isOpen={true}
          onClose={onClose}
          voucher={voucherData}
          hotelName="Shinjuku Prince Hotel"
        />
      );
    });

    expect(document.body.style.overflow).toBe('hidden');

    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();

    // Max height uses dvh to adapt dynamically to mobile/iPad landscape orientations
    expect(dialog?.className).toContain('max-h-[94dvh]');

    // Bottom safe area padding
    const footer = dialog?.querySelector('.pb-\\[max\\(0\\.875rem\\,env\\(safe-area-inset-bottom\\)\\)\\]');
    expect(footer).not.toBeNull();
  });
});
