// src/components/GourmetRadarModal.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  X, Search, MapPin, ExternalLink, Star, 
  Utensils, Coffee, Beef, Flame, Sparkles, Filter, 
  CheckCircle2, Compass, Share2, Award, ChevronRight, Dices
} from 'lucide-react';
import { toast } from 'sonner';
import { syncTripMetadataToSupabase } from '@/lib/tripMetadata';

interface GourmetRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  itinerary: any[];
  tripId?: string;
  fxRate?: number;
  initialCheckedSpots?: Record<string, boolean>;
  onToggleCheckIn?: (spotId: string, checked: boolean) => void;
  onOpenDecisionPicker?: (filterCity?: string) => void;
}

export interface DiningSpot {
  id: string;
  name: string;
  category: 'ramen' | 'wagyu' | 'cafe' | 'street' | 'izakaya' | 'general';
  categoryLabel: string;
  categoryIcon: string;
  city: string;
  cityGroup: 'Osaka' | 'Kyoto' | 'Nara' | 'Other';
  dateLabel: string;
  timeSlot?: string;
  type: 'main' | 'backup';
  mapLink: string;
  rawText: string;
}

export function extractDiningSpots(itinerary: any[]): DiningSpot[] {
  const spots: DiningSpot[] = [];

  itinerary.forEach((item) => {
    if (item.date_label === '__meta_trip_data__') return;

    // Detect City Group
    const cityRaw = (item.city || '').toLowerCase();
    let cityGroup: 'Osaka' | 'Kyoto' | 'Nara' | 'Other' = 'Other';
    if (cityRaw.includes('osaka') || cityRaw.includes('โอซาก้า') || cityRaw.includes('minoh')) {
      cityGroup = 'Osaka';
    } else if (cityRaw.includes('kyoto') || cityRaw.includes('เกียวโต') || cityRaw.includes('arashiyama') || cityRaw.includes('uji')) {
      cityGroup = 'Kyoto';
    } else if (cityRaw.includes('nara') || cityRaw.includes('นารา')) {
      cityGroup = 'Nara';
    }

    // Helper: Categorize dining text
    const categorize = (text: string): { category: DiningSpot['category']; label: string; icon: string } => {
      const t = text.toLowerCase();
      if (t.includes('ราเมง') || t.includes('อุด้ง') || t.includes('โซบะ') || t.includes('ramen') || t.includes('udon') || t.includes('soba')) {
        return { category: 'ramen', label: 'ราเมง & เส้น', icon: '🍜' };
      }
      if (t.includes('เนื้อ') || t.includes('วากิว') || t.includes('ยากินิกุ') || t.includes('wagyu') || t.includes('yakiniku') || t.includes('สเต๊ก') || t.includes('คัตสึ') || t.includes('gyukatsu')) {
        return { category: 'wagyu', label: 'วากิว & ปิ้งย่าง', icon: '🥩' };
      }
      if (t.includes('คาเฟ่') || t.includes('ชาเขียว') || t.includes('มัทฉะ') || t.includes('กาแฟ') || t.includes('ขนม') || t.includes('cafe') || t.includes('coffee') || t.includes('matcha') || t.includes('bakery')) {
        return { category: 'cafe', label: 'คาเฟ่ & มัทฉะ', icon: '🍵' };
      }
      if (t.includes('ทาโกะยากิ') || t.includes('โอโคโนมิยากิ') || t.includes('ตลาด') || t.includes('เทมปุระ') || t.includes('คุชิคัตสึ') || t.includes('street') || t.includes('market')) {
        return { category: 'street', label: 'สตรีทฟู้ด & ท้องถิ่น', icon: '🐙' };
      }
      if (t.includes('อิซากายะ') || t.includes('เบียร์') || t.includes('คราฟต์') || t.includes('izakaya') || t.includes('ยากิโทริ') || t.includes('บาร์')) {
        return { category: 'izakaya', label: 'อิซากายะ & ดื่มดึก', icon: '🍺' };
      }
      return { category: 'general', label: 'อาหารญี่ปุ่นรสเลิศ', icon: '🍱' };
    };

    // 1. Food recommendation (Main)
    if (item.food_recommendation && item.food_recommendation.trim().length > 0) {
      const link = (item.food_links && item.food_links[0]) || `https://maps.google.com/?q=${encodeURIComponent(item.food_recommendation + ' ' + (item.city || 'Japan'))}`;
      const cat = categorize(item.food_recommendation);
      spots.push({
        id: `food_${item.id}`,
        name: item.food_recommendation.trim(),
        category: cat.category,
        categoryLabel: cat.label,
        categoryIcon: cat.icon,
        city: item.city || 'ญี่ปุ่น',
        cityGroup,
        dateLabel: item.date_label || '',
        timeSlot: item.time_slot || '',
        type: 'main',
        mapLink: link,
        rawText: item.food_recommendation,
      });
    }

    // 2. Backup plan lines (Plan B Dining & Cafes)
    if (item.backup_plan) {
      const lines = item.backup_plan.split('\n');
      lines.forEach((line: string, lineIdx: number) => {
        const clean = line.replace(/^[•\-\*\d\.\s]+/, '').trim();
        if (
          clean.includes('ร้าน') || 
          clean.includes('คาเฟ่') || 
          clean.includes('อาหาร') || 
          clean.includes('มื้อ') || 
          clean.includes('ขนม') ||
          clean.includes('ชาเขียว')
        ) {
          const bLink = (item.backup_links && item.backup_links[lineIdx]) || `https://maps.google.com/?q=${encodeURIComponent(clean + ' ' + (item.city || 'Japan'))}`;
          const cat = categorize(clean);
          spots.push({
            id: `backup_${item.id}_${lineIdx}`,
            name: clean,
            category: cat.category,
            categoryLabel: cat.label,
            categoryIcon: cat.icon,
            city: item.city || 'ญี่ปุ่น',
            cityGroup,
            dateLabel: item.date_label || '',
            timeSlot: item.time_slot || '',
            type: 'backup',
            mapLink: bLink,
            rawText: clean,
          });
        }
      });
    }
  });

  return spots;
}

export default function GourmetRadarModal({
  isOpen,
  onClose,
  itinerary = [],
  tripId,
  fxRate = 0.210,
  initialCheckedSpots = {},
  onToggleCheckIn,
  onOpenDecisionPicker,
}: GourmetRadarModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<'all' | 'Osaka' | 'Kyoto' | 'Nara'>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | DiningSpot['category']>('all');
  const [filterType, setFilterType] = useState<'all' | 'checked' | 'unchecked'>('all');

  // Checked-in / Visited spots tracking
  const [checkedSpots, setCheckedSpots] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined' && tripId) {
      try {
        const cached = localStorage.getItem(`gourmet_checked_${tripId}`);
        if (cached) return { ...initialCheckedSpots, ...JSON.parse(cached) };
      } catch {}
    }
    return initialCheckedSpots || {};
  });

  useEffect(() => {
    if (initialCheckedSpots && Object.keys(initialCheckedSpots).length > 0) {
      setCheckedSpots((prev) => ({ ...prev, ...initialCheckedSpots }));
    }
  }, [initialCheckedSpots]);

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

  const filteredSpots = useMemo(() => {
    return allSpots.filter((s) => {
      // City filter
      if (selectedCity !== 'all' && s.cityGroup !== selectedCity) return false;

      // Category filter
      if (selectedCategory !== 'all' && s.category !== selectedCategory) return false;

      // Check-in filter
      const isChecked = !!checkedSpots[s.id];
      if (filterType === 'checked' && !isChecked) return false;
      if (filterType === 'unchecked' && isChecked) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q) ||
          s.dateLabel.toLowerCase().includes(q) ||
          s.categoryLabel.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [allSpots, selectedCity, selectedCategory, filterType, searchQuery, checkedSpots]);

  const checkedCount = useMemo(() => {
    return Object.values(checkedSpots).filter(Boolean).length;
  }, [checkedSpots]);

  const handleToggleCheck = (spot: DiningSpot) => {
    const nextState = !checkedSpots[spot.id];
    const updated = { ...checkedSpots, [spot.id]: nextState };
    setCheckedSpots(updated);

    if (tripId) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`gourmet_checked_${tripId}`, JSON.stringify(updated));
      }
      syncTripMetadataToSupabase(tripId, { checkedInSpots: updated });
    }

    if (onToggleCheckIn) {
      onToggleCheckIn(spot.id, nextState);
    }

    if (nextState) {
      toast.success(`เช็คอินแล้ว: ${spot.name.slice(0, 30)}... ⭐`);
    } else {
      toast.info(`ยกเลิกเช็คอิน`);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 overscroll-contain overflow-x-hidden animate-in fade-in duration-200 select-none" 
      role="dialog" 
      aria-modal="true"
    >
      <div className="w-full sm:max-w-3xl rounded-3xl bg-white dark:bg-[#151b2b] shadow-2xl border border-slate-200/90 dark:border-[#222c42] flex flex-col max-h-[92dvh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-[#222c42] flex items-center justify-between shrink-0 bg-white/50 dark:bg-[#151b2b]/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/25">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Gourmet & Cafe Radar
                </h2>
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 px-2 py-0.5 rounded-full font-mono">
                  {allSpots.length} จุดเช็คอิน
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                คลังร้านอาหาร คาเฟ่ & แผนสำรองทั้งหมดของทริป พร้อมพิกัด Google Maps ตรงจุด
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenDecisionPicker && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDecisionPicker(selectedCity !== 'all' ? selectedCity : undefined);
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs shadow-md shadow-blue-500/20 hover:scale-105 transition-all cursor-pointer"
              >
                <Dices className="h-3.5 w-3.5" />
                <span>สุ่มมื้อนี้</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1c2438] transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-[#222c42] bg-slate-50/70 dark:bg-[#111726]/60 space-y-2.5 shrink-0">
          
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาร้านอาหาร, คาเฟ่, ราเมง, ชาเขียว, ย่านช้อปปิ้ง..."
              className="w-full pl-9 pr-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-[#222c42] bg-white dark:bg-[#151b2b] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ล้าง
              </button>
            )}
          </div>

          {/* City Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">เมือง:</span>
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'Osaka', label: '🐙 โอซาก้า (Osaka)' },
              { id: 'Kyoto', label: '⛩️ เกียวโต (Kyoto)' },
              { id: 'Nara', label: '🦌 นารา (Nara)' },
            ].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCity(c.id as any)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer border ${
                  selectedCity === c.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white dark:bg-[#151b2b] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#222c42] hover:bg-slate-100'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">หมวด:</span>
            {[
              { id: 'all', label: 'ทุกหมวด' },
              { id: 'ramen', label: '🍜 ราเมง & เส้น' },
              { id: 'wagyu', label: '🥩 วากิว & ปิ้งย่าง' },
              { id: 'cafe', label: '🍵 คาเฟ่ & ชาเขียว' },
              { id: 'street', label: '🐙 สตรีทฟู้ด' },
              { id: 'izakaya', label: '🍺 อิซากายะ' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer border ${
                  selectedCategory === cat.id
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white dark:bg-[#151b2b] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#222c42] hover:bg-slate-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Status Filter Pills (Check-in ⭐) */}
          <div className="flex items-center justify-between text-[11px] pt-0.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                  filterType === 'all' ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                ทั้งหมด ({filteredSpots.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('checked')}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  filterType === 'checked' ? 'bg-amber-600 text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>⭐ แวะกินแล้ว ({checkedCount})</span>
              </button>
            </div>

            <span className="text-[11px] text-slate-400 font-medium">
              แสดง {filteredSpots.length} จาก {allSpots.length} ร้าน
            </span>
          </div>

        </div>

        {/* Spot Cards List */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
          {filteredSpots.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <p className="text-3xl">🔍</p>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                ไม่พบร้านอาหารในเงื่อนไขที่เลือก
              </h3>
              <p className="text-xs text-slate-400">
                ลองเปลี่ยนตัวกรองเมือง หมวดอาหาร หรือคำค้นหาดูครับ
              </p>
            </div>
          ) : (
            filteredSpots.map((spot) => {
              const isChecked = !!checkedSpots[spot.id];
              return (
                <div
                  key={spot.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    isChecked
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80 shadow-xs'
                      : 'bg-white dark:bg-[#1a2234] border-slate-200 dark:border-[#222c42] hover:border-blue-400 dark:hover:border-blue-500/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      
                      {/* Badge Row */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-[#111726] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#222c42]">
                          {spot.categoryIcon} {spot.categoryLabel}
                        </span>

                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
                          {spot.cityGroup}
                        </span>

                        {spot.type === 'main' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                            ★ แผนหลัก
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/60">
                            Plan B สำรอง
                          </span>
                        )}

                        {spot.dateLabel && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {spot.dateLabel} {spot.timeSlot ? `• ${spot.timeSlot}` : ''}
                          </span>
                        )}
                      </div>

                      {/* Name */}
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug break-words">
                        {spot.name}
                      </h4>

                      {/* City Detail */}
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate">{spot.city}</span>
                      </p>
                    </div>

                    {/* Check-in Toggle Star Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleCheck(spot)}
                      className={`p-2 rounded-xl transition-all cursor-pointer shrink-0 border flex flex-col items-center gap-0.5 ${
                        isChecked
                          ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-[#111726] text-slate-400 hover:text-amber-500 border-slate-200 dark:border-[#222c42]'
                      }`}
                      title={isChecked ? 'แวะกินแล้ว (คลิกเพื่อยกเลิก)' : 'คลิกเพื่อบันทึกว่าแวะกินแล้ว'}
                    >
                      <Star className={`h-4 w-4 ${isChecked ? 'fill-white' : ''}`} />
                      <span className="text-[9px] font-black font-mono">
                        {isChecked ? 'กินแล้ว' : 'Check-in'}
                      </span>
                    </button>
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#222c42]/80">
                    <span className="text-[10px] text-slate-400 font-medium">
                      {spot.type === 'main' ? 'เมนูแนะนำประจำมื้อ' : 'ร้านสำรองคุณภาพสูงเมื่อคิวยาว'}
                    </span>

                    {spot.mapLink && (
                      <a
                        href={spot.mapLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/70 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-bold transition-all border border-blue-200 dark:border-blue-900/60 cursor-pointer shadow-2xs"
                      >
                        <span>เปิด Google Maps</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-[#222c42] bg-slate-50/80 dark:bg-[#111726]/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <Award className="h-4 w-4 text-amber-500" />
            <span>เช็คอินแล้ว {checkedCount} จาก {allSpots.length} ร้าน</span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenDecisionPicker && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDecisionPicker(selectedCity !== 'all' ? selectedCity : undefined);
                }}
                className="sm:hidden flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs"
              >
                <Dices className="h-3.5 w-3.5" />
                <span>สุ่มมื้อนี้</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl border border-slate-300 dark:border-[#222c42] text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-[#1c2438] cursor-pointer"
            >
              ปิด
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
