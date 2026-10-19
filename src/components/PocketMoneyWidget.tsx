// src/components/PocketMoneyWidget.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, CreditCard, Sparkles, Plus, AlertTriangle, 
  ArrowRight, DollarSign, RefreshCw, Check, Edit2, X, Store, ChevronDown, ChevronUp 
} from 'lucide-react';
import AnimatedNumber from '@/components/AnimatedNumber';
import { convertToThb } from '@/lib/currency';
import { resolveDisplayCurrency } from '@/lib/tripStatus';

interface PocketMoneyWidgetProps {
  tripId: string;
  currency: string;
  fxRate: number;
  expenses: any[];
  currencyView?: 'foreign' | 'thb';
  onOpenAtmRadar?: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function PocketMoneyWidget({
  tripId,
  currency = 'JPY',
  fxRate = 0.235,
  expenses = [],
  currencyView = 'foreign',
  onOpenAtmRadar,
  onShowToast,
}: PocketMoneyWidgetProps) {
  // Collapsible state so the Expenses tab stays clean and uncluttered by default
  const [isWalletExpanded, setIsWalletExpanded] = useState(false);

  // Starting Cash State (stored in LocalStorage)
  const [startingCash, setStartingCash] = useState<number>(100000);
  const [isEditingCash, setIsEditingCash] = useState(false);
  const [cashInput, setCashInput] = useState('100000');
  const [showAddCashModal, setShowAddCashModal] = useState(false);
  const [addCashAmount, setAddCashAmount] = useState('20000');

  // Starting Travel Card State (stored in LocalStorage)
  const [startingTravelCard, setStartingTravelCard] = useState<number>(0);
  const [isEditingTravelCard, setIsEditingTravelCard] = useState(false);
  const [travelCardInput, setTravelCardInput] = useState('0');
  const [showAddTravelCardModal, setShowAddTravelCardModal] = useState(false);
  const [addTravelCardAmount, setAddTravelCardAmount] = useState('20000');

  useEffect(() => {
    if (tripId && typeof window !== 'undefined') {
      try {
        const savedCash = localStorage.getItem(`trip_starting_cash_${tripId}`);
        if (savedCash) {
          const val = Number(savedCash);
          if (!isNaN(val)) {
            setStartingCash(val);
            setCashInput(val.toString());
          }
        }
        const savedCard = localStorage.getItem(`trip_starting_travel_card_${tripId}`);
        if (savedCard !== null) {
          const val = Number(savedCard);
          if (!isNaN(val)) {
            setStartingTravelCard(val);
            setTravelCardInput(val.toString());
          }
        }
      } catch {}
    }
  }, [tripId]);

  // Compute spending by payment method
  const { cashSpent, travelCardSpent, creditCardSpent } = useMemo(() => {
    let cash = 0;
    let card = 0;
    let credit = 0;

    expenses.forEach((e) => {
      const amount = Number(e.amount || 0);
      const method = e.payment_method || 'cash'; // default to cash if unset
      if (method === 'travel_card') {
        card += amount;
      } else if (method === 'credit_card') {
        credit += amount;
      } else {
        cash += amount;
      }
    });

    return {
      cashSpent: cash,
      travelCardSpent: card,
      creditCardSpent: credit,
    };
  }, [expenses]);

  const remainingCash = Math.max(0, startingCash - cashSpent);
  const isCashLow = remainingCash < 10000;

  const hasTravelCardBudget = startingTravelCard > 0;
  const remainingTravelCard = Math.max(0, startingTravelCard - travelCardSpent);
  const isTravelCardLow = hasTravelCardBudget && remainingTravelCard < 10000;

  const handleSaveStartingCash = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(cashInput);
    if (!isNaN(val) && val >= 0) {
      setStartingCash(val);
      setIsEditingCash(false);
      if (tripId && typeof window !== 'undefined') {
        try {
          localStorage.setItem(`trip_starting_cash_${tripId}`, val.toString());
        } catch {}
      }
      if (onShowToast) onShowToast(`อัปเดตยอดเงินสดตั้งต้นเป็น ¥${val.toLocaleString()} เรียบร้อยแล้ว`, 'success');
    }
  };

  const handleAddWithdrawnCash = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(addCashAmount);
    if (!isNaN(val) && val > 0) {
      const newTotal = startingCash + val;
      setStartingCash(newTotal);
      setCashInput(newTotal.toString());
      setShowAddCashModal(false);
      if (tripId && typeof window !== 'undefined') {
        try {
          localStorage.setItem(`trip_starting_cash_${tripId}`, newTotal.toString());
        } catch {}
      }
      if (onShowToast) onShowToast(`🎉 เพิ่มเงินสดที่กดมา +¥${val.toLocaleString()} แล้ว`, 'success');
    }
  };

  const handleSaveStartingTravelCard = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(travelCardInput);
    if (!isNaN(val) && val >= 0) {
      setStartingTravelCard(val);
      setIsEditingTravelCard(false);
      if (tripId && typeof window !== 'undefined') {
        try {
          localStorage.setItem(`trip_starting_travel_card_${tripId}`, val.toString());
        } catch {}
      }
      if (onShowToast) onShowToast(`อัปเดตยอดเงินที่แลกใส่บัตร Travel Card เป็น ¥${val.toLocaleString()} เรียบร้อยแล้ว`, 'success');
    }
  };

  const handleAddTravelCardTopup = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(addTravelCardAmount);
    if (!isNaN(val) && val > 0) {
      const newTotal = startingTravelCard + val;
      setStartingTravelCard(newTotal);
      setTravelCardInput(newTotal.toString());
      setShowAddTravelCardModal(false);
      if (tripId && typeof window !== 'undefined') {
        try {
          localStorage.setItem(`trip_starting_travel_card_${tripId}`, newTotal.toString());
        } catch {}
      }
      if (onShowToast) onShowToast(`💳 เติม/แลกเงินเข้า Travel Card เพิ่ม +¥${val.toLocaleString()} แล้ว`, 'success');
    }
  };

  const cashSummaryDisp = resolveDisplayCurrency(remainingCash, currency, fxRate, currencyView);
  const cardTargetVal = hasTravelCardBudget ? remainingTravelCard : travelCardSpent;
  const cardSummaryDisp = resolveDisplayCurrency(cardTargetVal, currency, fxRate, currencyView);
  const creditSummaryDisp = resolveDisplayCurrency(creditCardSpent, currency, fxRate, currencyView);

  return (
    <div className="rounded-3xl border border-slate-200/90 dark:border-[#262932] bg-white dark:bg-[#181a20] p-3.5 sm:p-4.5 space-y-3.5 shadow-sm transition-all">
      
      {/* Compact Summary Bar & Toggle Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={() => setIsWalletExpanded((prev) => !prev)}
          className="flex items-center gap-2.5 text-left cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-base font-bold shrink-0">
            👛
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              <span>กระเป๋าเงิน & ช่องทางชำระเงิน</span>
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#222836] text-slate-600 dark:text-slate-300">
                {isWalletExpanded ? (
                  <>ย่อเก็บ <ChevronUp className="h-3 w-3" /></>
                ) : (
                  <>จัดการกระเป๋า <ChevronDown className="h-3 w-3" /></>
                )}
              </span>
            </h3>
            {!isWalletExpanded && (
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-[11px] font-bold">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border ${
                  isCashLow
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800/60'
                }`}>
                  💵 เงินสดเหลือ {cashSummaryDisp.primarySymbol}{cashSummaryDisp.primaryAmount.toLocaleString()}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60">
                  💳 Travel Card {hasTravelCardBudget ? 'เหลือ' : 'ใช้ไป'} {cardSummaryDisp.primarySymbol}{cardSummaryDisp.primaryAmount.toLocaleString()}
                </span>
                {creditCardSpent > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/60">
                    💳 เครดิต {creditSummaryDisp.primarySymbol}{creditSummaryDisp.primaryAmount.toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>
        </button>

        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            onClick={() => setShowAddTravelCardModal(true)}
            className="py-1.5 px-2.5 sm:px-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-600 hover:text-white text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="h-3 w-3" />
            <span>แลก Travel Card</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddCashModal(true)}
            className="py-1.5 px-2.5 sm:px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-600 hover:text-white text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="h-3 w-3" />
            <span>กดตู้ ATM</span>
          </button>
        </div>
      </div>

      {/* 3 Wallet Overview Cards (Visible when expanded) */}
      {isWalletExpanded && (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-200">
        
        {/* Wallet 1: Cash in Pocket (Highlighted) */}
        <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-2 ${
          isCashLow 
            ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/60'
            : 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
              <span>💵 เงินสดในกระเป๋า</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setIsEditingCash(!isEditingCash);
                  setIsEditingTravelCard(false);
                }}
                className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-0.5 cursor-pointer px-1 py-0.5 rounded-md hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40"
              >
                <Edit2 className="h-3 w-3" />
                <span>ตั้งงบ</span>
              </button>
            </div>
          </div>

          {(() => {
            const disp = resolveDisplayCurrency(remainingCash, currency, fxRate, currencyView);
            return (
              <div>
                <div className="text-[10px] font-bold text-emerald-700/80 dark:text-emerald-300/70 mb-0.5">
                  ยอดเงินสดคงเหลือ ({disp.primaryCurrency})
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-emerald-950 dark:text-emerald-100 leading-tight">
                  {disp.primarySymbol}<AnimatedNumber value={disp.primaryAmount} />
                </div>
                <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300/80 mt-0.5">
                  ≈ {disp.secondarySymbol}<AnimatedNumber value={disp.secondaryAmount} /> {disp.secondaryCurrency} คงเหลือ
                </div>
              </div>
            );
          })()}

          <div className="text-[10px] text-emerald-800/80 dark:text-emerald-300/60 pt-1 border-t border-emerald-200/60 dark:border-emerald-900/30 flex justify-between">
            <span>พกมา: ¥{startingCash.toLocaleString()}</span>
            <span>จ่ายไป: ¥{cashSpent.toLocaleString()}</span>
          </div>
        </div>

        {/* Wallet 2: Travel Card (YouTrip / Planet SCB) */}
        <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-2 ${
          isTravelCardLow
            ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/60'
            : 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-200/80 dark:border-blue-900/40'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
              <span>💳 บัตร Travel Card</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100/80 dark:bg-blue-900/60 text-blue-700 dark:text-blue-200">
                YouTrip / Planet
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsEditingTravelCard(!isEditingTravelCard);
                  setIsEditingCash(false);
                }}
                className="text-[10px] font-bold text-blue-700 dark:text-blue-300 hover:underline flex items-center gap-0.5 cursor-pointer px-1 py-0.5 rounded-md hover:bg-blue-100/60 dark:hover:bg-blue-900/40 transition-colors"
                title="ตั้งยอดเงินที่แลกไว้ในบัตร"
              >
                <Edit2 className="h-3 w-3" />
                <span>{hasTravelCardBudget ? 'แก้ไขยอด' : 'ตั้งยอดแลก'}</span>
              </button>
            </div>
          </div>

          {(() => {
            const targetVal = hasTravelCardBudget ? remainingTravelCard : travelCardSpent;
            const disp = resolveDisplayCurrency(targetVal, currency, fxRate, currencyView);
            return (
              <div>
                <div className="text-[10px] font-bold text-blue-700/80 dark:text-blue-300/70 mb-0.5">
                  {hasTravelCardBudget ? `ยอดเงินคงเหลือในบัตร (${disp.primaryCurrency})` : `ยอดรูดจ่ายสะสม (${disp.primaryCurrency})`}
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-blue-950 dark:text-blue-100 leading-tight">
                  {disp.primarySymbol}<AnimatedNumber value={disp.primaryAmount} />
                </div>
                <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-300/80 mt-0.5">
                  ≈ {disp.secondarySymbol}<AnimatedNumber value={disp.secondaryAmount} /> {disp.secondaryCurrency}
                  {hasTravelCardBudget ? ' คงเหลือ' : ' รูดไปแล้ว'}
                </div>
              </div>
            );
          })()}

          <div className="text-[10px] text-blue-800/80 dark:text-blue-300/60 pt-1 border-t border-blue-200/60 dark:border-blue-900/30 flex justify-between items-center">
            {hasTravelCardBudget ? (
              <>
                <span>แลกไว้: ¥{startingTravelCard.toLocaleString()}</span>
                <span>รูดไป: ¥{travelCardSpent.toLocaleString()}</span>
              </>
            ) : (
              <>
                <span>ยอดรูดจ่ายสะสม</span>
                <button
                  type="button"
                  onClick={() => setIsEditingTravelCard(true)}
                  className="underline text-blue-600 dark:text-blue-400 hover:text-blue-800 cursor-pointer"
                >
                  ตั้งยอดเงินที่แลกไว้
                </button>
              </>
            )}
          </div>
        </div>

        {/* Wallet 3: Credit Card */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/40 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
              <span>💳 บัตรเครดิต</span>
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-200">
              Visa / Master / JCB
            </span>
          </div>

          {(() => {
            const disp = resolveDisplayCurrency(creditCardSpent, currency, fxRate, currencyView);
            return (
              <div>
                <div className="text-[10px] font-bold text-purple-700/80 dark:text-purple-300/70 mb-0.5">
                  ยอดรูดจ่ายสะสม ({disp.primaryCurrency})
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-purple-950 dark:text-purple-100 leading-tight">
                  {disp.primarySymbol}<AnimatedNumber value={disp.primaryAmount} />
                </div>
                <div className="text-[11px] font-semibold text-purple-700 dark:text-purple-300/80 mt-0.5">
                  ≈ {disp.secondarySymbol}<AnimatedNumber value={disp.secondaryAmount} /> {disp.secondaryCurrency}
                </div>
              </div>
            );
          })()}

          <div className="text-[10px] text-purple-800/80 dark:text-purple-300/60 pt-1 border-t border-purple-200/60 dark:border-purple-900/30 flex justify-between">
            <span>ยอดรูดรอบบิลนี้</span>
            <span>{expenses.filter(e => e.payment_method === 'credit_card').length} รายการ</span>
          </div>
        </div>

      </div>
      )}

      {/* Low Cash Warning Banner */}
      {isCashLow && (
        <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 min-w-0">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="truncate">เงินสดในกระเป๋าเหลือน้อยกว่า ¥10,000 แนะนำแวะกดตู้ ATM ครับ</span>
          </div>
          {onOpenAtmRadar && (
            <button
              type="button"
              onClick={onOpenAtmRadar}
              className="py-1 px-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shrink-0 cursor-pointer transition-all active:scale-95"
            >
              หาตู้ 7-Bank ATM
            </button>
          )}
        </div>
      )}

      {/* Low Travel Card Warning Banner */}
      {isTravelCardLow && (
        <div className="p-3 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 min-w-0">
            <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="truncate">ยอดเงินในบัตร Travel Card เหลือน้อยกว่า ¥10,000 แนะนำแลกเงินเพิ่มในแอป</span>
          </div>
          <button
            type="button"
            onClick={() => setShowAddTravelCardModal(true)}
            className="py-1 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shrink-0 cursor-pointer transition-all active:scale-95"
          >
            แลกเงินเพิ่ม
          </button>
        </div>
      )}

      {/* Edit Starting Cash Modal / Inline Drawer */}
      {isEditingCash && (
        <form onSubmit={handleSaveStartingCash} className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-[#151e18] border border-emerald-200 dark:border-emerald-900/60 space-y-2 animate-in fade-in">
          <div className="flex justify-between items-center text-xs font-bold text-emerald-950 dark:text-emerald-100">
            <span>💵 ระบุยอดเงินสดเยน ({currency}) ที่แลกพกติดตัวมาทั้งทริป:</span>
            <button type="button" onClick={() => setIsEditingCash(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">¥</span>
              <input
                type="number"
                value={cashInput}
                onChange={(e) => setCashInput(e.target.value)}
                className="w-full pl-7 pr-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-[#181a20] text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="100000"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer active:scale-95 transition-all"
            >
              บันทึก
            </button>
          </div>
        </form>
      )}

      {/* Edit Starting Travel Card Modal / Inline Drawer */}
      {isEditingTravelCard && (
        <form onSubmit={handleSaveStartingTravelCard} className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-[#151a28] border border-blue-200 dark:border-blue-900/60 space-y-2 animate-in fade-in">
          <div className="flex justify-between items-center text-xs font-bold text-blue-950 dark:text-blue-100">
            <span>💳 ระบุยอดเงินเยน ({currency}) ที่แลกใส่บัตร Travel Card (YouTrip / Planet SCB):</span>
            <button type="button" onClick={() => setIsEditingTravelCard(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">¥</span>
              <input
                type="number"
                value={travelCardInput}
                onChange={(e) => setTravelCardInput(e.target.value)}
                className="w-full pl-7 pr-3 py-2 rounded-xl border border-blue-300 dark:border-blue-800 bg-white dark:bg-[#181a20] text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="เช่น 150000"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="py-2 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer active:scale-95 transition-all"
            >
              บันทึก
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
            <span>ระบบจะนำยอดแลกนี้ไปหักลบกับรายการค่าใช้จ่ายที่จ่ายด้วย &ldquo;Travel Card&rdquo; ให้อัตโนมัติ</span>
          </div>
        </form>
      )}

      {/* Add Cash (ATM Withdrawal) Modal */}
      {showAddCashModal && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4 animate-in fade-in"
          onClick={() => setShowAddCashModal(false)}
        >
          <div 
            className="w-full max-w-sm bg-white dark:bg-[#181a20] rounded-3xl p-5 space-y-4 border border-slate-200 dark:border-[#262932] shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-[#262932]">
              <span className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>🏧 เติมเงินสด (กดตู้ ATM)</span>
              </span>
              <button
                type="button"
                onClick={() => setShowAddCashModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddWithdrawnCash} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                  จำนวนเงินสดที่กดมาเพิ่ม ({currency})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">¥</span>
                  <input
                    type="number"
                    required
                    value={addCashAmount}
                    onChange={(e) => setAddCashAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-3 rounded-2xl border border-slate-300 dark:border-[#2b2f3d] bg-white dark:bg-[#15171e] text-lg font-mono font-black text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {[10000, 20000, 50000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAddCashAmount(amt.toString())}
                    className="py-1.5 rounded-xl border border-slate-200 dark:border-[#2b2f3d] text-xs font-bold hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/40 cursor-pointer transition-colors"
                  >
                    +¥{amt.toLocaleString()}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 cursor-pointer transition-all active:scale-95"
              >
                ยืนยันการเติมเงินสด
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add / Top up Travel Card Modal */}
      {showAddTravelCardModal && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4 animate-in fade-in"
          onClick={() => setShowAddTravelCardModal(false)}
        >
          <div 
            className="w-full max-w-sm bg-white dark:bg-[#181a20] rounded-3xl p-5 space-y-4 border border-slate-200 dark:border-[#262932] shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-[#262932]">
              <span className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>💳 แลกเงินเข้า Travel Card เพิ่ม</span>
              </span>
              <button
                type="button"
                onClick={() => setShowAddTravelCardModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddTravelCardTopup} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                  จำนวนเงินเยนที่แลกใส่บัตรเพิ่มในแอป ({currency})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">¥</span>
                  <input
                    type="number"
                    required
                    value={addTravelCardAmount}
                    onChange={(e) => setAddTravelCardAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-3 rounded-2xl border border-slate-300 dark:border-[#2b2f3d] bg-white dark:bg-[#15171e] text-lg font-mono font-black text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    placeholder="20000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {[10000, 20000, 50000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAddTravelCardAmount(amt.toString())}
                    className="py-1.5 rounded-xl border border-slate-200 dark:border-[#2b2f3d] text-xs font-bold hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 cursor-pointer transition-colors"
                  >
                    +¥{amt.toLocaleString()}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer transition-all active:scale-95"
              >
                ยืนยันการเพิ่มยอดเงินในบัตร
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

