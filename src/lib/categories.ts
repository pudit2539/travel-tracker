// src/lib/categories.ts

export interface CategoryItem {
  id: string;
  label: string;
  icon: string;
  color?: string;
  isCustom?: boolean;
}

export const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: 'food', label: 'อาหาร & คาเฟ่', icon: '🍱', color: 'amber' },
  { id: 'transport', label: 'การเดินทาง', icon: '🚅', color: 'indigo' },
  { id: 'shopping', label: 'ชอปปิง', icon: '🛍️', color: 'pink' },
  { id: 'hotel', label: 'ที่พัก', icon: '🏨', color: 'emerald' },
  { id: 'ticket', label: 'บัตรเข้าชม / กิจกรรม', icon: '🎟️', color: 'purple' },
  { id: 'other', label: 'อื่นๆ', icon: '📦', color: 'slate' },
];

export interface CategoryBudgetMap {
  [categoryId: string]: number;
}

export interface MemberBudgetMap {
  [memberIdOrName: string]: number;
}

// Key format helpers
const CUSTOM_CAT_KEY = (tripId: string) => `travel_tracker_custom_categories_${tripId}`;
const CAT_BUDGET_KEY = (tripId: string) => `travel_tracker_cat_budgets_${tripId}`;
const MEMBER_BUDGET_KEY = (tripId: string) => `travel_tracker_member_budgets_${tripId}`;

export function getTripCategories(tripId: string): CategoryItem[] {
  if (typeof window === 'undefined') return DEFAULT_CATEGORIES;
  try {
    const raw = localStorage.getItem(CUSTOM_CAT_KEY(tripId));
    if (!raw) return DEFAULT_CATEGORIES;
    const customList: CategoryItem[] = JSON.parse(raw);
    return [...DEFAULT_CATEGORIES, ...customList];
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export function saveCustomCategory(tripId: string, category: { label: string; icon: string }): CategoryItem[] {
  if (typeof window === 'undefined') return DEFAULT_CATEGORIES;
  try {
    const existing = getTripCategories(tripId).filter(c => c.isCustom);
    const newCatId = 'custom_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const newCat: CategoryItem = {
      id: newCatId,
      label: category.label.trim(),
      icon: category.icon || '🏷️',
      color: 'pink',
      isCustom: true,
    };
    const updated = [...existing, newCat];
    localStorage.setItem(CUSTOM_CAT_KEY(tripId), JSON.stringify(updated));
    return [...DEFAULT_CATEGORIES, ...updated];
  } catch (e) {
    console.error('Failed to save custom category', e);
    return DEFAULT_CATEGORIES;
  }
}

export function deleteCustomCategory(tripId: string, categoryId: string): CategoryItem[] {
  if (typeof window === 'undefined') return DEFAULT_CATEGORIES;
  try {
    const existing = getTripCategories(tripId).filter(c => c.isCustom && c.id !== categoryId);
    localStorage.setItem(CUSTOM_CAT_KEY(tripId), JSON.stringify(existing));
    return [...DEFAULT_CATEGORIES, ...existing];
  } catch (e) {
    console.error('Failed to delete custom category', e);
    return DEFAULT_CATEGORIES;
  }
}

export function getCategoryBudgets(tripId: string): CategoryBudgetMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CAT_BUDGET_KEY(tripId));
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveCategoryBudgets(tripId: string, budgets: CategoryBudgetMap) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CAT_BUDGET_KEY(tripId), JSON.stringify(budgets));
  } catch (e) {
    console.error('Failed to save category budgets', e);
  }
}

export function getMemberBudgets(tripId: string): MemberBudgetMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(MEMBER_BUDGET_KEY(tripId));
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveMemberBudgets(tripId: string, budgets: MemberBudgetMap) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MEMBER_BUDGET_KEY(tripId), JSON.stringify(budgets));
  } catch (e) {
    console.error('Failed to save member budgets', e);
  }
}

export function getCategoryMeta(categories: CategoryItem[], categoryId: string): CategoryItem {
  const found = categories.find(c => c.id === categoryId);
  if (found) return found;
  return { id: categoryId, label: categoryId, icon: '🏷️', color: 'slate' };
}
