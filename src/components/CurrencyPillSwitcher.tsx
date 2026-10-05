// src/components/CurrencyPillSwitcher.tsx
'use client';

import React from 'react';
import { ArrowLeftRight, Coins, RefreshCw } from 'lucide-react';

interface CurrencyPillSwitcherProps {
  primaryCurrency: string;
  activeView: 'foreign' | 'thb';
  onToggle: (view: 'foreign' | 'thb') => void;
  fxRate?: number;
}

export default function CurrencyPillSwitcher({
  primaryCurrency = 'JPY',
  activeView,
  onToggle,
  fxRate = 0.235,
}: CurrencyPillSwitcherProps) {
  if (primaryCurrency === 'THB') return null;

  return (
    <div className="fixed bottom-22 sm:bottom-6 right-4 sm:right-6 z-40 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div className="p-1 rounded-2xl bg-white/95 dark:bg-[#181a20]/95 backdrop-blur-xl border border-slate-200/90 dark:border-[#262932] shadow-xl flex items-center gap-1">
        
        <button
          type="button"
          onClick={() => onToggle('foreign')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeView === 'foreign'
              ? 'bg-[#e79b71] text-white shadow-xs scale-[1.03]'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          title={`สลับดูยอดเป็นเงิน ${primaryCurrency}`}
        >
          <span>{primaryCurrency === 'JPY' ? '🇯🇵' : '🌐'}</span>
          <span>{primaryCurrency}</span>
        </button>

        <button
          type="button"
          onClick={() => onToggle('thb')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeView === 'thb'
              ? 'bg-blue-600 text-white shadow-xs scale-[1.03]'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="สลับดูยอดเป็นเงินบาทไทย (THB)"
        >
          <span>🇹🇭</span>
          <span>THB (฿)</span>
        </button>

        <div className="hidden sm:flex items-center pl-1 pr-2 text-[10px] font-mono font-bold text-slate-400 border-l border-slate-200 dark:border-[#262932]">
          ฿{fxRate}
        </div>

      </div>
    </div>
  );
}

