// src/components/TicketPassLockerModal.tsx
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  X, QrCode, Plus, Trash2, Camera, Download, 
  Sun, Sparkles, Copy, Check, Eye, 
  Upload, ShieldCheck, Ticket, AlertCircle, Maximize2,
  ZoomIn, ZoomOut, RotateCcw, ImageIcon, RefreshCw, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { syncTripMetadataToSupabase } from '@/lib/tripMetadata';

export interface VaultPassItem {
  id: string;
  title: string;
  category: 'vjw' | 'keta' | 'train' | 'flight' | 'attraction' | 'hotel' | 'insurance' | 'other';
  bookingRef?: string;
  qrCodeUrl?: string;
  barcodeData?: string;
  note?: string;
  validDate?: string;
  createdAt: number;
}

interface TicketPassLockerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId?: string;
  tripName?: string;
  initialPasses?: VaultPassItem[];
  onPassesUpdated?: (passes: VaultPassItem[]) => void;
}

const DEFAULT_PRESET_PASSES: VaultPassItem[] = [
  {
    id: 'preset_vjw_customs',
    title: 'Visit Japan Web (Immigration & Customs QR)',
    category: 'vjw',
    bookingRef: 'VJW-ENTRY-JP',
    note: 'เปิดสแกนที่ด่านตรวจคนเข้าเมืองและศุลกากรสนามบินคันไซ (KIX) สแกนติดเร็วแม้ออฟไลน์',
    validDate: '10 ธ.ค. 2026',
    createdAt: Date.now() - 120000,
  },
  {
    id: 'preset_keta_approval',
    title: 'K-ETA (Korea Electronic Travel Authorization)',
    category: 'keta',
    bookingRef: 'K-ETA-APPROVED',
    note: 'เอกสารอนุมัติเข้าเกาหลีใต้ พร้อม QR Code สำหรับสแกนที่สนามบินอินชอน/เชจู',
    validDate: 'ใช้ได้ตลอดอายุอนุมัติ',
    createdAt: Date.now() - 100000,
  },
  {
    id: 'preset_nankai_rapid',
    title: 'Nankai Rapi:t Airport Express (KIX ➔ Namba)',
    category: 'train',
    bookingRef: 'RAPIT-KIX-NAMBA-RSV',
    note: 'รถไฟด่วนพิเศษจากสนามบินคันไซเข้าโอซาก้า ที่นั่ง Reserved Seat ตู้ 4',
    validDate: '10 ธ.ค. 2026',
    createdAt: Date.now() - 80000,
  },
  {
    id: 'preset_usj_pass',
    title: 'Universal Studios Japan (USJ 1-Day Studio Pass)',
    category: 'attraction',
    bookingRef: 'USJ-EXP-2026',
    note: 'บัตรเข้า USJ + Super Nintendo World Area Timed Entry Pass',
    validDate: '12 ธ.ค. 2026',
    createdAt: Date.now() - 60000,
  },
];

/**
 * Client-side Canvas Image Compression
 * Scales high-resolution mobile screenshots (Visit Japan Web / K-ETA / Tickets)
 * to max 1600px width/height and quality 0.86 to ensure crisp scanner readability
 * without exceeding storage or network quotas.
 */
function compressPassImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('ไฟล์ที่เลือกไม่ใช่รูปภาพ'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ได้'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('ไม่สามารถประมวลผลรูปภาพได้'));
      img.onload = () => {
        let { width, height } = img;
        const maxDimension = 1600;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function TicketPassLockerModal({
  isOpen,
  onClose,
  tripId,
  tripName,
  initialPasses,
  onPassesUpdated,
}: TicketPassLockerModalProps) {
  const [passes, setPasses] = useState<VaultPassItem[]>(() => {
    if (typeof window !== 'undefined' && tripId) {
      try {
        const cached = localStorage.getItem(`ticket_vault_${tripId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return initialPasses && initialPasses.length > 0 ? initialPasses : DEFAULT_PRESET_PASSES;
  });

  const [selectedCategory, setSelectedCategory] = useState<'all' | VaultPassItem['category']>('all');
  const [activeViewingPass, setActiveViewingPass] = useState<VaultPassItem | null>(null);
  const [isMaxBrightness, setIsMaxBrightness] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Pass Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<VaultPassItem['category']>('vjw');
  const [newRef, setNewRef] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newValidDate, setNewValidDate] = useState('');
  const [newQrImage, setNewQrImage] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // Hidden file inputs for direct card image replacement
  const newFileInputRef = useRef<HTMLInputElement>(null);
  const cardFileInputRef = useRef<HTMLInputElement>(null);
  const [activeCardAttachId, setActiveCardAttachId] = useState<string | null>(null);

  useEffect(() => {
    if (initialPasses && initialPasses.length > 0) {
      setPasses(initialPasses);
    }
  }, [initialPasses]);

  // Reset zoom whenever viewing pass changes
  useEffect(() => {
    if (activeViewingPass) {
      setZoomLevel(1);
      setIsMaxBrightness(true);
    }
  }, [activeViewingPass]);

  // Body scroll lock and ESC key listener
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeViewingPass) {
          setActiveViewingPass(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, activeViewingPass]);

  const savePassesList = (updated: VaultPassItem[]) => {
    setPasses(updated);
    if (tripId) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`ticket_vault_${tripId}`, JSON.stringify(updated));
      }
      syncTripMetadataToSupabase(tripId, { ticketsVault: updated });
    }
    if (onPassesUpdated) {
      onPassesUpdated(updated);
    }
  };

  const handleCopy = (refText: string, id: string) => {
    if (!refText) return;
    navigator.clipboard.writeText(refText);
    setCopiedId(id);
    toast.success('คัดลอกรหัสอ้างอิงแล้ว ✨');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleNewPassImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const dataUrl = await compressPassImage(file);
      setNewQrImage(dataUrl);
      toast.success('แนบภาพตั๋ว / QR เรียบร้อยแล้ว 📸');
    } catch {
      toast.error('ไม่สามารถประมวลผลไฟล์ภาพได้');
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const triggerCardImageUpload = (passId: string) => {
    setActiveCardAttachId(passId);
    cardFileInputRef.current?.click();
  };

  const handleCardImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeCardAttachId) return;

    try {
      const dataUrl = await compressPassImage(file);
      const updated = passes.map((p) => {
        if (p.id === activeCardAttachId) {
          return { ...p, qrCodeUrl: dataUrl };
        }
        return p;
      });
      savePassesList(updated);
      toast.success('บันทึกรูปตั๋ว / QR เข้าตู้เซฟแล้ว 🎟️✨');
    } catch {
      toast.error('ไม่สามารถประมวลผลรูปภาพได้');
    } finally {
      setActiveCardAttachId(null);
      e.target.value = '';
    }
  };

  const handleRemovePassImage = (passId: string) => {
    const updated = passes.map((p) => {
      if (p.id === passId) {
        return { ...p, qrCodeUrl: undefined };
      }
      return p;
    });
    savePassesList(updated);
    toast.info('นำรูปภาพออกจากตั๋วแล้ว');
  };

  const handleApplyPresetTemplate = (templateType: 'vjw' | 'keta' | 'usj' | 'train' | 'flight') => {
    if (templateType === 'vjw') {
      setNewTitle('Visit Japan Web (ตม. & ศุลกากร ญี่ปุ่น)');
      setNewCategory('vjw');
      setNewRef('VJW-ENTRY-QR');
      setNewNote('เปิดสแกนที่ด่านตรวจคนเข้าเมืองและศุลกากรสนามบินญี่ปุ่น สแกนได้แม้ออฟไลน์');
      setNewValidDate('ใช้ได้ตามวันเดินทาง');
    } else if (templateType === 'keta') {
      setNewTitle('K-ETA (เกาหลีใต้) / Travel Authorization');
      setNewCategory('keta');
      setNewRef('K-ETA-APPROVED');
      setNewNote('เอกสารอนุมัติเข้าประเทศเกาหลีใต้ พร้อม QR Code');
      setNewValidDate('ใช้ได้ 3 ปี');
    } else if (templateType === 'usj') {
      setNewTitle('USJ 1-Day Studio Pass & Timed Entry');
      setNewCategory('attraction');
      setNewRef('USJ-PASS-2026');
      setNewNote('บัตรเข้าสวนสนุก Universal Studios Japan + Super Nintendo World');
      setNewValidDate('12 ธ.ค. 2026');
    } else if (templateType === 'train') {
      setNewTitle('Nankai Rapi:t / JR Kansai Pass');
      setNewCategory('train');
      setNewRef('RAPIT-RESERVED');
      setNewNote('ตั๋วรถไฟด่วนสนามบินหรือพาสเดินทางรถไฟ');
      setNewValidDate('10 ธ.ค. 2026');
    } else if (templateType === 'flight') {
      setNewTitle('Flight Boarding Pass (ตั๋วขึ้นเครื่องบิน)');
      setNewCategory('flight');
      setNewRef('TICKET-ETKT');
      setNewNote('บอร์ดดิ้งพาสสำหรับแสดงที่เกตและจุดตรวจสัมภาระ');
      setNewValidDate('วันเดินทาง');
    }
    toast.info('เลือกเทมเพลตเรียบร้อย กรุณาแนบรูปภาพหรือกรอกรหัสเพิ่มเติม');
  };

  const handleCreatePass = () => {
    if (!newTitle.trim()) {
      toast.error('กรุณาระบุชื่อตั๋วหรือเอกสาร');
      return;
    }

    const newPass: VaultPassItem = {
      id: `pass_${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      bookingRef: newRef.trim() || undefined,
      note: newNote.trim() || undefined,
      validDate: newValidDate.trim() || undefined,
      qrCodeUrl: newQrImage || undefined,
      createdAt: Date.now(),
    };

    const next = [newPass, ...passes];
    savePassesList(next);
    setShowAddForm(false);
    setNewTitle('');
    setNewRef('');
    setNewNote('');
    setNewValidDate('');
    setNewQrImage(null);
    toast.success('บันทึกตั๋วเข้าตู้เซฟเรียบร้อยแล้ว 🎟️');
  };

  const handleDeletePass = (id: string) => {
    if (confirm('คุณต้องการลบตั๋วหรือเอกสารนี้ออกจากตู้เซฟใช่หรือไม่?')) {
      const next = passes.filter((p) => p.id !== id);
      savePassesList(next);
      if (activeViewingPass?.id === id) setActiveViewingPass(null);
      toast.info('ลบเอกสารแล้ว');
    }
  };

  const filteredPasses = useMemo(() => {
    if (selectedCategory === 'all') return passes;
    return passes.filter((p) => p.category === selectedCategory);
  }, [passes, selectedCategory]);

  const categoryMeta: Record<VaultPassItem['category'], { label: string; icon: string }> = {
    vjw: { label: 'Visit Japan Web (ตม. ญี่ปุ่น)', icon: '🇯🇵' },
    keta: { label: 'K-ETA (ตม. เกาหลี)', icon: '🇰🇷' },
    flight: { label: 'ตั๋วเครื่องบิน / Boarding Pass', icon: '✈️' },
    train: { label: 'ตั๋วรถไฟ / Pass เดินทาง', icon: '🚆' },
    attraction: { label: 'สถานที่เที่ยว / USJ', icon: '🎟️' },
    hotel: { label: 'ใบจองที่พัก / Voucher', icon: '🏨' },
    insurance: { label: 'ประกัน / พาสปอร์ต', icon: '🛡️' },
    other: { label: 'เอกสารอื่นๆ', icon: '📄' },
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 overscroll-contain overflow-x-hidden animate-in fade-in duration-200 select-none" 
      role="dialog" 
      aria-modal="true"
    >
      {/* Hidden file input for updating card images */}
      <input
        type="file"
        ref={cardFileInputRef}
        accept="image/*"
        onChange={handleCardImageUpload}
        className="hidden"
      />

      <div className="w-full sm:max-w-2xl rounded-3xl bg-white dark:bg-[#151b2b] shadow-2xl border border-slate-200/90 dark:border-[#222c42] flex flex-col max-h-[92dvh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-[#222c42] flex items-center justify-between shrink-0 bg-white/50 dark:bg-[#151b2b]/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 shrink-0">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Pass & Offline Ticket Locker
                </h2>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950/70 px-2 py-0.5 rounded-full font-mono">
                  100% Offline
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                ตู้เซฟเก็บบัตร QR Visit Japan Web, K-ETA, ตั๋วรถไฟ และบัตร USJ พร้อมภาพสแกน
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-500/20 cursor-pointer transition-all active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{showAddForm ? 'ปิดฟอร์ม' : 'เพิ่มตั๋วใหม่'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1c2438] transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="p-3 border-b border-slate-100 dark:border-[#222c42] bg-slate-50/70 dark:bg-[#111726]/60 flex items-center gap-1.5 overflow-x-auto pb-2 custom-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer border ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-white dark:bg-[#151b2b] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#222c42] hover:bg-slate-100'
            }`}
          >
            ทั้งหมด ({passes.length})
          </button>
          {Object.entries(categoryMeta).map(([catKey, meta]) => (
            <button
              key={catKey}
              type="button"
              onClick={() => setSelectedCategory(catKey as any)}
              className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer border ${
                selectedCategory === catKey
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white dark:bg-[#151b2b] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#222c42] hover:bg-slate-100'
              }`}
            >
              {meta.icon} {meta.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          
          {/* Add Pass Form */}
          {showAddForm && (
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 space-y-3.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <Ticket className="h-4 w-4" />
                  <span>เพิ่มตั๋วหรือเอกสารสำคัญใหม่</span>
                </h3>

                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                  เลือกเทมเพลตสำเร็จรูปได้ทันที 👇
                </span>
              </div>

              {/* Quick Template Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pb-1">
                <button
                  type="button"
                  onClick={() => handleApplyPresetTemplate('vjw')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#151b2b] hover:bg-indigo-100 text-[11px] font-bold text-slate-700 dark:text-slate-200 border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer"
                >
                  🇯🇵 Visit Japan Web
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPresetTemplate('keta')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#151b2b] hover:bg-indigo-100 text-[11px] font-bold text-slate-700 dark:text-slate-200 border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer"
                >
                  🇰🇷 K-ETA เกาหลี
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPresetTemplate('usj')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#151b2b] hover:bg-indigo-100 text-[11px] font-bold text-slate-700 dark:text-slate-200 border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer"
                >
                  🎟️ บัตร USJ Pass
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPresetTemplate('train')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#151b2b] hover:bg-indigo-100 text-[11px] font-bold text-slate-700 dark:text-slate-200 border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer"
                >
                  🚆 ตั๋วรถไฟ / Pass
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPresetTemplate('flight')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#151b2b] hover:bg-indigo-100 text-[11px] font-bold text-slate-700 dark:text-slate-200 border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer"
                >
                  ✈️ Boarding Pass
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">ชื่อตั๋ว / บริการ *</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="เช่น Visit Japan Web QR, K-ETA, ตั๋ว USJ"
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-white dark:bg-[#151b2b] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">หมวดหมู่</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-white dark:bg-[#151b2b] text-slate-900 dark:text-white outline-none"
                  >
                    {Object.entries(categoryMeta).map(([k, meta]) => (
                      <option key={k} value={k}>{meta.icon} {meta.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">รหัสจอง / PNR / Booking Ref</label>
                  <input
                    type="text"
                    value={newRef}
                    onChange={(e) => setNewRef(e.target.value)}
                    placeholder="เช่น VJW-QR-ENTRY, K-ETA-123456"
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-white dark:bg-[#151b2b] text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">วันที่ใช้งาน</label>
                  <input
                    type="text"
                    value={newValidDate}
                    onChange={(e) => setNewValidDate(e.target.value)}
                    placeholder="เช่น 10 ธ.ค. 2026 หรือ ใช้ได้ตลอดทริป"
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-white dark:bg-[#151b2b] text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">หมายเหตุ / คำแนะนำ</label>
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="เช่น สแกนที่ช่องตรวจ 3 หรือ ต้องแลกบัตรจริงที่ตู้เขียว"
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-white dark:bg-[#151b2b] text-slate-900 dark:text-white outline-none"
                />
              </div>

              {/* QR / Pass Image Upload */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  แนบรูปภาพ QR Code หรือภาพถ่ายตั๋ว / แคปหน้าจอ
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    ref={newFileInputRef}
                    accept="image/*"
                    onChange={handleNewPassImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => newFileInputRef.current?.click()}
                    disabled={isCompressing}
                    className="px-3.5 py-2 rounded-xl border border-dashed border-indigo-400 dark:border-indigo-700 bg-white dark:bg-[#151b2b] text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-indigo-50 transition-all disabled:opacity-50"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>{isCompressing ? 'กำลังบีบอัดภาพ...' : newQrImage ? 'เปลี่ยนรูปภาพ' : '📸 แนบรูปภาพตั๋ว / แคปหน้าจอ QR'}</span>
                  </button>

                  {newQrImage && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <Check className="h-3.5 w-3.5" />
                        <span>แนบรูปแล้ว</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setNewQrImage(null)}
                        className="text-[10px] text-rose-500 hover:underline font-bold"
                      >
                        ลบรูป
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleCreatePass}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black cursor-pointer shadow-xs transition-all active:scale-95"
                >
                  บันทึกตั๋วเข้าตู้เซฟ
                </button>
              </div>
            </div>
          )}

          {/* Pass Cards Grid */}
          {filteredPasses.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <p className="text-3xl">🎫</p>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                ยังไม่มีตั๋วหรือบัตรในหมวดนี้
              </h3>
              <p className="text-xs text-slate-400">
                คลิกปุ่ม &quot;เพิ่มตั๋วใหม่&quot; เพื่ออัปโหลดรูป QR หรือบันทึกรหัสอ้างอิง
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredPasses.map((pass) => {
                const meta = categoryMeta[pass.category] || categoryMeta.other;
                return (
                  <div
                    key={pass.id}
                    className="p-4 rounded-3xl bg-white dark:bg-[#181d2c] border border-slate-200 dark:border-[#222c42] shadow-sm hover:border-indigo-400 dark:hover:border-indigo-500/50 transition-all flex flex-col justify-between gap-3 relative overflow-hidden"
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#111726] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#222c42]">
                          <span>{meta.icon}</span>
                          <span>{meta.label}</span>
                        </span>

                        <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-snug">
                          {pass.title}
                        </h4>

                        {pass.validDate && (
                          <p className="text-[10px] text-slate-400 font-mono">
                            วันที่: {pass.validDate}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeletePass(pass.id)}
                        className="text-slate-300 hover:text-rose-500 p-1 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="ลบตั๋วนี้"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Booking Reference Box */}
                    {pass.bookingRef && (
                      <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-[#111726] border border-slate-200/80 dark:border-[#222c42] flex items-center justify-between">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                            รหัสจอง / Booking Ref:
                          </span>
                          <span className="text-xs font-black font-mono text-indigo-600 dark:text-indigo-400">
                            {pass.bookingRef}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopy(pass.bookingRef!, pass.id)}
                          className="p-1.5 rounded-xl bg-white dark:bg-[#1c2438] text-slate-600 dark:text-slate-300 hover:text-indigo-600 border border-slate-200 dark:border-[#222c42] shadow-2xs transition-all cursor-pointer"
                          title="คัดลอกรหัสจอง"
                        >
                          {copiedId === pass.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    )}

                    {/* Image Attachment / Thumbnail Section */}
                    {pass.qrCodeUrl ? (
                      <div className="rounded-2xl border border-slate-200/80 dark:border-[#222c42] bg-slate-50 dark:bg-[#111726] p-2 flex items-center justify-between gap-2.5">
                        <div 
                          onClick={() => {
                            setActiveViewingPass(pass);
                            setIsMaxBrightness(true);
                          }}
                          className="flex items-center gap-2 cursor-pointer flex-1 min-w-0 group"
                        >
                          <div className="w-12 h-12 rounded-xl bg-white p-1 border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={pass.qrCodeUrl}
                              alt={pass.title}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              <span>มีรูปตั๋ว / QR Code</span>
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate group-hover:text-indigo-500">
                              แตะเพื่อเปิดสแกนเต็มจอ
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => triggerCardImageUpload(pass.id)}
                            className="p-1.5 rounded-lg bg-white dark:bg-[#1c2438] text-slate-500 hover:text-indigo-600 border border-slate-200 dark:border-[#222c42] text-[10px] font-bold cursor-pointer transition-all"
                            title="เปลี่ยนรูปภาพ"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePassImage(pass.id)}
                            className="p-1.5 rounded-lg bg-white dark:bg-[#1c2438] text-slate-400 hover:text-rose-500 border border-slate-200 dark:border-[#222c42] text-[10px] font-bold cursor-pointer transition-all"
                            title="ลบรูปภาพ"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => triggerCardImageUpload(pass.id)}
                        className="w-full p-2.5 rounded-2xl border border-dashed border-indigo-300 dark:border-indigo-800/80 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Camera className="h-4 w-4 text-indigo-500" />
                        <span>📸 แนบรูปตั๋ว / QR (Visit Japan, K-ETA, Pass)</span>
                      </button>
                    )}

                    {pass.note && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                        {pass.note}
                      </p>
                    )}

                    {/* Action Button: Show QR & Max Brightness */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveViewingPass(pass);
                        setIsMaxBrightness(true);
                      }}
                      className="w-full py-2.5 px-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      <span>เปิดบัตรสแกน (โหมดเร่งแสง 100%)</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-[#222c42] bg-slate-50/80 dark:bg-[#111726]/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="truncate">เข้าถึงได้ตลอดเวลา แม้ไม่มีสัญญาณอินเทอร์เน็ตในรถไฟใต้ดิน</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-[#222c42] text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-[#1c2438] cursor-pointer shrink-0"
          >
            ปิด
          </button>
        </div>

      </div>

      {/* ========================================================
          FULLSCREEN HIGH-CONTRAST MAX-BRIGHTNESS SCANNER MODAL
      ======================================================== */}
      {activeViewingPass && (
        <div 
          className={`fixed inset-0 z-[60] flex flex-col items-center justify-center p-3 sm:p-5 transition-colors overflow-y-auto ${
            isMaxBrightness ? 'bg-white text-black' : 'bg-black/95 text-white'
          }`}
        >
          <div className="w-full max-w-md rounded-3xl p-5 sm:p-6 bg-white text-slate-900 shadow-2xl border-4 border-black space-y-4 text-center my-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {categoryMeta[activeViewingPass.category]?.icon} GATE PASS SCANNER
              </span>
              <button
                onClick={() => setActiveViewingPass(null)}
                className="p-1 rounded-lg text-slate-500 hover:text-black cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black leading-tight">
                {activeViewingPass.title}
              </h3>
              {activeViewingPass.validDate && (
                <p className="text-xs text-slate-500 font-mono">
                  {activeViewingPass.validDate}
                </p>
              )}
            </div>

            {/* Simulated / Real QR Code Display with Zoom & Contrast */}
            <div className="p-3 sm:p-4 rounded-2xl bg-white border-2 border-slate-300 flex flex-col items-center justify-center space-y-2 overflow-hidden min-h-[220px]">
              {activeViewingPass.qrCodeUrl ? (
                <div 
                  className="transition-transform duration-200 flex items-center justify-center max-w-full"
                  style={{ transform: `scale(${zoomLevel})` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeViewingPass.qrCodeUrl}
                    alt={activeViewingPass.title}
                    className="max-h-72 max-w-full object-contain rounded-lg shadow-sm"
                    style={{
                      filter: isMaxBrightness ? 'contrast(1.08) brightness(1.04)' : 'none',
                    }}
                  />
                </div>
              ) : (
                <div className="w-52 h-52 bg-slate-100 flex flex-col items-center justify-center rounded-xl p-4 border border-dashed border-slate-400">
                  <QrCode className="h-28 w-28 text-slate-800" />
                  <span className="text-[10px] font-mono text-slate-600 mt-2 font-bold">
                    {activeViewingPass.bookingRef || 'SCAN AT GATE'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      triggerCardImageUpload(activeViewingPass.id);
                    }}
                    className="mt-3 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-[10px] font-bold cursor-pointer"
                  >
                    📸 แตะเพื่อแนบรูป QR จริง
                  </button>
                </div>
              )}
            </div>

            {/* Zoom Controls Bar */}
            {activeViewingPass.qrCodeUrl && (
              <div className="flex items-center justify-center gap-2 py-1">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.2))}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer border border-slate-200"
                  title="ซูมออก"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(1)}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-mono font-bold cursor-pointer border border-slate-200"
                >
                  {Math.round(zoomLevel * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer border border-slate-200"
                  title="ซูมเข้า"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(1)}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer border border-slate-200"
                  title="รีเซ็ตขนาด"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Booking Ref */}
            {activeViewingPass.bookingRef && (
              <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-between">
                <div className="text-left">
                  <span className="text-[9px] text-slate-500 block uppercase font-mono">
                    BOOKING REFERENCE NUMBER
                  </span>
                  <span className="text-xs sm:text-sm font-black font-mono tracking-widest text-indigo-700">
                    {activeViewingPass.bookingRef}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(activeViewingPass.bookingRef!, 'scanner_modal')}
                  className="p-1.5 rounded-lg bg-white border border-slate-300 text-slate-600 hover:text-indigo-600 cursor-pointer"
                  title="คัดลอกรหัส"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Bottom Controls */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsMaxBrightness(!isMaxBrightness)}
                className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-2 rounded-xl border border-amber-300 cursor-pointer"
              >
                <Sun className="h-4 w-4 text-amber-500" />
                <span>{isMaxBrightness ? 'แสงขาว 100%' : 'เปิดโหมดแสงขาว'}</span>
              </button>

              {activeViewingPass.qrCodeUrl && (
                <a
                  href={activeViewingPass.qrCodeUrl}
                  download={`${activeViewingPass.title.replace(/\s+/g, '_')}_QR.jpg`}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                  title="บันทึกรูปลงเครื่อง"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>บันทึกรูป</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => setActiveViewingPass(null)}
                className="px-4 py-2 rounded-xl bg-black text-white text-xs font-black cursor-pointer shadow-md"
              >
                เสร็จสิ้น
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
