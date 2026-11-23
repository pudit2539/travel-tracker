// src/components/CurrencyPillSwitcher.tsx
'use client';

import React from 'react';
import { Calculator } from 'lucide-react';

interface CurrencyPillSwitcherProps {
  primaryCurrency: string;
  activeView: 'foreign' | 'thb';
  onToggle: (view: 'foreign' | 'thb') => void;
  fxRate?: number;
  onOpenCalculator?: () => void;
  hiddenOnScroll?: boolean;
}

export default function CurrencyPillSwitcher({
  primaryCurrency = 'JPY',
  activeView,
  onToggle,
  fxRate = 0.235,
  onOpenCalculator,
  hiddenOnScroll = false,
}: CurrencyPillSwitcherProps) {
  const isThbBase = (primaryCurrency || 'JPY').toUpperCase() === 'THB';

  return (
    <div
      className={`fixed bottom-[calc(4.15rem+max(env(safe-area-inset-bottom,0px),1.25rem))] sm:bottom-6 right-3 sm:right-6 z-40 transition-all duration-300 ${
        hiddenOnScroll
          ? 'translate-y-16 opacity-0 pointer-events-none sm:translate-y-0 sm:opacity-100 sm:pointer-events-auto'
          : 'translate-y-0 opacity-100'
      }`}
    >
      <div className="p-0.5 sm:p-1 rounded-full bg-white/95 dark:bg-[#161c27]/95 backdrop-blur-xl border border-[#dbeafe] dark:border-[#4cd7f6]/25 shadow-[0_8px_28px_rgba(15,23,42,0.12)] dark:shadow-[0_8px_28px_rgba(4,9,20,0.65)] flex items-center gap-0.5 sm:gap-1">
        {!isThbBase && (
          <>
            <button
              type="button"
              onClick={() => onToggle('foreign')}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-mono font-bold transition-all cursor-pointer active:scale-95 ${
                activeView === 'foreign'
                  ? 'bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] text-white shadow-[0_4px_12px_rgba(37,99,235,0.35)] scale-[1.02]'
                  : 'text-[#475569] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-[#4cd7f6]'
              }`}
              title={`สลับตัวเลขหลักทั้งแอปเป็น ${primaryCurrency}`}
            >
              <span>{primaryCurrency === 'JPY' ? '🇯🇵' : '🌐'}</span>
              <span>{primaryCurrency}</span>
            </button>

            <button
              type="button"
              onClick={() => onToggle('thb')}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-mono font-bold transition-all cursor-pointer active:scale-95 ${
                activeView === 'thb'
                  ? 'bg-gradient-to-r from-[#0284c7] to-[#2563eb] text-white shadow-[0_4px_12px_rgba(6,182,212,0.3)] scale-[1.02]'
                  : 'text-[#475569] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-[#4cd7f6]'
              }`}
              title="สลับตัวเลขหลักทั้งแอปเป็นเงินบาทไทย (THB)"
            >
              <span>🇹🇭</span>
              <span>THB</span>
            </button>
          </>
        )}

        {onOpenCalculator && (
          <button
            type="button"
            onClick={onOpenCalculator}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] sm:text-xs font-bold bg-[#eff6ff] dark:bg-[#080e19] hover:bg-[#dbeafe] dark:hover:bg-[#242a36] text-[#1d4ed8] dark:text-[#4cd7f6] transition-all cursor-pointer active:scale-95 ${
              !isThbBase ? 'border-l border-[#dbeafe] dark:border-[#24324a] ml-0.5' : ''
            }`}
            title={`เปิดเครื่องคิดเลขแปลงค่าเงินด่วน (เรท ≈ ${fxRate})`}
          >
            <Calculator className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">คิดเงิน</span>
          </button>
        )}
      </div>
    </div>
  );
}
