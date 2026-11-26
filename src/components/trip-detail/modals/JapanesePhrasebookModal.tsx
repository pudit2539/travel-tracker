// src/components/trip-detail/modals/JapanesePhrasebookModal.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen,
  Check,
  Copy,
  Layers,
  Maximize2,
  RotateCw,
  Search,
  Sparkles,
  Star,
  Turtle,
  Volume2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/clipboard';
import { triggerHaptic } from '@/lib/haptics';
import {
  JAPANESE_PHRASEBOOK,
  PHRASE_CATEGORY_META,
  JapanesePhraseItem,
  PhraseCategoryId,
  filterJapanesePhrases,
  getFavoritePhraseIds,
  toggleFavoritePhraseId,
  speakJapanesePhrase,
} from '@/data/japanesePhrasebook';

interface JapanesePhrasebookModalProps {
  isOpen: boolean;
  mounted: boolean;
  onClose: () => void;
}

type BookTabMode = 'dictionary' | 'flashcard' | 'quiz';

export const JapanesePhrasebookModal = React.memo(function JapanesePhrasebookModal({
  isOpen,
  mounted,
  onClose,
}: JapanesePhrasebookModalProps) {
  const [mode, setMode] = useState<BookTabMode>('dictionary');
  const [selectedCategory, setSelectedCategory] = useState<PhraseCategoryId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => getFavoritePhraseIds());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [bigShowCard, setBigShowCard] = useState<JapanesePhraseItem | null>(null);
  const [customSpeakText, setCustomSpeakText] = useState('');

  // Flashcard state
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<string[]>([]);

  // Quiz state
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizPickedId, setQuizPickedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (bigShowCard) setBigShowCard(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, bigShowCard, onClose]);

  const filteredPhrases = useMemo(
    () => filterJapanesePhrases(JAPANESE_PHRASEBOOK, selectedCategory, searchQuery, favoriteIds),
    [selectedCategory, searchQuery, favoriteIds]
  );

  const deck = filteredPhrases.length > 0 ? filteredPhrases : JAPANESE_PHRASEBOOK;
  const currentCard = deck[cardIndex % deck.length];
  const quizTarget = deck[quizIndex % deck.length];

  const quizChoices = useMemo(() => {
    const others = JAPANESE_PHRASEBOOK.filter((p) => p.id !== quizTarget.id);
    const step = Math.max(1, Math.floor(others.length / 3));
    const distractors = [
      others[(quizIndex * 3) % others.length],
      others[(quizIndex * 3 + step) % others.length],
      others[(quizIndex * 3 + step * 2) % others.length],
    ].filter(Boolean);
    const combined = [quizTarget, ...distractors.slice(0, 3)];
    // Deterministic rotate based on quizIndex so UI stays pure
    const shift = quizIndex % combined.length;
    return [...combined.slice(shift), ...combined.slice(0, shift)];
  }, [quizTarget, quizIndex]);

  if (!isOpen || !mounted) return null;

  const handleToggleFavorite = (id: string) => {
    triggerHaptic('light');
    const next = toggleFavoritePhraseId(id);
    setFavoriteIds(next);
  };

  const handleSpeak = (text: string, speed: 'normal' | 'slow' = 'normal') => {
    triggerHaptic('light');
    const ok = speakJapanesePhrase(text, speed);
    if (!ok) {
      toast.info('อุปกรณ์นี้ไม่รองรับเสียงสังเคราะห์ ja-JP แต่ยังเปิดการ์ดให้คนญี่ปุ่นอ่านได้ครับ');
    }
  };

  const handleCopy = async (item: JapanesePhraseItem) => {
    const ok = await copyToClipboard(`${item.japanese} (${item.romaji})`);
    if (ok) {
      setCopiedId(item.id);
      toast.success(`คัดลอก "${item.japanese}" แล้ว ✨`);
      setTimeout(() => setCopiedId(null), 1800);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center backdrop-blur-md bg-black/80 p-2.5 sm:p-4 overscroll-contain animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-2xl rounded-3xl bg-white dark:bg-[#161c27] border border-[#dbeafe] dark:border-[#24324a] shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Oceanic Kawaii Kotoba Theme) */}
        <div className="p-4 sm:p-5 pb-3 border-b border-slate-200/80 dark:border-[#24324a] bg-gradient-to-r from-[#eff6ff] via-white to-[#f0f9ff] dark:from-[#0d131f] dark:via-[#161c27] dark:to-[#080e19] shrink-0 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#0284c7] text-white flex items-center justify-center shadow-md shadow-blue-500/25 text-lg shrink-0">
                🇯🇵
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                  <span>สมุดพกภาษาญี่ปุ่น (Kotoba Book)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#2563eb]/10 text-[#2563eb] dark:bg-[#4cd7f6]/15 dark:text-[#4cd7f6]">
                    {JAPANESE_PHRASEBOOK.length} ประโยค
                  </span>
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                  กดฟังเสียงคนญี่ปุ่นแท้ • อ่านคำไทยง่ายๆ • ยื่นจอให้พนักงานอ่านได้ทันที
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="ปิดสมุดคำศัพท์ภาษาญี่ปุ่น"
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a202c] cursor-pointer shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 3 Interactive Mode Switcher */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-[#080e19] border border-slate-200/80 dark:border-[#24324a]">
            <button
              type="button"
              onClick={() => setMode('dictionary')}
              className={`py-2 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'dictionary'
                  ? 'bg-white dark:bg-[#161c27] text-[#2563eb] dark:text-[#4cd7f6] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>สมุดคำศัพท์</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('flashcard');
                setIsFlipped(false);
              }}
              className={`py-2 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'flashcard'
                  ? 'bg-white dark:bg-[#161c27] text-[#2563eb] dark:text-[#4cd7f6] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Flashcard ฝึกจำ</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('quiz');
                setQuizPickedId(null);
              }}
              className={`py-2 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'quiz'
                  ? 'bg-white dark:bg-[#161c27] text-[#2563eb] dark:text-[#4cd7f6] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>ทายเสียงญี่ปุ่น</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-3.5 sm:p-5 overflow-y-auto flex-1 min-h-0 custom-scrollbar space-y-3.5">
          {mode === 'dictionary' && (
            <>
              {/* Search & Custom Speak Box */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-7 relative">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ค้นหาคำ: ถุง, เวฟ, น้ำเปล่า, ห้องน้ำ, Tax-Free..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-[#24324a] bg-slate-50 dark:bg-[#0d131f] text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-[#2563eb]"
                  />
                </div>
                <div className="sm:col-span-5 flex gap-1.5">
                  <input
                    type="text"
                    placeholder="พิมพ์ญี่ปุ่นให้ช่วยพูด..."
                    value={customSpeakText}
                    onChange={(e) => setCustomSpeakText(e.target.value)}
                    className="flex-1 min-w-0 px-2.5 py-2 rounded-xl border border-slate-200 dark:border-[#24324a] bg-slate-50 dark:bg-[#0d131f] text-xs text-slate-900 dark:text-white outline-none focus:border-[#2563eb]"
                  />
                  <button
                    type="button"
                    onClick={() => handleSpeak(customSpeakText || 'すみません', 'normal')}
                    className="px-3 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer active:scale-95"
                    title="กดเพื่ออ่านออกเสียงภาษาญี่ปุ่น"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>พูด</span>
                  </button>
                </div>
              </div>

              {/* Category Filter Strip */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {PHRASE_CATEGORY_META.map((cat) => {
                  const active = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-bold shrink-0 border transition-all cursor-pointer active:scale-95 ${
                        active
                          ? 'bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] text-white border-[#2563eb] shadow-xs'
                          : 'bg-slate-50 dark:bg-[#080e19] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#24324a] hover:border-[#2563eb]'
                      }`}
                    >
                      <span>{cat.emoji}</span>
                      <span>{cat.label}</span>
                      {cat.id === 'favorites' && favoriteIds.length > 0 && (
                        <span className="font-mono text-[10px] opacity-85">({favoriteIds.length})</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Phrase Cards */}
              {filteredPhrases.length === 0 ? (
                <div className="text-center py-10 rounded-2xl border border-dashed border-slate-200 dark:border-[#24324a] text-xs text-slate-500 dark:text-slate-400">
                  {selectedCategory === 'favorites'
                    ? 'ยังไม่มีประโยคที่กด ⭐ บันทึกไว้ — กดรูปดาวมุมขวาบนของการ์ดเพื่อเก็บคำที่ใช้บ่อย!'
                    : 'ไม่พบคำศัพท์ที่ค้นหา ลองพิมพ์คำสั้นๆ เช่น ถุง, น้ำ, รถไฟ'}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredPhrases.map((item) => {
                    const isFav = favoriteIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        data-testid={`phrase-card-${item.id}`}
                        className="p-3.5 sm:p-4 rounded-2xl border border-[#e2e8f0] dark:border-[#24324a] bg-white dark:bg-[#0d131f]/75 hover:border-[#2563eb]/60 dark:hover:border-[#4cd7f6]/40 transition-all space-y-2 shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-8 h-8 rounded-xl bg-[#eff6ff] dark:bg-[#161c27] border border-[#bfdbfe] dark:border-[#24324a] flex items-center justify-center text-base shrink-0">
                              {item.emoji}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-snug">
                                {item.thai}
                              </div>
                              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                💡 {item.context}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleFavorite(item.id)}
                            aria-label={`บันทึกคำว่า ${item.thai}`}
                            className={`p-1.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
                              isFav
                                ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-500'
                                : 'bg-slate-50 dark:bg-[#161c27] border-slate-200 dark:border-[#24324a] text-slate-400 hover:text-amber-500'
                            }`}
                          >
                            <Star className={`h-3.5 w-3.5 ${isFav ? 'fill-amber-400' : ''}`} />
                          </button>
                        </div>

                        {/* Japanese + Kana + Thai Phonetic Box */}
                        <div className="p-3 rounded-xl bg-[#f8fafd] dark:bg-[#161c27] border border-[#e2e8f0] dark:border-[#24324a] space-y-1">
                          <div className="text-base sm:text-lg font-black text-[#0f172a] dark:text-[#f8fafc] tracking-wide">
                            {item.japanese}
                          </div>
                          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            {item.kana} · <span className="font-mono">{item.romaji}</span>
                          </div>
                          <div className="text-xs sm:text-sm font-black text-[#2563eb] dark:text-[#4cd7f6] pt-0.5">
                            🗣️ อ่านว่า: &ldquo;{item.thaiPhonetic}&rdquo;
                          </div>
                          {item.staffReplyHint && (
                            <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 pt-1">
                              💬 {item.staffReplyHint}
                            </div>
                          )}
                        </div>

                        {/* Cute Action Buttons */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          <button
                            type="button"
                            onClick={() => handleSpeak(item.japanese, 'normal')}
                            aria-label={`ฟังเสียง ${item.japanese}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] text-white text-[11px] font-bold shadow-2xs hover:opacity-95 cursor-pointer active:scale-95"
                          >
                            <Volume2 className="h-3.5 w-3.5" />
                            <span>ฟังเสียง</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSpeak(item.japanese, 'slow')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#eff6ff] dark:bg-[#161c27] text-[#1d4ed8] dark:text-[#4cd7f6] border border-[#bfdbfe] dark:border-[#4cd7f6]/30 text-[11px] font-bold hover:bg-blue-100 cursor-pointer active:scale-95"
                            title="ฟังแบบช้าๆ ฝึกออกเสียงตาม"
                          >
                            <Turtle className="h-3.5 w-3.5" />
                            <span>ช้าๆ</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setBigShowCard(item)}
                            aria-label={`ยื่นจอให้ดู ${item.thai}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-[11px] font-bold hover:bg-emerald-100 cursor-pointer active:scale-95"
                          >
                            <Maximize2 className="h-3.5 w-3.5" />
                            <span>ยื่นจอให้ดู</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleCopy(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#161c27] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#24324a] text-[11px] font-bold hover:border-[#2563eb] cursor-pointer active:scale-95 ml-auto"
                          >
                            {copiedId === item.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            <span>{copiedId === item.id ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {mode === 'flashcard' && currentCard && (
            <div className="space-y-4 py-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>
                  การ์ดที่ {(cardIndex % deck.length) + 1} / {deck.length}
                </span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  ✓ จำได้แล้ว {masteredIds.length} คำ
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  const nextFlip = !isFlipped;
                  setIsFlipped(nextFlip);
                  if (nextFlip) {
                    speakJapanesePhrase(currentCard.japanese, 'normal');
                  }
                }}
                data-testid="flashcard-surface"
                className={`w-full min-h-[250px] p-6 rounded-3xl border-2 text-center flex flex-col items-center justify-center gap-3 transition-all cursor-pointer shadow-lg ${
                  isFlipped
                    ? 'bg-gradient-to-br from-[#080e19] via-[#0d131f] to-[#1e3a8a] border-[#4cd7f6]/50 text-white'
                    : 'bg-gradient-to-br from-[#eff6ff] via-white to-[#f0f9ff] dark:from-[#161c27] dark:to-[#0d131f] border-[#bfdbfe] dark:border-[#24324a] text-slate-900 dark:text-white'
                }`}
              >
                <span className="text-4xl">{currentCard.emoji}</span>
                {!isFlipped ? (
                  <>
                    <div className="text-lg sm:text-xl font-black leading-snug">
                      {currentCard.thai}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                      {currentCard.context}
                    </p>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2563eb]/10 text-[#2563eb] dark:text-[#4cd7f6] text-[11px] font-bold mt-2">
                      <RotateCw className="h-3.5 w-3.5" />
                      <span>แตะเพื่อพลิกดูภาษาญี่ปุ่น + ฟังเสียง</span>
                    </span>
                  </>
                ) : (
                  <>
                    <div className="text-2xl sm:text-3xl font-black text-white">
                      {currentCard.japanese}
                    </div>
                    <div className="text-xs text-slate-300">
                      {currentCard.kana} · <span className="font-mono">{currentCard.romaji}</span>
                    </div>
                    <div className="px-3.5 py-1.5 rounded-2xl bg-[#4cd7f6]/15 border border-[#4cd7f6]/35 text-[#4cd7f6] text-sm font-black">
                      🗣️ {currentCard.thaiPhonetic}
                    </div>
                  </>
                )}
              </button>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleSpeak(currentCard.japanese, 'slow')}
                  className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-[#0d131f] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#24324a] text-xs font-bold flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                >
                  <Turtle className="h-3.5 w-3.5" />
                  <span>ฟังช้าๆ</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsFlipped(false);
                    setCardIndex((prev) => prev + 1);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-[#0d131f] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#24324a] text-xs font-bold cursor-pointer active:scale-95"
                >
                  คำถัดไป ➔
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('medium');
                    setMasteredIds((prev) =>
                      prev.includes(currentCard.id) ? prev : [...prev, currentCard.id]
                    );
                    setIsFlipped(false);
                    setCardIndex((prev) => prev + 1);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer active:scale-95 shadow-xs"
                >
                  ✓ จำได้แล้ว!
                </button>
              </div>
            </div>
          )}

          {mode === 'quiz' && quizTarget && (
            <div className="space-y-4 py-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>ข้อที่ {quizIndex + 1}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono">
                  คะแนน: {quizScore}
                </span>
              </div>

              <div className="p-5 rounded-3xl bg-gradient-to-br from-[#eff6ff] to-white dark:from-[#080e19] dark:to-[#161c27] border border-[#bfdbfe] dark:border-[#24324a] text-center space-y-2.5">
                <div className="text-xs font-bold text-[#2563eb] dark:text-[#4cd7f6] uppercase tracking-wider">
                  ประโยคนี้แปลว่าอะไร?
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {quizTarget.japanese}
                </div>
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {quizTarget.romaji} · ({quizTarget.thaiPhonetic})
                </div>
                <button
                  type="button"
                  onClick={() => handleSpeak(quizTarget.japanese, 'normal')}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#2563eb] text-white text-xs font-bold cursor-pointer active:scale-95"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  <span>ฟังเสียงอีกครั้ง</span>
                </button>
              </div>

              <div className="space-y-2">
                {quizChoices.map((choice) => {
                  const isPicked = quizPickedId === choice.id;
                  const isCorrect = choice.id === quizTarget.id;
                  const showResult = Boolean(quizPickedId);
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      disabled={showResult}
                      onClick={() => {
                        setQuizPickedId(choice.id);
                        if (isCorrect) {
                          triggerHaptic('medium');
                          setQuizScore((s) => s + 1);
                          toast.success('🎉 ถูกต้อง! เก่งมากเลย');
                        } else {
                          triggerHaptic('light');
                        }
                      }}
                      className={`w-full p-3 rounded-2xl border text-left text-xs sm:text-sm font-bold flex items-center justify-between gap-2 transition-all cursor-pointer ${
                        showResult && isCorrect
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-200'
                          : showResult && isPicked && !isCorrect
                          ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-700 dark:text-rose-200'
                          : 'bg-white dark:bg-[#0d131f] border-slate-200 dark:border-[#24324a] text-slate-800 dark:text-slate-200 hover:border-[#2563eb]'
                      }`}
                    >
                      <span>
                        {choice.emoji} {choice.thai}
                      </span>
                      {showResult && isCorrect && <span>✓</span>}
                    </button>
                  );
                })}
              </div>

              {quizPickedId && (
                <button
                  type="button"
                  onClick={() => {
                    setQuizPickedId(null);
                    setQuizIndex((i) => i + 1);
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-black cursor-pointer active:scale-95"
                >
                  ข้อถัดไป ➔
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Big Show-to-Staff Card Overlay */}
      {bigShowCard && (
        <div
          className="fixed inset-0 z-[120] bg-[#080e19]/95 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center animate-in fade-in duration-150"
          onClick={() => setBigShowCard(null)}
          data-testid="phrase-big-show-card"
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-gradient-to-br from-[#0d131f] to-[#1e3a8a] border-2 border-[#4cd7f6]/50 p-6 sm:p-8 text-center space-y-5 shadow-2xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between text-xs text-[#4cd7f6] font-mono font-bold">
              <span>SHOW TO STAFF · ยื่นให้คนญี่ปุ่นดู</span>
              <button
                type="button"
                onClick={() => setBigShowCard(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="text-4xl">{bigShowCard.emoji}</div>
            <div className="text-3xl sm:text-4xl font-black leading-snug text-white">
              {bigShowCard.japanese}
            </div>
            <div className="text-sm text-[#acedff] font-medium">
              {bigShowCard.kana} · {bigShowCard.romaji}
            </div>
            <div className="p-3 rounded-2xl bg-black/30 border border-white/15 text-sm font-bold text-slate-200">
              {bigShowCard.thai}
            </div>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => handleSpeak(bigShowCard.japanese, 'normal')}
                className="px-5 py-2.5 rounded-2xl bg-[#2563eb] hover:bg-[#3b82f6] text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Volume2 className="h-4 w-4" />
                <span>เปิดเสียงพูด</span>
              </button>
              <button
                type="button"
                onClick={() => setBigShowCard(null)}
                className="px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer"
              >
                ปิดหน้าจอนี้
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
});
