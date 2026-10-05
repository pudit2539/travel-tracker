// src/components/WishlistDrawer.tsx
'use client';

import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { 
  X, Plus, Search, MapPin, Tag, ExternalLink, 
  Trash2, Sparkles, Utensils, ShoppingBag, Camera, 
  Coffee, Compass, Check, ArrowRight, DollarSign,
  Heart, BookmarkCheck
} from 'lucide-react';
import { triggerConfetti } from '@/lib/confetti';

export interface WishlistItem {
  id: string;
  title: string;
  japaneseTitle?: string;
  category: 'food' | 'shopping' | 'sight' | 'cafe';
  district: string;
  costEstimate: string;
  highlight: string;
  isCurated?: boolean;
}

const CURATED_JAPAN_WISHLIST: WishlistItem[] = [
  {
    id: 'w-motomura',
    title: 'Gyukatsu Motomura (เนื้อชุบแป้งทอดเตาหิน)',
    japaneseTitle: '牛かつ もと村',
    category: 'food',
    district: 'Shibuya / Shinjuku / Namba',
    costEstimate: '¥1,900 - ¥2,800',
    highlight: 'เนื้อวัวพรีเมียมชุบเกล็ดขนมปัง ย่างบนเตาหินร้อนส่วนตัว นุ่มละลายในปาก รอคิวคุ้มค่า',
    isCurated: true,
  },
  {
    id: 'w-ichiran',
    title: 'Ichiran Ramen (ราเมงข้อสอบ)',
    japaneseTitle: '一蘭 ラーメン',
    category: 'food',
    district: 'Shinjuku / Shibuya / Dotonbori',
    costEstimate: '¥1,100 - ¥1,800',
    highlight: 'น้ำซุปทงคัตสึเข้มข้น โต๊ะเดี่ยวมีฉากกั้น เลือกระดับความนุ่มเส้นและความเผ็ดได้ตามใจ 24 ชม.',
    isCurated: true,
  },
  {
    id: 'w-kura',
    title: 'Kura Sushi Global Flagship (ซูชิสายพาน 100 เยน)',
    japaneseTitle: 'くら寿司 グローバル旗艦店',
    category: 'food',
    district: 'Asakusa / Ginza / Dotonbori',
    costEstimate: '¥1,200 - ¥2,500',
    highlight: 'ทานครบทุก 5 จาน หยอดลงช่องรับสิทธิ์หมุนตู้เกมกาชาปอง Bikkura-Pon ลุ้นโมเดลลิมิเต็ด',
    isCurated: true,
  },
  {
    id: 'w-harbs',
    title: 'HARBS Mille Crepes (เครปเค้กผลไม้สด)',
    japaneseTitle: 'ハーブス ミルクレープ',
    category: 'cafe',
    district: 'Lumine Shinjuku / Roppongi Hills',
    costEstimate: '¥1,050 - ¥1,800',
    highlight: 'เค้กเครปผลไม้สด 6 ชั้นในตำนาน เมลอน สตรอว์เบอร์รี กล้วย ครีมสดละมุนไม่หวานเลี่ยน',
    isCurated: true,
  },
  {
    id: 'w-torikizoku',
    title: 'Torikizoku (ยากิโทริขวัญใจคนนอนดึก 370 เยน)',
    japaneseTitle: '鳥貴族',
    category: 'food',
    district: 'ทุกสถานีทั่วโตเกียว / โอซาก้า',
    costEstimate: '¥1,500 - ¥2,500',
    highlight: 'ไก่ย่างยากิโทริชิ้นโตและเครื่องดื่มทุกเมนู ราคาเดียว 370 เยนทั้งร้าน เมนูภาษาอังกฤษสั่งง่าย',
    isCurated: true,
  },
  {
    id: 'w-bluebottle',
    title: 'Blue Bottle Coffee (กาแฟดริปสไตล์มินิมอล)',
    japaneseTitle: 'ブルーボトルコーヒー',
    category: 'cafe',
    district: 'Kiyosumi / Omotesando / Kyoto',
    costEstimate: '¥600 - ¥1,100',
    highlight: 'กาแฟ Single Origin ดริปแก้วต่อแก้ว พร้อมเบเกอรีวาฟเฟิลอบร้อน บรรยากาศผ่อนคลาย',
    isCurated: true,
  },
  {
    id: 'w-gashapon',
    title: 'Gashapon Bandai Official (ดงตู้กาชาปอง 3,000 ตู้)',
    japaneseTitle: 'ガシャポン バンダイオフィシャルショップ',
    category: 'shopping',
    district: 'Ikebukuro Sunshine City',
    costEstimate: '¥300 - ¥1,000 / หมุน',
    highlight: 'ศูนย์รวมตู้กาชาปองที่ใหญ่ที่สุดในโลก ทั้งอนิเมะ โมเดลสัตว์ ของสะสมจิ๋ว มีเหรียญให้แลกเพียบ',
    isCurated: true,
  },
  {
    id: 'w-donki',
    title: 'Mega Don Quijote (ห้างดองกี้ 24 ชม. Tax-Free)',
    japaneseTitle: 'MEGA ドン・キホーテ',
    category: 'shopping',
    district: 'Shibuya / Dotonbori / Akihabara',
    costEstimate: '¥3,000 - ¥20,000',
    highlight: 'แหล่งช้อปปิ้งของฝาก ขนมญี่ปุ่น คอสเมติก ยา แผ่นแปะแก้ปวด เปิด 24 ชม. เคาน์เตอร์ Tax-Free ครบ',
    isCurated: true,
  },
  {
    id: 'w-pokemon',
    title: 'Pokemon Center Mega Tokyo (โปเกมอนเซ็นเตอร์)',
    japaneseTitle: 'ポケモンセンター メガトウキョー',
    category: 'shopping',
    district: 'Ikebukuro / Kyoto / Osaka DX',
    costEstimate: '¥1,000 - ¥8,000',
    highlight: 'ตุ๊กตาโปเกมอนและของที่ระลึกเวอร์ชันพิเศษ มีตู้กาชาปองและการ์ดเกมให้สะสม',
    isCurated: true,
  },
  {
    id: 'w-shibuyasky',
    title: 'SHIBUYA SKY (จุดชมวิวดาดฟ้า 360 องศา)',
    japaneseTitle: '渋谷スカイ 展望台',
    category: 'sight',
    district: 'Shibuya Scramble Square',
    costEstimate: '¥2,200 - ¥2,500',
    highlight: 'ดาดฟ้าชั้น 47 มองเห็นห้าแยกชิบูย่าและภูเขาไฟฟูจิ แนะนำรอบพระอาทิตย์ตกดิน สวยสะกดตา',
    isCurated: true,
  },
  {
    id: 'w-teamlab',
    title: 'teamLab Planets (พิพิธภัณฑ์ศิลปะดิจิทัลลุยน้ำ)',
    japaneseTitle: 'チームラボ プラเนッツ',
    category: 'sight',
    district: 'Toyosu Tokyo',
    costEstimate: '¥3,800 - ¥4,200',
    highlight: 'ถอดรองเท้าเดินลุยน้ำ โดมกระจกคริสตัล ดอกไม้ลอยฟ้า ประสบการณ์แสงสีที่ถ่ายรูปสวยที่สุด',
    isCurated: true,
  },
  {
    id: 'w-fushimi',
    title: 'Fushimi Inari Taisha (เสาโทริอิหมื่นต้น)',
    japaneseTitle: '伏見稲荷大社',
    category: 'sight',
    district: 'Kyoto',
    costEstimate: 'เข้าชมฟรี',
    highlight: 'อุโมงค์เสาโทริอิสีส้มแดงทอดยาวขึ้นภูเขา แนะนำไปช่วงเช้าตรู่ 07:00 คนไม่เยอะ ได้รูปสวย',
    isCurated: true,
  },
];

interface WishlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  selectedDay: string;
  availableDays: string[];
  onAddToItinerary: (item: { title: string; category: string; location: string; budget?: number }) => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function WishlistDrawer({
  isOpen,
  onClose,
  tripId,
  selectedDay,
  availableDays = [],
  onAddToItinerary,
  onShowToast,
}: WishlistDrawerProps) {
  const [items, setItems] = useState<WishlistItem[]>(CURATED_JAPAN_WISHLIST);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'food' | 'shopping' | 'sight' | 'cafe'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);

  // New Custom Wishlist Item State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDistrict, setNewDistrict] = useState('');
  const [newCategory, setNewCategory] = useState<'food' | 'shopping' | 'sight' | 'cafe'>('food');
  const [newCost, setNewCost] = useState('');
  const [newHighlight, setNewHighlight] = useState('');

  // Target day to add into
  const targetDay = selectedDay === 'all' ? (availableDays[0] || 'Day 1') : selectedDay;

  // Load / Save items from LocalStorage
  useEffect(() => {
    if (tripId && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`trip_wishlist_${tripId}`);
        if (raw) {
          const userItems: WishlistItem[] = JSON.parse(raw);
          // Combine user custom items with curated items
          setItems([...userItems, ...CURATED_JAPAN_WISHLIST]);
        }
      } catch {}
    }
  }, [tripId]);

  const handleSaveCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: WishlistItem = {
      id: `custom-w-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      district: newDistrict.trim() || 'Japan',
      costEstimate: newCost.trim() || '¥1,000',
      highlight: newHighlight.trim() || 'ร้านเด็ดที่เซฟไว้',
      isCurated: false,
    };

    const updated = [newItem, ...items];
    setItems(updated);

    // Save only custom items to LocalStorage
    if (tripId && typeof window !== 'undefined') {
      try {
        const userCustomOnly = updated.filter((i) => !i.isCurated);
        localStorage.setItem(`trip_wishlist_${tripId}`, JSON.stringify(userCustomOnly));
      } catch {}
    }

    triggerConfetti();
    if (onShowToast) onShowToast(`บันทึก "${newItem.title}" ลงใน Wishlist แล้ว ✨`, 'success');
    setShowAddModal(false);
    setNewTitle('');
    setNewDistrict('');
    setNewCost('');
    setNewHighlight('');
  };

  const handleDeleteCustomItem = (id: string) => {
    const updated = items.filter((i) => i.id !== id);
    setItems(updated);
    if (tripId && typeof window !== 'undefined') {
      try {
        const userCustomOnly = updated.filter((i) => !i.isCurated);
        localStorage.setItem(`trip_wishlist_${tripId}`, JSON.stringify(userCustomOnly));
      } catch {}
    }
  };

  const handleAddDirectlyToDay = (item: WishlistItem) => {
    const categoryMap: Record<string, string> = {
      food: 'meal',
      cafe: 'meal',
      shopping: 'shopping',
      sight: 'sightseeing',
    };

    onAddToItinerary({
      title: item.title,
      category: categoryMap[item.category] || 'other',
      location: item.district,
    });

    triggerConfetti();
    if (onShowToast) onShowToast(`🎉 เพิ่ม "${item.title}" เข้าในแพลน ${targetDay} แล้ว!`, 'success');
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (deferredSearch.trim()) {
        const q = deferredSearch.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.district.toLowerCase().includes(q) ||
          (item.japaneseTitle && item.japaneseTitle.includes(q)) ||
          item.highlight.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, categoryFilter, deferredSearch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#181a20] shadow-2xl border border-slate-200/90 dark:border-[#262932] max-h-[88vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
        
        {/* Mobile Sheet Handle */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Header */}
        <div className="px-4 sm:px-6 pt-4 pb-3 flex items-center justify-between border-b border-slate-100 dark:border-[#262932] bg-white/80 dark:bg-[#181a20]/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center text-lg shadow-sm shadow-amber-500/20 shrink-0">
              🍜
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  Wishlist ร้านเด็ด & พิกัดนอกแพลน
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                  {items.length} พิกัด
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                ร้านดังของกิน & ช้อปปิ้งที่เซฟไว้ แตะ 1 ครั้งเพื่อดึงเข้าแพลนวันเที่ยว
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-2.5 py-1.5 rounded-xl bg-[#e79b71] hover:bg-[#d98254] text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>เพิ่มร้านเอง</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#262932] transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="p-4 sm:px-6 pb-2 space-y-2 border-b border-slate-100 dark:border-[#262932] bg-slate-50/70 dark:bg-[#15171e]/70 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาร้าน เช่น ราเมง, ซูชิ, ดองกี้, ชิบูย่า, teamLab..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-[#2b2f3d] bg-white dark:bg-[#181a20] text-slate-900 dark:text-white text-xs outline-none focus:border-[#e79b71] font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {[
              { id: 'all', label: `ทั้งหมด (${items.length})` },
              { id: 'food', label: '🍜 ของกิน & ร้านอาหาร' },
              { id: 'shopping', label: '🛍️ ช้อปปิ้ง & กาชาปอง' },
              { id: 'sight', label: '⛩️ จุดถ่ายรูป & เที่ยว' },
              { id: 'cafe', label: '☕ คาเฟ่ & ขนมหวาน' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id as any)}
                className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  categoryFilter === cat.id
                    ? 'bg-[#e79b71] text-white shadow-xs'
                    : 'bg-white dark:bg-[#181a20] border border-slate-200 dark:border-[#2b2f3d] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Wishlist Items List */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-[#262932] bg-white dark:bg-[#1f222e] hover:border-[#e79b71]/60 transition-all shadow-2xs group space-y-2.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#e79b71]/15 text-[#d98254] dark:text-[#f2a278]">
                      {item.category === 'food' ? '🍜 อาหาร' : item.category === 'shopping' ? '🛍️ ช้อปปิ้ง' : item.category === 'sight' ? '⛩️ ท่องเที่ยว' : '☕ คาเฟ่'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-[#e79b71]" />
                      <span>{item.district}</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {item.costEstimate}
                    </span>
                  </div>

                  <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    {item.title}
                  </h4>

                  {item.japaneseTitle && (
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 font-mono">
                      {item.japaneseTitle}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.title} ${item.district}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-[#2b2f3d] rounded-xl transition-colors cursor-pointer"
                    title="เปิดดูใน Google Maps"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>

                  {!item.isCurated && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomItem(item.id)}
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer"
                      title="ลบออกจาก Wishlist"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Highlight / Tip */}
              <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#181a20] p-2.5 rounded-xl leading-relaxed border border-slate-100 dark:border-[#2b2f3d]">
                💡 {item.highlight}
              </p>

              {/* Action: Add to Day Plan */}
              <button
                type="button"
                onClick={() => handleAddDirectlyToDay(item)}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#e79b71] to-amber-500 hover:from-[#d98254] hover:to-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ เพิ่มเข้าแพลน {targetDay} ทันที</span>
              </button>
            </div>
          ))}
        </div>

      </div>

      {/* Add Custom Wishlist Item Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 p-4 animate-in fade-in"
          onClick={() => setShowAddModal(false)}
        >
          <div 
            className="w-full max-w-md bg-white dark:bg-[#181a20] rounded-3xl p-5 sm:p-6 space-y-4 border border-slate-200 dark:border-[#262932] shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-[#262932]">
              <span className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <BookmarkCheck className="h-4 w-4 text-[#e79b71]" />
                <span>เพิ่มร้านเด็ดใน Wishlist</span>
              </span>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomItem} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                  ชื่อร้านค้า / พิกัด *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ราเมงข้อสอบ Shinjuku, คาเฟ่แมว"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#2b2f3d] bg-white dark:bg-[#15171e] text-xs font-bold outline-none focus:border-[#e79b71]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">หมวดหมู่</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#2b2f3d] bg-white dark:bg-[#15171e] text-xs font-bold cursor-pointer"
                  >
                    <option value="food">🍜 ของกิน / อาหาร</option>
                    <option value="cafe">☕ คาเฟ่ / ขนม</option>
                    <option value="shopping">🛍️ ช้อปปิ้ง</option>
                    <option value="sight">⛩️ ท่องเที่ยว / ถ่ายรูป</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">ย่าน / เมือง</label>
                  <input
                    type="text"
                    placeholder="เช่น Shibuya, Osaka"
                    value={newDistrict}
                    onChange={(e) => setNewDistrict(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#2b2f3d] bg-white dark:bg-[#15171e] text-xs font-bold outline-none focus:border-[#e79b71]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">ราคาเฉลี่ยโดยประมาณ</label>
                <input
                  type="text"
                  placeholder="เช่น ¥1,500 - ¥2,000"
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#2b2f3d] bg-white dark:bg-[#15171e] text-xs font-bold outline-none focus:border-[#e79b71]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">โน้ต / ไฮไลท์เด็ด</label>
                <textarea
                  rows={2}
                  placeholder="เช่น เมนูแนะนำคือข้าวหน้าเนื้อ, ต้องจองก่อน 1 วัน..."
                  value={newHighlight}
                  onChange={(e) => setNewHighlight(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#2b2f3d] bg-white dark:bg-[#15171e] text-xs font-medium outline-none focus:border-[#e79b71]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#e79b71] hover:bg-[#d98254] text-white font-bold text-xs shadow-md shadow-[#e79b71]/20 cursor-pointer transition-all active:scale-95"
              >
                บันทึกลง Wishlist
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

