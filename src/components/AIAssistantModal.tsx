// src/components/AIAssistantModal.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Sparkles, X, MapPin, ExternalLink, Loader2, 
  Utensils, Coffee, CloudRain, Compass, Search, Plus
} from 'lucide-react';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCity?: string;
  onAddToItinerary?: (item: { title: string; category: string; mapsQuery: string }) => void;
}

export default function AIAssistantModal({
  isOpen,
  onClose,
  currentCity = 'Osaka',
  onAddToItinerary,
}: AIAssistantModalProps) {
  const [city, setCity] = useState(currentCity);
  const [customQuery, setCustomQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const quickPresets = [
    { label: '🍜 ร้านอาหารเด็ด / Street Food', query: 'ร้านอาหารเด็ดใกล้เคียง street food ยอดนิยม' },
    { label: '☕ คาเฟ่สวย ถ่ายรูปปัง', query: 'คาเฟ่สวย บรรยากาศดี ถ่ายรูปสวย' },
    { label: '☔ ที่เที่ยวในร่ม (ฝนตก/หนาว)', query: 'ที่เที่ยวในร่ม indoor แหล่งชอปปิงเมื่อฝนตก' },
    { label: '⛩️ จุดถ่ายรูปและแลนด์มาร์ค', query: 'จุดถ่ายรูปสวย signature landmark' },
  ];

  const handleAskAI = async (queryText?: string) => {
    const q = queryText || customQuery;
    if (!q.trim()) return;

    setLoading(true);
    setHasSearched(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          city: city || 'Osaka',
          query: q,
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.recommendations) {
        setResults(data.data.recommendations);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error('AI assistant error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#151b2b] shadow-2xl border border-slate-200 dark:border-[#222c42] card-elevation max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Mobile Sheet Handle */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />
        
        {/* Header */}
        <div className="p-4 sm:p-5 flex justify-between items-center border-b border-slate-100 dark:border-[#222c42]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 dark:bg-blue-700 flex items-center justify-center text-white text-lg shadow-md shadow-blue-500/20">
              <span>🐱</span>
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Cat AI Travel Assistant</span>
                <span className="text-[10px] text-[#f43f5e] dark:text-[#fb7185] bg-rose-50 dark:bg-rose-950/40 px-2 py-0.2 rounded-full font-bold border border-rose-200/60 dark:border-[#fb7185]/30">
                  AI Co-Pilot 🐾
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                ค้นหาที่เที่ยว ร้านอาหารเด็ด จุดเช็กอินลับ ตอบไวทันใจ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1c2438] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          
          {/* City / Area input */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className="block text-[11px] font-bold mb-1 text-slate-800 dark:text-slate-200">เมือง / ย่าน</label>
              <input
                type="text"
                placeholder="เช่น Namba, Kyoto"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#111624] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-500 font-bold"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-bold mb-1 text-slate-800 dark:text-slate-200">ต้องการหาอะไร</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="เช่น ราเมงเปิดดึก, คาเฟ่แมว, ตลาดปลา"
                  className="flex-1 p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#111624] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-500 font-medium"
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                />
                <button
                  type="button"
                  onClick={() => handleAskAI()}
                  disabled={loading}
                  className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer shrink-0 transition-all"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ค้นหา'}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Presets (Trip.com style chips) */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">คำถามด่วนยอดนิยม:</span>
            <div className="flex flex-wrap gap-1.5">
              {quickPresets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCustomQuery(preset.query);
                    handleAskAI(preset.query);
                  }}
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold border border-slate-200 dark:border-[#222c42] bg-slate-50 hover:bg-blue-50 dark:bg-[#1c2438] dark:hover:bg-[#222c42] text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer shadow-2xs"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Results Area */}
          <div className="pt-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">น้องแมว AI กำลังค้นหาข้อมูลทริป... 🐾</span>
              </div>
            ) : hasSearched && results.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400 font-medium">
                ไม่พบข้อมูลคำแนะนำ กรุณาลองพิมพ์ค้นหาด้วยคำอื่น
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-2.5">
                <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1">
                  ✨ 3 คำแนะนำที่ดีที่สุดสำหรับคุณ:
                </span>

                {results.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-[#222c42] bg-slate-50/70 dark:bg-[#111624] shadow-xs space-y-1.5"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white">
                          {item.name}
                        </h4>
                        <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900 inline-block mt-0.5">
                          {item.category}
                        </span>
                      </div>

                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.mapsQuery || item.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white dark:bg-[#1c2438] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#222c42] text-[10px] font-bold hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 transition-all shrink-0 cursor-pointer shadow-2xs"
                      >
                        <ExternalLink className="h-3 w-3" /> เปิดแผนที่
                      </a>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                      {item.highlight}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-[#222c42] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-slate-200 dark:border-[#222c42] text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1c2438] transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
}
