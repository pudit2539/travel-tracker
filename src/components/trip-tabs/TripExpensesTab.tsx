'use client';

import React from 'react';
import { 
  Users, AlertCircle, CheckCircle2, Camera, Calculator, 
  Filter, Search, Download, Edit3, ChevronRight 
} from 'lucide-react';
import { ExpenseCard } from '@/components/trip-detail/ExpenseCard';
import AnimatedNumber from '@/components/AnimatedNumber';
import { CategoryItem } from '@/lib/categories';
import { convertCurrency, convertToThb } from '@/lib/currency';
import { getCatAvatar } from '@/lib/avatars';

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
}: TripExpensesTabProps) {
  const totalFilteredAmount = filteredExpenses.reduce(
    (acc, curr) => acc + convertCurrency(Number(curr.amount || 0), curr.currency || tripBaseCurrency, tripBaseCurrency, fxRate),
    0
  );

  return (
    <div className="space-y-4">
      {/* HERO BUDGET & QUICK ACTION CARD */}
      <div className="relative overflow-hidden rounded-3xl border border-rose-100/80 dark:border-[#323850]/80 bg-gradient-to-br from-rose-50/60 via-purple-50/30 to-indigo-50/30 dark:from-[#1b1f30] dark:via-[#222638] dark:to-[#222638] bg-white/95 dark:bg-[#222638]/95 backdrop-blur-xl card-elevation p-4 sm:p-6 md:p-7 space-y-4">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-rose-400/10 rounded-full blur-3xl pointer-events-none animate-float-slow" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none animate-float-reverse" />

        {/* Row 1: Badges & Quick Tool Pills */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-50 text-[#e06b88] dark:bg-[#e06b88]/20 dark:text-[#f7a1b5] border border-rose-200/80 dark:border-[#e06b88]/35 shadow-2xs">
              {tripBaseCurrency} Workspace
            </span>
            <span className="text-[10px] sm:text-[11px] font-bold text-[#e06b88] dark:text-[#f7a1b5] bg-rose-50 dark:bg-[#e06b88]/20 px-2 py-0.5 rounded-full border border-rose-200/80 dark:border-[#e06b88]/35 shadow-2xs">
              {tripBaseCurrency === 'CNY'
                ? `1 CNY ≈ ${convertCurrency(1, 'CNY', 'THB', fxRate).toFixed(2)} THB`
                : tripBaseCurrency === 'USD'
                ? `1 USD ≈ ${convertCurrency(1, 'USD', 'THB', fxRate).toFixed(2)} THB`
                : `100 JPY = ${(fxRate * 100).toFixed(2)} THB`}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowTravelHubModal(true)}
              className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black text-white bg-[#e06b88] hover:bg-[#d25875] px-3 py-1.5 rounded-xl shadow-md shadow-[#e06b88]/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
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
            onClick={() => setHeroBudgetView('all')}
            className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              heroBudgetView === 'all'
                ? 'bg-[#e06b88] text-white shadow-sm shadow-[#e06b88]/30 scale-105'
                : 'bg-white/80 dark:bg-[#2a2f45] text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-[#323850]'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>รวมทุกคน</span>
          </button>

          <button
            type="button"
            onClick={() => setHeroBudgetView('me')}
            className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              heroBudgetView === 'me'
                ? 'bg-[#e06b88] text-white shadow-sm shadow-[#e06b88]/30 scale-105'
                : 'bg-white/80 dark:bg-[#2a2f45] text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-[#323850]'
            }`}
          >
            <span>{userCat.emoji}</span>
            <span>ของฉัน ({userDisplayName})</span>
          </button>

          {otherMembers.map((m) => {
            const mName = m.profiles?.display_name || m.profiles?.email?.split('@')[0] || 'เพื่อน';
            const mCat = getCatAvatar(m.profiles?.avatar_id);
            const isSelected = heroBudgetView === m.user_id || heroBudgetView === m.id;

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setHeroBudgetView(m.user_id || m.id)}
                className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#e06b88] text-white shadow-sm shadow-[#e06b88]/30 scale-105'
                    : 'bg-white/80 dark:bg-[#2a2f45] text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-[#323850]'
                }`}
              >
                <span>{mCat.emoji}</span>
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
              <span className="text-[10px] sm:text-[11px] font-black text-[#e06b88] dark:text-[#f7a1b5] bg-rose-50 dark:bg-[#e06b88]/20 px-2 py-0.5 rounded-md border border-rose-200 dark:border-[#e06b88]/35">
                ⚠️ เกินงบ +<AnimatedNumber value={heroDisplayData.diff} /> {tripBaseCurrency}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-baseline gap-1 sm:gap-2 mt-0.5">
            <span className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              <AnimatedNumber value={heroDisplayData.spent} />
            </span>
            <span className="text-base sm:text-xl font-bold text-[#e06b88] dark:text-[#f497aa]">
              {tripBaseCurrency}
            </span>
            {tripBaseCurrency !== 'THB' && (
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
                className="p-0.5 text-slate-400 hover:text-[#e06b88] transition-colors cursor-pointer"
                title="ตั้งค่าเป้าหมายงบประมาณ"
              >
                <Edit3 className="h-3 w-3" />
              </button>
            </span>
          </div>

          <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-3 sm:h-3.5 p-0.5 overflow-hidden shadow-inner relative">
            <div
              className={`h-full rounded-full transition-all duration-700 relative overflow-hidden ${
                heroDisplayData.isOver
                  ? 'bg-rose-600'
                  : 'bg-[#e06b88]'
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
                ? 'bg-rose-50/80 dark:bg-[#e06b88]/15 border-rose-300 dark:border-[#e06b88]/30 text-[#e06b88] dark:text-[#f7a1b5]'
                : 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
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
              <div className="font-black text-right">
                <span>
                  <AnimatedNumber value={heroDisplayData.isOver ? heroDisplayData.diff : heroDisplayData.remaining} /> {tripBaseCurrency}
                </span>
                {tripBaseCurrency !== 'THB' && (
                  <span className="text-[10px] opacity-80 block sm:inline sm:ml-1">
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
              className="py-2.5 sm:py-3 px-2 sm:px-3 rounded-2xl bg-[#e06b88] hover:bg-[#d25875] active:bg-[#c34966] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#e06b88]/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Camera className="h-4 w-4 shrink-0" />
              <span className="truncate">บันทึกรายจ่าย AI OCR</span>
            </button>

            <button
              onClick={() => setShowSettlementModal(true)}
              className="py-2.5 sm:py-3 px-2 sm:px-3 rounded-2xl bg-white dark:bg-[#2a2f45] border border-rose-200/80 dark:border-[#323850] hover:border-rose-300 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm shadow-sm hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Calculator className="h-4 w-4 text-rose-400 shrink-0" />
              <span className="truncate">เคลียร์บิลหารเงิน</span>
            </button>

            <button
              onClick={exportExpensesToExcel}
              className="col-span-2 sm:col-span-1 py-2.5 sm:py-3 px-2 sm:px-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 hover:border-emerald-400 text-emerald-700 dark:text-emerald-300 font-bold text-xs sm:text-sm shadow-sm hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              title="ส่งออกรายการค่าใช้จ่ายทั้งหมดเป็นไฟล์ Excel (.xlsx)"
            >
              <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">Export Excel 📊</span>
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Filter Row */}
      <div className="p-3.5 rounded-3xl border border-rose-100/80 dark:border-[#323850]/80 bg-white/95 dark:bg-[#222638]/95 card-elevation space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-black text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-rose-400" />
            <span>กรองดูรายจ่ายตามผู้จ่าย:</span>
          </div>
          <div className="text-xs font-bold text-rose-600 dark:text-rose-300">
            ยอดรวมที่เลือก: {totalFilteredAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} {tripBaseCurrency}
          </div>
        </div>

        {/* Swipeable Payer Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          <button
            type="button"
            onClick={() => setExpensePayerFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
              expensePayerFilter === 'all'
                ? 'bg-[#e06b88] text-white shadow-xs scale-105'
                : 'bg-slate-100 dark:bg-[#2a2f45] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-[#323850]/60'
            }`}
          >
            👥 ทุกคน ({expenses.length})
          </button>

          <button
            type="button"
            onClick={() => setExpensePayerFilter('me')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
              expensePayerFilter === 'me'
                ? 'bg-[#e06b88] text-white shadow-xs scale-105'
                : 'bg-slate-100 dark:bg-[#2a2f45] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-[#323850]/60'
            }`}
          >
            <span>{userCat.emoji}</span>
            <span>ของฉัน ({userDisplayName})</span>
          </button>

          {otherPayers.map((p) => {
            const pCat = getCatAvatar(p.avatar);
            const isSelected = expensePayerFilter.toLowerCase() === p.key.toLowerCase() || expensePayerFilter.toLowerCase() === p.name.toLowerCase();

            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setExpensePayerFilter(p.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                  isSelected
                    ? 'bg-[#e06b88] text-white shadow-xs scale-105'
                    : 'bg-slate-100 dark:bg-[#2a2f45] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-[#323850]/60'
                }`}
              >
                <span>{pCat.emoji}</span>
                <span>{p.name}</span>
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
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-rose-100 dark:border-[#323850] bg-white/80 dark:bg-[#2a2f45] text-slate-900 dark:text-white text-xs outline-none focus:border-rose-400 font-medium"
              value={expenseSearchQuery}
              onChange={(e) => setExpenseSearchQuery(e.target.value)}
            />
          </div>

          <select
            value={expenseCategoryFilter}
            onChange={(e) => setExpenseCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-rose-100 dark:border-[#323850] bg-white/80 dark:bg-[#2a2f45] text-slate-900 dark:text-white text-xs outline-none focus:border-rose-400 font-bold cursor-pointer"
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
        <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-[#323850] rounded-3xl p-6 bg-white/60 dark:bg-[#222638]/60">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">ยังไม่มีรายการค่าใช้จ่าย</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
            กดปุ่มถ่ายรูปใบเสร็จเพื่อใช้ AI สแกนและกรอกยอดให้อัตโนมัติ หรือกดเพิ่มรายการ
          </p>
          {canAddExpense && (
            <button
              onClick={() => {
                setOcrSuccessToast(null);
                setShowScanModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#e06b88] hover:bg-[#d25875] text-white text-xs font-bold shadow-md shadow-[#e06b88]/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Camera className="h-4 w-4" /> บันทึกรายจ่ายแรก
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-rose-50 dark:divide-[#323850]/80 rounded-3xl border border-rose-100/80 dark:border-[#323850]/80 bg-white/95 dark:bg-[#222638]/95 overflow-hidden card-elevation">
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default TripExpensesTab;
