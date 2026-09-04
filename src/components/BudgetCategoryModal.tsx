// src/components/BudgetCategoryModal.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  X, DollarSign, Plus, Trash2, Check, Sparkles, 
  Coins, AlertCircle, CheckCircle2, PieChart, Sliders, 
  Tag, ShieldAlert, ArrowRight, Layers, History, Users, User, 
  Divide, Calculator, ArrowDownRight, ArrowUpRight 
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

interface BudgetCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: any;
  expenses: any[];
  members?: any[];
  currentUser?: any;
  userDisplayName?: string;
  fxRate?: number;
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
  onUpdated,
  onOpenRollback,
}: BudgetCategoryModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'budget' | 'members' | 'categories' | 'custom'>('budget');
  
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
      { key: 'me', name: userDisplayName + ' (ฉัน)', email: currentUser?.email, avatar: 'cat_pink', isMe: true },
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
      setTotalBudget(String(trip.total_budget ?? trip.budget ?? 0));
      setCurrency(trip.currency || 'JPY');

      const cats = getTripCategories(trip.id);
      setCategories(cats);

      const cBudgets = getCategoryBudgets(trip.id);
      setCategoryBudgets(cBudgets);

      const mBudgets = getMemberBudgets(trip.id);
      setMemberBudgets(mBudgets);
    }
  }, [isOpen, trip]);

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

  // 2. Save Category Budgets to LocalStorage
  const handleSaveCategoryBudgets = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip?.id) return;
    saveCategoryBudgets(trip.id, categoryBudgets);
    setBudgetSuccess(true);
    onUpdated();
    setTimeout(() => setBudgetSuccess(false), 2500);
  };

  // 3. Save Member Budgets to LocalStorage
  const handleSaveMemberBudgets = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip?.id) return;
    saveMemberBudgets(trip.id, memberBudgets);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-[#130d22] shadow-2xl border border-slate-200 dark:border-purple-800/60 glow-pink-purple max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 pb-3 flex justify-between items-center border-b border-slate-100 dark:border-purple-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white text-lg shadow-md shadow-pink-500/25">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                จัดการงบประมาณ & หมวดหมู่ 🎯
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-purple-300/70 font-medium">
                เชื่อมโยงงบรวมทริป, งบส่วนตัวรายคน, จัดสรรตามหมวด และคำนวณยอดคงเหลือ
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

        {/* Sub Navigation Pills */}
        <div className="flex p-2 gap-1.5 bg-slate-50 dark:bg-purple-950/40 border-b border-slate-100 dark:border-purple-900/40 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('budget')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'budget'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-purple-300 hover:bg-slate-200 dark:hover:bg-purple-900/40'
            }`}
          >
            <DollarSign className="h-3.5 w-3.5" /> งบรวมทริป
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('members')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'members'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-purple-300 hover:bg-slate-200 dark:hover:bg-purple-900/40'
            }`}
          >
            <Users className="h-3.5 w-3.5" /> งบส่วนตัวรายคน
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('categories')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'categories'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-purple-300 hover:bg-slate-200 dark:hover:bg-purple-900/40'
            }`}
          >
            <PieChart className="h-3.5 w-3.5" /> จัดสรรงบหมวดหมู่
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('custom')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'custom'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-purple-300 hover:bg-slate-200 dark:hover:bg-purple-900/40'
            }`}
          >
            <Tag className="h-3.5 w-3.5" /> หมวดหมู่ ({categories.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 pt-4 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          
          {/* TAB 1: งบประมาณรวมทริป (Total Budget) */}
          {activeSubTab === 'budget' && (
            <div className="space-y-4 animate-in fade-in">
              <form onSubmit={handleSaveTotalBudget} className="p-5 rounded-2xl bg-pink-50/50 dark:bg-purple-950/30 border border-pink-200 dark:border-purple-900/40 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Coins className="h-4 w-4 text-pink-500" /> งบประมาณรวมทั้งทริป (Total Trip Budget)
                  </span>
                  <span className="text-[10px] text-pink-600 dark:text-pink-400 font-bold">
                    บันทึกตรงสู่ฐานข้อมูล
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold mb-1 text-slate-700 dark:text-purple-200">
                      จำนวนเงินงบประมาณ
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="เช่น 100000"
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-purple-800 bg-white dark:bg-[#1c1328] text-slate-900 dark:text-white text-sm font-black outline-none focus:border-pink-500"
                      value={totalBudget}
                      onChange={(e) => setTotalBudget(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold mb-1 text-slate-700 dark:text-purple-200">
                      สกุลเงินหลัก
                    </label>
                    <select
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-purple-800 bg-white dark:bg-[#1c1328] text-slate-900 dark:text-white text-xs font-bold outline-none focus:border-pink-500"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    >
                      <option value="JPY">JPY (¥)</option>
                      <option value="THB">THB (฿)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="KRW">KRW (₩)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-purple-300">
                    ≈ ฿{Math.round(Number(totalBudget || 0) * fxRate).toLocaleString()} THB
                  </div>

                  <button
                    type="submit"
                    disabled={savingTotal}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold shadow-md shadow-pink-500/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 hover:scale-105 transition-all"
                  >
                    {savingTotal ? 'กำลังบันทึก...' : <><Check className="h-3.5 w-3.5" /> บันทึกงบรวม</>}
                  </button>
                </div>
              </form>

              {totalSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 border border-emerald-200 dark:border-emerald-900 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>บันทึกงบประมาณรวมทริปเรียบร้อยแล้ว</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: งบส่วนตัวรายคน (Personal / Member Budgets) */}
          {activeSubTab === 'members' && (
            <form onSubmit={handleSaveMemberBudgets} className="space-y-4 animate-in fade-in">
              
              {/* Real-time Relation Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-500/10 via-purple-600/10 to-indigo-600/10 border border-purple-200 dark:border-purple-900/50 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-black text-slate-900 dark:text-white">
                  <span>งบรวมทริปตั้งไว้: {Number(totalBudget || 0).toLocaleString()} {trip?.currency || 'JPY'}</span>
                  <button
                    type="button"
                    onClick={handleAutoSplitMembers}
                    className="px-2.5 py-1 rounded-xl bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 hover:bg-pink-200 border border-pink-300 dark:border-pink-800 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer hover:scale-105"
                  >
                    <Divide className="h-3 w-3" /> หารเฉลี่ยให้ทุกคนเท่ากัน ({Math.floor(Number(totalBudget || 0) / (allMembersList.length || 1)).toLocaleString()} {trip?.currency})
                  </button>
                </div>

                <div className="flex justify-between items-center text-[11px] font-bold pt-1 border-t border-purple-200/60 dark:border-purple-900/40">
                  <span className="text-slate-600 dark:text-purple-300">
                    รวมงบรายคน: {totalMemberAllocated.toLocaleString()} {trip?.currency}
                  </span>
                  <span className={remainingMemberBudget < 0 ? 'text-rose-600 font-extrabold' : 'text-emerald-600 font-extrabold'}>
                    {remainingMemberBudget >= 0 
                      ? `คงเหลือจัดสรร: ${remainingMemberBudget.toLocaleString()} ${trip?.currency}` 
                      : `⚠️ เกินงบรวมทริป: +${Math.abs(remainingMemberBudget).toLocaleString()} ${trip?.currency}`}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                {allMembersList.map((m) => {
                  const mCat = getCatAvatar(m.avatar);
                  const currentVal = memberBudgets[m.key] !== undefined ? memberBudgets[m.key] : '';
                  const memberShare = Number(totalBudget || 0) > 0 ? (Number(currentVal || 0) / Number(totalBudget)) * 100 : 0;

                  return (
                    <div
                      key={m.key}
                      className="p-3 rounded-2xl border border-slate-200 dark:border-purple-900/40 bg-slate-50/60 dark:bg-purple-950/20 flex items-center justify-between gap-3 hover:border-pink-300 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${mCat.bgGradient} flex items-center justify-center text-sm shadow-xs shrink-0`}>
                          {mCat.emoji}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-black text-slate-900 dark:text-white truncate block">
                            {m.name}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-purple-400 truncate block">
                            {memberShare > 0 ? `${memberShare.toFixed(1)}% ของงบรวมทริป` : 'ยังไม่ระบุงบ'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          placeholder="0"
                          className="w-28 p-2 rounded-xl border border-slate-300 dark:border-purple-800 bg-white dark:bg-[#1c1328] text-slate-900 dark:text-white text-xs font-black text-right outline-none focus:border-pink-500"
                          value={currentVal}
                          onChange={(e) => handleMemberBudgetChange(m.key, e.target.value)}
                        />
                        <span className="text-xs font-bold text-slate-500 dark:text-purple-400">{trip?.currency || 'JPY'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-purple-900/40">
                {budgetSuccess && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> บันทึกงบรายคนแล้ว
                  </span>
                )}
                <button
                  type="submit"
                  className="ml-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold shadow-md shadow-pink-500/25 flex items-center gap-1.5 cursor-pointer hover:scale-105 transition-all"
                >
                  <Check className="h-3.5 w-3.5" /> บันทึกงบรายบุคคล
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: จัดสรรงบหมวดหมู่ (Category Budgets) */}
          {activeSubTab === 'categories' && (
            <form onSubmit={handleSaveCategoryBudgets} className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 space-y-1.5">
                <div className="flex justify-between items-center text-xs font-black text-purple-950 dark:text-purple-200">
                  <span>จัดสรรไปแล้ว: {totalCatAllocated.toLocaleString()} {trip?.currency || 'JPY'}</span>
                  <span className={remainingCatBudget < 0 ? 'text-rose-600 font-extrabold' : 'text-emerald-600 font-extrabold'}>
                    {remainingCatBudget >= 0 ? `คงเหลือจัดสรร: ${remainingCatBudget.toLocaleString()} ${trip?.currency}` : `⚠️ เกินงบรวม: +${Math.abs(remainingCatBudget).toLocaleString()} ${trip?.currency}`}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                {categories.map((cat) => {
                  const currentVal = categoryBudgets[cat.id] !== undefined ? categoryBudgets[cat.id] : '';
                  return (
                    <div
                      key={cat.id}
                      className="p-3 rounded-2xl border border-slate-200 dark:border-purple-900/40 bg-slate-50/60 dark:bg-purple-950/20 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl p-1.5 rounded-xl bg-white dark:bg-[#1c1328] shadow-2xs">
                          {cat.icon}
                        </span>
                        <div>
                          <span className="text-xs font-black text-slate-900 dark:text-white block">
                            {cat.label}
                          </span>
                          {cat.isCustom && (
                            <span className="text-[10px] text-pink-600 dark:text-pink-400 font-bold">หมวดหมู่กำหนดเอง</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          placeholder="0"
                          className="w-28 p-2 rounded-xl border border-slate-300 dark:border-purple-800 bg-white dark:bg-[#1c1328] text-slate-900 dark:text-white text-xs font-black text-right outline-none focus:border-pink-500"
                          value={currentVal}
                          onChange={(e) => handleBudgetChange(cat.id, e.target.value)}
                        />
                        <span className="text-xs font-bold text-slate-500 dark:text-purple-400">{trip?.currency || 'JPY'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-purple-900/40">
                {budgetSuccess && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> บันทึกงบหมวดหมู่แล้ว
                  </span>
                )}
                <button
                  type="submit"
                  className="ml-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold shadow-md shadow-pink-500/25 flex items-center gap-1.5 cursor-pointer hover:scale-105 transition-all"
                >
                  <Check className="h-3.5 w-3.5" /> บันทึกงบหมวดหมู่
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
                  className="px-3 py-1.5 rounded-xl bg-pink-50 text-pink-700 dark:bg-pink-950 dark:text-pink-300 border border-pink-300 dark:border-pink-800 text-xs font-bold flex items-center gap-1 hover:scale-105 transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> เพิ่มหมวดใหม่
                </button>
              </div>

              {showAddCatForm && (
                <form onSubmit={handleAddCustomCategory} className="p-4 rounded-2xl bg-pink-50/60 dark:bg-purple-950/40 border border-pink-200 dark:border-purple-900/50 space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 dark:text-purple-200 mb-1">
                      ชื่อหมวดหมู่ *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น ของฝาก, ค่าเข้า USJ, โอมากาเสะ"
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-purple-800 bg-white dark:bg-[#1c1328] text-slate-900 dark:text-white text-xs font-bold outline-none focus:border-pink-500"
                      value={newCatLabel}
                      onChange={(e) => setNewCatLabel(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 dark:text-purple-200 mb-1.5">
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
                              ? 'bg-pink-500 text-white scale-110 shadow-sm'
                              : 'bg-white dark:bg-[#1c1328] border border-slate-200 dark:border-purple-900 hover:bg-slate-100'
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
                      className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 dark:text-purple-300 cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-pink-600 text-white text-xs font-bold shadow-sm hover:scale-105 transition-all cursor-pointer"
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
                    className="p-3 rounded-2xl border border-slate-200 dark:border-purple-900/40 bg-slate-50/50 dark:bg-purple-950/20 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl p-1.5 rounded-xl bg-white dark:bg-[#1c1328] shadow-2xs">
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
                        className="p-1.5 text-slate-400 hover:text-[#e06b88] hover:bg-rose-50 dark:hover:bg-[#e06b88]/20 rounded-lg transition-colors cursor-pointer"
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
        <div className="p-6 pt-3 border-t border-slate-100 dark:border-purple-900/40 flex items-center justify-between">
          {onOpenRollback ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenRollback();
              }}
              className="text-[11px] font-bold text-slate-500 hover:text-purple-600 dark:text-purple-400 dark:hover:text-purple-300 flex items-center gap-1.5 cursor-pointer hover:underline"
            >
              <History className="h-3.5 w-3.5" />
              <span>ประวัติเวอร์ชัน & สำรองไฟล์ JSON (Rollback)</span>
            </button>
          ) : <div />}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-slate-300 dark:border-purple-800 text-xs font-bold text-slate-700 dark:text-purple-200 hover:bg-slate-100 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
          >
            เสร็จสิ้น
          </button>
        </div>

      </div>
    </div>
  );
}
