// src/components/BudgetCategoryModal.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  X, DollarSign, Plus, Trash2, Check, Sparkles, 
  Coins, AlertCircle, CheckCircle2, PieChart, Sliders, 
  Tag, ShieldAlert, ArrowRight, Layers, History, Users, User, 
  Divide, Calculator, ArrowDownRight, ArrowUpRight, RefreshCw 
} from 'lucide-react';
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
import { convertToThb, convertCurrency } from '@/lib/currency';

export const SUPPORTED_CURRENCIES = [
  { code: 'JPY', symbol: '¥', name: 'เยนญี่ปุ่น (JPY)', flag: '🇯🇵' },
  { code: 'THB', symbol: '฿', name: 'บาทไทย (THB)', flag: '🇹🇭' },
  { code: 'USD', symbol: '$', name: 'ดอลลาร์สหรัฐ (USD)', flag: '🇺🇸' },
  { code: 'CNY', symbol: '元', name: 'หยวนจีน (CNY)', flag: '🇨🇳' },
  { code: 'EUR', symbol: '€', name: 'ยูโร (EUR)', flag: '🇪🇺' },
  { code: 'KRW', symbol: '₩', name: 'วอนเกาหลี (KRW)', flag: '🇰🇷' },
  { code: 'GBP', symbol: '£', name: 'ปอนด์สเตอร์ลิง (GBP)', flag: '🇬🇧' },
  { code: 'SGD', symbol: 'S$', name: 'ดอลลาร์สิงคโปร์ (SGD)', flag: '🇸🇬' },
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
}

const EMOJI_PRESETS = ['🍱', '🚅', '🛍️', '🏨', '🎟️', '📦', '🎢', '🎁', '☕', '🏮', '✈️', '🎮', '🍣', '🍫', '⛩️', '💊'];

export default function BudgetCategoryModal({
  isOpen,
  onClose,
  trip,
  expenses = [],
  members = [],
  currentUser,
  userDisplayName = 'ฉัน',
  fxRate = 0.235,
  initialTab = 'budget',
  onUpdated,
  onOpenRollback,
}: BudgetCategoryModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'budget' | 'members' | 'categories' | 'custom'>(initialTab);
  
  // Total trip budget state
  const [totalBudget, setTotalBudget] = useState<string>('');
  const [currency, setCurrency] = useState<string>('JPY');
  const [savingTotal, setSavingTotal] = useState(false);
  const [totalSuccess, setTotalSuccess] = useState(false);

  // Category & Member Budgets
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudgetMap>({});
  const [memberBudgets, setMemberBudgets] = useState<MemberBudgetMap>({});
  const [budgetSuccess, setBudgetSuccess] = useState(false);

  // New Custom Category Form
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🎢');
  const [showAddCatForm, setShowAddCatForm] = useState(false);

  // List of all members (Owner + Trip Members) with strict deduplication
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
      { key: 'me', name: userDisplayName + ' (ฉัน)', email: currentUser?.email, avatar: 'cat_trio', isMe: true },
      ...otherMems.map(m => ({
        key: m.user_id || m.id,
        name: m.profiles?.display_name || m.profiles?.email?.split('@')[0] || 'สมาชิก',
        email: m.profiles?.email,
        avatar: m.profiles?.avatar_id || 'cat_yellow',
        isMe: false,
      }))
    ];
  }, [members, currentUser, userDisplayName]);

  useEffect(() => {
    if (isOpen && trip) {
      if (initialTab) {
        setActiveSubTab(initialTab);
      }
      setTotalBudget(String(trip.total_budget ?? trip.budget ?? 0));
      setCurrency(trip.currency || 'JPY');

      const cats = getTripCategories(trip.id);
      setCategories(cats);

      const cBudgets = getCategoryBudgets(trip.id);
      setCategoryBudgets(cBudgets);

      const mBudgets = getMemberBudgets(trip.id);
      setMemberBudgets(mBudgets);
    }
  }, [isOpen, trip, initialTab]);

  // Helper for secondary currency conversion preview
  const formatSecondaryPreview = (val: number, cur: string) => {
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

  // Convert all existing budget figures automatically to the new currency
  const handleConvertAllBudgetsToNewCurrency = (newCur: string) => {
    const oldCur = currency;
    if (oldCur === newCur) return;

    // Convert totalBudget
    const oldTotal = Number(totalBudget);
    if (!isNaN(oldTotal) && oldTotal > 0) {
      const newTotal = Math.round(convertCurrency(oldTotal, oldCur, newCur, fxRate));
      setTotalBudget(String(newTotal));
    }

    // Convert memberBudgets
    const newMembers: MemberBudgetMap = {};
    Object.entries(memberBudgets).forEach(([k, v]) => {
      if (v !== undefined && v > 0) {
        newMembers[k] = Math.round(convertCurrency(Number(v), oldCur, newCur, fxRate));
      } else {
        newMembers[k] = v;
      }
    });
    setMemberBudgets(newMembers);

    // Convert categoryBudgets
    const newCats: CategoryBudgetMap = {};
    Object.entries(categoryBudgets).forEach(([k, v]) => {
      if (v !== undefined && v > 0) {
        newCats[k] = Math.round(convertCurrency(Number(v), oldCur, newCur, fxRate));
      } else {
        newCats[k] = v;
      }
    });
    setCategoryBudgets(newCats);

    setCurrency(newCur);
  };

  // 1. Save Total Trip Budget to Supabase
  const handleSaveTotalBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip?.id) return;
    setSavingTotal(true);
    try {
      const num = Number(totalBudget);
      const { error } = await supabase
        .from('trips')
        .update({
          total_budget: isNaN(num) ? 0 : num,
          currency: currency,
        })
        .eq('id', trip.id);

      if (!error) {
        setTotalSuccess(true);
        onUpdated();
        setTimeout(() => setTotalSuccess(false), 2500);
      } else {
        alert('เกิดข้อผิดพลาด: ' + error.message);
      }
    } catch (err: any) {
      alert('บันทึกงบประมาณล้มเหลว: ' + err.message);
    } finally {
      setSavingTotal(false);
    }
  };

  // 2. Save Member Budgets to LocalStorage & Supabase trip currency
  const handleSaveMemberBudgets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip?.id) return;
    saveMemberBudgets(trip.id, memberBudgets);
    if (currency !== trip.currency) {
      await supabase.from('trips').update({ currency }).eq('id', trip.id);
    }
    setBudgetSuccess(true);
    onUpdated();
    setTimeout(() => setBudgetSuccess(false), 2500);
  };

  // 3. Save Category Budgets to LocalStorage & Supabase trip currency
  const handleSaveCategoryBudgets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip?.id) return;
    saveCategoryBudgets(trip.id, categoryBudgets);
    if (currency !== trip.currency) {
      await supabase.from('trips').update({ currency }).eq('id', trip.id);
    }
    setBudgetSuccess(true);
    onUpdated();
    setTimeout(() => setBudgetSuccess(false), 2500);
  };

  // Auto Split Evenly from Total Trip Budget
  const handleAutoSplitMembers = () => {
    const total = Number(totalBudget || 0);
    if (total <= 0) {
      alert('กรุณากำหนดงบประมาณรวมทริปก่อนทำการหารเฉลี่ย');
      return;
    }
    const perPerson = Math.floor(total / allMembersList.length);
    const updated: MemberBudgetMap = {};
    allMembersList.forEach(m => {
      updated[m.key] = perPerson;
    });
    setMemberBudgets(updated);
  };

  // 4. Add Custom Category
  const handleAddCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip?.id || !newCatLabel.trim()) return;

    const updated = saveCustomCategory(trip.id, {
      label: newCatLabel.trim(),
      icon: newCatIcon || '🏷️',
    });
    setCategories(updated);
    setNewCatLabel('');
    setShowAddCatForm(false);
    onUpdated();
  };

  // 5. Delete Custom Category
  const handleDeleteCustomCategory = (catId: string) => {
    if (!trip?.id) return;
    if (confirm('ต้องการลบหมวดหมู่นี้ใช่หรือไม่?')) {
      const updated = deleteCustomCategory(trip.id, catId);
      setCategories(updated);
      
      const newBudgets = { ...categoryBudgets };
      delete newBudgets[catId];
      setCategoryBudgets(newBudgets);
      saveCategoryBudgets(trip.id, newBudgets);
      onUpdated();
    }
  };

  const handleBudgetChange = (catId: string, value: string) => {
    const num = Number(value);
    setCategoryBudgets((prev) => ({
      ...prev,
      [catId]: isNaN(num) ? 0 : num,
    }));
  };

  const handleMemberBudgetChange = (memberKey: string, value: string) => {
    const num = Number(value);
    setMemberBudgets((prev) => ({
      ...prev,
      [memberKey]: isNaN(num) ? 0 : num,
    }));
  };

  // Total allocated category budgets sum & remaining
  const totalCatAllocated = Object.values(categoryBudgets).reduce((a, b) => a + Number(b || 0), 0);
  const remainingCatBudget = Number(totalBudget || 0) - totalCatAllocated;

  // Total allocated member budgets sum & remaining
  const totalMemberAllocated = Object.values(memberBudgets).reduce((a, b) => a + Number(b || 0), 0);
  const remainingMemberBudget = Number(totalBudget || 0) - totalMemberAllocated;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#151b2b] shadow-2xl border border-slate-200/90 dark:border-[#222c42] glow-blue max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Mobile Sheet Handle */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />
        
        {/* Header */}
        <div className="p-4 sm:p-6 pb-3 flex justify-between items-center border-b border-slate-100 dark:border-[#222c42]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-lg shadow-md shadow-blue-500/25">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                จัดการงบประมาณ & หมวดหมู่ 🎯
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                กำหนดงบทริป, งบส่วนตัวรายคน, จัดสรรตามหมวด ในสกุลเงินเยน (JPY) หรือบาท (THB)
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

        {/* Sub Navigation Pills */}
        <div className="flex p-2 gap-1.5 bg-slate-50/70 dark:bg-[#111726] border-b border-slate-100 dark:border-[#222c42] overflow-x-auto custom-scrollbar">
          <button
            type="button"
            onClick={() => setActiveSubTab('budget')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'budget'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1c2438]'
            }`}
          >
            <Coins className="h-3.5 w-3.5" /> งบรวมทริป
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('members')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'members'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1c2438]'
            }`}
          >
            <Users className="h-3.5 w-3.5" /> งบส่วนตัวรายคน
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('categories')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'categories'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1c2438]'
            }`}
          >
            <PieChart className="h-3.5 w-3.5" /> จัดสรรงบหมวดหมู่
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('custom')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'custom'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1c2438]'
            }`}
          >
            <Tag className="h-3.5 w-3.5" /> หมวดหมู่ ({categories.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 pt-4 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          
          {/* TAB 1: งบประมาณรวมทริป (Total Budget) */}
          {activeSubTab === 'budget' && (
            <div className="space-y-4 animate-in fade-in">
              <form onSubmit={handleSaveTotalBudget} className="p-4 sm:p-5 rounded-2xl bg-blue-50/30 dark:bg-[#1c2438] border border-blue-200/60 dark:border-[#222c42] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Coins className="h-4 w-4 text-blue-600 dark:text-blue-400" /> กำหนดงบประมาณรวมทั้งทริป (Total Budget)
                  </span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                    บันทึกตรงสู่ทริป
                  </span>
                </div>

                {/* Currency Selection Grid / Selector */}
                <div>
                  <label className="block text-[11px] font-bold mb-1.5 text-slate-700 dark:text-slate-200">
                    💱 เลือกสกุลเงินสำหรับงบทริป:
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                    {SUPPORTED_CURRENCIES.map((cur) => {
                      const isSelected = currency === cur.code;
                      return (
                        <button
                          key={cur.code}
                          type="button"
                          onClick={() => setCurrency(cur.code)}
                          className={`p-2 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5 border cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-102'
                              : 'bg-white dark:bg-[#151b2b] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#222c42] hover:border-blue-400'
                          }`}
                        >
                          <span className="text-sm">{cur.flag}</span>
                          <span className="font-mono">{cur.code} ({cur.symbol})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Amount input */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">
                      จำนวนเงินงบประมาณ ({currency}) *
                    </label>
                    {totalBudget && Number(totalBudget) > 0 && (
                      <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 font-mono">
                        {formatSecondaryPreview(Number(totalBudget), currency)}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder={currency === 'JPY' ? 'เช่น 300000 (¥)' : 'เช่น 50000 (฿)'}
                      className="w-full p-3 rounded-xl border border-slate-300 dark:border-[#2a3650] bg-white dark:bg-[#151b2b] text-slate-900 dark:text-white text-base font-black font-mono outline-none focus:border-blue-500 pr-16"
                      value={totalBudget}
                      onChange={(e) => setTotalBudget(e.target.value)}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500 dark:text-slate-400 pointer-events-none">
                      {currency}
                    </div>
                  </div>
                </div>

                {/* Auto Convert Old Figures to New Currency Button */}
                {trip?.currency && trip.currency !== currency && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="text-[11px] text-amber-800 dark:text-amber-200">
                      <span className="font-bold">💡 เปลี่ยนสกุลเงินจาก {trip.currency} เป็น {currency}?</span>
                      <p className="text-[10px] text-amber-700/80 dark:text-amber-300/80">
                        กดปุ่มเพื่อแปลงตัวเลขงบเดิมตามเรทแลกเปลี่ยนอัตโนมัติ
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleConvertAllBudgetsToNewCurrency(currency)}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shrink-0"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>แปลงตัวเลขเป็น {currency}</span>
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    {formatSecondaryPreview(Number(totalBudget || 0), currency)}
                  </div>

                  <button
                    type="submit"
                    disabled={savingTotal}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 hover:scale-105 active:scale-95 transition-all"
                  >
                    {savingTotal ? 'กำลังบันทึก...' : <><Check className="h-3.5 w-3.5" /> บันทึกงบรวม ({currency})</>}
                  </button>
                </div>
              </form>

              {totalSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 border border-emerald-200 dark:border-emerald-900 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>บันทึกงบประมาณรวมทริป ({currency}) เรียบร้อยแล้ว</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: งบส่วนตัวรายคน (Personal / Member Budgets) */}
          {activeSubTab === 'members' && (
            <form onSubmit={handleSaveMemberBudgets} className="space-y-4 animate-in fade-in">
              
              {/* Currency Bar & Real-time Relation Banner */}
              <div className="p-4 rounded-2xl bg-blue-50/40 dark:bg-[#1c2438] border border-blue-200/60 dark:border-[#222c42] space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      สกุลเงินงบ:
                    </span>
                    <select
                      className="px-2 py-1 rounded-lg border border-slate-300 dark:border-[#2a3650] bg-white dark:bg-[#151b2b] text-slate-900 dark:text-white text-xs font-bold outline-none focus:border-blue-500"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    >
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.flag} {c.code} ({c.symbol})</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleAutoSplitMembers}
                    className="px-2.5 py-1 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 hover:bg-blue-200 border border-blue-300 dark:border-blue-800 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer hover:scale-105"
                  >
                    <Divide className="h-3 w-3" /> หารเฉลี่ยเท่ากัน ({Math.floor(Number(totalBudget || 0) / (allMembersList.length || 1)).toLocaleString()} {currency})
                  </button>
                </div>

                <div className="flex justify-between items-center text-[11px] font-bold pt-1.5 border-t border-slate-200/80 dark:border-[#222c42]">
                  <span className="text-slate-600 dark:text-slate-300">
                    รวมงบทุกคน: {totalMemberAllocated.toLocaleString()} {currency}
                  </span>
                  <span className={remainingMemberBudget < 0 ? 'text-rose-600 font-extrabold' : 'text-emerald-600 font-extrabold'}>
                    {remainingMemberBudget >= 0 
                      ? `คงเหลือจัดสรร: ${remainingMemberBudget.toLocaleString()} ${currency}` 
                      : `⚠️ เกินงบรวม: +${Math.abs(remainingMemberBudget).toLocaleString()} ${currency}`}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                {allMembersList.map((m) => {
                  const mCat = getCatAvatar(m.avatar);
                  const currentVal = memberBudgets[m.key] !== undefined ? memberBudgets[m.key] : '';
                  const memberShare = Number(totalBudget || 0) > 0 ? (Number(currentVal || 0) / Number(totalBudget)) * 100 : 0;
                  const numVal = Number(currentVal || 0);

                  return (
                    <div
                      key={m.key}
                      className="p-3 rounded-2xl border border-slate-200 dark:border-[#222c42] bg-slate-50/60 dark:bg-[#1c2438]/70 flex items-center justify-between gap-3 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CatAvatarBadge cat={mCat} size="md" />
                        <div className="min-w-0">
                          <span className="text-xs font-black text-slate-900 dark:text-white truncate block">
                            {m.name}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate block font-medium">
                            {memberShare > 0 ? `${memberShare.toFixed(1)}% ของงบรวมทริป` : 'ยังไม่ระบุงบ'}
                            {numVal > 0 && (
                              <span className="ml-1 text-blue-600 dark:text-blue-400 font-mono">
                                ({formatSecondaryPreview(numVal, currency)})
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          step="any"
                          placeholder="0"
                          className="w-28 p-2 rounded-xl border border-slate-300 dark:border-[#2a3650] bg-white dark:bg-[#151b2b] text-slate-900 dark:text-white text-xs font-black font-mono text-right outline-none focus:border-blue-500"
                          value={currentVal}
                          onChange={(e) => handleMemberBudgetChange(m.key, e.target.value)}
                        />
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{currency}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#222c42]">
                {budgetSuccess && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> บันทึกงบรายคน ({currency}) แล้ว
                  </span>
                )}
                <button
                  type="submit"
                  className="ml-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 transition-all"
                >
                  <Check className="h-3.5 w-3.5" /> บันทึกงบรายบุคคล ({currency})
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: จัดสรรงบหมวดหมู่ (Category Budgets) */}
          {activeSubTab === 'categories' && (
            <form onSubmit={handleSaveCategoryBudgets} className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-blue-50/40 dark:bg-[#1c2438] border border-blue-200/60 dark:border-[#222c42] space-y-2">
                <div className="flex justify-between items-center text-xs font-black text-slate-900 dark:text-white">
                  <div className="flex items-center gap-2">
                    <span>สกุลเงิน:</span>
                    <select
                      className="px-2 py-0.5 rounded-lg border border-slate-300 dark:border-[#2a3650] bg-white dark:bg-[#151b2b] text-slate-900 dark:text-white text-xs font-bold outline-none"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    >
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                      ))}
                    </select>
                  </div>
                  <span>จัดสรรไปแล้ว: {totalCatAllocated.toLocaleString()} {currency}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-bold border-t border-slate-200/80 dark:border-[#222c42] pt-1">
                  <span className="text-slate-500 dark:text-slate-400">งบรวมทริป: {Number(totalBudget || 0).toLocaleString()} {currency}</span>
                  <span className={remainingCatBudget < 0 ? 'text-rose-600 font-extrabold' : 'text-emerald-600 font-extrabold'}>
                    {remainingCatBudget >= 0 ? `คงเหลือจัดสรร: ${remainingCatBudget.toLocaleString()} ${currency}` : `⚠️ เกินงบรวม: +${Math.abs(remainingCatBudget).toLocaleString()} ${currency}`}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                {categories.map((cat) => {
                  const currentVal = categoryBudgets[cat.id] !== undefined ? categoryBudgets[cat.id] : '';
                  const numVal = Number(currentVal || 0);

                  return (
                    <div
                      key={cat.id}
                      className="p-3 rounded-2xl border border-slate-200 dark:border-[#222c42] bg-slate-50/60 dark:bg-[#1c2438]/70 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl p-1.5 rounded-xl bg-white dark:bg-[#151b2b] shadow-2xs shrink-0">
                          {cat.icon}
                        </span>
                        <div className="min-w-0">
                          <span className="text-xs font-black text-slate-900 dark:text-white block truncate">
                            {cat.label}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-medium">
                            {cat.isCustom ? '✨ หมวดกำหนดเอง' : 'หมวดหมู่พื้นฐาน'}
                            {numVal > 0 && (
                              <span className="ml-1 text-blue-600 dark:text-blue-400 font-mono">
                                ({formatSecondaryPreview(numVal, currency)})
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          step="any"
                          placeholder="0"
                          className="w-28 p-2 rounded-xl border border-slate-300 dark:border-[#2a3650] bg-white dark:bg-[#151b2b] text-slate-900 dark:text-white text-xs font-black font-mono text-right outline-none focus:border-blue-500"
                          value={currentVal}
                          onChange={(e) => handleBudgetChange(cat.id, e.target.value)}
                        />
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{currency}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#222c42]">
                {budgetSuccess && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> บันทึกงบหมวดหมู่ ({currency}) แล้ว
                  </span>
                )}
                <button
                  type="submit"
                  className="ml-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 transition-all"
                >
                  <Check className="h-3.5 w-3.5" /> บันทึกงบหมวดหมู่ ({currency})
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: หมวดหมู่กำหนดเอง (Custom Categories) */}
          {activeSubTab === 'custom' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  หมวดหมู่ทั้งหมดในทริปนี้ ({categories.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddCatForm(!showAddCatForm)}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-300 dark:border-blue-800 text-xs font-bold flex items-center gap-1 hover:scale-105 transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> เพิ่มหมวดใหม่
                </button>
              </div>

              {showAddCatForm && (
                <form onSubmit={handleAddCustomCategory} className="p-4 rounded-2xl bg-blue-50/40 dark:bg-[#1c2438] border border-blue-200/60 dark:border-[#222c42] space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1">
                      ชื่อหมวดหมู่ *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น ของฝาก, ค่าเข้า USJ, โอมากาเสะ"
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#2a3650] bg-white dark:bg-[#151b2b] text-slate-900 dark:text-white text-xs font-bold outline-none focus:border-blue-500"
                      value={newCatLabel}
                      onChange={(e) => setNewCatLabel(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      เลือกไอคอน Emoji
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {EMOJI_PRESETS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setNewCatIcon(emoji)}
                          className={`w-8 h-8 rounded-xl text-base flex items-center justify-center transition-all cursor-pointer ${
                            newCatIcon === emoji
                              ? 'bg-blue-600 text-white scale-110 shadow-sm'
                              : 'bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#222c42] hover:bg-slate-100 dark:hover:bg-[#1c2438]'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddCatForm(false)}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-[#222c42] text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-[#1c2438]"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm hover:scale-105 transition-all cursor-pointer"
                    >
                      สร้างหมวดหมู่
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-3 rounded-2xl border border-slate-200 dark:border-[#222c42] bg-slate-50/50 dark:bg-[#1c2438]/70 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl p-1.5 rounded-xl bg-white dark:bg-[#151b2b] shadow-2xs">
                        {cat.icon}
                      </span>
                      <div>
                        <span className="text-xs font-black text-slate-900 dark:text-white block">
                          {cat.label}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {cat.isCustom ? '✨ หมวดหมู่สร้างเอง' : 'ค่าเริ่มต้นระบบ'}
                        </span>
                      </div>
                    </div>

                    {cat.isCustom && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomCategory(cat.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title="ลบหมวดหมู่นี้"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 pt-3 border-t border-slate-100 dark:border-[#222c42] flex items-center justify-between">
          {onOpenRollback ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenRollback();
              }}
              className="text-[11px] font-bold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 flex items-center gap-1.5 cursor-pointer hover:underline"
            >
              <History className="h-3.5 w-3.5" />
              <span>ประวัติเวอร์ชัน & สำรองไฟล์ JSON (Rollback)</span>
            </button>
          ) : <div />}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-slate-300 dark:border-[#222c42] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1c2438] transition-colors cursor-pointer"
          >
            เสร็จสิ้น
          </button>
        </div>

      </div>
    </div>
  );
}
