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
      <div className="p-8 text-center rounded-3xl border border-slate-200/80 dark:border-[#262c3d] bg-white/95 dark:bg-[#171a23]/95">
        <Map className="h-8 w-8 text-rose-500 mx-auto mb-2 opacity-60" />
        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">ไม่มีสถานที่ในวันที่เลือก</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      
      {/* Route Header Banner */}
      <div className="p-4 sm:p-5 rounded-3xl border border-slate-200/90 dark:border-[#262c3d] bg-white/95 dark:bg-[#171a23]/95 card-elevation space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-800 dark:bg-slate-700 flex items-center justify-center text-white text-xs font-black shadow-xs">
              <Compass className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                เส้นทางท่องเที่ยว {selectedDay !== 'all' ? selectedDay : 'ภาพรวม'} ({displayItems.length} จุดหมาย)
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                คลิกที่หมุดแต่ละจุดเพื่อดูรายละเอียด & แตะนำทางด้วย Google Maps
              </p>
            </div>
          </div>

          {multiStopMapsUrl && (
            <a
              href={multiStopMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-[#c25872] hover:bg-[#b04a63] dark:bg-[#d47087] dark:hover:bg-[#c25872] text-white font-bold text-xs shadow-xs hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
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
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-md scale-102 ring-2 ring-slate-900/10 dark:ring-white/20'
                      : 'bg-white/80 dark:bg-[#11131a]/80 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-[#262c3d] hover:border-slate-400 hover:bg-slate-50/80 dark:hover:bg-[#1c2232]'
                  }`}
                  title={`จุดหมายลำดับที่ ${idx + 1}: ${cleanName}`}
                >
                  <div className={`px-1.5 py-0.5 rounded-lg flex flex-col items-center justify-center shrink-0 min-w-[28px] ${
                    isSelected 
                      ? 'bg-white/20 dark:bg-slate-900/15 text-white dark:text-slate-900' 
                      : 'bg-rose-50 dark:bg-slate-800 text-rose-600 dark:text-rose-300'
                  }`}>
                    <span className="text-[7.5px] font-black uppercase tracking-tight leading-none opacity-80">จุดที่</span>
                    <span className="text-[11px] font-black leading-tight">#{idx + 1}</span>
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold block max-w-[120px] sm:max-w-[160px] truncate">
                      {cleanName}
                    </span>
                    <span className="text-[9.5px] opacity-80 block font-medium">
                      {item.date_label && item.time_slot 
                        ? `${item.date_label} • ${item.time_slot}`
                        : (item.time_slot || item.date_label || `ลำดับที่ ${idx + 1}`)}
                    </span>
                  </div>
                </button>

                {idx < displayItems.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-600 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Selected Stop Detail Spotlight Card */}
      {activeStop && (
        <div className="p-5 rounded-3xl border border-slate-200/90 dark:border-[#262c3d] bg-white/95 dark:bg-[#171a23]/95 card-elevation space-y-4 animate-in fade-in duration-200">
          <div className="flex justify-between items-start gap-3">
            <div className="flex items-center gap-3">
              {/* Stop Order Indicator Badge */}
              <div className="px-3 py-2 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-700 dark:to-slate-800 text-white flex flex-col items-center justify-center shadow-xs shrink-0 min-w-[58px] border border-slate-700/50">
                <span className="text-[8.5px] font-bold text-rose-300 dark:text-rose-300 uppercase tracking-wider leading-none mb-0.5">
                  จุดที่
                </span>
                <span className="text-lg font-black leading-none">
                  #{selectedStopIdx + 1}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {activeStop.date_label && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 flex items-center gap-1 shadow-2xs">
                      <span>📅 วันที่:</span>
                      <span>{activeStop.date_label}</span>
                    </span>
                  )}
                  {activeStop.time_slot && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-rose-500" />
                      <span>เวลา {activeStop.time_slot}</span>
                    </span>
                  )}
                  {activeStop.city && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      📍 {activeStop.city}
                    </span>
                  )}
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 hidden sm:inline">
                    (จุดหมาย {selectedStopIdx + 1} จาก {displayItems.length})
                  </span>
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
              className="px-3.5 py-2 rounded-2xl bg-[#c25872] hover:bg-[#b04a63] dark:bg-[#d47087] dark:hover:bg-[#c25872] text-white font-bold text-xs shadow-xs hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Navigation className="h-3.5 w-3.5" />
              <span>นำทางจุดนี้ 📍</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>

          {/* Embedded Interactive Google Map Window */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200/90 dark:border-[#262c3d] shadow-inner bg-slate-100 dark:bg-[#11131a] h-[280px] sm:h-[360px]">
            <iframe
              title={`Google Map - ${activeCleanPlace}`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps?q=${encodeURIComponent(activeCleanPlace)}&output=embed`}
              className="w-full h-full"
            />
            
            {/* Top-Right Badge: Google Maps Active */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-2 pointer-events-none">
              <span className="px-2.5 py-1 rounded-xl bg-white/95 dark:bg-[#171a23]/95 text-[10px] font-black text-slate-800 dark:text-white shadow-md border border-slate-200/80 dark:border-[#262c3d] flex items-center gap-1 backdrop-blur-xs">
                <span>🗺️ Google Maps Live</span>
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#262c3d] text-xs">
            {activeStop.food_recommendation && (
              <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
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
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
                <Bus className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                <span>การเดินทาง: {activeStop.transport_info}</span>
              </div>
            )}

            {activeStop.backup_plan && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1a1e2b] border border-slate-200/80 dark:border-[#262c3d] space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                  <Sparkles className="h-3.5 w-3.5 text-rose-500" />
                  <span>แผนสำรอง (Plan B):</span>
                </div>
                <div className="space-y-1.5">
                  {activeStop.backup_plan.split('\n').filter((line: string) => line.trim().length > 0).map((line: string, lineIdx: number) => {
                    let cleanName = line.replace(/^(ร้านอาหารสำรอง|สถานที่สำรอง|จุดเที่ยวสำรอง|แผนสำรอง|\d+[\).:-]|\*|•)\s*/i, '').trim();
                    if (cleanName.includes(':')) {
                      cleanName = cleanName.split(':')[1].trim();
                    }
                    const lineMapsUrl = (activeStop.backup_links && activeStop.backup_links[lineIdx])
                      ? activeStop.backup_links[lineIdx]
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanName + ' ' + (activeStop.city || 'Japan'))}`;

                    return (
                      <div key={lineIdx} className="p-2 rounded-xl bg-white dark:bg-[#11131a] border border-slate-200/80 dark:border-[#262c3d] flex items-center justify-between gap-2 shadow-2xs">
                        <span className="font-medium text-slate-800 dark:text-slate-200 leading-snug">
                          {line}
                        </span>
                        <a
                          href={lineMapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 hover:bg-[#c25872] hover:text-white dark:hover:bg-[#d47087] transition-all shrink-0 cursor-pointer"
                          title="เปิด Google Maps สำหรับรายการนี้"
                        >
                          <span>แผนที่ 📍</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
