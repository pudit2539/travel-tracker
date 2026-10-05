// src/components/LiveTripCard.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Navigation, MapPin, Clock, Sparkles, CheckCircle2, 
  ExternalLink, Compass, ChevronRight, Stamp, AlertCircle 
} from 'lucide-react';
import { triggerConfetti } from '@/lib/confetti';

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
  fxRate = 0.235,
  onOpenActivityDetail,
  onShowToast,
}: LiveTripCardProps) {
  // Live Clock (Destination Time - default Japan UTC+9)
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(() => new Set());
  const [showStampAnimation, setShowStampAnimation] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load check-in stamps from LocalStorage
  useEffect(() => {
    if (trip?.id && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`trip_checkins_${trip.id}`);
        if (raw) {
          setCheckedInIds(new Set(JSON.parse(raw)));
        }
      } catch {}
    }
  }, [trip?.id]);

  // Destination timezone formatted time (default Asia/Tokyo)
  const destinationTimeString = useMemo(() => {
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
  }, [currentTime]);

  // Find Current & Next Activity
  const activeDayActivities = useMemo(() => {
    const targetDay = selectedDay === 'all' ? (availableDays[0] || 'Day 1') : selectedDay;
    return itinerary.filter((item) => (item.day || 'Day 1') === targetDay);
  }, [itinerary, selectedDay, availableDays]);

  // Pick the first activity that is not checked-in, or first activity
  const nextUpActivity = useMemo(() => {
    if (!activeDayActivities.length) return null;
    const pending = activeDayActivities.find((item) => !checkedInIds.has(item.id || item.title));
    return pending || activeDayActivities[0];
  }, [activeDayActivities, checkedInIds]);

  const isCheckedIn = nextUpActivity ? checkedInIds.has(nextUpActivity.id || nextUpActivity.title) : false;

  const handleCheckIn = (activity: any) => {
    const key = activity.id || activity.title;
    const newSet = new Set(checkedInIds);
    if (newSet.has(key)) {
      newSet.delete(key);
      if (onShowToast) onShowToast(`ยกเลิกเช็คอิน ${activity.title}`, 'info');
    } else {
      newSet.add(key);
      setShowStampAnimation(key);
      triggerConfetti();
      setTimeout(() => setShowStampAnimation(null), 2500);
      if (onShowToast) onShowToast(`🎉 เช็คอินสำเร็จ! สะสมตราประทับ ${activity.title} แล้ว`, 'success');
    }

    setCheckedInIds(newSet);
    if (trip?.id && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`trip_checkins_${trip.id}`, JSON.stringify(Array.from(newSet)));
      } catch {}
    }
  };

  const handleOpenGoogleMaps = (activity: any) => {
    const query = activity.location || activity.address || activity.title;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
    window.open(url, '_blank');
  };

  if (!nextUpActivity && itinerary.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-slate-900 via-[#181a20] to-[#121316] text-white border border-[#e79b71]/30 shadow-xl space-y-3.5 group">
      
      {/* Decorative Background Glows */}
      <div className="absolute -top-16 -right-16 w-40 h-40 bg-[#e79b71]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header: Live Local Time & Status */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e79b71] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#e79b71]" />
          </span>
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#f2a278]">
            🇯🇵 LIVE ON-TRIP • โตเกียว {destinationTimeString}
          </span>
        </div>

        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/10 text-white/90 backdrop-blur-md border border-white/10">
          {selectedDay === 'all' ? availableDays[0] || 'Day 1' : selectedDay}
        </span>
      </div>

      {/* Next Destination Spotlight Card */}
      {nextUpActivity ? (
        <div className="relative z-10 p-3.5 sm:p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-3">
          
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-[#e79b71] text-slate-900">
                  {isCheckedIn ? 'เช็คอินแล้ว ✓' : 'จุดหมายถัดไป'}
                </span>
                {nextUpActivity.time && (
                  <span className="text-[11px] font-mono font-bold text-amber-300 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{nextUpActivity.time}</span>
                  </span>
                )}
              </div>

              <h3 className="text-base sm:text-lg font-black text-white truncate leading-snug">
                {nextUpActivity.title}
              </h3>

              {nextUpActivity.location && (
                <p className="text-xs text-slate-300 truncate flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-[#e79b71] shrink-0" />
                  <span>{nextUpActivity.location}</span>
                </p>
              )}
            </div>

            {/* Japanese Eki Stamp Badge */}
            {isCheckedIn && (
              <div className="relative shrink-0 flex items-center justify-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-dashed border-rose-500/90 bg-rose-500/10 flex flex-col items-center justify-center text-rose-400 rotate-[-12deg] shadow-lg shadow-rose-900/30 animate-in zoom-in-75">
                  <span className="text-[8px] font-black tracking-widest uppercase">STAMP</span>
                  <span className="text-sm font-black">済</span>
                  <span className="text-[7px] font-mono opacity-80">VISITED</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons: 1-Tap Google Maps Navigation + Check-in Stamp */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleOpenGoogleMaps(nextUpActivity)}
              className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30 transition-all cursor-pointer active:scale-95"
            >
              <Navigation className="h-4 w-4" />
              <span>นำทาง Google Maps</span>
            </button>

            <button
              type="button"
              onClick={() => handleCheckIn(nextUpActivity)}
              className={`py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer active:scale-95 ${
                isCheckedIn
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                  : 'bg-[#e79b71] hover:bg-[#d98254] text-slate-900 border-[#e79b71] shadow-md shadow-[#e79b71]/20'
              }`}
            >
              <Stamp className="h-4 w-4" />
              <span>{isCheckedIn ? 'เช็คอินแล้ว (แตะยกเลิก)' : 'เช็คอินสะสมแสตมป์ ⛩️'}</span>
            </button>
          </div>

        </div>
      ) : (
        <div className="relative z-10 p-4 text-center rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300">
          <span>วันนี้ยังไม่มีกิจกรรมในแพลน แตะปุ่ม "+ เพิ่มกิจกรรม" เพื่อเริ่มวางแผนได้เลยครับ</span>
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
  );
}
