// src/components/trip-tabs/TripAnalyticsTab.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, Calculator, PieChart, Coins, Sliders, 
  ArrowRight, CheckCircle2, AlertTriangle, TrendingUp,
  Percent, ArrowUpRight, ArrowDownRight, Edit3, Sparkles, Users
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

export function TripAnalyticsTab({
  distinctPayers,
  totalSpent,
  members,
  memberBudgets,
  categories,
  categoryBudgets,
  expenses,
  trip,
  tripBaseCurrency,
  fxRate,
  targetBudget: propTargetBudget,
  setShowSettlementModal,
  setShowBudgetCategoryModal,
  onOpenBudgetModalWithTab,
}: TripAnalyticsTabProps) {
  // Allow user to view all statistics and budgets in ANY currency (e.g. JPY, THB, USD, etc.)
  const [userSelectedCurrency, setUserSelectedCurrency] = useState<string | null>(null);
  const selectedCurrency = userSelectedCurrency ?? (tripBaseCurrency || 'JPY');
  const setSelectedCurrency = (curr: string) => setUserSelectedCurrency(curr);

  const rawBudget = propTargetBudget !== undefined ? propTargetBudget : Number(trip?.total_budget ?? trip?.budget ?? 0);

  // Convert main totals from tripBaseCurrency into the selected view currency
  const convertedTotalBudget = useMemo(() => {
    return convertCurrency(rawBudget, tripBaseCurrency, selectedCurrency, fxRate);
  }, [rawBudget, tripBaseCurrency, selectedCurrency, fxRate]);

  const convertedTotalSpent = useMemo(() => {
    return convertCurrency(totalSpent, tripBaseCurrency, selectedCurrency, fxRate);
  }, [totalSpent, tripBaseCurrency, selectedCurrency, fxRate]);

  const remainingBudget = convertedTotalBudget > convertedTotalSpent ? convertedTotalBudget - convertedTotalSpent : 0;
  const overBudget = convertedTotalBudget > 0 && convertedTotalSpent > convertedTotalBudget ? convertedTotalSpent - convertedTotalBudget : 0;
  const budgetProgress = convertedTotalBudget > 0 ? Math.min(Math.round((convertedTotalSpent / convertedTotalBudget) * 100), 100) : 0;

  // Sum of category budgets (Accommodation, Ticket, etc.)
  const totalCatBudgetsInSelected = useMemo(() => {
    const rawSum = Object.values(categoryBudgets).reduce((acc, b) => acc + (Number(b) || 0), 0);
    return convertCurrency(rawSum, tripBaseCurrency, selectedCurrency, fxRate);
  }, [categoryBudgets, tripBaseCurrency, selectedCurrency, fxRate]);

  // Secondary currency preview helper (shows THB if viewing in JPY, or JPY if viewing in THB)
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

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* ==================== 1. CURRENCY SELECTOR PILLS ==================== */}
      <div className="p-4 sm:p-5 rounded-3xl border border-slate-200/90 dark:border-[#222c42] bg-white/95 dark:bg-[#151b2b]/95 card-elevation space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Coins className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white block">
                แสดงสถิติและงบในสกุลเงิน (Currency View)
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                เลือกสกุลเงินเพื่อดูยอดแปลงอัตโนมัติแบบเรียลไทม์
              </span>
            </div>
          </div>
          <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/40 px-3 py-1 rounded-xl border border-blue-200/80 dark:border-blue-900/60 font-mono shadow-2xs">
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
                    ? 'btn-luxury-primary text-white scale-102 ring-2 ring-blue-500/30'
                    : 'bg-slate-50 dark:bg-[#1c2438] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-[#222c42] hover:border-blue-400 hover:bg-white dark:hover:bg-[#222c42]'
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

      {/* ==================== 2. TOTAL BUDGET & SPENDING OVERVIEW HERO CARD ==================== */}
      <div className="p-5 sm:p-7 rounded-3xl border border-slate-200/90 dark:border-[#222c42] bg-gradient-to-br from-blue-50/70 via-indigo-50/30 to-white dark:from-[#151b2b] dark:via-[#1c2438] dark:to-[#151b2b] card-elevation space-y-5 relative overflow-hidden">
        {/* Floating Ambient Glow */}
        <div className="absolute top-0 right-0 w-56 h-56 bg-blue-500/10 dark:bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl p-2 rounded-2xl bg-white/80 dark:bg-[#1c2438] shadow-sm border border-slate-200/60 dark:border-[#222c42]">🎯</span>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>ภาพรวมงบประมาณ & การใช้จ่าย</span>
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                เปรียบเทียบยอดใช้จ่ายจริงกับเป้าหมายงบทริป
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenBudget('budget')}
            className="btn-luxury-primary px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/25 active:scale-95"
            title="กำหนดหรือแก้ไขงบประมาณรวมทริป"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>กำหนดงบ ({selectedCurrency})</span>
          </button>
        </div>

        {/* 3 Metric Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Target Budget */}
          <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#151b2b]/90 border border-slate-200/80 dark:border-[#222c42] shadow-sm hover:shadow-md transition-all duration-200 space-y-1 relative overflow-hidden backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                {convertedTotalBudget > 0 ? 'งบประมาณรวมตั้งไว้' : 'งบรวมทริป'}
              </span>
              <span className="w-5 h-5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[11px]">
                🎯
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
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
                  <span className="text-[10px] text-slate-500 font-sans block font-semibold">ตามรายการที่พัก/ตั๋ว</span>
                </div>
              ) : (
                <span className="text-xs font-bold text-slate-400 font-sans">ยังไม่ได้ตั้งงบ (ไม่บังคับ)</span>
              )}
            </div>
            {convertedTotalBudget > 0 ? (
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block font-mono">
                {formatSecondary(convertedTotalBudget, selectedCurrency)}
              </span>
            ) : totalCatBudgetsInSelected > 0 ? (
              <span className="text-[11px] font-bold text-slate-400 block font-mono">
                {formatSecondary(totalCatBudgetsInSelected, selectedCurrency)}
              </span>
            ) : null}
          </div>

          {/* Total Spent */}
          <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#151b2b]/90 border border-slate-200/80 dark:border-[#222c42] shadow-sm hover:shadow-md transition-all duration-200 space-y-1 relative overflow-hidden backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                ใช้จ่ายไปแล้ว
              </span>
              <span className="w-5 h-5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[11px]">
                💸
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 font-mono tracking-tight">
              {convertedTotalSpent.toLocaleString(undefined, { maximumFractionDigits: 0 })}{' '}
              <span className="text-xs font-sans text-slate-500 font-bold">{selectedCurrency}</span>
            </div>
            {convertedTotalSpent > 0 && (
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block font-mono">
                {formatSecondary(convertedTotalSpent, selectedCurrency)}
              </span>
            )}
          </div>

          {/* Remaining / Over */}
          <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#151b2b]/90 border border-slate-200/80 dark:border-[#222c42] shadow-sm hover:shadow-md transition-all duration-200 space-y-1 relative overflow-hidden backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                {convertedTotalBudget > 0 ? (overBudget > 0 ? 'เกินงบประมาณ' : 'งบคงเหลือ') : 'สถานะงบทริป'}
              </span>
              <span className="w-5 h-5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[11px]">
                {convertedTotalBudget > 0 ? (overBudget > 0 ? '⚠️' : '💎') : '✨'}
              </span>
            </div>
            <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
              convertedTotalBudget > 0 ? (overBudget > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400') : 'text-slate-700 dark:text-slate-300'
            }`}>
              {convertedTotalBudget > 0 ? (
                <>
                  {overBudget > 0 ? `+${overBudget.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : remainingBudget.toLocaleString(undefined, { maximumFractionDigits: 0 })}{' '}
                  <span className="text-xs font-sans text-slate-500 font-bold">{selectedCurrency}</span>
                </>
              ) : totalCatBudgetsInSelected > 0 ? (
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 font-sans">
                  คุมตามหมวดหมู่ ✨
                </span>
              ) : (
                <span className="text-xs font-bold text-slate-400 font-sans">ทริปยืดหยุ่น ✨</span>
              )}
            </div>
            {convertedTotalBudget > 0 && (
              <span className={`text-[11px] font-black block font-mono ${overBudget > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                {overBudget > 0 ? formatSecondary(overBudget, selectedCurrency) : formatSecondary(remainingBudget, selectedCurrency)}
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar with Luxury Gradient & Shimmer */}
        {convertedTotalBudget > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-slate-600 dark:text-slate-300 font-bold">ความคืบหน้าการใช้งบ</span>
              <span className={`text-sm font-black font-mono ${budgetProgress >= 100 ? 'text-rose-600' : 'text-blue-600 dark:text-blue-400'}`}>
                {budgetProgress}%
              </span>
            </div>
            <div className="w-full bg-slate-200/80 dark:bg-[#111624] rounded-full h-3 sm:h-3.5 p-0.5 overflow-hidden shadow-inner relative">
              <div
                className={`h-full rounded-full transition-all duration-700 relative overflow-hidden ${
                  budgetProgress >= 100
                    ? 'bg-gradient-to-r from-amber-500 to-rose-600 shadow-sm shadow-rose-500/50'
                    : budgetProgress >= 80
                    ? 'bg-gradient-to-r from-blue-500 to-amber-500 shadow-sm shadow-amber-500/50'
                    : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 shadow-sm shadow-blue-500/50'
                }`}
                style={{ width: `${Math.min(budgetProgress, 100)}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-shimmer-sweep" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==================== 3. สรุปยอดจ่ายแยกตามรายคน (WHO PAID) ==================== */}
      <div className="p-4 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-[#222c42] bg-white/95 dark:bg-[#151b2b]/95 card-elevation space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Wallet className="h-4 w-4" />
            </div>
            <span>สรุปยอดจ่ายแยกตามรายคน (Who Paid)</span>
          </h2>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenBudget('members')}
              className="btn-luxury-glass px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="กำหนดงบส่วนตัวรายคน"
            >
              <Users className="h-3.5 w-3.5 text-blue-500" />
              <span>กำหนดงบรายคน</span>
            </button>

            <button
              onClick={() => setShowSettlementModal(true)}
              className="btn-luxury-primary px-4 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/25 active:scale-95"
            >
              <Calculator className="h-3.5 w-3.5" /> เคลียร์บิล
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {distinctPayers.map((p) => {
            const pCat = getCatAvatar(p.avatar);
            const sharePercent = totalSpent > 0 ? (p.total / totalSpent) * 100 : 0;
            
            const targetMemberObj = members.find(
              (m) => m.profiles?.display_name?.toLowerCase() === p.name.toLowerCase() || m.user_id === p.key
            );
            const pKey = p.isMe ? 'me' : (targetMemberObj?.user_id || targetMemberObj?.id || p.key);
            
            // Raw budget in tripBaseCurrency
            const rawPBudget = memberBudgets[pKey] || 0;

            // Convert to selectedCurrency
            const pTotalInSelected = convertCurrency(p.total, tripBaseCurrency, selectedCurrency, fxRate);
            const pBudgetInSelected = convertCurrency(rawPBudget, tripBaseCurrency, selectedCurrency, fxRate);
            const pRemainingInSelected = pBudgetInSelected > pTotalInSelected ? pBudgetInSelected - pTotalInSelected : 0;
            const pOverInSelected = pBudgetInSelected > 0 && pTotalInSelected > pBudgetInSelected ? pTotalInSelected - pBudgetInSelected : 0;

            return (
              <div key={p.key} className="p-4 rounded-2xl bg-slate-50/80 dark:bg-[#1c2438] border border-slate-200/80 dark:border-[#222c42] hover:border-blue-400 dark:hover:border-blue-600/70 transition-all duration-200 shadow-xs hover:shadow-md space-y-2.5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CatAvatarBadge cat={pCat} size="sm" />
                    <div>
                      <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate block">{p.name}</span>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                        สัดส่วน {sharePercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-sm sm:text-base text-slate-900 dark:text-white font-mono block">
                      {pTotalInSelected.toLocaleString(undefined, { maximumFractionDigits: 0 })}{' '}
                      <span className="text-xs font-sans text-slate-500 font-bold">{selectedCurrency}</span>
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold font-mono">
                      {formatSecondary(pTotalInSelected, selectedCurrency)}
                    </span>
                  </div>
                </div>

                {rawPBudget > 0 ? (
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex justify-between items-center border-t border-slate-200/70 dark:border-[#222c42] pt-2 font-mono">
                    <span>งบ: {pBudgetInSelected.toLocaleString(undefined, { maximumFractionDigits: 0 })} {selectedCurrency}</span>
                    {pOverInSelected > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 border border-rose-200 dark:border-rose-900/60 font-bold text-[10px]">
                        เกินงบ +{pOverInSelected.toLocaleString(undefined, { maximumFractionDigits: 0 })} {selectedCurrency}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 border border-emerald-200 dark:border-emerald-900/60 font-bold text-[10px]">
                        เหลือ {pRemainingInSelected.toLocaleString(undefined, { maximumFractionDigits: 0 })} {selectedCurrency}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 flex justify-between items-center border-t border-slate-200/70 dark:border-[#222c42] pt-2">
                    <span>ยังไม่กำหนดงบส่วนตัว</span>
                    <button
                      type="button"
                      onClick={() => handleOpenBudget('members')}
                      className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer text-xs"
                    >
                      + กำหนดงบ ({selectedCurrency})
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================== 4. หมวดหมู่ค่าใช้จ่าย (CATEGORY BREAKDOWN) ==================== */}
      <div className="p-4 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-[#222c42] bg-white/95 dark:bg-[#151b2b]/95 card-elevation space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <PieChart className="h-4 w-4" />
            </div>
            <span>สัดส่วนค่าใช้จ่ายตามหมวดหมู่</span>
          </h2>
          <button
            type="button"
            onClick={() => handleOpenBudget('categories')}
            className="btn-luxury-glass px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 cursor-pointer active:scale-95"
          >
            <Sliders className="h-3 w-3" />
            <span>จัดสรรงบหมวดหมู่ ({selectedCurrency})</span>
          </button>
        </div>

        <div className="space-y-3">
          {categories.map((cat) => {
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

            return (
              <div key={cat.id} className="space-y-1.5 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-[#1c2438]/50 transition-colors border border-transparent hover:border-slate-200/60 dark:hover:border-[#222c42]">
                <div className="flex justify-between text-xs font-bold">
                  <span className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <span className="text-base p-1 rounded-lg bg-white dark:bg-[#111624] shadow-2xs border border-slate-200/60 dark:border-[#222c42]">{cat.icon}</span>
                    <span className="font-black">{cat.label}</span>
                  </span>
                  <div className="text-right">
                    <span className="text-slate-900 dark:text-white font-mono font-black text-sm">
                      {spentInSelected.toLocaleString(undefined, { maximumFractionDigits: 0 })} {selectedCurrency}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1.5 font-sans font-bold">
                      ({catPercent.toFixed(0)}%)
                    </span>
                    {spentInSelected > 0 && (
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 block font-mono font-bold">
                        {formatSecondary(spentInSelected, selectedCurrency)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-full bg-slate-100 dark:bg-[#111624] rounded-full h-2.5 overflow-hidden p-0.5 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(catPercent, 100)}%` }}
                  />
                </div>

                {rawCatBudget > 0 && (
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400 pt-0.5 font-mono">
                    <span>งบหมวดนี้: {catBudgetInSelected.toLocaleString(undefined, { maximumFractionDigits: 0 })} {selectedCurrency}</span>
                    {spentInSelected > catBudgetInSelected ? (
                      <span className="text-rose-600">เกินงบ +{(spentInSelected - catBudgetInSelected).toLocaleString(undefined, { maximumFractionDigits: 0 })} {selectedCurrency}</span>
                    ) : (
                      <span className="text-emerald-600">เหลือ {(catBudgetInSelected - spentInSelected).toLocaleString(undefined, { maximumFractionDigits: 0 })} {selectedCurrency}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default TripAnalyticsTab;
