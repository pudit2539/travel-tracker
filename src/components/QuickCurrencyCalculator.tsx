// src/components/QuickCurrencyCalculator.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  Calculator, X, ArrowRightLeft, Sparkles, Plus, 
  Coins, DollarSign, Check, Percent, ArrowDown, ChevronRight
} from 'lucide-react';
import { getCustomJpyToThbRate, setCustomJpyToThbRate, convertCurrency, formatExchangeRateDisplay } from '@/lib/currency';

interface QuickCurrencyCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyExpense?: (amount: number, currency: string, note?: string) => void;
  defaultCurrency?: string;
  fxRate?: number;
}

const SUPPORTED_FOREIGN_CURRENCIES = [
  { code: 'JPY', name: 'เยนญี่ปุ่น', symbol: '¥' },
  { code: 'CNY', name: 'หยวนจีน', symbol: '元' },
  { code: 'USD', name: 'ดอลลาร์สหรัฐ', symbol: '$' },
  { code: 'EUR', name: 'ยูโร', symbol: '€' },
  { code: 'KRW', name: 'วอนเกาหลี', symbol: '₩' },
  { code: 'SGD', name: 'ดอลลาร์สิงคโปร์', symbol: 'S$' },
];

export default function QuickCurrencyCalculator({
  isOpen,
  onClose,
  onApplyExpense,
  defaultCurrency = 'JPY',
  fxRate: propFxRate,
}: QuickCurrencyCalculatorProps) {
  const initialCurrency = defaultCurrency === 'THB' ? 'JPY' : (defaultCurrency || 'JPY').toUpperCase();
  const [foreignCurrency, setForeignCurrency] = useState<string>(initialCurrency);
  const [inputAmount, setInputAmount] = useState<string>('1000');
  const [direction, setDirection] = useState<'foreign_to_thb' | 'thb_to_foreign'>('foreign_to_thb');
  const [fxRate, setFxRate] = useState<number>(() => propFxRate ?? getCustomJpyToThbRate());
  const [isTaxFree, setIsTaxFree] = useState<boolean>(false);
  const [editingRate, setEditingRate] = useState(false);
  const [tempRate, setTempRate] = useState(String(getCustomJpyToThbRate().toFixed(3)));

  useEffect(() => {
    if (defaultCurrency && defaultCurrency !== 'THB') {
      setForeignCurrency(defaultCurrency.toUpperCase());
    }
  }, [defaultCurrency]);

  // Body scroll lock and ESC key listener
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const activeMeta = useMemo(() => {
    return SUPPORTED_FOREIGN_CURRENCIES.find((c) => c.code === foreignCurrency) || {
      code: foreignCurrency,
      name: foreignCurrency,
      symbol: foreignCurrency,
    };
  }, [foreignCurrency]);

  const numInput = parseFloat(inputAmount) || 0;

  // Tax calculation (Japan 10% consumption tax if JPY)
  const adjustedInput = useMemo(() => {
    if (!isTaxFree || foreignCurrency !== 'JPY') return numInput;
    return direction === 'foreign_to_thb' ? Math.round(numInput / 1.1) : numInput;
  }, [numInput, isTaxFree, direction, foreignCurrency]);

  const convertedAmount = useMemo(() => {
    if (numInput <= 0) return 0;
    if (direction === 'foreign_to_thb') {
      return convertCurrency(adjustedInput, foreignCurrency, 'THB', fxRate);
    } else {
      return convertCurrency(adjustedInput, 'THB', foreignCurrency, fxRate);
    }
  }, [adjustedInput, fxRate, direction, foreignCurrency, numInput]);

  const addPreset = (addVal: number) => {
    const current = parseFloat(inputAmount) || 0;
    setInputAmount(String(current + addVal));
  };

  const handleSaveRate = () => {
    const entered = parseFloat(tempRate);
    if (!isNaN(entered) && entered > 0) {
      // If entered > 1 (e.g. 21.0), user meant per 100 JPY -> divide by 100
      const newRate = entered > 1 ? entered / 100 : entered;
      const rounded = parseFloat(newRate.toFixed(3));
      setFxRate(rounded);
      setCustomJpyToThbRate(rounded);
    }
    setEditingRate(false);
  };

  const handleTransferToExpense = () => {
    if (onApplyExpense && numInput > 0) {
      const appliedAmount = direction === 'foreign_to_thb' ? adjustedInput : Math.round(convertedAmount);
      const appliedCurrency = foreignCurrency;
      const thbEquiv = direction === 'foreign_to_thb' ? convertedAmount : numInput;
      onApplyExpense(
        appliedAmount,
        appliedCurrency,
        `แปลงเงิน ${appliedAmount.toLocaleString()} ${appliedCurrency} (≈ ฿${thbEquiv.toFixed(3)})`
      );
      onClose();
    }
  };

  if (!isOpen) return null;

  const isSmallUnit = foreignCurrency === 'USD' || foreignCurrency === 'EUR' || foreignCurrency === 'CNY' || foreignCurrency === 'SGD';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overscroll-contain overflow-x-hidden animate-in fade-in duration-200 select-none" role="dialog" aria-modal="true">
      <div className="w-full sm:max-w-md rounded-2xl sm:rounded-3xl bg-white dark:bg-[#151b2b] p-5 sm:p-6 shadow-2xl border border-slate-200/90 dark:border-[#222c42] glow-blue animate-in zoom-in-95 duration-200 space-y-4 max-h-[90dvh] overflow-y-auto overflow-x-hidden touch-pan-y overscroll-contain">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-[#222c42]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>เครื่องคิดเลขแปลงเงินด่วน</span>
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/70 px-2 py-0.5 rounded-full font-mono">
                  3 Digits
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                แปลงสกุลเงินต่างประเทศ ⇄ บาทไทย ทศนิยม 3 หลักแม่นยำ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1c2438] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Currency Switcher Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
          {SUPPORTED_FOREIGN_CURRENCIES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => {
                setForeignCurrency(c.code);
                if (c.code === 'CNY' || c.code === 'USD' || c.code === 'EUR') {
                  if (inputAmount === '1000' || inputAmount === '5000' || inputAmount === '10000') {
                    setInputAmount('100');
                  }
                }
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                foreignCurrency === c.code
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-[#1c2438] text-slate-600 dark:text-slate-300 hover:bg-slate-200 border border-slate-200/60 dark:border-[#222c42]'
              }`}
            >
              <span>{c.symbol} {c.code}</span>
            </button>
          ))}
        </div>

        {/* Exchange Rate Badge & Direction Switcher */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-100 dark:bg-[#1c2438] border border-slate-200/80 dark:border-[#222c42]">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
            <span>เรท:</span>
            {foreignCurrency === 'JPY' && editingRate ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.001"
                  className="w-20 p-1 text-xs rounded border border-blue-500 bg-white dark:bg-[#151b2b] font-black text-center font-mono"
                  value={tempRate}
                  onChange={(e) => setTempRate(e.target.value)}
                />
                <button
                  onClick={handleSaveRate}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold cursor-pointer"
                >
                  บันทึก
                </button>
              </div>
            ) : foreignCurrency === 'JPY' ? (
              <button
                onClick={() => setEditingRate(true)}
                className="underline hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer font-black font-mono"
                title="คลิกเพื่อแก้ไขเรทแลกเปลี่ยน (ทศนิยม 3 ตำแหน่ง)"
              >
                {formatExchangeRateDisplay('JPY', fxRate)} ✏️
              </button>
            ) : (
              <span className="font-black font-mono">
                {formatExchangeRateDisplay(foreignCurrency, fxRate)}
              </span>
            )}
          </div>

          <button
            onClick={() => setDirection(direction === 'foreign_to_thb' ? 'thb_to_foreign' : 'foreign_to_thb')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white dark:bg-[#151b2b] text-blue-600 dark:text-blue-400 text-xs font-black shadow-2xs hover:scale-105 transition-transform cursor-pointer border border-blue-200 dark:border-[#222c42]"
          >
            <ArrowRightLeft className="h-3 w-3" />
            <span>{direction === 'foreign_to_thb' ? `${activeMeta.code} ➔ THB` : `THB ➔ ${activeMeta.code}`}</span>
          </button>
        </div>

        {/* Main Input Box */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex justify-between">
            <span>{direction === 'foreign_to_thb' ? `ยอดเงิน (${activeMeta.code} ${activeMeta.symbol})` : 'ยอดเงินบาท (THB ฿)'}</span>
            {foreignCurrency === 'JPY' && (
              <button
                onClick={() => setIsTaxFree(!isTaxFree)}
                className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                  isTaxFree
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-[#1c2438] dark:text-slate-400 border-slate-300 dark:border-[#222c42]'
                }`}
              >
                <Percent className="h-2.5 w-2.5" />
                <span>{isTaxFree ? 'หัก Tax-Free 10% แล้ว' : 'คิดแบบ Tax-Free ญี่ปุ่น'}</span>
              </button>
            )}
          </label>

          <div className="relative">
            <input
              type="number"
              autoFocus
              placeholder="0"
              value={inputAmount}
              onChange={(e) => setInputAmount(e.target.value)}
              className="w-full text-2xl sm:text-3xl font-black p-3.5 rounded-2xl border-2 border-blue-500/70 dark:border-blue-500/80 bg-slate-50 dark:bg-[#111726] text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/20 shadow-inner"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-blue-600 dark:text-blue-400">
              {direction === 'foreign_to_thb' ? `${activeMeta.symbol} ${activeMeta.code}` : '฿ THB'}
            </span>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            <button
              onClick={() => setInputAmount('0')}
              className="px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-[#1c2438] text-slate-700 dark:text-slate-300 text-xs font-bold shrink-0 hover:bg-slate-300 cursor-pointer"
            >
              C
            </button>
            {isSmallUnit ? (
              <>
                <button
                  onClick={() => addPreset(10)}
                  className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-xs font-bold shrink-0 hover:scale-105 transition-transform cursor-pointer"
                >
                  +10
                </button>
                <button
                  onClick={() => addPreset(50)}
                  className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-xs font-bold shrink-0 hover:scale-105 transition-transform cursor-pointer"
                >
                  +50
                </button>
                <button
                  onClick={() => addPreset(100)}
                  className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-xs font-bold shrink-0 hover:scale-105 transition-transform cursor-pointer"
                >
                  +100
                </button>
                <button
                  onClick={() => addPreset(500)}
                  className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-xs font-bold shrink-0 hover:scale-105 transition-transform cursor-pointer"
                >
                  +500
                </button>
                <button
                  onClick={() => addPreset(1000)}
                  className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-xs font-bold shrink-0 hover:scale-105 transition-transform cursor-pointer"
                >
                  +1,000
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => addPreset(100)}
                  className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-xs font-bold shrink-0 hover:scale-105 transition-transform cursor-pointer"
                >
                  +100
                </button>
                <button
                  onClick={() => addPreset(500)}
                  className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-xs font-bold shrink-0 hover:scale-105 transition-transform cursor-pointer"
                >
                  +500
                </button>
                <button
                  onClick={() => addPreset(1000)}
                  className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-xs font-bold shrink-0 hover:scale-105 transition-transform cursor-pointer"
                >
                  +1,000
                </button>
                <button
                  onClick={() => addPreset(5000)}
                  className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-xs font-bold shrink-0 hover:scale-105 transition-transform cursor-pointer"
                >
                  +5,000
                </button>
                <button
                  onClick={() => addPreset(10000)}
                  className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-xs font-bold shrink-0 hover:scale-105 transition-transform cursor-pointer"
                >
                  +10,000
                </button>
              </>
            )}
          </div>
        </div>

        {/* Converted Result Display Box */}
        <div className="p-4 rounded-2xl bg-blue-50/40 dark:bg-[#1c2438] border border-blue-200/80 dark:border-[#222c42] space-y-1 text-center">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {direction === 'foreign_to_thb' ? 'คิดเป็นเงินไทยประมาณ' : `คิดเป็นเงิน${activeMeta.name}ประมาณ`}
          </span>
          <div className="text-3xl sm:text-4xl font-black text-blue-600 dark:text-blue-400 font-mono tracking-tight">
            {direction === 'foreign_to_thb' ? '฿' : activeMeta.symbol}
            {convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
          </div>
          {isTaxFree && foreignCurrency === 'JPY' && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block font-mono">
              ✨ ประหยัดภาษีไปได้ {(numInput - adjustedInput).toLocaleString()} JPY (≈ ฿{((numInput - adjustedInput) * fxRate).toFixed(3)})
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1">
          {onApplyExpense && (
            <button
              onClick={handleTransferToExpense}
              disabled={numInput <= 0}
              className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>บันทึกเป็นรายจ่ายในทริป</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="px-5 py-3 rounded-2xl border border-slate-300 dark:border-[#222c42] text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-[#1c2438] transition-colors cursor-pointer"
          >
            ปิด
          </button>
        </div>

      </div>
    </div>
  );
}
