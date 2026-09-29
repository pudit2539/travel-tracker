// src/components/trip-detail/ExpenseCard.tsx
'use client';

import React from 'react';
import { Trash2, Image as ImageIcon, Edit3 } from 'lucide-react';
import { getCatAvatar } from '@/lib/avatars';
import { CatAvatarBadge } from '@/components/CatAvatarBadge';
import { getCategoryMeta, CategoryItem } from '@/lib/categories';
import { convertToThb } from '@/lib/currency';

interface ExpenseCardProps {
  expense: any;
  categories: CategoryItem[];
  currentUserId?: string;
  userDisplayName: string;
  fxRate: number;
  canAddExpense: boolean;
  onOpenReceiptPreview: (exp: any) => void;
  onDeleteExpense: (id: string, receiptUrl?: string) => void;
  onSelectExpense?: (exp: any) => void;
  onEditExpense?: (exp: any) => void;
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
  onSelectExpense,
  onEditExpense,
}: ExpenseCardProps) {
  const catMeta = getCategoryMeta(categories, expense.category);
  const payerCat = getCatAvatar(expense.payer_avatar);
  const isMyExpense =
    (expense.payer_id && expense.payer_id === currentUserId) ||
    (expense.payer_name && expense.payer_name.toLowerCase() === userDisplayName.toLowerCase());

  return (
    <div 
      onClick={() => onSelectExpense?.(expense)}
      className="p-3.5 sm:p-4 flex justify-between items-center hover:bg-blue-50/40 dark:hover:bg-[#1c2438]/70 active:bg-blue-100/30 dark:active:bg-[#1c2438] transition-all duration-150 gap-2 cursor-pointer group"
      title="คลิกเพื่อดูรายละเอียดและแก้ไข"
    >
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div className="text-lg sm:text-xl p-2 sm:p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-900/50 shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
          {catMeta.icon}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2 truncate">
            <span className="truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{expense.title}</span>
            {expense.receipt_url && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenReceiptPreview(expense);
                }}
                className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/80 dark:border-blue-900/50 hover:scale-105 active:scale-95 transition-transform cursor-pointer shrink-0 shadow-2xs"
                title="ดูรูปใบเสร็จ"
              >
                <ImageIcon className="h-3 w-3" /> ใบเสร็จ
              </button>
            )}
          </div>
          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-2 mt-1 font-medium">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-lg border ${
                isMyExpense
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/80 dark:border-blue-900/50 shadow-xs'
                  : 'bg-slate-100 text-slate-700 dark:bg-[#1c2438] dark:text-slate-200 border border-slate-200 dark:border-[#222c42]'
              }`}
            >
              <CatAvatarBadge cat={payerCat} size="xs" />
              <span className="truncate max-w-[90px] sm:max-w-none">
                {expense.payer_name || 'สมาชิก'} {isMyExpense ? '(ฉัน)' : ''}
              </span>
            </span>

            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{catMeta.label}</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="text-slate-500 dark:text-slate-400">{new Date(expense.spent_at).toLocaleDateString('th-TH')}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="font-black text-sm sm:text-base text-slate-900 dark:text-white text-right font-mono">
          <div>
            {Number(expense.amount).toLocaleString()}{' '}
            <span className="text-xs text-slate-400 dark:text-slate-400 font-sans">
              {expense.currency}
            </span>
          </div>
          {(expense.currency || 'JPY') !== 'THB' && (
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 block font-sans">
              ≈ ฿{Math.round(convertToThb(Number(expense.amount), expense.currency || 'JPY', fxRate)).toLocaleString()}
            </span>
          )}
        </div>
        {canAddExpense && (
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onEditExpense) onEditExpense(expense);
                else onSelectExpense?.(expense);
              }}
              className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-1.5 transition-colors cursor-pointer hover:scale-110 active:scale-95"
              title="แก้ไขรายการ"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteExpense(expense.id, expense.receipt_url);
              }}
              className="text-slate-400 hover:text-rose-600 p-1.5 transition-colors cursor-pointer hover:scale-110 active:scale-95"
              title="ลบรายการ"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export const ExpenseCard = React.memo(ExpenseCardComponent);
