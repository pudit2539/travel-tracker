// src/components/trip-detail/modals/ScanExpenseModal.tsx
'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Loader2,
  Plus,
  Sparkles,
  Utensils,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { CatAvatarBadge } from '@/components/CatAvatarBadge';
import ItemizedReceiptSplitter, { ItemizedDish } from '@/components/ItemizedReceiptSplitter';
import { getCatAvatar } from '@/lib/avatars';
import { CategoryItem } from '@/lib/categories';
import { calculateJapanTaxFree, convertCurrency } from '@/lib/currency';
import { triggerHaptic } from '@/lib/haptics';
import { QUICK_EXPENSE_PRESETS } from '@/lib/tripStatus';

interface ScanExpenseModalProps {
  isOpen: boolean;
  mounted: boolean;
  onClose: () => void;
  userCat: any;
  scanning: boolean;
  savingExpense: boolean;
  hasSavedGeminiKey: boolean;
  onOpenAiKeyModal: () => void;
  onReceiptImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  ocrErrorToast: string | null;
  ocrSuccessToast: string | null;
  scannedData: any;
  setScannedData: React.Dispatch<React.SetStateAction<any>>;
  fxRate: number;
  categories: CategoryItem[];
  allMembersForSplit: Array<{ id: string; name: string; avatar: string }>;
  addSplitMode: 'all' | 'single' | 'custom';
  setAddSplitMode: React.Dispatch<React.SetStateAction<'all' | 'single' | 'custom'>>;
  addSplitWith: string[];
  setAddSplitWith: React.Dispatch<React.SetStateAction<string[]>>;
  splitAsSeparateExpenses: boolean;
  setSplitAsSeparateExpenses: (val: boolean) => void;
  onSaveExpense: () => void;
}

export const ScanExpenseModal = React.memo(function ScanExpenseModal({
  isOpen,
  mounted,
  onClose,
  userCat,
  scanning,
  savingExpense,
  hasSavedGeminiKey,
  onOpenAiKeyModal,
  onReceiptImageChange,
  ocrErrorToast,
  ocrSuccessToast,
  scannedData,
  setScannedData,
  fxRate,
  categories,
  allMembersForSplit,
  addSplitMode,
  setAddSplitMode,
  addSplitWith,
  setAddSplitWith,
  splitAsSeparateExpenses,
  setSplitAsSeparateExpenses,
  onSaveExpense,
}: ScanExpenseModalProps) {
  if (!isOpen || !mounted) return null;

  const numericAmount = Number(scannedData.amount) || 0;
  const isJpy = (scannedData.currency || '').toUpperCase() === 'JPY';
  const taxFree = isJpy && numericAmount > 0 ? calculateJapanTaxFree(numericAmount) : null;

  const handleApplyTaxFree = (mode: '10' | '8') => {
    if (!taxFree) return;
    const nextAmt = mode === '10' ? taxFree.netAmount10 : taxFree.netAmount8;
    const savedAmt = mode === '10' ? taxFree.savedTax10 : taxFree.savedTax8;
    triggerHaptic('light');
    setScannedData((prev: any) => ({
      ...prev,
      amount: String(nextAmt),
    }));
    toast.success(`หัก Tax-Free ${mode}% แล้ว: เหลือ ¥${nextAmt.toLocaleString()} (ประหยัด ¥${savedAmt.toLocaleString()}) ✨`);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-md bg-black/80 p-3 sm:p-4 overscroll-contain overflow-x-hidden animate-in fade-in duration-200 select-none"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl sm:rounded-3xl bg-white dark:bg-[#161c27] shadow-2xl border border-slate-200/90 dark:border-[#24324a] glow-blue max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 pb-3 flex justify-between items-center border-b border-slate-200/90 dark:border-[#24324a] shrink-0">
          <div className="flex items-center gap-2.5">
            <CatAvatarBadge cat={userCat} size="lg" />
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                บันทึกค่าใช้จ่าย 🧾
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                กรอกข้อมูลหรือสแกนใบเสร็จในหน้าเดียว
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1a202c] cursor-pointer transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 pt-3 overflow-y-auto overflow-x-hidden touch-pan-y overscroll-contain flex-1 min-h-0 custom-scrollbar space-y-4">
          {/* 1. Receipt Upload Area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1 text-[11px]">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                ⚡ สแกนตัวหนังสือตามภาพจริง (ไม่สุ่มมั่ว)
              </span>
              <button
                type="button"
                onClick={onOpenAiKeyModal}
                className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer active:scale-95"
              >
                <Sparkles className="h-3 w-3" />
                <span>{hasSavedGeminiKey ? 'Gemini Key (เชื่อมต่อแล้ว)' : 'ตั้งค่า AI Key'}</span>
              </button>
            </div>

            <label className="relative overflow-hidden flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-blue-200 dark:border-[#24324a] rounded-2xl cursor-pointer bg-blue-50/20 dark:bg-[#1a202c] hover:border-blue-400 hover:opacity-95 transition-all">
              {scanning && <div className="animate-scan-laser z-20" />}

              {scanning ? (
                <div className="flex flex-col items-center gap-1.5 text-blue-600 dark:text-blue-400 z-10">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="text-xs font-black tracking-wide">
                    ⚡ AI กำลังสแกนแยกรายการจากใบเสร็จ...
                  </span>
                </div>
              ) : scannedData.receipt_url ? (
                <div className="flex items-center gap-2.5 p-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <span className="truncate">แนบรูปใบเสร็จแล้ว (แตะเพื่อเปลี่ยนรูป)</span>
                </div>
              ) : (
                <>
                  <Camera className="h-6 w-6 text-blue-500 mb-1 animate-float-slow" />
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                    ถ่ายรูปใบเสร็จ หรือเลือกรูปจากโทรศัพท์
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    AI ช่วยเติมชื่อร้าน ยอดเงิน และรายการสินค้าให้อัตโนมัติ
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={scanning}
                onChange={onReceiptImageChange}
              />
            </label>
          </div>

          {ocrErrorToast && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/80 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-start justify-between gap-2 animate-in fade-in">
              <div className="flex items-start gap-2 min-w-0">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                <span className="leading-snug">{ocrErrorToast}</span>
              </div>
              {!hasSavedGeminiKey && (
                <button
                  type="button"
                  onClick={onOpenAiKeyModal}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black shrink-0 cursor-pointer shadow-xs active:scale-95"
                >
                  ใส่ API Key
                </button>
              )}
            </div>
          )}

          {ocrSuccessToast && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/80 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span className="line-clamp-2">{ocrSuccessToast}</span>
            </div>
          )}

          {/* 2. Main Expense Fields Card */}
          <div className="space-y-3 p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-[#1a202c] border border-slate-200/80 dark:border-[#24324a]">
            {/* 1-Tap Quick Expense Presets */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 flex items-center gap-1">
                  ⚡ กดเลือกด่วน 1-Tap (ไม่ต้องพิมพ์เอง):
                </span>
                <span className="text-[10px] font-semibold text-slate-400">เลื่อนซ้าย-ขวา ➔</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar overscroll-x-contain">
                {QUICK_EXPENSE_PRESETS.map((preset) => {
                  const isActive = scannedData.title === preset.title;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setScannedData((prev: any) => ({
                          ...prev,
                          title: preset.title,
                          category: preset.category,
                          payment_method: preset.paymentMethod,
                          amount: preset.defaultAmount ? String(preset.defaultAmount) : prev.amount,
                        }));
                      }}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold shrink-0 border transition-all cursor-pointer active:scale-95 ${
                        isActive
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-[#161c27] text-slate-700 dark:text-slate-200 border-slate-200/90 dark:border-[#24324a] hover:border-blue-400'
                      }`}
                    >
                      <span>{preset.emoji}</span>
                      <span>{preset.label}</span>
                      {preset.defaultAmount && (
                        <span
                          className={`text-[10px] font-mono ${
                            isActive ? 'text-blue-100' : 'text-blue-600 dark:text-blue-400'
                          }`}
                        >
                          ¥{preset.defaultAmount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Store / Merchant Name */}
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">
                ชื่อรายการ / ร้านค้า *
              </label>
              <input
                type="text"
                required
                placeholder="เช่น KFC พระโขนง, Shabu Buffet, ร้านขายยา Matsumoto"
                className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-[#24324a] bg-white dark:bg-[#161c27] text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-bold transition-all"
                value={scannedData.title}
                onChange={(e) => setScannedData({ ...scannedData, title: e.target.value })}
              />
            </div>

            {/* Amount & Currency + 1-Tap Japan Tax-Free 10% Helper */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span>ยอดเงินรวม *</span>
                    {scannedData.items && scannedData.items.length > 0 && (
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                        (คำนวณจากรายการ)
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="0.00"
                    className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-[#24324a] bg-white dark:bg-[#161c27] text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-black font-mono transition-all"
                    value={scannedData.amount}
                    onChange={(e) => setScannedData({ ...scannedData, amount: e.target.value })}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      สกุลเงิน
                    </label>
                    <div className="flex items-center gap-1">
                      {(['JPY', 'THB'] as const).map((quickCurr) => {
                        const active = scannedData.currency === quickCurr;
                        return (
                          <button
                            key={quickCurr}
                            type="button"
                            onClick={() => setScannedData({ ...scannedData, currency: quickCurr })}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black transition-all cursor-pointer border ${
                              active
                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                : 'bg-slate-100 dark:bg-[#1a202c] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#24324a] hover:border-blue-400'
                            }`}
                          >
                            {quickCurr === 'JPY' ? '🇯🇵 JPY' : '🇹🇭 THB'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <select
                    className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-[#24324a] bg-white dark:bg-[#161c27] text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:border-blue-600 font-bold transition-all"
                    value={scannedData.currency}
                    onChange={(e) => setScannedData({ ...scannedData, currency: e.target.value })}
                  >
                    <option value="THB">THB (฿)</option>
                    <option value="JPY">JPY (¥)</option>
                    <option value="CNY">CNY (元)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="KRW">KRW (₩)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="SGD">SGD (S$)</option>
                  </select>
                </div>
              </div>

              {numericAmount > 0 && (
                <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#161c27] border border-slate-200/70 dark:border-[#24324a] text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400 font-bold">
                    ยอดแปลงประมาณการ
                  </span>
                  <span className="font-black font-mono text-blue-600 dark:text-[#4cd7f6]">
                    {scannedData.currency === 'THB'
                      ? `≈ ¥${Math.round(convertCurrency(numericAmount, 'THB', 'JPY', fxRate)).toLocaleString()} JPY`
                      : `≈ ฿${convertCurrency(numericAmount, scannedData.currency, 'THB', fxRate).toLocaleString(undefined, { maximumFractionDigits: 2 })} THB`}
                  </span>
                </div>
              )}

              {/* Smart Japan Tax-Free 10% / 8% 1-Tap Helper */}
              {taxFree && (scannedData.category === 'shopping' || taxFree.isEligible) && (
                <div className="p-2.5 rounded-xl bg-[#eff6ff] dark:bg-[#080e19]/85 border border-[#bfdbfe] dark:border-[#4cd7f6]/25 space-y-2">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-bold text-[#1e3a8a] dark:text-[#4cd7f6] flex items-center gap-1">
                      <span>🛂 ตัวช่วยหัก Tax-Free ญี่ปุ่น</span>
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        taxFree.isEligible
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/30'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-400/30'
                      }`}
                    >
                      {taxFree.isEligible
                        ? '✓ ถึงเกณฑ์ ≥ ¥5,500'
                        : `ขาดอีก ¥${taxFree.shortfallJpy.toLocaleString()} ถึงเกณฑ์`}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleApplyTaxFree('10')}
                      aria-label="หัก Tax-Free 10%"
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-blue-50 dark:bg-[#161c27] dark:hover:bg-[#242a36] border border-[#bfdbfe] dark:border-[#24324a] text-[11px] font-bold text-[#0f172a] dark:text-[#dde2f3] flex items-center justify-between gap-1 cursor-pointer active:scale-95 transition-all"
                    >
                      <span>🛍️ หัก 10%</span>
                      <span className="font-mono text-[#2563eb] dark:text-[#4cd7f6]">
                        → ¥{taxFree.netAmount10.toLocaleString()}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyTaxFree('8')}
                      aria-label="หัก Tax-Free 8%"
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-blue-50 dark:bg-[#161c27] dark:hover:bg-[#242a36] border border-[#bfdbfe] dark:border-[#24324a] text-[11px] font-bold text-[#0f172a] dark:text-[#dde2f3] flex items-center justify-between gap-1 cursor-pointer active:scale-95 transition-all"
                    >
                      <span>🍱 ขนม 8%</span>
                      <span className="font-mono text-[#0284c7] dark:text-[#7bd0ff]">
                        → ¥{taxFree.netAmount8.toLocaleString()}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Category & Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">
                  หมวดหมู่
                </label>
                <select
                  className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-[#24324a] bg-white dark:bg-[#161c27] text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:border-blue-600 font-bold transition-all"
                  value={scannedData.category}
                  onChange={(e) => setScannedData({ ...scannedData, category: e.target.value })}
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">
                  วันที่ใช้จ่าย
                </label>
                <input
                  type="date"
                  className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-[#24324a] bg-white dark:bg-[#161c27] text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:border-blue-600 font-bold transition-all"
                  value={scannedData.spent_at}
                  onChange={(e) => setScannedData({ ...scannedData, spent_at: e.target.value })}
                />
              </div>
            </div>

            {/* Payer */}
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">
                💳 ใครเป็นคนสำรองจ่ายเงินไปก่อน?
              </label>
              <select
                className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-[#24324a] bg-white dark:bg-[#161c27] text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:border-blue-600 font-bold transition-all"
                value={scannedData.payer_id || 'me'}
                onChange={(e) => {
                  const newPayerId = e.target.value;
                  setScannedData({ ...scannedData, payer_id: newPayerId });
                  if (addSplitMode === 'single') {
                    setAddSplitWith([newPayerId]);
                  }
                }}
              >
                {allMembersForSplit.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Source Selector */}
            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-800 dark:text-slate-200">
                👛 จ่ายด้วยวิธีไหน? (ตัดจากกระเป๋าเงิน)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setScannedData({ ...scannedData, payment_method: 'cash' })}
                  className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 border text-xs font-black transition-all cursor-pointer active:scale-95 ${
                    (scannedData.payment_method || 'cash') === 'cash'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-white dark:bg-[#161c27] border-slate-200 dark:border-[#24324a] text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xl">💵</span>
                  <span>เงินสด</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScannedData({ ...scannedData, payment_method: 'travel_card' })}
                  className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 border text-xs font-black transition-all cursor-pointer active:scale-95 ${
                    scannedData.payment_method === 'travel_card'
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                      : 'bg-white dark:bg-[#161c27] border-slate-200 dark:border-[#24324a] text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xl">💳</span>
                  <span>Travel Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScannedData({ ...scannedData, payment_method: 'credit_card' })}
                  className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 border text-xs font-black transition-all cursor-pointer active:scale-95 ${
                    scannedData.payment_method === 'credit_card'
                      ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20 shadow-xs'
                      : 'bg-white dark:bg-[#161c27] border-slate-200 dark:border-[#24324a] text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xl">💳</span>
                  <span>บัตรเครดิต</span>
                </button>
              </div>
            </div>

            {/* Split With Section for Lump-sum bills */}
            {(!scannedData.items || scannedData.items.length === 0) &&
              (() => {
                const effectiveSplit =
                  addSplitWith && addSplitWith.length > 0
                    ? addSplitWith
                    : allMembersForSplit.map((m) => m.id);
                const isSingle =
                  addSplitMode === 'single' ||
                  (effectiveSplit.length === 1 &&
                    effectiveSplit[0] === (scannedData.payer_id || 'me'));
                const isAll =
                  addSplitMode === 'all' || effectiveSplit.length === allMembersForSplit.length;

                return (
                  <div className="space-y-2.5 pt-2 border-t border-slate-200/70 dark:border-[#24324a]">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                        👥 ใครร่วมหารรายการนี้บ้าง? (Split With)
                      </label>
                      <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900">
                        {effectiveSplit.length} คน
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAddSplitMode('all');
                          setAddSplitWith(allMembersForSplit.map((m) => m.id));
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                          isAll
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white dark:bg-[#161c27] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#24324a] hover:border-blue-300'
                        }`}
                      >
                        <span>👥 หารทุกคน ({allMembersForSplit.length} คน)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddSplitMode('single');
                          setAddSplitWith([scannedData.payer_id || 'me']);
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                          isSingle
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-white dark:bg-[#161c27] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#24324a] hover:border-amber-300'
                        }`}
                      >
                        <span>👤 จ่ายคนเดียว (ไม่หาร)</span>
                      </button>
                    </div>

                    <div className="p-2.5 rounded-2xl border border-slate-200 dark:border-[#24324a] bg-white/70 dark:bg-[#161c27]/70 space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        แตะเลือกสมาชิกที่ร่วมหาร:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {allMembersForSplit.map((m) => {
                          const isSelected = effectiveSplit.includes(m.id);
                          const cat = getCatAvatar(m.avatar);
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setAddSplitMode('custom');
                                if (isSelected) {
                                  if (effectiveSplit.length > 1) {
                                    setAddSplitWith(effectiveSplit.filter((id) => id !== m.id));
                                  }
                                } else {
                                  setAddSplitWith([...effectiveSplit, m.id]);
                                }
                              }}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-500 text-blue-700 dark:text-blue-200 shadow-2xs'
                                  : 'bg-white dark:bg-[#161c27] border-slate-200 dark:border-[#24324a] text-slate-500 dark:text-slate-400 opacity-75 hover:opacity-100'
                              }`}
                            >
                              <CatAvatarBadge cat={cat} size="xs" />
                              <span>{m.name}</span>
                              {isSelected && (
                                <span className="text-blue-600 dark:text-blue-400 font-black">✓</span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {numericAmount > 0 && (
                        <div className="pt-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between border-t border-slate-100 dark:border-[#24324a]/60 mt-1">
                          <span>
                            {effectiveSplit.length === 1 ? (
                              <span className="text-amber-600 dark:text-amber-400 font-bold">
                                👤 บันทึกจ่ายคนเดียวเต็มจำนวน (ไม่หาร)
                              </span>
                            ) : (
                              <span>ยอดหารเฉลี่ย ({effectiveSplit.length} คน):</span>
                            )}
                          </span>
                          <span className="text-blue-600 dark:text-blue-400 font-black font-mono">
                            {effectiveSplit.length > 1
                              ? `คนละ ≈ ${(numericAmount / effectiveSplit.length).toLocaleString(undefined, { maximumFractionDigits: 0 })} ${scannedData.currency || 'THB'}`
                              : `${numericAmount.toLocaleString()} ${scannedData.currency || 'THB'}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
          </div>

          {/* 3. Itemized Split Section */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Utensils className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  แยกรายการสินค้า / สมาชิกที่ร่วมหาร
                </h3>
                {scannedData.items && scannedData.items.length > 0 && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-600 text-white">
                    {scannedData.items.length} รายการ
                  </span>
                )}
              </div>

              {(!scannedData.items || scannedData.items.length === 0) && (
                <button
                  type="button"
                  onClick={() => {
                    const defaultItem: ItemizedDish = {
                      id: `item_${Date.now()}`,
                      name: scannedData.title || 'รายการที่ 1',
                      amount: numericAmount,
                      qty: 1,
                      assignedMemberIds: allMembersForSplit.map((m) => m.id),
                    };
                    setScannedData((prev: any) => ({
                      ...prev,
                      items: [defaultItem],
                    }));
                  }}
                  className="text-xs font-black text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 cursor-pointer active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ เพิ่มรายการแยกคนหาร</span>
                </button>
              )}
            </div>

            {scannedData.items && scannedData.items.length > 0 ? (
              <div className="space-y-3">
                <ItemizedReceiptSplitter
                  items={scannedData.items}
                  onChangeItems={(newItems) => {
                    setScannedData((prev: any) => {
                      const newSum = newItems.reduce((sum, it) => sum + Number(it.amount || 0), 0);
                      return {
                        ...prev,
                        items: newItems,
                        amount: newSum > 0 ? String(newSum) : prev.amount,
                      };
                    });
                  }}
                  members={allMembersForSplit}
                  currency={scannedData.currency || 'THB'}
                  totalReceiptAmount={numericAmount}
                  onUpdateTotalAmount={(newTotal) =>
                    setScannedData((prev: any) => ({ ...prev, amount: String(newTotal) }))
                  }
                />

                <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-blue-50/20 dark:bg-[#1a202c] border border-blue-100 dark:border-[#24324a] cursor-pointer hover:border-blue-400 transition-all shadow-2xs">
                  <input
                    type="checkbox"
                    checked={splitAsSeparateExpenses}
                    onChange={(e) => setSplitAsSeparateExpenses(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-black text-slate-900 dark:text-white block">
                      แยกบันทึกเป็นรายการของแต่ละคนอัตโนมัติ 🪄
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-300 block font-medium mt-0.5">
                      ระบบจะสร้างรายการค่าใช้จ่ายแยกชื่อตามยอดที่แต่ละคนกิน/ใช้จริง เพื่อให้เห็นสถิติชัดเจนในกราฟ
                    </span>
                  </div>
                </label>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl border border-dashed border-slate-200 dark:border-[#24324a] bg-slate-50/50 dark:bg-[#1a202c]/40 text-center space-y-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  💡 บิลนี้จะบันทึกเป็นยอดรวมก้อนเดียว ({scannedData.amount || '0'}{' '}
                  {scannedData.currency || 'THB'})
                </p>
                <p className="text-[11px] text-slate-400">
                  หรือกด{' '}
                  <button
                    type="button"
                    onClick={() => {
                      const defaultItem: ItemizedDish = {
                        id: `item_${Date.now()}`,
                        name: scannedData.title || 'รายการที่ 1',
                        amount: numericAmount,
                        qty: 1,
                        assignedMemberIds: allMembersForSplit.map((m) => m.id),
                      };
                      setScannedData((prev: any) => ({
                        ...prev,
                        items: [defaultItem],
                      }));
                    }}
                    className="text-blue-600 dark:text-blue-400 font-bold underline cursor-pointer"
                  >
                    + เพิ่มรายการย่อย
                  </button>{' '}
                  เพื่อเลือกว่าเมนูไหนใครกินบ้าง
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Buttons */}
        <div className="p-3.5 sm:p-4 px-4 sm:px-6 border-t border-slate-200/90 dark:border-[#24324a] flex gap-2.5 bg-slate-50/90 dark:bg-[#1a202c]/90 backdrop-blur-md shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-[#24324a] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1a202c] transition-colors cursor-pointer min-h-[42px] touch-manipulation active:scale-95"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onSaveExpense}
            disabled={scanning || savingExpense}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all disabled:opacity-50 cursor-pointer hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-1.5 min-h-[42px] touch-manipulation"
          >
            {savingExpense ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> กำลังบันทึก...
              </>
            ) : splitAsSeparateExpenses && scannedData.items?.length > 0 ? (
              'แยกบันทึกรายคน'
            ) : addSplitWith.length === 1 || addSplitMode === 'single' ? (
              '✓ บันทึกรายการ (จ่ายคนเดียว)'
            ) : (
              `✓ บันทึกรายการ (หารทุกคน ${allMembersForSplit.length} คน)`
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
});

export default ScanExpenseModal;
