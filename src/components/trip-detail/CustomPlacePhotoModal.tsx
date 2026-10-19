'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Camera,
  Upload,
  Link2,
  RotateCcw,
  X,
  Check,
  Sparkles,
  ClipboardPaste,
  Search,
  Loader2,
  ExternalLink,
  Navigation,
  ZoomIn,
  Cloud,
} from 'lucide-react';
import {
  getCustomPlacePhoto,
  setCustomPlacePhoto,
  compressImageFileToDataUrl,
  extractAttractionSearchQuery,
  fetchGooglePlacesPhotoCandidates,
  buildStreetViewUrl,
  PlacePhotoCandidate,
} from '@/lib/placeThumbnails';

export interface CustomPlacePhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  placeName: string;
  city?: string;
  itemId?: string;
  tripId?: string;
  currentAutoImageUrl?: string;
}

export function CustomPlacePhotoModal({
  isOpen,
  onClose,
  placeName,
  city,
  itemId,
  tripId,
  currentAutoImageUrl,
}: CustomPlacePhotoModalProps) {
  const [mounted, setMounted] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [urlInput, setUrlInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [candidates, setCandidates] = useState<PlacePhotoCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize modal state & fetch 5 Google Maps candidate angles
  useEffect(() => {
    if (!isOpen) return;
    const existing = getCustomPlacePhoto(placeName, itemId);
    setPreviewUrl(existing || '');
    setUrlInput(existing && !existing.startsWith('data:') ? existing : '');
    setStatusMsg(null);

    const initialSearch = extractAttractionSearchQuery(placeName, city) || placeName;
    setSearchQuery(initialSearch);

    let cancelled = false;
    setLoadingCandidates(true);
    fetchGooglePlacesPhotoCandidates(initialSearch, city)
      .then((list) => {
        if (!cancelled) {
          setCandidates(list);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCandidates(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, placeName, city, itemId]);

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

  const handleSearchGooglePhotos = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setLoadingCandidates(true);
    setStatusMsg(`กำลังค้นหารูปของ "${q}" จาก Google Maps...`);
    try {
      const list = await fetchGooglePlacesPhotoCandidates(q, city);
      setCandidates(list);
      if (list.length > 0) {
        setPreviewUrl(list[0].url);
        setStatusMsg(`พบรูปจาก Google Maps ${list.length} มุม! แตะเลือกรูปที่ชอบด้านล่างได้เลย`);
      } else {
        setStatusMsg('ไม่พบรูปเพิ่มเติมจากคำค้นนี้ ลองเปลี่ยนคำค้นเป็นชื่อภาษาอังกฤษสั้นๆ ดูครับ');
      }
    } finally {
      setLoadingCandidates(false);
    }
  };

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
    setCustomPlacePhoto(placeName, finalUrl, itemId, tripId);
    onClose();
  };

  const handleResetToAuto = () => {
    setCustomPlacePhoto(placeName, null, itemId, tripId);
    setPreviewUrl('');
    setUrlInput('');
    onClose();
  };

  const displayPreview = previewUrl || currentAutoImageUrl || '';

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="เปลี่ยนรูปภาพสถานที่"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl max-h-[90dvh] overflow-y-auto overscroll-contain rounded-3xl bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#25314d] shadow-2xl p-4 sm:p-6 space-y-4 text-left"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                <Camera className="h-3.5 w-3.5" />
                <span>Place Photo Studio</span>
              </span>
              {tripId && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/50">
                  <Cloud className="h-2.5 w-2.5" />
                  <span>ซิงก์ข้ามอุปกรณ์อัตโนมัติ</span>
                </span>
              )}
            </div>
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
              <span>{previewUrl ? 'ตัวอย่างรูปที่คุณเลือก' : 'รูปอัตโนมัติปัจจุบัน (Google Maps / HD)'}</span>
            </span>
          </div>
        </div>

        {/* Feature 2: Interactive Google Maps 5-Photo Picker + Custom Search */}
        <div className="p-3 rounded-2xl bg-slate-50/90 dark:bg-[#1a2236] border border-slate-200/80 dark:border-[#25314d] space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5 text-blue-500" />
              <span>เลือกรูปถ่ายสถานที่จริงจาก Google Maps (สูงสุด 5 มุม)</span>
            </span>
            <span className="text-[10px] font-semibold text-slate-400">Google Maps</span>
          </div>

          <form onSubmit={handleSearchGooglePhotos} className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="พิมพ์ชื่อโรงแรม / สถานที่เที่ยว เช่น Quintessa Hotel Osaka..."
              className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-[#111624] border border-slate-200 dark:border-[#2a3652] text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={loadingCandidates}
              className="px-3 py-1.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white shrink-0 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {loadingCandidates ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              <span>ค้นหา</span>
            </button>
          </form>

          {loadingCandidates ? (
            <div className="py-3 flex items-center justify-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <span>กำลังดึงตัวเลือกรูปสถานที่จริงจาก Google Maps...</span>
            </div>
          ) : candidates.length > 0 ? (
            <div className="grid grid-cols-5 gap-1.5 pt-0.5">
              {candidates.map((cand, i) => {
                const isSelected = previewUrl === cand.url;
                return (
                  <button
                    key={cand.url + i}
                    type="button"
                    onClick={() => {
                      setPreviewUrl(cand.url);
                      setStatusMsg(`เลือกรูปมุมที่ ${i + 1} จาก Google Maps แล้ว กด "บันทึกรูปนี้" ได้เลย`);
                    }}
                    style={{ aspectRatio: '16 / 10' }}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 ring-2 ring-blue-500/40 scale-[1.02]'
                        : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                    title={cand.placeName || `มุมที่ ${i + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cand.url}
                      alt={cand.placeName || `Option ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-0.5 right-1 text-[9px] font-black px-1 rounded bg-black/65 text-white">
                      #{i + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">
              พิมพ์ชื่อสถานที่ภาษาอังกฤษหรือชื่อโรงแรมด้านบนแล้วกด &ldquo;ค้นหา&rdquo; เพื่อดูรูปจาก Google Maps
            </p>
          )}
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
            className="flex flex-col items-center justify-center gap-1 p-3 rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-800/70 bg-blue-50/50 dark:bg-blue-950/25 hover:bg-blue-100/60 dark:hover:bg-blue-950/45 text-blue-700 dark:text-blue-300 transition-colors cursor-pointer"
          >
            <Upload className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-black">อัปโหลดไฟล์ PNG / JPG</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              เลือกรูปที่แคปไว้จากคอม / มือถือ / iPad
            </span>
          </button>

          <div className="flex flex-col items-center justify-center gap-1 p-3 rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-800/70 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 text-center">
            <ClipboardPaste className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-black">กด Ctrl+V วางรูปที่แคปมา</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              แคปหน้าจอจาก Google Maps แล้วกดวางได้ทันที
            </span>
          </div>
        </div>

        {/* Option 3: Paste direct image URL */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5 text-indigo-500" />
            <span>หรือวางลิงก์รูปภาพโดยตรง (Image URL)</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://..."
              className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-[#1c2438] border border-slate-200 dark:border-[#2a3652] text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={handleApplyUrl}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-[#253048] text-slate-700 dark:text-slate-200 hover:bg-slate-200 cursor-pointer shrink-0"
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
              <span>รีเซ็ตเป็นรูปอัตโนมัติ</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-400">
              ซิงก์รูปที่บันทึกให้เห็นตรงกันทุกอุปกรณ์อัตโนมัติ
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

// ============================================================================
// Feature 3: Full-Screen Photo Lightbox + Google Street View / Maps Shortcuts
// ============================================================================

export interface PlacePhotoLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  placeName: string;
  city?: string;
  tagLabel?: string;
  emoji?: string;
  mapsUrl?: string;
  directionsUrl?: string;
  onOpenCustomPhoto?: () => void;
}

export function PlacePhotoLightboxModal({
  isOpen,
  onClose,
  imageUrl,
  placeName,
  city,
  tagLabel,
  emoji,
  mapsUrl,
  directionsUrl,
  onOpenCustomPhoto,
}: PlacePhotoLightboxModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  const streetViewUrl = buildStreetViewUrl(placeName, city);
  const resolvedMapsUrl = mapsUrl || streetViewUrl;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={placeName}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[92dvh] overflow-y-auto overscroll-contain rounded-3xl bg-slate-950/95 border border-white/15 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Top Bar */}
        <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3 border-b border-white/10">
          <div className="min-w-0 text-left">
            {tagLabel && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300">
                <span>{emoji || '📍'}</span>
                <span>
                  {tagLabel}
                  {city ? ` • ${city}` : ''}
                </span>
              </span>
            )}
            <h3 className="text-sm sm:text-base font-black text-white line-clamp-2">
              {placeName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer shrink-0"
            aria-label="ปิดภาพขยาย"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Full-Resolution Image Container */}
        <div className="relative bg-black flex items-center justify-center min-h-[240px] max-h-[68dvh] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={placeName}
            className="w-full max-h-[68dvh] object-contain select-none"
          />
        </div>

        {/* Bottom Action Bar: Street View / Google Maps / Change Photo */}
        <div className="p-3.5 sm:p-4 bg-slate-900/95 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={resolvedMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>🚶 ดูหน้าร้าน / รีวิวใน Google Maps</span>
            </a>

            {directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <Navigation className="h-3.5 w-3.5 text-sky-400" />
                <span>นำทางไปที่นี่</span>
              </a>
            )}
          </div>

          {onOpenCustomPhoto && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCustomPhoto();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600/90 hover:bg-emerald-500 text-white cursor-pointer ml-auto"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>เปลี่ยนรูป / เลือกมุมอื่น</span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
