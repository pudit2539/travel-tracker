// src/components/RouteVisualizer.tsx
'use client';

import { useState } from 'react';
import { 
  MapPin, ExternalLink, Navigation, Compass, 
  Bus, Footprints, Clock, ArrowRight, Sparkles, ChevronRight
} from 'lucide-react';

interface RouteVisualizerProps {
  dayLabel: string;
  items: any[];
}

export default function RouteVisualizer({ dayLabel, items = [] }: RouteVisualizerProps) {
  const [activeStop, setActiveStop] = useState<number | null>(null);

  if (!items || items.length === 0) return null;

  // Build combined Google Maps Multi-Stop directions link
  const generateMultiStopMapsUrl = () => {
    if (items.length === 1) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(items[0].main_place)}`;
    }
    const origin = encodeURIComponent(items[0].main_place);
    const destination = encodeURIComponent(items[items.length - 1].main_place);
    const waypoints = items
      .slice(1, -1)
      .map((it) => encodeURIComponent(it.main_place))
      .join('|');

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=transit`;
    if (waypoints) {
      url += `&waypoints=${waypoints}`;
    }
    return url;
  };

  return (
    <div className="relative overflow-hidden p-5 rounded-3xl border border-slate-200/80 dark:border-purple-800/60 bg-white/95 dark:bg-[#130d22]/95 backdrop-blur-xl card-elevation transition-all space-y-4">
      
      {/* Header with Day Label & Multi-Stop Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/25 animate-float-slow">
            <Navigation className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>แผนที่เส้นทางประจำวัน: <b className="text-pink-600 dark:text-pink-400">{dayLabel}</b></span>
              <span className="text-[10px] font-extrabold text-pink-700 dark:text-pink-300 bg-pink-100 dark:bg-pink-950 px-2 py-0.5 rounded-full border border-pink-200 dark:border-pink-900">
                {items.length} จุดหมาย
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-purple-300/70 font-medium">
              ลำดับการเดินทางตามเวลา พร้อมระบบเชื่อมต่อ Google Maps ทันที
            </p>
          </div>
        </div>

        <a
          href={generateMultiStopMapsUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold shadow-md shadow-pink-500/25 transition-all cursor-pointer hover:scale-105"
        >
          <Compass className="h-4 w-4" />
          <span>เปิดเส้นทางนำทางรวมทั้งวัน</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Horizontal Flow Line with interactive stop nodes */}
      <div className="relative pt-2 pb-2 overflow-x-auto custom-scrollbar">
        <div className="flex items-center min-w-max gap-1 px-1">
          {items.map((item, idx) => {
            const isLast = idx === items.length - 1;
            const isHovered = activeStop === idx;

            return (
              <div key={idx} className="flex items-center">
                
                {/* Stop Node with Radar Pulse effect */}
                <div
                  onMouseEnter={() => setActiveStop(idx)}
                  onMouseLeave={() => setActiveStop(null)}
                  className={`relative p-3 rounded-2xl border transition-all duration-300 cursor-pointer flex items-center gap-2.5 max-w-[240px] ${
                    isHovered
                      ? 'border-pink-500 bg-pink-50/80 dark:bg-pink-950/70 -translate-y-1 shadow-lg shadow-pink-500/20'
                      : 'border-slate-200/90 dark:border-purple-900/50 bg-slate-50/70 dark:bg-[#180f28]/80 hover:border-pink-300'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full text-white text-xs font-black flex items-center justify-center shrink-0 shadow-sm transition-all duration-300 ${
                    isHovered 
                      ? 'bg-pink-500 animate-radar-pulse' 
                      : 'bg-gradient-to-tr from-pink-500 to-purple-600'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-purple-400 block truncate">
                      {item.time_slot || item.city || `จุดที่ ${idx + 1}`}
                    </span>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {item.main_place}
                    </h4>
                  </div>
                </div>

                {/* Connecting Arrow with Transport */}
                {!isLast && (
                  <div className="flex flex-col items-center px-2 shrink-0">
                    <div className="flex items-center gap-1 text-[9px] font-bold text-purple-600 dark:text-purple-400 mb-0.5">
                      <Bus className="h-3.5 w-3.5 text-pink-500 animate-pulse" />
                    </div>
                    <div className="w-10 h-0.5 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-full" />
                  </div>
                )}

              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
