'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Upload, Link2, RotateCcw, X, Check, Sparkles, ClipboardPaste } from 'lucide-react';
import {
  getCustomPlacePhoto,
  setCustomPlacePhoto,
  compressImageFileToDataUrl,
} from '@/lib/placeThumbnails';

export interface CustomPlacePhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  placeName: string;
  city?: string;
  itemId?: string;
  currentAutoImageUrl?: string;
}

export function CustomPlacePhotoModal({
  isOpen,
  onClose,
  placeName,
  city,
  itemId,
  currentAutoImageUrl,
}: CustomPlacePhotoModalProps) {
  const [mounted, setMounted] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [urlInput, setUrlInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const existing = getCustomPlacePhoto(placeName, itemId);
    setPreviewUrl(existing || '');
    setUrlInput(existing && !existing.startsWith('data:') ? existing : '');
    setStatusMsg(null);
  }, [isOpen, placeName, itemId]);

  // Support Ctrl+V / Cmd+V clipboard screenshot paste anywhere while modal is open
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            setIsProcessing(true);
            setStatusMsg('กำลังประมวลผลภาพที่แคปหน้าจอ...');
            try {
              const dataUrl = await compressImageFileToDataUrl(blob, 1100, 0.85);
              setPreviewUrl(dataUrl);
              setStatusMsg('วางภาพจาก Clipboard สำเร็จ! กด "บันทึกรูปนี้" ได้เลย');
            } catch {
              setStatusMsg('ไม่สามารถอ่านภาพจาก Clipboard ได้');
            } finally {
              setIsProcessing(false);
            }
          }
          return;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  const hasCustomOverride = Boolean(getCustomPlacePhoto(placeName, itemId));

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setStatusMsg('กำลังย่อขนาดและปรับความคมชัดของรูปภาพ...');
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 1100, 0.85);
      setPreviewUrl(dataUrl);
      setStatusMsg(`เลือกรูป "${file.name}" สำเร็จ! กดบันทึกรูปนี้ได้เลย`);
    } catch {
      setStatusMsg('เกิดข้อผิดพลาดในการอ่านไฟล์รูปภาพ');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setPreviewUrl(trimmed);
    setStatusMsg('โหลดรูปจากลิงก์เรียบร้อย กดบันทึกรูปนี้ได้เลย');
  };

  const handleSave = () => {
    const finalUrl = previewUrl.trim() || urlInput.trim();
    if (!finalUrl) return;
    setCustomPlacePhoto(placeName, finalUrl, itemId);
    onClose();
  };

  const handleResetToAuto = () => {
    setCustomPlacePhoto(placeName, null, itemId);
    setPreviewUrl('');
    setUrlInput('');
    onClose();
  };

  const displayPreview = previewUrl || currentAutoImageUrl || '';

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="เปลี่ยนรูปภาพสถานที่"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90dvh] overflow-y-auto overscroll-contain rounded-3xl bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#25314d] shadow-2xl p-4 sm:p-6 space-y-4 text-left"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
              <Camera className="h-3.5 w-3.5" />
              <span>Custom Place Photo (Optional)</span>
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white line-clamp-2 mt-0.5">
              {placeName}
            </h3>
            {city && (
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                📍 {city}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 dark:bg-[#1c2438] text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer shrink-0"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Live 16:10 Preview */}
        <div
          style={{ aspectRatio: '16 / 10' }}
          className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-[#25314d]"
        >
          {displayPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayPreview}
              alt={placeName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
              ยังไม่มีรูปภาพตัวอย่าง
            </div>
          )}
          <div className="absolute top-2.5 left-2.5">
            <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-black/65 text-white backdrop-blur-md border border-white/15 inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-300" />
              <span>{previewUrl ? 'ตัวอย่างรูปที่คุณเลือกเอง' : 'รูปอัตโนมัติปัจจุบัน (Google Maps / HD)'}</span>
            </span>
          </div>
        </div>

        {/* Option 1 & 2: Upload PNG/JPG or Paste Screenshot (Ctrl+V) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/*"
            onChange={handleFileChange}
            className="hidden"
            data-testid="custom-photo-file-input"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-800/70 bg-blue-50/50 dark:bg-blue-950/25 hover:bg-blue-100/60 dark:hover:bg-blue-950/45 text-blue-700 dark:text-blue-300 transition-colors cursor-pointer"
          >
            <Upload className="h-5 w-5 text-blue-500" />
            <span className="text-xs font-black">อัปโหลดไฟล์ PNG / JPG</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              เลือกรูปที่แคปไว้จากเครื่อง/มือถือ
            </span>
          </button>

          <div className="flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-800/70 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 text-center">
            <ClipboardPaste className="h-5 w-5 text-emerald-500" />
            <span className="text-xs font-black">กด Ctrl+V วางรูปที่แคปมา</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              แคปหน้าจอจาก Google Maps แล้วกดวางได้ทันที
            </span>
          </div>
        </div>

        {/* Option 3: Paste direct image URL */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5 text-indigo-500" />
            <span>หรือวางลิงก์รูปภาพ (Image URL)</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://..."
              className="flex-1 px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#1c2438] border border-slate-200 dark:border-[#2a3652] text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={handleApplyUrl}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-[#253048] text-slate-700 dark:text-slate-200 hover:bg-slate-200 cursor-pointer shrink-0"
            >
              ดูตัวอย่าง
            </button>
          </div>
        </div>

        {statusMsg && (
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-3 py-2 rounded-xl">
            {statusMsg}
          </p>
        )}

        {/* Footer Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-[#222c42]">
          {hasCustomOverride || previewUrl ? (
            <button
              type="button"
              onClick={handleResetToAuto}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>รีเซ็ตเป็นรูปอัตโนมัติ (Google Maps HD)</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-400">
              รูปที่บันทึกจะแสดงทั้งในการ์ดภาพปกและแถวย่อทันที
            </span>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1c2438] cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!previewUrl && !urlInput.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white shadow-sm cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />
              <span>บันทึกรูปนี้</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
