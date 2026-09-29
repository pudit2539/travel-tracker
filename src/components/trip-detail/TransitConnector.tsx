// src/components/trip-detail/TransitConnector.tsx
'use client';

import React from 'react';
import { Footprints, Bus, Navigation, ExternalLink, ArrowDown } from 'lucide-react';
import { extractCleanPlaceName } from '@/components/InteractiveTripMap';

interface TransitConnectorProps {
  fromPlace: string;
  toPlace: string;
  fromCity?: string;
  toCity?: string;
  isSameDay?: boolean;
}

export function TransitConnector({
  fromPlace,
  toPlace,
  fromCity,
  toCity,
  isSameDay = true,
}: TransitConnectorProps) {
  if (!isSameDay || !fromPlace || !toPlace) return null;

  const cleanFrom = extractCleanPlaceName(fromPlace, fromCity);
  const cleanTo = extractCleanPlaceName(toPlace, toCity);

  // Google Maps transit / walking directions between the two sequential stops
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(cleanFrom)}&destination=${encodeURIComponent(cleanTo)}&travelmode=transit`;

  return (
    <div className="relative py-2 pl-6 sm:pl-8 pr-2 flex items-center gap-3 group">
      {/* Dashed vertical route line */}
      <div className="absolute left-[26px] sm:left-[34px] top-0 bottom-0 w-0.5 border-l-2 border-dashed border-rose-300 dark:border-rose-900/60 z-0 group-hover:border-[#e06b88] transition-colors" />

      {/* Transit pill badge */}
      <div className="relative z-10 flex flex-wrap items-center gap-2 text-[11px] font-bold">
        <a
          href={directionsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-[#1a182d] border border-rose-200/90 dark:border-[#323850] text-slate-700 dark:text-slate-300 shadow-2xs hover:border-[#e06b88] hover:text-[#e06b88] dark:hover:text-[#f7a1b5] transition-all cursor-pointer group-hover:scale-105"
          title="เปิดเส้นทางนำทางระหว่าง 2 จุดนี้ใน Google Maps"
        >
          <Bus className="h-3 w-3 text-indigo-500" />
          <span>เส้นทางเชื่อมต่อ</span>
          <span className="text-slate-400 dark:text-slate-500">•</span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[130px] sm:max-w-[180px]">
            {cleanFrom.split(',')[0]} ➔ {cleanTo.split(',')[0]}
          </span>
          <Navigation className="h-2.5 w-2.5 text-[#e06b88]" />
          <ExternalLink className="h-2.5 w-2.5 text-slate-400 group-hover:text-[#e06b88]" />
        </a>
      </div>
    </div>
  );
}

export default TransitConnector;
