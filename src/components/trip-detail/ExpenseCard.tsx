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
  splitMembers?: Array<{ id: string; name: string; avatar?: string }>;
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
  splitMembers,
}: ExpenseCardProps) {
  const catMeta = getCategoryMeta(categories, expense.category);
  const payerCat = getCatAvatar(expense.payer_avatar);
  const isMyExpense =
    (expense.payer_id && expense.payer_id === currentUserId) ||
    (expense.payer_name && expense.payer_name.toLowerCase() === userDisplayName.toLowerCase());

  const isSplit = splitMembers && splitMembers.length > 1;
  const isSingle = splitMembers && splitMembers.length === 1;
  const perPersonAmount = isSplit ? Math.round(Number(expense.amount || 0) / splitMembers.length) : null;

  return (
    <div 
      onClick={() => onSelectExpense?.(expense)}
      className="p-3.5 sm:p-4 hover:bg-blue-50/40 dark:hover:bg-[#1c2438]/70 active:bg-blue-100/30 dark:active:bg-[#1c2438] transition-all duration-150 cursor-pointer group space-y-2.5"
      title="คลิกเพื่อดูรายละเอียดและแก้ไข"
    >
      {/* Top Row: Icon + Title on Left, Total Amount + Actions on Right */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="text-lg sm:text-xl p-2 sm:p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-900/50 shadow-2xs shrink-0 group-hover:scale-105 transition-transform mt-0.5">
            {catMeta.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
              <span className="break-words line-clamp-2 sm:line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                {expense.title}
              </span>
              {expense.receipt_url && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenReceiptPreview(expense);
                  }}
                  className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/80 dark:border-blue-900/50 hover:scale-105 active:scale-95 transition-transform cursor-pointer shrink-0 shadow-2xs"
                  title="ดูรูปใบเสร็จ"
                >
                  <ImageIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> ใบเสร็จ
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Full Amount & Action Buttons */}
        <div className="flex items-start gap-1 sm:gap-2 shrink-0 text-right">
          <div className="font-black text-sm sm:text-base text-slate-900 dark:text-white font-mono leading-tight">
            <div>
              {Number(expense.amount).toLocaleString()}{' '}
              <span className="text-xs text-slate-400 dark:text-slate-400 font-sans font-normal">
                {expense.currency}
              </span>
            </div>
            {expense.currency === 'THB' ? (
              <span className="text-[10px] text-slate-400 dark:text-slate-400 block font-sans font-normal">
                {isSplit ? 'ยอดรวมบิล ' : ''}≈ ¥{Math.round(fxRate > 0 ? Number(expense.amount) / fxRate : 0).toLocaleString()}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 dark:text-slate-400 block font-sans font-normal">
                {isSplit ? 'ยอดรวมบิล ' : ''}≈ ฿{Math.round(convertToThb(Number(expense.amount), expense.currency || 'JPY', fxRate)).toLocaleString()}
              </span>
            )}
          </div>

          {canAddExpense && (
            <div className="flex items-center -mr-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onEditExpense) onEditExpense(expense);
                  else onSelectExpense?.(expense);
                }}
                className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-1 sm:p-1.5 transition-colors cursor-pointer hover:scale-110 active:scale-95"
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
                className="text-slate-400 hover:text-rose-600 p-1 sm:p-1.5 transition-colors cursor-pointer hover:scale-110 active:scale-95"
                title="ลบรายการ"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Metadata (Split Badge, Category, Date) on Left, Per-person Amount on Right */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-[#222c42]/60">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs min-w-0">
          {isSplit ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold px-2.5 py-0.5 rounded-lg border bg-blue-50/80 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200/80 dark:border-blue-900/50 shadow-2xs shrink-0">
              <span className="flex -space-x-1.5 overflow-hidden shrink-0">
                {splitMembers.map((m, mIdx) => (
                  <CatAvatarBadge key={mIdx} cat={getCatAvatar(m.avatar)} size="xs" className="ring-1 ring-white dark:ring-[#151b2b]" />
                ))}
              </span>
              <span className="truncate max-w-[140px] sm:max-w-none">
                👥 {splitMembers.map((m) => m.name.replace(' (ฉัน)', '')).join(' & ')}
              </span>
            </span>
          ) : (
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold px-2 py-0.5 rounded-lg border shrink-0 ${
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
          )}

          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] sm:text-xs">{catMeta.label}</span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span className="text-slate-500 dark:text-slate-400 text-[11px] sm:text-xs">{new Date(expense.spent_at).toLocaleDateString('th-TH')}</span>

          {isSingle && (
            <>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-900/60">
                👤 จ่ายคนเดียว
              </span>
            </>
          )}
        </div>

        {/* Right: Per-person share in prominent emerald badge */}
        {isSplit && perPersonAmount !== null && (
          <div className="shrink-0 text-right ml-auto">
            <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-black px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 font-mono shadow-2xs">
              คนละ ≈ {perPersonAmount.toLocaleString()} {expense.currency}
              {expense.currency === 'THB' ? (
                <span className="font-normal text-[10px] opacity-90 font-sans">
                  (¥{Math.round(fxRate > 0 ? perPersonAmount / fxRate : 0).toLocaleString()})
                </span>
              ) : (
                <span className="font-normal text-[10px] opacity-90 font-sans">
                  (฿{Math.round(convertToThb(perPersonAmount, expense.currency || 'JPY', fxRate)).toLocaleString()})
                </span>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export const ExpenseCard = React.memo(ExpenseCardComponent);
