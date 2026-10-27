// src/components/BudgetCategoryModal.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Building, Clock, Users, Sliders, History, 
  ChevronDown, ChevronRight, Wallet, RotateCcw, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  CategoryItem, 
  CategoryBudgetMap, 
  MemberBudgetMap, 
  getTripCategories, 
  saveCustomCategory, 
  deleteCustomCategory, 
  getCategoryBudgets, 
  saveCategoryBudgets, 
  getMemberBudgets, 
  saveMemberBudgets 
} from '@/lib/categories';
import { supabase } from '@/lib/supabase';
import { getCatAvatar } from '@/lib/avatars';
import { CatAvatarBadge } from '@/components/CatAvatarBadge';
import { convertToThb, convertCurrency, formatExchangeRateDisplay } from '@/lib/currency';

export const SUPPORTED_CURRENCIES = [
  { code: 'THB', symbol: '฿', name: 'บาทไทย (THB)', flag: '🇹🇭' },
  { code: 'JPY', symbol: '¥', name: 'เยนญี่ปุ่น (JPY)', flag: '🇯🇵' },
  { code: 'USD', symbol: '$', name: 'ดอลลาร์สหรัฐ (USD)', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', name: 'ยูโร (EUR)', flag: '🇪🇺' },
  { code: 'KRW', symbol: '₩', name: 'วอนเกาหลี (KRW)', flag: '🇰🇷' },
  { code: 'CNY', symbol: '元', name: 'หยวนจีน (CNY)', flag: '🇨🇳' },
  { code: 'SGD', symbol: 'S$', name: 'ดอลลาร์สิงคโปร์ (SGD)', flag: '🇸🇬' },
  { code: 'GBP', symbol: '£', name: 'ปอนด์สเตอร์ลิง (GBP)', flag: '🇬🇧' },
];

interface BudgetCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: any;
  expenses?: any[];
  members?: any[];
  currentUser?: any;
  userDisplayName?: string;
  fxRate?: number;
  initialTab?: 'budget' | 'members' | 'categories' | 'custom';
  onUpdated: () => void;
  onOpenRollback?: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const EMPTY_EXPENSES: any[] = [];
const EMPTY_MEMBERS: any[] = [];

export default function BudgetCategoryModal({
  isOpen,
  onClose,
  trip,
  expenses = EMPTY_EXPENSES,
  members = EMPTY_MEMBERS,
  currentUser,
  userDisplayName = 'ฉัน',
  fxRate = 0.210,
  onUpdated,
  onOpenRollback,
  onShowToast,
}: BudgetCategoryModalProps) {
  const [mounted, setMounted] = useState(false);
  const [currency, setCurrency] = useState<string>('THB');
  const [isSaving, setIsSaving] = useState(false);

  // Section 1: Fixed / Pre-paid Costs (Flights, Accommodations, Passes)
  const [fixedCostsInput, setFixedCostsInput] = useState<string>('0');

  // Section 2: Daily Allowance & Pocket Money
  const [dailyPerPersonInput, setDailyPerPersonInput] = useState<string>('2500');
  const [dailyTotalInput, setDailyTotalInput] = useState<string>('0');

  // Section 3: Member Budgets
  const [splitMode, setSplitMode] = useState<'even' | 'custom'>('even');
  const [memberBudgets, setMemberBudgets] = useState<MemberBudgetMap>({});

  // Section 4 (Optional): Category Budgets
  const [showCategorySection, setShowCategorySection] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudgetMap>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background scroll and handle Escape key
  useEffect(() => {
    if (isOpen && typeof document !== 'undefined') {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = prev;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  // Trip duration in days
  const tripDays = useMemo(() => {
    if (!trip?.start_date || !trip?.end_date) return 7;
    const s = new Date(trip.start_date);
    const e = new Date(trip.end_date);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return isNaN(days) || days <= 0 ? 7 : days;
  }, [trip?.start_date, trip?.end_date]);

  // Deduplicated Member list
  const allMembersList = useMemo(() => {
    const myId = currentUser?.id?.toLowerCase();
    const myName = userDisplayName?.trim().toLowerCase();
    const myEmail = currentUser?.email?.trim().toLowerCase();
    const seenKeys = new Set<string>();

    const otherMems = members.filter((m) => {
      const mUserId = m.user_id?.toLowerCase();
      const mName = (m.profiles?.display_name || m.profiles?.email?.split('@')[0] || '').trim().toLowerCase();
      const mEmail = m.profiles?.email?.trim().toLowerCase();

      const isMe = (myId && mUserId === myId) || 
                   (myName && mName === myName) || 
                   (myEmail && mEmail === myEmail);
      if (isMe) return false;

      const key = m.user_id || mName || m.id;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });

    return [
      { key: 'me', name: `${userDisplayName} (ฉัน)`, email: currentUser?.email, avatar: 'cat_trio', isMe: true },
      ...otherMems.map(m => ({
        key: m.user_id || m.id,
        name: m.profiles?.display_name || m.profiles?.email?.split('@')[0] || 'สมาชิก',
        email: m.profiles?.email,
        avatar: m.profiles?.avatar_id || 'cat_yellow',
        isMe: false,
      }))
    ];
  }, [members, currentUser, userDisplayName]);

  const memberCount = Math.max(1, allMembersList.length);

  // Auto-detect pre-paid expenses already logged in the trip (hotel, flights, tickets)
  const detectedFixedFromExpenses = useMemo(() => {
    let sum = 0;
    expenses.forEach((e) => {
      const cat = (e.category || '').toLowerCase();
      const title = (e.title || '').toLowerCase();
      if (
        cat.includes('hotel') || cat.includes('พัก') || cat.includes('accommodat') ||
        cat.includes('flight') || cat.includes('ตั๋ว') || cat.includes('plane') || cat.includes('ticket') ||
        title.includes('โรงแรม') || title.includes('hotel') || title.includes('flight') || title.includes('ตั๋วเครื่องบิน')
      ) {
        const amt = Number(e.amount || 0);
        const inSelected = convertCurrency(amt, e.currency || trip?.currency || 'THB', currency, fxRate);
        sum += inSelected;
      }
    });
    return Math.round(sum);
  }, [expenses, currency, trip?.currency, fxRate]);

  // Initial populate from trip & storage
  useEffect(() => {
    if (isOpen && trip) {
      const activeCur = trip.currency || 'THB';
      setCurrency(activeCur);

      const rawTripBudget = Number(trip.total_budget ?? trip.budget ?? 0);
      const mBudgets = getMemberBudgets(trip.id);
      setMemberBudgets(mBudgets);

      const cBudgets = getCategoryBudgets(trip.id);
      setCategoryBudgets(cBudgets);
      setCategories(getTripCategories(trip.id));

      if (rawTripBudget > 0) {
        // If trip already has a total budget, assign fixed costs from detected or zero, remainder to daily
        const fixed = detectedFixedFromExpenses;
        const dailyTotal = Math.max(0, rawTripBudget - fixed);
        const dailyPerPerson = Math.round(dailyTotal / (tripDays * memberCount));

        setFixedCostsInput(String(fixed));
        setDailyTotalInput(String(dailyTotal));
        setDailyPerPersonInput(String(dailyPerPerson));
      } else {
        // Default smart estimation
        const fixed = detectedFixedFromExpenses;
        const defaultDailyPerPerson = activeCur === 'JPY' ? 12000 : 2500;
        const dailyTotal = defaultDailyPerPerson * tripDays * memberCount;

        setFixedCostsInput(String(fixed));
        setDailyPerPersonInput(String(defaultDailyPerPerson));
        setDailyTotalInput(String(dailyTotal));
      }
    }
  }, [isOpen, trip, detectedFixedFromExpenses, tripDays, memberCount]);

  // Synchronize Daily Allowance <-> Daily Total
  const handleDailyPerPersonChange = (val: string) => {
    setDailyPerPersonInput(val);
    const num = Number(val);
    if (!isNaN(num) && num >= 0) {
      const total = num * tripDays * memberCount;
      setDailyTotalInput(String(total));
    }
  };

  const handleDailyTotalChange = (val: string) => {
    setDailyTotalInput(val);
    const num = Number(val);
    if (!isNaN(num) && num >= 0) {
      const perPerson = Math.round(num / (tripDays * memberCount));
      setDailyPerPersonInput(String(perPerson));
    }
  };

  // Total Computed Budget
  const fixedNumber = Math.max(0, Number(fixedCostsInput) || 0);
  const dailyNumber = Math.max(0, Number(dailyTotalInput) || 0);
  const totalComputedBudget = fixedNumber + dailyNumber;

  // Auto split members whenever total budget changes and splitMode is 'even'
  useEffect(() => {
    if (splitMode === 'even') {
      const perPerson = Math.round(totalComputedBudget / memberCount);
      const updated: MemberBudgetMap = {};
      allMembersList.forEach((m) => {
        updated[m.key] = perPerson;
      });
      setMemberBudgets(updated);
    }
  }, [totalComputedBudget, splitMode, memberCount, allMembersList]);

  const handleMemberBudgetChange = (key: string, val: string) => {
    const num = Number(val);
    setMemberBudgets((prev) => ({
      ...prev,
      [key]: isNaN(num) ? 0 : num,
    }));
  };

  const handleCategoryBudgetChange = (catId: string, val: string) => {
    const num = Number(val);
    setCategoryBudgets((prev) => ({
      ...prev,
      [catId]: isNaN(num) ? 0 : num,
    }));
  };

  // Helper for secondary currency conversion preview
  const formatSecondaryPreview = (val: number) => {
    if (!val || isNaN(val) || val <= 0) return null;
    if (currency === 'THB') {
      const jpy = Math.round(convertCurrency(val, 'THB', 'JPY', fxRate));
      return `≈ ¥${jpy.toLocaleString()} JPY`;
    }
    if (currency === 'JPY') {
      const thb = Math.round(convertToThb(val, 'JPY', fxRate));
      return `≈ ฿${thb.toLocaleString()} THB`;
    }
    const thb = Math.round(convertToThb(val, currency, fxRate));
    return `≈ ฿${thb.toLocaleString()}`;
  };

  // Currency switcher with auto-recalculation
  const handleCurrencyChange = (newCur: string) => {
    if (newCur === currency) return;
    const oldCur = currency;

    const convertNum = (str: string) => {
      const n = Number(str);
      if (isNaN(n) || n <= 0) return '0';
      return String(Math.round(convertCurrency(n, oldCur, newCur, fxRate)));
    };

    setFixedCostsInput(convertNum(fixedCostsInput));
    setDailyTotalInput(convertNum(dailyTotalInput));
    setDailyPerPersonInput(convertNum(dailyPerPersonInput));

    const newMembers: MemberBudgetMap = {};
    Object.entries(memberBudgets).forEach(([k, v]) => {
      if (v !== undefined && Number(v) > 0) {
        newMembers[k] = Math.round(convertCurrency(Number(v), oldCur, newCur, fxRate));
      } else {
        newMembers[k] = v;
      }
    });
    setMemberBudgets(newMembers);

    const newCats: CategoryBudgetMap = {};
    Object.entries(categoryBudgets).forEach(([k, v]) => {
      if (v !== undefined && Number(v) > 0) {
        newCats[k] = Math.round(convertCurrency(Number(v), oldCur, newCur, fxRate));
      } else {
        newCats[k] = v;
      }
    });
    setCategoryBudgets(newCats);

    setCurrency(newCur);
  };

  // Save All
  const handleSaveAll = async () => {
    if (!trip?.id) return;
    setIsSaving(true);
    try {
      const sanitizedBudget = totalComputedBudget > 0 ? totalComputedBudget : 0;
      
      const { error } = await supabase
        .from('trips')
        .update({
          total_budget: sanitizedBudget,
          budget: sanitizedBudget,
          currency: currency,
        })
        .eq('id', trip.id);

      if (error) throw error;

      saveMemberBudgets(trip.id, memberBudgets);
      if (showCategorySection) {
        saveCategoryBudgets(trip.id, categoryBudgets);
      }

      onUpdated();
      if (onShowToast) {
        onShowToast(`บันทึกงบประมาณทริป ${sanitizedBudget.toLocaleString()} ${currency} เรียบร้อยแล้ว`, 'success');
      } else {
        toast.success('บันทึกงบประมาณเรียบร้อยแล้ว');
      }

      onClose();
    } catch (err: any) {
      toast.error(`บันทึกงบประมาณล้มเหลว: ${err.message || 'เกิดข้อผิดพลาด'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Clear Budget
  const handleClearBudget = async () => {
    if (!trip?.id) return;
    if (!confirm('ต้องการล้างเป้าหมายงบประมาณทั้งหมดใช่หรือไม่?')) return;
    setIsSaving(true);
    try {
      await supabase
        .from('trips')
        .update({
          total_budget: 0,
          budget: 0,
        })
        .eq('id', trip.id);

      saveMemberBudgets(trip.id, {});
      saveCategoryBudgets(trip.id, {});

      onUpdated();
      if (onShowToast) onShowToast('ล้างเป้าหมายงบประมาณเรียบร้อยแล้ว', 'info');
      onClose();
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-60 flex items-start sm:items-center justify-center backdrop-blur-md bg-black/80 p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150 modal-safe-overlay" 
      role="dialog" 
      aria-modal="true"
    >
      <div 
        className="w-full max-w-2xl rounded-2xl sm:rounded-3xl bg-white dark:bg-[#121316] border border-slate-200 dark:border-[#262932] shadow-2xl flex flex-col overflow-hidden max-h-[90dvh] glow-blue animate-in zoom-in-95 duration-150 modal-safe-card"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header (Clean, Corporate, Outline style) */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-[#262932] flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-[#181a20]/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl border border-slate-300 dark:border-[#262932] bg-white dark:bg-[#1a2133] text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  วางแผนงบประมาณทริป
                </h2>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#1e2027] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#262932]">
                  {formatExchangeRateDisplay(currency, fxRate)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                คำนวณจากค่าใช้จ่ายคงที่ และงบกินเที่ยวประจำวันตลอดทริป
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="py-1 px-2 rounded-lg text-xs font-mono font-bold bg-white dark:bg-[#1e2027] border border-slate-300 dark:border-[#262932] text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1e2027] transition-colors cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1 text-left">

          {/* Section 1: Pre-paid & Fixed Costs */}
          <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-[#262932] bg-slate-50/40 dark:bg-[#181a20]/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                  1. ค่าใช้จ่ายจองล่วงหน้า (ตั๋วเครื่องบิน & ที่พัก)
                </h3>
              </div>
              {detectedFixedFromExpenses > 0 && (
                <button
                  type="button"
                  onClick={() => setFixedCostsInput(String(detectedFixedFromExpenses))}
                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  ใช้ยอดจากบิลจริง (฿{detectedFixedFromExpenses.toLocaleString()})
                </button>
              )}
            </div>

            <div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={fixedCostsInput}
                  onChange={(e) => setFixedCostsInput(e.target.value)}
                  className="w-full pr-16 pl-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-[#262932] bg-white dark:bg-[#1e2027] text-sm sm:text-base font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                  placeholder="0"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold font-mono text-slate-400">
                  {currency}
                </span>
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 px-0.5">
                <span>ยอดเงินที่จ่ายไปแล้วก่อนเริ่มเดินทาง</span>
                <span>{formatSecondaryPreview(fixedNumber)}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Daily Allowance & Pocket Money */}
          <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-[#262932] bg-slate-50/40 dark:bg-[#181a20]/40 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                  2. งบกินเที่ยวประจำวัน (อาหาร, เดินทาง, ช้อปปิ้ง)
                </h3>
              </div>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-[#1e2638] text-slate-600 dark:text-slate-300">
                ระยะเวลา {tripDays} วัน • สมาชิก {memberCount} คน
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Field 1: Daily per Person */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  งบเฉลี่ยต่อคน / วัน
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={dailyPerPersonInput}
                    onChange={(e) => handleDailyPerPersonChange(e.target.value)}
                    className="w-full pr-20 pl-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-[#262932] bg-white dark:bg-[#1e2027] text-sm font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                    placeholder="2500"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold font-mono text-slate-400">
                    {currency}/วัน
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 pt-1">
                  {(currency === 'JPY' ? [5000, 10000, 15000, 20000] : [1500, 2500, 3500, 5000]).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleDailyPerPersonChange(String(preset))}
                      className="px-2 py-0.5 rounded-md border border-slate-200 dark:border-[#262932] text-[10px] font-mono font-medium text-slate-600 dark:text-slate-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
                    >
                      {preset.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field 2: Total Daily Pocket Money */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  งบกินเที่ยวรวมทั้งทริป ({tripDays} วัน)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={dailyTotalInput}
                    onChange={(e) => handleDailyTotalChange(e.target.value)}
                    className="w-full pr-16 pl-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-[#262932] bg-white dark:bg-[#1e2027] text-sm font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                    placeholder="60000"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold font-mono text-slate-400">
                    {currency}
                  </span>
                </div>

                <div className="text-[10px] text-slate-500 dark:text-slate-400 pt-1 flex justify-between">
                  <span>คำนวณอัตโนมัติ ({Number(dailyPerPersonInput || 0).toLocaleString()} × {tripDays} วัน × {memberCount} คน)</span>
                  <span>{formatSecondaryPreview(dailyNumber)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Summary & Member Allocation */}
          <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-[#262932] bg-slate-50/40 dark:bg-[#181a20]/40 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                  3. สรุปงบประมาณรวม & สัดส่วนรายคน
                </h3>
              </div>

              {/* Toggle Split Mode */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg border border-slate-200 dark:border-[#262932] bg-white dark:bg-[#1e2027] text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setSplitMode('even')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    splitMode === 'even'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  หารเฉลี่ยเท่ากัน
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMode('custom')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    splitMode === 'custom'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  กำหนดรายคน
                </button>
              </div>
            </div>

            {/* Total Budget Result Card */}
            <div className="p-3.5 rounded-xl border border-blue-200/80 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider block">
                  งบประมาณรวมทั้งทริป (Total Budget)
                </span>
                <div className="text-xl sm:text-2xl font-black font-mono text-blue-950 dark:text-blue-100">
                  {totalComputedBudget.toLocaleString()} {currency}
                </div>
                <div className="text-[11px] text-blue-700/80 dark:text-blue-300/70 font-medium">
                  {formatSecondaryPreview(totalComputedBudget)}
                </div>
              </div>

              <div className="text-right text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <div>ค่าจองล่วงหน้า: {fixedNumber.toLocaleString()} {currency}</div>
                <div>งบกินเที่ยว: {dailyNumber.toLocaleString()} {currency}</div>
              </div>
            </div>

            {/* Member Allocation Cards */}
            <div className="space-y-2 pt-1">
              {allMembersList.map((m) => {
                const allocated = Number(memberBudgets[m.key] || 0);
                const pct = totalComputedBudget > 0 ? Math.round((allocated / totalComputedBudget) * 100) : 0;
                return (
                  <div 
                    key={m.key}
                    className="p-3 rounded-xl border border-slate-200 dark:border-[#262932] bg-white dark:bg-[#1e2027] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CatAvatarBadge avatarId={m.avatar} size="sm" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {m.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {pct}% ของงบรวม
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="100"
                          disabled={splitMode === 'even'}
                          value={allocated || ''}
                          onChange={(e) => handleMemberBudgetChange(m.key, e.target.value)}
                          className={`w-28 sm:w-36 pr-12 pl-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold outline-none text-right ${
                            splitMode === 'even'
                              ? 'bg-slate-100 dark:bg-[#121316] border-slate-200 dark:border-[#262932] text-slate-700 dark:text-slate-300 cursor-not-allowed'
                              : 'bg-white dark:bg-[#1e2027] border-slate-300 dark:border-[#262932] text-slate-900 dark:text-white focus:border-blue-500'
                          }`}
                          placeholder="0"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold font-mono text-slate-400">
                          {currency}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4 (Optional Collapsible): Category Breakdown */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-[#262932] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCategorySection(!showCategorySection)}
              className="w-full p-3.5 bg-slate-50/50 dark:bg-[#181a20]/50 hover:bg-slate-100/50 dark:hover:bg-[#1e2027] flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <span>4. จัดสรรงบตามหมวดหมู่ (อาหาร, เดินทาง, ช้อปปิ้ง) — ไม่บังคับ</span>
              </div>
              {showCategorySection ? (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              )}
            </button>

            {showCategorySection && (
              <div className="p-4 bg-white dark:bg-[#121316] space-y-2.5 border-t border-slate-200/80 dark:border-[#262932]">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                  คุณสามารถกำหนดงบประมาณแยกตามหมวดหมู่ได้ตามต้องการ (หากไม่ระบุ ระบบจะใช้ยอดรวมหลัก)
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {categories.map((cat) => (
                    <div 
                      key={cat.id}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-[#262932] bg-slate-50/30 dark:bg-[#1e2027] flex items-center justify-between gap-2"
                    >
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                        {cat.label}
                      </span>
                      <div className="relative shrink-0">
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={categoryBudgets[cat.id] || ''}
                          onChange={(e) => handleCategoryBudgetChange(cat.id, e.target.value)}
                          className="w-24 pr-8 pl-2 py-1 rounded-md border border-slate-300 dark:border-[#262932] bg-white dark:bg-[#121316] text-xs font-mono font-bold text-right outline-none focus:border-blue-500"
                          placeholder="0"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold font-mono text-slate-400">
                          {currency}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-200/80 dark:border-[#262932] flex flex-wrap items-center justify-between gap-2 shrink-0 bg-slate-50/50 dark:bg-[#181a20]/50">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClearBudget}
              disabled={isSaving}
              className="text-xs text-rose-600 dark:text-rose-400 hover:underline cursor-pointer disabled:opacity-50"
            >
              ล้างงบประมาณ
            </button>

            {onOpenRollback && (
              <button
                type="button"
                onClick={onOpenRollback}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
              >
                <History className="h-3.5 w-3.5" />
                <span>ประวัติ & สำรองไฟล์</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="py-2 px-3.5 rounded-xl border border-slate-300 dark:border-[#262932] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1e2027] transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSaving ? (
                <span>กำลังบันทึก...</span>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>บันทึกงบประมาณ</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
