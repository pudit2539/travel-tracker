// src/components/PrintableItineraryModal.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Printer,
  X,
  PhoneCall,
  LayoutGrid,
  FileText,
  ZoomIn,
  ZoomOut,
  Palette,
} from 'lucide-react';
import { CategoryItem } from '@/lib/categories';

interface PrintableItineraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: any;
  itinerary: any[];
  expenses: any[];
  categories: CategoryItem[];
}

export default function PrintableItineraryModal({
  isOpen,
  onClose,
  trip,
  itinerary = [],
  expenses = [],
}: PrintableItineraryModalProps) {
  const [layoutMode, setLayoutMode] = useState<'poster' | 'booklet'>('poster');
  const [printZoom, setPrintZoom] = useState<number>(90);
  const [inkSaver, setInkSaver] = useState<boolean>(false);

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

  const handlePrint = () => {
    window.print();
  };

  // Group itinerary by day_label
  const groupedByDay: { [day: string]: any[] } = {};
  itinerary.forEach((item) => {
    const day = item.date_label || 'วันที่ไม่ได้ระบุ';
    if (!groupedByDay[day]) groupedByDay[day] = [];
    groupedByDay[day].push(item);
  });

  const dayEntries = Object.entries(groupedByDay);
  const totalSpent = expenses.reduce((a, b) => a + Number(b.amount || 0), 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overscroll-contain overflow-x-hidden animate-in fade-in duration-200 select-none print:p-0 print:static print:bg-white"
      role="dialog"
      aria-modal="true"
    >
      {/* Dynamic @page orientation for Poster vs Booklet */}
      <style>{`
        @media print {
          @page {
            size: ${layoutMode === 'poster' ? 'A4 landscape' : 'A4 portrait'};
            margin: 8mm;
          }
        }
      `}</style>

      {/* Modal Container */}
      <div className="w-full max-w-6xl rounded-2xl sm:rounded-3xl bg-white dark:bg-[#181a20] shadow-2xl border border-slate-200 dark:border-[#262932] max-h-[92dvh] flex flex-col overflow-hidden print:border-none print:shadow-none print:max-h-none print:w-full print:rounded-none print:bg-white print:text-black animate-in zoom-in-95 duration-200">
        {/* Screen Header & TabiPlan Print Controls (Hidden on print) */}
        <div className="p-4 sm:p-5 flex flex-wrap justify-between items-center gap-3 border-b border-slate-100 dark:border-[#262932] bg-slate-50 dark:bg-[#181a20] print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                ส่งออกโปสเตอร์แผนเที่ยวแผ่นเดียว & PDF Booklet 📄
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                สลับโหมดโปสเตอร์สรุปทุกวันในแผ่นเดียว (Landscape Poster) หรือสมุดคู่มือแนวตั้ง + ปรับซูมและประหยัดหมึกได้
              </p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Layout Switcher */}
            <div className="inline-flex p-1 rounded-xl bg-slate-200/70 dark:bg-[#121316] border border-slate-300/60 dark:border-[#262932]">
              <button
                type="button"
                onClick={() => setLayoutMode('poster')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer transition-all ${
                  layoutMode === 'poster'
                    ? 'bg-white dark:bg-[#1e2027] text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>🗺️ โปสเตอร์แผ่นเดียว (แนวนอน)</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('booklet')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer transition-all ${
                  layoutMode === 'booklet'
                    ? 'bg-white dark:bg-[#1e2027] text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>📄 สมุดตารางแนวตั้ง</span>
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-white dark:bg-[#121316] border border-slate-200 dark:border-[#262932] text-xs font-bold text-slate-700 dark:text-slate-300">
              <button
                type="button"
                onClick={() => setPrintZoom((z) => Math.max(60, z - 5))}
                className="p-1 hover:text-blue-600 cursor-pointer"
                title="ย่อขนาดเพื่อให้อยู่ในหน้าเดียว"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="font-mono min-w-[40px] text-center">{printZoom}%</span>
              <button
                type="button"
                onClick={() => setPrintZoom((z) => Math.min(115, z + 5))}
                className="p-1 hover:text-blue-600 cursor-pointer"
                title="ขยายขนาดตัวอักษร"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Ink-Saver Toggle */}
            <button
              type="button"
              onClick={() => setInkSaver((v) => !v)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 cursor-pointer transition-all ${
                inkSaver
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white dark:bg-[#121316] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#262932]'
              }`}
              title="สลับโหมดสีสันสดใส หรือ โหมดขาว-ดำประหยัดหมึกพิมพ์"
            >
              <Palette className="h-3.5 w-3.5" />
              <span>{inkSaver ? '🖨️ ประหยัดหมึก (ขาวดำ)' : '🎨 สีสันสดใส'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 flex items-center gap-1.5 cursor-pointer hover:scale-105 transition-all"
            >
              <Printer className="h-4 w-4" /> สั่งพิมพ์ / บันทึก PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 sm:p-8 overflow-y-auto overflow-x-hidden touch-pan-y overscroll-contain custom-scrollbar flex-1 min-h-0 bg-white text-slate-900 print:overflow-visible print:p-2 print:text-black">
          <div
            style={{
              zoom: `${printZoom}%`,
              filter: inkSaver ? 'grayscale(100%) contrast(115%)' : undefined,
            }}
            className="space-y-5"
          >
            {/* Document Cover Header */}
            <div className="border-b-2 border-slate-900 pb-4 flex flex-wrap justify-between items-end gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                  {layoutMode === 'poster'
                    ? 'ONE-PAGE LANDSCAPE TRIP POSTER • โปสเตอร์สรุปทริปแผ่นเดียว'
                    : 'OFFICIAL TRAVEL ITINERARY BOOKLET • สมุดคู่มือการเดินทาง'}
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-950 mt-1.5 tracking-tight">
                  {trip?.name || trip?.title || 'Japan Osaka & Kyoto Travel Plan'}
                </h1>
                <div className="flex items-center gap-3 text-xs text-slate-600 font-semibold mt-1 flex-wrap">
                  <span>
                    📅{' '}
                    {trip?.start_date
                      ? `${new Date(trip.start_date).toLocaleDateString('th-TH')} - ${
                          trip?.end_date
                            ? new Date(trip.end_date).toLocaleDateString('th-TH')
                            : ''
                        }`
                      : 'กำหนดการเดินทาง'}
                  </span>
                  <span>•</span>
                  <span>📍 {itinerary.length} จุดแวะ ({dayEntries.length} วัน)</span>
                  <span>•</span>
                  <span>
                    💰 งบประมาณ:{' '}
                    {Number(trip?.total_budget ?? trip?.budget ?? 0).toLocaleString()}{' '}
                    {trip?.currency || 'JPY'} (ใช้แล้ว {totalSpent.toLocaleString()}{' '}
                    {trip?.currency || 'JPY'})
                  </span>
                </div>
              </div>

              <div className="text-right text-[10px] text-slate-500 font-mono">
                <div>Travel Tracker • TabiPlan Poster Engine</div>
                <div>ID: {trip?.id?.slice(0, 13)}</div>
              </div>
            </div>

            {/* MODE A: ONE-PAGE LANDSCAPE POSTER GRID */}
            {layoutMode === 'poster' ? (
              <div
                className="grid gap-3 items-start"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(Math.max(dayEntries.length, 1), 5)}, minmax(180px, 1fr))`,
                }}
              >
                {dayEntries.map(([dayLabel, items], dIdx) => (
                  <div
                    key={dIdx}
                    className="rounded-2xl border-2 border-slate-800 overflow-hidden bg-white break-inside-avoid"
                  >
                    {/* Day Column Header */}
                    <div className="bg-slate-900 text-white px-3 py-2 flex items-center justify-between">
                      <span className="text-xs font-black">
                        DAY {dIdx + 1} • {dayLabel}
                      </span>
                      <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.2 rounded">
                        {items.length} จุด
                      </span>
                    </div>

                    {/* Day Stops Flow */}
                    <div className="p-2.5 space-y-2 divide-y divide-slate-200">
                      {items.map((item, idx) => (
                        <div key={idx} className={idx > 0 ? 'pt-2 space-y-0.5' : 'space-y-0.5'}>
                          <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-blue-700">
                            <span>⏰ {item.time_slot || `จุดที่ ${idx + 1}`}</span>
                            {item.city && (
                              <span className="text-slate-500 truncate">📍 {item.city}</span>
                            )}
                          </div>
                          <div className="text-xs font-black text-slate-950 leading-snug">
                            {idx + 1}. {item.main_place}
                          </div>
                          {item.transport_info && (
                            <div className="text-[10px] text-indigo-900 font-medium leading-snug">
                              🚆 {item.transport_info}
                            </div>
                          )}
                          {item.food_recommendation && item.food_recommendation !== '-' && (
                            <div className="text-[10px] text-amber-900 font-semibold leading-snug">
                              🍜 {item.food_recommendation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* MODE B: VERTICAL BOOKLET TABLE */
              <div className="space-y-6">
                {dayEntries.map(([dayLabel, items], dIdx) => (
                  <div key={dIdx} className="space-y-2.5 break-inside-avoid">
                    <div className="flex items-center justify-between bg-slate-100 p-2.5 px-4 rounded-xl border border-slate-300">
                      <span className="text-sm font-black text-slate-950 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                          {dIdx + 1}
                        </span>
                        {dayLabel}
                      </span>
                      <span className="text-xs font-bold text-slate-600">
                        {items[0]?.city ? `ย่าน ${items[0].city}` : ''} ({items.length} จุดหมาย)
                      </span>
                    </div>

                    <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-300 text-slate-700 font-black">
                            <th className="p-2.5 w-24 border-r border-slate-300">เวลา</th>
                            <th className="p-2.5 border-r border-slate-300">สถานที่ & รายละเอียด</th>
                            <th className="p-2.5 w-48 border-r border-slate-300">ร้านอาหารแนะนำ</th>
                            <th className="p-2.5 w-48">การเดินทาง / Plan B</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-2.5 font-bold text-slate-800 border-r border-slate-200 align-top">
                                {item.time_slot || '-'}
                              </td>
                              <td className="p-2.5 border-r border-slate-200 align-top space-y-1">
                                <span className="font-black text-slate-950 block">
                                  {item.main_place}
                                </span>
                                {item.city && (
                                  <span className="text-[10px] text-slate-500 block">
                                    📍 {item.city}
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 border-r border-slate-200 align-top text-[11px] text-slate-800">
                                {item.food_recommendation && item.food_recommendation !== '-' ? (
                                  <div>
                                    <span className="font-bold text-amber-800">🍜 </span>
                                    <span className="whitespace-pre-line">
                                      {item.food_recommendation}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="p-2.5 align-top text-[11px] text-slate-800 space-y-1">
                                {item.transport_info && (
                                  <div className="font-medium text-indigo-900">
                                    🚆 {item.transport_info}
                                  </div>
                                )}
                                {item.backup_plan && (
                                  <div className="text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200 font-medium">
                                    <b>Plan B:</b> {item.backup_plan}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Emergency Contacts & Kansai Etiquette Footer Banner */}
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-3.5 bg-slate-50 break-inside-avoid space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <PhoneCall className="h-3.5 w-3.5 text-rose-600" /> เบอร์ฉุกเฉินญี่ปุ่น & กฎสำคัญคันไซ
                </h3>
                <span className="text-[10px] font-bold text-slate-700">
                  🛂 พกพาสปอร์ตตัวจริงตลอดเวลา • 🚭 ห้ามเดินสูบบุหรี่ริมถนน • 🚶 บันไดเลื่อนโอซาก้ายืนชิดขวา / เกียวโตยืนชิดซ้าย
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                <div className="p-2 rounded-lg bg-white border border-slate-200">
                  <b className="text-rose-600 font-black">110</b> • ตำรวจเหตุด่วน
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200">
                  <b className="text-rose-600 font-black">119</b> • รถพยาบาล / ดับเพลิง
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200">
                  <b className="text-indigo-600 font-black">050-3816-2787</b> • JNTO Hotline 24 ชม.
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200">
                  <b className="text-slate-900 font-black">06-6262-9226</b> • กงสุลใหญ่ไทย ณ โอซาก้า
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
