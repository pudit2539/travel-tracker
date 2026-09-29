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
    <div className={`group p-4 sm:p-5 rounded-3xl border ${
      visited 
        ? 'border-emerald-300/70 dark:border-emerald-800/50 bg-emerald-50/20 dark:bg-emerald-950/20' 
        : 'border-slate-200/80 dark:border-[#262c3d] bg-white dark:bg-[#171a23]'
    } card-elevation hover:border-[#c25872]/40 dark:hover:border-[#d47087]/40 transition-all duration-300 space-y-3 relative overflow-hidden`}>
      
      {/* Top Row: Date Badge, Time slot, City, Paw Stamp & Reorder/Edit tools */}
      <div className="flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="px-3 py-1 rounded-xl text-xs font-black bg-slate-100/90 text-slate-700 dark:bg-[#222738] dark:text-slate-200 border border-slate-200/80 dark:border-[#2d3448] whitespace-nowrap shrink-0 shadow-2xs">
            {item.date_label || `Day ${idx + 1}`}
          </span>

          {/* Cat Paw Stamp Visited Button */}
          <button
            type="button"
            onClick={toggleVisited}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
              visited
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-xs scale-102'
                : 'bg-slate-100/80 dark:bg-[#2a2f45] text-slate-500 dark:text-slate-400 hover:text-pink-600 hover:bg-rose-50 border border-slate-200/60 dark:border-[#323850]'
            }`}
            title={visited ? 'คลิกเพื่อยกเลิกสถานะเช็กอิน' : 'คลิกเพื่อประทับรอยเท้าน้องแมวว่าไปถึงแล้ว 🐾'}
          >
            <span className={visited ? 'animate-bounce' : ''}>🐾</span>
            <span>{visited ? 'แวะแล้ว เมี๊ยว!' : 'เช็กอิน'}</span>
          </button>

          {item.time_slot && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 bg-slate-100/90 dark:bg-[#2a2f45] px-2.5 py-1 rounded-xl border border-slate-200/70 dark:border-[#323850] whitespace-nowrap shrink-0">
              <Clock className="h-3.5 w-3.5 text-[#e06b88] dark:text-[#fbc2cf] shrink-0" />
              <span>{item.time_slot}</span>
            </span>
          )}
          {item.city && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100/60 dark:bg-[#2a2f45]/70 px-2.5 py-1 rounded-xl border border-slate-200/50 dark:border-[#323850] whitespace-nowrap truncate max-w-[150px] sm:max-w-none">
              <span>📍</span>
              <span>{item.city}</span>
            </span>
          )}
        </div>

        {canEditPlan && (
          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              type="button"
              onClick={() => onMoveActivity(idx, 'up')}
              disabled={idx === 0 || reordering}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2a2f45] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer transition-colors"
              title="เลื่อนขึ้น"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onMoveActivity(idx, 'down')}
              disabled={idx === totalItems - 1 || reordering}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2a2f45] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer transition-colors"
              title="เลื่อนลง"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onOpenEditActivity(item)}
              className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-[#2a2f45] text-slate-400 hover:text-[#e06b88] dark:hover:text-[#fbc2cf] transition-colors cursor-pointer"
              title="แก้ไขกิจกรรม"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDeleteActivity(item.id)}
              className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-[#e06b88]/20 text-slate-400 hover:text-[#e06b88] transition-colors cursor-pointer"
              title="ลบกิจกรรม"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2.5">
        {/* Main Place Name & Location Badge + 1-Tap Navigation */}
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={mainPlaceMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="text-base sm:text-lg font-black text-slate-900 dark:text-white hover:text-[#e06b88] dark:hover:text-[#fbc2cf] inline-flex items-center gap-2 transition-colors group/title cursor-pointer flex-wrap"
            title="เปิด Google Maps สถานที่หลัก"
          >
            <span>{item.main_place}</span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#e06b88] dark:text-[#fbc2cf] bg-rose-50 dark:bg-[#e06b88]/25 px-2.5 py-1 rounded-xl border border-rose-200/80 dark:border-[#e06b88]/40 group-hover/title:scale-105 active:scale-95 transition-all shadow-xs">
              <span>แผนที่ 📍</span>
              <ExternalLink className="h-3 w-3" />
            </span>
          </a>

          <a
            href={mainPlaceDirectionsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            title="เปิดระบบนำทางแบบเลี้ยวต่อเลี้ยว (Turn-by-turn Navigation)"
          >
            <Navigation className="h-3 w-3 fill-white" />
            <span>นำทาง 🧭</span>
          </a>
        </div>

        {/* Food & Dining Recommendations */}
        {item.food_recommendation && (
          <div className="text-sm text-slate-700 dark:text-slate-200 flex items-start gap-2.5 pt-0.5 leading-relaxed">
            <Utensils className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
              <span className="font-black text-slate-900 dark:text-white">ร้านอาหาร / คาเฟ่: </span>
              <span className="font-medium">{item.food_recommendation}</span>
              {foodSearchUrl && (
                <a
                  href={foodSearchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-500/25 dark:text-amber-200 border border-amber-200/80 dark:border-amber-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-xs"
                  title="เปิด Google Maps ร้านอาหาร"
                >
                  <span>แผนที่ร้าน 📍</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {foodDirectionsUrl && (
                <a
                  href={foodDirectionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-2xs"
                  title="นำทางไปร้านอาหาร"
                >
                  <Navigation className="h-2.5 w-2.5 fill-emerald-600 dark:fill-emerald-300" />
                  <span>นำทาง</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Transit & Train Guide: Platform, Best Route & Boarding Position */}
        {transitGuide.hasGuide && (
          <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50/90 dark:bg-[#1f2433] border border-slate-200/80 dark:border-[#2d3448] space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/40 font-black">
                  <Bus className="h-3.5 w-3.5 text-indigo-500" />
                  <span>การเดินทางรถไฟ / รถบัส</span>
                </span>

                {transitGuide.platform && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-850 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-300/80 dark:border-amber-700/50 font-black">
                    <span>🚉</span>
                    <span>{transitGuide.platform}</span>
                  </span>
                )}
              </div>

              {/* Direct Transit Realtime Google Maps Button */}
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(item.main_place + ' ' + (item.city || 'Japan'))}&travelmode=transit`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-[#282f42] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#384157] font-bold text-[11px] hover:text-[#c25872] dark:hover:text-[#d47087] transition-all cursor-pointer shadow-2xs"
                title="เช็กชานชาลาและเวลารถไฟแบบ Real-time บน Google Maps"
              >
                <Navigation className="h-3 w-3 text-indigo-500" />
                <span>เช็กชานชาลาสดใน Google Maps</span>
                <ExternalLink className="h-2.5 w-2.5 opacity-60" />
              </a>
            </div>

            {transitGuide.details && (
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium pl-0.5">
                {transitGuide.details}
              </p>
            )}

            {transitGuide.bestTip && (
              <div className="flex items-start gap-1.5 p-2 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                <span className="shrink-0">💡</span>
                <span><b>ทางเลือกที่ดีที่สุด:</b> {transitGuide.bestTip}</span>
              </div>
            )}
          </div>
        )}

        {/* Backup Plan (Plan B) */}
        {item.backup_plan && (
          <div className="mt-2.5 pt-2.5 border-t border-dashed border-slate-200/80 dark:border-[#2d3448]">
            <button
              type="button"
              onClick={() => onTogglePlanB(item.id)}
              className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-[#222738] border border-slate-200/70 dark:border-[#2d3448] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer shadow-2xs"
            >
              <Shield className="h-3.5 w-3.5 text-indigo-500" />
              <span>แผนสำรอง (Plan B)</span>
              {isPlanBOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {isPlanBOpen && (
              <div className="p-3.5 mt-2.5 rounded-2xl bg-slate-50/70 dark:bg-[#1f2433] text-xs sm:text-sm text-slate-700 dark:text-slate-200 space-y-2.5 border border-slate-200/70 dark:border-[#2d3448] shadow-xs">
                <div className="font-black text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  <span>รายการสถานที่ & ร้านอาหารสำรอง (แตะเพื่อเปิดพิกัด):</span>
                </div>
                <div className="space-y-2">
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
                          className="p-3 rounded-xl bg-white/95 dark:bg-[#1c2032] border border-rose-100/80 dark:border-[#323850] flex items-center justify-between gap-2 shadow-2xs hover:border-[#e06b88]/50 transition-all"
                        >
                          <span className="font-medium text-slate-800 dark:text-slate-200 leading-snug">
                            {line}
                          </span>
                          <a
                            href={lineMapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-50 text-[#e06b88] dark:bg-[#2a2f45] dark:text-[#fbc2cf] hover:bg-[#e06b88] hover:text-white dark:hover:bg-[#e06b88] dark:hover:text-white transition-all shrink-0 cursor-pointer shadow-2xs"
                            title="เปิด Google Maps สำหรับรายการนี้"
                          >
                            <span>แผนที่ 📍</span>
                            <ExternalLink className="h-3 w-3" />
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
    </div>
  );
}

export const ItineraryStopCard = React.memo(ItineraryStopCardComponent);
