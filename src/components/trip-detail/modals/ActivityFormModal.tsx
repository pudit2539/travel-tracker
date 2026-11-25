// src/components/trip-detail/modals/ActivityFormModal.tsx
'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { Bus, Trash2, X } from 'lucide-react';
import { KANSAI_TRANSIT_SUGGESTIONS } from '@/lib/smartTimeline';

export interface ActivityFormState {
  date_label: string;
  time_slot: string;
  city: string;
  main_place: string;
  main_place_links: string[];
  food_recommendations: Array<{ name: string; link: string }>;
  backup_plans: Array<{ text: string; link: string }>;
  transport_info: string;
  platform: string;
  best_route_tip: string;
  insert_after_order: number | null;
}

interface ActivityFormModalProps {
  isOpen: boolean;
  mounted: boolean;
  editingActivity: any;
  savingActivity: boolean;
  activityForm: ActivityFormState;
  setActivityForm: React.Dispatch<React.SetStateAction<ActivityFormState>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ActivityFormModal = React.memo(function ActivityFormModal({
  isOpen,
  mounted,
  editingActivity,
  savingActivity,
  activityForm,
  setActivityForm,
  onClose,
  onSubmit,
}: ActivityFormModalProps) {
  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-md bg-black/80 p-3 sm:p-4 overscroll-contain overflow-x-hidden animate-in fade-in duration-200 select-none"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl sm:rounded-3xl bg-white dark:bg-[#161c27] shadow-2xl border border-slate-200/90 dark:border-[#24324a] glow-blue max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-4 sm:p-6 pb-3 flex justify-between items-center border-b border-slate-200/90 dark:border-[#24324a] shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {editingActivity ? 'แก้ไขกิจกรรม' : 'เพิ่มกิจกรรมในแผนเที่ยว'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          id="activity-form"
          onSubmit={onSubmit}
          className="p-4 sm:p-6 pt-3 sm:pt-4 overflow-y-auto overflow-x-hidden touch-pan-y overscroll-contain flex-1 min-h-0 custom-scrollbar space-y-3.5"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">
                วัน / Day (เช่น 04-Dec)
              </label>
              <input
                type="text"
                required
                placeholder="Day 1 (04-Dec)"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#24324a] bg-slate-50/50 dark:bg-[#1a202c] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium transition-all"
                value={activityForm.date_label}
                onChange={(e) => setActivityForm({ ...activityForm, date_label: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">
                เวลา (เช่น 09:00 - 12:00)
              </label>
              <input
                type="text"
                placeholder="09:00 - 12:00"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#24324a] bg-slate-50/50 dark:bg-[#1a202c] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium transition-all"
                value={activityForm.time_slot}
                onChange={(e) => setActivityForm({ ...activityForm, time_slot: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">
                เมือง / ย่าน
              </label>
              <input
                type="text"
                placeholder="Osaka / Namba"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#24324a] bg-slate-50/50 dark:bg-[#1a202c] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium transition-all"
                value={activityForm.city}
                onChange={(e) => setActivityForm({ ...activityForm, city: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">
                สถานที่หลัก *
              </label>
              <input
                type="text"
                required
                placeholder="เช่น Universal Studios Japan"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#24324a] bg-slate-50/50 dark:bg-[#1a202c] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-bold transition-all"
                value={activityForm.main_place}
                onChange={(e) => setActivityForm({ ...activityForm, main_place: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">
              ลิงก์ Google Maps ของสถานที่หลัก
            </label>
            {activityForm.main_place_links.map((link, lIdx) => (
              <div key={lIdx} className="flex gap-2 mb-2">
                <input
                  type="url"
                  placeholder="https://maps.app.goo.gl/..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#24324a] bg-slate-50/50 dark:bg-[#1a202c] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium transition-all"
                  value={link}
                  onChange={(e) => {
                    const updated = [...activityForm.main_place_links];
                    updated[lIdx] = e.target.value;
                    setActivityForm({ ...activityForm, main_place_links: updated });
                  }}
                />
                {activityForm.main_place_links.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const updated = activityForm.main_place_links.filter((_, i) => i !== lIdx);
                      setActivityForm({ ...activityForm, main_place_links: updated });
                    }}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1a202c] cursor-pointer"
                    title="ลบลิงก์"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Transit & Train Guide */}
          <div className="p-3.5 rounded-2xl bg-blue-50/20 dark:bg-[#1a202c] border border-blue-100 dark:border-[#24324a] space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white">
              <Bus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>ข้อมูลการเดินทาง รถไฟ & ชานชาลา (Transit Guide)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold mb-1 text-slate-800 dark:text-slate-200">
                  🚉 ชานชาลา / ประตูทางออก (Platform / Exit)
                </label>
                <input
                  type="text"
                  placeholder="เช่น ชานชาลา 3 (Track 3) / ทางออก 14"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#24324a] bg-white dark:bg-[#161c27] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium transition-all"
                  value={activityForm.platform}
                  onChange={(e) => setActivityForm({ ...activityForm, platform: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1 text-slate-800 dark:text-slate-200">
                  💡 ทางเลือกที่ดีที่สุด & จุดขึ้นรถ
                </label>
                <input
                  type="text"
                  placeholder="เช่น ขึ้นตู้ที่ 4-5 เดินใกล้บันไดเลื่อน / เร็วสุด"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#24324a] bg-white dark:bg-[#161c27] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium transition-all"
                  value={activityForm.best_route_tip}
                  onChange={(e) =>
                    setActivityForm({ ...activityForm, best_route_tip: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold mb-1 text-slate-800 dark:text-slate-200">
                สายรถไฟ / รายละเอียดการเดินทาง (Transport Info)
              </label>
              <input
                type="text"
                placeholder="เช่น นั่งสาย Midosuji Line ลงสถานี Namba"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#24324a] bg-white dark:bg-[#161c27] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium transition-all"
                value={activityForm.transport_info}
                onChange={(e) => setActivityForm({ ...activityForm, transport_info: e.target.value })}
              />
              <div className="pt-2 space-y-1.5">
                <div className="text-[10px] font-black text-blue-600 dark:text-blue-400">
                  ⚡ กดเลือกสายรถไฟและเส้นทางยอดฮิตภูมิภาคคันไซ (คลิกเพื่อเติมอัตโนมัติ):
                </div>
                <div className="flex flex-wrap gap-1">
                  {KANSAI_TRANSIT_SUGGESTIONS.filter((s) => s.category === 'route-template').map(
                    (tpl) => (
                      <button
                        key={tpl.label}
                        type="button"
                        onClick={() =>
                          setActivityForm({ ...activityForm, transport_info: tpl.insertText })
                        }
                        className="px-2 py-1 rounded-lg bg-white dark:bg-[#161c27] hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 border border-blue-200/70 dark:border-[#24324a] text-[10px] font-bold cursor-pointer transition-all"
                      >
                        {tpl.badge} {tpl.label}
                      </button>
                    )
                  )}
                </div>
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {KANSAI_TRANSIT_SUGGESTIONS.filter((s) => s.category === 'station').map((stTpl) => (
                    <button
                      key={stTpl.label}
                      type="button"
                      onClick={() =>
                        setActivityForm({
                          ...activityForm,
                          transport_info: activityForm.transport_info
                            ? `${activityForm.transport_info} • ${stTpl.insertText}`
                            : stTpl.insertText,
                        })
                      }
                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#0d131f] hover:bg-blue-100 text-slate-600 dark:text-slate-400 text-[9px] font-bold cursor-pointer"
                    >
                      + {stTpl.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Food Recommendations & Backup Plan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">
                🍜 ร้านอาหารแนะนำ (ถ้ามี)
              </label>
              <input
                type="text"
                placeholder="เช่น Ichiran Ramen, % Arabica"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#24324a] bg-slate-50/50 dark:bg-[#1a202c] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium transition-all"
                value={activityForm.food_recommendations[0]?.name || ''}
                onChange={(e) => {
                  const next = [...activityForm.food_recommendations];
                  next[0] = { ...(next[0] || { link: '' }), name: e.target.value };
                  setActivityForm({ ...activityForm, food_recommendations: next });
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">
                🛡️ แผนสำรอง Plan B (กรณีฝนตก/คิวยาว)
              </label>
              <input
                type="text"
                placeholder="เช่น แวะเดินห้างในร่มใกล้สถานี"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#24324a] bg-slate-50/50 dark:bg-[#1a202c] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium transition-all"
                value={activityForm.backup_plans[0]?.text || ''}
                onChange={(e) => {
                  const next = [...activityForm.backup_plans];
                  next[0] = { ...(next[0] || { link: '' }), text: e.target.value };
                  setActivityForm({ ...activityForm, backup_plans: next });
                }}
              />
            </div>
          </div>
        </form>

        <div className="p-3.5 sm:p-4 px-4 sm:px-6 border-t border-slate-200/90 dark:border-[#24324a] flex gap-2.5 bg-slate-50/90 dark:bg-[#1a202c]/90 backdrop-blur-md shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-[#24324a] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1a202c] cursor-pointer transition-colors min-h-[42px] touch-manipulation active:scale-95"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            form="activity-form"
            disabled={savingActivity}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 hover:opacity-95 disabled:opacity-50 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all min-h-[42px] touch-manipulation"
          >
            {savingActivity ? 'กำลังบันทึก...' : 'บันทึกกิจกรรม'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
});

export default ActivityFormModal;
