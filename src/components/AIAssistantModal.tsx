// src/components/AIAssistantModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Sparkles, X, ExternalLink, Loader2, Bot, Plus, KeyRound, Info
} from 'lucide-react';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCity?: string;
  availableDays?: string[];
  defaultDay?: string;
  onAddToItinerary?: (item: {
    title: string;
    category: string;
    mapsQuery: string;
    city?: string;
    transport_info?: string;
    food_recommend?: string;
    date_label?: string;
  }) => void;
  onOpenAiKeyModal?: () => void;
}

export default function AIAssistantModal({
  isOpen,
  onClose,
  currentCity = 'Osaka',
  availableDays = [],
  defaultDay,
  onAddToItinerary,
  onOpenAiKeyModal,
}: AIAssistantModalProps) {
  const [customCity, setCity] = useState<string | null>(null);
  const city = customCity ?? currentCity;
  const [customQuery, setCustomQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [metaInfo, setMetaInfo] = useState<{
    isFallback?: boolean;
    provider?: string;
    fallbackReason?: string;
  } | null>(null);
  const [customSelectedDay, setSelectedDay] = useState<string | null>(null);
  const selectedDay = customSelectedDay ?? defaultDay ?? availableDays[0] ?? '';

  const quickPresets = [
    { label: 'ร้านอาหาร & สตรีทฟู้ดเด็ด', query: 'ร้านอาหารเด็ดใกล้เคียง street food ยอดนิยม' },
    { label: 'คาเฟ่ & เบเกอรี่ถ่ายรูปสวย', query: 'คาเฟ่สวย บรรยากาศดี ถ่ายรูปสวย' },
    { label: 'ที่เที่ยวในร่ม (ฝนตก/หนาว)', query: 'ที่เที่ยวในร่ม indoor แหล่งชอปปิงเมื่อฝนตก' },
    { label: 'จุดเช็กอิน & แลนด์มาร์กสำคัญ', query: 'จุดถ่ายรูปสวย signature landmark' },
  ];

  const handleAskAI = async (queryText?: string) => {
    const q = queryText || customQuery;
    if (!q.trim()) return;

    setLoading(true);
    setHasSearched(true);
    setMetaInfo(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      if (typeof window !== 'undefined') {
        const geminiKey = (
          localStorage.getItem('travel_tracker_gemini_api_key') ||
          localStorage.getItem('gemini_api_key') ||
          ''
        ).trim();
        const anthropicKey = (
          localStorage.getItem('travel_tracker_anthropic_api_key') ||
          localStorage.getItem('anthropic_api_key') ||
          ''
        ).trim();
        if (geminiKey) headers['x-gemini-key'] = geminiKey;
        if (anthropicKey) headers['x-anthropic-key'] = anthropicKey;
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
        setMetaInfo({
          isFallback: Boolean(data.isFallback),
          provider: data.provider,
          fallbackReason: data.fallbackReason,
        });
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error('AI assistant error:', err);
    } finally {
      setLoading(false);
    }
  };

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
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overscroll-contain overflow-x-hidden animate-in fade-in duration-200 select-none modal-safe-overlay" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-2xl sm:rounded-3xl bg-white dark:bg-[#181a20] shadow-2xl border border-slate-200 dark:border-[#262932] card-elevation max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 modal-safe-card">
        {/* Header */}
        <div className="p-4 sm:p-5 flex justify-between items-center border-b border-slate-100 dark:border-[#262932] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 dark:bg-blue-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>AI Travel Assistant</span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full font-bold border border-blue-200/60 dark:border-blue-800/40">
                  Co-Pilot
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                ค้นหาที่เที่ยว ร้านอาหารเด็ด จุดเช็กอินลับ ตอบไวทันใจ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1e2027] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto overflow-x-hidden touch-pan-y overscroll-contain custom-scrollbar flex-1 min-h-0 space-y-4">
          
          {/* City / Area input */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className="block text-[11px] font-bold mb-1 text-slate-800 dark:text-slate-200">เมือง / ย่าน</label>
              <input
                type="text"
                placeholder="เช่น Namba, Kyoto"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#262932] bg-slate-50 dark:bg-[#121316] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-500 font-bold"
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
                  className="flex-1 p-2.5 rounded-xl border border-slate-200 dark:border-[#262932] bg-slate-50 dark:bg-[#121316] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-500 font-medium"
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
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold border border-slate-200 dark:border-[#262932] bg-slate-50 hover:bg-blue-50 dark:bg-[#1e2027] dark:hover:bg-[#262932] text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer shadow-2xs"
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
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">ระบบ AI กำลังค้นหาข้อมูลทริป...</span>
              </div>
            ) : hasSearched && results.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400 font-medium">
                ไม่พบข้อมูลคำแนะนำ กรุณาลองพิมพ์ค้นหาด้วยคำอื่น
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>{results.length} คำแนะนำสำหรับ {city || 'Osaka'}</span>
                    {metaInfo && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          metaInfo.isFallback
                            ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50'
                            : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
                        }`}
                      >
                        {metaInfo.isFallback
                          ? 'คำแนะนำพื้นฐาน (Offline)'
                          : `AI: ${metaInfo.provider === 'gemini' ? 'Gemini' : 'Claude'}`}
                      </span>
                    )}
                  </span>

                  {onAddToItinerary && availableDays.length > 0 && (
                    <select
                      value={selectedDay}
                      onChange={(e) => setSelectedDay(e.target.value)}
                      className="px-2 py-1 rounded-lg border border-slate-200 dark:border-[#262932] bg-slate-50 dark:bg-[#1e2027] text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                      aria-label="เลือกวันที่จะเพิ่มลงแผน"
                    >
                      {availableDays.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {metaInfo?.isFallback && (
                  <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-800 dark:text-amber-200">
                    <span className="flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {metaInfo.fallbackReason === 'no_api_key'
                          ? 'ยังไม่ได้เชื่อมต่อ AI API Key จึงแสดงคำแนะนำพื้นฐาน'
                          : 'AI ชั่วคราวไม่ตอบสนอง จึงแสดงคำแนะนำพื้นฐานแทน'}
                      </span>
                    </span>
                    {onOpenAiKeyModal && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenAiKeyModal();
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] shrink-0 cursor-pointer"
                      >
                        <KeyRound className="h-3 w-3" />
                        <span>ตั้งค่า Key</span>
                      </button>
                    )}
                  </div>
                )}

                {results.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-[#262932] bg-slate-50/70 dark:bg-[#121316] shadow-xs space-y-2"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white">
                          {item.name}
                        </h4>
                        <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900 inline-block mt-0.5">
                          {item.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {onAddToItinerary && (
                          <button
                            type="button"
                            onClick={() => {
                              onAddToItinerary({
                                title: item.name,
                                category: item.category || '',
                                mapsQuery: item.mapsQuery || item.name,
                                city: city || 'Osaka',
                                transport_info: item.transportTip || '',
                                food_recommend:
                                  String(item.category || '').includes('อาหาร') ||
                                  String(item.category || '').includes('ราเมง') ||
                                  String(item.category || '').includes('คาเฟ่')
                                    ? item.highlight || ''
                                    : '',
                                date_label: selectedDay || availableDays[0] || undefined,
                              });
                              onClose();
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold transition-all cursor-pointer shadow-2xs"
                          >
                            <Plus className="h-3 w-3" /> เพิ่มลงแผน
                          </button>
                        )}
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.mapsQuery || item.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white dark:bg-[#1e2027] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#262932] text-[10px] font-bold hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 transition-all cursor-pointer shadow-2xs"
                        >
                          <ExternalLink className="h-3 w-3" /> เปิดแผนที่
                        </a>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                      {item.highlight}
                    </p>
                    {item.transportTip && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                        🚉 {item.transportTip}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-[#262932] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-slate-200 dark:border-[#262932] text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1e2027] transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
}
