// src/components/trip-detail/modals/TripReelModal.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, MapPin, Pause, Play, Sparkles, X } from 'lucide-react';
import { getPlaceVisualMeta } from '@/lib/placeThumbnails';

interface TripReelModalProps {
  isOpen: boolean;
  mounted: boolean;
  tripTitle?: string;
  trip?: any;
  itinerary: any[];
  onClose: () => void;
}

export const TripReelModal = React.memo(function TripReelModal({
  isOpen,
  mounted,
  tripTitle: propTripTitle,
  trip,
  itinerary,
  onClose,
}: TripReelModalProps) {
  const tripTitle = propTripTitle || trip?.name || 'ทริปของคุณ';
  const [slideIdx, setSlideIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const slides = itinerary.filter((it) => it && (it.main_place || it.title));

  useEffect(() => {
    if (!isOpen || !isPlaying || slides.length <= 1) return;
    const timer = setInterval(() => {
      setSlideIdx((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isOpen, isPlaying, slides.length]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setSlideIdx((p) => (p + 1) % Math.max(1, slides.length));
      if (e.key === 'ArrowLeft') setSlideIdx((p) => (p - 1 + Math.max(1, slides.length)) % Math.max(1, slides.length));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, slides.length]);

  if (!isOpen || !mounted || slides.length === 0) return null;

  const activeIdx = slideIdx % slides.length;
  const activeStop = slides[activeIdx];
  const placeName = activeStop.main_place || activeStop.title || 'จุดหมาย';
  const visual = getPlaceVisualMeta(placeName, activeStop.city, activeIdx);

  return createPortal(
    <div
      className="fixed inset-0 z-[120] bg-[#040914]/92 backdrop-blur-md p-3 sm:p-6 flex items-center justify-center animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      data-testid="trip-reel-modal"
    >
      <div
        className="relative w-full max-w-md aspect-[9/15] max-h-[88dvh] rounded-3xl overflow-hidden bg-[#0d131f] border border-[#4cd7f6]/35 shadow-2xl flex flex-col justify-between text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background Visual with Smooth GPU Ken-Burns Motion */}
        <div key={activeStop.id || activeIdx} className="absolute inset-0 overflow-hidden pointer-events-none">
          <img
            src={visual.imageUrl || visual.fallbackImageUrl}
            alt={placeName}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-80 trip-reel-kenburns"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080e19] via-[#080e19]/30 to-[#080e19]/75" />
        </div>

        {/* Top Progress Bars & Header */}
        <div className="relative z-10 p-4 space-y-3">
          <div className="flex gap-1">
            {slides.slice(0, 18).map((_, idx) => (
              <div key={idx} className="h-1 flex-1 rounded-full bg-white/20 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    idx < activeIdx
                      ? 'w-full bg-[#4cd7f6]'
                      : idx === activeIdx
                      ? 'w-full bg-white'
                      : 'w-0'
                  }`}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-[#4cd7f6]/35 text-[10px] font-mono font-bold text-[#acedff]">
                {activeIdx + 1} / {slides.length}
              </span>
              <span className="text-xs font-bold text-white/90 truncate">{tripTitle}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                aria-label={isPlaying ? 'หยุดสไลด์ชั่วคราว' : 'เล่นสไลด์ต่อ'}
                className="p-2 rounded-full bg-black/50 hover:bg-black/75 text-white cursor-pointer"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="ปิด Trip Reel"
                className="p-2 rounded-full bg-black/50 hover:bg-black/75 text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Spotlight Details */}
        <div className="relative z-10 p-5 space-y-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {activeStop.date_label && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#2563eb] text-white text-[11px] font-bold">
                📅 {activeStop.date_label}
              </span>
            )}
            {activeStop.time_slot && (
              <span className="px-2.5 py-0.5 rounded-full bg-black/60 border border-white/20 text-[#acedff] text-[11px] font-mono font-bold">
                ⏰ {activeStop.time_slot}
              </span>
            )}
          </div>

          <h3 className="font-serif text-2xl font-bold leading-snug text-white drop-shadow">
            {placeName}
          </h3>

          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="inline-flex items-center gap-1 text-xs text-slate-200 font-semibold">
              <MapPin className="h-3.5 w-3.5 text-[#4cd7f6]" />
              <span>{activeStop.city || 'Japan'}</span>
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSlideIdx((p) => (p - 1 + slides.length) % slides.length)}
                className="p-2 rounded-full bg-white/15 hover:bg-white/25 text-white cursor-pointer tactile-press"
                aria-label="จุดก่อนหน้า"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setSlideIdx((p) => (p + 1) % slides.length)}
                className="p-2 rounded-full bg-white/15 hover:bg-white/25 text-white cursor-pointer tactile-press"
                aria-label="จุดถัดไป"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-[#4cd7f6]" />
            <span>TRIP REEL • OCEANIC SLIDESHOW</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
});
