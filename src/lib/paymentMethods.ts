// src/lib/paymentMethods.ts
import { syncTripMetadataToSupabase } from '@/lib/tripMetadata';

export type PaymentMethod = 'cash' | 'travel_card' | 'credit_card';

export interface ExpensePaymentMethodMap {
  [expenseId: string]: PaymentMethod;
}

const STORAGE_PREFIX = 'travel_tracker_expense_payment_methods_';

/**
 * Get all expense payment methods for a trip
 */
export function getTripPaymentMethods(tripId: string): ExpensePaymentMethodMap {
  if (typeof window === 'undefined' || !tripId) return {};
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${tripId}`);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse payment methods:', err);
    return {};
  }
}

/**
 * Save expense payment methods for a trip (LocalStorage + Cloud Sync)
 */
export function saveTripPaymentMethods(tripId: string, methods: ExpensePaymentMethodMap): void {
  if (typeof window === 'undefined' || !tripId) return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${tripId}`, JSON.stringify(methods));
    window.dispatchEvent(
      new CustomEvent('travel_tracker_payment_methods_updated', {
        detail: { tripId, methods },
      })
    );
  } catch (err) {
    console.error('Failed to save payment methods to localStorage:', err);
  }

  // Sync to Supabase in background
  syncTripMetadataToSupabase(tripId, { paymentMethods: methods }).catch((err) => {
    console.warn('Failed to sync payment methods to Supabase:', err);
  });
}

/**
 * Set payment method for a specific expense
 */
export function setExpensePaymentMethod(
  tripId: string,
  expenseId: string,
  method: PaymentMethod
): ExpensePaymentMethodMap {
  const current = getTripPaymentMethods(tripId);
  current[expenseId] = method;
  saveTripPaymentMethods(tripId, current);
  return current;
}


