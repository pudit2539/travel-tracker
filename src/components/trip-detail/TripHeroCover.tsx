// src/components/trip-detail/TripHeroCover.tsx
'use client';

import React, { useMemo } from 'react';
import { Calendar, MapPin, Sparkles, Clock, Compass, Sun, Utensils, Moon, Check } from 'lucide-react';
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

  // Dynamic Travel Assistant Advice based on current hour (Clean Corporate Style)
  const assistantGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return {
        title: 'ช่วงเช้า: เตรียมพร้อมออกเดินทาง',
        message: 'ตรวจสอบเวลาเปิด-ปิดของสถานที่และสภาพอากาศก่อนเริ่มเดินทางตามแผน',
        icon: <Sun className="h-4 w-4 text-amber-500 shrink-0" />,
      };
    }
    if (hour >= 12 && hour < 17) {
      return {
        title: 'ช่วงบ่าย: จุดแวะพักและร้านอาหาร',
        message: 'มีร้านอาหารและจุดพักผ่อนแนะนำตามเส้นทางในแผนเดินทางของคุณ',
        icon: <Utensils className="h-4 w-4 text-blue-500 shrink-0" />,
      };
    }
    return {
      title: 'ช่วงค่ำ: ตรวจสอบและสรุปรายจ่ายประจำวัน',
      message: 'ตรวจสอบรายการค่าใช้จ่ายและบันทึกข้อมูลเพื่อความถูกต้องของงบประมาณ',
      icon: <Moon className="h-4 w-4 text-indigo-400 shrink-0" />,
    };
  }, []);

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-lg border border-slate-200/90 dark:border-[#222c42] group">
      {/* Background Cover Image with Gradient Scrim */}
      <div className="h-44 sm:h-52 w-full relative overflow-hidden bg-slate-900">
        <img
          src={coverImage}
          alt={trip?.name || 'Trip Destination Cover'}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 opacity-80"
        />
        {/* Soft Multi-Stop Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/30" />

        {/* Top Floating Countdown Pill */}
        {tripCountdown && (
          <div className="absolute top-3.5 left-3.5 sm:left-5 z-10">
            <div className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-md flex items-center gap-1.5 backdrop-blur-md ${tripCountdown.badgeColor}`}>
              {tripCountdown.icon}
              <span>{tripCountdown.text}</span>
            </div>
          </div>
        )}

        {/* Bottom Banner Content inside Image */}
        <div className="absolute bottom-3.5 left-3.5 sm:left-5 right-3.5 sm:right-5 z-10 flex flex-wrap justify-between items-end gap-2 text-white">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold drop-shadow-md tracking-tight">
              {trip?.name || 'ทริปท่องเที่ยว'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 font-medium drop-shadow-xs flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-slate-300" />
                <span>{trip?.destination || trip?.country || 'ญี่ปุ่น'}</span>
              </span>
              <span>•</span>
              <span>{itineraryCount} กิจกรรม</span>
            </p>
          </div>

          <div className="hidden sm:block text-right">
            {showBudget ? (
              <>
                <span className="text-[10px] uppercase font-bold text-slate-300 block">ยอดใช้จ่ายรวม</span>
                <span className="text-base font-bold text-amber-300 font-mono">
                  <AnimatedNumber value={totalSpent} suffix={` ${currency}`} />
                </span>
              </>
            ) : (
              <>
                <span className="text-[10px] uppercase font-bold text-emerald-300 block">โหมดการเข้าชม</span>
                <span className="text-xs font-bold text-emerald-200 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 shadow-sm backdrop-blur-xs mt-0.5">
                  <Compass className="h-3 w-3" />
                  <span>ดูเฉพาะแผนเที่ยว</span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Travel Assistant Banner directly below cover (Clean Executive Style) */}
      <div className="p-3 sm:p-3.5 bg-white dark:bg-[#151b2b] border-t border-slate-200/90 dark:border-[#222c42] flex items-center justify-between gap-3 text-xs text-left">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-[#1c2438] shadow-xs flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-[#222c42]">
            {assistantGreeting.icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white flex-wrap">
              <span>{assistantGreeting.title}</span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full font-bold border border-blue-200 dark:border-blue-900/40 inline-flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5" />
                <span>Travel Assistant</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium truncate">
              {assistantGreeting.message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TripHeroCover;
