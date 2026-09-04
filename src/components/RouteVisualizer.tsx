// src/components/RouteVisualizer.tsx
'use client';

import { useState } from 'react';
import { 
  MapPin, ExternalLink, Navigation, Compass, 
  Bus, Footprints, Clock, ArrowRight, Sparkles, ChevronRight
} from 'lucide-react';
import { extractCleanPlaceName } from '@/components/InteractiveTripMap';

interface RouteVisualizerProps {
  dayLabel: string;
  items: any[];
}

export default function RouteVisualizer({ dayLabel, items = [] }: RouteVisualizerProps) {
  const [activeStop, setActiveStop] = useState<number | null>(null);

  if (!items || items.length === 0) return null;

  // Build combined Google Maps Multi-Stop directions link
  const generateMultiStopMapsUrl = () => {
    // Filter out international flights & clean places
    const validPlaces = items
      .filter(i => !i.main_place?.includes('สุวรรณภูมิ') && !i.main_place?.includes('กรุงเทพ'))
      .map(i => extractCleanPlaceName(i.main_place, i.city))
      .filter(name => name.length > 0);

    if (validPlaces.length === 0) return '';
    if (validPlaces.length === 1) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(validPlaces[0])}`;
    }

    // Cap to 5 stops for transit mode reliability
    const stopsToRoute = validPlaces.slice(0, 5);
    const origin = encodeURIComponent(stopsToRoute[0]);
    const destination = encodeURIComponent(stopsToRoute[stopsToRoute.length - 1]);
    const waypoints = stopsToRoute
      .slice(1, -1)
      .map((p) => encodeURIComponent(p))
      .join('|');

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=transit`;
    if (waypoints) {
      url += `&waypoints=${waypoints}`;
    }
    return url;
  };

  return (
    <div className="relative overflow-hidden p-4 sm:p-5 rounded-3xl border border-rose-100/80 dark:border-[#323850]/80 bg-white/95 dark:bg-[#222638]/95 backdrop-blur-xl card-elevation transition-all space-y-4">
      
      {/* Header with Day Label & Multi-Stop Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#e06b88] text-white flex items-center justify-center shadow-md shadow-[#e06b88]/20 shrink-0 animate-float-slow">
            <Navigation className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
              <span>แผนที่เส้นทาง: <b className="text-[#e06b88] dark:text-[#fbc2cf]">{dayLabel}</b></span>
              <span className="text-[11px] sm:text-xs font-black text-[#e06b88] dark:text-[#fbc2cf] bg-rose-50 dark:bg-[#e06b88]/25 px-2.5 py-0.5 rounded-full border border-rose-200/80 dark:border-[#e06b88]/40 shadow-xs">
                {items.length} จุดหมาย
              </span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-300 font-medium mt-0.5">
              ลำดับการเดินทางตามเวลา พร้อมระบบเชื่อมต่อ Google Maps ทันที
            </p>
          </div>
        </div>

        {items.length > 0 && (
          <a
            href={generateMultiStopMapsUrl()}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-2xl bg-[#e06b88] hover:bg-[#d25875] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#e06b88]/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Compass className="h-4 w-4" />
            <span>เปิดเส้นทางใน Google Maps</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* Horizontal Route Stops Carousel */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 custom-scrollbar">
        {items.map((item, idx) => {
          const cleanName = extractCleanPlaceName(item.main_place, item.city);
          const directMapUrl = (item.main_place_links && item.main_place_links[0]) 
            ? item.main_place_links[0] 
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanName)}`;
          const isLast = idx === items.length - 1;

          return (
            <div key={item.id || idx} className="flex items-center gap-2 shrink-0">
              <a
                href={directMapUrl}
                target="_blank"
                rel="noreferrer"
                className="group p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 dark:border-[#323850] bg-slate-50/90 dark:bg-[#2a2f45] hover:border-[#e06b88] dark:hover:border-[#e06b88]/60 transition-all cursor-pointer flex items-center gap-3 min-w-[170px] max-w-[220px] shadow-2xs"
                title="เปิดดูใน Google Maps"
              >
                <div className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0 bg-[#e06b88] shadow-xs">
                  {idx + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate group-hover:text-[#e06b88] dark:group-hover:text-[#fbc2cf] transition-colors">
                      {cleanName}
                    </span>
                    <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-[#e06b88] shrink-0" />
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-300 block font-semibold truncate mt-0.5">
                    {item.time_slot || item.city || 'จุดแวะ'}
                  </span>
                </div>
              </a>

              {!isLast && (
                <div className="flex items-center text-slate-300 dark:text-slate-600">
                  <ChevronRight className="h-4 w-4" />
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
