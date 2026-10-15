// src/components/DiningDecisionPickerModal.tsx
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  X, Dices, Utensils, MapPin, ExternalLink, 
  RotateCw, Sparkles, Star, ChevronRight, Check, Award, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { DiningSpot, extractDiningSpots } from './GourmetRadarModal';

interface DiningDecisionPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  itinerary: any[];
  defaultCity?: string;
  tripId?: string;
  checkedSpots?: Record<string, boolean>;
  onOpenRadar?: () => void;
}

export default function DiningDecisionPickerModal({
  isOpen,
  onClose,
  itinerary = [],
  defaultCity,
  tripId,
  checkedSpots = {},
  onOpenRadar,
}: DiningDecisionPickerModalProps) {
  const [selectedCity, setSelectedCity] = useState<'all' | 'Osaka' | 'Kyoto' | 'Nara'>(
    (defaultCity as any) || 'all'
  );
  const [selectedCategory, setSelectedCategory] = useState<'all' | DiningSpot['category']>('all');
  const [onlyUnvisited, setOnlyUnvisited] = useState(true);

  // Shuffling animation state
  const [isShuffling, setIsShuffling] = useState(false);
  const [pickedSpot, setPickedSpot] = useState<DiningSpot | null>(null);
  const [backupSpots, setBackupSpots] = useState<DiningSpot[]>([]);
  const [hasPicked, setHasPicked] = useState(false);
  const [animationIndex, setAnimationIndex] = useState(0);

  const shuffleIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (defaultCity && (defaultCity === 'Osaka' || defaultCity === 'Kyoto' || defaultCity === 'Nara')) {
      setSelectedCity(defaultCity);
    }
  }, [defaultCity]);

  // Body scroll lock and ESC key listener
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const allSpots = useMemo(() => extractDiningSpots(itinerary), [itinerary]);

  const pool = useMemo(() => {
    return allSpots.filter((s) => {
      if (selectedCity !== 'all' && s.cityGroup !== selectedCity) return false;
      if (selectedCategory !== 'all' && s.category !== selectedCategory) return false;
      if (onlyUnvisited && checkedSpots[s.id]) return false;
      return true;
    });
  }, [allSpots, selectedCity, selectedCategory, onlyUnvisited, checkedSpots]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (shuffleIntervalRef.current) clearInterval(shuffleIntervalRef.current);
    };
  }, []);

  const handlePickRandom = () => {
    if (pool.length === 0) {
      toast.error('ไม่พบร้านอาหารในหมวดหรือเมืองที่เลือก กรุณาปรับตัวกรอง');
      return;
    }

    setIsShuffling(true);
    setHasPicked(false);

    let counter = 0;
    const maxSteps = 16;
    const speed = 75; // ms per card flash

    if (shuffleIntervalRef.current) clearInterval(shuffleIntervalRef.current);

    shuffleIntervalRef.current = setInterval(() => {
      counter++;
      const randomIdx = Math.floor(Math.random() * pool.length);
      setAnimationIndex(randomIdx);

      if (counter >= maxSteps) {
        if (shuffleIntervalRef.current) clearInterval(shuffleIntervalRef.current);

        // Pick top 1 + 2 backups
        const shuffled = [...pool].sort(() => 0.5 - Math.random());
        const winner = shuffled[0];
        const backups = shuffled.slice(1, 3);

        setPickedSpot(winner);
        setBackupSpots(backups);
        setIsShuffling(false);
        setHasPicked(true);
        toast.success(`เลือกร้านเรียบร้อย: ${winner.name.slice(0, 30)} ✨`);
      }
    }, speed);
  };

  if (!isOpen) return null;

  const currentFlashingSpot = pool[animationIndex] || pool[0];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 overscroll-contain overflow-x-hidden animate-in fade-in duration-200 select-none" 
      role="dialog" 
      aria-modal="true"
    >
      <div className="w-full sm:max-w-xl rounded-3xl bg-white dark:bg-[#151b2b] shadow-2xl border border-slate-200/90 dark:border-[#222c42] flex flex-col max-h-[92dvh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-[#222c42] flex items-center justify-between shrink-0 bg-white/50 dark:bg-[#151b2b]/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
              <Dices className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Dining Decision Assistant</span>
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/70 px-2 py-0.5 rounded-full font-mono">
                  Smart Concierge
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                ตัวช่วยตัดสินใจเลือกร้านอาหารและของหวานตามโซน/มื้อ จากแผนหลัก & แผนสำรอง
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1c2438] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filters Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          
          {/* Controls: City & Category */}
          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#111726] border border-slate-200 dark:border-[#222c42]">
            
            {/* City Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                โซนเมืองที่กำลังอยู่:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'all', label: 'ทุกเมือง' },
                  { id: 'Osaka', label: '🐙 โอซาก้า' },
                  { id: 'Kyoto', label: '⛩️ เกียวโต' },
                  { id: 'Nara', label: '🦌 นารา' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCity(c.id as any);
                      setHasPicked(false);
                    }}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer border text-center ${
                      selectedCity === c.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white dark:bg-[#151b2b] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#222c42] hover:bg-slate-100'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                ประเภทอาหารที่อยากทาน:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'all', label: '🎲 ทุกหมวด', desc: 'สุ่มอิสระ' },
                  { id: 'ramen', label: '🍜 ราเมง & เส้น', desc: 'ร้อนๆ ซดคล่องคอ' },
                  { id: 'wagyu', label: '🥩 วากิว / ปิ้งย่าง', desc: 'เนื้อพรีเมียม' },
                  { id: 'cafe', label: '🍵 คาเฟ่ / ชาเขียว', desc: 'พักผ่อน ชิลล์ๆ' },
                  { id: 'street', label: '🐙 สตรีทฟู้ด', desc: 'ทาโกะยากิ / ของทอด' },
                  { id: 'izakaya', label: '🍺 อิซากายะ', desc: 'กินดื่มมื้อดึก' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id as any);
                      setHasPicked(false);
                    }}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                      selectedCategory === cat.id
                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-200 font-bold shadow-xs'
                        : 'bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#222c42] text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-black">{cat.label}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{cat.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle Only Unvisited */}
            <div className="flex items-center justify-between pt-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyUnvisited}
                  onChange={(e) => setOnlyUnvisited(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>เฉพาะร้านที่ยังไม่ได้แวะกิน (ไม่รวมที่ Check-in แล้ว)</span>
              </label>
              <span className="text-[11px] font-mono text-slate-400">
                {pool.length} ตัวเลือก
              </span>
            </div>

          </div>

          {/* Shuffling or Result Presentation */}
          {isShuffling ? (
            <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-center space-y-3 shadow-xl animate-pulse">
              <Dices className="h-8 w-8 mx-auto animate-spin" />
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest opacity-80">กำลังคัดสรรร้านอาหารที่ดีที่สุด...</span>
                <h3 className="text-base sm:text-lg font-black truncate px-4">
                  {currentFlashingSpot?.name || 'กำลังประมวลผล...'}
                </h3>
              </div>
            </div>
          ) : hasPicked && pickedSpot ? (
            <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
              
              {/* Winner Card */}
              <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-amber-500/5 dark:from-amber-950/40 dark:to-orange-950/20 border-2 border-amber-400 dark:border-amber-700 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-xs">
                      ★ ตัวเลือกอันดับ 1 สำหรับคุณ
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white dark:bg-[#111726] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#222c42]">
                      {pickedSpot.categoryIcon} {pickedSpot.categoryLabel}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 font-mono">
                    {pickedSpot.cityGroup}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
                    {pickedSpot.name}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span>{pickedSpot.city}</span>
                    {pickedSpot.dateLabel && (
                      <span className="text-slate-400 font-mono">
                        (มีในแผน {pickedSpot.dateLabel})
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-amber-200/60 dark:border-amber-900/40">
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                    {pickedSpot.type === 'main' ? '🎯 ร้านแนะนำไฮไลท์ประจำวัน' : '🛡️ แผนสำรอง Plan B เมนูเด็ด'}
                  </span>

                  {pickedSpot.mapLink && (
                    <a
                      href={pickedSpot.mapLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs shadow-md shadow-orange-500/25 transition-all hover:scale-105 cursor-pointer"
                    >
                      <span>นำทางด้วย Google Maps</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* 2 Alternative Backup Spot Cards */}
              {backupSpots.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-1">
                    🥈 ร้านสำรองใกล้เคียงกรณีคิวยาว:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {backupSpots.map((b, idx) => (
                      <div
                        key={b.id}
                        className="p-3 rounded-2xl bg-white dark:bg-[#1a2234] border border-slate-200 dark:border-[#222c42] space-y-1.5 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                            <span>ทางเลือก #{idx + 2} ({b.categoryLabel})</span>
                            <span>{b.cityGroup}</span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">
                            {b.name}
                          </h4>
                        </div>
                        {b.mapLink && (
                          <a
                            href={b.mapLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline pt-1"
                          >
                            <span>ดูแผนที่</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : (
            /* Standby Card */
            <div className="p-8 rounded-3xl bg-slate-50 dark:bg-[#111726] border border-dashed border-slate-300 dark:border-[#222c42] text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <Utensils className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                พร้อมตัดสินใจมื้อนี้แล้วหรือยัง?
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                กดปุ่มด้านล่างเพื่อสุ่มร้านอาหาร คาเฟ่ หรือของกินเด็ดๆ จาก {pool.length} ตัวเลือกตามเงื่อนไขที่คุณตั้งไว้
              </p>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-[#222c42] bg-slate-50/80 dark:bg-[#111726]/80 flex items-center justify-between gap-2 shrink-0">
          {onOpenRadar && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenRadar();
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1c2438] transition-colors cursor-pointer"
            >
              ดูรายการทั้งหมดในเรดาร์
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handlePickRandom}
              disabled={pool.length === 0 || isShuffling}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`h-4 w-4 ${isShuffling ? 'animate-spin' : ''}`} />
              <span>{hasPicked ? 'สุ่มร้านใหม่อีกครั้ง' : 'ค้นหาร้านมื้อนี้ทันที'}</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-[#222c42] text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-[#1c2438] cursor-pointer"
            >
              ปิด
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
