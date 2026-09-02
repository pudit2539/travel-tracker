// src/components/QuickCurrencyCalculator.tsx
'use client';

import { useState, useMemo } from 'react';
import { 
  Calculator, X, ArrowRightLeft, Sparkles, Plus, 
  Coins, DollarSign, Check, Percent, ArrowDown, ChevronRight
} from 'lucide-react';
import { getCustomJpyToThbRate, setCustomJpyToThbRate } from '@/lib/currency';

interface QuickCurrencyCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyExpense?: (amount: number, currency: string, note?: string) => void;
  defaultCurrency?: string;
}

export default function QuickCurrencyCalculator({
  isOpen,
  onClose,
  onApplyExpense,
  defaultCurrency = 'JPY',
}: QuickCurrencyCalculatorProps) {
  const [jpyAmount, setJpyAmount] = useState<string>('1000');
  const [direction, setDirection] = useState<'jpy_to_thb' | 'thb_to_jpy'>('jpy_to_thb');
  const [fxRate, setFxRate] = useState<number>(() => getCustomJpyToThbRate());
  const [isTaxFree, setIsTaxFree] = useState<boolean>(false);
  const [editingRate, setEditingRate] = useState(false);
  const [tempRate, setTempRate] = useState(String((getCustomJpyToThbRate() * 100).toFixed(2)));

  const numInput = parseFloat(jpyAmount) || 0;

  // Tax calculation (Japan 10% consumption tax)
  const adjustedInput = useMemo(() => {
    if (!isTaxFree) return numInput;
    // If tax free applied on tax-inclusive price (remove 10% tax: divide by 1.1)
    return direction === 'jpy_to_thb' ? Math.round(numInput / 1.1) : numInput;
  }, [numInput, isTaxFree, direction]);

  const convertedAmount = useMemo(() => {
    if (direction === 'jpy_to_thb') {
      return adjustedInput * fxRate;
    } else {
      return fxRate > 0 ? adjustedInput / fxRate : 0;
    }
  }, [adjustedInput, fxRate, direction]);

  const addPreset = (addVal: number) => {
    const current = parseFloat(jpyAmount) || 0;
    setJpyAmount(String(current + addVal));
  };

  const handleSaveRate = () => {
    const ratePer100 = parseFloat(tempRate);
    if (!isNaN(ratePer100) && ratePer100 > 0) {
      const newRate = ratePer100 / 100;
      setFxRate(newRate);
      setCustomJpyToThbRate(newRate);
    }
    setEditingRate(false);
  };

  const handleTransferToExpense = () => {
    if (onApplyExpense && numInput > 0) {
      onApplyExpense(
        direction === 'jpy_to_thb' ? adjustedInput : Math.round(convertedAmount),
        defaultCurrency,
        `แปลงเงิน ${adjustedInput.toLocaleString()} JPY (${convertedAmount.toFixed(2)} THB)`
      );
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#1a182d] p-5 sm:p-6 shadow-2xl border border-slate-200/90 dark:border-purple-800/60 glow-pink-purple animate-in slide-in-from-bottom duration-200 space-y-4">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-purple-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-pink-500/25">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>เครื่องคิดเลขแปลงเงินด่วน</span>
                <span className="text-[10px] font-bold text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-950 px-2 py-0.5 rounded-full">
                  Real-time
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-purple-300 font-medium">
                คำนวณเงินเยน ⇄ บาท & เช็กราคา Tax-Free ทันใจ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-purple-200 hover:bg-slate-100 dark:hover:bg-purple-950/50 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Exchange Rate Badge & Direction Switcher */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-100 dark:bg-purple-950/50 border border-slate-200/80 dark:border-purple-900/50">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-purple-200">
            <span>เรทแลกเปลี่ยน:</span>
            {editingRate ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.01"
                  className="w-16 p-1 text-xs rounded border border-pink-500 bg-white dark:bg-[#130d22] font-black text-center"
                  value={tempRate}
                  onChange={(e) => setTempRate(e.target.value)}
                />
                <button
                  onClick={handleSaveRate}
                  className="p-1 bg-pink-500 text-white rounded text-[10px] font-bold cursor-pointer"
                >
                  บันทึก
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingRate(true)}
                className="underline hover:text-pink-600 dark:hover:text-pink-400 cursor-pointer font-black"
                title="คลิกเพื่อแก้ไขเรทแลกเปลี่ยน"
              >
                100 JPY = {(fxRate * 100).toFixed(2)} THB ✏️
              </button>
            )}
          </div>

          <button
            onClick={() => setDirection(direction === 'jpy_to_thb' ? 'thb_to_jpy' : 'jpy_to_thb')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white dark:bg-[#1a182d] text-pink-600 dark:text-pink-400 text-xs font-black shadow-2xs hover:scale-105 transition-transform cursor-pointer border border-pink-200 dark:border-pink-900/60"
          >
            <ArrowRightLeft className="h-3 w-3" />
            <span>{direction === 'jpy_to_thb' ? 'JPY ➔ THB' : 'THB ➔ JPY'}</span>
          </button>
        </div>

        {/* Main Input Box */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-purple-200 flex justify-between">
            <span>{direction === 'jpy_to_thb' ? 'ยอดเงินเยน (JPY ¥)' : 'ยอดเงินบาท (THB ฿)'}</span>
            <button
              onClick={() => setIsTaxFree(!isTaxFree)}
              className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                isTaxFree
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-purple-950 dark:text-purple-400 border-slate-300'
              }`}
            >
              <Percent className="h-2.5 w-2.5" />
              <span>{isTaxFree ? 'หักภาษี Tax-Free 10% แล้ว' : 'คิดแบบ Tax-Free (ปลอดภาษี)'}</span>
            </button>
          </label>

          <div className="relative">
            <input
              type="number"
              autoFocus
              placeholder="0"
              value={jpyAmount}
              onChange={(e) => setJpyAmount(e.target.value)}
              className="w-full text-2xl sm:text-3xl font-black p-3.5 rounded-2xl border-2 border-pink-400/80 dark:border-pink-500/80 bg-slate-50 dark:bg-[#11101d] text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-pink-500/20 shadow-inner"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-pink-600 dark:text-pink-400">
              {direction === 'jpy_to_thb' ? '¥ JPY' : '฿ THB'}
            </span>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            <button
              onClick={() => setJpyAmount('0')}
              className="px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-purple-950 text-slate-700 dark:text-purple-300 text-xs font-bold shrink-0 hover:bg-slate-300 cursor-pointer"
            >
              C
            </button>
            <button
              onClick={() => addPreset(100)}
              className="px-2.5 py-1 rounded-xl bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-900 text-xs font-bold shrink-0 hover:scale-105 transition-transform cursor-pointer"
            >
              +100
            </button>
            <button
              onClick={() => addPreset(500)}
              className="px-2.5 py-1 rounded-xl bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-900 text-xs font-bold shrink-0 hover:scale-105 transition-transform cursor-pointer"
            >
              +500
            </button>
            <button
              onClick={() => addPreset(1000)}
              className="px-2.5 py-1 rounded-xl bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-900 text-xs font-bold shrink-0 hover:scale-105 transition-transform cursor-pointer"
            >
              +1,000
            </button>
            <button
              onClick={() => addPreset(5000)}
              className="px-2.5 py-1 rounded-xl bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-900 text-xs font-bold shrink-0 hover:scale-105 transition-transform cursor-pointer"
            >
              +5,000
            </button>
            <button
              onClick={() => addPreset(10000)}
              className="px-2.5 py-1 rounded-xl bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-900 text-xs font-bold shrink-0 hover:scale-105 transition-transform cursor-pointer"
            >
              +10,000
            </button>
          </div>
        </div>

        {/* Converted Result Display Box */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-500/10 via-purple-600/10 to-indigo-600/10 border border-pink-300/80 dark:border-purple-800/80 space-y-1 text-center">
          <span className="text-xs font-bold text-slate-500 dark:text-purple-300">
            {direction === 'jpy_to_thb' ? 'คิดเป็นเงินไทยประมาณ' : 'คิดเป็นเงินเยนประมาณ'}
          </span>
          <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 dark:from-pink-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
            {direction === 'jpy_to_thb' ? '฿' : '¥'}
            {convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {isTaxFree && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
              ✨ ประหยัดภาษีไปได้ {(numInput - adjustedInput).toLocaleString()} JPY (≈ ฿{((numInput - adjustedInput) * fxRate).toFixed(2)})
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1">
          {onApplyExpense && (
            <button
              onClick={handleTransferToExpense}
              disabled={numInput <= 0}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs shadow-md shadow-pink-500/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>บันทึกเป็นรายจ่ายในทริป</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="px-5 py-3 rounded-2xl border border-slate-300 dark:border-purple-800 text-slate-700 dark:text-purple-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
          >
            ปิด
          </button>
        </div>

      </div>
    </div>
  );
}
