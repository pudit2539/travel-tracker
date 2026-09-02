// src/components/InteractiveTripMap.tsx
'use client';

import { useState, useMemo } from 'react';
import { 
  MapPin, ExternalLink, Navigation, Compass, 
  Clock, Bus, Utensils, ArrowRight, Sparkles, 
  ChevronRight, Map, CheckCircle2
} from 'lucide-react';

interface InteractiveTripMapProps {
  itinerary: any[];
  selectedDay?: string;
}

export default function InteractiveTripMap({
  itinerary = [],
  selectedDay = 'all',
}: InteractiveTripMapProps) {
  const [selectedStopIdx, setSelectedStopIdx] = useState<number>(0);

  const displayItems = useMemo(() => {
    if (selectedDay === 'all') return itinerary;
    return itinerary.filter((i) => i.date_label?.trim() === selectedDay);
  }, [itinerary, selectedDay]);

  const multiStopMapsUrl = useMemo(() => {
    if (displayItems.length === 0) return '';
    if (displayItems.length === 1) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayItems[0].main_place + ' ' + (displayItems[0].city || 'Japan'))}`;
    }
    const origin = encodeURIComponent(displayItems[0].main_place);
    const destination = encodeURIComponent(displayItems[displayItems.length - 1].main_place);
    const waypoints = displayItems
      .slice(1, -1)
      .map((it) => encodeURIComponent(it.main_place))
      .join('|');

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=transit`;
    if (waypoints) {
      url += `&waypoints=${waypoints}`;
    }
    return url;
  }, [displayItems]);

  const activeStop = displayItems[selectedStopIdx] || displayItems[0];

  if (displayItems.length === 0) {
    return (
      <div className="p-8 text-center rounded-3xl border border-slate-200/80 dark:border-purple-900/40 bg-white/95 dark:bg-[#1a182d]/95">
        <Map className="h-8 w-8 text-pink-500 mx-auto mb-2 opacity-60" />
        <p className="text-xs text-slate-500 dark:text-purple-300 font-bold">ไม่มีสถานที่ในวันที่เลือก</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      
      {/* Route Header Banner */}
      <div className="p-4 sm:p-5 rounded-3xl border border-purple-200/80 dark:border-purple-800/60 bg-gradient-to-br from-pink-500/10 via-purple-600/10 to-indigo-600/10 bg-white/95 dark:bg-[#1a182d]/95 card-elevation space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white text-xs font-black shadow-xs">
              <Compass className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                เส้นทางท่องเที่ยว {selectedDay !== 'all' ? selectedDay : 'ทั้งหมด'} ({displayItems.length} จุดหมาย)
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-purple-300 font-medium">
                คลิกที่หมุดแต่ละจุดเพื่อดูรายละเอียด & แตะนำทางด้วย Google Maps
              </p>
            </div>
          </div>

          {multiStopMapsUrl && (
            <a
              href={multiStopMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs shadow-md shadow-pink-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Navigation className="h-3.5 w-3.5" />
              <span>เปิดเส้นทางรวมวันนี้ใน Google Maps</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>

        {/* Sequential Step Pins Ribbon */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 custom-scrollbar">
          {displayItems.map((item, idx) => {
            const isSelected = (selectedStopIdx === idx);
            return (
              <div key={item.id || idx} className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedStopIdx(idx)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white border-transparent shadow-md shadow-pink-500/25 scale-105'
                      : 'bg-white/80 dark:bg-[#11101d]/80 text-slate-700 dark:text-purple-200 border-slate-200 dark:border-purple-900/60 hover:border-pink-400'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${
                    isSelected ? 'bg-white text-pink-600' : 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300'
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="text-left min-w-0">
                    <span className="block text-xs font-black truncate max-w-[120px]">{item.main_place}</span>
                    <span className="block text-[9px] opacity-80">{item.time_slot || item.city || 'จุดแวะ'}</span>
                  </div>
                </button>

                {idx < displayItems.length - 1 && (
                  <ArrowRight className="h-3.5 w-3.5 text-pink-400/80 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Selected Stop Detail Spotlight Card */}
      {activeStop && (
        <div className="p-5 rounded-3xl border border-slate-200/90 dark:border-purple-800/60 bg-white/95 dark:bg-[#1a182d]/95 card-elevation space-y-4 animate-in fade-in duration-200">
          <div className="flex justify-between items-start gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white flex items-center justify-center text-base font-black shadow-md shadow-pink-500/20">
                {selectedStopIdx + 1}
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-900">
                    {activeStop.date_label || 'Day Plan'}
                  </span>
                  {activeStop.time_slot && (
                    <span className="text-[11px] font-bold text-slate-600 dark:text-purple-300 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-pink-500" /> {activeStop.time_slot}
                    </span>
                  )}
                  {activeStop.city && (
                    <span className="text-[10px] font-bold text-slate-500 dark:text-purple-400">
                      📍 {activeStop.city}
                    </span>
                  )}
                </div>
                <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
                  {activeStop.main_place}
                </h4>
              </div>
            </div>

            {/* Direct 1-Click Navigation Button */}
            <a
              href={
                (activeStop.main_place_links && activeStop.main_place_links[0])
                  ? activeStop.main_place_links[0]
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeStop.main_place + ' ' + (activeStop.city || 'Japan'))}`
              }
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs shadow-md shadow-pink-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Navigation className="h-3.5 w-3.5" />
              <span>นำทางทันที</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-purple-900/30 text-xs">
            {activeStop.food_recommendation && (
              <div className="flex items-start gap-2 text-slate-700 dark:text-purple-200">
                <Utensils className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold text-slate-900 dark:text-white">ร้านอาหารแนะนำ: </span>
                  <span>{activeStop.food_recommendation}</span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeStop.food_recommendation.split(/[,(]/)[0].trim() + ' ' + (activeStop.city || 'Japan'))}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline ml-1.5"
                  >
                    <span>แผนที่ร้าน 📍</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              </div>
            )}

            {activeStop.transport_info && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-purple-300 font-medium">
                <Bus className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                <span>การเดินทาง: {activeStop.transport_info}</span>
              </div>
            )}

            {activeStop.backup_plan && (
              <div className="p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 text-slate-700 dark:text-purple-200">
                <span className="font-bold text-purple-700 dark:text-purple-300 block mb-0.5">🛡️ แผนสำรอง (Plan B):</span>
                <p className="whitespace-pre-line font-medium leading-relaxed">{activeStop.backup_plan}</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
