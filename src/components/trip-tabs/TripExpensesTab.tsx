'use client';

import React from 'react';
import { 
  Users, AlertCircle, CheckCircle2, Camera, Calculator, 
  Search, Download, Edit3, Calendar, LayoutGrid, AlignJustify 
} from 'lucide-react';
import { ExpenseCard, ExpenseThumbnailCard, ExpenseCompactRow } from '@/components/trip-detail/ExpenseCard';
import AnimatedNumber from '@/components/AnimatedNumber';
import { CategoryItem } from '@/lib/categories';
import { convertCurrency, convertToThb, formatExchangeRateDisplay } from '@/lib/currency';
import { getCatAvatar } from '@/lib/avatars';
import { CatAvatarBadge } from '@/components/CatAvatarBadge';
import { getTripExpenseSplits } from '@/lib/expenseSplits';
import { resolveDisplayCurrency } from '@/lib/tripStatus';
import PocketMoneyWidget from '@/components/PocketMoneyWidget';
import { triggerViewTransition } from '@/lib/placeThumbnails';

interface TripExpensesTabProps {
  trip: any;
  tripBaseCurrency: string;
  fxRate: number;
  currencyView?: 'foreign' | 'thb';
  heroDisplayData: {
    title: string;
    spent: number;
    targetBudget: number;
    remaining: number;
    isOver: boolean;
    diff: number;
    progress: number;
    budgetLabel: string;
  };
  heroBudgetView: string;
  setHeroBudgetView: (view: string) => void;
  userDisplayName: string;
  userCat: any;
  otherMembers: any[];
  expenses: any[];
  filteredExpenses: any[];
  categories: CategoryItem[];
  currentUser: any;
  canAddExpense: boolean;
  /** Per-expense edit/delete permission (contributors may only modify their own) */
  canModifyExpense: (exp: any) => boolean;
  expensePayerFilter: string;
  setExpensePayerFilter: (filter: string) => void;
  otherPayers: any[];
  expenseSearchQuery: string;
  setExpenseSearchQuery: (query: string) => void;
  expenseCategoryFilter: string;
  setExpenseCategoryFilter: (cat: string) => void;
  setShowTravelHubModal: (show: boolean) => void;
  setShowScanModal: (show: boolean) => void;
  setShowSettlementModal: (show: boolean) => void;
  setShowBudgetCategoryModal: (show: boolean) => void;
  setOcrSuccessToast: (msg: string | null) => void;
  handleOpenReceiptPreview: (exp: any) => void;
  handleDeleteExpense: (id: string, receiptUrl?: string) => void;
  exportExpensesToExcel: () => void;
  onSelectExpense?: (exp: any) => void;
  onEditExpense?: (exp: any) => void;
}

export const TripExpensesTab = React.memo(function TripExpensesTab({
  trip,
  tripBaseCurrency,
  fxRate,
  currencyView = 'foreign',
  heroDisplayData,
  heroBudgetView,
  setHeroBudgetView,
  userDisplayName,
  userCat,
  otherMembers,
  expenses,
  filteredExpenses,
  categories,
  currentUser,
  canAddExpense,
  canModifyExpense,
  expensePayerFilter,
  setExpensePayerFilter,
  otherPayers,
  expenseSearchQuery,
  setExpenseSearchQuery,
  expenseCategoryFilter,
  setExpenseCategoryFilter,
  setShowTravelHubModal,
  setShowScanModal,
  setShowSettlementModal,
  setShowBudgetCategoryModal,
  setOcrSuccessToast,
  handleOpenReceiptPreview,
  handleDeleteExpense,
  exportExpensesToExcel,
  onSelectExpense,
  onEditExpense,
}: TripExpensesTabProps) {
  const [splitsVersion, setSplitsVersion] = React.useState(0);
  const [expenseViewMode, setExpenseViewMode] = React.useState<'grouped' | 'thumbnail' | 'compact'>('grouped');

  const handleSwitchExpenseView = (mode: 'grouped' | 'thumbnail' | 'compact') => {
    triggerViewTransition(() => {
      setExpenseViewMode(mode);
    }, 'expenses-view-container');
  };

  React.useEffect(() => {
    const handleSplitsUpdated = () => setSplitsVersion((v) => v + 1);
    window.addEventListener('travel_tracker_splits_updated', handleSplitsUpdated);
    window.addEventListener('travel_tracker_payment_methods_updated', handleSplitsUpdated);
    return () => {
      window.removeEventListener('travel_tracker_splits_updated', handleSplitsUpdated);
      window.removeEventListener('travel_tracker_payment_methods_updated', handleSplitsUpdated);
    };
  }, []);

  const splitsMap = React.useMemo(() => getTripExpenseSplits(trip?.id), [trip?.id, expenses, splitsVersion]);

  // Build unified member list & lookup map to resolve split member names and avatars
  const allMembersList = React.useMemo(() => {
    const list: Array<{ id: string; name: string; avatar?: string }> = [
      {
        id: currentUser?.id || 'me',
        name: userDisplayName || 'ฉัน',
        avatar: userCat?.id || 'orange',
      },
    ];
    if (otherMembers && Array.isArray(otherMembers)) {
      otherMembers.forEach((m) => {
        const uid = m.user_id || m.id || m.key;
        const uname = m.profiles?.display_name || m.display_name || m.name || 'เพื่อน';
        const uavatar = m.profiles?.avatar_id || m.cat_avatar || m.avatar || 'calico';
        list.push({ id: uid, name: uname, avatar: uavatar });
      });
    }
    return list;
  }, [currentUser, userDisplayName, userCat, otherMembers]);

  const allMembersMap = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; avatar?: string }>();
    allMembersList.forEach((m) => {
      map.set(m.id.toLowerCase(), m);
      map.set(m.name.toLowerCase(), m);
    });
    // Add default aliases
    map.set('me', allMembersList[0]);
    map.set('ฉัน', allMembersList[0]);
    return map;
  }, [allMembersList]);

  const getSplitMembersForExp = (expId: string) => {
    const custom = splitsMap[expId];
    if (custom && custom.length > 0) {
      return custom.map((k) => allMembersMap.get(k.toLowerCase().trim()) || { id: k, name: k });
    }
    // Default: all members share equally
    return allMembersList;
  };

  // Pre-calculate counts of shared expenses for each filter chip
  const mySharedCount = React.useMemo(() => {
    const myId = currentUser?.id?.toLowerCase();
    const myName = userDisplayName?.toLowerCase();
    return expenses.filter((e) => {
      const splits = splitsMap[e.id];
      if (!splits || splits.length === 0) return true;
      return splits.some((k) => {
        const lk = (k || '').toLowerCase().trim();
        return lk === 'me' || (myId && lk === myId) || (myName && lk === myName) || lk.includes('ฉัน');
      });
    }).length;
  }, [expenses, splitsMap, currentUser, userDisplayName]);

  const otherPayersWithCounts = React.useMemo(() => {
    return otherPayers.map((p) => {
      const targetKey = p.key?.toLowerCase();
      const targetName = p.name?.toLowerCase();

      const sharedCount = expenses.filter((e) => {
        const splits = splitsMap[e.id];
        if (!splits || splits.length === 0) return true;
        return splits.some((k) => {
          const lk = (k || '').toLowerCase().trim();
          return lk === targetKey || lk === targetName;
        });
      }).length;

      return {
        ...p,
        sharedCount,
      };
    });
  }, [otherPayers, expenses, splitsMap]);

  // Total amount of full bills in current filtered list
  const fullTripAmount = React.useMemo(() => {
    return filteredExpenses.reduce(
      (acc, curr) => acc + convertCurrency(Number(curr.amount || 0), curr.currency || tripBaseCurrency, tripBaseCurrency, fxRate),
      0
    );
  }, [filteredExpenses, tripBaseCurrency, fxRate]);

  // When filtering by a member, sum only THAT member's shared portion
  const totalFilteredAmount = React.useMemo(() => {
    if (expensePayerFilter === 'all') {
      return fullTripAmount;
    }

    const myId = currentUser?.id?.toLowerCase();
    const myName = userDisplayName?.toLowerCase();
    const filterKey = expensePayerFilter.toLowerCase();

    return filteredExpenses.reduce((acc, curr) => {
      const fullAmt = convertCurrency(Number(curr.amount || 0), curr.currency || tripBaseCurrency, tripBaseCurrency, fxRate);
      const splits = splitsMap[curr.id];

      // If no custom split, default is divided equally among all trip members
      const splitCount = splits && splits.length > 0 ? splits.length : Math.max(1, allMembersList.length);
      const perPersonAmt = fullAmt / splitCount;

      if (!splits || splits.length === 0) {
        return acc + perPersonAmt;
      }

      // Check if selected member participates
      const participates = splits.some((k) => {
        const lk = (k || '').toLowerCase().trim();
        if (filterKey === 'me') {
          return lk === 'me' || (myId && lk === myId) || (myName && lk === myName) || lk.includes('ฉัน');
        }
        return lk === filterKey || lk === filterKey.replace(' (ฉัน)', '');
      });

      if (participates) {
        return acc + perPersonAmt;
      }
      return acc;
    }, 0);
  }, [filteredExpenses, expensePayerFilter, fullTripAmount, splitsMap, currentUser, userDisplayName, allMembersList, tripBaseCurrency, fxRate]);

  const selectedFilterName = React.useMemo(() => {
    if (expensePayerFilter === 'all') return 'ทุกคน';
    if (expensePayerFilter === 'me') return userDisplayName || 'ของฉัน';
    const found = otherPayersWithCounts.find(
      (p) => p.key?.toLowerCase() === expensePayerFilter.toLowerCase() || p.name?.toLowerCase() === expensePayerFilter.toLowerCase()
    );
    return found?.name || expensePayerFilter;
  }, [expensePayerFilter, userDisplayName, otherPayersWithCounts]);

  // Group filteredExpenses by spent_at date for Splitwise/Tricount-style Date Grouping
  const groupedExpensesByDate = React.useMemo(() => {
    const map = new Map<string, { dateKey: string; label: string; items: any[]; dayTotal: number }>();
    filteredExpenses.forEach((exp) => {
      const rawDate = exp.spent_at ? String(exp.spent_at).slice(0, 10) : 'ไม่ระบุวันที่';
      if (!map.has(rawDate)) {
        let label = rawDate;
        if (rawDate !== 'ไม่ระบุวันที่') {
          try {
            label = new Date(rawDate).toLocaleDateString('th-TH', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
          } catch {}
        }
        map.set(rawDate, { dateKey: rawDate, label, items: [], dayTotal: 0 });
      }
      const group = map.get(rawDate)!;
      group.items.push(exp);
      group.dayTotal += convertCurrency(Number(exp.amount || 0), exp.currency || tripBaseCurrency, tripBaseCurrency, fxRate);
    });
    return Array.from(map.values());
  }, [filteredExpenses, tripBaseCurrency, fxRate]);

  return (
    <div className="space-y-4">
      {/* HERO BUDGET & QUICK ACTION CARD (Decluttered: 1 clean metric & 3 primary actions) */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 dark:border-[#262932] bg-white dark:bg-[#181a20] card-elevation p-4 sm:p-6 md:p-7 space-y-4">
        {/* Row 1: Badges & Quick Tool Pills */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/70 dark:border-blue-900/50 shadow-2xs">
              {tripBaseCurrency} Workspace
            </span>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#1c2438] px-2.5 py-0.5 rounded-full border border-slate-200/70 dark:border-[#262932] font-mono">
              {formatExchangeRateDisplay(tripBaseCurrency, fxRate)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowTravelHubModal(true)}
              className="inline-flex items-center gap-1.5 text-[11px] font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-3.5 py-1.5 rounded-xl shadow-md shadow-blue-500/25 cursor-pointer active:scale-95 transition-all hover:scale-105"
            >
              <span>🧭 Travel Hub</span>
              <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
            </button>
          </div>
        </div>

        {/* Row 2: Spent Metric with Animated Counter */}
        {(() => {
          const spentDisplay = resolveDisplayCurrency(heroDisplayData.spent, tripBaseCurrency, fxRate, currencyView);
          const diffDisplay = resolveDisplayCurrency(heroDisplayData.diff, tripBaseCurrency, fxRate, currencyView);
          const targetDisplay = resolveDisplayCurrency(heroDisplayData.targetBudget, tripBaseCurrency, fxRate, currencyView);
          const remainOrDiffDisplay = resolveDisplayCurrency(
            heroDisplayData.isOver ? heroDisplayData.diff : heroDisplayData.remaining,
            tripBaseCurrency,
            fxRate,
            currencyView
          );
          return (
            <>
              <div className="relative z-10 pt-1">
                <div className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>{heroDisplayData.title}</span>
                  {heroDisplayData.isOver && (
                    <span className="text-[10px] sm:text-[11px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900/50">
                      ⚠️ เกินงบ +<AnimatedNumber value={diffDisplay.primaryAmount} /> {diffDisplay.primaryCurrency}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-baseline gap-1 sm:gap-2 mt-0.5">
                  <span className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
                    <AnimatedNumber value={spentDisplay.primaryAmount} />
                  </span>
                  <span className="text-base sm:text-xl font-bold text-blue-600 dark:text-blue-400">
                    {spentDisplay.primaryCurrency}
                  </span>
                  {spentDisplay.secondaryText && (
                    <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 ml-1">
                      {spentDisplay.secondaryText}
                    </span>
                  )}
                </div>
              </div>

              {/* Row 3: Progress Bar */}
              <div className="relative z-10 space-y-1.5">
                <div className="flex justify-between text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>
                    {heroDisplayData.targetBudget > 0 
                      ? `ใช้ไปแล้ว ${heroDisplayData.progress}% ของเป้าหมาย` 
                      : 'ยังไม่ได้ตั้งเป้างบประมาณ'}
                  </span>
                  <span className="flex items-center gap-1">
                    {heroDisplayData.budgetLabel}: {heroDisplayData.targetBudget > 0 ? (
                      <>
                        <AnimatedNumber value={targetDisplay.primaryAmount} /> {targetDisplay.primaryCurrency}
                      </>
                    ) : 'ไม่ระบุ'}
                    <button
                      onClick={() => setShowBudgetCategoryModal(true)}
                      className="p-0.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                      title="ตั้งค่าเป้าหมายงบประมาณ"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                  </span>
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 sm:h-3.5 p-0.5 overflow-hidden shadow-inner relative">
                  <div
                    className={`h-full rounded-full transition-all duration-700 relative overflow-hidden ${
                      heroDisplayData.isOver
                        ? 'bg-rose-500'
                        : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.max(heroDisplayData.progress, 3)}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-shimmer" />
                  </div>
                </div>
              </div>

              {/* Row 4: Remaining Ribbon & Primary Action Buttons */}
              <div className="relative z-10 pt-1 space-y-3">
                {heroDisplayData.targetBudget > 0 && (
                  <div className={`p-2.5 sm:p-3 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-2xs ${
                    heroDisplayData.isOver
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      {heroDisplayData.isOver ? (
                        <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      )}
                      <span>
                        {heroDisplayData.isOver ? 'ยอดเงินที่ใช้เกินงบประมาณ:' : 'ยอดเงินคงเหลือ:'}
                      </span>
                    </div>
                    <div className="font-black text-right font-mono">
                      <span>
                        <AnimatedNumber value={remainOrDiffDisplay.primaryAmount} /> {remainOrDiffDisplay.primaryCurrency}
                      </span>
                      {remainOrDiffDisplay.secondaryText && (
                        <span className="text-[10px] opacity-80 block sm:inline sm:ml-1 font-sans">
                          {remainOrDiffDisplay.secondaryText}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons: AI OCR + Settlement + 1-Click Excel Export */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  <button
                    onClick={() => {
                      setOcrSuccessToast(null);
                      setShowScanModal(true);
                    }}
                    disabled={!canAddExpense}
                    className="btn-luxury-primary py-3 px-3 rounded-2xl text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/25 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Camera className="h-4 w-4 shrink-0" />
                    <span className="truncate">บันทึกรายจ่าย AI OCR</span>
                  </button>

                  <button
                    onClick={() => setShowSettlementModal(true)}
                    className="btn-luxury-glass py-3 px-3 rounded-2xl font-black text-xs sm:text-sm text-slate-800 dark:text-slate-100 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                  >
                    <Calculator className="h-4 w-4 text-blue-500 shrink-0" />
                    <span className="truncate">เคลียร์บิลหารเงิน</span>
                  </button>

                  <button
                    onClick={exportExpensesToExcel}
                    className="btn-luxury-emerald col-span-2 sm:col-span-1 py-3 px-3 rounded-2xl font-black text-xs sm:text-sm text-white flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/25 active:scale-95 transition-all"
                    title="ส่งออกรายการค่าใช้จ่ายทั้งหมดเป็นไฟล์ Excel (.xlsx)"
                  >
                    <Download className="h-4 w-4 shrink-0" />
                    <span className="truncate">Export Excel</span>
                  </button>
                </div>
              </div>
            </>
          );
        })()}
      </div>

      {/* Multi-Wallet Pocket Money & Payment Method Tracker (Collapsible Summary Bar) */}
      <PocketMoneyWidget
        tripId={trip?.id || ''}
        currency={tripBaseCurrency}
        fxRate={fxRate}
        expenses={expenses}
        currencyView={currencyView}
      />

      {/* Unified Filter & 3-Mode View Switcher Toolbar */}
      <div className="p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 dark:border-[#262932] bg-white dark:bg-[#181a20] card-elevation space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="text-xs font-black text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-blue-500" />
              <span>มุมมองตามสมาชิก:</span>
            </div>
          </div>

          {(() => {
            const filteredTotalDisplay = resolveDisplayCurrency(totalFilteredAmount, tripBaseCurrency, fxRate, currencyView);
            const fullBillDisplay = resolveDisplayCurrency(fullTripAmount, tripBaseCurrency, fxRate, currencyView);
            return (
              <div className="text-right font-mono">
                <div className="text-xs font-black text-blue-600 dark:text-blue-400">
                  {expensePayerFilter === 'all' ? (
                    <>
                      <span>ยอดรวม: {filteredTotalDisplay.primaryText}</span>
                      {filteredTotalDisplay.secondaryText && (
                        <span className="font-normal text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px] ml-1">
                          {filteredTotalDisplay.secondaryText}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span>ยอดแชร์ของ {selectedFilterName}: {filteredTotalDisplay.primaryText}</span>
                      {filteredTotalDisplay.secondaryText && (
                        <span className="font-normal text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px] ml-1">
                          {filteredTotalDisplay.secondaryText}
                        </span>
                      )}
                    </>
                  )}
                </div>
                {expensePayerFilter !== 'all' && (
                  <div className="text-[10px] text-slate-400 font-sans">
                    (ยอดบิลเต็มรวม {fullBillDisplay.primaryText} {fullBillDisplay.secondaryText})
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Single Unified Swipeable Member Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          <button
            type="button"
            onClick={() => {
              setExpensePayerFilter('all');
              setHeroBudgetView('all');
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
              expensePayerFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-[#1c2438] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-[#262932]'
            }`}
          >
            📋 รวมทุกคน ({expenses.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setExpensePayerFilter('me');
              setHeroBudgetView('me');
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
              expensePayerFilter === 'me'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-[#1c2438] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-[#262932]'
            }`}
          >
            <CatAvatarBadge cat={userCat} size="xs" />
            <span>ของฉัน ({userDisplayName}) ({mySharedCount})</span>
          </button>

          {otherPayersWithCounts.map((p) => {
            const pCat = getCatAvatar(p.avatar);
            const isSelected = expensePayerFilter.toLowerCase() === p.key.toLowerCase() || expensePayerFilter.toLowerCase() === p.name.toLowerCase();

            return (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  setExpensePayerFilter(p.key);
                  setHeroBudgetView(p.key);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-[#1c2438] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-[#262932]'
                }`}
              >
                <CatAvatarBadge cat={pCat} size="xs" />
                <span>{p.name} ({p.sharedCount})</span>
              </button>
            );
          })}
        </div>

        {/* Search, Category Filter & 3-Mode View Switcher */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 pt-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหารายการ, ร้านค้า..."
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-[#262932] bg-slate-50 dark:bg-[#121316] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-500 font-medium"
              value={expenseSearchQuery}
              onChange={(e) => setExpenseSearchQuery(e.target.value)}
            />
          </div>

          <select
            value={expenseCategoryFilter}
            onChange={(e) => setExpenseCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-[#262932] bg-slate-50 dark:bg-[#121316] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-500 font-bold cursor-pointer md:w-44"
          >
            <option value="all">📁 ทุกหมวดหมู่</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>

          {/* 3-Mode Expense View Switcher */}
          <div
            role="group"
            aria-label="สลับมุมมองรายการค่าใช้จ่าย"
            className="inline-flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-[#121316] border border-slate-200/80 dark:border-[#262932] shrink-0 self-start md:self-auto"
          >
            <button
              type="button"
              onClick={() => handleSwitchExpenseView('grouped')}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                expenseViewMode === 'grouped'
                  ? 'bg-white dark:bg-[#1c2438] text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="จัดกลุ่มตามวันที่"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>ตามวัน</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchExpenseView('thumbnail')}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                expenseViewMode === 'thumbnail'
                  ? 'bg-white dark:bg-[#1c2438] text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="มุมมองการ์ดใบเสร็จ Thumbnail"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Thumbnail</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchExpenseView('compact')}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                expenseViewMode === 'compact'
                  ? 'bg-white dark:bg-[#1c2438] text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="มุมมองตารางรายการย่อ"
            >
              <AlignJustify className="h-3.5 w-3.5" />
              <span>รายการย่อ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Expenses List Container */}
      <div id="expenses-view-container" tabIndex={-1} className="outline-none">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-[#262932] rounded-3xl p-6 bg-white dark:bg-[#181a20]">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">ยังไม่มีรายการค่าใช้จ่ายที่ตรงกับเงื่อนไข</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
              กดปุ่มถ่ายรูปใบเสร็จเพื่อใช้ AI สแกน และบันทึกรายจ่าย หรือล้างตัวกรอง
            </p>
            <div className="flex items-center justify-center gap-2">
              {expensePayerFilter !== 'all' || expenseCategoryFilter !== 'all' ? (
                <button
                  type="button"
                  onClick={() => {
                    setExpensePayerFilter('all');
                    setExpenseCategoryFilter('all');
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#262932] bg-slate-50 dark:bg-[#1c2438] text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              ) : null}
              {canAddExpense && (
                <button
                  onClick={() => {
                    setOcrSuccessToast(null);
                    setShowScanModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <Camera className="h-4 w-4" /> บันทึกรายจ่ายแรก
                </button>
              )}
            </div>
          </div>
        ) : expenseViewMode === 'thumbnail' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredExpenses.map((exp, idx) => (
              <ExpenseThumbnailCard
                key={exp.id || idx}
                expense={exp}
                categories={categories}
                currentUserId={currentUser?.id}
                userDisplayName={userDisplayName}
                fxRate={fxRate}
                currencyView={currencyView}
                canModify={canModifyExpense(exp)}
                onOpenReceiptPreview={handleOpenReceiptPreview}
                onDeleteExpense={handleDeleteExpense}
                onSelectExpense={onSelectExpense}
                onEditExpense={onEditExpense}
                splitMembers={getSplitMembersForExp(exp.id)}
              />
            ))}
          </div>
        ) : expenseViewMode === 'compact' ? (
          <div className="divide-y divide-slate-100 dark:divide-[#262932] rounded-3xl border border-slate-200/90 dark:border-[#262932] bg-white dark:bg-[#181a20] overflow-hidden card-elevation">
            {filteredExpenses.map((exp, idx) => (
              <ExpenseCompactRow
                key={exp.id || idx}
                expense={exp}
                categories={categories}
                currentUserId={currentUser?.id}
                userDisplayName={userDisplayName}
                fxRate={fxRate}
                currencyView={currencyView}
                canModify={canModifyExpense(exp)}
                onOpenReceiptPreview={handleOpenReceiptPreview}
                onDeleteExpense={handleDeleteExpense}
                onSelectExpense={onSelectExpense}
                onEditExpense={onEditExpense}
                splitMembers={getSplitMembersForExp(exp.id)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {groupedExpensesByDate.map((group) => {
              const dayDisp = resolveDisplayCurrency(group.dayTotal, tripBaseCurrency, fxRate, currencyView);
              return (
                <div
                  key={group.dateKey}
                  className="rounded-3xl border border-slate-200/90 dark:border-[#262932] bg-white dark:bg-[#181a20] overflow-hidden card-elevation"
                >
                  <div className="px-4 py-2.5 bg-slate-50/90 dark:bg-[#121316] border-b border-slate-200/70 dark:border-[#262932] flex items-center justify-between gap-2 text-xs">
                    <div className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span>📅 {group.label}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                        {group.items.length} รายการ
                      </span>
                    </div>
                    <div className="font-mono font-black text-slate-900 dark:text-white">
                      รวม {dayDisp.primaryText}
                      {dayDisp.secondaryText && (
                        <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 ml-1">
                          {dayDisp.secondaryText}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-[#262932]">
                    {group.items.map((exp, idx) => (
                      <ExpenseCard
                        key={exp.id || idx}
                        expense={exp}
                        categories={categories}
                        currentUserId={currentUser?.id}
                        userDisplayName={userDisplayName}
                        fxRate={fxRate}
                        currencyView={currencyView}
                        canModify={canModifyExpense(exp)}
                        onOpenReceiptPreview={handleOpenReceiptPreview}
                        onDeleteExpense={handleDeleteExpense}
                        onSelectExpense={onSelectExpense}
                        onEditExpense={onEditExpense}
                        splitMembers={getSplitMembersForExp(exp.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

export default TripExpensesTab;
