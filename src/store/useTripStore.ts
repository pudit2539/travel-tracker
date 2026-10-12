import { create } from 'zustand';
import { CategoryItem, CategoryBudgetMap, MemberBudgetMap } from '@/lib/categories';

export interface ExpenseItem {
  id: string;
  trip_id: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  spent_at?: string;
  payer_id?: string;
  payer_name?: string;
  payer_avatar?: string;
  receipt_url?: string;
  payment_method?: string;
}

export interface ItineraryItem {
  id: string;
  trip_id: string;
  date_label: string;
  time_slot?: string;
  city?: string;
  main_place: string;
  main_place_links?: string[];
  food_recommendation?: string;
  food_links?: string[];
  transport_info?: string;
  backup_plan?: string;
  backup_links?: string[];
  sort_order: number;
}

interface TripState {
  // Core Trip Data
  tripId: string | null;
  trip: any | null;
  itinerary: ItineraryItem[];
  expenses: ExpenseItem[];
  members: any[];
  categories: CategoryItem[];
  categoryBudgets: CategoryBudgetMap;
  memberBudgets: MemberBudgetMap;

  // UI & Active Filters
  activeTab: 'plan' | 'expenses' | 'analytics' | 'members';
  expenseSearchQuery: string;
  expenseCategoryFilter: string;
  expensePayerFilter: string;
  heroBudgetView: 'all' | 'me' | string;

  // Setters
  setTripData: (data: {
    trip?: any;
    itinerary?: ItineraryItem[];
    expenses?: ExpenseItem[];
    members?: any[];
    categories?: CategoryItem[];
    categoryBudgets?: CategoryBudgetMap;
    memberBudgets?: MemberBudgetMap;
  }) => void;
  setActiveTab: (tab: 'plan' | 'expenses' | 'analytics' | 'members') => void;
  setExpenseSearchQuery: (query: string) => void;
  setExpenseCategoryFilter: (category: string) => void;
  setExpensePayerFilter: (payer: string) => void;
  setHeroBudgetView: (view: 'all' | 'me' | string) => void;

  // Optimistic Mutations (0ms UI Updates)
  addExpenseOptimistic: (expense: ExpenseItem) => void;
  updateExpenseOptimistic: (expense: ExpenseItem) => void;
  deleteExpenseOptimistic: (expenseId: string) => void;
  reorderItineraryOptimistic: (reordered: ItineraryItem[]) => void;
}

export const useTripStore = create<TripState>((set) => ({
  tripId: null,
  trip: null,
  itinerary: [],
  expenses: [],
  members: [],
  categories: [],
  categoryBudgets: {},
  memberBudgets: {},

  activeTab: 'plan',
  expenseSearchQuery: '',
  expenseCategoryFilter: 'all',
  expensePayerFilter: 'all',
  heroBudgetView: 'all',

  setTripData: (data) =>
    set((state) => ({
      trip: data.trip !== undefined ? data.trip : state.trip,
      itinerary: data.itinerary !== undefined ? data.itinerary : state.itinerary,
      expenses: data.expenses !== undefined ? data.expenses : state.expenses,
      members: data.members !== undefined ? data.members : state.members,
      categories: data.categories !== undefined ? data.categories : state.categories,
      categoryBudgets: data.categoryBudgets !== undefined ? data.categoryBudgets : state.categoryBudgets,
      memberBudgets: data.memberBudgets !== undefined ? data.memberBudgets : state.memberBudgets,
    })),

  setActiveTab: (activeTab) => set({ activeTab }),
  setExpenseSearchQuery: (expenseSearchQuery) => set({ expenseSearchQuery }),
  setExpenseCategoryFilter: (expenseCategoryFilter) => set({ expenseCategoryFilter }),
  setExpensePayerFilter: (expensePayerFilter) => set({ expensePayerFilter }),
  setHeroBudgetView: (heroBudgetView) => set({ heroBudgetView }),

  addExpenseOptimistic: (newExpense) =>
    set((state) => ({
      expenses: [newExpense, ...state.expenses],
    })),

  updateExpenseOptimistic: (updated) =>
    set((state) => ({
      expenses: state.expenses.map((e) => (e.id === updated.id ? { ...e, ...updated } : e)),
    })),

  deleteExpenseOptimistic: (expenseId) =>
    set((state) => ({
      expenses: state.expenses.filter((e) => e.id !== expenseId),
    })),

  reorderItineraryOptimistic: (reordered) =>
    set({ itinerary: reordered }),
}));

export default useTripStore;
