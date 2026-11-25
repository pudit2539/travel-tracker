// src/components/trip-detail/modals/ReceiptAndAiKeyModals.tsx
'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, HardDriveDownload, Image as ImageIcon, Sparkles, X } from 'lucide-react';

interface ReceiptPreviewModalProps {
  previewImage: string | null;
  mounted: boolean;
  onClose: () => void;
  onDownloadReceipt: (imgUrl: string) => void;
}

export const ReceiptPreviewModal = React.memo(function ReceiptPreviewModal({
  previewImage,
  mounted,
  onClose,
  onDownloadReceipt,
}: ReceiptPreviewModalProps) {
  if (!previewImage || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-md animate-in fade-in duration-200 overscroll-contain"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative max-w-lg w-full bg-white dark:bg-[#161c27] p-4 sm:p-5 rounded-3xl border border-slate-200/90 dark:border-[#24324a] shadow-2xl space-y-3 animate-in zoom-in-95 duration-200 max-h-[92dvh] overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center pb-2 border-b border-slate-200/90 dark:border-[#24324a]">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>รูปภาพใบเสร็จ</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1a202c] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-2xl overflow-hidden bg-slate-950/20 flex items-center justify-center max-h-[58dvh] sm:max-h-[62dvh]">
          <img
            src={previewImage}
            alt="Receipt Preview"
            className="max-h-[56dvh] sm:max-h-[60dvh] w-auto object-contain rounded-xl shadow-md"
          />
        </div>

        <div className="pt-2 flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onDownloadReceipt(previewImage)}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/25 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer min-h-[42px] touch-manipulation"
            >
              <HardDriveDownload className="h-4 w-4" />
              <span>บันทึกรูปภาพ / แชร์ลงโทรศัพท์</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#24324a] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1a202c] transition-colors cursor-pointer min-h-[42px] touch-manipulation active:scale-95"
            >
              ปิด
            </button>
          </div>
          <p className="text-[10px] text-center text-slate-400">
            💡 บนมือถือ: สามารถกดปุ่มบันทึก หรือแตะค้างที่รูปภาพเพื่อเลือกบันทึกลงโทรศัพท์ (Save to Photos) ได้
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
});

interface AiKeySetupModalProps {
  isOpen: boolean;
  mounted: boolean;
  geminiApiKeyInput: string;
  setGeminiApiKeyInput: (val: string) => void;
  hasSavedGeminiKey: boolean;
  onSaveGeminiKey: (key: string) => void;
  onClose: () => void;
}

export const AiKeySetupModal = React.memo(function AiKeySetupModal({
  isOpen,
  mounted,
  geminiApiKeyInput,
  setGeminiApiKeyInput,
  hasSavedGeminiKey,
  onSaveGeminiKey,
  onClose,
}: AiKeySetupModalProps) {
  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 backdrop-blur-md bg-black/80 overscroll-contain overflow-x-hidden animate-in fade-in duration-200 select-none"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md rounded-2xl sm:rounded-3xl bg-white dark:bg-[#161c27] border border-slate-200/90 dark:border-[#24324a] shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90dvh] overflow-y-auto overflow-x-hidden touch-pan-y overscroll-contain animate-in zoom-in-95 duration-200 glow-blue">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-base">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <span>ตั้งค่า AI สแกนใบเสร็จ (Gemini)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1a202c] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          เพื่อให้ระบบอ่านตัวหนังสือ ชื่อร้าน ราคาสินค้า (อุปกรณ์ไอที, เสื้อผ้า, ค่าเดินทาง, อาหาร)
          จากใบเสร็จจริงโดย<strong>ไม่สุ่มหรือสมมุติข้อมูล</strong> กรุณาระบุ Google Gemini API Key
        </p>

        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noreferrer"
          className="p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-2 text-xs font-bold text-amber-800 dark:text-amber-200 hover:opacity-95 transition-opacity"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">🎁</span>
            <span>รับ Gemini API Key ฟรีจาก Google AI Studio</span>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-amber-600" />
        </a>

        <div>
          <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">
            Google Gemini API Key
          </label>
          <input
            type="password"
            value={geminiApiKeyInput}
            onChange={(e) => setGeminiApiKeyInput(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#24324a] bg-slate-50 dark:bg-[#1a202c] text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
          <p className="text-[10px] text-slate-400 mt-1">
            คีย์จะถูกบันทึกไว้ใน Browser ของคุณอย่างปลอดภัย หรือใส่ GEMINI_API_KEY ใน .env.local ก็ได้
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          {hasSavedGeminiKey && (
            <button
              type="button"
              onClick={() => {
                setGeminiApiKeyInput('');
                onSaveGeminiKey('');
              }}
              className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-[#24324a] text-slate-500 hover:text-rose-600 text-xs font-bold transition-colors cursor-pointer min-h-[42px] touch-manipulation active:scale-95"
            >
              ล้างค่า
            </button>
          )}
          <button
            type="button"
            onClick={() => onSaveGeminiKey(geminiApiKeyInput)}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 min-h-[42px] touch-manipulation"
          >
            บันทึก API Key
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
});
