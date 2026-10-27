// src/components/trip-tabs/TripAnalyticsTab.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { 
  Wallet, Calculator, PieChart, Coins, Sliders, 
  ArrowRight, CheckCircle2, AlertTriangle, TrendingUp,
  Percent, ArrowUpRight, ArrowDownRight, Sparkles,
  CreditCard, Flame, Zap, Calendar,
  RefreshCw, BarChart3
} from 'lucide-react';
import { CategoryItem, CategoryBudgetMap, MemberBudgetMap } from '@/lib/categories';
import { getCatAvatar } from '@/lib/avatars';
import { CatAvatarBadge } from '@/components/CatAvatarBadge';
import { convertCurrency, convertToThb, formatExchangeRateDisplay } from '@/lib/currency';
import { SUPPORTED_CURRENCIES } from '@/components/BudgetCategoryModal';

interface TripAnalyticsTabProps {
  distinctPayers: any[];
  totalSpent: number;
  members: any[];
  memberBudgets: MemberBudgetMap;
  categories: CategoryItem[];
  categoryBudgets: CategoryBudgetMap;
  expenses: any[];
  trip: any;
  tripBaseCurrency: string;
  fxRate: number;
  targetBudget?: number;
  setShowSettlementModal: (show: boolean) => void;
  setShowBudgetCategoryModal: (show: boolean) => void;
  onOpenBudgetModalWithTab?: (tab: 'budget' | 'members' | 'categories') => void;
}

export const TripAnalyticsTab = React.memo(function TripAnalyticsTab({
  distinctPayers,
  totalSpent,
  members,
  memberBudgets,
  categories,
  categoryBudgets,
  expenses = [],
  trip,
  tripBaseCurrency,
  fxRate,
  targetBudget: propTargetBudget,
  setShowSettlementModal,
  setShowBudgetCategoryModal,
  onOpenBudgetModalWithTab,
}: TripAnalyticsTabProps) {
  // 1. Currency View State
  const [userSelectedCurrency, setUserSelectedCurrency] = useState<string | null>(null);
  const selectedCurrency = userSelectedCurrency ?? (tripBaseCurrency || 'JPY');
  const setSelectedCurrency = (curr: string) => setUserSelectedCurrency(curr);

  // Selected Day in Daily Wave Bar Chart
  const [selectedWaveDay, setSelectedWaveDay] = useState<string | null>(null);

  // Raw Target Budget
  const rawBudget = propTargetBudget !== undefined ? propTargetBudget : Number(trip?.total_budget ?? trip?.budget ?? 0);

  // Convert main totals into the selected view currency
  const convertedTotalBudget = useMemo(() => {
    return convertCurrency(rawBudget, tripBaseCurrency, selectedCurrency, fxRate);
  }, [rawBudget, tripBaseCurrency, selectedCurrency, fxRate]);

  const convertedTotalSpent = useMemo(() => {
    return convertCurrency(totalSpent, tripBaseCurrency, selectedCurrency, fxRate);
  }, [totalSpent, tripBaseCurrency, selectedCurrency, fxRate]);

  const remainingBudget = convertedTotalBudget > convertedTotalSpent ? convertedTotalBudget - convertedTotalSpent : 0;
  const overBudget = convertedTotalBudget > 0 && convertedTotalSpent > convertedTotalBudget ? convertedTotalSpent - convertedTotalBudget : 0;
  const budgetProgress = convertedTotalBudget > 0 ? Math.min(Math.round((convertedTotalSpent / convertedTotalBudget) * 100), 100) : 0;

  // Sum of category budgets
  const totalCatBudgetsInSelected = useMemo(() => {
    const rawSum = Object.values(categoryBudgets).reduce((acc, b) => acc + (Number(b) || 0), 0);
    return convertCurrency(rawSum, tripBaseCurrency, selectedCurrency, fxRate);
  }, [categoryBudgets, tripBaseCurrency, selectedCurrency, fxRate]);

  // Secondary currency preview helper (THB if JPY, JPY if THB)
  const formatSecondary = (val: number, cur: string) => {
    if (!val || isNaN(val) || val <= 0) return null;
    if (cur === 'JPY') {
      const thb = Math.round(convertToThb(val, 'JPY', fxRate));
      return `≈ ฿${thb.toLocaleString()} THB`;
    }
    if (cur === 'THB') {
      const jpy = Math.round(convertCurrency(val, 'THB', 'JPY', fxRate));
      return `≈ ¥${jpy.toLocaleString()} JPY`;
    }
    const jpy = Math.round(convertCurrency(val, cur, 'JPY', fxRate));
    const thb = Math.round(convertToThb(val, cur, fxRate));
    return `≈ ¥${jpy.toLocaleString()} (฿${thb.toLocaleString()})`;
  };

  const handleOpenBudget = (tab: 'budget' | 'members' | 'categories' = 'budget') => {
    if (onOpenBudgetModalWithTab) {
      onOpenBudgetModalWithTab(tab);
    } else {
      setShowBudgetCategoryModal(true);
    }
  };

  // ==================== DASHLET 1: DAILY BUDGET VELOCITY & SAFE RADAR ====================
  const velocityData = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const startD = trip?.start_date ? new Date(trip.start_date) : null;
    const endD = trip?.end_date ? new Date(trip.end_date) : null;

    let totalDays = 1;
    if (startD && endD) {
      const diffMs = endD.getTime() - startD.getTime();
      totalDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
    } else {
      // Fallback: estimate from unique dates in expenses or default to 10 days
      const uniqueExpenseDates = new Set(expenses.map(e => (e.date || '').split('T')[0]).filter(Boolean));
      totalDays = Math.max(1, uniqueExpenseDates.size || 10);
    }

    let elapsedDays = 1;
    let remainingDays = totalDays;

    if (startD) {
      if (now < startD) {
        // Trip hasn't started yet
        elapsedDays = 0;
        remainingDays = totalDays;
      } else if (endD && now > endD) {
        // Trip is finished
        elapsedDays = totalDays;
        remainingDays = 0;
      } else {
        // Trip is currently active
        const diffMs = now.getTime() - startD.getTime();
        elapsedDays = Math.min(totalDays, Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1));
        remainingDays = Math.max(0, totalDays - elapsedDays);
      }
    } else {
      elapsedDays = Math.max(1, Math.round(totalDays / 2));
      remainingDays = Math.max(1, totalDays - elapsedDays);
    }

    // Safe Daily Quota: Remaining Budget divided by remaining days
    const effectiveRemainingDays = Math.max(1, remainingDays);
    const safeDailyQuota = convertedTotalBudget > 0 ? Math.round(remainingBudget / effectiveRemainingDays) : 0;

    // Actual Daily Average spent so far
    const effectiveElapsedDays = Math.max(1, elapsedDays);
    const actualDailyAvg = convertedTotalSpent > 0 ? Math.round(convertedTotalSpent / effectiveElapsedDays) : 0;

    // Daily Target Quota (Original planned daily budget)
    const targetDailyQuota = convertedTotalBudget > 0 ? Math.round(convertedTotalBudget / totalDays) : 0;

    // Burn status: Safe (under target quota), Warning (within 10-20% excess), Critical (high burn)
    let burnStatus: 'safe' | 'optimal' | 'critical' = 'safe';
    let burnMessage = 'กำลังคุมงบได้ยอดเยี่ยม ช้อปสบายใจ!';
    if (convertedTotalBudget > 0) {
      if (actualDailyAvg > safeDailyQuota * 1.25 || overBudget > 0) {
        burnStatus = 'critical';
        burnMessage = 'อัตราการใช้จ่ายสูงกว่าโควตา แนะนำจำกัดงบในวันถัดไป!';
      } else if (actualDailyAvg > safeDailyQuota) {
        burnStatus = 'optimal';
        burnMessage = 'ใช้จ่ายแตะเกณฑ์โควตารายวัน อยู่ในระดับเฝ้าระวัง';
      }
    }

    return {
      totalDays,
      elapsedDays,
      remainingDays,
      safeDailyQuota,
      actualDailyAvg,
      targetDailyQuota,
      burnStatus,
      burnMessage,
    };
  }, [trip, expenses, convertedTotalBudget, convertedTotalSpent, remainingBudget, overBudget]);

  // ==================== DASHLET 2: INTERACTIVE DAILY SPENDING WAVE ====================
  interface DailyWaveItem {
    dayLabel: string;
    total: number;
    count: number;
    items: Array<{ title: string; amount: number; category: string }>;
  }

  const dailyWaveData = useMemo<{
    list: DailyWaveItem[];
    peakDay: { dayLabel: string; total: number } | null;
    maxTotal: number;
  }>(() => {
    const dayMap: Record<string, { total: number; count: number; items: any[] }> = {};

    expenses.forEach((e) => {
      let rawDate = e.date ? e.date.split('T')[0] : 'ไม่ระบุวัน';
      if (!rawDate || rawDate === 'null') rawDate = 'ไม่ระบุวัน';

      // Friendly display label
      let label = rawDate;
      if (rawDate !== 'ไม่ระบุวัน') {
        try {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            label = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
          }
        } catch {}
      }

      if (!dayMap[label]) {
        dayMap[label] = { total: 0, count: 0, items: [] };
      }

      const itemInSelected = convertCurrency(
        Number(e.amount || 0),
        e.currency || tripBaseCurrency,
        selectedCurrency,
        fxRate
      );

      dayMap[label].total += itemInSelected;
      dayMap[label].count += 1;
      dayMap[label].items.push({
        title: e.title,
        amount: itemInSelected,
        category: e.category,
      });
    });

    const list = Object.entries(dayMap).map(([dayLabel, data]) => ({
      dayLabel,
      total: Math.round(data.total),
      count: data.count,
      items: data.items.sort((a, b) => b.amount - a.amount),
    }));

    // Find peak day
    let peakDay: { dayLabel: string; total: number } | null = null;
    let maxTotal = 0;
    list.forEach((d) => {
      if (d.total > maxTotal) {
        maxTotal = d.total;
        peakDay = { dayLabel: d.dayLabel, total: d.total };
      }
    });

    return { list, peakDay, maxTotal: Math.max(1, maxTotal) };
  }, [expenses, tripBaseCurrency, selectedCurrency, fxRate]);

  // Selected Day Details
  const activeWaveDayDetail = useMemo(() => {
    if (!selectedWaveDay) return dailyWaveData.list[0] || null;
    return dailyWaveData.list.find((d) => d.dayLabel === selectedWaveDay) || dailyWaveData.list[0] || null;
  }, [selectedWaveDay, dailyWaveData]);

  // ==================== DASHLET 3: CATEGORY MATRIX & TOP DRIVER ====================
  interface TopCategoryItem {
    id: string;
    label: string;
    icon: string;
    amount: number;
    percent: number;
  }

  const categoryMatrixData = useMemo<{
    list: any[];
    topCategory: TopCategoryItem | null;
  }>(() => {
    const list = categories.map((cat) => {
      const spentInBase = expenses
        .filter((e) => e.category === cat.id)
        .reduce(
          (acc, curr) => acc + convertCurrency(Number(curr.amount || 0), curr.currency || tripBaseCurrency, tripBaseCurrency, fxRate),
          0
        );
      const spentInSelected = convertCurrency(spentInBase, tripBaseCurrency, selectedCurrency, fxRate);
      const catPercent = totalSpent > 0 ? (spentInBase / totalSpent) * 100 : 0;

      const rawCatBudget = categoryBudgets[cat.id] || 0;
      const catBudgetInSelected = convertCurrency(rawCatBudget, tripBaseCurrency, selectedCurrency, fxRate);

      return {
        ...cat,
        spentInSelected: Math.round(spentInSelected),
        catPercent: Math.round(catPercent),
        catBudgetInSelected: Math.round(catBudgetInSelected),
        rawCatBudget,
      };
    });

    let topCategory: TopCategoryItem | null = null;
    const sortedCategories = [...list].sort((a, b) => b.spentInSelected - a.spentInSelected);
    if (sortedCategories.length > 0 && sortedCategories[0].spentInSelected > 0) {
      topCategory = {
        id: sortedCategories[0].id,
        label: sortedCategories[0].label,
        icon: sortedCategories[0].icon,
        amount: sortedCategories[0].spentInSelected,
        percent: sortedCategories[0].catPercent,
      };
    }

    return { list, topCategory };
  }, [categories, expenses, categoryBudgets, totalSpent, tripBaseCurrency, selectedCurrency, fxRate]);

  // ==================== DASHLET 4: LIVE NET BALANCE & SMART DEBT MINIMIZER ====================
  const liveSettlementData = useMemo(() => {
    const memberCount = Math.max(1, members.length || distinctPayers.length || 1);
    const equalShare = convertedTotalSpent / memberCount;

    // Build balances
    const balances: Array<{ name: string; avatar: any; paid: number; net: number; isMe: boolean }> = [];

    // Ensure all members are present
    members.forEach((m) => {
      const mName = m.profiles?.display_name || m.name || 'สมาชิก';
      const mPayer = distinctPayers.find(
        (p) => p.name.toLowerCase() === mName.toLowerCase() || p.key === m.user_id || p.key === m.id
      );

      const paidInSelected = mPayer
        ? convertCurrency(mPayer.total, tripBaseCurrency, selectedCurrency, fxRate)
        : 0;

      const net = paidInSelected - equalShare;
      balances.push({
        name: mName,
        avatar: getCatAvatar(m.profiles?.avatar || mPayer?.avatar),
        paid: Math.round(paidInSelected),
        net: Math.round(net),
        isMe: Boolean(mPayer?.isMe),
      });
    });

    // If distinctPayers has people not in members array
    distinctPayers.forEach((p) => {
      if (!balances.some((b) => b.name.toLowerCase() === p.name.toLowerCase())) {
        const paidInSelected = convertCurrency(p.total, tripBaseCurrency, selectedCurrency, fxRate);
        const net = paidInSelected - equalShare;
        balances.push({
          name: p.name,
          avatar: getCatAvatar(p.avatar),
          paid: Math.round(paidInSelected),
          net: Math.round(net),
          isMe: Boolean(p.isMe),
        });
      }
    });

    // Compute optimal transfers
    const debtors = balances.filter((b) => b.net < -5).map((b) => ({ ...b, debt: Math.abs(b.net) }));
    const creditors = balances.filter((b) => b.net > 5).map((b) => ({ ...b, credit: b.net }));

    const transfers: Array<{ from: string; to: string; amount: number }> = [];
    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];
      const settleAmount = Math.min(debtor.debt, creditor.credit);

      if (settleAmount > 0) {
        transfers.push({
          from: debtor.name,
          to: creditor.name,
          amount: Math.round(settleAmount),
        });
      }

      debtor.debt -= settleAmount;
      creditor.credit -= settleAmount;

      if (debtor.debt <= 1) dIdx++;
      if (creditor.credit <= 1) cIdx++;
    }

    return { balances, transfers, equalShare: Math.round(equalShare) };
  }, [members, distinctPayers, convertedTotalSpent, tripBaseCurrency, selectedCurrency, fxRate]);

  // ==================== DASHLET 6: PAYMENT METHOD BREAKDOWN ====================
  const paymentMethodData = useMemo(() => {
    let cashTotal = 0;
    let travelCardTotal = 0;
    let creditCardTotal = 0;

    expenses.forEach((e) => {
      const amountInSelected = convertCurrency(
        Number(e.amount || 0),
        e.currency || tripBaseCurrency,
        selectedCurrency,
        fxRate
      );

      const method = (e.payment_method || '').toLowerCase();
      const title = (e.title || '').toLowerCase();

      if (method === 'travel_card' || method.includes('travel') || title.includes('youtrip') || title.includes('planet')) {
        travelCardTotal += amountInSelected;
      } else if (method === 'credit_card' || method.includes('credit')) {
        creditCardTotal += amountInSelected;
      } else {
        cashTotal += amountInSelected;
      }
    });

    const sum = cashTotal + travelCardTotal + creditCardTotal || 1;
    const cashPct = Math.round((cashTotal / sum) * 100);
    const travelCardPct = Math.round((travelCardTotal / sum) * 100);
    const creditCardPct = Math.max(0, 100 - cashPct - travelCardPct);

    return {
      cashTotal: Math.round(cashTotal),
      travelCardTotal: Math.round(travelCardTotal),
      creditCardTotal: Math.round(creditCardTotal),
      cashPct,
      travelCardPct,
      creditCardPct,
    };
  }, [expenses, tripBaseCurrency, selectedCurrency, fxRate]);

  // ==================== DASHLET 7: WHAT-IF BUDGET SIMULATOR ====================
  const [simulatedBudgetDelta, setSimulatedBudgetDelta] = useState<number>(0);

  const effectiveSimulatedBudget = Math.max(0, convertedTotalBudget + simulatedBudgetDelta);
  const simulatedRemainingBudget = effectiveSimulatedBudget > convertedTotalSpent ? effectiveSimulatedBudget - convertedTotalSpent : 0;
  const simulatedSafeDailyQuota = Math.round(simulatedRemainingBudget / Math.max(1, velocityData.remainingDays));

  const peakDay = dailyWaveData.peakDay;
  const topCategory = categoryMatrixData.topCategory;

  return (
    <div className="space-y-4 sm:space-y-6 text-left">

      {/* ==================== 1. TOP HUD: CURRENCY SWITCHER & RATE ==================== */}
      <div className="p-4 sm:p-5 rounded-3xl border border-slate-200/90 dark:border-[#262932] bg-white/95 dark:bg-[#181a20]/95 card-elevation space-y-3 text-left">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Coins className="h-4 w-4" />
            </div>
            <div className="text-left">
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white block">
                แดชบอร์ดสถิติ & สกุลเงินแสดงผล (Currency Hub)
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                เลือกสกุลเงินเพื่อคำนวณและแปลงสถิติอัตโนมัติทั้งระบบ
              </span>
            </div>
          </div>
          <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-3 py-1 rounded-xl border border-blue-200/80 dark:border-blue-900/60 font-mono shadow-2xs">
            {formatExchangeRateDisplay(selectedCurrency, fxRate)}
          </span>
        </div>

        {/* Currency Buttons Grid */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {SUPPORTED_CURRENCIES.map((cur) => {
            const isSelected = selectedCurrency === cur.code;
            return (
              <button
                key={cur.code}
                type="button"
                onClick={() => setSelectedCurrency(cur.code)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-2 ring-blue-500/30'
                    : 'bg-slate-50 dark:bg-[#1c2438] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-[#262932] hover:border-blue-400 hover:bg-white dark:hover:bg-[#262932]'
                }`}
              >
                <span className="text-sm">{cur.flag}</span>
                <span>{cur.code}</span>
                <span className={`text-[10px] font-mono ${isSelected ? 'text-white/80' : 'opacity-70'}`}>
                  ({cur.symbol})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================== 2. HERO DASHBOARD: TARGET VS ACTUAL SPENT ==================== */}
      <div className="p-5 sm:p-7 rounded-3xl border border-slate-200/90 dark:border-[#262932] bg-gradient-to-br from-blue-50/70 via-indigo-50/25 to-white dark:from-[#181a20] dark:via-[#1c2438] dark:to-[#181a20] card-elevation space-y-5 relative overflow-hidden text-left">
        {/* Deep Navy/Blue Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-left">
            <span className="text-2xl p-2 rounded-2xl bg-white/80 dark:bg-[#1c2438] shadow-sm border border-slate-200/60 dark:border-[#262932] shrink-0">🎯</span>
            <div className="text-left">
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>ภาพรวมงบประมาณ & การใช้จ่ายรวม</span>
                <Sparkles className="h-3.5 w-3.5 text-blue-500" />
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                เปรียบเทียบงบประมาณเป้าหมาย ยอดจ่ายจริง และสถานะคงเหลือ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenBudget('budget')}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/25 active:scale-95 transition-all"
            title="กำหนดหรือแก้ไขงบประมาณรวมทริป"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>กำหนดงบ ({selectedCurrency})</span>
          </button>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Target Budget */}
          <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#181a20]/90 border border-slate-200/80 dark:border-[#262932] shadow-xs space-y-1 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                {convertedTotalBudget > 0 ? 'งบประมาณรวมตั้งไว้' : 'งบรวมทริป'}
              </span>
              <span className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs">
                🎯
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight text-left">
              {convertedTotalBudget > 0 ? (
                <>
                  {convertedTotalBudget.toLocaleString(undefined, { maximumFractionDigits: 0 })}{' '}
                  <span className="text-xs font-sans text-slate-500 font-bold">{selectedCurrency}</span>
                </>
              ) : totalCatBudgetsInSelected > 0 ? (
                <div>
                  <div className="text-lg sm:text-xl text-blue-600 dark:text-blue-400 font-black">
                    ≈ {totalCatBudgetsInSelected.toLocaleString(undefined, { maximumFractionDigits: 0 })}{' '}
                    <span className="text-xs font-sans text-slate-500 font-bold">{selectedCurrency}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-sans block font-semibold">ตามหมวดหมู่</span>
                </div>
              ) : (
                <span className="text-xs font-bold text-slate-400 font-sans">ยังไม่ได้ตั้งงบ</span>
              )}
            </div>
            {convertedTotalBudget > 0 && (
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block font-mono text-left">
                {formatSecondary(convertedTotalBudget, selectedCurrency)}
              </span>
            )}
          </div>

          {/* Total Spent */}
          <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#181a20]/90 border border-slate-200/80 dark:border-[#262932] shadow-xs space-y-1 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                ใช้จ่ายไปแล้ว
              </span>
              <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs">
                💸
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 font-mono tracking-tight text-left">
              {convertedTotalSpent.toLocaleString(undefined, { maximumFractionDigits: 0 })}{' '}
              <span className="text-xs font-sans text-slate-500 font-bold">{selectedCurrency}</span>
            </div>
            {convertedTotalSpent > 0 && (
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block font-mono text-left">
                {formatSecondary(convertedTotalSpent, selectedCurrency)}
              </span>
            )}
          </div>

          {/* Remaining / Over */}
          <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#181a20]/90 border border-slate-200/80 dark:border-[#262932] shadow-xs space-y-1 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                {convertedTotalBudget > 0 ? (overBudget > 0 ? 'เกินงบประมาณ' : 'งบคงเหลือ') : 'สถานะงบทริป'}
              </span>
              <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                convertedTotalBudget > 0 
                  ? (overBudget > 0 ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400' : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400')
                  : 'bg-slate-100 dark:bg-[#1a2133] text-slate-500'
              }`}>
                {convertedTotalBudget > 0 ? (overBudget > 0 ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />) : <Sliders className="h-3.5 w-3.5" />}
              </span>
            </div>
            <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight text-left ${
              convertedTotalBudget > 0 ? (overBudget > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400') : 'text-slate-700 dark:text-slate-300'
            }`}>
              {convertedTotalBudget > 0 ? (
                <>
                  {overBudget > 0 ? `+${overBudget.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : remainingBudget.toLocaleString(undefined, { maximumFractionDigits: 0 })}{' '}
                  <span className="text-xs font-sans text-slate-500 font-bold">{selectedCurrency}</span>
                </>
              ) : (
                <span className="text-xs font-bold text-slate-400 font-sans">ยังไม่ได้ตั้งเป้างบ</span>
              )}
            </div>
            {convertedTotalBudget > 0 && (
              <span className={`text-[11px] font-black block font-mono text-left ${overBudget > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                {overBudget > 0 ? formatSecondary(overBudget, selectedCurrency) : formatSecondary(remainingBudget, selectedCurrency)}
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar with Royal Blue & Indigo Gradient */}
        {convertedTotalBudget > 0 && (
          <div className="space-y-2 pt-1 text-left">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-slate-600 dark:text-slate-300 font-bold">ความคืบหน้าการใช้งบรวม ({budgetProgress}%)</span>
              <span className={`text-sm font-black font-mono ${budgetProgress >= 100 ? 'text-rose-600' : 'text-blue-600 dark:text-blue-400'}`}>
                {budgetProgress}%
              </span>
            </div>
            <div className="w-full bg-slate-200/80 dark:bg-[#111624] rounded-full h-3 sm:h-3.5 p-0.5 overflow-hidden shadow-inner relative">
              <div
                className={`h-full rounded-full transition-all duration-700 relative overflow-hidden ${
                  budgetProgress >= 100
                    ? 'bg-gradient-to-r from-amber-500 to-rose-600'
                    : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-400 shadow-sm shadow-blue-500/50'
                }`}
                style={{ width: `${Math.min(budgetProgress, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ==================== DASHLET 1: DAILY BUDGET VELOCITY & SAFE RADAR ==================== */}
      <div className="p-5 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-[#262932] bg-white/95 dark:bg-[#181a20]/95 card-elevation space-y-4 text-left">
        <div className="flex flex-wrap items-center justify-between gap-2 text-left">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4" />
            </div>
            <div className="text-left">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                มาตรวัดความเร็ว & โควตาใช้จ่ายต่อวัน (Budget Velocity)
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                คำนวณเงินที่ใช้ได้ต่อวันที่ปลอดภัย เพื่อให้ทริปไม่เกินงบ
              </p>
            </div>
          </div>

          <span className={`px-3 py-1 rounded-full text-xs font-black border flex items-center gap-1.5 shadow-2xs ${
            velocityData.burnStatus === 'safe'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : velocityData.burnStatus === 'optimal'
              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800'
              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800'
          }`}>
            <span className="w-2 h-2 rounded-full animate-pulse bg-current" />
            <span>{velocityData.burnMessage}</span>
          </span>
        </div>

        {/* Velocity Telemetry Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-[#1c2438] border border-blue-200/70 dark:border-blue-900/40 text-left">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              โควตาปลอดภัยวันนี้
            </span>
            <div className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400 font-mono mt-0.5">
              {velocityData.safeDailyQuota > 0 ? (
                `${velocityData.safeDailyQuota.toLocaleString()} ${selectedCurrency}`
              ) : (
                'ตามสะดวก'
              )}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {formatSecondary(velocityData.safeDailyQuota, selectedCurrency) || 'ไม่จำกัด'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1c2438] border border-slate-200/80 dark:border-[#262932] text-left">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              ใช้จริงเฉลี่ย / วัน
            </span>
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
              {velocityData.actualDailyAvg.toLocaleString()} {selectedCurrency}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {formatSecondary(velocityData.actualDailyAvg, selectedCurrency)}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1c2438] border border-slate-200/80 dark:border-[#262932] text-left">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              จำนวนวันในทริป
            </span>
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
              {velocityData.totalDays} วัน
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              ผ่านไป {velocityData.elapsedDays} วัน
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1c2438] border border-slate-200/80 dark:border-[#262932] text-left">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              วันที่เหลือให้เที่ยว
            </span>
            <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
              {velocityData.remainingDays} วัน
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {velocityData.remainingDays > 0 ? 'เตรียมวางแผนให้คุ้ม' : 'จบทริปแล้ว'}
            </span>
          </div>
        </div>
      </div>

      {/* ==================== DASHLET 2: INTERACTIVE DAILY SPENDING WAVE ==================== */}
      <div className="p-5 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-[#262932] bg-white/95 dark:bg-[#181a20]/95 card-elevation space-y-4 text-left">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div className="text-left">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                คลื่นการใช้จ่ายรายวัน (Daily Spending Wave)
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                แตะที่แท่งของแต่ละวันเพื่อดูสรุปยอดและรายการใช้จ่าย
              </p>
            </div>
          </div>

          {peakDay && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs font-bold shadow-2xs">
              <Flame className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>Peak Day 🏔️ {peakDay.dayLabel} ({peakDay.total.toLocaleString()} {selectedCurrency})</span>
            </div>
          )}
        </div>

        {/* Daily Wave Bar Chart Visualizer */}
        {dailyWaveData.list.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 font-bold border border-dashed rounded-2xl border-slate-200 dark:border-[#262932]">
            ยังไม่มีรายการค่าใช้จ่ายในแต่ละวัน
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-end gap-2 overflow-x-auto pb-2 pt-6 custom-scrollbar h-48 border-b border-slate-100 dark:border-[#262932]">
              {dailyWaveData.list.map((d) => {
                const heightPct = Math.max(12, Math.round((d.total / dailyWaveData.maxTotal) * 100));
                const isPeak = peakDay?.dayLabel === d.dayLabel;
                const isSelected = activeWaveDayDetail?.dayLabel === d.dayLabel;

                return (
                  <div
                    key={d.dayLabel}
                    onClick={() => setSelectedWaveDay(d.dayLabel)}
                    className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group min-w-[56px] sm:min-w-[64px]"
                  >
                    {/* Top value badge on hover or selected */}
                    <span className={`text-[9.5px] font-mono font-bold transition-all ${
                      isSelected || isPeak
                        ? 'text-blue-600 dark:text-blue-400 font-black scale-105'
                        : 'text-slate-400 opacity-60 group-hover:opacity-100'
                    }`}>
                      {d.total > 0 ? (d.total >= 1000 ? `${(d.total / 1000).toFixed(0)}k` : d.total) : '0'}
                    </span>

                    {/* Bar Pillar */}
                    <div className="w-7 sm:w-8 h-32 bg-slate-100 dark:bg-[#1c2438] rounded-xl flex items-end p-0.5 overflow-hidden transition-all group-hover:ring-2 group-hover:ring-blue-400/50">
                      <div
                        className={`w-full rounded-lg transition-all duration-500 ${
                          isPeak
                            ? 'bg-gradient-to-t from-blue-600 via-indigo-600 to-amber-400'
                            : isSelected
                            ? 'bg-gradient-to-t from-blue-600 to-cyan-400 shadow-sm shadow-blue-500/40'
                            : 'bg-gradient-to-t from-blue-500/80 to-indigo-500/80 group-hover:from-blue-600 group-hover:to-indigo-600'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>

                    {/* Day label */}
                    <span className={`text-[10px] font-bold truncate max-w-[56px] text-center ${
                      isSelected ? 'text-blue-600 dark:text-blue-400 font-black' : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {d.dayLabel}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Selected Day Inspector Spotlight */}
            {activeWaveDayDetail && (
              <div className="p-3.5 rounded-2xl bg-blue-50/40 dark:bg-[#1c2438]/80 border border-blue-200/70 dark:border-blue-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="font-black text-slate-900 dark:text-white">
                    รายละเอียดวันที่ {activeWaveDayDetail.dayLabel}:
                  </span>
                  <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-sm">
                    {activeWaveDayDetail.total.toLocaleString()} {selectedCurrency}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ({activeWaveDayDetail.count} รายการบิล)
                  </span>
                </div>

                {activeWaveDayDetail.items.length > 0 && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                    <span className="font-bold">รายการสูงสุด:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px] sm:max-w-[200px]">
                      {activeWaveDayDetail.items[0].title}
                    </span>
                    <span className="font-mono font-black text-blue-600 dark:text-blue-400">
                      ({activeWaveDayDetail.items[0].amount.toLocaleString()} {selectedCurrency})
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ==================== 2 COLUMNS: CATEGORY MATRIX & LIVE NET BALANCE ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* ==================== DASHLET 3: CATEGORY MATRIX & TOP DRIVER ==================== */}
        <div className="p-5 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-[#262932] bg-white/95 dark:bg-[#181a20]/95 card-elevation space-y-4 text-left">
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <PieChart className="h-4 w-4" />
              </div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                สัดส่วนค่าใช้จ่ายตามหมวดหมู่
              </h3>
            </div>

            <button
              type="button"
              onClick={() => handleOpenBudget('categories')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Sliders className="h-3 w-3" />
              <span>จัดสรรงบ</span>
            </button>
          </div>

          {/* Top Spend Driver Callout */}
          {topCategory && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent border border-blue-200/80 dark:border-blue-900/40 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xl shrink-0">{topCategory.icon}</span>
                <div className="min-w-0 text-left">
                  <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 block">
                    Top Spend Driver (หมวดดูดเงินอันดับ 1) 👑
                  </span>
                  <span className="font-black text-slate-900 dark:text-white text-xs truncate block">
                    {topCategory.label} • {topCategory.percent}% ของทริป
                  </span>
                </div>
              </div>
              <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-sm shrink-0">
                {topCategory.amount.toLocaleString()} {selectedCurrency}
              </span>
            </div>
          )}

          {/* Category List */}
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
            {categoryMatrixData.list.map((cat) => (
              <div
                key={cat.id}
                className="p-3 rounded-2xl bg-slate-50/70 dark:bg-[#1c2438]/60 border border-slate-200/80 dark:border-[#262932] space-y-1.5 text-left hover:border-blue-400 transition-all"
              >
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-base p-1 rounded-lg bg-white dark:bg-[#111624] shadow-2xs border border-slate-200/60 dark:border-[#262932]">{cat.icon}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{cat.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-slate-900 dark:text-white text-sm">
                      {cat.spentInSelected.toLocaleString()} {selectedCurrency}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1.5 font-bold">
                      ({cat.catPercent}%)
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-200 dark:bg-[#111624] rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(cat.catPercent, 100)}%` }}
                  />
                </div>

                {cat.rawCatBudget > 0 && (
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400 pt-0.5 font-mono">
                    <span>งบหมวดนี้: {cat.catBudgetInSelected.toLocaleString()} {selectedCurrency}</span>
                    {cat.spentInSelected > cat.catBudgetInSelected ? (
                      <span className="text-rose-600 font-black">เกิน +{(cat.spentInSelected - cat.catBudgetInSelected).toLocaleString()} {selectedCurrency}</span>
                    ) : (
                      <span className="text-emerald-600 font-bold">เหลือ {(cat.catBudgetInSelected - cat.spentInSelected).toLocaleString()} {selectedCurrency}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ==================== DASHLET 4: LIVE NET BALANCE & SMART DEBT MINIMIZER ==================== */}
        <div className="p-5 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-[#262932] bg-white/95 dark:bg-[#181a20]/95 card-elevation space-y-4 text-left">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Wallet className="h-4 w-4" />
              </div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                สรุปยอดจ่าย & แผนผังเคลียร์เงิน (Who Paid)
              </h3>
            </div>

            <button
              onClick={() => setShowSettlementModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/25 active:scale-95 transition-all"
            >
              <Calculator className="h-3.5 w-3.5" /> เคลียร์บิล
            </button>
          </div>

          <div className="p-2.5 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-between text-xs">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
              หารเท่ากันตกคนละ:
            </span>
            <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-sm">
              ≈ {liveSettlementData.equalShare.toLocaleString()} {selectedCurrency}
            </span>
          </div>

          {/* Member Net Balance List */}
          <div className="space-y-2.5">
            {liveSettlementData.balances.map((b) => (
              <div
                key={b.name}
                className="p-3 rounded-2xl bg-slate-50/70 dark:bg-[#1c2438]/60 border border-slate-200/80 dark:border-[#262932] flex items-center justify-between gap-3 text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <CatAvatarBadge cat={b.avatar} size="sm" />
                  <div className="min-w-0 text-left">
                    <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate block">
                      {b.name} {b.isMe ? '(ฉัน)' : ''}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      จ่ายไปแล้ว {b.paid.toLocaleString()} {selectedCurrency}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {b.net > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-black font-mono">
                      <ArrowDownRight className="h-3.5 w-3.5" />
                      ได้รับคืน +{b.net.toLocaleString()}
                    </span>
                  ) : b.net < 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-black font-mono">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      ต้องโอน -{Math.abs(b.net).toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-400 font-mono">พอดี 0</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Smart Optimal Transfer Flow */}
          {liveSettlementData.transfers.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#111624] border border-slate-200/80 dark:border-[#262932] space-y-2 text-left">
              <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 block tracking-wider">
                ⚡ สเต็ปโอนเงินที่น้อยที่สุด (Optimal Transfers)
              </span>
              <div className="space-y-1.5">
                {liveSettlementData.transfers.map((t, tIdx) => (
                  <div
                    key={tIdx}
                    className="p-2 rounded-xl bg-white dark:bg-[#181a20] border border-slate-200/60 dark:border-[#262c3d] flex items-center justify-between text-xs font-bold"
                  >
                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                      <span>{t.from}</span>
                      <ArrowRight className="h-3 w-3 text-blue-500" />
                      <span>{t.to}</span>
                    </div>
                    <span className="font-mono font-black text-blue-600 dark:text-blue-400">
                      {t.amount.toLocaleString()} {selectedCurrency}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==================== DASHLET 6: PAYMENT METHOD BREAKDOWN ==================== */}
      <div className="p-5 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-[#262932] bg-white/95 dark:bg-[#181a20]/95 card-elevation space-y-4 text-left">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <CreditCard className="h-4 w-4" />
            </div>
            <div className="text-left">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                สัดส่วนการชำระเงิน (Cash vs Card vs IC Card)
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                ติดตามการใช้เงินสดและบัตร เพื่อบริหารเงินสำรองในกระเป๋า
              </p>
            </div>
          </div>
        </div>

        {/* Triple Split Bar */}
        <div className="w-full bg-slate-100 dark:bg-[#111624] h-3.5 rounded-full overflow-hidden flex p-0.5 shadow-inner">
          <div
            className="h-full bg-emerald-500 rounded-l-full transition-all"
            style={{ width: `${paymentMethodData.cashPct}%` }}
            title={`เงินสด ${paymentMethodData.cashPct}%`}
          />
          <div
            className="h-full bg-blue-600 transition-all"
            style={{ width: `${paymentMethodData.travelCardPct}%` }}
            title={`บัตร Travel Card ${paymentMethodData.travelCardPct}%`}
          />
          <div
            className="h-full bg-purple-600 rounded-r-full transition-all"
            style={{ width: `${paymentMethodData.creditCardPct}%` }}
            title={`บัตรเครดิต ${paymentMethodData.creditCardPct}%`}
          />
        </div>

        {/* Method Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-[#1c2438] border border-emerald-200/70 dark:border-emerald-900/40 text-left space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                💵 เงินสด (Cash)
              </span>
              <span className="text-xs font-black font-mono text-emerald-600">
                {paymentMethodData.cashPct}%
              </span>
            </div>
            <div className="text-lg font-black font-mono text-slate-900 dark:text-white">
              {paymentMethodData.cashTotal.toLocaleString()} {selectedCurrency}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-[#1c2438] border border-blue-200/70 dark:border-blue-900/40 text-left space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                💳 บัตร Travel Card
              </span>
              <span className="text-xs font-black font-mono text-blue-600">
                {paymentMethodData.travelCardPct}%
              </span>
            </div>
            <div className="text-lg font-black font-mono text-slate-900 dark:text-white">
              {paymentMethodData.travelCardTotal.toLocaleString()} {selectedCurrency}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-50/50 dark:bg-[#1c2438] border border-purple-200/70 dark:border-purple-900/40 text-left space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                💳 บัตรเครดิต
              </span>
              <span className="text-xs font-black font-mono text-purple-600">
                {paymentMethodData.creditCardPct}%
              </span>
            </div>
            <div className="text-lg font-black font-mono text-slate-900 dark:text-white">
              {paymentMethodData.creditCardTotal.toLocaleString()} {selectedCurrency}
            </div>
          </div>
        </div>
      </div>

      {/* ==================== DASHLET 7: WHAT-IF BUDGET SIMULATOR ==================== */}
      <div className="p-5 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-[#262932] bg-white/95 dark:bg-[#181a20]/95 card-elevation space-y-4 text-left">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Sliders className="h-4 w-4" />
            </div>
            <div className="text-left">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                เครื่องมือจำลองการปรับงบ (What-If Budget Simulator)
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                ลองเลื่อนสไลเดอร์เพื่อดูว่าการปรับงบจะส่งผลต่อเงินที่ใช้ได้ต่อวันอย่างไร
              </p>
            </div>
          </div>

          {simulatedBudgetDelta !== 0 && (
            <button
              type="button"
              onClick={() => setSimulatedBudgetDelta(0)}
              className="px-3 py-1 rounded-xl text-xs font-bold text-slate-500 hover:text-blue-600 dark:text-slate-400 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              <span>รีเซ็ต</span>
            </button>
          )}
        </div>

        {/* Live Simulator Slider */}
        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-[#1c2438] border border-slate-200/80 dark:border-[#262932] space-y-3">
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-slate-600 dark:text-slate-300">
              จำลองงบประมาณรวมใหม่:
            </span>
            <div className="text-right">
              <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-base">
                {effectiveSimulatedBudget.toLocaleString()} {selectedCurrency}
              </span>
              {simulatedBudgetDelta !== 0 && (
                <span className={`text-[11px] ml-1.5 font-bold font-mono ${simulatedBudgetDelta > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  ({simulatedBudgetDelta > 0 ? `+${simulatedBudgetDelta.toLocaleString()}` : simulatedBudgetDelta.toLocaleString()})
                </span>
              )}
            </div>
          </div>

          <input
            type="range"
            min={Math.round(-convertedTotalBudget * 0.5)}
            max={Math.round(convertedTotalBudget > 0 ? convertedTotalBudget : 200000)}
            step={1000}
            value={simulatedBudgetDelta}
            onChange={(e) => setSimulatedBudgetDelta(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />

          <div className="pt-2 border-t border-slate-200/60 dark:border-[#262c3d] flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              โควตาที่ใช้ได้ต่อวัน (ที่เหลือ {velocityData.remainingDays} วัน):
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                ≈ {simulatedSafeDailyQuota.toLocaleString()} {selectedCurrency} / วัน
              </span>
              {simulatedBudgetDelta !== 0 && (
                <span className="text-[10px] text-slate-400 font-bold">
                  ({simulatedSafeDailyQuota > velocityData.safeDailyQuota ? 'เพิ่มขึ้น +' : 'ลดลง -'}
                  {Math.abs(simulatedSafeDailyQuota - velocityData.safeDailyQuota).toLocaleString()})
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
});

export default TripAnalyticsTab;
