// src/components/PhotoScrapbookModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  Camera, Image as ImageIcon, Plus, Trash2, X, 
  MapPin, Calendar, Heart, Download, Eye, Sparkles, Loader2,
  HardDriveDownload, Pin
} from 'lucide-react';
import { PhotoMemory, getTripPhotos, saveTripPhoto, deleteTripPhoto } from '@/lib/photos';
import { triggerConfetti } from '@/lib/confetti';

interface PhotoScrapbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripName?: string;
}

export default function PhotoScrapbookModal({
  isOpen,
  onClose,
  tripId,
  tripName,
}: PhotoScrapbookModalProps) {
  const [photos, setPhotos] = useState<PhotoMemory[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoMemory | null>(null);
  
  // Form fields
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [dateLabel, setDateLabel] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen && tripId) {
      loadPhotos();
    }
  }, [isOpen, tripId]);

  const loadPhotos = () => {
    const list = getTripPhotos(tripId);
    setPhotos(list);
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImageUrl(dataUrl);
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAddPhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) {
      alert('กรุณาเลือกรูปภาพ');
      return;
    }

    const updated = saveTripPhoto(tripId, {
      image_url: imageUrl,
      caption: caption || 'ความทรงจำการเดินทาง',
      location: location || 'Japan',
      date_label: dateLabel || 'Today',
    });

    setPhotos(updated);
    setImageUrl('');
    setCaption('');
    setLocation('');
    setDateLabel('');
    setShowAddForm(false);
    triggerConfetti();
  };

  const handleDeletePhoto = (photoId: string) => {
    if (confirm('ต้องการลบรูปภาพนี้ใช่หรือไม่?')) {
      const updated = deleteTripPhoto(tripId, photoId);
      setPhotos(updated);
      if (selectedPhoto?.id === photoId) setSelectedPhoto(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl rounded-3xl bg-white dark:bg-[#1a182d] shadow-2xl border border-slate-200/90 dark:border-purple-800/60 max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 sm:p-6 pb-3 flex justify-between items-center border-b border-slate-100 dark:border-purple-900/40 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center text-white text-lg shadow-md shadow-pink-500/25">
              📸
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>สมุดภาพความทรงจำ (Polaroid Scrapbook)</span>
                <span className="text-[10px] font-bold text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-950 px-2 py-0.5 rounded-full">
                  {photos.length} รูป
                </span>
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-purple-300 font-medium">
                แกลเลอรีรูปถ่ายสไตล์โพลารอยด์ ปักหมุดความทรงจำในทริป
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 sm:px-4 py-2 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-black shadow-md shadow-pink-500/20 flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <Plus className="h-4 w-4" /> 
              <span>เพิ่มรูปภาพ</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-purple-200 hover:bg-slate-100 dark:hover:bg-purple-950/50 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 pt-3 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          
          {/* Add Photo Form (Accordion) */}
          {showAddForm && (
            <form onSubmit={handleAddPhoto} className="p-4 sm:p-5 rounded-3xl bg-pink-50/60 dark:bg-[#11101d]/60 border border-pink-200 dark:border-purple-900/50 space-y-3.5 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Image Upload Area */}
                <div>
                  <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-pink-400 dark:border-pink-600 rounded-2xl cursor-pointer bg-white dark:bg-[#1a182d] hover:opacity-90 overflow-hidden relative shadow-inner">
                    {uploading ? (
                      <Loader2 className="h-7 w-7 animate-spin text-pink-500" />
                    ) : imageUrl ? (
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 p-3 text-center">
                        <Camera className="h-8 w-8 text-pink-500 mb-1 animate-float-slow" />
                        <span className="text-xs font-black text-pink-600 dark:text-pink-400">คลิกเพื่อเลือกรูปภาพจากโทรศัพท์</span>
                        <span className="text-[10px] text-slate-400">รองรับไฟล์ภาพ JPG, PNG, HEIC</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
                  </label>
                </div>

                {/* Caption & Metadata */}
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 dark:text-purple-200 mb-1">คำบรรยายภาพ (Caption) *</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น ถ่ายรูปคู่ป้ายกูลิโกะ, ราเมงข้อสอบสุดฟิน..."
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-purple-800 bg-white dark:bg-[#1a182d] text-xs outline-none focus:border-pink-500 font-bold text-slate-900 dark:text-white"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-800 dark:text-purple-200 mb-1">สถานที่ / เมือง</label>
                      <input
                        type="text"
                        placeholder="เช่น Dotonbori, Osaka"
                        className="w-full p-2 rounded-xl border border-slate-300 dark:border-purple-800 bg-white dark:bg-[#1a182d] text-xs outline-none focus:border-pink-500 text-slate-900 dark:text-white font-medium"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-800 dark:text-purple-200 mb-1">วันที่ / Day</label>
                      <input
                        type="text"
                        placeholder="เช่น 5 ธ.ค., Day 2"
                        className="w-full p-2 rounded-xl border border-slate-300 dark:border-purple-800 bg-white dark:bg-[#1a182d] text-xs outline-none focus:border-pink-500 text-slate-900 dark:text-white font-medium"
                        value={dateLabel}
                        onChange={(e) => setDateLabel(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-purple-800 text-xs font-bold text-slate-700 dark:text-purple-200 hover:bg-slate-100 cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-all"
                    >
                      บันทึกลงสมุดภาพ
                    </button>
                  </div>
                </div>

              </div>
            </form>
          )}

          {/* Photo Gallery Grid (Authentic Polaroid Cards) */}
          {photos.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-purple-900/50 rounded-3xl p-8 bg-white/40 dark:bg-[#11101d]/40">
              <ImageIcon className="h-12 w-12 text-pink-400 mx-auto mb-2 animate-float-slow" />
              <h3 className="font-black text-base text-slate-900 dark:text-white mb-1">ยังไม่มีรูปภาพในสมุดความทรงจำ</h3>
              <p className="text-xs text-slate-500 dark:text-purple-300/70 mb-4 font-medium">
                กดปุ่ม "เพิ่มรูปภาพ" เพื่ออัปโหลดรูปสวยๆ ระหว่างการท่องเที่ยว
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-md shadow-pink-500/20 hover:scale-105 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" /> เพิ่มรูปภาพแรก
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {photos.map((p, idx) => {
                const rotation = idx % 2 === 0 ? 'hover:rotate-1' : 'hover:-rotate-1';
                return (
                  <div
                    key={p.id}
                    className={`group relative bg-white dark:bg-[#151324] p-3 pb-4 rounded-2xl border border-slate-200/90 dark:border-purple-900/60 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer ${rotation}`}
                    onClick={() => setSelectedPhoto(p)}
                  >
                    {/* Decorative Thumbtack Pin */}
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-rose-500 border-2 border-white dark:border-slate-800 shadow-sm z-10 opacity-90 group-hover:scale-125 transition-transform" />

                    {/* Image Area */}
                    <div className="relative w-full h-48 rounded-xl overflow-hidden bg-black/5 mt-1">
                      <img
                        src={p.image_url}
                        alt={p.caption}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="px-3 py-1.5 rounded-full bg-white/95 text-slate-900 text-xs font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-xs">
                          <Eye className="h-3.5 w-3.5 text-pink-500" /> ดูรูปขยาย
                        </span>
                      </div>
                    </div>

                    {/* Polaroid Bottom Caption & Tags */}
                    <div className="pt-3 space-y-1.5">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white leading-snug line-clamp-2">
                        {p.caption}
                      </h4>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-purple-300/80 font-semibold pt-1 border-t border-slate-100 dark:border-purple-900/30">
                        <span className="flex items-center gap-1 truncate max-w-[120px]">
                          <MapPin className="h-3 w-3 text-pink-500 shrink-0" />
                          <span className="truncate">{p.location || 'Japan'}</span>
                        </span>

                        <span className="flex items-center gap-1 shrink-0">
                          <Calendar className="h-3 w-3 text-purple-400 shrink-0" />
                          <span>{p.date_label || 'Trip Day'}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Lightbox Photo Preview Modal */}
        {selectedPhoto && (
          <div 
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in"
            onClick={() => setSelectedPhoto(null)}
          >
            <div 
              className="relative max-w-2xl w-full bg-white dark:bg-[#1a182d] p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-purple-800/60 shadow-2xl space-y-3 animate-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-purple-900/40">
                <div className="flex items-center gap-2">
                  <span className="text-base">📸</span>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                    {selectedPhoto.caption}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-purple-200 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="rounded-2xl overflow-hidden bg-black/10 flex items-center justify-center max-h-[65vh]">
                <img
                  src={selectedPhoto.image_url}
                  alt={selectedPhoto.caption}
                  className="max-h-[62vh] w-auto object-contain rounded-xl shadow-md"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-purple-300">
                  <span>📍 {selectedPhoto.location}</span>
                  <span>•</span>
                  <span>📅 {selectedPhoto.date_label}</span>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={selectedPhoto.image_url}
                    download="travel_photo.jpg"
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-pink-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <HardDriveDownload className="h-3.5 w-3.5" />
                    <span>ดาวน์โหลดรูปลงเครื่อง</span>
                  </a>

                  <button
                    onClick={() => handleDeletePhoto(selectedPhoto.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title="ลบรูปภาพนี้"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
