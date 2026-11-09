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
      className={`fixed bottom-[74px] sm:bottom-6 right-3 sm:right-6 z-40 transition-all duration-300 ${
        hiddenOnScroll
          ? 'translate-y-16 opacity-0 pointer-events-none sm:translate-y-0 sm:opacity-100 sm:pointer-events-auto'
          : 'translate-y-0 opacity-100'
      }`}
    >
      <div className="p-1 rounded-2xl bg-[#FDFBF7]/95 dark:bg-[#181a20]/95 backdrop-blur-xl border border-[#DFD7C7] dark:border-[#262932] shadow-lg shadow-black/10 flex items-center gap-1">
        {!isThbBase && (
          <>
            <button
              type="button"
              onClick={() => onToggle('foreign')}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer active:scale-95 ${
                activeView === 'foreign'
                  ? 'bg-[#C83E2D] text-white shadow-xs scale-[1.02]'
                  : 'text-[#6E675F] dark:text-slate-400 hover:text-[#1A1A1A] dark:hover:text-white'
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
                  ? 'bg-[#1C2630] dark:bg-blue-600 text-white shadow-xs scale-[1.02]'
                  : 'text-[#6E675F] dark:text-slate-400 hover:text-[#1A1A1A] dark:hover:text-white'
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
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-black bg-[#F3EFE6] dark:bg-[#222836] hover:bg-[#EAE3D5] dark:hover:bg-blue-950/50 text-[#1C2630] dark:text-blue-400 transition-all cursor-pointer active:scale-95 ${
              !isThbBase ? 'border-l border-[#DFD7C7] dark:border-[#262932] ml-0.5' : ''
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
