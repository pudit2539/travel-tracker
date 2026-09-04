// src/components/trip-detail/ItineraryStopCard.tsx
'use client';

import React from 'react';
import { 
  Clock, ExternalLink, Utensils, Bus, ChevronUp, 
  ChevronDown, ArrowUp, ArrowDown, Edit3, Trash2 
} from 'lucide-react';

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
  const mainPlaceMapsUrl =
    item.main_place_links && item.main_place_links[0]
      ? item.main_place_links[0]
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          item.main_place + ' ' + (item.city || 'Japan')
        )}`;

  const foodSearchUrl =
    item.food_links && item.food_links[0]
      ? item.food_links[0]
      : item.food_recommendation
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          item.food_recommendation.split(/[,(]/)[0].trim() + ' ' + (item.city || 'Japan')
        )}`
      : '';

  return (
    <div className="group p-4 rounded-3xl border border-pink-100/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#151826]/95 card-elevation hover:border-pink-300 dark:hover:border-slate-700 transition-all duration-300 space-y-2.5">
      <div className="flex justify-between items-center gap-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-pink-50 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 border border-pink-200/80 dark:border-pink-800/60 whitespace-nowrap shrink-0">
            {item.date_label || `Day ${idx + 1}`}
          </span>
          {item.time_slot && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0">
              <Clock className="h-3 w-3 text-pink-500 shrink-0" />
              <span>{item.time_slot}</span>
            </span>
          )}
          {item.city && (
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap truncate max-w-[140px] sm:max-w-none">
              📍 {item.city}
            </span>
          )}
        </div>

        {canEditPlan && (
          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              type="button"
              onClick={() => onMoveActivity(idx, 'up')}
              disabled={idx === 0 || reordering}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
              title="เลื่อนขึ้น"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onMoveActivity(idx, 'down')}
              disabled={idx === totalItems - 1 || reordering}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
              title="เลื่อนลง"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onOpenEditActivity(item)}
              className="p-1 rounded hover:bg-pink-50 dark:hover:bg-slate-800 text-slate-400 hover:text-pink-600 transition-colors cursor-pointer"
              title="แก้ไขกิจกรรม"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDeleteActivity(item.id)}
              className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
              title="ลบกิจกรรม"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div>
          <a
            href={mainPlaceMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm sm:text-base font-black text-slate-900 dark:text-white hover:text-pink-600 dark:hover:text-pink-400 inline-flex items-center gap-1.5 transition-colors group/title cursor-pointer"
            title="เปิด Google Maps สถานที่หลัก"
          >
            <span>{item.main_place}</span>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-pink-600 dark:text-pink-300 bg-pink-50 dark:bg-pink-950/60 px-2 py-0.5 rounded-full border border-pink-200 dark:border-pink-800 group-hover/title:scale-105 transition-transform">
              <span>แผนที่ 📍</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </span>
          </a>
        </div>

        {item.food_recommendation && (
          <div className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2 pt-0.5">
            <Utensils className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="font-bold text-slate-900 dark:text-white">ร้านอาหาร / คาเฟ่: </span>
              <span>{item.food_recommendation}</span>
              {foodSearchUrl && (
                <a
                  href={foodSearchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:scale-105 transition-all ml-1.5 align-middle cursor-pointer"
                  title="เปิด Google Maps ร้านอาหาร"
                >
                  <span>เปิดแผนที่ร้าน 📍</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
          </div>
        )}

        {item.transport_info && (
          <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 font-medium">
            <Bus className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            <span>การเดินทาง: {item.transport_info}</span>
          </div>
        )}

        {item.backup_plan && (
          <div className="mt-2 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => onTogglePlanB(item.id)}
              className="text-xs font-bold text-purple-600 dark:text-purple-300 flex items-center gap-1.5 hover:underline cursor-pointer"
            >
              <span>🛡️ แผนสำรอง (Plan B)</span>
              {isPlanBOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {isPlanBOpen && (
              <div className="p-3 mt-2 rounded-2xl bg-purple-50/70 dark:bg-slate-800/60 text-xs text-slate-700 dark:text-slate-200 space-y-2 border border-purple-200/70 dark:border-slate-700/80">
                <div className="font-bold text-[11px] text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                  <span>🛡️ รายการสถานที่ & ร้านอาหารสำรอง (แตะเพื่อเปิดพิกัด):</span>
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
                          className="p-2.5 rounded-xl bg-white/95 dark:bg-[#12141f] border border-purple-100 dark:border-slate-700 flex items-center justify-between gap-2 shadow-2xs hover:border-pink-300 transition-all"
                        >
                          <span className="font-medium text-slate-800 dark:text-slate-200 leading-snug">
                            {line}
                          </span>
                          <a
                            href={lineMapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-purple-100 text-purple-700 dark:bg-slate-700 dark:text-slate-200 hover:bg-pink-500 hover:text-white dark:hover:bg-pink-500 transition-all shrink-0 cursor-pointer shadow-2xs"
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
        )}
      </div>
    </div>
  );
}

export const ItineraryStopCard = React.memo(ItineraryStopCardComponent);
