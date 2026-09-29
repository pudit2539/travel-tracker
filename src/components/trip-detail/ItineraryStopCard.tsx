import React from 'react';
import { 
  Clock, ExternalLink, Utensils, Bus, ChevronUp, 
  ChevronDown, ArrowUp, ArrowDown, Edit3, Trash2, Shield,
  Navigation
} from 'lucide-react';
import { parseTransitInfo } from '@/lib/transitGuide';

interface ItineraryStopCardProps {
  item: any;
  idx: number;
  totalItems: number;
  canEditPlan: boolean;
  reordering: boolean;
  isPlanBOpen: boolean;
  onTogglePlanB: (id: string) => void;
  onMoveActivity: (idx: number, direction: 'up' | 'down') => void;
  onOpenEditActivity: (item: any) => void;
  onDeleteActivity: (id: string) => void;
}

function ItineraryStopCardComponent({
  item,
  idx,
  totalItems,
  canEditPlan,
  reordering,
  isPlanBOpen,
  onTogglePlanB,
  onMoveActivity,
  onOpenEditActivity,
  onDeleteActivity,
}: ItineraryStopCardProps) {
  const [visited, setVisited] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && item?.id) {
      const saved = localStorage.getItem(`visited_activity_${item.id}`);
      if (saved === 'true') setVisited(true);
    }
  }, [item?.id]);

  const toggleVisited = () => {
    const next = !visited;
    setVisited(next);
    if (typeof window !== 'undefined' && item?.id) {
      localStorage.setItem(`visited_activity_${item.id}`, next ? 'true' : 'false');
    }
  };

  const transitGuide = parseTransitInfo(item.transport_info);

  const mainPlaceMapsUrl =
    item.main_place_links && item.main_place_links[0]
      ? item.main_place_links[0]
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          item.main_place + ' ' + (item.city || 'Japan')
        )}`;

  const mainPlaceDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    item.main_place + (item.city ? ' ' + item.city : '')
  )}`;

  const foodSearchUrl =
    item.food_links && item.food_links[0]
      ? item.food_links[0]
      : item.food_recommendation
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          item.food_recommendation.split(/[,(]/)[0].trim() + ' ' + (item.city || 'Japan')
        )}`
      : '';

  const foodDirectionsUrl = item.food_recommendation
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        item.food_recommendation.split(/[,(]/)[0].trim() + (item.city ? ' ' + item.city : '')
      )}`
    : '';

  return (
    <div className={`group rounded-3xl border transition-all duration-300 relative overflow-hidden card-elevation ${
      visited 
        ? 'border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/20' 
        : 'border-slate-200/90 dark:border-[#222c42] bg-white dark:bg-[#151b2b] hover:border-blue-400/60 dark:hover:border-blue-500/40'
    }`}>
      
      {/* 1. Trip.com Style Top Notice / Platform Banner */}
      {transitGuide.hasGuide && (
        <div className="px-4 py-2 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border-b border-amber-200/70 dark:border-amber-900/40 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 font-black text-amber-800 dark:text-amber-300">
              <span>🚉</span>
              <span>{transitGuide.platform ? `ชานชาลา ${transitGuide.platform}` : 'การเดินทาง'}</span>
            </span>
            {transitGuide.bestTip && (
              <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                • {transitGuide.bestTip}
              </span>
            )}
          </div>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(item.main_place + ' ' + (item.city || 'Japan'))}&travelmode=transit`}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-black text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 shrink-0"
          >
            <span>เช็กชานชาลาสด</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      )}

      {/* 2. Main Card Body */}
      <div className="p-4 sm:p-5 space-y-3">
        {/* Top Header Line: Day badge, Time slot, City & Paw Checkin */}
        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/70 dark:border-blue-900/50 shadow-2xs">
              {item.date_label || `Day ${idx + 1}`}
            </span>

            {item.time_slot && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#1c2438] px-2.5 py-0.5 rounded-full border border-slate-200/70 dark:border-[#222c42]">
                <Clock className="h-3 w-3 text-blue-500" />
                <span>{item.time_slot}</span>
              </span>
            )}

            {item.city && (
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                📍 {item.city}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Cat Paw Stamp Visited Button with subtle Pink Gimmick */}
            <button
              type="button"
              onClick={toggleVisited}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                visited
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs'
                  : 'bg-rose-50/70 dark:bg-[#fb7185]/15 text-[#f43f5e] dark:text-[#fb7185] border border-rose-200/60 dark:border-[#fb7185]/30 hover:bg-rose-100 dark:hover:bg-[#fb7185]/25'
              }`}
              title={visited ? 'คลิกเพื่อยกเลิกสถานะเช็กอิน' : 'เช็กอินรอยเท้าน้องแมว 🐾'}
            >
              <span className={visited ? 'animate-bounce' : ''}>🐾</span>
              <span className="hidden sm:inline">{visited ? 'แวะแล้ว' : 'เช็กอิน'}</span>
            </button>

            {canEditPlan && (
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => onMoveActivity(idx, 'up')}
                  disabled={idx === 0 || reordering}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1c2438] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                  title="เลื่อนขึ้น"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onMoveActivity(idx, 'down')}
                  disabled={idx === totalItems - 1 || reordering}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1c2438] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                  title="เลื่อนลง"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenEditActivity(item)}
                  className="p-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/50 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                  title="แก้ไข"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteActivity(item.id)}
                  className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                  title="ลบ"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Place Title */}
        <div className="pt-0.5">
          <a
            href={mainPlaceMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="text-base sm:text-lg font-black text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1.5 transition-colors cursor-pointer group/title"
          >
            <span>{item.main_place}</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover/title:text-blue-500 transition-colors" />
          </a>
        </div>

        {/* Transit Details text if any */}
        {transitGuide.details && (
          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
            {transitGuide.details}
          </p>
        )}

        {/* Food & Dining Recommendations */}
        {item.food_recommendation && (
          <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 flex items-start gap-2.5 text-xs">
            <Utensils className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 flex items-center justify-between gap-2 flex-wrap">
              <div>
                <span className="font-black text-slate-900 dark:text-white">ร้านแนะนำ: </span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{item.food_recommendation}</span>
              </div>
              {foodSearchUrl && (
                <a
                  href={foodSearchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1 shrink-0"
                >
                  <span>แผนที่ร้าน 📍</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Backup Plan (Plan B) */}
        {item.backup_plan && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => onTogglePlanB(item.id)}
              className="text-xs font-bold text-slate-600 dark:text-slate-400 inline-flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            >
              <Shield className="h-3.5 w-3.5 text-blue-500" />
              <span>แผนสำรอง (Plan B)</span>
              {isPlanBOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {isPlanBOpen && (
              <div className="p-3 mt-2 rounded-2xl bg-slate-50 dark:bg-[#111624] text-xs text-slate-700 dark:text-slate-200 space-y-2 border border-slate-200/70 dark:border-[#222c42]">
                <div className="font-bold text-blue-600 dark:text-blue-400">
                  รายการสถานที่ & ร้านอาหารสำรอง:
                </div>
                <div className="space-y-1.5">
                  {item.backup_plan
                    .split('\n')
                    .filter((line: string) => line.trim().length > 0)
                    .map((line: string, lineIdx: number) => {
                      let cleanName = line
                        .replace(/^(ร้านอาหารสำรอง|สถานที่สำรอง|จุดเที่ยวสำรอง|แผนสำรอง|\d+[\).:-]|\*|•)\s*/i, '')
                        .trim();
                      if (cleanName.includes(':')) {
                        cleanName = cleanName.split(':')[1].trim();
                      }

                      const lineMapsUrl =
                        item.backup_links && item.backup_links[lineIdx]
                          ? item.backup_links[lineIdx]
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              cleanName + ' ' + (item.city || 'Japan')
                            )}`;

                      return (
                        <div
                          key={lineIdx}
                          className="p-2.5 rounded-xl bg-white dark:bg-[#182033] border border-slate-200/60 dark:border-[#222c42] flex items-center justify-between gap-2 shadow-2xs"
                        >
                          <span className="font-medium text-slate-800 dark:text-slate-200 leading-snug">
                            {line}
                          </span>
                          <a
                            href={lineMapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
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
        )}
      </div>

      {/* 3. Trip.com Divided Action Footer (`|`) */}
      <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-[#222c42] border-t border-slate-100 dark:border-[#222c42] bg-slate-50/50 dark:bg-[#111624]/60 text-xs font-bold text-slate-700 dark:text-slate-300">
        <a
          href={mainPlaceDirectionsUrl}
          target="_blank"
          rel="noreferrer"
          className="py-3 flex items-center justify-center gap-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer text-center"
        >
          <Navigation className="h-3.5 w-3.5 text-blue-500" />
          <span>นำทางด้วย Google Maps</span>
        </a>

        <a
          href={mainPlaceMapsUrl}
          target="_blank"
          rel="noreferrer"
          className="py-3 flex items-center justify-center gap-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer text-center"
        >
          <span>ดูพิกัด & รีวิว 📍</span>
          <ExternalLink className="h-3 w-3 opacity-60" />
        </a>
      </div>
    </div>
  );
}

export const ItineraryStopCard = React.memo(ItineraryStopCardComponent);
