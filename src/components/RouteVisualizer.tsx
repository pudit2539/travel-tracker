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
    <div className="relative overflow-hidden p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-purple-800/60 bg-white/95 dark:bg-[#1a182d]/95 backdrop-blur-xl card-elevation transition-all space-y-4">
      
      {/* Header with Day Label & Multi-Stop Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/25 animate-float-slow">
            <Navigation className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>แผนที่เส้นทาง: <b className="text-pink-600 dark:text-pink-400">{dayLabel}</b></span>
              <span className="text-[10px] font-extrabold text-pink-700 dark:text-pink-300 bg-pink-100 dark:bg-pink-950 px-2 py-0.5 rounded-full border border-pink-200 dark:border-pink-900">
                {items.length} จุดหมาย
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-purple-300/70 font-medium">
              ลำดับการเดินทางตามเวลา พร้อมระบบเชื่อมต่อ Google Maps ทันที
            </p>
          </div>
        </div>

        {items.length > 0 && (
          <a
            href={generateMultiStopMapsUrl()}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs shadow-md shadow-pink-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Compass className="h-3.5 w-3.5" />
            <span>เปิดเส้นทางใน Google Maps</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
      </div>

      {/* Horizontal Route Stops Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {items.map((item, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === items.length - 1;
          const cleanName = extractCleanPlaceName(item.main_place, item.city);
          const directMapUrl = (item.main_place_links && item.main_place_links[0]) 
            ? item.main_place_links[0] 
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanName)}`;

          return (
            <div key={item.id || idx} className="flex items-center gap-2 shrink-0">
              <a
                href={directMapUrl}
                target="_blank"
                rel="noreferrer"
                className="group p-3 rounded-2xl border border-slate-200/80 dark:border-purple-900/50 bg-slate-50/70 dark:bg-[#11101d]/60 hover:border-pink-500 hover:bg-pink-50/40 dark:hover:bg-purple-950/40 transition-all cursor-pointer flex items-center gap-2.5 max-w-[200px]"
                title="เปิดดูใน Google Maps"
              >
                <div className={`w-6 h-6 rounded-xl flex items-center justify-center text-[10px] font-black text-white shrink-0 ${
                  isFirst 
                    ? 'bg-gradient-to-tr from-emerald-500 to-teal-600' 
                    : isLast 
                    ? 'bg-gradient-to-tr from-rose-500 to-pink-600' 
                    : 'bg-gradient-to-tr from-pink-500 to-purple-600'
                }`}>
                  {idx + 1}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-pink-600 transition-colors">
                      {cleanName}
                    </span>
                    <ExternalLink className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                  </div>
                  <span className="text-[9px] text-slate-400 dark:text-purple-400 block font-medium truncate">
                    {item.time_slot || item.city || 'จุดแวะ'}
                  </span>
                </div>
              </a>

              {!isLast && (
                <div className="flex items-center text-slate-300 dark:text-purple-800">
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
