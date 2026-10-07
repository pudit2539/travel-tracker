// src/components/PackingChecklistModal.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Luggage, Check, Plus, Trash2, X, Sparkles, 
  CloudSun, Snowflake, Sun, CloudRain, Wind,
  ShieldCheck, Smartphone, Pill, Shirt, PlusCircle, 
  CheckCircle2, Circle, ArrowRight, Thermometer, Layers
} from 'lucide-react';
import { triggerConfetti } from '@/lib/confetti';

export interface ChecklistItem {
  id: string;
  category: 'docs' | 'tech' | 'health' | 'cloth' | 'custom';
  title: string;
  checked: boolean;
  isAiSuggested?: boolean;
  weatherTag?: string;
  assignee?: string;
}

const DEFAULT_PACKING_ITEMS: Omit<ChecklistItem, 'id'>[] = [
  // 1. Documents
  { category: 'docs', title: 'หนังสือเดินทาง (Passport) อายุเหลือเกิน 6 เดือน', checked: false },
  { category: 'docs', title: 'ลงทะเบียน Visit Japan Web (QR Code เข้าเมือง/ศุลกากร)', checked: false },
  { category: 'docs', title: 'กรมธรรม์ประกันการเดินทางต่างประเทศ (Travel Insurance)', checked: false },
  { category: 'docs', title: 'ตั๋วเครื่องบิน E-Ticket & ใบจองโรงแรมทุกคืน', checked: false },
  { category: 'docs', title: 'บัตรเครดิต / Travel Card (YouTrip, Boarding Card, KBank)', checked: false },

  // 2. Tech
  { category: 'tech', title: 'eSIM หรือ ซิมเน็ตโรมมิ่ง / Pocket WiFi', checked: false },
  { category: 'tech', title: 'Power Bank (แบตสำรอง พกขึ้นเครื่อง ห้ามโหลดใต้เครื่อง)', checked: false },
  { category: 'tech', title: 'หัวแปลงปลั๊กไฟ (Adapter สำหรับประเทศปลายทาง)', checked: false },
  { category: 'tech', title: 'สายชาร์จมือถือ & กล้องถ่ายรูป', checked: false },

  // 3. Health & Personal Care
  { category: 'health', title: 'ยาประจำตัว + ยาแก้หวัด/แก้แพ้/ยาแก้ปวดพารา', checked: false },
  { category: 'health', title: 'แผ่นแปะแก้ปวดเมื่อยขา/เท้า (สำหรับการเดินชมเมือง)', checked: false },
  { category: 'health', title: 'ลิปมัน & ครีมทาผิวบำรุงความชุ่มชื้น', checked: false },

  // 4. Clothes
  { category: 'cloth', title: 'เสื้อโค้ท / เสื้อแจ็คเก็ตกันลม', checked: false },
  { category: 'cloth', title: 'รองเท้าผ้าใบเดินสบาย (เดินวันละ 15,000-20,000 ก้าว)', checked: false },
  { category: 'cloth', title: 'ร่มพับน้ำหนักเบา หรือ เสื้อกันฝน', checked: false },
];

type WeatherProfile = 'cold' | 'cool' | 'warm' | 'rain';

interface WeatherPreset {
  id: WeatherProfile;
  label: string;
  temp: string;
  icon: typeof Snowflake;
  advice: string;
  items: Omit<ChecklistItem, 'id'>[];
}

const WEATHER_PRESETS: Record<WeatherProfile, WeatherPreset> = {
  cold: {
    id: 'cold',
    label: 'หนาวจัด / หิมะ',
    temp: '-2°C ถึง 7°C',
    icon: Snowflake,
    advice: 'อากาศหนาวแห้งและมีลมเย็น แนะนำสวมใส่แบบ Layering พร้อมเสื้อโค้ทกันลม และพกแผ่นร้อน Kairo',
    items: [
      { category: 'cloth', title: 'เสื้อฮีทเทค (Heattech Extra/Ultra Warm) 2-3 ตัว', checked: false, isAiSuggested: true, weatherTag: 'หนาวจัด' },
      { category: 'health', title: 'แผ่นแปะร้อนกันหนาว (Kairo) พกติดตัวและแปะเท้า', checked: false, isAiSuggested: true, weatherTag: 'หนาวจัด' },
      { category: 'cloth', title: 'เสื้อโค้ท / ดาวน์แจ็คเก็ตขนเป็ดกันลมหนาว', checked: false, isAiSuggested: true, weatherTag: 'หนาวจัด' },
      { category: 'cloth', title: 'ถุงมือทัชสกรีน & ผ้าพันคอเนื้อหนา', checked: false, isAiSuggested: true, weatherTag: 'หนาวจัด' },
      { category: 'cloth', title: 'รองเท้าพื้นยึดเกาะกันลื่นบนหิมะ / น้ำแข็ง', checked: false, isAiSuggested: true, weatherTag: 'หนาวจัด' },
      { category: 'health', title: 'ลิปมันบำรุงเข้มข้น & บอดี้โลชั่นกันผิวแตก', checked: false, isAiSuggested: true, weatherTag: 'หนาวจัด' },
    ],
  },
  cool: {
    id: 'cool',
    label: 'เย็นสบาย / ฤดูใบไม้ร่วง-ผลิ',
    temp: '10°C ถึง 19°C',
    icon: CloudSun,
    advice: 'กลางวันเดินสบาย กลางคืนอากาศเย็นลง แนะนำเสื้อแจ็คเก็ตหรือคาร์ดิแกนที่ถอดสะดวก',
    items: [
      { category: 'cloth', title: 'เสื้อแจ็คเก็ต / คาร์ดิแกนถอดง่าย (สำหรับอุณหภูมิเปลี่ยน)', checked: false, isAiSuggested: true, weatherTag: 'เย็นสบาย' },
      { category: 'health', title: 'สเปรย์ป้องกันละอองเกสรและฝุ่น (Kafun Spray)', checked: false, isAiSuggested: true, weatherTag: 'เย็นสบาย' },
      { category: 'custom', title: 'แว่นตากันแดด UV400 ป้องกันแสงแดดสะท้อน', checked: false, isAiSuggested: true, weatherTag: 'เย็นสบาย' },
      { category: 'custom', title: 'กระบอกน้ำเก็บอุณหภูมิสำหรับพกน้ำอุ่น', checked: false, isAiSuggested: true, weatherTag: 'เย็นสบาย' },
    ],
  },
  warm: {
    id: 'warm',
    label: 'อบอุ่น / แดดจัด',
    temp: '25°C ถึง 34°C',
    icon: Sun,
    advice: 'แดดจัดและเดินเหงื่อออกง่าย เน้นเสื้อผ้าระบายอากาศดี ครีมกันแดด และอุปกรณ์ดับร้อน',
    items: [
      { category: 'health', title: 'ครีมกันแดดเนื้อบางเบา SPF50+ PA++++', checked: false, isAiSuggested: true, weatherTag: 'แดดจัด' },
      { category: 'tech', title: 'พัดลมพกพา USB หรือ พัดลมคล้องคอไร้สาย', checked: false, isAiSuggested: true, weatherTag: 'แดดจัด' },
      { category: 'health', title: 'ผ้าเย็นสูตรสดชื่น / ทิชชู่เปียกเย็นเช็ดหน้า', checked: false, isAiSuggested: true, weatherTag: 'แดดจัด' },
      { category: 'cloth', title: 'เสื้อผ้าเนื้อเบา Quick-Dry ระบายเหงื่อ', checked: false, isAiSuggested: true, weatherTag: 'แดดจัด' },
      { category: 'cloth', title: 'หมวกปีกกว้าง หรือ ร่มพับกัน UV', checked: false, isAiSuggested: true, weatherTag: 'แดดจัด' },
    ],
  },
  rain: {
    id: 'rain',
    label: 'ฤดูฝน / ลมมรสุม',
    temp: '18°C ถึง 26°C',
    icon: CloudRain,
    advice: 'มีโอกาสเจอฝนตกและพื้นเปียกตลอดวัน ควรมีร่มกันลมแรงและซองกันน้ำสำหรับสัมภาระ',
    items: [
      { category: 'cloth', title: 'ร่มพับน้ำหนักเบาโครงต้านลมแรง (Wpc. หรือเทียบเท่า)', checked: false, isAiSuggested: true, weatherTag: 'ฤดูฝน' },
      { category: 'custom', title: 'ซองกันน้ำใส่พาสปอร์ต & เอกสารสำคัญ', checked: false, isAiSuggested: true, weatherTag: 'ฤดูฝน' },
      { category: 'cloth', title: 'ถุงเท้าสำรองเพิ่ม 2 คู่ (เผื่อเปียกฝนระหว่างวัน)', checked: false, isAiSuggested: true, weatherTag: 'ฤดูฝน' },
      { category: 'custom', title: 'สเปรย์ฉีดเคลือบกันน้ำสำหรับรองเท้าผ้าใบ', checked: false, isAiSuggested: true, weatherTag: 'ฤดูฝน' },
    ],
  },
};

interface PackingChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripName?: string;
  tripCountry?: string;
  tripStartDate?: string;
  destinationCity?: string;
}

export default function PackingChecklistModal({
  isOpen,
  onClose,
  tripId,
  tripName = '',
  tripCountry = '',
  tripStartDate = '',
  destinationCity = '',
}: PackingChecklistModalProps) {
  const storageKey = `travel_tracker_packing_${tripId}`;
  
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showAiAdvisor, setShowAiAdvisor] = useState(false);
  const [aiImportSuccess, setAiImportSuccess] = useState(false);

  // Automatically detect destination weather profile based on trip details
  const initialProfile = useMemo<WeatherProfile>(() => {
    const text = `${tripName} ${tripCountry} ${destinationCity}`.toLowerCase();
    
    // Check cold destinations
    if (
      text.includes('sapporo') || text.includes('ซัปโปโร') ||
      text.includes('hokkaido') || text.includes('ฮอกไกโด') ||
      text.includes('nagano') || text.includes('หิมะ') ||
      text.includes('winter') || text.includes('seoul') || text.includes('เกาหลี')
    ) {
      return 'cold';
    }

    // Check date for winter months (Dec, Jan, Feb)
    if (tripStartDate) {
      const month = new Date(tripStartDate).getMonth() + 1;
      if (month === 12 || month === 1 || month === 2) {
        return 'cold';
      }
      if (month >= 6 && month <= 8) {
        return 'warm';
      }
    }

    // Check warm destinations
    if (
      text.includes('okinawa') || text.includes('โอกินาวา') ||
      text.includes('bangkok') || text.includes('phuket') ||
      text.includes('singapore') || text.includes('summer')
    ) {
      return 'warm';
    }

    // Default to cool (Tokyo, Osaka, Kyoto general)
    return 'cool';
  }, [tripName, tripCountry, destinationCity, tripStartDate]);

  const [selectedProfile, setSelectedProfile] = useState<WeatherProfile>(initialProfile);

  // Update profile if trip details change
  useEffect(() => {
    setSelectedProfile(initialProfile);
  }, [initialProfile]);

  useEffect(() => {
    if (!tripId) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setItems(JSON.parse(saved));
      } else {
        const initial = DEFAULT_PACKING_ITEMS.map((it, idx) => ({
          ...it,
          id: `default_${idx}_${Date.now()}`,
        }));
        setItems(initial);
        localStorage.setItem(storageKey, JSON.stringify(initial));
      }
    } catch {
      setItems([]);
    }
  }, [tripId, storageKey]);

  const saveItems = (updated: ChecklistItem[]) => {
    setItems(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}
  };

  const toggleCheck = (id: string) => {
    const updated = items.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it));
    saveItems(updated);

    // If all checked, blast confetti!
    const allChecked = updated.every((i) => i.checked);
    if (allChecked && updated.length > 0) {
      triggerConfetti();
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: ChecklistItem = {
      id: `custom_${Date.now()}`,
      category: 'custom',
      title: newTitle.trim(),
      checked: false,
    };
    const updated = [...items, newItem];
    saveItems(updated);
    setNewTitle('');
  };

  const handleDeleteItem = (id: string) => {
    const updated = items.filter((it) => it.id !== id);
    saveItems(updated);
  };

  // Feature 4: Batch Import AI Weather Recommended Items
  const handleImportAiItems = () => {
    const preset = WEATHER_PRESETS[selectedProfile];
    const existingTitles = new Set(items.map((i) => i.title.toLowerCase().trim()));
    
    const newAiItems: ChecklistItem[] = [];
    preset.items.forEach((presetItem, idx) => {
      // Avoid exact duplicates
      if (!existingTitles.has(presetItem.title.toLowerCase().trim())) {
        newAiItems.push({
          ...presetItem,
          id: `ai_${selectedProfile}_${Date.now()}_${idx}`,
        });
      }
    });

    if (newAiItems.length > 0) {
      const updated = [...items, ...newAiItems];
      saveItems(updated);
      setAiImportSuccess(true);
      setTimeout(() => setAiImportSuccess(false), 3000);
    } else {
      setAiImportSuccess(true);
      setTimeout(() => setAiImportSuccess(false), 2000);
    }
  };

  const completedCount = useMemo(() => items.filter((i) => i.checked).length, [items]);
  const progressPercent = useMemo(
    () => (items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0),
    [completedCount, items]
  );

  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return items;
    return items.filter((i) => i.category === activeCategory);
  }, [items, activeCategory]);

  const currentPreset = WEATHER_PRESETS[selectedProfile];
  const WeatherIconComponent = currentPreset.icon;

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overscroll-contain overflow-x-hidden animate-in fade-in duration-200 select-none" role="dialog" aria-modal="true">
      <div className="w-full max-w-xl rounded-2xl sm:rounded-3xl bg-white dark:bg-[#151b2b] p-5 sm:p-6 shadow-2xl border border-slate-200/90 dark:border-[#222c42] max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 space-y-4">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-[#222c42] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 dark:bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Luggage className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  จัดกระเป๋า & เอกสารเดินทาง
                </h2>
                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200/60 dark:border-blue-900/60">
                  {progressPercent}% เสร็จแล้ว
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                เช็กลิสต์ของสำคัญก่อนเดินทาง {destinationCity || tripName ? `(${destinationCity || tripName})` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1c2438] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Feature 4: Weather Intelligence Section Banner */}
        <div className="rounded-2xl border border-blue-100 dark:border-[#222c42] bg-blue-50/50 dark:bg-[#1c2438]/80 p-3.5 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <WeatherIconComponent className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  สภาพอากาศปลายทาง: {currentPreset.label}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  อุณหภูมิคาดการณ์ {currentPreset.temp}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAiAdvisor(!showAiAdvisor)}
              className="px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-900 bg-white dark:bg-[#151b2b] text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="h-3 w-3" />
              <span>{showAiAdvisor ? 'ซ่อนคำแนะนำ' : 'วิเคราะห์สภาพอากาศ AI'}</span>
            </button>
          </div>

          {/* Expandable Weather Detail & AI Recommendation */}
          {showAiAdvisor && (
            <div className="pt-2 border-t border-blue-200/50 dark:border-[#2a3650] space-y-2.5 animate-in fade-in duration-200">
              {/* Weather Profile Selectors */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {(Object.keys(WEATHER_PRESETS) as WeatherProfile[]).map((pKey) => {
                  const p = WEATHER_PRESETS[pKey];
                  const Icon = p.icon;
                  const isSelected = selectedProfile === pKey;
                  return (
                    <button
                      key={pKey}
                      type="button"
                      onClick={() => setSelectedProfile(pKey)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white dark:bg-[#151b2b] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#222c42]'
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Advice Box */}
              <div className="p-2.5 rounded-xl bg-white/80 dark:bg-[#151b2b]/90 border border-blue-200/60 dark:border-[#222c42] text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">💡 คำแนะนำการแต่งกาย:</span>
                {currentPreset.advice}
              </div>

              {/* 1-Click Batch Import Button */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  มีไอเทมแนะนำ {currentPreset.items.length} รายการ
                </span>
                <button
                  type="button"
                  onClick={handleImportAiItems}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95"
                >
                  {aiImportSuccess ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-300" />
                      <span>นำเข้าเข้าเช็กลิสต์แล้ว!</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="h-3.5 w-3.5" />
                      <span>เพิ่มของแนะนำจาก AI ลงเช็กลิสต์</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 shrink-0">
          <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>เตรียมของแล้ว {completedCount} จาก {items.length} รายการ</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-[#1c2438] rounded-full h-2 overflow-hidden border border-slate-200/50 dark:border-transparent">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progressPercent === 100
                  ? 'bg-emerald-500'
                  : 'bg-blue-600'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar shrink-0">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-[#1c2438] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#252f48]'
            }`}
          >
            ทั้งหมด ({items.length})
          </button>
          <button
            onClick={() => setActiveCategory('docs')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeCategory === 'docs'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-[#1c2438] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#252f48]'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>เอกสาร</span>
          </button>
          <button
            onClick={() => setActiveCategory('tech')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeCategory === 'tech'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-[#1c2438] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#252f48]'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>ไอที/เน็ต</span>
          </button>
          <button
            onClick={() => setActiveCategory('health')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeCategory === 'health'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-[#1c2438] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#252f48]'
            }`}
          >
            <Pill className="h-3.5 w-3.5" />
            <span>ยา/สุขภาพ</span>
          </button>
          <button
            onClick={() => setActiveCategory('cloth')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeCategory === 'cloth'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-[#1c2438] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#252f48]'
            }`}
          >
            <Shirt className="h-3.5 w-3.5" />
            <span>เสื้อผ้า</span>
          </button>
        </div>

        {/* List of Checklist Items */}
        <div className="overflow-y-auto overflow-x-hidden touch-pan-y overscroll-contain custom-scrollbar flex-1 min-h-0 space-y-2 pr-1">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => toggleCheck(item.id)}
              className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer group select-none ${
                item.checked
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 text-slate-500 dark:text-slate-400'
                  : 'bg-slate-50/70 dark:bg-[#1c2438]/60 border-slate-200 dark:border-[#222c42] text-slate-900 dark:text-white hover:border-blue-400 dark:hover:border-blue-500'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                    item.checked
                      ? 'bg-emerald-500 text-white shadow-2xs'
                      : 'border-2 border-slate-300 dark:border-[#2a3650]'
                  }`}
                >
                  {item.checked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-xs font-semibold leading-snug ${item.checked ? 'line-through opacity-75' : ''}`}>
                      {item.title}
                    </span>
                    {item.weatherTag && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 shrink-0">
                        สภาพอากาศ
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {(item.category === 'custom' || item.isAiSuggested) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteItem(item.id);
                  }}
                  className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer shrink-0"
                  title="ลบรายการ"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500">
              ไม่มีรายการในหมวดนี้
            </div>
          )}
        </div>

        {/* Add Custom Item Input */}
        <form onSubmit={handleAddItem} className="flex gap-2 pt-2 border-t border-slate-100 dark:border-[#222c42] shrink-0">
          <input
            type="text"
            placeholder="เพิ่มของที่ต้องเตรียม เช่น แว่นกันแดด, บัตร Suica..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 p-2.5 rounded-xl border border-slate-200 dark:border-[#2a3650] bg-slate-50 dark:bg-[#111624] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-500 font-medium"
          />
          <button
            type="submit"
            disabled={!newTitle.trim()}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>เพิ่ม</span>
          </button>
        </form>

      </div>
    </div>
  );
}
