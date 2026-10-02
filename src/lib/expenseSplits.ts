// src/lib/expenseSplits.ts

export interface ExpenseSplitMap {
  // expenseId -> array of member keys (member.id or member.name normalized)
  [expenseId: string]: string[];
}

const STORAGE_PREFIX = 'travel_tracker_expense_splits_';

/**
 * Get all expense split mappings for a trip
 */
export function getTripExpenseSplits(tripId: string): ExpenseSplitMap {
  if (typeof window === 'undefined' || !tripId) return {};
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${tripId}`);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse expense splits:', err);
    return {};
  }
}

/**
 * Save expense split mappings for a trip
 */
export function saveTripExpenseSplits(tripId: string, splits: ExpenseSplitMap): void {
  if (typeof window === 'undefined' || !tripId) return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${tripId}`, JSON.stringify(splits));
  } catch (err) {
    console.error('Failed to save expense splits:', err);
  }
}

/**
 * Set who splits a specific expense
 */
export function setExpenseSplitMembers(
  tripId: string,
  expenseId: string,
  memberIds: string[]
): ExpenseSplitMap {
  const current = getTripExpenseSplits(tripId);
  current[expenseId] = memberIds;
  saveTripExpenseSplits(tripId, current);
  return current;
}

/**
 * Get who splits a specific expense (returns undefined if default/everyone)
 */
export function getExpenseSplitMembers(
  tripId: string,
  expenseId: string
): string[] | undefined {
  const current = getTripExpenseSplits(tripId);
  return current[expenseId];
}

/**
 * Remove split mapping for an expense
 */
export function deleteExpenseSplit(tripId: string, expenseId: string): void {
  const current = getTripExpenseSplits(tripId);
  if (current[expenseId]) {
    delete current[expenseId];
    saveTripExpenseSplits(tripId, current);
  }
}
