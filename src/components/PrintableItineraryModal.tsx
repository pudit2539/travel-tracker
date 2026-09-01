// src/components/PrintableItineraryModal.tsx
'use client';

import { useState } from 'react';
import { 
  Printer, Download, X, MapPin, Utensils, 
  Bus, ShieldAlert, PhoneCall, Calendar, DollarSign, Sparkles
} from 'lucide-react';
import { CategoryItem, getCategoryMeta } from '@/lib/categories';

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
  categories = [],
}: PrintableItineraryModalProps) {
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

  const totalSpent = expenses.reduce((a, b) => a + Number(b.amount || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200 print:p-0 print:static print:bg-white">
      
      {/* Modal Container (Scrollable Preview on screen, Clean Page on Print) */}
      <div className="w-full max-w-4xl rounded-3xl bg-white dark:bg-[#130d22] shadow-2xl border border-slate-200 dark:border-purple-800/60 max-h-[95vh] flex flex-col overflow-hidden print:border-none print:shadow-none print:max-h-none print:w-full print:rounded-none print:bg-white print:text-black">
        
        {/* Screen Header (Hidden on print) */}
        <div className="p-4 sm:p-5 flex justify-between items-center border-b border-slate-100 dark:border-purple-900/40 bg-slate-50 dark:bg-purple-950/40 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                ส่งออกแผนเที่ยวเป็น PDF / พิมพ์เอกสาร 📄
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-purple-300/70 font-medium">
                จัดหน้ากระดาษแบบ A4 Printable Booklet สวยงาม ชัดเจน พกติดตัวหรือยื่น ตม. ได้ทันที
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold shadow-md shadow-pink-500/25 flex items-center gap-1.5 cursor-pointer hover:scale-105 transition-all"
            >
              <Printer className="h-4 w-4" /> สั่งพิมพ์ / บันทึก PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-purple-200 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Booklet Document Body */}
        <div className="p-6 sm:p-10 overflow-y-auto custom-scrollbar flex-1 bg-white text-slate-900 print:overflow-visible print:p-6 print:text-black space-y-8">
          
          {/* Document Cover Header */}
          <div className="border-b-2 border-slate-900 pb-5 flex flex-wrap justify-between items-end gap-4">
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-pink-600 bg-pink-50 px-2.5 py-0.5 rounded border border-pink-200">
                Official Travel Itinerary & Guidebook
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 mt-2 tracking-tight">
                {trip?.name || trip?.title || 'Japan Osaka & Kyoto Travel Plan'}
              </h1>
              <div className="flex items-center gap-3 text-xs text-slate-600 font-semibold mt-1">
                <span>📅 {trip?.start_date ? `${new Date(trip.start_date).toLocaleDateString('th-TH')} - ${trip?.end_date ? new Date(trip.end_date).toLocaleDateString('th-TH') : ''}` : 'กำหนดการเดินทาง'}</span>
                <span>•</span>
                <span>💰 งบประมาณ: {Number(trip?.total_budget ?? trip?.budget ?? 0).toLocaleString()} {trip?.currency || 'JPY'}</span>
              </div>
            </div>

            <div className="text-right text-[11px] text-slate-500 font-mono">
              Travel Tracker Document ID: {trip?.id?.slice(0, 13)}
            </div>
          </div>

          {/* Day by Day Sections */}
          <div className="space-y-6">
            {Object.keys(groupedByDay).length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs font-bold">
                ยังไม่มีข้อมูลแผนการเดินทาง
              </div>
            ) : (
              Object.entries(groupedByDay).map(([dayLabel, items], dIdx) => (
                <div key={dIdx} className="space-y-3 break-inside-avoid">
                  
                  {/* Day Header Banner */}
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

                  {/* Activities Table */}
                  <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-300 text-slate-700 font-black">
                          <th className="p-2.5 w-20 border-r border-slate-300">เวลา</th>
                          <th className="p-2.5 border-r border-slate-300">สถานที่ & รายละเอียด</th>
                          <th className="p-2.5 w-48 border-r border-slate-300">ร้านอาหารแนะนำ</th>
                          <th className="p-2.5 w-44">การเดินทาง / Plan B</th>
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
                              {item.main_place_links && item.main_place_links.length > 0 && (
                                <div className="text-[10px] text-pink-600 font-medium">
                                  🔗 Google Maps Link
                                </div>
                              )}
                            </td>
                            <td className="p-2.5 border-r border-slate-200 align-top text-[11px] text-slate-800">
                              {item.food_recommendation && item.food_recommendation !== '-' ? (
                                <div>
                                  <span className="font-bold text-amber-800">🍜 </span>
                                  <span className="whitespace-pre-line">{item.food_recommendation}</span>
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
              ))
            )}
          </div>

          {/* Emergency Contacts & Japan Travel Info Banner */}
          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 bg-slate-50 break-inside-avoid space-y-2">
            <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <PhoneCall className="h-4 w-4 text-rose-600" /> เบอร์โทรศัพท์ฉุกเฉินประเทศญี่ปุ่น (Japan Emergency Hotlines)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <b className="block text-rose-600 font-black">110</b>
                <span className="text-slate-600">เหตุด่วนเหตุร้าย / ตำรวจ</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <b className="block text-rose-600 font-black">119</b>
                <span className="text-slate-600">รถพยาบาล / ดับเพลิง</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <b className="block text-indigo-600 font-black">050-3816-2720</b>
                <span className="text-slate-600">Japan Visitor Hotline (JNTO)</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <b className="block text-slate-900 font-black">03-5789-2810</b>
                <span className="text-slate-600">สถานเอกอัครราชทูตไทย ณ กรุงโตเกียว</span>
              </div>
            </div>
          </div>

          {/* Document Footer */}
          <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-500 font-medium">
            <span>จัดทำโดย Travel Tracker • Smart AI Companion</span>
            <span>วันที่พิมพ์: {new Date().toLocaleDateString('th-TH')}</span>
          </div>

        </div>

      </div>
    </div>
  );
}
