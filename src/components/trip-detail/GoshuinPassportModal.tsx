'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  X,
  Stamp,
  Sparkles,
  Download,
  Copy,
  Check,
  MapPin,
  Trophy,
  Utensils,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { ModalPortal } from '@/components/ModalPortal';
import { getTripVisitedMeta, CheckInMeta } from '@/lib/visitedStamps';
import { copyToClipboard } from '@/lib/clipboard';
import { convertCurrency } from '@/lib/currency';
import { triggerHaptic } from '@/lib/haptics';
import { DEFAULT_CATEGORIES } from '@/lib/categories';

export interface GoshuinPassportModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: any;
  itinerary: any[];
  expenses: any[];
  fxRate?: number;
  tripBaseCurrency?: string;
  initialTab?: 'passport' | 'wrapped';
}

interface StampEntry {
  id: string;
  place: string;
  city: string;
  dateLabel: string;
  visited: boolean;
  meta?: CheckInMeta;
  emblem: string;
  kanji: string;
}

export function resolveGoshuinEmblem(place: string, city: string): { emblem: string; kanji: string } {
  const t = `${place} ${city}`.toLowerCase();
  if (/inari|torii|ศาลเจ้า|shrine|ฟุชิมิ/.test(t)) return { emblem: '⛩️', kanji: '参拝' };
  if (/temple|วัด|kiyomizu|todai|byodoin|sensoji|kinkaku/.test(t)) return { emblem: '🏯', kanji: '御朱印' };
  if (/castle|ปราสาท/.test(t)) return { emblem: '🏰', kanji: '登城' };
  if (/nara|กวาง|deer/.test(t)) return { emblem: '🦌', kanji: '奈良' };
  if (/ramen|ราเมง|udon|soba|อาหาร|wagyu|sushi|ตลาด|kuromon|tsukiji/.test(t)) return { emblem: '🍜', kanji: '満腹' };
  if (/cafe|coffee|matcha|มัทฉะ|ชา|คาเฟ่|uji/.test(t)) return { emblem: '🍵', kanji: '一服' };
  if (/fuji|ฟูจิ|kawaguchiko|mountain|ภูเขา/.test(t)) return { emblem: '🗻', kanji: '絶景' };
  if (/usj|universal|disney|aquarium|สวนสนุก/.test(t)) return { emblem: '🎢', kanji: '満喫' };
  if (/shop|outlet|donki|dotonbori|shinsaibashi|shibuya|shinjuku|ช้อป/.test(t)) return { emblem: '🛍️', kanji: '買物' };
  if (/airport|สนามบิน|kix|nrt|hnd|shinkansen|station/.test(t)) return { emblem: '✈️', kanji: '旅立' };
  return { emblem: '🗾', kanji: '済' };
}

export function computeTripWrappedStats(
  itinerary: any[],
  expenses: any[],
  visitedMetaMap: Record<string, CheckInMeta>,
  tripBaseCurrency = 'JPY',
  fxRate = 0.23
) {
  const validStops = (itinerary || []).filter((it) => it?.date_label !== '__meta_trip_data__');
  const citySet = new Set<string>();
  const visitedCities = new Set<string>();
  let visitedCount = 0;
  let foodStopsCount = 0;

  for (const stop of validStops) {
    const cityShort = (stop.city || '').split(/[(\/→➔\-–]/)[0].trim();
    if (cityShort) citySet.add(cityShort);
    const key = stop.id || stop.main_place || '';
    const isVisited = Boolean(
      (key && visitedMetaMap[key]?.visited) || (stop.main_place && visitedMetaMap[stop.main_place]?.visited)
    );
    if (isVisited) {
      visitedCount += 1;
      if (cityShort) visitedCities.add(cityShort);
    }
    if (stop.food_recommendation && stop.food_recommendation.trim() && stop.food_recommendation.trim() !== '-') {
      foodStopsCount += 1;
    }
  }

  // Expense analytics for Top Spender & Top Category
  let totalSpentThb = 0;
  let totalSpentBase = 0;
  const payerTotals: Record<string, number> = {};
  const catTotals: Record<string, number> = {};

  for (const exp of expenses || []) {
    const amt = Number(exp.amount || 0);
    if (!Number.isFinite(amt) || amt <= 0) continue;
    const curr = (exp.currency || tripBaseCurrency || 'JPY').toUpperCase();
    const inThb = convertCurrency(amt, curr, 'THB', fxRate);
    const inBase = convertCurrency(amt, curr, tripBaseCurrency || 'JPY', fxRate);
    totalSpentThb += inThb;
    totalSpentBase += inBase;

    const payer = exp.payer_name || 'สมาชิก';
    payerTotals[payer] = (payerTotals[payer] || 0) + inThb;

    const cat = exp.category || 'other';
    catTotals[cat] = (catTotals[cat] || 0) + inThb;
  }

  const topPayerEntry = Object.entries(payerTotals).sort((a, b) => b[1] - a[1])[0];
  const topCatEntry = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
  const topCatMeta = DEFAULT_CATEGORIES.find((c) => c.id === topCatEntry?.[0]);

  return {
    totalStops: validStops.length,
    visitedCount,
    completionPct: validStops.length > 0 ? Math.round((visitedCount / validStops.length) * 100) : 0,
    totalCities: citySet.size,
    visitedCitiesCount: visitedCities.size,
    citiesList: Array.from(citySet).slice(0, 6),
    foodStopsCount,
    expensesCount: (expenses || []).length,
    totalSpentThb: Math.round(totalSpentThb),
    totalSpentBase: Math.round(totalSpentBase),
    topSpenderName: topPayerEntry ? topPayerEntry[0] : null,
    topSpenderThb: topPayerEntry ? Math.round(topPayerEntry[1]) : 0,
    topCategoryLabel: topCatMeta ? `${topCatMeta.icon} ${topCatMeta.label}` : topCatEntry?.[0] || null,
  };
}

export function GoshuinPassportModal({
  isOpen,
  onClose,
  trip,
  itinerary = [],
  expenses = [],
  fxRate = 0.23,
  tripBaseCurrency = 'JPY',
  initialTab = 'passport',
}: GoshuinPassportModalProps) {
  const [activeTab, setActiveTab] = useState<'passport' | 'wrapped'>(initialTab);
  const [copiedSummary, setCopiedSummary] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const tripId = trip?.id || '';

  const visitedMetaMap = useMemo(() => {
    if (!isOpen) return {};
    return getTripVisitedMeta(tripId);
  }, [isOpen, tripId]);

  const stamps: StampEntry[] = useMemo(() => {
    return (itinerary || [])
      .filter((it) => it?.date_label !== '__meta_trip_data__')
      .map((stop, idx) => {
        const key = stop.id || stop.main_place || `stop-${idx}`;
        const meta = visitedMetaMap[key] || (stop.main_place ? visitedMetaMap[stop.main_place] : undefined);
        const place = stop.main_place || stop.title || `จุดแวะ ${idx + 1}`;
        const city = stop.city || 'Japan';
        const { emblem, kanji } = resolveGoshuinEmblem(place, city);
        return {
          id: key,
          place,
          city,
          dateLabel: stop.date_label || '',
          visited: Boolean(meta?.visited),
          meta,
          emblem,
          kanji,
        };
      });
  }, [itinerary, visitedMetaMap]);

  const stampedOnly = useMemo(() => stamps.filter((s) => s.visited), [stamps]);
  const wrapped = useMemo(
    () => computeTripWrappedStats(itinerary, expenses, visitedMetaMap, tripBaseCurrency, fxRate),
    [itinerary, expenses, visitedMetaMap, tripBaseCurrency, fxRate]
  );

  if (!isOpen) return null;

  const tripName = trip?.name || trip?.title || 'Japan Journey';

  const handleCopyWrappedText = async () => {
    triggerHaptic('light');
    const lines = [
      `✨ Trip Wrapped: ${tripName}`,
      `⛩️ เช็กอินครบ ${wrapped.visitedCount}/${wrapped.totalStops} จุด (${wrapped.completionPct}%)`,
      `🗺️ เมืองในทริป: ${wrapped.citiesList.join(' • ') || 'Japan'}`,
      `🍜 ร้านเด็ด/เมนูแนะนำในแผน: ${wrapped.foodStopsCount} จุด`,
      wrapped.totalSpentThb > 0
        ? `💸 ยอดใช้จ่ายรวม: ฿${wrapped.totalSpentThb.toLocaleString()} (${wrapped.expensesCount} บิล)`
        : null,
      wrapped.topSpenderName ? `👑 สายเปย์ประจำทริป: ${wrapped.topSpenderName}` : null,
      wrapped.topCategoryLabel ? `🏆 หมวดที่เปย์หนักสุด: ${wrapped.topCategoryLabel}` : null,
    ].filter(Boolean);

    const ok = await copyToClipboard(lines.join('\n'));
    if (ok) {
      setCopiedSummary(true);
      toast.success('คัดลอกการ์ดสรุปทริปพร้อมวางลง LINE แล้ว ✨');
      setTimeout(() => setCopiedSummary(false), 2000);
    }
  };

  const handleDownloadStoryPng = () => {
    try {
      triggerHaptic('success');
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Washi editorial background gradient
      const bg = ctx.createLinearGradient(0, 0, 0, 1920);
      bg.addColorStop(0, '#1C2630');
      bg.addColorStop(0.55, '#241E1B');
      bg.addColorStop(1, '#121316');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 1080, 1920);

      // Subtle red vermilion frame accent
      ctx.strokeStyle = '#C83E2D';
      ctx.lineWidth = 8;
      ctx.strokeRect(56, 56, 968, 1808);

      // Header Tag
      ctx.fillStyle = '#E79B71';
      ctx.font = 'bold 34px system-ui, sans-serif';
      ctx.fillText('TRAVEL TRACKER · TRIP WRAPPED', 110, 170);

      // Trip Title
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 74px Georgia, serif';
      const titleLines = tripName.length > 22 ? [tripName.slice(0, 22), tripName.slice(22, 46)] : [tripName];
      titleLines.forEach((line, i) => ctx.fillText(line.trim(), 110, 280 + i * 90));

      // Red Hanko Stamp Circle
      ctx.beginPath();
      ctx.arc(880, 260, 86, 0, Math.PI * 2);
      ctx.strokeStyle = '#C83E2D';
      ctx.lineWidth = 10;
      ctx.stroke();
      ctx.fillStyle = '#C83E2D';
      ctx.font = 'bold 56px serif';
      ctx.textAlign = 'center';
      ctx.fillText('御朱印', 880, 280);
      ctx.textAlign = 'left';

      // Stat Cards
      const cards = [
        { label: 'CHECK-IN STAMPS', value: `${wrapped.visitedCount} / ${wrapped.totalStops} จุด (${wrapped.completionPct}%)` },
        { label: 'CITIES EXPLORED', value: wrapped.citiesList.join(' · ') || 'Japan' },
        { label: 'TOTAL SPENDING', value: `฿${wrapped.totalSpentThb.toLocaleString()} (${wrapped.expensesCount} รายการ)` },
        { label: 'TOP SPENDER MVP', value: wrapped.topSpenderName ? `${wrapped.topSpenderName} (฿${wrapped.topSpenderThb.toLocaleString()})` : 'ยังไม่มีรายการ' },
        { label: 'TOP CATEGORY', value: wrapped.topCategoryLabel || 'อาหาร & ท่องเที่ยว' },
      ];

      cards.forEach((c, idx) => {
        const y = 520 + idx * 215;
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(110, y, 860, 175);
        ctx.fillStyle = '#C83E2D';
        ctx.fillRect(110, y, 10, 175);

        ctx.fillStyle = '#B8AFA1';
        ctx.font = 'bold 28px system-ui, sans-serif';
        ctx.fillText(c.label, 150, y + 60);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 44px system-ui, sans-serif';
        ctx.fillText(c.value.slice(0, 34), 150, y + 130);
      });

      // Footer
      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 30px system-ui, sans-serif';
      ctx.fillText(`⛩️ เก็บตราปั๊มแล้ว ${stampedOnly.length} ดวง · Made with Travel Tracker`, 110, 1775);

      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tripName.replace(/\s+/g, '_')}_TripWrapped.png`;
      a.click();
      toast.success('บันทึกการ์ด Trip Wrapped (9:16 PNG) ลงเครื่องแล้ว 📸');
    } catch {
      toast.error('ไม่สามารถสร้างไฟล์รูปได้บนเบราว์เซอร์นี้ ลองกดคัดลอกข้อความแทนครับ');
    }
  };

  return (
    <ModalPortal lockScroll>
      <div
        className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto overscroll-contain modal-safe-overlay animate-in fade-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-label="สมุดตราปั๊ม Goshuin Passport และ Trip Wrapped"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="my-auto w-full max-w-2xl rounded-3xl bg-[#ffffff] dark:bg-[#161c27] border border-[#e2e8f0] dark:border-[#24324a] shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 modal-safe-card"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#e2e8f0] dark:border-[#24324a] flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-[#2563eb] text-white flex items-center justify-center shadow-md shadow-[#2563eb]/25 shrink-0 font-serif font-black text-base">
                印
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                  Goshuin Passport & Trip Wrapped
                </h2>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                  สมุดสะสมตราปั๊มเช็กอิน ({wrapped.visitedCount}/{wrapped.totalStops}) & การ์ดสรุปทริปแชร์ Story
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="ปิดสมุดตราปั๊ม"
              className="min-w-[40px] min-h-[40px] rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1a202c] flex items-center justify-center cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 2-Tab Switcher */}
          <div className="px-4 pt-3 shrink-0">
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#f1f5f9] dark:bg-[#0d131f] border border-[#e2e8f0] dark:border-[#24324a]">
              <button
                type="button"
                onClick={() => setActiveTab('passport')}
                className={`min-h-[40px] py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'passport'
                    ? 'bg-white dark:bg-[#1a202c] text-[#2563eb] dark:text-rose-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Stamp className="h-3.5 w-3.5" />
                <span>สมุดตราปั๊ม ({stampedOnly.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('wrapped')}
                className={`min-h-[40px] py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'wrapped'
                    ? 'bg-white dark:bg-[#1a202c] text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>การ์ดสรุป Trip Wrapped</span>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-5 overflow-y-auto overscroll-contain flex-1 custom-scrollbar space-y-4">
            {activeTab === 'passport' ? (
              <>
                {/* Passport Progress Banner */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0d131f] border border-[#e2e8f0] dark:border-[#24324a] space-y-2">
                  <div className="flex items-center justify-between text-xs font-black">
                    <span className="text-slate-800 dark:text-white">
                      ความคืบหน้าการสะสมตราประทับ
                    </span>
                    <span className="font-mono text-[#2563eb] dark:text-rose-400">
                      {wrapped.visitedCount}/{wrapped.totalStops} ({wrapped.completionPct}%)
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[#EFE9DD] dark:bg-[#1a202c] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#2563eb] to-amber-500 transition-all duration-500"
                      style={{ width: `${wrapped.completionPct}%` }}
                    />
                  </div>
                </div>

                {stamps.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400">
                    ยังไม่มีจุดแวะในแพลนเที่ยว
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {stamps.map((s) => (
                      <div
                        key={s.id}
                        className={`p-3 rounded-2xl border transition-all flex flex-col items-center text-center gap-1.5 relative overflow-hidden ${
                          s.visited
                            ? 'bg-[#FFFDF9] dark:bg-[#1E1A18] border-[#2563eb]/45 shadow-xs'
                            : 'bg-slate-50/70 dark:bg-[#0d131f]/60 border-dashed border-slate-200 dark:border-[#24324a] opacity-65'
                        }`}
                      >
                        <div
                          className={`w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center select-none ${
                            s.visited
                              ? 'border-[#2563eb] text-[#2563eb] bg-[#FFF2EE] dark:bg-rose-950/40 -rotate-6 shadow-inner'
                              : 'border-slate-300 dark:border-slate-700 text-slate-400'
                          }`}
                        >
                          <span className="text-lg leading-none">{s.emblem}</span>
                          <span className="text-[9px] font-serif font-black tracking-widest mt-0.5">
                            {s.visited ? s.kanji : '未済'}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                          {s.place}
                        </p>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-full">
                          {s.city}
                        </span>
                        {s.visited && s.meta?.at && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-[#2563eb] dark:text-rose-300">
                            ✓ {s.meta.at}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* Tab 2: Shareable Trip Wrapped Story Preview */
              <div className="space-y-3">
                <div className="mx-auto max-w-sm rounded-3xl bg-gradient-to-b from-[#1e3a8a] via-[#241E1B] to-[#0d131f] p-5 text-white border-2 border-[#2563eb]/70 shadow-2xl space-y-4 relative overflow-hidden">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-black tracking-[0.2em] text-amber-300 uppercase">
                        TRIP WRAPPED · STORY CARD
                      </span>
                      <h3 className="font-serif text-xl font-black leading-tight mt-1 break-words">
                        {tripName}
                      </h3>
                      {trip?.start_date && (
                        <p className="text-[11px] text-slate-300 mt-0.5 font-mono">
                          {trip.start_date} {trip.end_date ? `→ ${trip.end_date}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="w-12 h-12 rounded-full border-2 border-[#2563eb] text-[#FF7A6B] flex items-center justify-center font-serif font-black text-xs -rotate-12 shrink-0">
                      御朱印
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-2xl bg-white/8 border border-white/10">
                      <div className="flex items-center gap-1 text-[10px] text-amber-300 font-bold">
                        <Stamp className="h-3 w-3" />
                        <span>เช็กอินแล้ว</span>
                      </div>
                      <div className="text-lg font-black font-mono mt-0.5">
                        {wrapped.visitedCount}/{wrapped.totalStops}
                      </div>
                      <div className="text-[10px] text-slate-300">ครบ {wrapped.completionPct}%</div>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/8 border border-white/10">
                      <div className="flex items-center gap-1 text-[10px] text-sky-300 font-bold">
                        <MapPin className="h-3 w-3" />
                        <span>เมืองที่ไป</span>
                      </div>
                      <div className="text-lg font-black font-mono mt-0.5">
                        {wrapped.totalCities} เมือง
                      </div>
                      <div className="text-[10px] text-slate-300 truncate">
                        {wrapped.citiesList.join(', ') || 'Japan'}
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/8 border border-white/10">
                      <div className="flex items-center gap-1 text-[10px] text-emerald-300 font-bold">
                        <Wallet className="h-3 w-3" />
                        <span>ยอดใช้จ่ายรวม</span>
                      </div>
                      <div className="text-base font-black font-mono mt-0.5 truncate">
                        ฿{wrapped.totalSpentThb.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-300">{wrapped.expensesCount} รายการ</div>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/8 border border-white/10">
                      <div className="flex items-center gap-1 text-[10px] text-rose-300 font-bold">
                        <Utensils className="h-3 w-3" />
                        <span>ร้านแนะนำในแผน</span>
                      </div>
                      <div className="text-lg font-black font-mono mt-0.5">
                        {wrapped.foodStopsCount} ร้าน
                      </div>
                      <div className="text-[10px] text-slate-300 truncate">
                        {wrapped.topCategoryLabel || 'สายกิน & เที่ยว'}
                      </div>
                    </div>
                  </div>

                  {wrapped.topSpenderName && (
                    <div className="p-3 rounded-2xl bg-gradient-to-r from-[#2563eb]/30 to-amber-500/20 border border-amber-400/30 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Trophy className="h-4 w-4 text-amber-300 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[10px] text-amber-200 font-bold block">
                            👑 สายเปย์ประจำทริป (MVP)
                          </span>
                          <span className="text-xs font-black truncate block">
                            {wrapped.topSpenderName}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-black text-amber-200 shrink-0">
                        ฿{wrapped.topSpenderThb.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Export / Share Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-sm mx-auto">
                  <button
                    type="button"
                    onClick={handleDownloadStoryPng}
                    className="min-h-[44px] py-2.5 px-4 rounded-2xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-95 transition-all"
                  >
                    <Download className="h-4 w-4" />
                    <span>บันทึกรูป Story (9:16 PNG)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyWrappedText}
                    className="min-h-[44px] py-2.5 px-4 rounded-2xl bg-white dark:bg-[#1a202c] border border-slate-300 dark:border-[#24324a] text-slate-800 dark:text-slate-200 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                  >
                    {copiedSummary ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    <span>{copiedSummary ? 'คัดลอกแล้ว!' : 'คัดลอกสรุปแชร์ LINE'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] border-t border-[#e2e8f0] dark:border-[#24324a] flex justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-5 py-2 rounded-xl border border-[#e2e8f0] dark:border-[#24324a] text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1a202c] cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
