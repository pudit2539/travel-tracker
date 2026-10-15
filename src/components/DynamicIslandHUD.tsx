// src/components/DynamicIslandHUD.tsx
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Navigation, MapPin, Train, Utensils, Coins, 
  QrCode, Dices, ChevronDown, ChevronUp, ExternalLink, 
  Sparkles, Clock, Compass, Bell, Check, X, ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';

interface DynamicIslandHUDProps {
  trip: any;
  itinerary: any[];
  fxRate?: number;
  onOpenCurrencyCalc: () => void;
  onOpenTicketLocker: () => void;
  onOpenGourmetRadar: () => void;
  onOpenDiningDecision: (city?: string) => void;
}

export default function DynamicIslandHUD({
  trip,
  itinerary = [],
  fxRate = 0.210,
  onOpenCurrencyCalc,
  onOpenTicketLocker,
  onOpenGourmetRadar,
  onOpenDiningDecision,
}: DynamicIslandHUDProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const islandRef = useRef<HTMLDivElement>(null);

  // Auto detect active stop from itinerary
  const activeStop = useMemo(() => {
    const valid = itinerary.filter((i) => i.date_label !== '__meta_trip_data__');
    if (valid.length === 0) return null;

    // Try finding today's item, else take first or second item
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1; // 1-12

    // Check if any date_label matches today
    const found = valid.find((item) => {
      if (!item.date_label) return false;
      const num = parseInt(item.date_label.replace(/\D/g, ''), 10);
      return num === day;
    });

    return found || valid[0];
  }, [itinerary]);

  // Next upcoming stop
  const nextStop = useMemo(() => {
    const valid = itinerary.filter((i) => i.date_label !== '__meta_trip_data__');
    if (!activeStop || valid.length < 2) return null;
    const currentIdx = valid.findIndex((i) => i.id === activeStop.id);
    if (currentIdx >= 0 && currentIdx < valid.length - 1) {
      return valid[currentIdx + 1];
    }
    return valid[1] || null;
  }, [itinerary, activeStop]);

  // Extract first backup dining from active stop if available
  const currentBackup = useMemo(() => {
    if (!activeStop) return null;
    if (activeStop.backup_plan) {
      const lines = activeStop.backup_plan.split('\n');
      const foodLine = lines.find((l: string) => l.includes('ร้าน') || l.includes('คาเฟ่') || l.includes('อาหาร') || l.includes('ขนม'));
      if (foodLine) {
        const link = (activeStop.backup_links && activeStop.backup_links[0]) || '';
        return {
          title: foodLine.replace(/^[•\-\*\d\.\s]+/, '').trim(),
          link,
        };
      }
    }
    if (activeStop.food_recommendation) {
      return {
        title: activeStop.food_recommendation.trim(),
        link: (activeStop.food_links && activeStop.food_links[0]) || '',
      };
    }
    return null;
  }, [activeStop]);

  // Collapse island when user clicks outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (islandRef.current && !islandRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  // Handle scroll detection
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 150) {
        setHasScrolled(true);
      } else {
        setHasScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!activeStop) return null;

  const currentMapLink = (activeStop.main_place_links && activeStop.main_place_links[0]) || 
    `https://maps.google.com/?q=${encodeURIComponent(activeStop.main_place + ' ' + (activeStop.city || 'Japan'))}`;

  return (
    <div 
      className="fixed inset-x-0 z-50 flex justify-center pointer-events-none px-3 select-none"
      style={{ top: 'max(env(safe-area-inset-top, 0px) + 0.35rem, 0.65rem)' }}
    >
      <div ref={islandRef} className="pointer-events-auto max-w-md w-full flex justify-center">
        
        <AnimatePresence initial={false} mode="wait">
          {!isExpanded ? (
            /* ========================================================
               COMPACT PILL (AUTHENTIC IPHONE DYNAMIC ISLAND STYLE)
            ======================================================== */
            <motion.button
              key="compact-island"
              layoutId="dynamic-island-container"
              onClick={() => setIsExpanded(true)}
              className="bg-black/90 dark:bg-black/95 text-white backdrop-blur-2xl border border-white/20 shadow-2xl rounded-full px-3.5 py-1.5 flex items-center justify-between gap-3 cursor-pointer hover:scale-102 active:scale-98 transition-all ring-1 ring-black/40 group max-w-xs sm:max-w-sm w-auto"
              style={{ borderRadius: 9999 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              title="แตะเพื่อเปิด Dynamic Island HUD"
            >
              {/* Left Side: Live Dot + Icon + Title */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>

                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <Navigation className="h-3 w-3 text-blue-400 group-hover:rotate-45 transition-transform" />
                </div>

                <div className="text-left min-w-0 pr-1">
                  <span className="text-[11px] font-black truncate block max-w-[130px] sm:max-w-[170px] text-white">
                    {activeStop.main_place}
                  </span>
                </div>
              </div>

              {/* Right Side: Next Time or Action */}
              <div className="flex items-center gap-1.5 shrink-0 pl-1 border-l border-white/15">
                <span className="text-[10px] font-mono font-bold text-amber-300">
                  {activeStop.time_slot || activeStop.date_label || 'LIVE'}
                </span>
                <ChevronDown className="h-3 w-3 text-white/60 group-hover:translate-y-0.5 transition-transform" />
              </div>
            </motion.button>
          ) : (
            /* ========================================================
               EXPANDED ISLAND (FULL EXECUTIVE TRIP DASHBOARD)
            ======================================================== */
            <motion.div
              key="expanded-island"
              layoutId="dynamic-island-container"
              className="w-full bg-black/95 text-white backdrop-blur-3xl rounded-3xl p-4 sm:p-5 border border-white/20 shadow-2xl space-y-3.5 ring-2 ring-black/50"
              style={{ borderRadius: 28 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            >
              {/* Header inside Island */}
              <div className="flex items-center justify-between pb-1 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <span className="text-[10px] font-mono font-black tracking-widest text-emerald-400 uppercase">
                    DYNAMIC ISLAND HUD
                  </span>
                  <span className="text-[10px] bg-white/10 text-white/70 px-2 py-0.2 rounded-full font-mono">
                    {activeStop.date_label}
                  </span>
                </div>

                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1 rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                  title="ย่อกลับ"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
              </div>

              {/* Current Active Destination Card */}
              <div className="p-3 rounded-2xl bg-white/10 border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-white/60">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-amber-400" />
                    <span>จุดหมายปัจจุบัน ({activeStop.time_slot || 'กำลังดำเนินอยู่'})</span>
                  </span>
                  <span className="text-white/80 font-mono">{activeStop.city}</span>
                </div>

                <h4 className="text-xs sm:text-sm font-black text-white leading-snug line-clamp-2">
                  {activeStop.main_place}
                </h4>

                {activeStop.transport_info && (
                  <p className="text-[11px] text-white/70 flex items-center gap-1 pt-0.5 font-medium">
                    <Train className="h-3 w-3 text-blue-400 shrink-0" />
                    <span className="truncate">{activeStop.transport_info}</span>
                  </p>
                )}
              </div>

              {/* Next Upcoming Stop / Backup Dining */}
              {currentBackup && (
                <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[9px] font-black text-amber-300 uppercase tracking-wider block">
                      🍱 ร้านอาหาร / แผนสำรองจุดนี้:
                    </span>
                    <p className="text-xs font-bold text-white truncate">
                      {currentBackup.title}
                    </p>
                  </div>

                  {currentBackup.link && (
                    <a
                      href={currentBackup.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-[10px] shrink-0 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>แผนที่</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              )}

              {/* Quick Actions Strip */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsExpanded(false);
                    onOpenCurrencyCalc();
                  }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 border border-white/10"
                >
                  <Coins className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-[9px] font-bold">Tax-Free</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsExpanded(false);
                    onOpenTicketLocker();
                  }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 border border-white/10"
                >
                  <QrCode className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="text-[9px] font-bold">QR Pass</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsExpanded(false);
                    onOpenGourmetRadar();
                  }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 border border-white/10"
                >
                  <Utensils className="h-3.5 w-3.5 text-orange-400" />
                  <span className="text-[9px] font-bold">ร้านอาหาร</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsExpanded(false);
                    onOpenDiningDecision();
                  }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 border border-white/10"
                >
                  <Dices className="h-3.5 w-3.5 text-blue-400" />
                  <span className="text-[9px] font-bold">สุ่มมื้อนี้</span>
                </button>
              </div>

              {/* Bottom Action: Direct Google Maps Navigate */}
              <div className="flex items-center justify-between pt-1">
                <a
                  href={currentMapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-blue-500/25"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  <span>นำทางไปจุดนี้ด้วย Google Maps</span>
                </a>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
