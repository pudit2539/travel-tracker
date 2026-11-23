// src/components/GourmetRadarModal.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  X, Search, MapPin, ExternalLink, Star, 
  Utensils, Award, Dices, Plus, MessageSquare, Moon, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { syncTripMetadataToSupabase } from '@/lib/tripMetadata';
import {
  CURATED_EXPLORE_SPOTS,
  ALL_JAPAN_CITY_GROUPS,
  ExploreCityGroup,
  SpotBudgetTier,
  normalizeCityGroup,
  inferSpotBudgetTier,
  isSpotOpenLate,
  isSpotWalkInFriendly,
  detectTripCityGroups,
} from '@/data/curatedExploreSpots';
import { ModalPortal } from '@/components/ModalPortal';
import { ShowToStaffModal } from '@/components/trip-detail/ShowToStaffModal';

interface GourmetRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  itinerary: any[];
  tripId?: string;
  tripDestination?: string;
  fxRate?: number;
  initialCheckedSpots?: Record<string, boolean>;
  onToggleCheckIn?: (spotId: string, checked: boolean) => void;
  onOpenDecisionPicker?: (filterCity?: string) => void;
  availableDays?: string[];
  defaultDay?: string;
  onAddToItinerary?: (item: {
    title: string;
    category: string;
    city?: string;
    food_recommend?: string;
    mapsQuery?: string;
    date_label?: string;
  }) => void;
}

export interface DiningSpot {
  id: string;
  name: string;
  japaneseName?: string;
  category: 'ramen' | 'wagyu' | 'cafe' | 'street' | 'izakaya' | 'general';
  categoryLabel: string;
  categoryIcon: string;
  city: string;
  cityGroup: ExploreCityGroup | 'Other';
  dateLabel: string;
  timeSlot?: string;
  type: 'main' | 'backup' | 'curated';
  highlight?: string;
  priceEstimate?: string;
  mapLink: string;
  rawText: string;
  openLate: boolean;
  walkInFriendly: boolean;
  budgetTier: SpotBudgetTier;
}

export function extractDiningSpots(itinerary: any[]): DiningSpot[] {
  const spots: DiningSpot[] = [];

  itinerary.forEach((item) => {
    if (item.date_label === '__meta_trip_data__') return;

    // Detect City Group across all Japan regions
    const cityGroup = normalizeCityGroup(`${item.city || ''} ${item.main_place || ''}`);

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
        openLate: isSpotOpenLate({ timeSlot: item.time_slot, highlight: item.food_recommendation, category: cat.category }),
        walkInFriendly: isSpotWalkInFriendly({ highlight: item.food_recommendation }),
        budgetTier: inferSpotBudgetTier(item.food_recommendation),
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
            openLate: isSpotOpenLate({ timeSlot: item.time_slot, highlight: clean, category: cat.category }),
            walkInFriendly: isSpotWalkInFriendly({ highlight: clean }),
            budgetTier: inferSpotBudgetTier(clean),
          });
        }
      });
    }
  });

  // 3. Curated recommendations nationwide (Osaka, Kyoto, Nara, Kobe, Tokyo, Fukuoka, Sapporo, Nagoya, Kanazawa)
  CURATED_EXPLORE_SPOTS.filter((s) => s.kind === 'dining').forEach((c) => {
    spots.push({
      id: c.id,
      name: c.name,
      japaneseName: c.japaneseName,
      category: (c.category as any) || 'general',
      categoryLabel: c.categoryLabel,
      categoryIcon: c.categoryIcon,
      city: `${c.city} (${c.area})`,
      cityGroup: c.cityGroup,
      dateLabel: 'นอกแพลนแนะนำ',
      timeSlot: c.recommendedTime,
      type: 'curated',
      highlight: c.highlight,
      priceEstimate: c.priceEstimate,
      mapLink: c.mapLink,
      rawText: `${c.name} ${c.japaneseName || ''} ${c.highlight}`,
      openLate: isSpotOpenLate(c),
      walkInFriendly: isSpotWalkInFriendly(c),
      budgetTier: inferSpotBudgetTier(c.priceEstimate, c.budgetTier),
    });
  });

  return spots;
}

export default function GourmetRadarModal({
  isOpen,
  onClose,
  itinerary = [],
  tripId,
  tripDestination,
  initialCheckedSpots = {},
  onToggleCheckIn,
  onOpenDecisionPicker,
  availableDays = [],
  defaultDay,
  onAddToItinerary,
}: GourmetRadarModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<'all' | ExploreCityGroup | 'Other'>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | DiningSpot['category']>('all');
  const [filterType, setFilterType] = useState<'all' | 'plan' | 'curated' | 'checked'>('all');
  const [onlyOpenLate, setOnlyOpenLate] = useState(false);
  const [onlyWalkIn, setOnlyWalkIn] = useState(false);
  const [budgetFilter, setBudgetFilter] = useState<'all' | SpotBudgetTier>('all');
  const [staffModalSpot, setStaffModalSpot] = useState<DiningSpot | null>(null);
  const [customTargetDay, setTargetDay] = useState<string | null>(null);
  const targetDay = customTargetDay ?? defaultDay ?? availableDays[0] ?? '';

  const prioritizedCities = useMemo(() => {
    const tripCities = detectTripCityGroups(itinerary, tripDestination);
    return [
      ...ALL_JAPAN_CITY_GROUPS.filter((c) => tripCities.includes(c.id)),
      ...ALL_JAPAN_CITY_GROUPS.filter((c) => !tripCities.includes(c.id)),
    ];
  }, [itinerary, tripDestination]);

  // Checked-in / Visited spots tracking
  const [localCheckedOverrides, setLocalCheckedOverrides] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined' && tripId) {
      try {
        const cached = localStorage.getItem(`gourmet_checked_${tripId}`);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return {};
  });

  const checkedSpots = useMemo<Record<string, boolean>>(
    () => ({ ...initialCheckedSpots, ...localCheckedOverrides }),
    [initialCheckedSpots, localCheckedOverrides]
  );

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

      // Filter type
      const isChecked = !!checkedSpots[s.id];
      if (filterType === 'checked' && !isChecked) return false;
      if (filterType === 'plan' && s.type === 'curated') return false;
      if (filterType === 'curated' && s.type !== 'curated') return false;

      // Practical On-Trip filters (Open late, Walk-in, Budget tier)
      if (onlyOpenLate && !s.openLate) return false;
      if (onlyWalkIn && !s.walkInFriendly) return false;
      if (budgetFilter !== 'all' && s.budgetTier !== budgetFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          (s.japaneseName && s.japaneseName.toLowerCase().includes(q)) ||
          s.city.toLowerCase().includes(q) ||
          s.dateLabel.toLowerCase().includes(q) ||
          s.categoryLabel.toLowerCase().includes(q) ||
          (s.highlight && s.highlight.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [allSpots, selectedCity, selectedCategory, filterType, onlyOpenLate, onlyWalkIn, budgetFilter, searchQuery, checkedSpots]);

  const filterKey = `${selectedCity}|${selectedCategory}|${filterType}|${onlyOpenLate}|${onlyWalkIn}|${budgetFilter}|${searchQuery}`;
  const [limitState, setLimitState] = useState<{ key: string; limit: number }>({ key: filterKey, limit: 30 });
  const displayLimit = limitState.key === filterKey ? limitState.limit : 30;

  const visibleSpots = useMemo(() => {
    return filteredSpots.slice(0, displayLimit);
  }, [filteredSpots, displayLimit]);

  const checkedCount = useMemo(() => {
    return Object.values(checkedSpots).filter(Boolean).length;
  }, [checkedSpots]);

  const handleToggleCheck = (spot: DiningSpot) => {
    const nextState = !checkedSpots[spot.id];
    const updated = { ...checkedSpots, [spot.id]: nextState };
    setLocalCheckedOverrides(updated);

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
    <ModalPortal>
      <div 
        className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 overflow-y-auto overscroll-contain overflow-x-hidden animate-in fade-in duration-200 select-none modal-safe-overlay" 
        role="dialog" 
        aria-modal="true"
      >
        <div className="my-auto w-full sm:max-w-3xl rounded-3xl bg-white dark:bg-[#161c27] shadow-2xl border border-slate-200/90 dark:border-[#24324a] flex flex-col max-h-[92dvh] overflow-hidden animate-in zoom-in-95 duration-200 modal-safe-card">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-[#24324a] flex items-center justify-between shrink-0 bg-white/50 dark:bg-[#161c27]/50 backdrop-blur-md">
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
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1a202c] transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-[#24324a] bg-slate-50/70 dark:bg-[#0d131f]/60 space-y-2.5 shrink-0">
          
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาร้านอาหาร, คาเฟ่, ราเมง, ชาเขียว, ย่านช้อปปิ้ง..."
              className="w-full pl-9 pr-4 py-2.5 text-base sm:text-xs font-bold rounded-xl border border-slate-200 dark:border-[#24324a] bg-white dark:bg-[#161c27] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
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

          {/* City Filter Pills (Auto-Prioritized for Current Trip + Nationwide Japan) + Day Selector */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-0.5">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">เมือง:</span>
              <button
                type="button"
                onClick={() => setSelectedCity('all')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer border ${
                  selectedCity === 'all'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white dark:bg-[#161c27] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#24324a] hover:bg-slate-100'
                }`}
              >
                ทั้งหมด
              </button>
              {prioritizedCities.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCity(c.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer border ${
                    selectedCity === c.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white dark:bg-[#161c27] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#24324a] hover:bg-slate-100'
                  }`}
                >
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>

            {onAddToItinerary && availableDays.length > 0 && (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-bold text-slate-400">เพิ่มลง:</span>
                <select
                  value={targetDay}
                  onChange={(e) => setTargetDay(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-[#24324a] bg-white dark:bg-[#161c27] text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                  aria-label="เลือกวันที่จะเพิ่มร้านอาหารลงแผน"
                >
                  {availableDays.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Practical On-Trip Filters: Open Late, Walk-In, Budget Tier */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            <button
              type="button"
              onClick={() => setOnlyOpenLate((v) => !v)}
              aria-pressed={onlyOpenLate}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 transition-all cursor-pointer border ${
                onlyOpenLate
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white dark:bg-[#161c27] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#24324a] hover:border-indigo-400'
              }`}
            >
              <Moon className="h-3 w-3" />
              <span>เปิดดึก (21:00+)</span>
            </button>

            <button
              type="button"
              onClick={() => setOnlyWalkIn((v) => !v)}
              aria-pressed={onlyWalkIn}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 transition-all cursor-pointer border ${
                onlyWalkIn
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white dark:bg-[#161c27] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#24324a] hover:border-emerald-400'
              }`}
            >
              <Sparkles className="h-3 w-3" />
              <span>วอล์กอินได้</span>
            </button>

            <span className="h-4 w-px bg-slate-200 dark:bg-[#24324a] mx-0.5 shrink-0" />

            {[
              { id: 'all', label: 'ทุกงบ' },
              { id: 'budget', label: '💴 ≤¥1,500' },
              { id: 'mid', label: '💴 ¥1,500–3,500' },
              { id: 'premium', label: '💎 พรีเมียม' },
            ].map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBudgetFilter(b.id as any)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 transition-all cursor-pointer border ${
                  budgetFilter === b.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white'
                    : 'bg-white dark:bg-[#161c27] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#24324a] hover:bg-slate-100'
                }`}
              >
                {b.label}
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
                    : 'bg-white dark:bg-[#161c27] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#24324a] hover:bg-slate-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Status Filter Pills (Check-in ⭐) */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-0.5">
            <div className="flex flex-wrap items-center gap-1.5">
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
                onClick={() => setFilterType('plan')}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                  filterType === 'plan' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                🗓️ ในแพลน
              </button>
              <button
                type="button"
                onClick={() => setFilterType('curated')}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                  filterType === 'curated' ? 'bg-amber-600 text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                ⭐ นอกแพลนแนะนำ
              </button>
              <button
                type="button"
                onClick={() => setFilterType('checked')}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  filterType === 'checked' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>✓ แวะแล้ว ({checkedCount})</span>
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
            visibleSpots.map((spot) => {
              const isChecked = !!checkedSpots[spot.id];
              return (
                <div
                  key={spot.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    isChecked
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80 shadow-xs'
                      : 'bg-white dark:bg-[#1a202c] border-slate-200 dark:border-[#24324a] hover:border-blue-400 dark:hover:border-blue-500/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      
                      {/* Badge Row */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-[#0d131f] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#24324a]">
                          {spot.categoryIcon} {spot.categoryLabel}
                        </span>

                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
                          {spot.cityGroup}
                        </span>

                        {spot.type === 'main' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                            ★ แผนหลัก
                          </span>
                        ) : spot.type === 'curated' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
                            ⭐ นอกแพลนแนะนำ
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
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug break-words">
                          {spot.name}
                        </h4>
                        {spot.japaneseName && (
                          <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                            {spot.japaneseName}
                          </p>
                        )}
                      </div>

                      {spot.highlight && (
                        <p className="text-[11px] text-amber-800 dark:text-amber-300/90 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 rounded-lg px-2 py-1 leading-relaxed">
                          💡 {spot.highlight}
                        </p>
                      )}

                      {/* City Detail */}
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate">{spot.city}</span>
                        {spot.priceEstimate && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono ml-1">
                            • {spot.priceEstimate}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Check-in Toggle Star Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleCheck(spot)}
                      className={`p-2 rounded-xl transition-all cursor-pointer shrink-0 border flex flex-col items-center gap-0.5 ${
                        isChecked
                          ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-[#0d131f] text-slate-400 hover:text-amber-500 border-slate-200 dark:border-[#24324a]'
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
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-[#24324a]/80">
                    <span className="text-[10px] text-slate-400 font-medium">
                      {spot.type === 'main' ? 'เมนูแนะนำประจำมื้อ' : spot.type === 'curated' ? 'ร้านแนะนำคัดสรร (เพิ่มเข้าแผนได้)' : 'ร้านสำรองคุณภาพสูงเมื่อคิวยาว'}
                    </span>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setStaffModalSpot(spot)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#161c27] hover:bg-slate-100 dark:hover:bg-[#1a202c] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#24324a] text-xs font-bold transition-all shadow-2xs cursor-pointer"
                        title="แสดงชื่อร้านภาษาญี่ปุ่นตัวใหญ่ให้คนขับแท็กซี่หรือพนักงานดู"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-[#2563eb]" />
                        <span>โชว์พนักงาน</span>
                      </button>

                      {onAddToItinerary && (
                        <button
                          type="button"
                          onClick={() => {
                            onAddToItinerary({
                              title: spot.name,
                              category: spot.categoryLabel,
                              city: spot.cityGroup !== 'Other' ? spot.cityGroup : spot.city,
                              food_recommend: `${spot.name}${spot.highlight ? ` — ${spot.highlight}` : ''}`,
                              mapsQuery: `${spot.name} ${spot.city}`,
                              date_label: targetDay || availableDays[0] || undefined,
                            });
                            onClose();
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>เพิ่มลงแผน{targetDay ? ` (${targetDay})` : ''}</span>
                        </button>
                      )}

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
                </div>
              );
            })
          )}

          {filteredSpots.length > displayLimit && (
            <button
              type="button"
              onClick={() => setLimitState({ key: filterKey, limit: displayLimit + 30 })}
              className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1a202c] dark:hover:bg-[#24324a] text-slate-700 dark:text-slate-300 font-bold text-xs transition-all border border-slate-200 dark:border-[#24324a] cursor-pointer"
            >
              โหลดร้านอาหารเพิ่มเติม (+30 ร้าน) • เหลืออีก {filteredSpots.length - displayLimit} ร้าน
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4 border-t border-slate-100 dark:border-[#24324a] bg-slate-50/80 dark:bg-[#0d131f]/80 flex items-center justify-between gap-2 shrink-0">
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
                className="sm:hidden min-h-[40px] flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs"
              >
                <Dices className="h-3.5 w-3.5" />
                <span>สุ่มมื้อนี้</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="min-h-[40px] px-4 py-1.5 rounded-xl border border-slate-300 dark:border-[#24324a] text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-[#1a202c] cursor-pointer"
            >
              ปิด
            </button>
          </div>
        </div>

      </div>
    </div>
    {staffModalSpot && (
      <ShowToStaffModal
        isOpen={true}
        onClose={() => setStaffModalSpot(null)}
        placeName={staffModalSpot.japaneseName ? `${staffModalSpot.name} (${staffModalSpot.japaneseName})` : staffModalSpot.name}
        city={staffModalSpot.city}
        timeSlot={staffModalSpot.timeSlot}
        mapsUrl={staffModalSpot.mapLink}
        directionsUrl={staffModalSpot.mapLink}
      />
    )}
    </ModalPortal>
  );
}
