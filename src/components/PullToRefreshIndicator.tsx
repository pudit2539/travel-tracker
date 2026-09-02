// src/components/PullToRefreshIndicator.tsx
'use client';

import { Loader2, ArrowDown } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  isReadyToRefresh: boolean;
}

export default function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  isReadyToRefresh,
}: PullToRefreshIndicatorProps) {
  if (pullDistance <= 0 && !isRefreshing) return null;

  return (
    <div 
      className="fixed top-2 inset-x-0 z-50 flex justify-center pointer-events-none transition-transform duration-100"
      style={{
        transform: `translateY(${Math.min(pullDistance * 0.7, 48)}px)`,
      }}
    >
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 dark:bg-[#130d22]/95 border border-pink-300 dark:border-purple-800 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-90 duration-150">
        {isRefreshing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-pink-500" />
            <span className="text-xs font-bold bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400 bg-clip-text text-transparent">
              กำลังรีเฟรชข้อมูลล่าสุด...
            </span>
          </>
        ) : (
          <>
            <div 
              className="p-1 rounded-full bg-pink-100 dark:bg-pink-950/80 text-pink-600 dark:text-pink-400 transition-transform duration-150"
              style={{
                transform: `rotate(${isReadyToRefresh ? 180 : (pullDistance / 65) * 180}deg)`,
              }}
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-purple-200">
              {isReadyToRefresh ? 'ปล่อยนิ้วเพื่อรีเฟรช 🚀' : 'ดึงลงเพื่อรีเฟรช'}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
