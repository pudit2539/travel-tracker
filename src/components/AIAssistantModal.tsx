// src/components/AIAssistantModal.tsx
'use client';

import { useState } from 'react';
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
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#120c1e] shadow-2xl border border-slate-200 dark:border-purple-800/60 glow-pink-purple max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 pb-3 flex justify-between items-center border-b border-slate-100 dark:border-purple-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white text-lg shadow-md shadow-pink-500/25">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                AI Travel Co-Pilot 🤖✨
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-purple-300/70 font-medium">
                ค้นหาที่เที่ยว/ร้านอาหารเฉพาะจุด ประหยัด Token ตอบไวทันใจ
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

        {/* Body */}
        <div className="p-6 pt-4 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          
          {/* City / Area input */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className="block text-[11px] font-bold mb-1 text-slate-800 dark:text-purple-200">เมือง / ย่าน</label>
              <input
                type="text"
                placeholder="เช่น Namba, Kyoto"
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-bold"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-bold mb-1 text-slate-800 dark:text-purple-200">ต้องการหาอะไร</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="เช่น ราเมงเปิดดึก, คาเฟ่แมว, ตลาดปลา"
                  className="flex-1 p-2.5 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-medium"
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                />
                <button
                  type="button"
                  onClick={() => handleAskAI()}
                  disabled={loading}
                  className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-xs shadow-sm hover:opacity-95 disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ค้นหา'}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 dark:text-purple-400 block">คำถามด่วนยอดนิยม:</span>
            <div className="flex flex-wrap gap-1.5">
              {quickPresets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCustomQuery(preset.query);
                    handleAskAI(preset.query);
                  }}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-slate-300 dark:border-purple-800/60 bg-slate-50 hover:bg-slate-100 dark:bg-purple-950/30 text-slate-800 dark:text-purple-200 hover:border-pink-500 hover:text-pink-600 dark:hover:text-pink-400 transition-all cursor-pointer shadow-2xs"
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
                <Loader2 className="h-7 w-7 animate-spin text-pink-500" />
                <span className="text-xs font-bold text-slate-500 dark:text-purple-400">Claude AI กำลังค้นหาข้อมูล...</span>
              </div>
            ) : hasSearched && results.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 dark:text-purple-400 font-medium">
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
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-purple-900/40 bg-slate-50/60 dark:bg-[#180f28]/80 shadow-xs space-y-1.5"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white">
                          {item.name}
                        </h4>
                        <span className="text-[10px] font-bold text-pink-700 dark:text-pink-300 bg-pink-100 dark:bg-pink-950/60 px-2 py-0.5 rounded-full border border-pink-200 dark:border-pink-900 inline-block mt-0.5">
                          {item.category}
                        </span>
                      </div>

                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.mapsQuery || item.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white dark:bg-purple-900/70 text-slate-800 dark:text-purple-200 border border-slate-200 dark:border-purple-800 text-[10px] font-bold hover:bg-pink-500 hover:text-white hover:border-pink-500 transition-all shrink-0 cursor-pointer shadow-2xs"
                      >
                        <ExternalLink className="h-3 w-3" /> เปิดแผนที่
                      </a>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-purple-200/80 leading-relaxed font-medium">
                      {item.highlight}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 pt-3 border-t border-slate-100 dark:border-purple-900/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-slate-300 dark:border-purple-800 text-xs font-bold text-slate-700 dark:text-purple-200 hover:bg-slate-100 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
}
