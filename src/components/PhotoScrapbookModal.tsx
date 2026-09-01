// src/components/PhotoScrapbookModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  Camera, Image as ImageIcon, Plus, Trash2, X, 
  MapPin, Calendar, Heart, Download, Eye, Sparkles, Loader2 
} from 'lucide-react';
import { PhotoMemory, getTripPhotos, saveTripPhoto, deleteTripPhoto } from '@/lib/photos';

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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
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
      location,
      date_label: dateLabel,
    });

    setPhotos(updated);
    setImageUrl('');
    setCaption('');
    setLocation('');
    setDateLabel('');
    setShowAddForm(false);
  };

  const handleDeletePhoto = (photoId: string) => {
    if (confirm('ต้องการลบรูปภาพนี้ใช่หรือไม่?')) {
      const updated = deleteTripPhoto(tripId, photoId);
      setPhotos(updated);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl rounded-3xl bg-white dark:bg-[#130d22] shadow-2xl border border-slate-200 dark:border-purple-800/60 max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 pb-3 flex justify-between items-center border-b border-slate-100 dark:border-purple-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center text-white text-lg shadow-md shadow-pink-500/25 animate-float-slow">
              📸
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                สมุดภาพความทรงจำ (Trip Photo Scrapbook) 💖
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-purple-300/70 font-medium">
                บันทึกรูปภาพประทับใจพร้อมปักหมุดสถานที่และแคปชันประจำวัน
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 hover:scale-105 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" /> เพิ่มรูปภาพ
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-purple-200 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 pt-4 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          
          {/* Add Photo Form (Accordion) */}
          {showAddForm && (
            <form onSubmit={handleAddPhoto} className="p-5 rounded-3xl bg-pink-50/50 dark:bg-purple-950/30 border border-pink-200 dark:border-purple-900/50 space-y-3.5 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Image Upload Area */}
                <div>
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-pink-400 dark:border-pink-600 rounded-2xl cursor-pointer bg-white dark:bg-[#1c1328] hover:opacity-90 overflow-hidden relative">
                    {uploading ? (
                      <Loader2 className="h-7 w-7 animate-spin text-pink-500" />
                    ) : imageUrl ? (
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 p-3 text-center">
                        <Camera className="h-8 w-8 text-pink-500 mb-1 animate-float-slow" />
                        <span className="text-xs font-bold text-pink-600 dark:text-pink-400">คลิกเพื่อเลือกรูปภาพ</span>
                        <span className="text-[10px] text-slate-400">รองรับไฟล์ JPG, PNG, WEBP</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
                  </label>
                </div>

                {/* Caption & Metadata */}
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 dark:text-purple-200 mb-1">คำบรรยายความทรงจำ (Caption) *</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น ถ่ายรูปคู่ป้ายกูลิโกะตอนค่ำ, ราเมงข้อสอบสุดฟิน"
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-purple-800 bg-white dark:bg-[#1c1328] text-xs outline-none focus:border-pink-500 font-medium text-slate-900 dark:text-white"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-800 dark:text-purple-200 mb-1">สถานที่ / ย่าน</label>
                      <input
                        type="text"
                        placeholder="เช่น Dotonbori, Osaka"
                        className="w-full p-2 rounded-xl border border-slate-300 dark:border-purple-800 bg-white dark:bg-[#1c1328] text-xs outline-none focus:border-pink-500 text-slate-900 dark:text-white"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-800 dark:text-purple-200 mb-1">วันที่ / Day</label>
                      <input
                        type="text"
                        placeholder="เช่น 5 ธ.ค., Day 2"
                        className="w-full p-2 rounded-xl border border-slate-300 dark:border-purple-800 bg-white dark:bg-[#1c1328] text-xs outline-none focus:border-pink-500 text-slate-900 dark:text-white"
                        value={dateLabel}
                        onChange={(e) => setDateLabel(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-purple-800 text-xs font-bold text-slate-700 dark:text-purple-200 cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold shadow-sm cursor-pointer hover:scale-105 transition-all"
                    >
                      บันทึกลงสมุดภาพ
                    </button>
                  </div>
                </div>

              </div>
            </form>
          )}

          {/* Photo Gallery Grid (Polaroid Style) */}
          {photos.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-purple-900/50 rounded-3xl p-8">
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
              {photos.map((p) => (
                <div
                  key={p.id}
                  className="group bg-white dark:bg-[#1a1228] p-3 rounded-2xl border border-slate-200 dark:border-purple-900/50 shadow-md hover:shadow-xl hover:-translate-y-1.5 hover:rotate-1 transition-all duration-300 flex flex-col justify-between"
                >
                  <div
                    className="relative w-full h-48 rounded-xl overflow-hidden bg-black/5 cursor-pointer"
                    onClick={() => setSelectedImage(p.image_url)}
                  >
                    <img
                      src={p.image_url}
                      alt={p.caption}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="p-2 rounded-full bg-white/90 text-slate-900 text-xs font-bold flex items-center gap-1 shadow-md">
                        <Eye className="h-3.5 w-3.5" /> ดูภาพขยาย
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 space-y-1">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white leading-snug line-clamp-2">
                      {p.caption}
                    </h4>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-purple-400 font-medium pt-1 border-t border-slate-100 dark:border-purple-900/40">
                      <div className="flex items-center gap-1 truncate">
                        {p.location && (
                          <span className="flex items-center gap-0.5 truncate text-pink-600 dark:text-pink-400 font-bold">
                            <MapPin className="h-2.5 w-2.5 shrink-0" /> {p.location}
                          </span>
                        )}
                        {p.date_label && (
                          <span>• {p.date_label}</span>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeletePhoto(p.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="ลบรูปภาพ"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Fullscreen Lightbox Preview */}
        {selectedImage && (
          <div
            className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-4xl w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-2 right-2 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 cursor-pointer z-10"
              >
                <X className="h-6 w-6" />
              </button>
              <img
                src={selectedImage}
                alt="Full View"
                className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain"
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
