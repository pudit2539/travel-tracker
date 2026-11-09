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

export const TransitConnector = React.memo(function TransitConnector({
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
    <div className="relative py-1.5 px-3 flex items-center gap-3 group">
      {/* Option A Editorial Transit Circle Icon */}
      <div className="w-6 h-6 rounded-full bg-[#EFE9DE] dark:bg-[#23262F] border border-[#D8CFC0] dark:border-[#343844] flex items-center justify-center text-[#6A6052] dark:text-amber-300 shrink-0 shadow-2xs">
        <Bus className="h-3 w-3" />
      </div>

      {/* Editorial Transit Info Row */}
      <a
        href={directionsUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex flex-wrap items-center gap-2 text-[11px] font-medium text-[#7A7062] dark:text-slate-300 hover:text-[#C83E2D] dark:hover:text-amber-300 transition-colors cursor-pointer"
        title="เปิดเส้นทางนำทางและเช็กชานชาลาแบบ Real-time ใน Google Maps"
      >
        <span className="px-2 py-0.5 rounded-[3px] bg-[#EAE3D5] dark:bg-[#262932] text-[#38322A] dark:text-slate-100 font-semibold">
          เส้นทางรถไฟ / นำทาง
        </span>
        <span className="truncate max-w-[160px] sm:max-w-[240px]">
          {cleanFrom.split(',')[0]} → {cleanTo.split(',')[0]}
        </span>
        <span className="inline-flex items-center gap-1 text-[#C83E2D] dark:text-amber-400 font-semibold">
          <span>เช็กชานชาลาสด</span>
          <ExternalLink className="h-2.5 w-2.5" />
        </span>
      </a>
    </div>
  );
});

export default TransitConnector;
