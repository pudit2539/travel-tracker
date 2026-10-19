// src/components/LiveTripCard.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Navigation, MapPin, Clock, CheckCircle2, 
  Stamp, Eye, ChevronRight
} from 'lucide-react';
import { triggerConfetti } from '@/lib/confetti';
import {
  getTripVisitedStamps,
  toggleActivityVisited,
  subscribeVisitedStamps,
} from '@/lib/visitedStamps';
import { ShowToStaffModal } from '@/components/trip-detail/ShowToStaffModal';

interface LiveTripCardProps {
  trip: any;
  itinerary: any[];
  availableDays: string[];
  selectedDay: string;
  fxRate?: number;
  onOpenActivityDetail?: (item: any) => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function LiveTripCard({
  trip,
  itinerary = [],
  availableDays = [],
  selectedDay,
  onShowToast,
}: LiveTripCardProps) {
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const [visitedMap, setVisitedMap] = useState<Record<string, boolean>>({});
  const [showStampAnimation, setShowStampAnimation] = useState<string | null>(null);
  const [showStaffModal, setShowStaffModal] = useState(false);

  const tripId = trip?.id;

  const refreshStamps = useCallback(() => {
    const ids = itinerary.map((i) => i.id || i.main_place || i.title).filter(Boolean);
    setVisitedMap(getTripVisitedStamps(tripId, ids));
  }, [tripId, itinerary]);

  useEffect(() => {
    setMounted(true);
    refreshStamps();
    const unsub = subscribeVisitedStamps(refreshStamps);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      unsub();
      clearInterval(timer);
    };
  }, [refreshStamps]);

  // Destination timezone formatted time (default Asia/Tokyo)
  const destinationTimeString = useMemo(() => {
    if (!mounted) return '--:--';
    try {
      return currentTime.toLocaleTimeString('th-TH', {
        timeZone: 'Asia/Tokyo',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch {
      return currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    }
  }, [currentTime, mounted]);

  // Resolve target day label
  const activeDayLabel = useMemo(() => {
    if (selectedDay && selectedDay !== 'all') return selectedDay;
    return availableDays[0] || itinerary[0]?.date_label || itinerary[0]?.day || 'Day 1';
  }, [selectedDay, availableDays, itinerary]);

  // Activities for the selected day (or all if none match)
  const activeDayActivities = useMemo(() => {
    if (!itinerary.length) return [];
    if (selectedDay === 'all') {
      const firstDayMatches = itinerary.filter(
        (item) => (item.date_label || item.day || '').trim() === activeDayLabel.trim()
      );
      return firstDayMatches.length > 0 ? firstDayMatches : itinerary;
    }
    return itinerary.filter(
      (item) => (item.date_label || item.day || '').trim() === selectedDay.trim()
    );
  }, [itinerary, selectedDay, activeDayLabel]);

  const getActivityKey = (item: any) => item?.id || item?.main_place || item?.title || '';
  const getActivityTitle = (item: any) => item?.main_place || item?.title || 'จุดหมายในแผนเที่ยว';
  const getActivityTime = (item: any) => item?.time_slot || item?.time || '';
  const getActivityCity = (item: any) => item?.city || item?.location || '';

  // Count visited in active day
  const visitedCount = useMemo(() => {
    return activeDayActivities.filter((item) => visitedMap[getActivityKey(item)]).length;
  }, [activeDayActivities, visitedMap]);

  // Pick the first activity that is not visited yet, or the last one if all visited
  const nextUpActivity = useMemo(() => {
    if (!activeDayActivities.length) return null;
    const pending = activeDayActivities.find((item) => !visitedMap[getActivityKey(item)]);
    return pending || activeDayActivities[activeDayActivities.length - 1];
  }, [activeDayActivities, visitedMap]);

  const isCheckedIn = nextUpActivity ? Boolean(visitedMap[getActivityKey(nextUpActivity)]) : false;

  const handleCheckIn = (activity: any) => {
    const key = getActivityKey(activity);
    if (!key) return;
    const title = getActivityTitle(activity);
    const nextState = toggleActivityVisited(tripId, key);

    if (nextState) {
      setShowStampAnimation(key);
      triggerConfetti();
      setTimeout(() => setShowStampAnimation(null), 2200);
      onShowToast?.(`🎉 ประทับตราเช็คอิน "${title}" เรียบร้อย!`, 'success');
    } else {
      onShowToast?.(`ยกเลิกตราประทับ "${title}"`, 'info');
    }
    refreshStamps();
  };

  const handleOpenGoogleMaps = (activity: any) => {
    const title = getActivityTitle(activity);
    const city = getActivityCity(activity);
    const url =
      activity.main_place_links?.[0] ||
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        title + (city ? ' ' + city : ' Japan')
      )}`;
    window.open(url, '_blank');
  };

  if (!nextUpActivity && itinerary.length === 0) return null;

  const progressPct =
    activeDayActivities.length > 0
      ? Math.round((visitedCount / activeDayActivities.length) * 100)
      : 0;

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-slate-900 via-[#151b2b] to-[#0f1422] text-white border border-blue-500/30 shadow-xl space-y-3.5 group">
        {/* Decorative Background Glows */}
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header: Live Local Time & Stamp Progress */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-blue-300">
              🇯🇵 LIVE ON-TRIP • โตเกียว {destinationTimeString}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {activeDayActivities.length > 0 && (
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                ⛩️ เช็คอินแล้ว {visitedCount}/{activeDayActivities.length} จุด ({progressPct}%)
              </span>
            )}
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/10 text-white/90 backdrop-blur-md border border-white/10 max-w-[140px] truncate">
              {activeDayLabel}
            </span>
          </div>
        </div>

        {/* Mini Progress Bar */}
        {activeDayActivities.length > 0 && (
          <div className="relative z-10 w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-400 transition-all duration-500"
              style={{ width: `${Math.max(progressPct, 4)}%` }}
            />
          </div>
        )}

        {/* Next Destination Spotlight Card */}
        {nextUpActivity ? (
          <div className="relative z-10 p-3.5 sm:p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md shadow-xs ${
                      isCheckedIn
                        ? 'bg-emerald-500 text-white'
                        : 'bg-[#e79b71] text-white'
                    }`}
                  >
                    {isCheckedIn ? 'ครบทุกจุดในวันนี้แล้ว ✓' : 'NEXT UP • จุดหมายถัดไป'}
                  </span>
                  {getActivityTime(nextUpActivity) && (
                    <span className="text-[11px] font-mono font-bold text-amber-300 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{getActivityTime(nextUpActivity)}</span>
                    </span>
                  )}
                </div>

                <h3 className="text-base sm:text-lg font-black text-white leading-snug break-words">
                  {getActivityTitle(nextUpActivity)}
                </h3>

                {getActivityCity(nextUpActivity) && (
                  <p className="text-xs text-slate-300 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-[#e79b71] shrink-0" />
                    <span className="truncate">{getActivityCity(nextUpActivity)}</span>
                  </p>
                )}
              </div>

              {/* Japanese Eki Stamp Badge */}
              {isCheckedIn && (
                <div className="relative shrink-0 flex items-center justify-center">
                  <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-full border-2 border-dashed border-rose-500/90 bg-rose-500/15 flex flex-col items-center justify-center text-rose-400 rotate-[-12deg] shadow-lg shadow-rose-900/30 animate-in zoom-in-75">
                    <span className="text-[7px] font-black tracking-widest uppercase">STAMP</span>
                    <span className="text-sm font-black">済</span>
                    <span className="text-[7px] font-mono opacity-80">VISITED</span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons: 1-Tap Google Maps + Show to Staff + Check-in Stamp */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleOpenGoogleMaps(nextUpActivity)}
                className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30 transition-all cursor-pointer active:scale-95"
              >
                <Navigation className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">นำทาง Maps</span>
              </button>

              <button
                type="button"
                onClick={() => setShowStaffModal(true)}
                className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-xs flex items-center justify-center gap-1.5 border border-white/15 transition-all cursor-pointer active:scale-95"
                title="แสดงชื่อสถานที่ตัวใหญ่ให้คนขับแท็กซี่หรือนายสถานีดู"
              >
                <Eye className="h-3.5 w-3.5 text-amber-300 shrink-0" />
                <span className="truncate">โชว์ถามทาง 🚕</span>
              </button>

              <button
                type="button"
                onClick={() => handleCheckIn(nextUpActivity)}
                className={`col-span-2 sm:col-span-1 py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer active:scale-95 ${
                  isCheckedIn
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-gradient-to-r from-[#e79b71] to-amber-600 hover:from-[#d98254] hover:to-amber-500 text-white border-[#e79b71]/60 shadow-md shadow-orange-950/30'
                }`}
              >
                <Stamp className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {isCheckedIn ? 'เช็คอินแล้ว (แตะยกเลิก)' : 'ประทับตราเช็คอิน ⛩️'}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="relative z-10 p-4 text-center rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300">
            <span>วันนี้ยังไม่มีกิจกรรมในแพลน แตะปุ่ม &ldquo;+ เพิ่มกิจกรรม&rdquo; เพื่อเริ่มวางแผนได้เลยครับ</span>
          </div>
        )}

        {/* Stamp Celebration Fullscreen Pop */}
        {showStampAnimation && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-xs rounded-3xl animate-in zoom-in-50 duration-300 pointer-events-none">
            <div className="w-24 h-24 rounded-full border-4 border-dashed border-rose-500 bg-rose-600/20 flex flex-col items-center justify-center text-rose-400 rotate-[-15deg] shadow-2xl scale-125">
              <span className="text-[10px] font-black tracking-widest uppercase">EKI STAMP</span>
              <span className="text-3xl font-black">来訪</span>
              <span className="text-[9px] font-bold font-mono">VISITED 2026</span>
            </div>
          </div>
        )}
      </div>

      {nextUpActivity && (
        <ShowToStaffModal
          isOpen={showStaffModal}
          onClose={() => setShowStaffModal(false)}
          placeName={getActivityTitle(nextUpActivity)}
          city={getActivityCity(nextUpActivity)}
          timeSlot={getActivityTime(nextUpActivity)}
          transportInfo={nextUpActivity.transport_info}
          mapsUrl={nextUpActivity.main_place_links?.[0]}
        />
      )}
    </>
  );
}
