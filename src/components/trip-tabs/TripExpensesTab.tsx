'use client';

import React from 'react';
import { 
  Users, AlertCircle, CheckCircle2, Camera, Calculator, 
  Filter, Search, Download, Edit3, ChevronRight 
} from 'lucide-react';
import { ExpenseCard } from '@/components/trip-detail/ExpenseCard';
import AnimatedNumber from '@/components/AnimatedNumber';
import { CategoryItem } from '@/lib/categories';
import { convertCurrency, convertToThb, formatExchangeRateDisplay } from '@/lib/currency';
import { getCatAvatar } from '@/lib/avatars';
import { CatAvatarBadge } from '@/components/CatAvatarBadge';
import { getTripExpenseSplits } from '@/lib/expenseSplits';

interface TripExpensesTabProps {
  trip: any;
  tripBaseCurrency: string;
  fxRate: number;
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

export function TripExpensesTab({
  trip,
  tripBaseCurrency,
  fxRate,
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
  const splitsMap = React.useMemo(() => getTripExpenseSplits(trip?.id), [trip?.id, expenses]);

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

  return (
    <div className="space-y-4">
      {/* HERO BUDGET & QUICK ACTION CARD */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 dark:border-[#222c42] bg-white dark:bg-[#151b2b] card-elevation p-4 sm:p-6 md:p-7 space-y-4">
        {/* Row 1: Badges & Quick Tool Pills */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/70 dark:border-blue-900/50 shadow-2xs">
              {tripBaseCurrency} Workspace
            </span>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#1c2438] px-2.5 py-0.5 rounded-full border border-slate-200/70 dark:border-[#222c42] font-mono">
              {formatExchangeRateDisplay(tripBaseCurrency, fxRate)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowTravelHubModal(true)}
              className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-xl shadow-md shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <span>🧰 Travel Hub</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </button>
          </div>
        </div>

        {/* Row 2: Member Quick View Pills */}
        <div className="relative z-10 flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          <button
            type="button"
            onClick={() => {
              setHeroBudgetView('all');
              setExpensePayerFilter('all');
            }}
            className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              heroBudgetView === 'all'
                ? 'bg-blue-600 text-white shadow-xs scale-102'
                : 'bg-slate-100 dark:bg-[#1c2438] text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-[#222c42]'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>รวมทุกคน</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setHeroBudgetView('me');
              setExpensePayerFilter('me');
            }}
            className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              heroBudgetView === 'me'
                ? 'bg-blue-600 text-white shadow-xs scale-102'
                : 'bg-slate-100 dark:bg-[#1c2438] text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-[#222c42]'
            }`}
          >
            <CatAvatarBadge cat={userCat} size="xs" />
            <span>ของฉัน ({userDisplayName})</span>
          </button>

          {otherMembers.map((m) => {
            const mName = m.profiles?.display_name || m.profiles?.email?.split('@')[0] || 'เพื่อน';
            const mCat = getCatAvatar(m.profiles?.avatar_id);
            const mKey = m.user_id || m.id;
            const isSelected = heroBudgetView === m.user_id || heroBudgetView === m.id;

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setHeroBudgetView(mKey);
                  setExpensePayerFilter(mKey);
                }}
                className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs scale-102'
                    : 'bg-slate-100 dark:bg-[#1c2438] text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-[#222c42]'
                }`}
              >
                <CatAvatarBadge cat={mCat} size="xs" />
                <span>{mName}</span>
              </button>
            );
          })}
        </div>

        {/* Row 3: Spent Metric with Animated Counter */}
        <div className="relative z-10 pt-1">
          <div className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>{heroDisplayData.title}</span>
            {heroDisplayData.isOver && (
              <span className="text-[10px] sm:text-[11px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900/50">
                ⚠️ เกินงบ +<AnimatedNumber value={heroDisplayData.diff} /> {tripBaseCurrency}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-baseline gap-1 sm:gap-2 mt-0.5">
            <span className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
              <AnimatedNumber value={heroDisplayData.spent} />
            </span>
            <span className="text-base sm:text-xl font-bold text-blue-600 dark:text-blue-400">
              {tripBaseCurrency}
            </span>
            {tripBaseCurrency === 'THB' ? (
              <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 ml-1">
                (≈ ¥<AnimatedNumber value={Math.round(fxRate > 0 ? heroDisplayData.spent / fxRate : 0)} /> JPY)
              </span>
            ) : (
              <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 ml-1">
                (≈ ฿<AnimatedNumber value={Math.round(convertToThb(heroDisplayData.spent, tripBaseCurrency, fxRate))} />)
              </span>
            )}
          </div>
        </div>

        {/* Row 4: Progress Bar */}
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
                  <AnimatedNumber value={heroDisplayData.targetBudget} /> {tripBaseCurrency}
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

        {/* Row 5: Remaining Ribbon & Primary Action Buttons */}
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
                  <AnimatedNumber value={heroDisplayData.isOver ? heroDisplayData.diff : heroDisplayData.remaining} /> {tripBaseCurrency}
                </span>
                {tripBaseCurrency === 'THB' ? (
                  <span className="text-[10px] opacity-80 block sm:inline sm:ml-1 font-sans">
                    (≈ ¥<AnimatedNumber value={Math.round(fxRate > 0 ? (heroDisplayData.isOver ? heroDisplayData.diff : heroDisplayData.remaining) / fxRate : 0)} /> JPY)
                  </span>
                ) : (
                  <span className="text-[10px] opacity-80 block sm:inline sm:ml-1 font-sans">
                    (≈ ฿<AnimatedNumber value={Math.round(convertToThb((heroDisplayData.isOver ? heroDisplayData.diff : heroDisplayData.remaining), tripBaseCurrency, fxRate))} />)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons: AI OCR + Settlement + 1-Click Excel Export */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            <button
              onClick={() => {
                setOcrSuccessToast(null);
                setShowScanModal(true);
              }}
              disabled={!canAddExpense}
              className="py-2.5 sm:py-3 px-2 sm:px-3 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Camera className="h-4 w-4 shrink-0" />
              <span className="truncate">บันทึกรายจ่าย AI OCR</span>
            </button>

            <button
              onClick={() => setShowSettlementModal(true)}
              className="py-2.5 sm:py-3 px-2 sm:px-3 rounded-2xl bg-white dark:bg-[#1c2438] border border-slate-200 dark:border-[#222c42] hover:border-blue-400 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm shadow-2xs hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Calculator className="h-4 w-4 text-blue-500 shrink-0" />
              <span className="truncate">เคลียร์บิลหารเงิน</span>
            </button>

            <button
              onClick={exportExpensesToExcel}
              className="col-span-2 sm:col-span-1 py-2.5 sm:py-3 px-2 sm:px-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 hover:border-emerald-400 text-emerald-700 dark:text-emerald-300 font-bold text-xs sm:text-sm shadow-2xs hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              title="ส่งออกรายการค่าใช้จ่ายทั้งหมดเป็นไฟล์ Excel (.xlsx)"
            >
              <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">Export Excel 📊</span>
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Filter Row (Trip.com style) */}
      <div className="p-3.5 rounded-3xl border border-slate-200/90 dark:border-[#222c42] bg-white dark:bg-[#151b2b] card-elevation space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="text-xs font-black text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-blue-500" />
              <span>กรองตามคนร่วมหาร:</span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              (ดูรายการที่แต่ละคนร่วมแชร์)
            </span>
          </div>

          <div className="text-right font-mono">
            <div className="text-xs font-black text-blue-600 dark:text-blue-400">
              {expensePayerFilter === 'all' ? (
                <>
                  <span>ยอดรวมทั้งทริป: {Math.round(totalFilteredAmount).toLocaleString()} {tripBaseCurrency}</span>
                  <span className="font-normal text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px] ml-1">
                    (≈ {tripBaseCurrency === 'THB' 
                      ? `¥${Math.round(fxRate > 0 ? totalFilteredAmount / fxRate : 0).toLocaleString()}` 
                      : `฿${Math.round(convertToThb(totalFilteredAmount, tripBaseCurrency, fxRate)).toLocaleString()}`})
                  </span>
                </>
              ) : (
                <>
                  <span>ยอดแชร์ของ {selectedFilterName}: {Math.round(totalFilteredAmount).toLocaleString()} {tripBaseCurrency}</span>
                  <span className="font-normal text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px] ml-1">
                    (≈ {tripBaseCurrency === 'THB' 
                      ? `¥${Math.round(fxRate > 0 ? totalFilteredAmount / fxRate : 0).toLocaleString()}` 
                      : `฿${Math.round(convertToThb(totalFilteredAmount, tripBaseCurrency, fxRate)).toLocaleString()}`})
                  </span>
                </>
              )}
            </div>
            {expensePayerFilter !== 'all' && (
              <div className="text-[10px] text-slate-400 font-sans">
                (ยอดบิลเต็มรวม {Math.round(fullTripAmount).toLocaleString()} {tripBaseCurrency}{' '}
                {tripBaseCurrency === 'THB' 
                  ? `≈ ¥${Math.round(fxRate > 0 ? fullTripAmount / fxRate : 0).toLocaleString()}` 
                  : `≈ ฿${Math.round(convertToThb(fullTripAmount, tripBaseCurrency, fxRate)).toLocaleString()}`})
              </div>
            )}
          </div>
        </div>

        {/* Swipeable Filter Chips */}
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
                : 'bg-slate-100 dark:bg-[#1c2438] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-[#222c42]'
            }`}
          >
            📋 ทั้งหมด ({expenses.length} รายการ)
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
                : 'bg-slate-100 dark:bg-[#1c2438] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-[#222c42]'
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
                    : 'bg-slate-100 dark:bg-[#1c2438] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-[#222c42]'
                }`}
              >
                <CatAvatarBadge cat={pCat} size="xs" />
                <span>{p.name} ({p.sharedCount})</span>
              </button>
            );
          })}
        </div>

        {/* Search & Category Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหารายการ, ร้านค้า..."
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#111624] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-500 font-medium"
              value={expenseSearchQuery}
              onChange={(e) => setExpenseSearchQuery(e.target.value)}
            />
          </div>

          <select
            value={expenseCategoryFilter}
            onChange={(e) => setExpenseCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#111624] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-500 font-bold cursor-pointer"
          >
            <option value="all">📁 ทุกหมวดหมู่</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses List */}
      {filteredExpenses.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-[#222c42] rounded-3xl p-6 bg-white dark:bg-[#151b2b]">
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
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer"
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
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-[#222c42] rounded-3xl border border-slate-200/90 dark:border-[#222c42] bg-white dark:bg-[#151b2b] overflow-hidden card-elevation">
          {filteredExpenses.map((exp, idx) => (
            <ExpenseCard
              key={exp.id || idx}
              expense={exp}
              categories={categories}
              currentUserId={currentUser?.id}
              userDisplayName={userDisplayName}
              fxRate={fxRate}
              canAddExpense={canAddExpense}
              onOpenReceiptPreview={handleOpenReceiptPreview}
              onDeleteExpense={handleDeleteExpense}
              onSelectExpense={onSelectExpense}
              onEditExpense={onEditExpense}
              splitMembers={getSplitMembersForExp(exp.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default TripExpensesTab;
