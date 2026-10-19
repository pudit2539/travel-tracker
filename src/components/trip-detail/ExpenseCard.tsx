// src/components/trip-detail/ExpenseCard.tsx
'use client';

import React from 'react';
import { Trash2, Image as ImageIcon, Edit3 } from 'lucide-react';
import { getCatAvatar } from '@/lib/avatars';
import { CatAvatarBadge } from '@/components/CatAvatarBadge';
import { getCategoryMeta, CategoryItem } from '@/lib/categories';
import { convertToThb } from '@/lib/currency';
import { resolveDisplayCurrency } from '@/lib/tripStatus';

interface ExpenseCardProps {
  expense: any;
  categories: CategoryItem[];
  currentUserId?: string;
  userDisplayName: string;
  fxRate: number;
  currencyView?: 'foreign' | 'thb';
  /** Whether the current user may edit/delete this specific expense */
  canModify: boolean;
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
  currencyView = 'foreign',
  canModify,
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
  const mainDisplay = resolveDisplayCurrency(Number(expense.amount || 0), expense.currency || 'JPY', fxRate, currencyView);
  const splitDisplay = perPersonAmount !== null
    ? resolveDisplayCurrency(perPersonAmount, expense.currency || 'JPY', fxRate, currencyView)
    : null;

  return (
    <div 
      onClick={() => onSelectExpense?.(expense)}
      className="p-4 sm:p-4.5 hover:bg-gradient-to-r hover:from-blue-50/60 hover:via-indigo-50/25 hover:to-white dark:hover:from-[#1c2438] dark:hover:to-[#151b2b] active:bg-blue-100/30 dark:active:bg-[#1c2438] transition-all duration-200 cursor-pointer group space-y-2.5 relative"
      title="คลิกเพื่อดูรายละเอียดและแก้ไข"
    >
      {/* Top Row: Icon + Title on Left, Total Amount + Actions on Right */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5 sm:gap-3.5 min-w-0 flex-1">
          <div className="text-lg sm:text-xl p-2.5 rounded-2xl bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-blue-600/15 border border-blue-200/80 dark:border-blue-800/60 shadow-xs shrink-0 group-hover:scale-105 group-hover:shadow-md group-hover:shadow-blue-500/15 transition-all mt-0.5">
            {catMeta.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
              <span className="break-words group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-relaxed text-left">
                {expense.title}
              </span>
              {expense.receipt_url && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenReceiptPreview(expense);
                  }}
                  className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/70 dark:text-blue-400 border border-blue-200/80 dark:border-blue-900/60 hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 shadow-2xs"
                  title="ดูรูปใบเสร็จ"
                >
                  <ImageIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> ใบเสร็จ
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Full Amount & Action Buttons */}
        <div className="flex items-start gap-1.5 sm:gap-2.5 shrink-0 text-right">
          <div className="font-black text-slate-900 dark:text-white font-mono leading-tight">
            <div className="text-base sm:text-lg tracking-tight">
              {mainDisplay.primaryAmount.toLocaleString()}{' '}
              <span className="text-xs text-slate-400 dark:text-slate-400 font-sans font-bold">
                {mainDisplay.primaryCurrency}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-400 block font-sans font-normal mt-0.5">
              {isSplit ? 'ยอดรวมบิล ' : ''}≈ {mainDisplay.secondarySymbol}{mainDisplay.secondaryAmount.toLocaleString()} {mainDisplay.secondaryCurrency}
            </span>
          </div>

          {canModify && (
            <div className="flex items-center -mr-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onEditExpense) onEditExpense(expense);
                  else onSelectExpense?.(expense);
                }}
                className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-1 sm:p-1.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-all cursor-pointer hover:scale-110 active:scale-95"
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
                className="text-slate-400 hover:text-rose-600 p-1 sm:p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all cursor-pointer hover:scale-110 active:scale-95"
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

          <span className="text-slate-300 dark:text-slate-600">•</span>
          {(() => {
            const method = expense.payment_method || 'cash';
            if (method === 'travel_card') {
              return (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/60">
                  💳 Travel Card
                </span>
              );
            }
            if (method === 'credit_card') {
              return (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-900/60">
                  💳 บัตรเครดิต
                </span>
              );
            }
            return (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/60">
                💵 เงินสด
              </span>
            );
          })()}

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
        {isSplit && splitDisplay !== null && (
          <div className="shrink-0 text-right ml-auto">
            <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-black px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 font-mono shadow-2xs">
              คนละ ≈ {splitDisplay.primaryText}
              {splitDisplay.secondaryText && (
                <span className="font-normal text-[10px] opacity-90 font-sans">
                  {splitDisplay.secondaryText}
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

export const ExpenseThumbnailCard = React.memo(function ExpenseThumbnailCard({
  expense,
  categories,
  currentUserId,
  userDisplayName,
  fxRate,
  currencyView = 'foreign',
  canModify,
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
  const perPersonAmount = isSplit ? Math.round(Number(expense.amount || 0) / splitMembers.length) : null;
  const mainDisplay = resolveDisplayCurrency(Number(expense.amount || 0), expense.currency || 'JPY', fxRate, currencyView);
  const splitDisplay = perPersonAmount !== null
    ? resolveDisplayCurrency(perPersonAmount, expense.currency || 'JPY', fxRate, currencyView)
    : null;

  return (
    <div
      onClick={() => onSelectExpense?.(expense)}
      className="group relative rounded-3xl overflow-hidden border border-slate-200/90 dark:border-[#222c42] bg-white dark:bg-[#151b2b] card-elevation transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl flex flex-col justify-between cursor-pointer"
    >
      {/* Top Visual Thumbnail Banner (Receipt Image or Stylized Category Cover) */}
      <div
        className="relative w-full aspect-[16/10] overflow-hidden bg-gradient-to-br from-blue-600/90 via-indigo-600/85 to-slate-900"
        style={{ aspectRatio: '16 / 10' }}
      >
        {expense.receipt_url ? (
          <img
            src={expense.receipt_url}
            alt={expense.title || 'ใบเสร็จ'}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white/90 select-none relative">
            <div className="text-4xl sm:text-5xl drop-shadow-md transition-transform duration-300 group-hover:scale-110">
              {catMeta.icon}
            </div>
            <span className="mt-1.5 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-xs">
              {catMeta.label}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5">
          <span className="px-2 py-0.5 rounded-full bg-slate-900/75 backdrop-blur-md text-white text-[10px] font-bold">
            {new Date(expense.spent_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
          </span>
          {expense.receipt_url && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenReceiptPreview(expense);
              }}
              className="px-2 py-0.5 rounded-full bg-blue-600/90 hover:bg-blue-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <ImageIcon className="h-2.5 w-2.5" /> ดูใบเสร็จ
            </button>
          )}
        </div>

        {/* Bottom Price Overlay */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <h4 className="font-black text-white text-sm sm:text-base truncate drop-shadow-xs">
              {expense.title}
            </h4>
            <p className="text-[10px] text-white/80 font-medium truncate">
              {catMeta.icon} {catMeta.label}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm sm:text-base font-black font-mono text-white bg-slate-900/75 backdrop-blur-md px-2.5 py-0.5 rounded-xl border border-white/15">
              {mainDisplay.primarySymbol}{mainDisplay.primaryAmount.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="p-3 flex items-center justify-between gap-2 text-xs bg-white dark:bg-[#151b2b]">
        <div className="flex items-center gap-1.5 min-w-0">
          <CatAvatarBadge cat={payerCat} size="xs" />
          <span className="font-bold text-slate-700 dark:text-slate-200 truncate text-[11px]">
            {expense.payer_name || 'สมาชิก'} {isMyExpense ? '(ฉัน)' : ''}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isSplit && splitDisplay && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60 font-mono">
              หาร ≈ {splitDisplay.primarySymbol}{splitDisplay.primaryAmount.toLocaleString()}
            </span>
          )}
          {canModify && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteExpense(expense.id, expense.receipt_url);
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
              title="ลบรายการ"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export const ExpenseCompactRow = React.memo(function ExpenseCompactRow({
  expense,
  categories,
  currentUserId,
  userDisplayName,
  fxRate,
  currencyView = 'foreign',
  canModify,
  onOpenReceiptPreview,
  onDeleteExpense,
  onSelectExpense,
  splitMembers,
}: ExpenseCardProps) {
  const catMeta = getCategoryMeta(categories, expense.category);
  const isSplit = splitMembers && splitMembers.length > 1;
  const perPersonAmount = isSplit ? Math.round(Number(expense.amount || 0) / splitMembers.length) : null;
  const mainDisplay = resolveDisplayCurrency(Number(expense.amount || 0), expense.currency || 'JPY', fxRate, currencyView);
  const splitDisplay = perPersonAmount !== null
    ? resolveDisplayCurrency(perPersonAmount, expense.currency || 'JPY', fxRate, currencyView)
    : null;

  return (
    <div
      onClick={() => onSelectExpense?.(expense)}
      className="px-3.5 py-2.5 hover:bg-blue-50/50 dark:hover:bg-[#1c2438] transition-colors flex items-center justify-between gap-2.5 cursor-pointer text-xs"
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <span className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-[#1c2438] flex items-center justify-center text-sm shrink-0">
          {catMeta.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
            <span className="truncate">{expense.title}</span>
            {expense.receipt_url && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenReceiptPreview(expense);
                }}
                className="text-[10px] text-blue-600 dark:text-blue-400 font-bold shrink-0 hover:underline"
              >
                [ใบเสร็จ]
              </button>
            )}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
            <span>{expense.payer_name || 'สมาชิก'}</span>
            <span>•</span>
            <span>{catMeta.label}</span>
            {isSplit && splitDisplay && (
              <>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                  คนละ {splitDisplay.primarySymbol}{splitDisplay.primaryAmount.toLocaleString()}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 text-right">
        <div className="font-mono font-black text-slate-900 dark:text-white">
          <div>
            {mainDisplay.primarySymbol}{mainDisplay.primaryAmount.toLocaleString()}
          </div>
          <div className="text-[10px] font-normal text-slate-400">
            ≈ {mainDisplay.secondarySymbol}{mainDisplay.secondaryAmount.toLocaleString()}
          </div>
        </div>
        {canModify && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteExpense(expense.id, expense.receipt_url);
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer"
            title="ลบรายการ"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
});

