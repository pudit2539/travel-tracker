// src/components/BudgetCategoryModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  X, DollarSign, Plus, Trash2, Check, Sparkles, 
  Coins, AlertCircle, CheckCircle2, PieChart, Sliders, 
  Tag, ShieldAlert, ArrowRight, Layers, History
} from 'lucide-react';
import { 
  CategoryItem, 
  CategoryBudgetMap, 
  getTripCategories, 
  saveCustomCategory, 
  deleteCustomCategory, 
  getCategoryBudgets, 
  saveCategoryBudgets 
} from '@/lib/categories';
import { supabase } from '@/lib/supabase';

interface BudgetCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: any;
  expenses: any[];
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
  fxRate = 0.235,
  onUpdated,
  onOpenRollback,
}: BudgetCategoryModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'budget' | 'categories'>('budget');
  
  // Trip Total Budget State
  const [totalBudget, setTotalBudget] = useState<string>('');
  const [currency, setCurrency] = useState<string>('JPY');
  const [savingTotal, setSavingTotal] = useState(false);
  const [totalSuccess, setTotalSuccess] = useState(false);

  // Category State
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudgetMap>({});
  
  // Add Custom Category State
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🏷️');
  const [showAddCatForm, setShowAddCatForm] = useState(false);
  
  // Save feedback
  const [budgetSuccess, setBudgetSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && trip) {
      setTotalBudget(String(trip.total_budget ?? trip.budget ?? 100000));
      setCurrency(trip.currency || 'JPY');
      loadCategoriesAndBudgets();
    }
  }, [isOpen, trip]);

  const loadCategoriesAndBudgets = () => {
    if (!trip?.id) return;
    const cats = getTripCategories(trip.id);
    const budgets = getCategoryBudgets(trip.id);
    setCategories(cats);
    setCategoryBudgets(budgets);
  };

  // 1. Update Trip Total Budget in Supabase
  const handleSaveTotalBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip?.id) return;
    setSavingTotal(true);
    try {
      const { error } = await supabase
        .from('trips')
        .update({
          total_budget: Number(totalBudget) || 0,
          currency,
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
      alert('Error: ' + err.message);
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

  // 3. Add Custom Category
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

  // 4. Delete Custom Category
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

  // Total allocated category budgets sum
  const totalAllocated = Object.values(categoryBudgets).reduce((a, b) => a + Number(b || 0), 0);
  const remainingBudget = Number(totalBudget || 0) - totalAllocated;

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
                แก้ไขงบรวม, แบ่งงบตามหมวดหมู่ และสร้างหมวดหมู่เฉพาะตัว
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

        {/* Sub Navigation Tabs */}
        <div className="px-6 pt-3 flex gap-2 border-b border-slate-100 dark:border-purple-900/40 pb-2">
          <button
            onClick={() => setActiveSubTab('budget')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'budget'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-purple-300 hover:bg-slate-100 dark:hover:bg-purple-950/40'
            }`}
          >
            💰 ตั้งงบประมาณ (รวม & แยกหมวด)
          </button>
          <button
            onClick={() => setActiveSubTab('categories')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'categories'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-purple-300 hover:bg-slate-100 dark:hover:bg-purple-950/40'
            }`}
          >
            🏷️ หมวดหมู่ทั้งหมด ({categories.length})
          </button>
        </div>

        {/* Body */}
        <div className="p-6 pt-4 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          
          {/* TAB 1: BUDGET ALLOCATION */}
          {activeSubTab === 'budget' && (
            <div className="space-y-5">
              
              {/* 1. Edit Total Trip Budget */}
              <form onSubmit={handleSaveTotalBudget} className="p-4 rounded-2xl bg-pink-50/50 dark:bg-pink-950/20 border border-pink-200/80 dark:border-pink-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-pink-700 dark:text-pink-300 flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4" /> แก้ไขงบประมาณรวมทริป (Total Trip Budget)
                  </span>
                  {totalSuccess && (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> บันทึกแล้ว!
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-purple-300 mb-1">งบประมาณรวม</label>
                    <input
                      type="number"
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-white dark:bg-[#1c1328] text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-black"
                      value={totalBudget}
                      onChange={(e) => setTotalBudget(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-purple-300 mb-1">สกุลเงิน</label>
                    <select
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-white dark:bg-[#1c1328] text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-bold"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    >
                      <option value="JPY">JPY (¥)</option>
                      <option value="THB">THB (฿)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="KRW">KRW (₩)</option>
                      <option value="SGD">SGD (S$)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <span className="text-[11px] font-bold text-pink-600 dark:text-pink-400">
                    ≈ ฿{Math.round(Number(totalBudget || 0) * fxRate).toLocaleString()} THB
                  </span>
                  <button
                    type="submit"
                    disabled={savingTotal}
                    className="px-4 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {savingTotal ? 'กำลังบันทึก...' : 'บันทึกงบรวม'}
                  </button>
                </div>
              </form>

              {/* 2. Category Budget Breakdown */}
              <form onSubmit={handleSaveCategoryBudgets} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <PieChart className="h-4 w-4 text-purple-600 dark:text-purple-400" /> ตั้งงบย่อยตามหมวดหมู่ (Category Budgets)
                    </h3>
                    <span className="text-[10px] text-slate-500 dark:text-purple-400">
                      ระบบจะคำนวณและแจ้งเตือนเมื่อยอดใช้จ่ายจริงใกล้เต็มหรือเกินงบ
                    </span>
                  </div>

                  <div className="text-right">
                    <span className={`text-[11px] font-bold ${remainingBudget < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-purple-300'}`}>
                      จัดสรรแล้ว: {totalAllocated.toLocaleString()} / {Number(totalBudget || 0).toLocaleString()} {currency}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                  {categories.map((cat) => {
                    const allocated = categoryBudgets[cat.id] || 0;
                    const spentInCat = expenses
                      .filter((e) => e.category === cat.id)
                      .reduce((a, b) => a + Number(b.amount || 0), 0);
                    
                    const isOverBudget = allocated > 0 && spentInCat > allocated;

                    return (
                      <div
                        key={cat.id}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isOverBudget
                            ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20'
                            : 'border-slate-200 dark:border-purple-900/40 bg-slate-50/50 dark:bg-purple-950/20'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-xl p-1.5 rounded-xl bg-white dark:bg-[#1c1328] shadow-2xs">
                            {cat.icon}
                          </span>
                          <div>
                            <span className="text-xs font-black text-slate-900 dark:text-white block truncate">
                              {cat.label}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-purple-400 font-medium">
                              ใช้ไปแล้ว: <b className={isOverBudget ? 'text-rose-600' : 'text-slate-700 dark:text-purple-200'}>{spentInCat.toLocaleString()}</b> {currency}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="number"
                            placeholder="0"
                            className="w-24 p-2 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-white dark:bg-[#1c1328] text-xs font-bold text-slate-900 dark:text-white text-right outline-none focus:border-pink-500"
                            value={categoryBudgets[cat.id] !== undefined ? categoryBudgets[cat.id] : ''}
                            onChange={(e) => handleBudgetChange(cat.id, e.target.value)}
                          />
                          <span className="text-[11px] font-bold text-slate-500 dark:text-purple-400">{currency}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center pt-2">
                  {budgetSuccess && (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" /> บันทึกงบรายหมวดหมู่สำเร็จแล้ว!
                    </span>
                  )}
                  <button
                    type="submit"
                    className="ml-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold shadow-md shadow-pink-500/25 hover:scale-105 transition-all cursor-pointer"
                  >
                    บันทึกงบประมาณทุกหมวดหมู่
                  </button>
                </div>
              </form>

            </div>
          )}

          {/* TAB 2: CUSTOM CATEGORIES MANAGER */}
          {activeSubTab === 'categories' && (
            <div className="space-y-4">
              
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white">
                    หมวดหมู่ค่าใช้จ่ายในทริป
                  </h3>
                  <span className="text-[10px] text-slate-500 dark:text-purple-400">
                    เพิ่มหมวดหมู่พิเศษสำหรับทริปนี้ เช่น สวนสนุก, ของฝาก, คาเฟ่
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddCatForm(!showAddCatForm)}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-sm flex items-center gap-1 hover:scale-105 transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> เพิ่มหมวดหมู่ใหม่
                </button>
              </div>

              {/* Add Custom Category Form */}
              {showAddCatForm && (
                <form onSubmit={handleAddCustomCategory} className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 space-y-3 animate-in fade-in">
                  <div className="grid grid-cols-4 gap-2">
                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-slate-700 dark:text-purple-300 mb-1">ไอคอน Emoji</label>
                      <input
                        type="text"
                        maxLength={2}
                        className="w-full p-2 rounded-xl border border-slate-300 dark:border-purple-800 bg-white dark:bg-[#1c1328] text-center text-lg outline-none focus:border-pink-500 font-bold"
                        value={newCatIcon}
                        onChange={(e) => setNewCatIcon(e.target.value)}
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-[10px] font-bold text-slate-700 dark:text-purple-300 mb-1">ชื่อหมวดหมู่ใหม่ *</label>
                      <input
                        type="text"
                        required
                        placeholder="เช่น USJ & Harry Potter, ของฝากญี่ปุ่น"
                        className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-purple-800 bg-white dark:bg-[#1c1328] text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-bold"
                        value={newCatLabel}
                        onChange={(e) => setNewCatLabel(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Emoji Presets */}
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-purple-400 font-bold block mb-1">เลือก Emoji ด่วน:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {EMOJI_PRESETS.map((em, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setNewCatIcon(em)}
                          className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center border transition-all cursor-pointer ${
                            newCatIcon === em
                              ? 'border-pink-500 bg-pink-100 dark:bg-pink-950 scale-110'
                              : 'border-slate-200 dark:border-purple-900 bg-white dark:bg-[#1c1328] hover:scale-105'
                          }`}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddCatForm(false)}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-purple-800 text-xs font-bold text-slate-700 dark:text-purple-300 cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold shadow-sm cursor-pointer"
                    >
                      บันทึกหมวดหมู่
                    </button>
                  </div>
                </form>
              )}

              {/* Categories Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto custom-scrollbar">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-3 rounded-2xl border border-slate-200 dark:border-purple-900/40 bg-slate-50/50 dark:bg-purple-950/20 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl p-1.5 rounded-xl bg-white dark:bg-[#1c1328] shadow-2xs">
                        {cat.icon}
                      </span>
                      <div>
                        <span className="text-xs font-black text-slate-900 dark:text-white block truncate">
                          {cat.label}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-purple-400 font-semibold">
                          {cat.isCustom ? '✨ หมวดหมู่สร้างเอง' : 'ค่าเริ่มต้นระบบ'}
                        </span>
                      </div>
                    </div>

                    {cat.isCustom && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomCategory(cat.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition-colors cursor-pointer"
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
