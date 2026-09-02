// src/components/InteractiveTripMap.tsx
'use client';

import { useState, useMemo } from 'react';
import { 
  MapPin, ExternalLink, Navigation, Compass, 
  Clock, Bus, Utensils, ArrowRight, Sparkles, 
  ChevronRight, Map, CheckCircle2, AlertCircle
} from 'lucide-react';

interface InteractiveTripMapProps {
  itinerary: any[];
  selectedDay?: string;
}

// Helper: Extract clean search query for Google Maps
export function extractCleanPlaceName(raw: string, city?: string): string {
  if (!raw) return city ? `${city}, Japan` : 'Japan';
  
  // 1. Remove bracket tags like [ปรับใหม่], [ร้านดังตามขอ], [เพิ่มที่เที่ยว]
  let cleaned = raw.replace(/\[.*?\]/g, '').trim();

  // 2. Remove transit descriptions at start
  cleaned = cleaned.replace(/^(นั่งรถไฟไป|เดินทางไป|เดินชม|เดินเล่น|แวะ|เที่ยว|เช็กอิน|เช็กเอาต์|ฝากกระเป๋าที่)\s*/i, '').trim();

  // 3. Extract English landmark name if present (e.g. "Kiyomizu-dera Temple", "Nara Park")
  const englishMatches = cleaned.match(/[A-Za-z0-9\s'-]+/g);
  if (englishMatches && englishMatches.length > 0) {
    const validEnglish = englishMatches
      .map(s => s.trim())
      .filter(s => s.length >= 3 && !['Day', 'Plan', 'Tour', 'The', 'And'].includes(s));
    
    if (validEnglish.length > 0) {
      // Return the most specific landmark name
      const best = validEnglish.sort((a, b) => b.length - a.length)[0];
      return `${best}${city ? ', ' + city : ''}, Japan`;
    }
  }

  // 4. If Thai phrase, take the first short name before comma / parentheses / "และ"
  const shortThai = cleaned.split(/[,(\nและ]/)[0].trim();
  return `${shortThai}${city ? ' ' + city : ''}, Japan`;
}

export default function InteractiveTripMap({
  itinerary = [],
  selectedDay = 'all',
}: InteractiveTripMapProps) {
  const [selectedStopIdx, setSelectedStopIdx] = useState<number>(0);

  // Filter items based on selected day
  const displayItems = useMemo(() => {
    if (selectedDay === 'all') {
      // Filter out international flights for routing purposes
      return itinerary.filter(i => !i.main_place?.includes('สุวรรณภูมิ') && !i.main_place?.includes('กรุงเทพ'));
    }
    return itinerary.filter((i) => i.date_label?.trim() === selectedDay);
  }, [itinerary, selectedDay]);

  // Robust Multi-Stop Directions URL (Capped to max 6 stops to ensure 100% Google Maps transit routing success)
  const multiStopMapsUrl = useMemo(() => {
    if (displayItems.length === 0) return '';
    
    // Clean all places
    const validPlaces = displayItems
      .map((item) => extractCleanPlaceName(item.main_place, item.city))
      .filter((name) => name.length > 0);

    if (validPlaces.length === 0) return '';
    
    if (validPlaces.length === 1) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(validPlaces[0])}`;
    }

    // Google Maps Transit directions work best with 2 to 5 stops
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
  }, [displayItems]);

  const activeStop = displayItems[selectedStopIdx] || displayItems[0];
  const activeCleanPlace = activeStop ? extractCleanPlaceName(activeStop.main_place, activeStop.city) : '';

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
                เส้นทางท่องเที่ยว {selectedDay !== 'all' ? selectedDay : 'ภาพรวม'} ({displayItems.length} จุดหมาย)
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
              <span>เปิดเส้นทางรวมใน Google Maps</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>

        {/* Sequential Step Pins Ribbon */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 custom-scrollbar">
          {displayItems.map((item, idx) => {
            const isSelected = (selectedStopIdx === idx);
            const cleanName = extractCleanPlaceName(item.main_place, item.city);

            return (
              <div key={item.id || idx} className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedStopIdx(idx)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white border-pink-500 shadow-md shadow-pink-500/25 scale-105'
                      : 'bg-white/80 dark:bg-[#11101d]/80 text-slate-800 dark:text-purple-200 border-slate-200 dark:border-purple-900/50 hover:border-pink-400'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                    isSelected ? 'bg-white text-pink-600' : 'bg-pink-100 dark:bg-purple-950 text-pink-600 dark:text-pink-400'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold block max-w-[120px] sm:max-w-[150px] truncate">
                      {cleanName}
                    </span>
                    <span className="text-[9px] opacity-80 block">
                      {item.time_slot || item.date_label || `Stop ${idx + 1}`}
                    </span>
                  </div>
                </button>

                {idx < displayItems.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-slate-400 dark:text-purple-600 shrink-0" />
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

            {/* Direct 1-Click Navigation Button (Guaranteed to Work) */}
            <a
              href={
                (activeStop.main_place_links && activeStop.main_place_links[0])
                  ? activeStop.main_place_links[0]
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeCleanPlace)}`
              }
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs shadow-md shadow-pink-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Navigation className="h-3.5 w-3.5" />
              <span>นำทางจุดนี้ 📍</span>
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
              <div className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/40 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-300">
                  <Sparkles className="h-3.5 w-3.5 text-pink-500" />
                  <span>แผนสำรอง (Plan B):</span>
                </div>
                <p className="text-slate-600 dark:text-purple-300 whitespace-pre-line leading-relaxed">
                  {activeStop.backup_plan}
                </p>
                {activeStop.backup_links && activeStop.backup_links[0] && (
                  <a
                    href={activeStop.backup_links[0]}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline pt-1"
                  >
                    <span>เปิดแผนที่ Plan B 📍</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
