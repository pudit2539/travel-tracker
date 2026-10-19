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
}

export default function CurrencyPillSwitcher({
  primaryCurrency = 'JPY',
  activeView,
  onToggle,
  fxRate = 0.235,
  onOpenCalculator,
}: CurrencyPillSwitcherProps) {
  const isThbBase = (primaryCurrency || 'JPY').toUpperCase() === 'THB';

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-3.5 sm:right-6 z-40 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div className="p-1 rounded-2xl bg-white/95 dark:bg-[#181a20]/95 backdrop-blur-xl border border-slate-200/90 dark:border-[#262932] shadow-xl flex items-center gap-1">
        {!isThbBase && (
          <>
            <button
              type="button"
              onClick={() => onToggle('foreign')}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer active:scale-95 ${
                activeView === 'foreign'
                  ? 'bg-[#e79b71] text-white shadow-xs scale-[1.02]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={`สลับตัวเลขหลักทั้งแอปเป็น ${primaryCurrency}`}
            >
              <span>{primaryCurrency === 'JPY' ? '🇯🇵' : '🌐'}</span>
              <span>{primaryCurrency}</span>
            </button>

            <button
              type="button"
              onClick={() => onToggle('thb')}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer active:scale-95 ${
                activeView === 'thb'
                  ? 'bg-blue-600 text-white shadow-xs scale-[1.02]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-black bg-slate-100 dark:bg-[#222836] hover:bg-blue-50 dark:hover:bg-blue-950/50 text-blue-600 dark:text-blue-400 transition-all cursor-pointer active:scale-95 ${
              !isThbBase ? 'border-l border-slate-200/80 dark:border-[#262932] ml-0.5' : ''
            }`}
            title={`เปิดเครื่องคิดเลขแปลงค่าเงินด่วน (เรท ≈ ${fxRate})`}
          >
            <Calculator className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden xs:inline">คิดเงิน</span>
          </button>
        )}
      </div>
    </div>
  );
}
