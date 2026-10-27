// src/components/trip-detail/ShowToStaffModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, Navigation, ExternalLink, MapPin, Volume2, Sparkles } from 'lucide-react';

export interface ShowToStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  placeName: string;
  city?: string;
  timeSlot?: string;
  transportInfo?: string;
  platformInfo?: string;
  transportNote?: string;
  mapsUrl?: string;
  directionsUrl?: string;
}

export function ShowToStaffModal({
  isOpen,
  onClose,
  placeName,
  city,
  timeSlot,
  transportInfo,
  platformInfo,
  transportNote,
  mapsUrl,
  directionsUrl,
}: ShowToStaffModalProps) {
  const [copied, setCopied] = useState(false);
  const [phraseMode, setPhraseMode] = useState<'taxi' | 'station' | 'ask'>('taxi');

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const phrases = {
    taxi: {
      badge: '🚕 สำหรับคนขับแท็กซี่ (Taxi)',
      jp: 'すみません、ここまでお願いします。',
      romaji: 'Sumimasen, koko made onegaishimasu.',
      th: 'ขอโทษครับ/ค่ะ รบกวนไปส่งที่สถานที่นี้ด้วยครับ/ค่ะ',
    },
    station: {
      badge: '🚉 สำหรับนายสถานีรถไฟ (Station Staff)',
      jp: 'すみません、ここへ行くにはどの電車に乗ればいいですか？',
      romaji: 'Sumimasen, koko e iku ni wa dono densha ni noreba ii desu ka?',
      th: 'ขอโทษครับ/ค่ะ ถ้าจะไปที่นี่ต้องขึ้นรถไฟสายไหน/ชานชาลาไหนครับ?',
    },
    ask: {
      badge: '🗺️ ถามทางคนทั่วไป (Walking)',
      jp: 'すみません、この場所を探しています。',
      romaji: 'Sumimasen, kono basho o sagashite imasu.',
      th: 'ขอโทษครับ/ค่ะ กำลังตามหาสถานที่นี้อยู่ ไปทางไหนครับ?',
    },
  };

  const currentPhrase = phrases[phraseMode];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${placeName}${city ? ` (${city})` : ''}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleSpeak = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(`${currentPhrase.jp} ${placeName}`);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.92;
      window.speechSynthesis.speak(utterance);
    }
  };

  const effectiveDirectionsUrl =
    directionsUrl ||
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      placeName + (city ? ' ' + city : '')
    )}`;

  const effectiveMapsUrl =
    mapsUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      placeName + (city ? ' ' + city : '')
    )}`;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`การ์ดโชว์ถามทาง: ${placeName}`}
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 overflow-hidden overscroll-contain animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl max-h-[90dvh] rounded-3xl bg-white dark:bg-[#181a20] border-2 border-slate-200 dark:border-[#262932] shadow-2xl glow-blue flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Top Header */}
        <div className="shrink-0 px-4 sm:px-6 py-3.5 border-b border-slate-200/80 dark:border-[#262932] flex items-center justify-between bg-slate-50/80 dark:bg-[#181a20]">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[#e79b71]/15 text-[#e79b71] flex items-center justify-center text-base font-black">
              🇯🇵
            </span>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                การ์ดโชว์ถามทาง / แท็กซี่ (Show to Staff)
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                หันหน้าจอนี้ให้พนักงานสถานีหรือคนขับรถดูได้ทันที
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-200/70 dark:bg-[#262932] text-slate-600 dark:text-slate-300 hover:text-rose-500 cursor-pointer transition-colors"
            title="ปิดหน้าต่าง"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body (Safe for both Portrait & Landscape on Mobile & iPad) */}
        <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y min-h-0 p-4 sm:p-6 space-y-4 custom-scrollbar">
          {/* Situation Selector Pills */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-[#121316] border border-slate-200/80 dark:border-[#262932]">
            {(['taxi', 'station', 'ask'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPhraseMode(mode)}
                className={`py-2 px-2 rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer ${
                  phraseMode === mode
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {mode === 'taxi' ? '🚕 แท็กซี่' : mode === 'station' ? '🚉 นายสถานี' : '🗺️ ถามทาง'}
              </button>
            ))}
          </div>

          {/* Polite Japanese Phrase Box */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-800/50 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-300">
                {currentPhrase.badge}
              </span>
              <button
                type="button"
                onClick={handleSpeak}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black shadow-2xs active:scale-95 transition-all cursor-pointer"
                title="กดเพื่อออกเสียงภาษาญี่ปุ่น"
              >
                <Volume2 className="h-3.5 w-3.5" />
                <span>พูดออกเสียง</span>
              </button>
            </div>
            <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug selectable-text">
              {currentPhrase.jp}
            </p>
            <p className="text-[11px] font-semibold text-amber-800/80 dark:text-amber-300/80 italic">
              “{currentPhrase.romaji}”
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
              ({currentPhrase.th})
            </p>
          </div>

          {/* Giant Destination Card (Fluid Clamp Typography) */}
          <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-slate-900 via-[#181f36] to-slate-900 text-white border-2 border-blue-500/30 shadow-xl text-center space-y-3 relative overflow-hidden">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-bold text-blue-200">
              <MapPin className="h-3.5 w-3.5 text-[#e79b71]" />
              <span>จุดหมายปลายทาง (DESTINATION)</span>
              {city && <span>• {city}</span>}
            </div>

            <h2
              style={{ fontSize: 'clamp(1.4rem, 3.5vw + 0.65rem, 2.5rem)' }}
              className="font-black tracking-tight text-white leading-tight break-words selectable-text py-1"
            >
              {placeName}
            </h2>

            {transportInfo && transportInfo !== '-' && (
              <div className="p-2.5 rounded-xl bg-white/10 border border-white/10 text-xs font-semibold text-slate-200">
                🚉 {transportInfo}
              </div>
            )}

            {timeSlot && (
              <div className="text-[11px] font-bold text-slate-400">
                ⏰ เวลานัดหมายในแผน: {timeSlot}
              </div>
            )}
          </div>
        </div>

        {/* Sticky Safe-Area Footer */}
        <div className="shrink-0 p-3.5 sm:p-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] border-t border-slate-200/80 dark:border-[#262932] bg-slate-50/90 dark:bg-[#181a20] grid grid-cols-2 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="py-2.5 px-3 rounded-2xl border border-slate-200 dark:border-[#262932] bg-white dark:bg-[#181a20] text-slate-800 dark:text-slate-100 text-xs font-black flex items-center justify-center gap-1.5 hover:border-blue-400 active:scale-95 transition-all cursor-pointer"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-blue-500" />}
            <span>{copied ? 'คัดลอกชื่อแล้ว!' : 'คัดลอกชื่อสถานที่'}</span>
          </button>

          <a
            href={effectiveMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="py-2.5 px-3 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-black flex items-center justify-center gap-1.5 hover:bg-blue-100 active:scale-95 transition-all"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            <span>ดูพิกัด Maps</span>
          </a>

          <a
            href={effectiveDirectionsUrl}
            target="_blank"
            rel="noreferrer"
            className="col-span-2 sm:col-span-1 py-2.5 px-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/25 active:scale-95 transition-all"
          >
            <Navigation className="h-4 w-4 shrink-0" />
            <span>นำทางทันที</span>
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ShowToStaffModal;
