// src/components/PackingChecklistModal.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Luggage, Check, Plus, Trash2, X, Sparkles, 
  ShieldCheck, Smartphone, Pill, Shirt, PlusCircle, 
  CheckCircle2, Circle
} from 'lucide-react';
import { triggerConfetti } from '@/lib/confetti';

interface ChecklistItem {
  id: string;
  category: 'docs' | 'tech' | 'health' | 'cloth' | 'custom';
  title: string;
  checked: boolean;
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
  { category: 'tech', title: 'eSIM ญี่ปุ่น หรือ ซิมเน็ตโรมมิ่ง / Pocket WiFi', checked: false },
  { category: 'tech', title: 'Power Bank (แบตสำรอง พกขึ้นเครื่อง ห้ามโหลดใต้เครื่อง)', checked: false },
  { category: 'tech', title: 'หัวแปลงปลั๊กไฟ 2 ขาแบน (Adapter 100V Japan)', checked: false },
  { category: 'tech', title: 'สายชาร์จมือถือ & กล้องถ่ายรูป', checked: false },

  // 3. Health & Winter
  { category: 'health', title: 'ยาประจำตัว + ยาแก้หวัด/แก้แพ้/ยาแก้ปวดพารา', checked: false },
  { category: 'health', title: 'แผ่นแปะแก้ปวดเมื่อยขา/เท้า (แผ่นแปะเท้าญี่ปุ่น)', checked: false },
  { category: 'health', title: 'ฮีทเทค (Heattech) & ถุงร้อนกันหนาว (Kairo)', checked: false },
  { category: 'health', title: 'ลิปมัน & ครีมทาผิว (อากาศญี่ปุ่นแห้ง)', checked: false },

  // 4. Clothes
  { category: 'cloth', title: 'เสื้อโค้ท / เสื้อแจ็คเก็ตกันลม', checked: false },
  { category: 'cloth', title: 'รองเท้าผ้าใบเดินสบาย (เดินวันละ 15,000-20,000 ก้าว)', checked: false },
  { category: 'cloth', title: 'ร่มพับน้ำหนักเบา หรือ เสื้อกันฝน', checked: false },
];

interface PackingChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
}

export default function PackingChecklistModal({
  isOpen,
  onClose,
  tripId,
}: PackingChecklistModalProps) {
  const storageKey = `travel_tracker_packing_${tripId}`;
  
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

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

  const completedCount = useMemo(() => items.filter((i) => i.checked).length, [items]);
  const progressPercent = useMemo(
    () => (items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0),
    [completedCount, items]
  );

  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return items;
    return items.filter((i) => i.category === activeCategory);
  }, [items, activeCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#1a182d] p-5 sm:p-6 shadow-2xl border border-slate-200/90 dark:border-purple-800/60 glow-purple max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 space-y-4">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-purple-900/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/25">
              <Luggage className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>จัดกระเป๋า & เตรียมเอกสาร</span>
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950 px-2 py-0.5 rounded-full">
                  {progressPercent}% เสร็จแล้ว
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-purple-300 font-medium">
                เช็กลิสต์ของสำคัญก่อนบินไปเที่ยวญี่ปุ่น
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-purple-200 hover:bg-slate-100 dark:hover:bg-purple-950/50 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 shrink-0">
          <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-purple-200">
            <span>เตรียมของแล้ว {completedCount} จาก {items.length} รายการ</span>
            <span className="text-purple-600 dark:text-purple-400">{progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-200/80 dark:bg-[#11101d] rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progressPercent === 100
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                  : 'bg-gradient-to-r from-pink-500 to-purple-600'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar shrink-0">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-purple-950/60 text-slate-700 dark:text-purple-300 hover:bg-slate-200'
            }`}
          >
            ทั้งหมด ({items.length})
          </button>
          <button
            onClick={() => setActiveCategory('docs')}
            className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
              activeCategory === 'docs'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-purple-950/60 text-slate-700 dark:text-purple-300 hover:bg-slate-200'
            }`}
          >
            🛂 เอกสาร
          </button>
          <button
            onClick={() => setActiveCategory('tech')}
            className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
              activeCategory === 'tech'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-purple-950/60 text-slate-700 dark:text-purple-300 hover:bg-slate-200'
            }`}
          >
            📱 ไอที/เน็ต
          </button>
          <button
            onClick={() => setActiveCategory('health')}
            className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
              activeCategory === 'health'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-purple-950/60 text-slate-700 dark:text-purple-300 hover:bg-slate-200'
            }`}
          >
            💊 ยา/กันหนาว
          </button>
          <button
            onClick={() => setActiveCategory('cloth')}
            className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
              activeCategory === 'cloth'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-purple-950/60 text-slate-700 dark:text-purple-300 hover:bg-slate-200'
            }`}
          >
            👔 เสื้อผ้า
          </button>
        </div>

        {/* List of Checklist Items */}
        <div className="overflow-y-auto custom-scrollbar flex-1 space-y-2 pr-1">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => toggleCheck(item.id)}
              className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer group select-none ${
                item.checked
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-900/60 text-slate-500 dark:text-purple-300'
                  : 'bg-slate-50/70 dark:bg-[#11101d]/60 border-slate-200 dark:border-purple-900/50 text-slate-900 dark:text-white hover:border-pink-500/50'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                    item.checked
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'border-2 border-slate-300 dark:border-purple-800'
                  }`}
                >
                  {item.checked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                </button>
                <span className={`text-xs font-bold leading-snug ${item.checked ? 'line-through opacity-75' : ''}`}>
                  {item.title}
                </span>
              </div>

              {item.category === 'custom' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteItem(item.id);
                  }}
                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                  title="ลบรายการ"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add Custom Item Input */}
        <form onSubmit={handleAddItem} className="flex gap-2 pt-2 border-t border-slate-100 dark:border-purple-900/40 shrink-0">
          <input
            type="text"
            placeholder="เพิ่มของที่ต้องเตรียม เช่น แว่นกันแดด, บัตร Suica..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 p-2.5 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50 dark:bg-[#11101d] text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-medium"
          />
          <button
            type="submit"
            disabled={!newTitle.trim()}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs shadow-md shadow-pink-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>เพิ่ม</span>
          </button>
        </form>

      </div>
    </div>
  );
}
