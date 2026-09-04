// src/components/trip-detail/ExpenseCard.tsx
'use client';

import React from 'react';
import { Trash2, Image as ImageIcon } from 'lucide-react';
import { getCatAvatar } from '@/lib/avatars';
import { getCategoryMeta, CategoryItem } from '@/lib/categories';

interface ExpenseCardProps {
  expense: any;
  categories: CategoryItem[];
  currentUserId?: string;
  userDisplayName: string;
  fxRate: number;
  canAddExpense: boolean;
  onOpenReceiptPreview: (exp: any) => void;
  onDeleteExpense: (id: string, receiptUrl?: string) => void;
}

function ExpenseCardComponent({
  expense,
  categories,
  currentUserId,
  userDisplayName,
  fxRate,
  canAddExpense,
  onOpenReceiptPreview,
  onDeleteExpense,
}: ExpenseCardProps) {
  const catMeta = getCategoryMeta(categories, expense.category);
  const payerCat = getCatAvatar(expense.payer_avatar);
  const isMyExpense =
    (expense.payer_id && expense.payer_id === currentUserId) ||
    (expense.payer_name && expense.payer_name.toLowerCase() === userDisplayName.toLowerCase());

  return (
    <div className="p-3.5 sm:p-4 flex justify-between items-center hover:bg-pink-50/30 dark:hover:bg-purple-950/30 transition-all duration-200 gap-2">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div className="text-lg sm:text-xl p-2 sm:p-2.5 rounded-2xl bg-gradient-to-tr from-purple-50 to-pink-50 dark:from-purple-950/70 dark:to-pink-950/60 border border-purple-200/60 dark:border-purple-900/60 shadow-2xs shrink-0">
          {catMeta.icon}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
            <span className="truncate">{expense.title}</span>
            {expense.receipt_url && (
              <button
                type="button"
                onClick={() => onOpenReceiptPreview(expense)}
                className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 border border-pink-200 dark:border-pink-900 hover:scale-105 active:scale-95 transition-transform cursor-pointer shrink-0"
                title="ดูรูปใบเสร็จ"
              >
                <ImageIcon className="h-3 w-3" /> ใบเสร็จ
              </button>
            )}
          </div>
          <div className="text-[10px] sm:text-xs text-slate-500 dark:text-purple-300/70 flex flex-wrap items-center gap-1.5 mt-0.5 font-medium">
            <span
              className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-extrabold px-2 py-0.2 rounded-full border ${
                isMyExpense
                  ? 'bg-pink-100 text-pink-700 dark:bg-pink-950/80 dark:text-pink-300 border-pink-300 dark:border-pink-800'
                  : 'bg-slate-100 text-slate-700 dark:bg-purple-950 dark:text-purple-300 border-slate-300 dark:border-purple-900/60'
              }`}
            >
              <span>{payerCat.emoji}</span>
              <span className="truncate max-w-[80px] sm:max-w-none">
                {expense.payer_name || 'สมาชิก'} {isMyExpense ? '(ฉัน)' : ''}
              </span>
            </span>

            <span>•</span>
            <span className="font-semibold text-slate-700 dark:text-purple-200">{catMeta.label}</span>
            <span>•</span>
            <span>{new Date(expense.spent_at).toLocaleDateString('th-TH')}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="font-black text-sm sm:text-base text-slate-900 dark:text-white text-right">
          <div>
            {Number(expense.amount).toLocaleString()}{' '}
            <span className="text-[10px] sm:text-xs text-slate-400 dark:text-purple-400">
              {expense.currency}
            </span>
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold text-pink-600 dark:text-pink-400 block">
            ≈ ฿{Math.round(Number(expense.amount) * fxRate).toLocaleString()}
          </span>
        </div>
        {canAddExpense && (
          <button
            type="button"
            onClick={() => onDeleteExpense(expense.id, expense.receipt_url)}
            className="text-slate-400 hover:text-rose-600 p-1.5 transition-colors cursor-pointer hover:scale-110 active:scale-95"
            title="ลบรายการ"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export const ExpenseCard = React.memo(ExpenseCardComponent);
