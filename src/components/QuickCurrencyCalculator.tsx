// src/components/QuickCurrencyCalculator.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  X, ArrowRightLeft, Sparkles, Plus, 
  Coins, Check, Percent, Store, CreditCard, Wallet, Users, User, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { getCustomJpyToThbRate, setCustomJpyToThbRate, convertCurrency, formatExchangeRateDisplay } from '@/lib/currency';
import { supabase } from '@/lib/supabase';
import { setExpensePaymentMethod, PaymentMethod } from '@/lib/paymentMethods';
import { setExpenseSplitMembers } from '@/lib/expenseSplits';

interface MemberInfo {
  id: string;
  name: string;
  avatar?: string;
  isCurrentUser?: boolean;
}

interface QuickCurrencyCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyExpense?: (amount: number, currency: string, note?: string) => void;
  defaultCurrency?: string;
  fxRate?: number;
  tripId?: string;
  currentUser?: any;
  userDisplayName?: string;
  userProfile?: any;
  allMembers?: MemberInfo[];
  onExpenseLogged?: () => void;
}

const SUPPORTED_FOREIGN_CURRENCIES = [
  { code: 'JPY', name: 'เยนญี่ปุ่น', symbol: '¥' },
  { code: 'CNY', name: 'หยวนจีน', symbol: '元' },
  { code: 'USD', name: 'ดอลลาร์สหรัฐ', symbol: '$' },
  { code: 'EUR', name: 'ยูโร', symbol: '€' },
  { code: 'KRW', name: 'วอนเกาหลี', symbol: '₩' },
  { code: 'SGD', name: 'ดอลลาร์สิงคโปร์', symbol: 'S$' },
];

const SHOPPING_PRESETS = [
  { label: 'Yodobashi Camera', icon: '🏬', defaultTax: '10' as const, category: 'shopping' },
  { label: 'ดองกี้ (Donki)', icon: '🐧', defaultTax: '10' as const, category: 'shopping' },
  { label: 'Bic Camera', icon: '📷', defaultTax: '10' as const, category: 'shopping' },
  { label: 'Matsumoto Kiyoshi', icon: '💊', defaultTax: '10' as const, category: 'shopping' },
  { label: 'UNIQLO / GU', icon: '👕', defaultTax: '10' as const, category: 'shopping' },
  { label: 'Pokemon Center', icon: '⚡', defaultTax: '10' as const, category: 'shopping' },
  { label: 'Denden Town / อนิเมะ', icon: '🤖', defaultTax: '10' as const, category: 'shopping' },
  { label: 'ร้านสะดวกซื้อ (Conbini)', icon: '🏪', defaultTax: '8' as const, category: 'food' },
  { label: 'ขนม / คาเฟ่', icon: '☕', defaultTax: '8' as const, category: 'food' },
];

export default function QuickCurrencyCalculator({
  isOpen,
  onClose,
  onApplyExpense,
  defaultCurrency = 'JPY',
  fxRate: propFxRate,
  tripId,
  currentUser,
  userDisplayName,
  userProfile,
  allMembers = [],
  onExpenseLogged,
}: QuickCurrencyCalculatorProps) {
  const initialCurrency = defaultCurrency === 'THB' ? 'JPY' : (defaultCurrency || 'JPY').toUpperCase();
  const [foreignCurrency, setForeignCurrency] = useState<string>(initialCurrency);
  const [inputAmount, setInputAmount] = useState<string>('5500');
  const [direction, setDirection] = useState<'foreign_to_thb' | 'thb_to_foreign'>('foreign_to_thb');
  const [fxRate, setFxRate] = useState<number>(() => propFxRate ?? getCustomJpyToThbRate());
  
  // Tax-Free Mode: 'none' | '10' (general items) | '8' (food/consumables)
  const [taxMode, setTaxMode] = useState<'none' | '10' | '8'>('10');
  const [editingRate, setEditingRate] = useState(false);
  const [tempRate, setTempRate] = useState(String((propFxRate ?? getCustomJpyToThbRate()).toFixed(3)));

  // Quick Expense Fields
  const [itemTitle, setItemTitle] = useState<string>('ช้อปปิ้ง Tax-Free');
  const [selectedCategory, setSelectedCategory] = useState<string>('shopping');
  const [splitMode, setSplitMode] = useState<'me_only' | 'all'>('me_only');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('travel_card');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentlySaved, setRecentlySaved] = useState<string | null>(null);

  useEffect(() => {
    if (defaultCurrency && defaultCurrency !== 'THB') {
      setForeignCurrency(defaultCurrency.toUpperCase());
    }
  }, [defaultCurrency]);

  useEffect(() => {
    if (propFxRate) {
      setFxRate(propFxRate);
      setTempRate(String(propFxRate.toFixed(3)));
    }
  }, [propFxRate]);

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

  // Tax-Free Calculation
  // If user enters label price with tax, calculating net tax-free price:
  // 10% tax: amount / 1.10
  // 8% tax: amount / 1.08
  const adjustedInput = useMemo(() => {
    if (foreignCurrency !== 'JPY') return numInput;
    if (taxMode === '10') {
      return direction === 'foreign_to_thb' ? Math.round(numInput / 1.1) : numInput;
    }
    if (taxMode === '8') {
      return direction === 'foreign_to_thb' ? Math.round(numInput / 1.08) : numInput;
    }
    return numInput;
  }, [numInput, taxMode, direction, foreignCurrency]);

  const savedTaxAmount = useMemo(() => {
    if (foreignCurrency !== 'JPY' || taxMode === 'none') return 0;
    return Math.max(0, numInput - adjustedInput);
  }, [numInput, adjustedInput, foreignCurrency, taxMode]);

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

  const handleSelectPreset = (preset: typeof SHOPPING_PRESETS[0]) => {
    setItemTitle(preset.label);
    setTaxMode(preset.defaultTax);
    setSelectedCategory(preset.category);
  };

  const handleSaveRate = () => {
    const entered = parseFloat(tempRate);
    if (!isNaN(entered) && entered > 0) {
      const newRate = entered > 1 ? entered / 100 : entered;
      const rounded = parseFloat(newRate.toFixed(3));
      setFxRate(rounded);
      setCustomJpyToThbRate(rounded);
    }
    setEditingRate(false);
  };

  // Direct 1-Click Save to Supabase
  const handleDirectSaveExpense = async () => {
    if (!tripId || numInput <= 0) return;

    setIsSubmitting(true);
    try {
      const finalAmount = direction === 'foreign_to_thb' ? adjustedInput : Math.round(convertedAmount);
      const finalCurrency = foreignCurrency;
      const currentUserId = currentUser?.id || 'unknown';
      const payerName = userDisplayName || userProfile?.name || currentUser?.email?.split('@')[0] || 'สมาชิก';
      const payerAvatar = userProfile?.avatar || currentUser?.user_metadata?.avatar_url || '';

      const rowToInsert: Record<string, any> = {
        trip_id: tripId,
        title: itemTitle.trim() || `ช้อปปิ้ง ${finalCurrency} (Tax-Free)`,
        amount: finalAmount,
        currency: finalCurrency,
        category: selectedCategory || 'shopping',
        receipt_url: null,
        spent_at: new Date().toISOString().split('T')[0],
        payer_id: currentUserId,
        payer_name: payerName,
        payer_avatar: payerAvatar,
        payment_method: paymentMethod,
      };

      let insertedId = '';
      const { data: insertedRows, error: insertError } = await supabase
        .from('expenses')
        .insert([rowToInsert])
        .select();

      if (insertError) {
        // Fallback if payment_method column is not yet on expenses schema directly
        const { payment_method: _, ...fallbackRow } = rowToInsert;
        const { data: fbRows, error: fbError } = await supabase
          .from('expenses')
          .insert([fallbackRow])
          .select();
        if (fbError) throw fbError;
        if (fbRows && fbRows[0]) {
          insertedId = fbRows[0].id;
        }
      } else if (insertedRows && insertedRows[0]) {
        insertedId = insertedRows[0].id;
      }

      if (insertedId) {
        // Save payment method and split metadata (syncs to Supabase trip metadata)
        setExpensePaymentMethod(tripId, insertedId, paymentMethod);

        const finalSplit = splitMode === 'me_only'
          ? [currentUserId]
          : (allMembers && allMembers.length > 0 ? allMembers.map((m) => m.id) : [currentUserId]);

        setExpenseSplitMembers(tripId, insertedId, finalSplit);
      }

      // Success feedback
      const splitText = splitMode === 'me_only' ? '👤 ของฉันคนเดียว' : `👥 หารทุกคน (${allMembers.length} คน)`;
      const thbEquiv = (direction === 'foreign_to_thb' ? convertedAmount : numInput).toFixed(2);
      toast.success(`บันทึกแล้ว! ฿${thbEquiv} (${splitText}) ✨`);
      setRecentlySaved(`${itemTitle} — ${finalAmount.toLocaleString()} ${finalCurrency}`);

      if (onExpenseLogged) {
        onExpenseLogged();
      }

      // Keep dialog open with fresh state for next item or auto-close after 1.5s
      setTimeout(() => {
        setRecentlySaved(null);
      }, 3000);

    } catch (err: any) {
      console.error('Failed to quick-save expense:', err);
      toast.error('บันทึกไม่สำเร็จ: ' + (err?.message || 'เกิดข้อผิดพลาด'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransferToFullForm = () => {
    if (onApplyExpense && numInput > 0) {
      const appliedAmount = direction === 'foreign_to_thb' ? adjustedInput : Math.round(convertedAmount);
      const appliedCurrency = foreignCurrency;
      const thbEquiv = direction === 'foreign_to_thb' ? convertedAmount : numInput;
      onApplyExpense(
        appliedAmount,
        appliedCurrency,
        `${itemTitle} (≈ ฿${thbEquiv.toFixed(2)})`
      );
      onClose();
    }
  };

  if (!isOpen) return null;

  const isSmallUnit = foreignCurrency === 'USD' || foreignCurrency === 'EUR' || foreignCurrency === 'CNY' || foreignCurrency === 'SGD';

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overscroll-contain overflow-x-hidden animate-in fade-in duration-200 select-none modal-safe-overlay" role="dialog" aria-modal="true">
      <div className="w-full sm:max-w-lg rounded-2xl sm:rounded-3xl bg-white dark:bg-[#151b2b] p-4 sm:p-6 shadow-2xl border border-slate-200/90 dark:border-[#222c42] animate-in zoom-in-95 duration-200 space-y-4 max-h-[92dvh] overflow-y-auto overflow-x-hidden touch-pan-y overscroll-contain modal-safe-card">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-[#222c42]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Tax-Free & คิดเงินช้อปปิ้งด่วน</span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/70 px-2 py-0.5 rounded-full font-mono">
                  1-Click Save
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                คำนวณหักภาษี Tax-Free ญี่ปุ่น + บันทึกลงทริปได้ใน 1 วินาที
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
                  if (inputAmount === '5500' || inputAmount === '1000' || inputAmount === '10000') {
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
            <span>เรทแลกเปลี่ยน:</span>
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
                title="คลิกเพื่อแก้ไขเรทแลกเปลี่ยน"
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

        {/* Tax-Free Selector Tabs (Only active for JPY or foreign) */}
        {foreignCurrency === 'JPY' && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between">
              <span>โหมดภาษี Tax-Free ญี่ปุ่น</span>
              <span className="text-[10px] text-slate-400">หักภาษีอัตโนมัติจากป้ายราคา</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setTaxMode('10')}
                className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                  taxMode === '10'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold shadow-xs'
                    : 'bg-slate-50 dark:bg-[#1a2234] border-slate-200 dark:border-[#222c42] text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-black">🛍️ Tax-Free 10%</span>
                  {taxMode === '10' && <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
                </div>
                <span className="text-[10px] opacity-80 mt-0.5">ดองกี้ / เสื้อผ้า / ของใช้</span>
              </button>

              <button
                type="button"
                onClick={() => setTaxMode('8')}
                className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                  taxMode === '8'
                    ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-200 font-bold shadow-xs'
                    : 'bg-slate-50 dark:bg-[#1a2234] border-slate-200 dark:border-[#222c42] text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-black">🍱 Tax-Free 8%</span>
                  {taxMode === '8' && <Check className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />}
                </div>
                <span className="text-[10px] opacity-80 mt-0.5">ขนม / อาหาร / ของฝาก</span>
              </button>

              <button
                type="button"
                onClick={() => setTaxMode('none')}
                className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                  taxMode === 'none'
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-900 dark:text-blue-200 font-bold shadow-xs'
                    : 'bg-slate-50 dark:bg-[#1a2234] border-slate-200 dark:border-[#222c42] text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-black">🔖 ราคาตามป้าย</span>
                  {taxMode === 'none' && <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
                </div>
                <span className="text-[10px] opacity-80 mt-0.5">ไม่หักภาษี (Net)</span>
              </button>
            </div>
          </div>
        )}

        {/* Quick Shopping Store Chips */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Store className="h-3 w-3 text-blue-500" />
              <span>ร้านยอดนิยม (คลิกเพื่อเลือกชื่อร้านด่วน)</span>
            </span>
          </label>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {SHOPPING_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer border flex items-center gap-1 ${
                  itemTitle === p.label
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-[#1c2438] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#222c42] hover:bg-slate-100'
                }`}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Item Title Input */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
            ชื่อรายการ / ร้านค้า
          </label>
          <input
            type="text"
            value={itemTitle}
            onChange={(e) => setItemTitle(e.target.value)}
            placeholder="เช่น ดองกี้ ชินไซบาชิ, รองเท้า Onitsuka..."
            className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#111726] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Main Input Box */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex justify-between items-center">
            <span>
              {direction === 'foreign_to_thb'
                ? `ยอดเงินตามป้าย (${activeMeta.code} ${activeMeta.symbol})`
                : 'ยอดเงินบาท (THB ฿)'}
            </span>
            {taxMode !== 'none' && foreignCurrency === 'JPY' && (
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                หักภาษี {taxMode}%
              </span>
            )}
          </label>

          <div className="relative">
            <input
              type="number"
              placeholder="0"
              value={inputAmount}
              onChange={(e) => setInputAmount(e.target.value)}
              className="w-full text-2xl sm:text-3xl font-black p-3 rounded-2xl border-2 border-blue-500/70 dark:border-blue-500/80 bg-slate-50 dark:bg-[#111726] text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/20 shadow-inner"
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
                <button onClick={() => addPreset(10)} className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-xs font-bold shrink-0 hover:scale-105 cursor-pointer">+10</button>
                <button onClick={() => addPreset(50)} className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-xs font-bold shrink-0 hover:scale-105 cursor-pointer">+50</button>
                <button onClick={() => addPreset(100)} className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-xs font-bold shrink-0 hover:scale-105 cursor-pointer">+100</button>
                <button onClick={() => addPreset(500)} className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-xs font-bold shrink-0 hover:scale-105 cursor-pointer">+500</button>
              </>
            ) : (
              <>
                <button onClick={() => addPreset(500)} className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-xs font-bold shrink-0 hover:scale-105 cursor-pointer">+500</button>
                <button onClick={() => addPreset(1000)} className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-xs font-bold shrink-0 hover:scale-105 cursor-pointer">+1,000</button>
                <button onClick={() => addPreset(5000)} className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-xs font-bold shrink-0 hover:scale-105 cursor-pointer">+5,000</button>
                <button onClick={() => addPreset(10000)} className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-xs font-bold shrink-0 hover:scale-105 cursor-pointer">+10,000</button>
              </>
            )}
          </div>
        </div>

        {/* Converted Result Display Box */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-[#1c2438] dark:to-[#161d2d] border border-blue-200/80 dark:border-[#222c42] space-y-1.5 text-center shadow-xs">
          <div className="flex items-center justify-between px-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {direction === 'foreign_to_thb' ? 'ยอดที่ต้องจ่ายจริง (THB)' : `ยอดเงิน ${activeMeta.code}`}
            </span>
            {taxMode !== 'none' && foreignCurrency === 'JPY' && (
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 font-mono">
                ยอดหลังหักภาษี: {adjustedInput.toLocaleString()} JPY
              </span>
            )}
          </div>

          <div className="text-3xl sm:text-4xl font-black text-blue-600 dark:text-blue-400 font-mono tracking-tight">
            {direction === 'foreign_to_thb' ? '฿' : activeMeta.symbol}
            {convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>

          {savedTaxAmount > 0 && foreignCurrency === 'JPY' && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 font-black animate-in fade-in">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>
                ประหยัดภาษีไปได้ ¥{savedTaxAmount.toLocaleString()} (≈ ฿{(savedTaxAmount * fxRate).toFixed(2)})
              </span>
            </div>
          )}
        </div>

        {/* Quick Split & Payment Method Controls (For 1-Click Save) */}
        {tripId && (
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#1a2234] border border-slate-200 dark:border-[#222c42] space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-blue-500" />
                <span>การหารค่าใช้จ่าย:</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSplitMode('me_only')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                    splitMode === 'me_only'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-[#111726] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#222c42]'
                  }`}
                >
                  👤 ของฉันคนเดียว
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMode('all')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                    splitMode === 'all'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-[#111726] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#222c42]'
                  }`}
                >
                  👥 หารทุกคน ({allMembers.length > 0 ? allMembers.length : 2} คน)
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1">
                <CreditCard className="h-3.5 w-3.5 text-blue-500" />
                <span>วิธีจ่ายเงิน:</span>
              </span>
              <div className="flex items-center gap-1 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('travel_card')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                    paymentMethod === 'travel_card'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-[#111726] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#222c42]'
                  }`}
                >
                  💳 Travel Card
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                    paymentMethod === 'cash'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white dark:bg-[#111726] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#222c42]'
                  }`}
                >
                  💵 เงินสด
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('credit_card')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                    paymentMethod === 'credit_card'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-[#111726] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#222c42]'
                  }`}
                >
                  💳 บัตรเครดิต
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recently Saved Toast Indicator */}
        {recentlySaved && (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-between animate-in fade-in">
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>บันทึกสำเร็จ: {recentlySaved}</span>
            </span>
            <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-mono">
              Saved
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {tripId && (
            <button
              onClick={handleDirectSaveExpense}
              disabled={numInput <= 0 || isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-sm shadow-lg shadow-emerald-600/30 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>กำลังบันทึกลงระบบ...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>
                    บันทึกลงค่าใช้จ่ายทันที (฿
                    {convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                  </span>
                </>
              )}
            </button>
          )}

          <div className="flex gap-2">
            {onApplyExpense && (
              <button
                onClick={handleTransferToFullForm}
                disabled={numInput <= 0 || isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1c2438] dark:hover:bg-[#25304a] text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 border border-slate-200 dark:border-[#222c42]"
              >
                <Plus className="h-3.5 w-3.5 text-blue-500" />
                <span>เปิดในฟอร์มละเอียด (แนบใบเสร็จ)</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-[#222c42] text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-[#1c2438] transition-colors cursor-pointer"
            >
              ปิด
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
