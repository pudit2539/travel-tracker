'use client';

import React from 'react';
import { Wallet, Calculator, PieChart } from 'lucide-react';
import { CategoryItem, CategoryBudgetMap, MemberBudgetMap } from '@/lib/categories';
import { getCatAvatar } from '@/lib/avatars';
import { CatAvatarBadge } from '@/components/CatAvatarBadge';
import { convertCurrency } from '@/lib/currency';

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
  setShowSettlementModal: (show: boolean) => void;
  setShowBudgetCategoryModal: (show: boolean) => void;
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
  setShowSettlementModal,
  setShowBudgetCategoryModal,
}: TripAnalyticsTabProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* สรุปยอดจ่ายแยกตามรายคน */}
      <div className="p-4 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-[#222c42] bg-white/95 dark:bg-[#151b2b]/95 card-elevation space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" /> 
            <span>สรุปยอดจ่ายแยกตามรายคน (Who Paid)</span>
          </h2>
          <button
            onClick={() => setShowSettlementModal(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Calculator className="h-3.5 w-3.5" /> ดูการโอนเงินเคลียร์บิล
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {distinctPayers.map((p) => {
            const pCat = getCatAvatar(p.avatar);
            const sharePercent = totalSpent > 0 ? (p.total / totalSpent) * 100 : 0;
            
            const targetMemberObj = members.find(
              (m) => m.profiles?.display_name?.toLowerCase() === p.name.toLowerCase() || m.user_id === p.key
            );
            const pKey = p.isMe ? 'me' : (targetMemberObj?.user_id || targetMemberObj?.id || p.key);
            const pBudget = memberBudgets[pKey] || 0;
            const pRemaining = pBudget > p.total ? pBudget - p.total : 0;
            const pOver = pBudget > 0 && p.total > pBudget ? p.total - pBudget : 0;

            return (
              <div key={p.key} className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-[#1c2438] border border-slate-200/80 dark:border-[#222c42] space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <CatAvatarBadge cat={pCat} size="sm" />
                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                      {p.total.toLocaleString(undefined, { maximumFractionDigits: 0 })} {tripBaseCurrency}
                    </span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 block font-bold">
                      ({sharePercent.toFixed(1)}% ของทริป)
                    </span>
                  </div>
                </div>

                {pBudget > 0 && (
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex justify-between border-t border-slate-200/60 dark:border-[#222c42] pt-1.5">
                    <span>งบตั้งไว้: {pBudget.toLocaleString()} {tripBaseCurrency}</span>
                    {pOver > 0 ? (
                      <span className="text-rose-600 font-bold">เกินงบ +{pOver.toLocaleString()}</span>
                    ) : (
                      <span className="text-emerald-600 font-bold">เหลือ {pRemaining.toLocaleString()}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* หมวดหมู่ค่าใช้จ่าย */}
      <div className="p-4 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-[#222c42] bg-white/95 dark:bg-[#151b2b]/95 card-elevation space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <PieChart className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
            <span>สัดส่วนค่าใช้จ่ายตามหมวดหมู่</span>
          </h2>
          <button
            onClick={() => setShowBudgetCategoryModal(true)}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            แก้ไขงบหมวดหมู่
          </button>
        </div>

        <div className="space-y-3">
          {categories.map((cat) => {
            const spentInCat = expenses
              .filter((e) => e.category === cat.id)
              .reduce(
                (acc, curr) => acc + convertCurrency(Number(curr.amount || 0), curr.currency || tripBaseCurrency, tripBaseCurrency, fxRate),
                0
              );
            const catPercent = totalSpent > 0 ? (spentInCat / totalSpent) * 100 : 0;

            return (
              <div key={cat.id} className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-300">
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </span>
                  <div className="text-right">
                    <span className="text-slate-900 dark:text-white">
                      {spentInCat.toLocaleString(undefined, { maximumFractionDigits: 0 })} {tripBaseCurrency}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1">({catPercent.toFixed(0)}%)</span>
                  </div>
                </div>

                <div className="w-full bg-slate-100 dark:bg-[#1c2438] rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 rounded-full"
                    style={{ width: `${Math.min(catPercent, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default TripAnalyticsTab;
