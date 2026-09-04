// src/components/trip-detail/ItineraryStopCard.tsx
'use client';

import React from 'react';
import { 
  Clock, ExternalLink, Utensils, Bus, ChevronUp, 
  ChevronDown, ArrowUp, ArrowDown, Edit3, Trash2, Shield 
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
    <div className="group p-4 sm:p-5 rounded-3xl border border-rose-100/80 dark:border-[#323850]/80 bg-white/95 dark:bg-[#222638]/95 card-elevation hover:border-[#e06b88]/50 dark:hover:border-[#e06b88]/50 transition-all duration-300 space-y-3">
      {/* Top Row: Date Badge, Time slot, City & Reorder/Edit tools */}
      <div className="flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="px-3 py-1 rounded-xl text-xs font-black bg-rose-50 text-[#e06b88] dark:bg-[#e06b88]/25 dark:text-[#fbc2cf] border border-rose-200/80 dark:border-[#e06b88]/40 whitespace-nowrap shrink-0 shadow-xs">
            {item.date_label || `Day ${idx + 1}`}
          </span>
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
        {/* Main Place Name & Location Badge */}
        <div>
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
        </div>

        {/* Food & Dining Recommendations */}
        {item.food_recommendation && (
          <div className="text-sm text-slate-700 dark:text-slate-200 flex items-start gap-2.5 pt-0.5 leading-relaxed">
            <Utensils className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="font-black text-slate-900 dark:text-white">ร้านอาหาร / คาเฟ่: </span>
              <span className="font-medium">{item.food_recommendation}</span>
              {foodSearchUrl && (
                <a
                  href={foodSearchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-500/25 dark:text-amber-200 border border-amber-200/80 dark:border-amber-500/40 hover:scale-105 active:scale-95 transition-all ml-1.5 align-middle cursor-pointer shadow-xs"
                  title="เปิด Google Maps ร้านอาหาร"
                >
                  <span>เปิดแผนที่ร้าน 📍</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Transportation Details */}
        {item.transport_info && (
          <div className="text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2.5 font-medium leading-relaxed">
            <Bus className="h-4 w-4 text-[#e06b88] dark:text-[#fbc2cf] shrink-0" />
            <span><b className="text-slate-900 dark:text-white font-bold">การเดินทาง:</b> {item.transport_info}</span>
          </div>
        )}

        {/* Backup Plan (Plan B) */}
        {item.backup_plan && (
          <div className="mt-2.5 pt-2.5 border-t border-dashed border-rose-100/80 dark:border-[#323850]">
            <button
              type="button"
              onClick={() => onTogglePlanB(item.id)}
              className="text-xs sm:text-sm font-bold text-[#e06b88] dark:text-[#fbc2cf] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50/80 dark:bg-[#2a2f45] border border-rose-200/70 dark:border-[#323850] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer shadow-2xs"
            >
              <Shield className="h-3.5 w-3.5" />
              <span>แผนสำรอง (Plan B)</span>
              {isPlanBOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {isPlanBOpen && (
              <div className="p-3.5 mt-2.5 rounded-2xl bg-rose-50/60 dark:bg-[#2a2f45] text-xs sm:text-sm text-slate-700 dark:text-slate-200 space-y-2.5 border border-rose-200/60 dark:border-[#323850] shadow-xs">
                <div className="font-black text-xs text-[#e06b88] dark:text-[#fbc2cf] flex items-center gap-1.5">
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
