// src/components/PocketMoneyWidget.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, CreditCard, Sparkles, Plus, AlertTriangle, 
  ArrowRight, DollarSign, RefreshCw, Check, Edit2, X, Store 
} from 'lucide-react';
import AnimatedNumber from '@/components/AnimatedNumber';
import { convertToThb } from '@/lib/currency';

interface PocketMoneyWidgetProps {
  tripId: string;
  currency: string;
  fxRate: number;
  expenses: any[];
  onOpenAtmRadar?: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function PocketMoneyWidget({
  tripId,
  currency = 'JPY',
  fxRate = 0.235,
  expenses = [],
  onOpenAtmRadar,
  onShowToast,
}: PocketMoneyWidgetProps) {
  // Starting Cash State (stored in LocalStorage)
  const [startingCash, setStartingCash] = useState<number>(100000);
  const [isEditingCash, setIsEditingCash] = useState(false);
  const [cashInput, setCashInput] = useState('100000');
  const [showAddCashModal, setShowAddCashModal] = useState(false);
  const [addCashAmount, setAddCashAmount] = useState('20000');

  useEffect(() => {
    if (tripId && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`trip_starting_cash_${tripId}`);
        if (saved) {
          const val = Number(saved);
          if (!isNaN(val)) {
            setStartingCash(val);
            setCashInput(val.toString());
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

  return (
    <div className="rounded-3xl border border-slate-200/90 dark:border-[#262932] bg-white dark:bg-[#181a20] p-4 sm:p-5 space-y-4 shadow-sm">
      
      {/* Widget Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-base font-bold">
            💵
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>กระเป๋าเงินสด & ช่องทางจ่ายเงิน</span>
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              แยกติดตามเงินสดในกระเป๋า vs บัตร Travel Card ชัดเจน
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddCashModal(true)}
          className="py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs flex items-center gap-1 cursor-pointer transition-all shadow-xs active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>กดตู้ ATM เพิ่ม</span>
        </button>
      </div>

      {/* 3 Wallet Overview Cards (Large & Easy to Read) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
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
            <button
              type="button"
              onClick={() => setIsEditingCash(!isEditingCash)}
              className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <Edit2 className="h-3 w-3" />
              <span>ตั้งงบ</span>
            </button>
          </div>

          <div>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-950 dark:text-emerald-100 leading-tight">
              ¥<AnimatedNumber value={remainingCash} />
            </div>
            <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300/80 mt-0.5">
              ≈ ฿<AnimatedNumber value={Math.round(convertToThb(remainingCash, currency, fxRate))} />
            </div>
          </div>

          <div className="text-[10px] text-emerald-800/80 dark:text-emerald-300/60 pt-1 border-t border-emerald-200/60 dark:border-emerald-900/30 flex justify-between">
            <span>พกมา: ¥{startingCash.toLocaleString()}</span>
            <span>จ่ายไป: ¥{cashSpent.toLocaleString()}</span>
          </div>
        </div>

        {/* Wallet 2: Travel Card (YouTrip / Planet SCB) */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
              <span>💳 บัตร Travel Card</span>
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-200">
              YouTrip / Planet
            </span>
          </div>

          <div>
            <div className="text-xl sm:text-2xl font-black font-mono text-blue-950 dark:text-blue-100 leading-tight">
              ¥<AnimatedNumber value={travelCardSpent} />
            </div>
            <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-300/80 mt-0.5">
              ≈ ฿<AnimatedNumber value={Math.round(convertToThb(travelCardSpent, currency, fxRate))} />
            </div>
          </div>

          <div className="text-[10px] text-blue-800/80 dark:text-blue-300/60 pt-1 border-t border-blue-200/60 dark:border-blue-900/30">
            <span>ยอดรูดจ่ายสะสม</span>
          </div>
        </div>

        {/* Wallet 3: Credit Card */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/40 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
              <span>💎 บัตรเครดิตสะสมแต้ม</span>
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-200">
              Point & Cash
            </span>
          </div>

          <div>
            <div className="text-xl sm:text-2xl font-black font-mono text-purple-950 dark:text-purple-100 leading-tight">
              ¥<AnimatedNumber value={creditCardSpent} />
            </div>
            <div className="text-[11px] font-semibold text-purple-700 dark:text-purple-300/80 mt-0.5">
              ≈ ฿<AnimatedNumber value={Math.round(convertToThb(creditCardSpent, currency, fxRate))} />
            </div>
          </div>

          <div className="text-[10px] text-purple-800/80 dark:text-purple-300/60 pt-1 border-t border-purple-200/60 dark:border-purple-900/30">
            <span>ยอดรูดจ่ายสะสม</span>
          </div>
        </div>

      </div>

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

      {/* Edit Starting Cash Modal / Inline Drawer */}
      {isEditingCash && (
        <form onSubmit={handleSaveStartingCash} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#15171e] border border-slate-200 dark:border-[#262932] space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-slate-800 dark:text-slate-200">
            <span>ระบุยอดเงินสดเยนที่แลกมาทั้งทริป:</span>
            <button type="button" onClick={() => setIsEditingCash(false)} className="text-slate-400">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={cashInput}
              onChange={(e) => setCashInput(e.target.value)}
              className="flex-1 p-2 rounded-xl border border-slate-300 dark:border-[#2b2f3d] bg-white dark:bg-[#181a20] text-xs font-mono font-bold outline-none"
              placeholder="100000"
            />
            <button
              type="submit"
              className="py-2 px-3 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs cursor-pointer active:scale-95"
            >
              บันทึก
            </button>
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
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddWithdrawnCash} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                  จำนวนเงินสดที่กดมาเพิ่ม ({currency})
                </label>
                <input
                  type="number"
                  required
                  value={addCashAmount}
                  onChange={(e) => setAddCashAmount(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-slate-300 dark:border-[#2b2f3d] bg-white dark:bg-[#15171e] text-lg font-mono font-black text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {[10000, 20000, 50000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAddCashAmount(amt.toString())}
                    className="py-1.5 rounded-xl border border-slate-200 dark:border-[#2b2f3d] text-xs font-bold hover:border-emerald-500 cursor-pointer"
                  >
                    +¥{amt.toLocaleString()}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 cursor-pointer transition-all active:scale-95"
              >
                ยืนยันการเติมเงินสด
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
