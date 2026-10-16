// src/components/DiningDecisionPickerModal.tsx
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  X, Dices, Utensils, MapPin, ExternalLink, 
  RotateCw, Sparkles, Star, ChevronRight, Check, Award, ArrowRight,
  Compass, Eye, ShoppingBag, Landmark, Coffee, Beer, Flame, Train
} from 'lucide-react';
import { toast } from 'sonner';
import { CURATED_EXPLORE_SPOTS, CuratedExploreSpot } from '@/data/curatedExploreSpots';

export interface DecisionItem {
  id: string;
  kind: 'dining' | 'attraction';
  name: string;
  japaneseName?: string;
  category: string;
  categoryLabel: string;
  categoryIcon: string;
  city: string;
  cityGroup: 'Osaka' | 'Kyoto' | 'Nara' | 'Kobe';
  area?: string;
  source: 'itinerary_main' | 'itinerary_backup' | 'curated';
  sourceLabel: string;
  dateLabel?: string;
  timeSlot?: string;
  highlight: string;
  recommendedTime?: string;
  priceEstimate?: string;
  mapLink: string;
}

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
  // Main Toggle: Dining vs Attractions
  const [activeKind, setActiveKind] = useState<'dining' | 'attraction'>('dining');

  // Scope: All vs Curated Only (นอกแพลน) vs Itinerary Only (ในแพลน)
  const [selectedScope, setSelectedScope] = useState<'all' | 'curated' | 'itinerary'>('all');

  // City Filter
  const [selectedCity, setSelectedCity] = useState<'all' | 'Osaka' | 'Kyoto' | 'Nara' | 'Kobe'>(
    (defaultCity as any) || 'all'
  );

  // Category Filter
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyUnvisited, setOnlyUnvisited] = useState(false);

  // Shuffling animation state
  const [isShuffling, setIsShuffling] = useState(false);
  const [pickedItem, setPickedItem] = useState<DecisionItem | null>(null);
  const [backupItems, setBackupItems] = useState<DecisionItem[]>([]);
  const [hasPicked, setHasPicked] = useState(false);
  const [animationIndex, setAnimationIndex] = useState(0);

  const shuffleIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (defaultCity && ['Osaka', 'Kyoto', 'Nara', 'Kobe'].includes(defaultCity)) {
      setSelectedCity(defaultCity as any);
    }
  }, [defaultCity]);

  // Reset category filter when switching between dining and attractions
  useEffect(() => {
    setSelectedCategory('all');
  }, [activeKind]);

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

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (shuffleIntervalRef.current) clearInterval(shuffleIntervalRef.current);
    };
  }, []);

  // 1. Build All Decision Items (Itinerary + Curated Beyond Plan)
  const allDecisionItems = useMemo(() => {
    const items: DecisionItem[] = [];

    // A. Parse Itinerary Items
    itinerary.forEach((item) => {
      if (item.date_label === '__meta_trip_data__') return;

      const cityRaw = (item.city || '').toLowerCase();
      let cityGroup: 'Osaka' | 'Kyoto' | 'Nara' | 'Kobe' = 'Osaka';
      if (cityRaw.includes('kyoto') || cityRaw.includes('เกียวโต') || cityRaw.includes('arashiyama') || cityRaw.includes('uji')) {
        cityGroup = 'Kyoto';
      } else if (cityRaw.includes('nara') || cityRaw.includes('นารา')) {
        cityGroup = 'Nara';
      } else if (cityRaw.includes('kobe') || cityRaw.includes('โกเบ')) {
        cityGroup = 'Kobe';
      }

      // Dining from main food_recommendation
      if (item.food_recommendation && item.food_recommendation.trim().length > 0 && item.food_recommendation !== '-') {
        const text = item.food_recommendation.trim();
        const t = text.toLowerCase();
        let cat = 'general';
        let catLabel = 'อาหารญี่ปุ่นรสเลิศ';
        let catIcon = '🍱';

        if (t.includes('ราเมง') || t.includes('อุด้ง') || t.includes('โซบะ') || t.includes('ramen')) {
          cat = 'ramen'; catLabel = 'ราเมง & เส้น'; catIcon = '🍜';
        } else if (t.includes('เนื้อ') || t.includes('วากิว') || t.includes('สเต๊ก') || t.includes('wagyu') || t.includes('ยากินิกุ')) {
          cat = 'wagyu'; catLabel = 'วากิว & ปิ้งย่าง'; catIcon = '🥩';
        } else if (t.includes('คาเฟ่') || t.includes('กาแฟ') || t.includes('ชาเขียว') || t.includes('ขนม') || t.includes('มัทฉะ')) {
          cat = 'cafe'; catLabel = 'คาเฟ่ & มัทฉะ'; catIcon = '🍵';
        } else if (t.includes('ทาโกะ') || t.includes('โอโคโนมิ') || t.includes('ของทอด') || t.includes('คุชิคัตสึ')) {
          cat = 'street'; catLabel = 'สตรีทฟู้ด & ท้องถิ่น'; catIcon = '🐙';
        } else if (t.includes('อิซากายะ') || t.includes('เบียร์') || t.includes('ยากิโทริ')) {
          cat = 'izakaya'; catLabel = 'อิซากายะ & ดื่มดึก'; catIcon = '🍺';
        }

        const mapLink = (item.food_links && item.food_links[0]) || 
          `https://maps.google.com/?q=${encodeURIComponent(text + ' ' + (item.city || 'Japan'))}`;

        items.push({
          id: `itin_food_${item.id}`,
          kind: 'dining',
          name: text,
          category: cat,
          categoryLabel: catLabel,
          categoryIcon: catIcon,
          city: item.city || 'ญี่ปุ่น',
          cityGroup,
          area: item.city || '',
          source: 'itinerary_main',
          sourceLabel: `แพลนหลัก (${item.date_label || 'ในแพลน'})`,
          dateLabel: item.date_label,
          timeSlot: item.time_slot,
          highlight: `เมนูอาหารแนะนำประจำตารางเที่ยว ${item.date_label} เวลา ${item.time_slot || 'ตลอดวัน'}`,
          mapLink,
        });
      }

      // Attractions from main_place
      if (item.main_place && item.main_place.trim().length > 0) {
        const text = item.main_place.trim();
        const t = text.toLowerCase();
        let cat = 'landmark';
        let catLabel = 'แลนด์มาร์กสำคัญ';
        let catIcon = '📍';

        if (t.includes('วัด') || t.includes('ศาลเจ้า') || t.includes('temple') || t.includes('shrine')) {
          cat = 'temple'; catLabel = 'วัด & ศาลเจ้า'; catIcon = '⛩️';
        } else if (t.includes('ห้าง') || t.includes('ช้อปปิ้ง') || t.includes('ตลาด') || t.includes('market') || t.includes('mall') || t.includes('outlet')) {
          cat = 'shopping'; catLabel = 'ห้าง & แหล่งช้อปปิ้ง'; catIcon = '🛍️';
        } else if (t.includes('น้ำตก') || t.includes('ป่าไผ่') || t.includes('สวน') || t.includes('ภูเขา') || t.includes('park') || t.includes('nature')) {
          cat = 'nature'; catLabel = 'ธรรมชาติ & สวนสวย'; catIcon = '🎋';
        } else if (t.includes('วิว') || t.includes('หอคอย') || t.includes('tower') || t.includes('observatory') || t.includes('sky')) {
          cat = 'viewpoint'; catLabel = 'จุดชมวิวพาโนรามา'; catIcon = '🏙️';
        } else if (t.includes('ปราสาท') || t.includes('โบราณ') || t.includes('เมืองเก่า') || t.includes('ประวัติศาสตร์') || t.includes('castle')) {
          cat = 'culture'; catLabel = 'ประวัติศาสตร์ & วัฒนธรรม'; catIcon = '🏯';
        }

        const mapLink = (item.main_place_links && item.main_place_links[0]) || 
          `https://maps.google.com/?q=${encodeURIComponent(text + ' ' + (item.city || 'Japan'))}`;

        items.push({
          id: `itin_attr_${item.id}`,
          kind: 'attraction',
          name: text,
          category: cat,
          categoryLabel: catLabel,
          categoryIcon: catIcon,
          city: item.city || 'ญี่ปุ่น',
          cityGroup,
          area: item.city || '',
          source: 'itinerary_main',
          sourceLabel: `แพลนหลัก (${item.date_label || 'ในแพลน'})`,
          dateLabel: item.date_label,
          timeSlot: item.time_slot,
          highlight: `จุดหมายปลายทางหลักของวันที่ ${item.date_label} เวลา ${item.time_slot || 'ทั้งวัน'}`,
          mapLink,
        });
      }

      // Parse Backup Plans (both dining and sightseeing lines)
      if (item.backup_plan) {
        const lines = item.backup_plan.split('\n');
        lines.forEach((line: string, lineIdx: number) => {
          const clean = line.replace(/^[•\-\*\d\.\s]+/, '').trim();
          if (!clean) return;

          const isDining = clean.includes('ร้าน') || clean.includes('คาเฟ่') || clean.includes('อาหาร') || clean.includes('ขนม') || clean.includes('ชาเขียว') || clean.includes('มื้อ');
          const isAttraction = clean.includes('ที่เที่ยวสำรอง') || clean.includes('ห้าง') || clean.includes('จุดชมวิว') || clean.includes('แผนสำรอง') || clean.includes('สวน') || clean.includes('ช้อปปิ้ง');

          const bLink = (item.backup_links && item.backup_links[lineIdx]) || 
            `https://maps.google.com/?q=${encodeURIComponent(clean + ' ' + (item.city || 'Japan'))}`;

          if (isDining) {
            items.push({
              id: `itin_b_food_${item.id}_${lineIdx}`,
              kind: 'dining',
              name: clean.replace(/^(ร้านอาหารสำรอง|คาเฟ่สำรอง|ร้านขนมสำรอง|ร้านกาแฟสำรอง)[\s\d:]*/, '').trim() || clean,
              category: clean.includes('คาเฟ่') || clean.includes('ขนม') ? 'cafe' : clean.includes('ราเมง') ? 'ramen' : clean.includes('เนื้อ') || clean.includes('วากิว') ? 'wagyu' : 'general',
              categoryLabel: clean.includes('คาเฟ่') ? 'คาเฟ่ & ขนม' : 'อาหารญี่ปุ่นรสเลิศ',
              categoryIcon: clean.includes('คาเฟ่') ? '🍰' : '🍱',
              city: item.city || 'ญี่ปุ่น',
              cityGroup,
              area: item.city || '',
              source: 'itinerary_backup',
              sourceLabel: `แผนสำรอง (${item.date_label || 'ในแพลน'})`,
              dateLabel: item.date_label,
              highlight: `ทางเลือกสำรองจากตารางวันที่ ${item.date_label}: ${clean}`,
              mapLink: bLink,
            });
          } else if (isAttraction) {
            items.push({
              id: `itin_b_attr_${item.id}_${lineIdx}`,
              kind: 'attraction',
              name: clean.replace(/^(ที่เที่ยวสำรอง|จุดชมวิวสำรอง|ห้างสำรอง|ห้างไอทีสำรอง|แผนสำรอง)[\s\d:]*/, '').trim() || clean,
              category: clean.includes('ห้าง') ? 'shopping' : clean.includes('วิว') ? 'viewpoint' : 'landmark',
              categoryLabel: clean.includes('ห้าง') ? 'ห้าง & แหล่งช้อปปิ้ง' : 'ที่เที่ยวสำรอง',
              categoryIcon: clean.includes('ห้าง') ? '🛍️' : '🗺️',
              city: item.city || 'ญี่ปุ่น',
              cityGroup,
              area: item.city || '',
              source: 'itinerary_backup',
              sourceLabel: `แผนสำรอง (${item.date_label || 'ในแพลน'})`,
              dateLabel: item.date_label,
              highlight: `ที่เที่ยวและจุดเช็กอินสำรองของวันที่ ${item.date_label}: ${clean}`,
              mapLink: bLink,
            });
          }
        });
      }
    });

    // B. Add Curated Gems Beyond Plan (CURATED_EXPLORE_SPOTS)
    CURATED_EXPLORE_SPOTS.forEach((spot) => {
      items.push({
        id: spot.id,
        kind: spot.kind,
        name: spot.name,
        japaneseName: spot.japaneseName,
        category: spot.category,
        categoryLabel: spot.categoryLabel,
        categoryIcon: spot.categoryIcon,
        city: spot.city,
        cityGroup: spot.cityGroup,
        area: spot.area,
        source: 'curated',
        sourceLabel: spot.kind === 'dining' ? '⭐ ร้านเด็ดแนะนำนอกแพลน' : '🌟 จุดเช็กอินแนะนำนอกแพลน',
        highlight: spot.highlight,
        recommendedTime: spot.recommendedTime,
        priceEstimate: spot.priceEstimate,
        mapLink: spot.mapLink,
      });
    });

    return items;
  }, [itinerary]);

  // 2. Filter Pool
  const pool = useMemo(() => {
    return allDecisionItems.filter((item) => {
      // Kind Filter: dining vs attraction
      if (item.kind !== activeKind) return false;

      // Scope Filter: all vs curated vs itinerary
      if (selectedScope === 'curated' && item.source !== 'curated') return false;
      if (selectedScope === 'itinerary' && item.source === 'curated') return false;

      // City Filter
      if (selectedCity !== 'all' && item.cityGroup !== selectedCity) return false;

      // Category Filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;

      // Unvisited Filter
      if (onlyUnvisited && checkedSpots[item.id]) return false;

      return true;
    });
  }, [allDecisionItems, activeKind, selectedScope, selectedCity, selectedCategory, onlyUnvisited, checkedSpots]);

  // 3. Category options for the current kind
  const categoryOptions = useMemo(() => {
    if (activeKind === 'dining') {
      return [
        { key: 'all', label: 'ทุกหมวดอาหาร', icon: '🍽️' },
        { key: 'ramen', label: 'ราเมง & เส้น', icon: '🍜' },
        { key: 'wagyu', label: 'วากิว & ปิ้งย่าง', icon: '🥩' },
        { key: 'cafe', label: 'คาเฟ่ & มัทฉะ', icon: '🍵' },
        { key: 'street', label: 'สตรีทฟู้ด & โอโคโนมิยากิ', icon: '🐙' },
        { key: 'izakaya', label: 'อิซากายะ & ดื่มดึก', icon: '🍺' },
        { key: 'general', label: 'อาหารญี่ปุ่นรสเลิศ', icon: '🍱' },
      ];
    } else {
      return [
        { key: 'all', label: 'ทุกประเภทที่เที่ยว', icon: '🗺️' },
        { key: 'shopping', label: 'ห้าง & ช้อปปิ้ง (Yodobashi ฯลฯ)', icon: '🛍️' },
        { key: 'viewpoint', label: 'จุดชมวิวพาโนรามา (Sky Building ฯลฯ)', icon: '🏙️' },
        { key: 'temple', label: 'วัด & ศาลเจ้ามรดกโลก', icon: '⛩️' },
        { key: 'landmark', label: 'แลนด์มาร์กยอดฮิต', icon: '📍' },
        { key: 'nature', label: 'ธรรมชาติ & สวน/ป่าไผ่', icon: '🎋' },
        { key: 'culture', label: 'เมืองเก่า & วัฒนธรรม', icon: '🏮' },
      ];
    }
  }, [activeKind]);

  const winnerSectionRef = useRef<HTMLDivElement>(null);

  // Handle Pick Random with card shuffle animation
  const handlePickRandom = () => {
    if (pool.length === 0) {
      toast.error('ไม่พบรายการตามตัวกรองที่เลือก กรุณาปรับเปลี่ยนเงื่อนไข');
      return;
    }

    setIsShuffling(true);
    setHasPicked(false);

    let counter = 0;
    const maxSteps = 16;
    const speed = 75;

    if (shuffleIntervalRef.current) clearInterval(shuffleIntervalRef.current);

    shuffleIntervalRef.current = setInterval(() => {
      counter++;
      const randomIdx = Math.floor(Math.random() * pool.length);
      setAnimationIndex(randomIdx);

      if (counter >= maxSteps) {
        if (shuffleIntervalRef.current) clearInterval(shuffleIntervalRef.current);

        const shuffled = [...pool].sort(() => 0.5 - Math.random());
        const winner = shuffled[0];
        const backups = shuffled.slice(1, 3);

        setPickedItem(winner);
        setBackupItems(backups);
        setIsShuffling(false);
        setHasPicked(true);
        toast.success(`สุ่มได้: ${winner.name.slice(0, 32)} ✨`);
        setTimeout(() => {
          winnerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 80);
      }
    }, speed);
  };

  if (!isOpen) return null;

  const currentFlashing = pool[animationIndex] || pool[0];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 overscroll-contain overflow-x-hidden animate-in fade-in duration-200 select-none modal-safe-overlay" 
      role="dialog" 
      aria-modal="true"
    >
      <div className="w-full sm:max-w-xl rounded-3xl bg-white dark:bg-[#151b2b] shadow-2xl border border-slate-200/90 dark:border-[#222c42] flex flex-col max-h-[92dvh] overflow-hidden animate-in zoom-in-95 duration-200 modal-safe-card">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-[#222c42] flex items-center justify-between shrink-0 bg-white/50 dark:bg-[#151b2b]/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
              <Dices className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Decision Concierge</span>
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/70 px-2 py-0.5 rounded-full font-mono">
                  Smart Randomizer
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                สุ่มร้านอาหาร คาเฟ่ และที่เที่ยวเด็ด ทั้งในแพลนทริป & ลิสต์พิเศษนอกแพลน
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-[#1c2438] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          
          {/* Main Mode Toggle: Dining vs Attractions */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-[#101420] rounded-2xl border border-slate-200 dark:border-[#1e2638]">
            <button
              type="button"
              onClick={() => setActiveKind('dining')}
              className={`py-2 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeKind === 'dining'
                  ? 'bg-white dark:bg-[#1a2234] text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/80 dark:border-[#2a364f]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Utensils className="h-3.5 w-3.5" />
              <span>สุ่มร้านอาหาร & คาเฟ่ ({allDecisionItems.filter(i => i.kind === 'dining').length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveKind('attraction')}
              className={`py-2 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeKind === 'attraction'
                  ? 'bg-white dark:bg-[#1a2234] text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/80 dark:border-[#2a364f]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              <span>สุ่มที่เที่ยว & ช้อปปิ้ง ({allDecisionItems.filter(i => i.kind === 'attraction').length})</span>
            </button>
          </div>

          {/* Scope Filter: All vs Curated Only (นอกแพลน) vs Itinerary Only (ในแพลน) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>ขอบเขตข้อมูลที่ต้องการสุ่ม:</span>
              <span className="text-blue-600 dark:text-blue-400 font-mono text-[10.5px]">
                พบ {pool.length} ตัวเลือก
              </span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedScope('all')}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  selectedScope === 'all'
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800 shadow-2xs'
                    : 'bg-white dark:bg-[#161c2b] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-[#222c42] hover:border-slate-300'
                }`}
              >
                ✨ รวมทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => setSelectedScope('curated')}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  selectedScope === 'curated'
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800 shadow-2xs'
                    : 'bg-white dark:bg-[#161c2b] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-[#222c42] hover:border-slate-300'
                }`}
                title="สุ่มเฉพาะร้านดัง/ที่เที่ยวนอกแพลน เช่น Yodobashi, Kiji Okonomiyaki, Harbs"
              >
                ⭐ นอกแพลนแนะนำ
              </button>
              <button
                type="button"
                onClick={() => setSelectedScope('itinerary')}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  selectedScope === 'itinerary'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800 shadow-2xs'
                    : 'bg-white dark:bg-[#161c2b] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-[#222c42] hover:border-slate-300'
                }`}
                title="สุ่มเฉพาะร้านและที่เที่ยวในแพลน 42 รายการ & แผนสำรอง"
              >
                🗓️ ในแพลนเที่ยว
              </button>
            </div>
          </div>

          {/* City Filter Pills */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              เลือกเมือง / โซน:
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { key: 'all', label: 'ทุกเมือง' },
                { key: 'Osaka', label: 'Osaka / Umeda' },
                { key: 'Kyoto', label: 'Kyoto' },
                { key: 'Nara', label: 'Nara' },
                { key: 'Kobe', label: 'Kobe' },
              ].map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setSelectedCity(c.key as any)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    selectedCity === c.key
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-[#1c2438] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#253048]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              หมวดหมู่{activeKind === 'dining' ? 'อาหาร & คาเฟ่' : 'สถานที่ & สไตล์เที่ยว'}:
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {categoryOptions.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    selectedCategory === cat.key
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 dark:bg-[#1c2438] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#253048]'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Shuffling Screen or Result Card */}
          {isShuffling ? (
            /* Card Shuffling Animation */
            <div className="p-6 rounded-3xl bg-gradient-to-b from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-500/20 text-center space-y-3 animate-pulse">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30 animate-spin">
                <Dices className="h-6 w-6" />
              </div>
              <p className="text-xs font-black tracking-widest text-blue-600 dark:text-blue-400 uppercase">
                กำลังสุ่มเลือกอย่างยุติธรรม...
              </p>
              {currentFlashing && (
                <div className="p-3 rounded-2xl bg-white dark:bg-[#161c2b] border border-slate-200 dark:border-[#222c42] shadow-sm max-w-sm mx-auto">
                  <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                    {currentFlashing.name}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {currentFlashing.categoryIcon} {currentFlashing.categoryLabel} • {currentFlashing.city}
                  </span>
                </div>
              )}
            </div>
          ) : hasPicked && pickedItem ? (
            /* Picked Winner Result Card */
            <div ref={winnerSectionRef} className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
              
              {/* Winner Header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-1 uppercase tracking-wider">
                  <Award className="h-4 w-4" />
                  <span>ผลการสุ่มอันดับ 1 (Top Pick)</span>
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  pickedItem.source === 'curated'
                    ? 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                    : 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                }`}>
                  {pickedItem.sourceLabel}
                </span>
              </div>

              {/* Main Winner Card */}
              <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10 border-2 border-blue-500/30 dark:border-blue-400/40 shadow-xl space-y-3 relative overflow-hidden">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
                      <span>{pickedItem.categoryIcon}</span>
                      <span>{pickedItem.categoryLabel}</span>
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white pt-1.5 leading-snug">
                      {pickedItem.name}
                    </h3>
                    {pickedItem.japaneseName && (
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 font-mono">
                        {pickedItem.japaneseName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium flex-wrap">
                  <span className="flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span>{pickedItem.city}</span>
                  </span>
                  {pickedItem.area && (
                    <span className="text-[11px] text-slate-400">• {pickedItem.area}</span>
                  )}
                  {pickedItem.priceEstimate && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">• งบ {pickedItem.priceEstimate}</span>
                  )}
                </div>

                {pickedItem.highlight && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-[#131927]/70 p-3 rounded-2xl border border-slate-200/60 dark:border-[#222c42] leading-relaxed">
                    {pickedItem.highlight}
                  </p>
                )}

                {/* Direct Google Maps Action Button */}
                <div className="pt-1">
                  <a
                    href={pickedItem.mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>เปิดดูตำแหน่ง & นำทางบน Google Maps</span>
                  </a>
                </div>
              </div>

              {/* 2 Alternate Backup Options */}
              {backupItems.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    ทางเลือกสำรองเพิ่มเติม (เผื่อคิวยาว หรืออยากเปลี่ยนใจ):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {backupItems.map((b, idx) => (
                      <div 
                        key={b.id || idx}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-[#161c2b] border border-slate-200 dark:border-[#222c42] flex flex-col justify-between space-y-1.5"
                      >
                        <div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400 font-mono font-bold">ตัวเลือก {idx + 2}</span>
                            <span className="text-blue-600 dark:text-blue-400 font-semibold truncate max-w-[100px]">{b.categoryLabel}</span>
                          </div>
                          <h4 className="text-xs font-black text-slate-900 dark:text-white line-clamp-1 pt-0.5">
                            {b.name}
                          </h4>
                          <p className="text-[10.5px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            {b.city} {b.area ? `• ${b.area}` : ''}
                          </p>
                        </div>
                        <a
                          href={b.mapLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10.5px] font-bold text-blue-600 dark:text-blue-400 hover:underline pt-1"
                        >
                          <span>ดูแผนที่</span>
                          <ArrowRight className="h-3 w-3" />
                        </a>
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
                {activeKind === 'dining' ? <Utensils className="h-6 w-6" /> : <Compass className="h-6 w-6" />}
              </div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                พร้อมสุ่ม{activeKind === 'dining' ? 'ร้านอาหาร & คาเฟ่' : 'ที่เที่ยว & จุดเช็กอิน'}แล้วหรือยัง?
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                กดปุ่มด้านล่างเพื่อสุ่มตัวเลือกจาก {pool.length} รายการ (มีทั้งในแพลนทริปและร้าน/ที่เที่ยวนอกแพลนแนะนำ)
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
              ดูเรดาร์ของกิน
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
              <span>
                {hasPicked 
                  ? 'สุ่มใหม่อีกครั้ง' 
                  : activeKind === 'dining' 
                    ? 'สุ่มร้านอาหารทันที' 
                    : 'สุ่มที่เที่ยวทันที'
                }
              </span>
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
