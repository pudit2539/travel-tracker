// src/components/trip-detail/TripHeroCover.tsx
'use client';

import { useMemo } from 'react';
import { Calendar, Clock, Compass, Check, Plane } from 'lucide-react';
import AnimatedNumber from '@/components/AnimatedNumber';

interface TripHeroCoverProps {
  trip: any;
  itineraryCount?: number;
  totalSpent?: number;
  currency?: string;
  showBudget?: boolean;
}

export function TripHeroCover({ 
  trip, 
  itineraryCount = 0, 
  totalSpent = 0, 
  currency = 'JPY',
  showBudget = true 
}: TripHeroCoverProps) {
  // Destination Cover Image detection based on trip name or country
  const coverImage = useMemo(() => {
    if (trip?.cover_image) return trip.cover_image;

    const text = `${trip?.name || ''} ${trip?.destination || ''} ${trip?.country || ''}`.toLowerCase();

    if (text.includes('osaka') || text.includes('โอซาก้า') || text.includes('คันไซ')) {
      return 'https://images.unsplash.com/photo-1590559899731-a382839e5549?auto=format&fit=crop&w=1200&q=80';
    }
    if (text.includes('kyoto') || text.includes('เกียวโต')) {
      return 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80';
    }
    if (text.includes('tokyo') || text.includes('โตเกียว') || text.includes('japan') || text.includes('ญี่ปุ่น')) {
      return 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80';
    }
    if (text.includes('korea') || text.includes('เกาหลี') || text.includes('seoul') || text.includes('โซล')) {
      return 'https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=1200&q=80';
    }
    if (text.includes('paris') || text.includes('ปารีส') || text.includes('ฝรั่งเศส')) {
      return 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80';
    }
    if (text.includes('china') || text.includes('จีน') || text.includes('shanghai') || text.includes('beijing')) {
      return 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=1200&q=80';
    }

    // Default aesthetic travel cover
    return 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80';
  }, [trip]);

  // Trip Countdown / Status Calculation (Clean, No Emojis)
  const tripCountdown = useMemo(() => {
    if (!trip?.start_date) return null;

    let countdownData: { type: 'countdown' | 'today' | 'in_progress' | 'completed'; text: string; badgeColor: string } | null = null;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const start = new Date(trip.start_date);
      start.setHours(0, 0, 0, 0);

      const diffTime = start.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        countdownData = {
          type: 'countdown',
          text: `อีก ${diffDays} วันจะออกเดินทาง`,
          badgeColor: 'bg-blue-600/90 text-white shadow-md border border-white/20',
        };
      } else if (diffDays === 0) {
        countdownData = {
          type: 'today',
          text: 'เริ่มออกเดินทางวันนี้',
          badgeColor: 'bg-emerald-600/90 text-white border border-white/20',
        };
      } else if (trip?.end_date) {
        const end = new Date(trip.end_date);
        end.setHours(0, 0, 0, 0);
        if (today <= end) {
          const currentDay = Math.abs(diffDays) + 1;
          countdownData = {
            type: 'in_progress',
            text: `กำลังเดินทาง — วันที่ ${currentDay} ของทริป`,
            badgeColor: 'bg-indigo-600/90 text-white border border-white/20',
          };
        } else {
          countdownData = {
            type: 'completed',
            text: 'สิ้นสุดการเดินทาง',
            badgeColor: 'bg-slate-700/90 text-white border border-white/10',
          };
        }
      } else {
        countdownData = {
          type: 'completed',
          text: 'สิ้นสุดการเดินทาง',
          badgeColor: 'bg-slate-700/90 text-white border border-white/10',
        };
      }
    } catch {
      return null;
    }

    if (!countdownData) return null;

    let icon = <Clock className="h-3.5 w-3.5 shrink-0" />;
    if (countdownData.type === 'today') icon = <Compass className="h-3.5 w-3.5 shrink-0" />;
    else if (countdownData.type === 'in_progress') icon = <Calendar className="h-3.5 w-3.5 shrink-0" />;
    else if (countdownData.type === 'completed') icon = <Check className="h-3.5 w-3.5 shrink-0" />;

    return {
      ...countdownData,
      icon,
    };
  }, [trip]);

  const destinationLabel = trip?.destination || trip?.country || 'จุดหมายปลายทาง';

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(15,23,42,0.06)] dark:shadow-[0_12px_36px_rgba(4,9,20,0.6)] border border-[#e2e8f0] dark:border-[#24324a] group bg-white dark:bg-[#161c27] text-[#0f172a] dark:text-[#dde2f3]">
      {/* Clean Photographic Destination Header Banner */}
      <div className="min-h-[136px] sm:min-h-[180px] md:min-h-[204px] w-full relative overflow-hidden flex flex-col justify-between p-3.5 sm:p-5 bg-[#080e19]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img
            src={coverImage}
            alt={trip?.name || 'Trip Destination Cover'}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 opacity-85"
          />
          {/* Oceanic Glacial Vignette for crisp badge contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#080e19]/80 via-[#080e19]/25 to-[#080e19]/45" />
        </div>

        {/* Top Boarding Pass Header Tags */}
        <div className="relative z-10 flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#080e19]/75 backdrop-blur-md border border-[#4cd7f6]/25 text-[#acedff] shadow-xs">
              <Plane className="h-3 w-3 shrink-0 text-[#4cd7f6]" />
              <span>{destinationLabel}</span>
            </span>

            {tripCountdown && (
              <div className={`px-3 py-1 rounded-full text-[10px] font-bold shadow-xs flex items-center gap-1.5 backdrop-blur-md ${tripCountdown.badgeColor}`}>
                {tripCountdown.icon}
                <span>{tripCountdown.text}</span>
              </div>
            )}
          </div>

          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-[#080e19]/75 backdrop-blur-md text-[#7bd0ff] border border-[#4cd7f6]/25 shrink-0">
            {currency}
          </span>
        </div>
      </div>

      {/* Dedicated Editorial Title & Budget Bar (Zero overlap on mobile at any title length) */}
      <div className="p-4 sm:p-5 border-t border-[#e2e8f0] dark:border-[#24324a] bg-white dark:bg-[#161c27] flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="space-y-1.5 min-w-0 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0284c7] dark:text-[#4cd7f6] block">
            Trip Ledger · {destinationLabel}
          </span>
          <h1 className="font-serif text-lg sm:text-2xl md:text-3xl font-bold tracking-tight leading-snug text-[#0f172a] dark:text-[#f8fafc] break-words">
            {trip?.name || 'ทริปท่องเที่ยว'}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#475569] dark:text-[#94a3b8] font-semibold">
            {trip?.start_date && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-[#2563eb] dark:text-[#4cd7f6] shrink-0" />
                <span className="font-mono text-[11px] sm:text-xs">
                  {new Date(trip.start_date).toLocaleDateString('th-TH')} - {trip.end_date ? new Date(trip.end_date).toLocaleDateString('th-TH') : 'ไม่ระบุวันกลับ'}
                </span>
              </span>
            )}
            <span className="opacity-40">•</span>
            <span className="font-mono text-[11px] sm:text-xs">{itineraryCount} กิจกรรม</span>
          </div>
        </div>

        {showBudget && (
          <div className="self-start sm:self-auto shrink-0 bg-[#f8fafd] dark:bg-[#080e19]/90 px-3.5 py-2.5 rounded-2xl border border-[#dbeafe] dark:border-[#38bdf8]/20 shadow-2xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#0284c7] dark:text-[#7bd0ff] block">งบใช้แล้ว</span>
            <span className="text-sm sm:text-base font-black text-[#0f172a] dark:text-[#f8fafc] font-mono tabular-nums lining-nums">
              <AnimatedNumber value={totalSpent} suffix={` ${currency}`} />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default TripHeroCover;
