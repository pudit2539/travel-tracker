// src/components/trip-detail/modals/DailyStoryCardModal.tsx
'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, Download, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/clipboard';
import { getStopKey, JapanGoldenHourInfo } from '@/lib/smartTimeline';

export interface DailyStoryCardData {
  tripTitle: string;
  dayLabel: string;
  dayNumber: number;
  primaryCity: string;
  totalStops: number;
  visitedStops: number;
  sightseeingHours: string;
  sunsetTime?: string;
  activeStayName?: string;
  highlights: Array<{ name: string; timeSlot?: string; visited: boolean }>;
}

export function buildDailyStorySummaryText(data: DailyStoryCardData): string {
  const lines = [
    `✈️ ${data.tripTitle}`,
    `📅 DAY ${data.dayNumber} • ${data.dayLabel} (${data.primaryCity})`,
    `⛩️ เช็กอินแล้ว ${data.visitedStops}/${data.totalStops} จุด • เวลาเที่ยว ${data.sightseeingHours} ชม.`,
  ];
  if (data.sunsetTime) {
    lines.push(`🌅 พระอาทิตย์ตก ${data.sunsetTime}`);
  }
  lines.push('');
  data.highlights.slice(0, 6).forEach((h, i) => {
    lines.push(`${h.visited ? '済' : `${i + 1}.`} ${h.name}${h.timeSlot ? ` (${h.timeSlot})` : ''}`);
  });
  if (data.activeStayName) {
    lines.push('');
    lines.push(`🏨 ที่พักคืนนี้: ${data.activeStayName}`);
  }
  return lines.join('\n');
}

interface DailyStoryCardModalProps {
  isOpen: boolean;
  mounted: boolean;
  onClose: () => void;
  trip: any;
  dayLabel: string;
  dayNumber: number;
  dayStops: any[];
  visitedStamps: Record<string, any>;
  dayCascadeSchedule: {
    totalSightseeingMin: number;
    dayStartTime: string;
    dayEndTime: string;
  };
  goldenHour?: JapanGoldenHourInfo;
  activeStayName?: string;
}

export const DailyStoryCardModal = React.memo(function DailyStoryCardModal({
  isOpen,
  mounted,
  onClose,
  trip,
  dayLabel,
  dayNumber,
  dayStops,
  visitedStamps,
  dayCascadeSchedule,
  goldenHour,
  activeStayName,
}: DailyStoryCardModalProps) {
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [exportingPng, setExportingPng] = useState(false);

  if (!isOpen || !mounted) return null;

  const tripTitle = trip?.name || trip?.title || 'Japan Journey';
  const primaryCity =
    dayStops.find((s) => s?.city)?.city?.split(/[(\/→➔\-–]/)[0]?.trim() || 'Kansai · Japan';

  const highlights = dayStops.map((stop) => {
    const key = getStopKey(stop);
    const isVisited = Boolean(
      (stop?.id && visitedStamps[stop.id]) ||
        visitedStamps[key] ||
        (stop?.main_place && visitedStamps[stop.main_place])
    );
    return {
      name: stop?.main_place || stop?.title || 'จุดหมาย',
      timeSlot: stop?.time_slot || '',
      visited: isVisited,
    };
  });

  const visitedCount = highlights.filter((h) => h.visited).length;
  const sightseeingHours = (Math.max(60, dayCascadeSchedule?.totalSightseeingMin || 360) / 60).toFixed(1);

  const storyData: DailyStoryCardData = {
    tripTitle,
    dayLabel,
    dayNumber: Math.max(1, dayNumber),
    primaryCity,
    totalStops: highlights.length,
    visitedStops: visitedCount,
    sightseeingHours,
    sunsetTime: goldenHour?.sunsetTime,
    activeStayName,
    highlights,
  };

  const handleCopyCaption = async () => {
    const text = buildDailyStorySummaryText(storyData);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedCaption(true);
      toast.success('คัดลอกแคปชันสรุปวันสำหรับ LINE / IG แล้ว ✨');
      setTimeout(() => setCopiedCaption(false), 2200);
    }
  };

  const handleDownloadStoryPng = async () => {
    if (typeof document === 'undefined') return;
    setExportingPng(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D unavailable');

      // 1. Oceanic Glacial Indigo 9:16 Background Gradient
      const grad = ctx.createLinearGradient(0, 0, 1080, 1920);
      grad.addColorStop(0, '#080e19');
      grad.addColorStop(0.5, '#0d131f');
      grad.addColorStop(1, '#1e3a8a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1920);

      // Subtle Cyan Glow Accent
      ctx.fillStyle = 'rgba(76, 215, 246, 0.12)';
      ctx.beginPath();
      ctx.arc(920, 220, 340, 0, Math.PI * 2);
      ctx.fill();

      // 2. Top Editorial Tag & Day Number
      ctx.fillStyle = '#4cd7f6';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText('OCEANIC JOURNEY LOG • 9:16 STORY', 84, 140);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 86px serif';
      ctx.fillText(`DAY ${storyData.dayNumber} • ${storyData.primaryCity}`, 84, 248);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 36px sans-serif';
      ctx.fillText(`${storyData.tripTitle} (${storyData.dayLabel})`, 84, 315);

      // 3. Stats Box
      ctx.fillStyle = 'rgba(22, 28, 39, 0.88)';
      ctx.strokeStyle = 'rgba(76, 215, 246, 0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(84, 375, 912, 165, 32);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#4cd7f6';
      ctx.font = 'bold 44px monospace';
      ctx.fillText(`済 ${storyData.visitedStops}/${storyData.totalStops} STOPS`, 132, 455);
      ctx.fillText(`⏱ ${storyData.sightseeingHours} HRS`, 510, 455);
      if (storyData.sunsetTime) {
        ctx.fillText(`🌅 ${storyData.sunsetTime}`, 780, 455);
      }
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '500 28px sans-serif';
      ctx.fillText('ความคืบหน้าเช็กอินรายวัน • ตารางเวลาไหลอัตโนมัติ', 132, 505);

      // 4. Highlights Timeline
      let y = 630;
      storyData.highlights.slice(0, 7).forEach((item, idx) => {
        ctx.fillStyle = item.visited ? 'rgba(37, 99, 235, 0.28)' : 'rgba(22, 28, 39, 0.78)';
        ctx.strokeStyle = item.visited ? '#4cd7f6' : 'rgba(148, 163, 184, 0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(84, y, 912, 132, 24);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = item.visited ? '#4cd7f6' : '#94a3b8';
        ctx.font = 'bold 34px monospace';
        ctx.fillText(item.visited ? '済' : String(idx + 1).padStart(2, '0'), 126, y + 78);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px sans-serif';
        const truncated = item.name.length > 34 ? item.name.slice(0, 34) + '…' : item.name;
        ctx.fillText(truncated, 210, y + 66);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 26px monospace';
        ctx.fillText(item.timeSlot || storyData.dayLabel, 210, y + 106);

        y += 154;
      });

      // 5. Footer Stay & Watermark
      if (storyData.activeStayName) {
        ctx.fillStyle = '#7bd0ff';
        ctx.font = 'bold 32px sans-serif';
        ctx.fillText(`🏨 Tonight: ${storyData.activeStayName}`, 84, 1775);
      }
      ctx.fillStyle = '#64748b';
      ctx.font = '600 26px monospace';
      ctx.fillText('TRAVEL TRACKER • OCEANIC GLACIAL EDITION', 84, 1835);

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `story-day-${storyData.dayNumber}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('บันทึกรูป Story 9:16 (PNG) ลงเครื่องเรียบร้อยแล้ว 📸✨');
    } catch {
      await handleCopyCaption();
    } finally {
      setExportingPng(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center backdrop-blur-md bg-black/85 p-3 sm:p-4 overscroll-contain animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white dark:bg-[#161c27] border border-slate-200/90 dark:border-[#24324a] shadow-2xl p-4 sm:p-5 space-y-4 max-h-[92dvh] overflow-y-auto overscroll-contain animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-[#24324a]">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1d4ed8] to-[#2563eb] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                การ์ดสรุปวัน 9:16 (IG Story / LINE)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                เซฟเป็นรูปแนวตั้ง 1080×1920 หรือคัดลอกสรุปส่งเข้ากลุ่ม
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 9:16 Visual Story Card Preview */}
        <div
          data-testid="daily-story-card-preview"
          className="relative aspect-[9/16] w-full max-w-[310px] mx-auto rounded-3xl overflow-hidden bg-gradient-to-b from-[#080e19] via-[#0d131f] to-[#1e3a8a] border border-[#4cd7f6]/35 shadow-xl p-5 flex flex-col justify-between text-white select-none"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold tracking-widest text-[#4cd7f6] uppercase">
              <span>OCEANIC JOURNEY LOG</span>
              <span>DAY {storyData.dayNumber}</span>
            </div>
            <h4 className="font-serif text-xl font-bold leading-tight text-white">
              {storyData.primaryCity}
            </h4>
            <p className="text-[11px] text-slate-300 font-medium truncate">
              {storyData.tripTitle} • {storyData.dayLabel}
            </p>

            {/* Telemetry Mini Bar */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <div className="p-2 rounded-xl bg-[#161c27]/90 border border-[#4cd7f6]/25 text-center">
                <div className="text-[9px] text-slate-400 font-bold">CHECK-IN</div>
                <div className="text-xs font-mono font-black text-[#4cd7f6]">
                  {storyData.visitedStops}/{storyData.totalStops}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-[#161c27]/90 border border-[#4cd7f6]/25 text-center">
                <div className="text-[9px] text-slate-400 font-bold">DURATION</div>
                <div className="text-xs font-mono font-black text-white">
                  {storyData.sightseeingHours}h
                </div>
              </div>
              <div className="p-2 rounded-xl bg-[#161c27]/90 border border-[#4cd7f6]/25 text-center">
                <div className="text-[9px] text-slate-400 font-bold">SUNSET</div>
                <div className="text-xs font-mono font-black text-amber-300">
                  {storyData.sunsetTime || '16:48'}
                </div>
              </div>
            </div>
          </div>

          {/* Stops Timeline inside 9:16 Card */}
          <div className="my-2 space-y-1.5 overflow-hidden flex-1 flex flex-col justify-center">
            {storyData.highlights.slice(0, 6).map((h, i) => (
              <div
                key={i}
                className={`px-2.5 py-1.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                  h.visited
                    ? 'bg-[#2563eb]/30 border-[#4cd7f6]/50 text-white'
                    : 'bg-[#161c27]/75 border-white/10 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-5 h-5 rounded-md font-mono text-[10px] font-black flex items-center justify-center shrink-0 ${
                      h.visited ? 'bg-[#4cd7f6] text-[#080e19]' : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {h.visited ? '済' : i + 1}
                  </span>
                  <span className="font-bold truncate text-[11px]">{h.name}</span>
                </div>
                {h.timeSlot && (
                  <span className="text-[9px] font-mono text-slate-300 shrink-0">
                    {h.timeSlot.split('-')[0].trim()}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Bottom Stay & Signature */}
          <div className="pt-2 border-t border-white/15 flex items-center justify-between text-[10px]">
            <span className="text-[#7bd0ff] font-bold truncate max-w-[200px]">
              {storyData.activeStayName ? `🏨 ${storyData.activeStayName}` : `🇯🇵 ${storyData.tripTitle}`}
            </span>
            <span className="font-mono text-slate-400">9:16 STORY</span>
          </div>
        </div>

        {/* Export & Share Actions */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleDownloadStoryPng}
            disabled={exportingPng}
            className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] hover:from-[#1e40af] hover:to-[#1d4ed8] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-95 transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{exportingPng ? 'กำลังสร้างรูป...' : 'บันทึกรูป PNG 9:16'}</span>
          </button>
          <button
            type="button"
            onClick={handleCopyCaption}
            className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-[#0d131f] hover:bg-slate-200 dark:hover:bg-[#1a202c] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#24324a] text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
          >
            {copiedCaption ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedCaption ? 'คัดลอกแล้ว' : 'คัดลอกสรุปส่ง LINE'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
});
