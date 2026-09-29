// src/components/ExpenseDetailModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Edit3, Trash2, Camera, Check, CheckCircle2, 
  Image as ImageIcon, Calendar, DollarSign, Wallet, 
  Tag, Loader2, ZoomIn, ArrowRight
} from 'lucide-react';
import { CategoryItem, getCategoryMeta } from '@/lib/categories';
import { getCatAvatar } from '@/lib/avatars';
import { CatAvatarBadge } from '@/components/CatAvatarBadge';
import { convertToThb } from '@/lib/currency';
import { getLocalReceiptPhoto, saveLocalReceiptPhoto } from '@/lib/localReceipts';
import { compressReceiptImage } from '@/lib/imageCompressor';

interface ExpenseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: any;
  categories: CategoryItem[];
  members: any[];
  currentUser: any;
  userDisplayName: string;
  tripBaseCurrency: string;
  fxRate: number;
  canEdit: boolean;
  startInEditMode?: boolean;
  onSaveExpense: (updatedExpense: any) => Promise<void>;
  onDeleteExpense: (id: string, receiptUrl?: string) => Promise<void> | void;
  onOpenReceiptFullscreen?: (imgUrl: string) => void;
}

export function ExpenseDetailModal({
  isOpen,
  onClose,
  expense,
  categories,
  members,
  currentUser,
  userDisplayName,
  tripBaseCurrency,
  fxRate,
  canEdit,
  startInEditMode = false,
  onSaveExpense,
  onDeleteExpense,
  onOpenReceiptFullscreen,
}: ExpenseDetailModalProps) {
  const [isEditing, setIsEditing] = useState(startInEditMode);
  const [saving, setSaving] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // Form State for editing
  const [form, setForm] = useState({
    title: '',
    amount: '',
    currency: 'THB',
    category: 'shopping',
    spent_at: '',
    payer_id: 'me',
    receipt_url: '',
  });

  // Load / initialize expense data
  useEffect(() => {
    if (expense && isOpen) {
      setIsEditing(startInEditMode);
      setForm({
        title: expense.title || '',
        amount: String(expense.amount || ''),
        currency: expense.currency || tripBaseCurrency || 'THB',
        category: expense.category || 'shopping',
        spent_at: expense.spent_at ? expense.spent_at.split('T')[0] : new Date().toISOString().split('T')[0],
        payer_id: expense.payer_id || 'me',
        receipt_url: expense.receipt_url || '',
      });

      // Load receipt photo if exists
      if (expense.receipt_url) {
        setLoadingReceipt(true);
        if (expense.receipt_url.startsWith('data:image') || expense.receipt_url.startsWith('http')) {
          setReceiptImage(expense.receipt_url);
          setLoadingReceipt(false);
        } else {
          getLocalReceiptPhoto(expense.receipt_url)
            .then((img) => setReceiptImage(img))
            .catch(() => setReceiptImage(null))
            .finally(() => setLoadingReceipt(false));
        }
      } else {
        setReceiptImage(null);
      }
    }
  }, [expense, isOpen, startInEditMode, tripBaseCurrency]);

  if (!isOpen || !expense) return null;

  // Build member options for payer selection
  const memberOptions: Array<{ id: string; name: string; avatar: string }> = [
    {
      id: 'me',
      name: `${userDisplayName} (ฉัน)`,
      avatar: currentUser?.user_metadata?.avatar_id || 'cat_trio',
    },
  ];
  members.forEach((m) => {
    const isMe = m.user_id && currentUser && m.user_id === currentUser.id;
    if (!isMe) {
      memberOptions.push({
        id: m.user_id || m.id,
        name: m.profiles?.display_name || m.profiles?.email?.split('@')[0] || 'สมาชิก',
        avatar: m.profiles?.avatar_id || 'cat_trio',
      });
    }
  });

  // Current category & payer metadata
  const currentCategoryMeta = getCategoryMeta(categories, isEditing ? form.category : expense.category);
  const payerCat = getCatAvatar(expense.payer_avatar);
  const isMyExpense =
    (expense.payer_id && currentUser && expense.payer_id === currentUser.id) ||
    (expense.payer_name && expense.payer_name.toLowerCase() === userDisplayName.toLowerCase()) ||
    expense.payer_id === 'me';

  // Handle uploading/replacing receipt image in edit mode
  const handleReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingReceipt(true);
    try {
      const result = await compressReceiptImage(file);
      const receiptStorageRef = `local_receipt_${Date.now()}`;
      await saveLocalReceiptPhoto(receiptStorageRef, result.dataUrl);
      setReceiptImage(result.dataUrl);
      setForm((prev) => ({ ...prev, receipt_url: receiptStorageRef }));
    } catch (err) {
      alert('ไม่สามารถอัปโหลดรูปภาพได้');
    } finally {
      setUploadingReceipt(false);
    }
  };

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('กรุณากรอกชื่อรายการ / ร้านค้า');
      return;
    }
    const numAmount = parseFloat(form.amount);
    if (isNaN(numAmount) || numAmount < 0) {
      alert('กรุณากรอกจำนวนเงินให้ถูกต้อง');
      return;
    }

    setSaving(true);
    try {
      // Resolve selected payer info
      let selectedPayerName = userDisplayName;
      let selectedPayerAvatar = currentUser?.user_metadata?.avatar_id || 'cat_trio';
      let selectedPayerId = currentUser?.id || 'me';

      if (form.payer_id !== 'me') {
        const found = memberOptions.find((m) => m.id === form.payer_id);
        if (found) {
          selectedPayerName = found.name;
          selectedPayerAvatar = found.avatar;
          selectedPayerId = found.id;
        }
      }

      await onSaveExpense({
        ...expense,
        title: form.title.trim(),
        amount: numAmount,
        currency: form.currency,
        category: form.category,
        spent_at: form.spent_at,
        payer_id: selectedPayerId,
        payer_name: selectedPayerName,
        payer_avatar: selectedPayerAvatar,
        receipt_url: form.receipt_url,
      });

      setIsEditing(false);
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!confirm(`คุณต้องการลบรายการ "${expense.title}" ใช่หรือไม่?`)) return;
    await onDeleteExpense(expense.id, expense.receipt_url);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#151b2b] shadow-2xl border border-slate-200/90 dark:border-[#222c42] glow-blue max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 pb-3 flex justify-between items-center border-b border-slate-200/90 dark:border-[#222c42]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="text-xl p-2 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-900/50 shadow-2xs shrink-0">
              {currentCategoryMeta.icon}
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                {isEditing ? 'แก้ไขค่าใช้จ่าย ✏️' : expense.title}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {isEditing ? 'ปรับปรุงรายละเอียดรายการ' : 'รายละเอียดค่าใช้จ่าย'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {!isEditing && canEdit && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-900/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-xs font-bold transition-all cursor-pointer"
                title="แก้ไขข้อมูล"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>แก้ไข</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1c2438] cursor-pointer transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 pt-3 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {isEditing ? (
            /* ==================== EDIT FORM MODE ==================== */
            <form id="edit-expense-form" onSubmit={handleSave} className="space-y-3.5">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">
                  ชื่อรายการ / ร้านค้า *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น สุกี้ตี๋น้อย, Shabu Buffet, Matsumoto Kiyoshi"
                  className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-[#222c42] bg-white dark:bg-[#1c2438] text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:border-blue-600 font-bold transition-all"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              {/* Amount & Currency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">
                    ยอดเงิน *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-[#222c42] bg-white dark:bg-[#1c2438] text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:border-blue-600 font-black transition-all"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">
                    สกุลเงิน
                  </label>
                  <select
                    className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-[#222c42] bg-white dark:bg-[#1c2438] text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:border-blue-600 font-bold transition-all"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  >
                    <option value="THB">THB (฿ บาท)</option>
                    <option value="JPY">JPY (¥ เยน)</option>
                    <option value="CNY">CNY (元 หยวน)</option>
                    <option value="USD">USD ($ ดอลลาร์)</option>
                    <option value="EUR">EUR (€ ยูโร)</option>
                    <option value="KRW">KRW (₩ วอน)</option>
                    <option value="GBP">GBP (£ ปอนด์)</option>
                    <option value="SGD">SGD (S$ ดอลลาร์สิงคโปร์)</option>
                  </select>
                </div>
              </div>

              {/* Category & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">
                    หมวดหมู่
                  </label>
                  <select
                    className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-[#222c42] bg-white dark:bg-[#1c2438] text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:border-blue-600 font-bold transition-all"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
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
                    required
                    className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-[#222c42] bg-white dark:bg-[#1c2438] text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:border-blue-600 font-bold transition-all"
                    value={form.spent_at}
                    onChange={(e) => setForm({ ...form, spent_at: e.target.value })}
                  />
                </div>
              </div>

              {/* Payer Selection */}
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">
                  💳 ใครเป็นคนสำรองจ่ายเงิน?
                </label>
                <select
                  className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-[#222c42] bg-white dark:bg-[#1c2438] text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:border-blue-600 font-bold transition-all"
                  value={form.payer_id}
                  onChange={(e) => setForm({ ...form, payer_id: e.target.value })}
                >
                  {memberOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Receipt Image in Edit Mode */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  🧾 รูปใบเสร็จ (แนบหรือเปลี่ยนรูป)
                </label>
                {receiptImage ? (
                  <div className="relative rounded-2xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] p-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img 
                        src={receiptImage} 
                        alt="Receipt" 
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-2xs" 
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">มีรูปใบเสร็จแนบอยู่</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">แตะเปลี่ยนรูปใหม่ หรือกดลบ</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <label className="px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-200/80 dark:border-blue-900/50 cursor-pointer hover:bg-blue-100 transition-colors">
                        {uploadingReceipt ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'เปลี่ยนรูป'}
                        <input type="file" accept="image/*" className="hidden" disabled={uploadingReceipt} onChange={handleReceiptChange} />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setReceiptImage(null);
                          setForm((prev) => ({ ...prev, receipt_url: '' }));
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-xl"
                        title="ลบรูปใบเสร็จ"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-3 rounded-2xl border-2 border-dashed border-slate-200 dark:border-[#222c42] bg-slate-50/50 dark:bg-[#1c2438]/50 hover:border-blue-400 cursor-pointer transition-all">
                    {uploadingReceipt ? (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    ) : (
                      <Camera className="h-4 w-4 text-blue-500" />
                    )}
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      {uploadingReceipt ? 'กำลังอัปโหลดรูป...' : '+ แนบรูปใบเสร็จ'}
                    </span>
                    <input type="file" accept="image/*" className="hidden" disabled={uploadingReceipt} onChange={handleReceiptChange} />
                  </label>
                )}
              </div>
            </form>
          ) : (
            /* ==================== VIEW DETAILS MODE ==================== */
            <div className="space-y-4">
              {/* Highlight Amount Banner */}
              <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden">
                <div className="relative z-10 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs font-bold text-blue-100 block mb-0.5">ยอดค่าใช้จ่าย</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight">
                        {Number(expense.amount).toLocaleString()}
                      </span>
                      <span className="text-sm font-bold opacity-90">{expense.currency}</span>
                    </div>
                  </div>

                  {(expense.currency || 'JPY') !== 'THB' && (
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-blue-100 block mb-0.5">เทียบเท่าเงินบาท</span>
                      <span className="text-lg sm:text-xl font-black text-amber-300 font-mono">
                        ≈ ฿{Math.round(convertToThb(Number(expense.amount), expense.currency || 'JPY', fxRate)).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Info Cards Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Payer Card */}
                <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-[#1c2438] border border-slate-200/80 dark:border-[#222c42]">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    ผู้สำรองจ่ายเงิน
                  </span>
                  <div className="flex items-center gap-2">
                    <CatAvatarBadge cat={payerCat} size="sm" />
                    <div className="min-w-0">
                      <span className="text-xs font-black text-slate-900 dark:text-white truncate block">
                        {expense.payer_name || 'สมาชิก'}
                      </span>
                      {isMyExpense && (
                        <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 block">
                          (คุณเป็นคนจ่าย)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Category Card */}
                <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-[#1c2438] border border-slate-200/80 dark:border-[#222c42]">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    หมวดหมู่
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-base p-1.5 rounded-xl bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#222c42] shadow-2xs">
                      {currentCategoryMeta.icon}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {currentCategoryMeta.label}
                    </span>
                  </div>
                </div>

                {/* Date Card */}
                <div className="col-span-2 p-3 rounded-2xl bg-slate-50/80 dark:bg-[#1c2438] border border-slate-200/80 dark:border-[#222c42] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      วันที่บันทึก: {new Date(expense.spent_at).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'short',
                      })}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400">
                    {expense.spent_at?.split('T')[0]}
                  </span>
                </div>
              </div>

              {/* Receipt Preview Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-blue-500" />
                    <span>รูปภาพใบเสร็จ</span>
                  </span>
                  {receiptImage && onOpenReceiptFullscreen && (
                    <button
                      type="button"
                      onClick={() => onOpenReceiptFullscreen(receiptImage)}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <ZoomIn className="h-3 w-3" />
                      <span>ดูขนาดใหญ่</span>
                    </button>
                  )}
                </div>

                {loadingReceipt ? (
                  <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                    <span className="text-xs font-medium">กำลังโหลดรูปใบเสร็จ...</span>
                  </div>
                ) : receiptImage ? (
                  <div 
                    onClick={() => onOpenReceiptFullscreen ? onOpenReceiptFullscreen(receiptImage) : null}
                    className="group relative rounded-2xl overflow-hidden border border-slate-200 dark:border-[#222c42] bg-slate-950/10 cursor-pointer max-h-56 flex items-center justify-center"
                    title="คลิกเพื่อขยายดูรูปใบเสร็จ"
                  >
                    <img 
                      src={receiptImage} 
                      alt="Receipt" 
                      className="w-full max-h-56 object-contain group-hover:scale-102 transition-transform duration-200" 
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold">
                      <ZoomIn className="h-4 w-4" /> แตะเพื่อดูรูปเต็ม
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-[#222c42] bg-slate-50/50 dark:bg-[#1c2438]/50 text-center">
                    <p className="text-xs text-slate-400 font-medium">ไม่มีรูปใบเสร็จแนบในรายการนี้</p>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1 hover:underline cursor-pointer inline-block"
                      >
                        + กดแก้ไขเพื่อแนบรูปใบเสร็จ
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 pt-3 border-t border-slate-200/90 dark:border-[#222c42] flex gap-2.5">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1c2438] transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                form="edit-expense-form"
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-95"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> บันทึกการแก้ไข
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {canEdit && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3.5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  title="ลบรายการนี้"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">ลบ</span>
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all cursor-pointer flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-95"
                >
                  <Edit3 className="h-4 w-4" />
                  <span>แก้ไขข้อมูล</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1c2438] transition-colors cursor-pointer"
              >
                ปิด
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExpenseDetailModal;
