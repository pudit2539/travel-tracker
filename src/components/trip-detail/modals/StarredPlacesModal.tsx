// src/components/trip-detail/modals/StarredPlacesModal.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, MapPin, Plus, Search, Star, Trash2, Utensils, X } from 'lucide-react';
import { toast } from 'sonner';
import { triggerHaptic } from '@/lib/haptics';
import {
  StarredPlaceItem,
  StarredPlaceKind,
  getStarredPlaces,
  removeStarredPlace,
  subscribeStarredPlaces,
  toggleStarredPlace,
} from '@/lib/starredPlaces';

interface StarredPlacesModalProps {
  isOpen: boolean;
  mounted: boolean;
  tripId: string;
  onClose: () => void;
  onAddToItinerary?: (item: { title: string; city?: string; mapsUrl?: string; kind: StarredPlaceKind }) => void;
}

export const StarredPlacesModal = React.memo(function StarredPlacesModal({
  isOpen,
  mounted,
  tripId,
  onClose,
  onAddToItinerary,
}: StarredPlacesModalProps) {
  const [items, setItems] = useState<StarredPlaceItem[]>(() => getStarredPlaces(tripId));
  const [filterKind, setFilterKind] = useState<'all' | StarredPlaceKind>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newName, setNewName] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newKind, setNewKind] = useState<StarredPlaceKind>('place');
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    if (!tripId) return;
    setItems(getStarredPlaces(tripId));
    return subscribeStarredPlaces(() => setItems(getStarredPlaces(tripId)));
  }, [tripId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((it) => {
      if (filterKind !== 'all' && it.kind !== filterKind) return false;
      if (!q) return true;
      return (
        it.name.toLowerCase().includes(q) ||
        (it.city || '').toLowerCase().includes(q) ||
        (it.note || '').toLowerCase().includes(q)
      );
    });
  }, [items, filterKind, searchQuery]);

  if (!isOpen || !mounted) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    triggerHaptic('medium');
    const res = toggleStarredPlace(tripId, {
      name: newName,
      kind: newKind,
      city: newCity,
      note: newNote,
    });
    setItems(res.items);
    setNewName('');
    setNewCity('');
    setNewNote('');
    toast.success(`⭐ ติดดาว "${newName.trim()}" ไว้ในรายการโปรดแล้ว!`);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center backdrop-blur-md bg-black/80 p-3 sm:p-4 overscroll-contain animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#161c27] border border-[#dbeafe] dark:border-[#24324a] shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-5 pb-3 border-b border-slate-200/80 dark:border-[#24324a] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-400/30 flex items-center justify-center shrink-0">
              <Star className="h-5 w-5 fill-amber-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-black text-slate-900 dark:text-white truncate">
                สถานที่ & ร้านอาหารติดดาว ({items.length})
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                เก็บร้านเด็ดหรือจุดแวะที่อยากไปไว้เปิดดูไวๆ หรือกดเพิ่มลงแผน
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดรายการติดดาว"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0 custom-scrollbar space-y-3.5">
          {/* Quick Add Starred Place / Restaurant Form */}
          <form
            onSubmit={handleAdd}
            className="p-3.5 rounded-2xl bg-[#f8fafd] dark:bg-[#0d131f] border border-[#dbeafe] dark:border-[#24324a] space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black text-slate-900 dark:text-white">
                ➕ เพิ่มสถานที่ / ร้านอาหารติดดาวใหม่
              </span>
              <div className="inline-flex p-0.5 rounded-xl bg-white dark:bg-[#161c27] border border-slate-200 dark:border-[#24324a]">
                <button
                  type="button"
                  onClick={() => setNewKind('place')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                    newKind === 'place'
                      ? 'bg-[#2563eb] text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  📍 ที่เที่ยว/ช้อป
                </button>
                <button
                  type="button"
                  onClick={() => setNewKind('food')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                    newKind === 'food'
                      ? 'bg-amber-500 text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  🍜 ร้านอาหาร
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                required
                placeholder={newKind === 'food' ? 'ชื่อร้าน เช่น Ichiran Ramen' : 'ชื่อสถานที่ เช่น Kinkaku-ji'}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="sm:col-span-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-[#24324a] bg-white dark:bg-[#161c27] text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#2563eb]"
              />
              <input
                type="text"
                placeholder="ย่าน/เมือง (เช่น Kyoto)"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-[#24324a] bg-white dark:bg-[#161c27] text-xs text-slate-900 dark:text-white outline-none focus:border-[#2563eb]"
              />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="โน้ตสั้นๆ เช่น เมนูเด็ด / เวลาเปิด (ไม่บังคับ)"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 dark:border-[#24324a] bg-white dark:bg-[#161c27] text-xs text-slate-900 dark:text-white outline-none focus:border-[#2563eb]"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black inline-flex items-center gap-1 shrink-0 cursor-pointer tactile-press"
              >
                <Star className="h-3.5 w-3.5 fill-white" />
                <span>ติดดาว</span>
              </button>
            </div>
          </form>

          {/* Filter & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อร้าน / สถานที่..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#24324a] bg-slate-50 dark:bg-[#0d131f] text-xs text-slate-900 dark:text-white outline-none focus:border-[#2563eb]"
              />
            </div>
            <div className="inline-flex p-0.5 rounded-xl bg-slate-100 dark:bg-[#0d131f] border border-slate-200 dark:border-[#24324a] text-[11px] font-bold">
              {(['all', 'place', 'food'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFilterKind(k)}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                    filterKind === k
                      ? 'bg-white dark:bg-[#161c27] text-[#2563eb] dark:text-[#4cd7f6] shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {k === 'all' ? 'ทั้งหมด' : k === 'place' ? '📍 ที่เที่ยว' : '🍜 ร้านอาหาร'}
                </button>
              ))}
            </div>
          </div>

          {/* Starred List */}
          {filtered.length === 0 ? (
            <div className="py-10 text-center rounded-2xl border border-dashed border-slate-200 dark:border-[#24324a] text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <p className="font-bold">ยังไม่มีสถานที่หรือร้านอาหารติดดาว</p>
              <p>กดปุ่ม ⭐ บนการ์ดแผนเที่ยว หรือเพิ่มร้านที่อยากไปจากด้านบนได้เลย</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  data-testid={`starred-item-${item.id}`}
                  className="p-3 rounded-2xl border border-[#e2e8f0] dark:border-[#24324a] bg-white dark:bg-[#0d131f]/80 flex items-center justify-between gap-2.5 hover:border-amber-400 transition-all"
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                      {item.kind === 'food' ? <Utensils className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {item.city ? `📍 ${item.city}` : item.kind === 'food' ? '🍜 ร้านอาหาร' : '📌 สถานที่'}
                        {item.note ? ` · ${item.note}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.mapsUrl && (
                      <a
                        href={item.mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-[#eff6ff] dark:bg-[#161c27] text-[#1d4ed8] dark:text-[#4cd7f6] border border-[#bfdbfe] dark:border-[#4cd7f6]/25 hover:bg-[#2563eb] hover:text-white transition-colors"
                        title="เปิดแผนที่ Google Maps"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {onAddToItinerary && (
                      <button
                        type="button"
                        onClick={() => {
                          onAddToItinerary({
                            title: item.name,
                            city: item.city,
                            mapsUrl: item.mapsUrl,
                            kind: item.kind,
                          });
                          onClose();
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer tactile-press"
                        title="เพิ่มเข้าแผนเที่ยว"
                      >
                        <Plus className="h-3 w-3" />
                        <span>ลงแผน</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setItems(removeStarredPlace(tripId, item.id))}
                      aria-label={`ลบดาว ${item.name}`}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
});
