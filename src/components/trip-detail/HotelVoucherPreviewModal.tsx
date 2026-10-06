// src/components/trip-detail/HotelVoucherPreviewModal.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Download, ExternalLink, FileText, Image as ImageIcon, 
  ZoomIn, ZoomOut, RotateCw, CheckCircle2, AlertCircle, Upload
} from 'lucide-react';
import { 
  AccommodationVoucherFile, 
  downloadVoucherFile, 
  openVoucherInNewTab, 
  formatFileSize 
} from '@/lib/accommodations';
import { getLocalReceiptPhoto, saveLocalReceiptPhoto } from '@/lib/localReceipts';

interface HotelVoucherPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucher: AccommodationVoucherFile | null;
  hotelName: string;
}

export function HotelVoucherPreviewModal({
  isOpen,
  onClose,
  voucher,
  hotelName,
}: HotelVoucherPreviewModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [activeDataUrl, setActiveDataUrl] = useState<string | null>(voucher?.dataUrl || null);
  const [blobPdfUrl, setBlobPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync dataUrl or resolve from IndexedDB if not passed directly
  useEffect(() => {
    if (voucher?.dataUrl) {
      setActiveDataUrl(voucher.dataUrl);
      setLoading(false);
    } else if (voucher?.storageKey) {
      setLoading(true);
      getLocalReceiptPhoto(voucher.storageKey)
        .then((data) => {
          if (data) setActiveDataUrl(data);
        })
        .finally(() => setLoading(false));
    } else {
      setActiveDataUrl(null);
      setLoading(false);
    }
  }, [voucher]);

  // Convert Base64 PDF to Object Blob URL for iOS Safari / Mobile rendering
  useEffect(() => {
    const isPdfType = voucher?.type?.includes('pdf') || voucher?.name?.toLowerCase().endsWith('.pdf');
    if (isPdfType && activeDataUrl && activeDataUrl.startsWith('data:')) {
      try {
        const arr = activeDataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/pdf';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const objUrl = URL.createObjectURL(blob);
        setBlobPdfUrl(objUrl);
        return () => {
          URL.revokeObjectURL(objUrl);
        };
      } catch (e) {
        setBlobPdfUrl(activeDataUrl);
      }
    } else {
      setBlobPdfUrl(activeDataUrl);
    }
  }, [voucher, activeDataUrl]);

  // Reset zoom & rotation when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !voucher || !mounted) return null;

  const isPdf = voucher.type?.includes('pdf') || voucher.name?.toLowerCase().endsWith('.pdf');
  const hasData = Boolean(activeDataUrl);

  const handleDownload = () => {
    if (activeDataUrl) {
      downloadVoucherFile({ ...voucher, dataUrl: activeDataUrl }, hotelName);
    }
  };

  const handleOpenNewTab = () => {
    if (activeDataUrl) {
      openVoucherInNewTab(activeDataUrl, voucher.type);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4 backdrop-blur-md bg-black/85 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl max-h-[94vh] bg-white dark:bg-[#111624] rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-[#222c42] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Top Bar */}
        <div className="p-3.5 sm:p-4 px-4 sm:px-6 flex items-center justify-between border-b border-slate-200/80 dark:border-[#222c42] bg-slate-50/70 dark:bg-[#151b2b]/90 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isPdf 
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' 
                : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
            }`}>
              {isPdf ? <FileText className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                  isPdf 
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' 
                    : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                }`}>
                  {isPdf ? 'PDF ใบจอง' : 'รูปภาพใบจอง'}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {formatFileSize(voucher.size)}
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                {voucher.name || `ใบจอง ${hotelName}`}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate hidden sm:block">
                โรงแรม: <span className="font-semibold">{hotelName}</span>
              </p>
            </div>
          </div>

          {/* Quick Action Buttons in Header */}
          <div className="flex items-center gap-1.5 shrink-0">
            {hasData && (
              <>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer hover:scale-102 active:scale-95"
                  title="ดาวน์โหลดไฟล์ลงเครื่อง"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">ดาวน์โหลด</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenNewTab}
                  className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-white dark:bg-[#1a2234] hover:bg-slate-100 dark:hover:bg-[#202b42] text-slate-700 dark:text-slate-200 text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  title="เปิดดูในแท็บใหม่"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">เปิดแท็บใหม่</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#1c2438] transition-colors cursor-pointer"
              title="ปิดหน้าต่าง (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Content Preview Area */}
        <div className="flex-1 overflow-auto bg-slate-100/70 dark:bg-[#0c0f17] p-2 sm:p-4 flex items-center justify-center min-h-[300px]">
          {loading ? (
            <div className="text-center p-8 text-slate-400 space-y-2">
              <div className="w-8 h-8 mx-auto border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                กำลังเปิดเอกสารใบจอง...
              </p>
            </div>
          ) : !hasData ? (
            <div className="text-center p-6 sm:p-8 text-slate-400 space-y-3 max-w-sm mx-auto">
              <AlertCircle className="h-10 w-10 mx-auto text-amber-500 opacity-80" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                ยังไม่พบเนื้อหาไฟล์บนอุปกรณ์นี้
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                ไฟล์อาจถูกบันทึกไว้ในอุปกรณ์เครื่องเดิมที่อัปโหลด หรือยังไม่ได้ซิงค์เนื้อหาไฟล์สมบูรณ์
              </p>
              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95">
                <Upload className="h-4 w-4" />
                <span>เลือกไฟล์ใบจอง (PDF/รูป) เพื่อเปิดดูทันที</span>
                <input
                  type="file"
                  accept=".pdf,image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const r = new FileReader();
                    r.onload = () => {
                      const res = r.result as string;
                      setActiveDataUrl(res);
                      if (voucher.storageKey) {
                        saveLocalReceiptPhoto(voucher.storageKey, res).catch(() => {});
                      }
                    };
                    r.readAsDataURL(f);
                  }}
                />
              </label>
            </div>
          ) : isPdf ? (
            <div className="w-full h-full flex flex-col space-y-2">
              {/* Quick Mobile Action Ribbon for PDF */}
              <div className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-slate-900/90 text-white text-xs border border-white/10 shadow-sm gap-2">
                <span className="font-bold flex items-center gap-1.5 truncate text-[11px] sm:text-xs">
                  <FileText className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                  <span className="truncate">{voucher.name || `ใบจอง ${hotelName}`}</span>
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleOpenNewTab}
                    className="px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                    title="เปิดดู PDF เต็มจอในเบราว์เซอร์"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-amber-300" />
                    <span>เปิดเต็มจอ</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                    title="แชร์ หรือ บันทึกลงเครื่อง"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>แชร์ / บันทึก</span>
                  </button>
                </div>
              </div>

              {/* PDF Viewer Iframe */}
              <div className="w-full h-[58vh] sm:h-[68vh] rounded-xl overflow-hidden border border-slate-200 dark:border-[#222c42] bg-white shadow-inner">
                <iframe
                  src={blobPdfUrl || activeDataUrl || ''}
                  title={`ใบจอง ${hotelName}`}
                  className="w-full h-full border-0"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
                <span>💡 หาก iPhone หรือมือถือไม่แสดงเอกสารในกรอบ ให้แตะปุ่ม &ldquo;เปิดเต็มจอ&rdquo; ด้านบน</span>
              </div>
            </div>
          ) : (
            /* Image Viewer with Zoom Controls */
            <div className="relative w-full h-[62vh] sm:h-[72vh] flex items-center justify-center overflow-auto p-2">
              {/* Floating Image Controls */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md text-white border border-white/10 shadow-lg text-xs">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  className="p-1 hover:text-emerald-400 transition-colors cursor-pointer"
                  title="ย่อขนาด"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="font-mono text-[11px] px-1 font-bold">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  className="p-1 hover:text-emerald-400 transition-colors cursor-pointer"
                  title="ขยายขนาด"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <div className="h-3 w-px bg-white/20 mx-1" />
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1 hover:text-emerald-400 transition-colors cursor-pointer"
                  title="หมุนรูปภาพ 90°"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { setZoom(1); setRotation(0); }}
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold hover:bg-white/20 transition-colors cursor-pointer"
                  title="รีเซ็ตขนาด"
                >
                  รีเซ็ต
                </button>
              </div>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeDataUrl || ''}
                alt={`ใบจอง ${hotelName}`}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-h-full max-w-full object-contain rounded-xl shadow-md cursor-grab active:cursor-grabbing"
              />
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-3 sm:p-4 px-4 sm:px-6 flex items-center justify-between border-t border-slate-200/80 dark:border-[#222c42] bg-white dark:bg-[#151b2b] text-xs">
          <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 text-[11px]">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>พร้อมใช้งานแบบออฟไลน์บนเครื่องนี้</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>ดาวน์โหลด</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl border border-slate-200 dark:border-[#222c42] hover:bg-slate-100 dark:hover:bg-[#1c2438] text-slate-700 dark:text-slate-300 font-bold transition-colors cursor-pointer"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default HotelVoucherPreviewModal;
