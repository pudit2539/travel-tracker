// src/components/trip-detail/TransitConnector.tsx
'use client';

import React from 'react';
import { Bus, ExternalLink } from 'lucide-react';
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
    <div className="relative py-2 px-3 flex items-center gap-3 group">
      {/* Oceanic Chrono-Timeline Node */}
      <div className="relative flex flex-col items-center shrink-0">
        <div className="w-7 h-7 rounded-full bg-[#e0f2fe] dark:bg-[#080e19] border border-[#bae6fd] dark:border-[#4cd7f6]/35 flex items-center justify-center text-[#0284c7] dark:text-[#4cd7f6] shadow-[0_0_10px_rgba(56,189,248,0.18)]">
          <Bus className="h-3.5 w-3.5" />
        </div>
      </div>

      {/* Oceanic Glacial Transit Telemetry Pill */}
      <a
        href={directionsUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-[#161c27] border border-[#dbeafe] dark:border-[#24324a] hover:border-[#2563eb] dark:hover:border-[#4cd7f6]/50 text-[11px] font-medium text-[#475569] dark:text-[#c3c6d7] hover:text-[#1d4ed8] dark:hover:text-[#4cd7f6] shadow-2xs transition-all cursor-pointer"
        title="เปิดเส้นทางนำทางและเช็กชานชาลาแบบ Real-time ใน Google Maps"
      >
        <span className="px-2 py-0.5 rounded-full bg-[#eff6ff] dark:bg-[#080e19] text-[#1d4ed8] dark:text-[#4cd7f6] font-mono text-[10px] font-semibold">
          เส้นทางรถไฟ / นำทาง
        </span>
        <span className="truncate max-w-[160px] sm:max-w-[260px] text-[#0f172a] dark:text-[#dde2f3] font-semibold">
          {cleanFrom.split(',')[0]} → {cleanTo.split(',')[0]}
        </span>
        <span className="inline-flex items-center gap-1 text-[#0284c7] dark:text-[#4cd7f6] font-bold">
          <span>เช็กชานชาลาสด</span>
          <ExternalLink className="h-2.5 w-2.5" />
        </span>
      </a>
    </div>
  );
});

export default TransitConnector;
