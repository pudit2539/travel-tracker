// src/components/trip-detail/modals/ReceiptAndAiKeyModals.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, HardDriveDownload, Image as ImageIcon, RotateCw, Sparkles, X, ZoomIn, ZoomOut } from 'lucide-react';

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
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  useEffect(() => {
    setZoom(1);
    setRotation(0);
  }, [previewImage]);

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

        <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-2xl bg-slate-100/90 dark:bg-[#0d131f] border border-slate-200/80 dark:border-[#24324a]">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(1, Number((z - 0.5).toFixed(1))))}
              disabled={zoom <= 1}
              aria-label="ซูมออก"
              className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-white dark:bg-[#161c27] border border-slate-200 dark:border-[#24324a] text-slate-700 dark:text-slate-200 disabled:opacity-40 flex items-center gap-1 cursor-pointer tactile-press"
            >
              <ZoomOut className="h-3.5 w-3.5" />
              <span>-</span>
            </button>
            <span className="px-2 text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.5).toFixed(1))))}
              disabled={zoom >= 2.5}
              aria-label="ซูมเข้า"
              className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-white dark:bg-[#161c27] border border-slate-200 dark:border-[#24324a] text-slate-700 dark:text-slate-200 disabled:opacity-40 flex items-center gap-1 cursor-pointer tactile-press"
            >
              <ZoomIn className="h-3.5 w-3.5" />
              <span>+</span>
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              aria-label="หมุนรูป 90 องศา"
              className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-white dark:bg-[#161c27] border border-slate-200 dark:border-[#24324a] text-slate-700 dark:text-slate-200 hover:border-blue-400 flex items-center gap-1 cursor-pointer tactile-press"
            >
              <RotateCw className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>หมุน 90°</span>
            </button>
            {(zoom !== 1 || rotation !== 0) && (
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setRotation(0);
                }}
                className="px-2 py-1.5 rounded-xl text-[10px] font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer"
              >
                รีเซ็ต
              </button>
            )}
          </div>
        </div>

        <div className="rounded-2xl overflow-auto bg-slate-950/20 flex items-center justify-center max-h-[54dvh] sm:max-h-[58dvh] p-2">
          <img
            src={previewImage}
            alt="Receipt Preview"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
            }}
            className="max-h-[50dvh] sm:max-h-[54dvh] w-auto object-contain rounded-xl shadow-md transition-transform duration-200 ease-out will-change-transform"
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
