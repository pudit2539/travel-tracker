// src/components/LiveTripCard.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Navigation,
  MapPin,
  Clock,
  Stamp,
  Eye,
  LocateFixed,
  Footprints,
  Volume2,
  Shield,
  Sparkles,
  ShoppingBag,
  Pause,
} from 'lucide-react';
import { triggerConfetti } from '@/lib/confetti';
import {
  getTripVisitedStamps,
  toggleActivityVisited,
  subscribeVisitedStamps,
} from '@/lib/visitedStamps';
import {
  getShoppingBag,
  getShoppingBagSummary,
  subscribeShoppingBag,
} from '@/lib/shoppingBag';
import { syncTripMetadataToSupabase } from '@/lib/tripMetadata';
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

type CompanionStyle = 'feminine' | 'masculine';
type PresencePrivacyLevel = 'off' | 'progress' | 'district' | 'exact';

interface Coord {
  lat: number;
  lng: number;
}

// Fallback landmark coordinates for Kansai stops when lat/lng are not explicitly set on the row
function resolveStopCoordinate(item: any): Coord {
  if (typeof item?.lat === 'number' && typeof item?.lng === 'number') {
    return { lat: item.lat, lng: item.lng };
  }
  const text = `${item?.main_place || ''} ${item?.city || ''}`.toLowerCase();
  if (/kix|kansai airport|คันไซ/.test(text)) return { lat: 34.432, lng: 135.2304 };
  if (/rinku|ริงกุ/.test(text)) return { lat: 34.4069, lng: 135.2934 };
  if (/uji|อุจิ|byodoin|เบียวโดอิน/.test(text)) return { lat: 34.8893, lng: 135.8077 };
  if (/fushimi|ฟุชิมิ/.test(text)) return { lat: 34.9671, lng: 135.7727 };
  if (/kiyomizu|คิโยมิสึ|วัดน้ำใส/.test(text)) return { lat: 34.9949, lng: 135.785 };
  if (/gion|กิออน|yasaka|ยาสะกะ/.test(text)) return { lat: 35.0037, lng: 135.7785 };
  if (/arashiyama|อาราชิยามะ/.test(text)) return { lat: 35.0094, lng: 135.667 };
  if (/kyoto|เกียวโต/.test(text)) return { lat: 34.9858, lng: 135.7588 };
  if (/nara|นารา|todai|โทไดจิ/.test(text)) return { lat: 34.6851, lng: 135.8398 };
  if (/kobe|โกเบ|nunobiki|นุโนะบิกิ/.test(text)) return { lat: 34.6901, lng: 135.1955 };
  if (/kaiyukan|ไคยูคัง|osakako/.test(text)) return { lat: 34.6545, lng: 135.429 };
  if (/osaka castle|ปราสาทโอซาก้า/.test(text)) return { lat: 34.6873, lng: 135.5262 };
  if (/umeda|อุเมดะ/.test(text)) return { lat: 34.7025, lng: 135.4959 };
  if (/tennoji|เท็นโนจิ|shinsekai|ชินเซไก|tsutenkaku/.test(text)) return { lat: 34.6525, lng: 135.5063 };
  if (/den den|เด็นเด็น|nipponbashi|kuromon|คุโรมง/.test(text)) return { lat: 34.6628, lng: 135.506 };
  // Default Dotonbori / Namba Osaka
  return { lat: 34.6687, lng: 135.5013 };
}

function haversineMeters(a: Coord, b: Coord): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Projects user GPS position onto segment A -> B using 2D planar approximation (TabiPlan algorithm)
 */
function projectPointOntoSegment(
  user: Coord,
  start: Coord,
  end: Coord
): { pct: number; distToEndMeters: number; deviationMeters: number } {
  const distToEndMeters = Math.round(haversineMeters(user, end));
  const totalSegMeters = haversineMeters(start, end);
  if (totalSegMeters < 15) {
    return { pct: distToEndMeters < 80 ? 100 : 0, distToEndMeters, deviationMeters: 0 };
  }

  const cosLat = Math.cos(((start.lat + end.lat) * 0.5 * Math.PI) / 180);
  const ax = 0;
  const ay = 0;
  const bx = (end.lng - start.lng) * cosLat * 111320;
  const by = (end.lat - start.lat) * 110540;
  const px = (user.lng - start.lng) * cosLat * 111320;
  const py = (user.lat - start.lat) * 110540;

  const abx = bx - ax;
  const aby = by - ay;
  const abLenSq = abx * abx + aby * aby;
  const rawT = abLenSq > 0 ? (px * abx + py * aby) / abLenSq : 0;
  const clampedT = Math.max(0, Math.min(1, rawT));

  const projX = ax + clampedT * abx;
  const projY = ay + clampedT * aby;
  const devX = px - projX;
  const devY = py - projY;
  const deviationMeters = Math.round(Math.sqrt(devX * devX + devY * devY));

  return {
    pct: Math.round(clampedT * 100),
    distToEndMeters,
    deviationMeters,
  };
}

function detectCityTheme(cityOrPlace: string): {
  cityKey: 'kyoto' | 'osaka' | 'nara' | 'kobe';
  badgeText: string;
  accessoryLabel: string;
  cheerTh: string;
  cheerJa: string;
} {
  const text = (cityOrPlace || '').toLowerCase();
  if (/nara|นารา|todai/.test(text)) {
    return {
      cityKey: 'nara',
      badgeText: '🦌 โหมดเมืองนารา',
      accessoryLabel: 'ที่คาดผมกวางน้อย & เซมเบ้',
      cheerTh: 'ระวังกวางน้อยมาขอขนมเซมเบ้นะ! โค้งทักทายน้องกวางกัน~',
      cheerJa: '鹿さんにせんべいをあげよう！おじぎしてくれるよ！',
    };
  }
  if (/kyoto|เกียวโต|uji|อุจิ|fushimi|ฟุชิมิ|kiyomizu|คิโยมิสึ|gion|arashiyama/.test(text)) {
    return {
      cityKey: 'kyoto',
      badgeText: '🍁 โหมดเมืองเกียวโต & อุจิ',
      accessoryLabel: 'ปิ่นใบเมเปิ้ลโมมิจิ & ผ้าพันคอมัทฉะ',
      cheerTh: 'บรรยากาศเมืองเก่าสวยมาก แวะจิบมัทฉะอุ่นๆ เติมพลังกันนะ!',
      cheerJa: '京都の街並みはとても綺麗だね！抹茶でほっと一息つこう！',
    };
  }
  if (/kobe|โกเบ|nunobiki/.test(text)) {
    return {
      cityKey: 'kobe',
      badgeText: '⚓ โหมดเมืองท่าโกเบ',
      accessoryLabel: 'หมวกเบเร่ต์กะลาสีโกเบ',
      cheerTh: 'ลมทะเลโกเบเย็นสบาย วิวภูเขาสวยสุดๆ เลย!',
      cheerJa: '神戸の港風が気持ちいいね！景色を楽しもう！',
    };
  }
  return {
    cityKey: 'osaka',
    badgeText: '🎀 โหมดโอซาก้า Куいだおれ',
    accessoryLabel: 'โบว์ทาโกะยากิทอง & ฮู้ดนักชิม',
    cheerTh: 'โอซาก้าเมืองของอร่อย! เตรียมท้องไว้ลุยทาโกะยากิและช้อปปิ้งกัน!',
    cheerJa: '大阪くいだおれの旅！たこ焼きもお買い物も全力で楽しもう！',
  };
}

function LiveTripCard({
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

  // TabiPlan Companion & GPS State
  const [companionStyle, setCompanionStyle] = useState<CompanionStyle>('feminine');
  const [privacyLevel, setPrivacyLevel] = useState<PresencePrivacyLevel>('progress');
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsMetrics, setGpsMetrics] = useState<{
    pct: number;
    distToEndMeters: number;
    deviationMeters: number;
  } | null>(null);
  const [simulatingWalk, setSimulatingWalk] = useState(false);
  const [simProgressPct, setSimProgressPct] = useState(0);
  const [shoppingProps, setShoppingProps] = useState<
    Array<{ category: string; label: string; emoji: string; propLabel: string }>
  >([]);

  const watchIdRef = useRef<number | null>(null);
  const tripId = trip?.id;

  const refreshStamps = useCallback(() => {
    const ids = itinerary.map((i) => i.id || i.main_place || i.title).filter(Boolean);
    setVisitedMap(getTripVisitedStamps(tripId, ids));
  }, [tripId, itinerary]);

  const refreshShoppingProps = useCallback(() => {
    if (!tripId) return;
    const summary = getShoppingBagSummary(getShoppingBag(tripId));
    setShoppingProps(summary.characterProps);
  }, [tripId]);

  useEffect(() => {
    setMounted(true);
    refreshStamps();
    refreshShoppingProps();
    try {
      const savedStyle = localStorage.getItem(`companion_style_${tripId}`) as CompanionStyle;
      if (savedStyle === 'feminine' || savedStyle === 'masculine') {
        setCompanionStyle(savedStyle);
      }
      const savedPrivacy = localStorage.getItem(
        `presence_privacy_${tripId}`
      ) as PresencePrivacyLevel;
      if (savedPrivacy) setPrivacyLevel(savedPrivacy);
    } catch {
      // ignore
    }
    const unsubStamps = subscribeVisitedStamps(refreshStamps);
    const unsubShop = subscribeShoppingBag(refreshShoppingProps);
    // Update clock every 30 seconds instead of every 1s to avoid 60x/min full SVG re-renders
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => {
      unsubStamps();
      unsubShop();
      clearInterval(timer);
    };
  }, [refreshStamps, refreshShoppingProps, tripId]);

  // Destination timezone formatted time (default Asia/Tokyo)
  const destinationTimeString = useMemo(() => {
    if (!mounted) return '--:--';
    try {
      return currentTime.toLocaleTimeString('th-TH', {
        timeZone: 'Asia/Tokyo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    }
  }, [currentTime, mounted]);

  const activeDayLabel = useMemo(() => {
    if (selectedDay && selectedDay !== 'all') return selectedDay;
    return availableDays[0] || itinerary[0]?.date_label || itinerary[0]?.day || 'Day 1';
  }, [selectedDay, availableDays, itinerary]);

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

  const visitedCount = useMemo(() => {
    return activeDayActivities.filter((item) => visitedMap[getActivityKey(item)]).length;
  }, [activeDayActivities, visitedMap]);

  const nextUpIndex = useMemo(() => {
    if (!activeDayActivities.length) return -1;
    const idx = activeDayActivities.findIndex((item) => !visitedMap[getActivityKey(item)]);
    return idx >= 0 ? idx : activeDayActivities.length - 1;
  }, [activeDayActivities, visitedMap]);

  const nextUpActivity = nextUpIndex >= 0 ? activeDayActivities[nextUpIndex] : null;
  const prevActivity =
    nextUpIndex > 0 ? activeDayActivities[nextUpIndex - 1] : activeDayActivities[0] || null;

  const isCheckedIn = nextUpActivity ? Boolean(visitedMap[getActivityKey(nextUpActivity)]) : false;

  const cityTheme = useMemo(
    () =>
      detectCityTheme(
        `${getActivityCity(nextUpActivity)} ${getActivityTitle(nextUpActivity)}`
      ),
    [nextUpActivity]
  );

  const handleCheckIn = useCallback(
    (activity: any, autoReason?: string) => {
      const key = getActivityKey(activity);
      if (!key) return;
      const title = getActivityTitle(activity);
      const nextState = toggleActivityVisited(tripId, key);

      if (nextState) {
        setShowStampAnimation(key);
        triggerConfetti();
        setTimeout(() => setShowStampAnimation(null), 2200);
        onShowToast?.(
          autoReason
            ? `📍 ${autoReason}: เช็กอิน "${title}" อัตโนมัติ!`
            : `🎉 ประทับตราเช็คอิน "${title}" เรียบร้อย!`,
          'success'
        );
      } else {
        onShowToast?.(`ยกเลิกตราประทับ "${title}"`, 'info');
      }
      refreshStamps();
    },
    [tripId, onShowToast, refreshStamps]
  );

  // Real-time Geolocation Vector Projection Watcher
  useEffect(() => {
    if (!gpsActive || !nextUpActivity || typeof window === 'undefined' || !navigator.geolocation) {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    const startCoord = resolveStopCoordinate(prevActivity || nextUpActivity);
    const endCoord = resolveStopCoordinate(nextUpActivity);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const userCoord = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const proj = projectPointOntoSegment(userCoord, startCoord, endCoord);
        setGpsMetrics(proj);

        // Auto Check-in within 80 meters if not checked in yet
        if (proj.distToEndMeters <= 80 && !visitedMap[getActivityKey(nextUpActivity)]) {
          handleCheckIn(nextUpActivity, 'เข้าใกล้รัศมี 80 ม.');
        }

        // Sync privacy-graded presence
        if (tripId && privacyLevel !== 'off') {
          syncTripMetadataToSupabase(tripId, {
            livePresence: {
              privacyLevel,
              progressPct: proj.pct,
              district:
                privacyLevel === 'district' || privacyLevel === 'exact'
                  ? getActivityCity(nextUpActivity)
                  : undefined,
              coords: privacyLevel === 'exact' ? userCoord : undefined,
              updatedAt: new Date().toISOString(),
            },
          });
        }
      },
      () => {
        onShowToast?.('ไม่สามารถดึงพิกัด GPS ได้ กรุณาเปิดสิทธิ์ Location หรือใช้โหมดจำลองเดิน', 'info');
        setGpsActive(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [gpsActive, nextUpActivity, prevActivity, visitedMap, handleCheckIn, tripId, privacyLevel, onShowToast]);

  // Simulate Walk Animation Loop (TabiPlan Simulate Mode)
  useEffect(() => {
    if (!simulatingWalk) return;
    const interval = setInterval(() => {
      setSimProgressPct((prev) => {
        if (prev >= 100) {
          setSimulatingWalk(false);
          return 100;
        }
        return prev + 5;
      });
    }, 350);
    return () => clearInterval(interval);
  }, [simulatingWalk]);

  const handleToggleCompanionStyle = () => {
    const next: CompanionStyle = companionStyle === 'feminine' ? 'masculine' : 'feminine';
    setCompanionStyle(next);
    try {
      localStorage.setItem(`companion_style_${tripId}`, next);
    } catch {
      // ignore
    }
  };

  const handleChangePrivacy = (level: PresencePrivacyLevel) => {
    setPrivacyLevel(level);
    try {
      localStorage.setItem(`presence_privacy_${tripId}`, level);
    } catch {
      // ignore
    }
    if (tripId) {
      syncTripMetadataToSupabase(tripId, {
        livePresence: {
          privacyLevel: level,
          updatedAt: new Date().toISOString(),
        },
      });
    }
  };

  const handleSpeakCheer = (lang: 'th-TH' | 'ja-JP') => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onShowToast?.(lang === 'ja-JP' ? cityTheme.cheerJa : cityTheme.cheerTh, 'info');
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(
        lang === 'ja-JP' ? cityTheme.cheerJa : cityTheme.cheerTh
      );
      utter.lang = lang;
      utter.rate = 1.0;
      window.speechSynthesis.speak(utter);
    } catch {
      // ignore
    }
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

  const effectiveWalkPct = simulatingWalk
    ? simProgressPct
    : gpsActive && gpsMetrics
    ? gpsMetrics.pct
    : progressPct;

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-slate-900 via-[#181a20] to-[#121316] text-white border border-blue-500/30 shadow-xl space-y-3.5 group">
        {/* Decorative Background Glows */}
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header: Live Local Time & Stamp Progress */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-blue-300">
              🇯🇵 LIVE COMPANION • เวลาญี่ปุ่น {destinationTimeString}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/30">
              {cityTheme.badgeText}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
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

        {/* Mini Progress Bar (Reacts to Simulate Walk or GPS Vector Projection) */}
        {activeDayActivities.length > 0 && (
          <div className="relative z-10 space-y-1">
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden relative">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-400 transition-all duration-300"
                style={{ width: `${Math.max(effectiveWalkPct, 5)}%` }}
              />
            </div>
            {(simulatingWalk || (gpsActive && gpsMetrics)) && (
              <div className="flex items-center justify-between text-[10px] text-emerald-300 font-bold">
                <span>
                  {simulatingWalk
                    ? `🚶 กำลังจำลองเดินไป "${getActivityTitle(nextUpActivity)}" (${simProgressPct}%)`
                    : `📍 พิกัดจริง: คืบหน้า ${gpsMetrics?.pct}% (ห่างจุดหมาย ${gpsMetrics?.distToEndMeters} ม.)`}
                </span>
                {gpsActive && gpsMetrics && gpsMetrics.deviationMeters > 120 && (
                  <span className="text-rose-300 font-black animate-pulse">
                    ⚠️ ออกนอกเส้นทาง {gpsMetrics.deviationMeters} ม.
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* TabiPlan Interactive Chibi Companion + Speech Bubble Banner */}
        <div className="relative z-10 p-3 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-slate-900/80 to-blue-950/70 border border-indigo-400/25 flex flex-col sm:flex-row items-center gap-3">
          {/* Layered City-Reactive Chibi Avatar SVG */}
          <div className="relative shrink-0 flex flex-col items-center">
            <div
              onClick={handleToggleCompanionStyle}
              className="w-20 h-20 rounded-2xl bg-gradient-to-b from-blue-500/20 to-indigo-500/20 border border-white/15 flex items-center justify-center relative cursor-pointer hover:scale-105 transition-transform"
              title="แตะเพื่อสลับตัวละคร (สาวคาวาอี้ ⟷ หนุ่มนักสำรวจ)"
            >
              <svg viewBox="0 0 100 100" className="w-18 h-18 drop-shadow-md">
                {/* Base Aura */}
                <circle cx="50" cy="52" r="38" fill="rgba(99,102,241,0.18)" />
                {/* Hair Back */}
                {companionStyle === 'feminine' ? (
                  <path
                    d="M24 44 C20 65, 24 82, 32 86 L68 86 C76 82, 80 65, 76 44 Z"
                    fill="#2d1f3d"
                  />
                ) : (
                  <path d="M27 42 C25 55, 29 66, 34 68 L66 68 C71 66, 75 55, 73 42 Z" fill="#1e293b" />
                )}
                {/* Body / Winter Coat */}
                <path
                  d="M30 68 C32 58, 68 58, 70 68 L75 92 L25 92 Z"
                  fill={
                    cityTheme.cityKey === 'kyoto'
                      ? '#065f46'
                      : cityTheme.cityKey === 'osaka'
                      ? '#be123c'
                      : cityTheme.cityKey === 'nara'
                      ? '#92400e'
                      : '#1d4ed8'
                  }
                />
                {/* Winter Scarf */}
                <rect x="34" y="61" width="32" height="9" rx="4.5" fill="#f59e0b" />
                <rect x="54" y="65" width="7" height="16" rx="3" fill="#d97706" />
                {/* Face */}
                <circle cx="50" cy="44" r="19" fill="#ffe4d6" />
                {/* Blush */}
                <ellipse cx="38" cy="48" rx="3.5" ry="2" fill="#fda4af" opacity="0.7" />
                <ellipse cx="62" cy="48" rx="3.5" ry="2" fill="#fda4af" opacity="0.7" />
                {/* Eyes */}
                <circle cx="42" cy="44" r="2.8" fill="#1e1b4b" />
                <circle cx="58" cy="44" r="2.8" fill="#1e1b4b" />
                <circle cx="43" cy="43" r="1" fill="#ffffff" />
                <circle cx="59" cy="43" r="1" fill="#ffffff" />
                {/* Happy Smile */}
                <path
                  d="M45 50 Q50 55 55 50"
                  stroke="#be123c"
                  strokeWidth="2.2"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* Front Hair Bangs */}
                <path
                  d="M30 38 C34 24, 66 24, 70 38 C63 31, 55 34, 50 30 C44 34, 36 31, 30 38 Z"
                  fill={companionStyle === 'feminine' ? '#2d1f3d' : '#1e293b'}
                />
                {/* City-Specific Head Accessory */}
                {cityTheme.cityKey === 'nara' && (
                  <>
                    {/* Deer Antlers */}
                    <path
                      d="M35 25 L30 14 M32 19 L26 18 M65 25 L70 14 M68 19 L74 18"
                      stroke="#b45309"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                    />
                  </>
                )}
                {cityTheme.cityKey === 'kyoto' && (
                  /* Maple Leaf Hairpin */
                  <circle cx="67" cy="29" r="6" fill="#ef4444" stroke="#fef08a" strokeWidth="1.5" />
                )}
                {cityTheme.cityKey === 'osaka' && (
                  /* Golden Ribbon */
                  <path d="M42 21 L50 26 L58 21 L56 29 L44 29 Z" fill="#facc15" />
                )}
                {cityTheme.cityKey === 'kobe' && (
                  /* Sailor Beret */
                  <ellipse cx="50" cy="23" rx="18" ry="6" fill="#f8fafc" stroke="#1d4ed8" strokeWidth="2" />
                )}
                {/* Shopping Bag Visual Prop if items bought */}
                {shoppingProps.length > 0 && (
                  <g transform="translate(68, 66)">
                    <rect x="0" y="4" width="16" height="18" rx="3" fill="#ec4899" stroke="#fbcfe8" strokeWidth="1.2" />
                    <path d="M4 4 Q8 -2 12 4" stroke="#fbcfe8" strokeWidth="1.5" fill="none" />
                  </g>
                )}
              </svg>
              <span className="absolute -bottom-1.5 px-1.5 py-0.2 rounded-full bg-indigo-600 text-[9px] font-black text-white border border-white/25 shadow-xs">
                {companionStyle === 'feminine' ? '👧 สาวคาวาอี้' : '👦 หนุ่มนักสำรวจ'}
              </span>
            </div>
          </div>

          {/* Companion Speech & Controls */}
          <div className="flex-1 min-w-0 space-y-2 text-left">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <span className="text-[11px] font-black text-indigo-300 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-300" />
                <span>เครื่องแต่งกายประจำเมือง: {cityTheme.accessoryLabel}</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSpeakCheer('th-TH')}
                  className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white inline-flex items-center gap-1 cursor-pointer"
                  title="ฟังเสียงพูดภาษาไทย"
                >
                  <Volume2 className="h-2.5 w-2.5 text-amber-300" />
                  <span>เสียงไทย</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSpeakCheer('ja-JP')}
                  className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-bold text-rose-200 inline-flex items-center gap-1 cursor-pointer"
                  title="ฟังเสียงพากย์ภาษาญี่ปุ่น"
                >
                  <Volume2 className="h-2.5 w-2.5 text-rose-300" />
                  <span>日本語</span>
                </button>
              </div>
            </div>

            <p className="text-xs font-bold text-white/95 leading-relaxed">
              &ldquo;{cityTheme.cheerTh}&rdquo;
              <span className="block text-[10px] font-normal text-indigo-200/80 mt-0.5">
                {cityTheme.cheerJa}
              </span>
            </p>

            {/* Bought Shopping Props Carried by Companion */}
            {shoppingProps.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] font-bold text-fuchsia-300 flex items-center gap-1">
                  <ShoppingBag className="h-3 w-3" />
                  <span>ถือของที่ช้อปแล้ว:</span>
                </span>
                {shoppingProps.map((prop) => (
                  <span
                    key={prop.category}
                    className="px-2 py-0.5 rounded-full bg-fuchsia-500/20 border border-fuchsia-400/30 text-[10px] font-bold text-fuchsia-200"
                  >
                    {prop.emoji} {prop.propLabel}
                  </span>
                ))}
              </div>
            )}

            {/* Live GPS Tracking + Simulate Walk + Privacy Level Bar */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setSimulatingWalk(false);
                  setGpsActive((v) => !v);
                }}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-black inline-flex items-center gap-1 border cursor-pointer transition-all ${
                  gpsActive
                    ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm'
                    : 'bg-white/10 hover:bg-white/15 text-slate-200 border-white/15'
                }`}
              >
                <LocateFixed className="h-3 w-3" />
                <span>{gpsActive ? 'กำลังจับพิกัดจริง (Auto Check-in 80m)' : 'จับพิกัด GPS จริง'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setGpsActive(false);
                  if (simulatingWalk) {
                    setSimulatingWalk(false);
                  } else {
                    setSimProgressPct(0);
                    setSimulatingWalk(true);
                  }
                }}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-black inline-flex items-center gap-1 border cursor-pointer transition-all ${
                  simulatingWalk
                    ? 'bg-amber-500 text-white border-amber-400'
                    : 'bg-white/10 hover:bg-white/15 text-slate-200 border-white/15'
                }`}
              >
                {simulatingWalk ? <Pause className="h-3 w-3" /> : <Footprints className="h-3 w-3" />}
                <span>{simulatingWalk ? `หยุดจำลอง (${simProgressPct}%)` : 'จำลองเดินเที่ยว'}</span>
              </button>

              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xl bg-black/30 border border-white/10 text-[10px] text-slate-300">
                <Shield className="h-3 w-3 text-sky-400 shrink-0" />
                <span>แชร์พิกัด:</span>
                <select
                  value={privacyLevel}
                  onChange={(e) => handleChangePrivacy(e.target.value as PresencePrivacyLevel)}
                  className="bg-transparent text-sky-300 font-bold outline-none cursor-pointer"
                >
                  <option value="off" className="bg-slate-900 text-white">
                    ปิดแชร์
                  </option>
                  <option value="progress" className="bg-slate-900 text-white">
                    เฉพาะ % เส้นทาง
                  </option>
                  <option value="district" className="bg-slate-900 text-white">
                    เฉพาะชื่อย่าน
                  </option>
                  <option value="exact" className="bg-slate-900 text-white">
                    พิกัดจริงในกลุ่ม
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Next Destination Spotlight Card */}
        {nextUpActivity ? (
          <div className="relative z-10 p-3.5 sm:p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md shadow-xs ${
                      isCheckedIn ? 'bg-emerald-500 text-white' : 'bg-[#e79b71] text-white'
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

      {nextUpActivity && showStaffModal && (
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

export default React.memo(LiveTripCard);
