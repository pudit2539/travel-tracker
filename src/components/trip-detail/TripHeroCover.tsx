// src/components/trip-detail/TripHeroCover.tsx
'use client';

import React, { useMemo } from 'react';
import { Calendar, MapPin, Sparkles, Clock, Heart, Compass } from 'lucide-react';

interface TripHeroCoverProps {
  trip: any;
  itineraryCount?: number;
  totalSpent?: number;
  currency?: string;
}

export function TripHeroCover({ trip, itineraryCount = 0, totalSpent = 0, currency = 'JPY' }: TripHeroCoverProps) {
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

  // Trip Countdown / Status Calculation
  const tripCountdown = useMemo(() => {
    if (!trip?.start_date) return null;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const start = new Date(trip.start_date);
      start.setHours(0, 0, 0, 0);

      const diffTime = start.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        return {
          type: 'countdown',
          text: `⏳ อีก ${diffDays} วันจะออกเดินทาง!`,
          subtext: `${new Date(trip.start_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - ${trip.end_date ? new Date(trip.end_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}`,
          badgeColor: 'bg-rose-500 text-white',
        };
      }

      if (diffDays === 0) {
        return {
          type: 'today',
          text: '🚀 วันนี้ออกเดินทางแล้ว! ลุยเลยเมี๊ยว!',
          subtext: 'เปิดแผนเที่ยวแล้วเริ่มเดินทางกันได้เลย',
          badgeColor: 'bg-emerald-500 text-white animate-pulse',
        };
      }

      // Past start date: check end date
      if (trip?.end_date) {
        const end = new Date(trip.end_date);
        end.setHours(0, 0, 0, 0);
        if (today <= end) {
          const currentDay = Math.abs(diffDays) + 1;
          return {
            type: 'in_progress',
            text: `🎌 กำลังเที่ยววันที่ ${currentDay} ของทริป`,
            subtext: 'ขอให้เที่ยวอย่างมีความสุขและปลอดภัยนะเมี๊ยว',
            badgeColor: 'bg-purple-600 text-white',
          };
        }
      }

      return {
        type: 'completed',
        text: '✨ ทริปความทรงจำอันแสนอบอุ่น',
        subtext: 'บันทึกภาพถ่ายและเรื่องราวประทับใจ',
        badgeColor: 'bg-slate-700 text-white',
      };
    } catch {
      return null;
    }
  }, [trip]);

  // Dynamic Cat Companion Mood Greeting based on current hour
  const catMoodGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return {
        mood: '☀️ อรุณสวัสดิ์ยามเช้า',
        message: 'วันนี้มีที่เที่ยวให้ไปเช็กอิน เตรียมตัวให้พร้อมแล้วออกลุยกันเลยเมี๊ยว! 🐾',
        icon: '🐱☕',
      };
    }
    if (hour >= 12 && hour < 17) {
      return {
        mood: '🍜 ช่วงบ่ายชวนชิม',
        message: 'เดินทางมาครึ่งวันแล้ว อย่าลืมแวะเติมพลังด้วยร้านอาหารแนะนำในแพลนนะเมี๊ยว! 🍱',
        icon: '🐱🍱',
      };
    }
    return {
      mood: '🌙 ยามค่ำคืนแสนสุข',
      message: 'วันนี้เที่ยวสนุกมั้ย? อย่าลืมจดค่าใช้จ่ายและบันทึกภาพความทรงจำลงสมุดนะเมี๊ยว 📸',
      icon: '🐱🌙',
    };
  }, []);

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-lg border border-slate-200/80 dark:border-[#262c3d] group">
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
            <div className={`px-3 py-1.5 rounded-full text-xs font-black shadow-lg flex items-center gap-1.5 backdrop-blur-xs ${tripCountdown.badgeColor}`}>
              <span>{tripCountdown.text}</span>
            </div>
          </div>
        )}

        {/* Bottom Banner Content inside Image */}
        <div className="absolute bottom-3.5 left-3.5 sm:left-5 right-3.5 sm:right-5 z-10 flex flex-wrap justify-between items-end gap-2 text-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black drop-shadow-md tracking-tight">
                {trip?.name || 'ทริปท่องเที่ยว'}
              </span>
              <span className="text-lg">🎌</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 font-medium drop-shadow-xs flex items-center gap-2 mt-0.5">
              <span>📍 {trip?.destination || trip?.country || 'ญี่ปุ่น'}</span>
              <span>•</span>
              <span>{itineraryCount} กิจกรรม</span>
            </p>
          </div>

          <div className="hidden sm:block text-right">
            <span className="text-[10px] uppercase font-bold text-slate-300 block">ยอดใช้จ่ายรวม</span>
            <span className="text-base font-black text-rose-300 font-mono">
              {totalSpent.toLocaleString()} {currency}
            </span>
          </div>
        </div>
      </div>

      {/* Cat Companion Mood Banner directly below cover */}
      <div className="p-3 sm:p-3.5 bg-slate-50/90 dark:bg-[#171a23] border-t border-slate-200/80 dark:border-[#262c3d] flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white dark:bg-[#1f2433] shadow-xs flex items-center justify-center text-base shrink-0 border border-slate-200/80 dark:border-[#2d3448]">
            {catMoodGreeting.icon}
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-black text-slate-900 dark:text-white">
              <span>{catMoodGreeting.mood}</span>
              <span className="text-[10px] text-[#c25872] dark:text-[#d47087] bg-rose-50 dark:bg-[#d47087]/15 px-2 py-0.2 rounded-full font-bold border border-rose-200/60 dark:border-[#d47087]/30">
                Cat AI Companion
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
              {catMoodGreeting.message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TripHeroCover;
