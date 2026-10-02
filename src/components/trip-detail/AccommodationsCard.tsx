// src/components/trip-detail/AccommodationsCard.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building, ChevronDown, ChevronUp, Plus, Edit3, Trash2, 
  MapPin, Calendar, Moon, ExternalLink, Copy, Check, 
  Receipt, DollarSign, Sparkles, Phone, FileText, CheckCircle2,
  X, AlertCircle, BookmarkCheck
} from 'lucide-react';
import { 
  AccommodationStay, 
  getAccommodations, 
  saveAccommodations, 
  addAccommodation, 
  updateAccommodation, 
  deleteAccommodation,
  getGoogleMapsUrl 
} from '@/lib/accommodations';
import { convertToThb, convertCurrency } from '@/lib/currency';
import { supabase } from '@/lib/supabase';
import { triggerConfetti } from '@/lib/confetti';

interface AccommodationsCardProps {
  tripId: string;
  tripCurrency: string;
  fxRate: number;
  members?: any[];
  currentUser?: any;
  onExpenseCreated?: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

/**
 * Safely parse date into ISO YYYY-MM-DD format for PostgreSQL timestamp with time zone
 */
export function sanitizeSpentAtDate(dateStr?: string): string {
  if (!dateStr || !dateStr.trim()) {
    return new Date().toISOString().split('T')[0];
  }
  const trimmed = dateStr.trim();
  // 1. If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  // 2. Try standard Date parse
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2000) {
    return parsed.toISOString().split('T')[0];
  }
  // 3. If "05-Dec" or "5-Dec" or "Dec 5"
  const currentYear = new Date().getFullYear();
  const withYear = new Date(`${trimmed} ${currentYear}`);
  if (!isNaN(withYear.getTime())) {
    return withYear.toISOString().split('T')[0];
  }
  // 4. Try month matching (e.g. 05-Dec)
  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    'ม.ค.': '01', 'ก.พ.': '02', 'มี.ค.': '03', 'เม.ย.': '04', 'พ.ค.': '05', 'มิ.ย.': '06',
    'ก.ค.': '07', 'ส.ค.': '08', 'ก.ย.': '09', 'ต.ค.': '10', 'พ.ย.': '11', 'ธ.ค.': '12'
  };
  const match = trimmed.match(/^(\d{1,2})[-/ ]([A-Za-zก-๙.]+)/i);
  if (match) {
    const day = match[1].padStart(2, '0');
    const monKey = match[2].toLowerCase().substring(0, 3);
    const mm = monthMap[monKey] || '12';
    return `${currentYear}-${mm}-${day}`;
  }
  return new Date().toISOString().split('T')[0];
}

/**
 * Format string for <input type="date" />
 */
export function toInputDateFormat(dateStr?: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  return sanitizeSpentAtDate(trimmed);
}

/**
 * Friendly display format (e.g. 05-Dec-2026)
 */
export function formatStayDateDisplay(dateStr?: string): string {
  if (!dateStr) return '-';
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parts = trimmed.split('-');
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mIdx = parseInt(month, 10) - 1;
    if (mIdx >= 0 && mIdx < 12) {
      return `${day}-${months[mIdx]}-${year}`;
    }
  }
  return trimmed;
}

export function AccommodationsCard({
  tripId,
  tripCurrency,
  fxRate,
  members = [],
  currentUser,
  onExpenseCreated,
  onShowToast,
}: AccommodationsCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [stays, setStays] = useState<AccommodationStay[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Modal state for Add/Edit
  const [showModal, setShowModal] = useState(false);
  const [editingStay, setEditingStay] = useState<AccommodationStay | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formCheckIn, setFormCheckIn] = useState('');
  const [formCheckOut, setFormCheckOut] = useState('');
  const [formNights, setFormNights] = useState('1');
  const [formRoomType, setFormRoomType] = useState('');
  const [formBookingRef, setFormBookingRef] = useState('');
  const [formGoogleMapsUrl, setFormGoogleMapsUrl] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCurrency, setFormCurrency] = useState(tripCurrency || 'JPY');
  const [formNotes, setFormNotes] = useState('');
  const [formAutoCreateExpense, setFormAutoCreateExpense] = useState(true);

  // Load accommodations from storage
  useEffect(() => {
    if (tripId) {
      const data = getAccommodations(tripId);
      setStays(data);
    }
  }, [tripId]);

  const totalNights = useMemo(() => {
    return stays.reduce((acc, s) => acc + (Number(s.nights) || 1), 0);
  }, [stays]);

  const totalCost = useMemo(() => {
    return stays.reduce((acc, s) => {
      if (!s.price) return acc;
      return acc + convertCurrency(s.price, s.currency || tripCurrency, tripCurrency, fxRate);
    }, 0);
  }, [stays, tripCurrency, fxRate]);

  // Handle date change and calculate nights automatically
  const handleCheckInChange = (val: string) => {
    setFormCheckIn(val);
    if (val && formCheckOut) {
      const dIn = new Date(val).getTime();
      const dOut = new Date(formCheckOut).getTime();
      if (!isNaN(dIn) && !isNaN(dOut) && dOut > dIn) {
        const diffDays = Math.round((dOut - dIn) / (1000 * 60 * 60 * 24));
        setFormNights(String(diffDays));
      }
    }
  };

  const handleCheckOutChange = (val: string) => {
    setFormCheckOut(val);
    if (formCheckIn && val) {
      const dIn = new Date(formCheckIn).getTime();
      const dOut = new Date(val).getTime();
      if (!isNaN(dIn) && !isNaN(dOut) && dOut > dIn) {
        const diffDays = Math.round((dOut - dIn) / (1000 * 60 * 60 * 24));
        setFormNights(String(diffDays));
      }
    }
  };

  // Open modal for new stay
  const handleOpenAdd = () => {
    setEditingStay(null);
    setFormName('');
    setFormCity('');
    // Default to today
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    setFormCheckIn(today);
    setFormCheckOut(tomorrow);
    setFormNights('1');
    setFormRoomType('');
    setFormBookingRef('');
    setFormGoogleMapsUrl('');
    setFormPhone('');
    setFormPrice('');
    setFormCurrency(tripCurrency || 'JPY');
    setFormNotes('');
    setFormAutoCreateExpense(true);
    setShowModal(true);
  };

  // Open modal to edit existing stay
  const handleOpenEdit = (stay: AccommodationStay) => {
    setEditingStay(stay);
    setFormName(stay.name);
    setFormCity(stay.city || '');
    setFormCheckIn(toInputDateFormat(stay.checkInDate));
    setFormCheckOut(toInputDateFormat(stay.checkOutDate));
    setFormNights(String(stay.nights || 1));
    setFormRoomType(stay.roomType || '');
    setFormBookingRef(stay.bookingRef || '');
    setFormGoogleMapsUrl(stay.googleMapsUrl || '');
    setFormPhone(stay.phone || '');
    setFormPrice(stay.price ? String(stay.price) : '');
    setFormCurrency(stay.currency || tripCurrency || 'JPY');
    setFormNotes(stay.notes || '');
    setFormAutoCreateExpense(false);
    setShowModal(true);
  };

  // Delete stay
  const handleDelete = (stayId: string, stayName: string) => {
    if (confirm(`ต้องการลบข้อมูลที่พัก "${stayName}" ใช่หรือไม่?`)) {
      const updated = deleteAccommodation(tripId, stayId);
      setStays(updated);
      onShowToast?.(`ลบข้อมูลที่พัก "${stayName}" เรียบร้อยแล้ว 🗑️`, 'info');
    }
  };

  // Copy booking ref to clipboard
  const handleCopyRef = (id: string, ref: string) => {
    if (typeof window !== 'undefined' && ref) {
      navigator.clipboard.writeText(ref);
      setCopiedId(id);
      onShowToast?.('คัดลอกรหัสการจองเรียบร้อยแล้ว! 📋', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Create an expense for a stay (Safe date parsing)
  const handleCreateExpenseForStay = async (stay: AccommodationStay) => {
    if (!stay.price || stay.price <= 0) {
      alert('ที่พักนี้ยังไม่ได้ระบุราคา กรุณาแก้ไขเพื่อใส่ราคาก่อนบันทึกเป็นรายจ่าย');
      return;
    }
    try {
      const priceNum = Number(stay.price);
      const title = `ค่าที่พัก: ${stay.name}${stay.nights ? ` (${stay.nights} คืน)` : ''}`;
      // Sanitize spent_at to valid ISO date string
      const validSpentAt = sanitizeSpentAtDate(stay.checkInDate);
      
      const { data, error } = await supabase.from('expenses').insert([
        {
          trip_id: tripId,
          title,
          amount: priceNum,
          currency: stay.currency || tripCurrency || 'JPY',
          category: 'hotel',
          spent_at: validSpentAt,
          payer_id: currentUser?.id || null,
          payer_name: currentUser?.user_metadata?.display_name || currentUser?.email?.split('@')[0] || 'ฉัน',
        },
      ]).select('id').single();

      if (error) throw error;

      // Update accommodation with expenseId
      const updatedStay: AccommodationStay = {
        ...stay,
        expenseId: data?.id || 'linked',
      };
      const updatedList = updateAccommodation(tripId, updatedStay);
      setStays(updatedList);
      triggerConfetti();

      if (onExpenseCreated) {
        onExpenseCreated();
      }
      onShowToast?.('บันทึกค่าที่พักลงในรายการค่าใช้จ่ายเรียบร้อยแล้ว! 💰', 'success');
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการบันทึกรายจ่าย: ' + err.message);
    }
  };

  // Save Modal Form
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('กรุณากรอกชื่อที่พัก / โรงแรม');
      return;
    }

    setIsSubmitting(true);
    try {
      const priceNum = formPrice ? parseFloat(formPrice) : undefined;
      const nightsNum = parseInt(formNights) || 1;
      const validSpentAt = sanitizeSpentAtDate(formCheckIn);

      let createdExpenseId: string | undefined = editingStay?.expenseId;

      // Automatically create an expense in Supabase if toggle checked and price > 0
      if (!editingStay && formAutoCreateExpense && priceNum && priceNum > 0) {
        try {
          const { data, error } = await supabase.from('expenses').insert([
            {
              trip_id: tripId,
              title: `ค่าที่พัก: ${formName.trim()}${nightsNum ? ` (${nightsNum} คืน)` : ''}`,
              amount: priceNum,
              currency: formCurrency || tripCurrency || 'JPY',
              category: 'hotel',
              spent_at: validSpentAt,
              payer_id: currentUser?.id || null,
              payer_name: currentUser?.user_metadata?.display_name || currentUser?.email?.split('@')[0] || 'ฉัน',
            },
          ]).select('id').single();

          if (!error && data?.id) {
            createdExpenseId = data.id;
          }
        } catch (expErr) {
          console.warn('Could not auto-create expense record:', expErr);
        }
      }

      if (editingStay) {
        const updatedItem: AccommodationStay = {
          ...editingStay,
          name: formName.trim(),
          city: formCity.trim(),
          checkInDate: formCheckIn.trim(),
          checkOutDate: formCheckOut.trim(),
          nights: nightsNum,
          roomType: formRoomType.trim(),
          bookingRef: formBookingRef.trim(),
          googleMapsUrl: formGoogleMapsUrl.trim(),
          phone: formPhone.trim(),
          price: priceNum,
          currency: formCurrency,
          notes: formNotes.trim(),
          expenseId: createdExpenseId,
        };
        const updatedList = updateAccommodation(tripId, updatedItem);
        setStays(updatedList);
      } else {
        const updatedList = addAccommodation(tripId, {
          name: formName.trim(),
          city: formCity.trim(),
          checkInDate: formCheckIn.trim(),
          checkOutDate: formCheckOut.trim(),
          nights: nightsNum,
          roomType: formRoomType.trim(),
          bookingRef: formBookingRef.trim(),
          googleMapsUrl: formGoogleMapsUrl.trim(),
          phone: formPhone.trim(),
          price: priceNum,
          currency: formCurrency,
          notes: formNotes.trim(),
          expenseId: createdExpenseId,
        });
        setStays(updatedList);
      }

      triggerConfetti();
      setShowModal(false);
      onShowToast?.(editingStay ? 'แก้ไขข้อมูลที่พักเรียบร้อยแล้ว ✨' : 'บันทึกที่พักใหม่เรียบร้อยแล้ว 🏨', 'success');
      if (onExpenseCreated) {
        onExpenseCreated();
      }
    } catch (err: any) {
      alert('บันทึกที่พักไม่สำเร็จ: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200/90 dark:border-[#222c42] bg-white dark:bg-[#151b2b] card-elevation overflow-hidden transition-all">
      {/* Accordion Trigger Header */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-[#1c2438]/60 transition-colors"
      >
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-emerald-600 dark:bg-emerald-600 flex items-center justify-center text-white shadow-xs shrink-0">
            <Building className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                ที่พักของทริป (Accommodations) 🏨
              </span>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-900/50">
                {stays.length > 0 ? `จองแล้ว ${stays.length} แห่ง` : 'ยังไม่มีข้อมูล'}
              </span>
              {totalNights > 0 && (
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  • รวม {totalNights} คืน
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
              {stays.length > 0 
                ? stays.map(s => s.name).join(' ➔ ')
                : 'บันทึกโรงแรม 3 แห่ง, วันเช็คอิน, แผนที่นำทาง และเลขที่ใบจอง'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenAdd();
            }}
            className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs hover:scale-105 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">เพิ่มที่พัก</span>
          </button>

          <div className="p-1.5 rounded-xl bg-slate-100 dark:bg-[#1c2438] text-slate-500 dark:text-slate-300 border border-slate-200/80 dark:border-[#222c42]">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isOpen && (
        <div className="p-3.5 sm:p-5 pt-0 border-t border-slate-100 dark:border-[#222c42] space-y-3.5 animate-in slide-in-from-top-2 duration-200">
          {/* Top Bar: Financial Summary & Quick Add */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 p-2.5 sm:p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-sm">🌙</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                รวมค่าที่พักทั้งหมด:
              </span>
              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                {totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} {tripCurrency}
              </span>
              {tripCurrency !== 'THB' && totalCost > 0 && (
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 font-mono">
                  (≈ ฿{Math.round(convertToThb(totalCost, tripCurrency, fxRate)).toLocaleString()} THB)
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleOpenAdd}
              className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer ml-auto"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>เพิ่มที่พักอีกแห่ง</span>
            </button>
          </div>

          {/* Accommodation Cards List */}
          {stays.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-[#222c42] bg-slate-50/50 dark:bg-[#151b2b]/50 space-y-2">
              <Building className="h-9 w-9 text-emerald-500 mx-auto opacity-80" />
              <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                ยังไม่มีข้อมูลที่พักในทริปนี้
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium">
                จองที่พักไปแล้ว 3 แห่งใช่ไหมครับ? กดปุ่มด้านล่างเพื่อบันทึกข้อมูลโรงแรมแต่ละแห่ง พร้อมแผนที่และเลขที่จองได้เลย!
              </p>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/25 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" /> เพิ่มที่พักแห่งแรก (เช่น โรงแรมที่ 1)
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {stays.map((stay, idx) => {
                const mapsUrl = getGoogleMapsUrl(stay);
                const hasExpense = Boolean(stay.expenseId);

                return (
                  <div
                    key={stay.id}
                    className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-[#222c42] bg-white dark:bg-[#111624] shadow-xs hover:border-emerald-400/60 dark:hover:border-emerald-500/50 transition-all flex flex-col justify-between space-y-3 relative group"
                  >
                    {/* Top Header: Stay Index & Hotel Name */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#1c2438] text-slate-700 dark:text-slate-300 font-mono">
                          ที่พัก {idx + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(stay)}
                            className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-[#1c2438] transition-colors cursor-pointer"
                            title="แก้ไขข้อมูลที่พัก"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(stay.id, stay.name)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-[#1c2438] transition-colors cursor-pointer"
                            title="ลบที่พัก"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-start gap-1.5">
                        <Building className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight">
                            {stay.name}
                          </h4>
                          <div className="flex flex-wrap items-center gap-1 mt-0.5">
                            {stay.city && (
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                📍 {stay.city}
                              </span>
                            )}
                            {stay.roomType && (
                              <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 dark:bg-[#1c2438] text-slate-600 dark:text-slate-300">
                                🛏️ {stay.roomType}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Timeline: Check-in / Nights / Check-out with friendly formatted dates */}
                    <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-[#171f30] border border-slate-100 dark:border-[#222c42] space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">เข้าพัก:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {formatStayDateDisplay(stay.checkInDate)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">ออก:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {formatStayDateDisplay(stay.checkOutDate)}
                        </span>
                      </div>
                      <div className="pt-1 border-t border-slate-200/50 dark:border-[#222c42] flex items-center justify-between text-[10px] font-bold">
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Moon className="h-3 w-3" /> จำนวนคืน:
                        </span>
                        <span className="font-mono px-2 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black">
                          {stay.nights || 1} คืน
                        </span>
                      </div>
                    </div>

                    {/* Booking Reference with 1-Click Copy */}
                    {stay.bookingRef && (
                      <div className="flex items-center justify-between gap-1 p-2 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 text-[11px]">
                        <div className="min-w-0 flex items-center gap-1 text-slate-700 dark:text-slate-300 font-mono truncate">
                          <BookmarkCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span className="truncate">{stay.bookingRef}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyRef(stay.id, stay.bookingRef!)}
                          className="px-2 py-0.5 rounded-lg bg-white dark:bg-[#151b2b] text-[10px] font-bold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shadow-2xs hover:bg-blue-50 transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                          title="คัดลอกรหัสจอง"
                        >
                          {copiedId === stay.id ? (
                            <>
                              <Check className="h-2.5 w-2.5 text-emerald-500" />
                              <span className="text-emerald-600">คัดลอกแล้ว</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-2.5 w-2.5" />
                              <span>คัดลอก</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Notes if any */}
                    {stay.notes && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 italic line-clamp-2">
                        📝 {stay.notes}
                      </p>
                    )}

                    {/* Price & Actions Bottom Section */}
                    <div className="pt-2 border-t border-slate-100 dark:border-[#222c42] flex flex-col gap-2">
                      {/* Price Display */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">ราคา:</span>
                        <div className="text-right">
                          <span className="font-mono font-black text-slate-900 dark:text-white">
                            {stay.price ? `${stay.price.toLocaleString()} ${stay.currency || tripCurrency}` : 'ไม่ระบุ'}
                          </span>
                          {stay.price && (stay.currency || tripCurrency) !== 'THB' && (
                            <span className="block text-[9px] text-slate-400 font-mono">
                              ≈ ฿{Math.round(convertToThb(stay.price, stay.currency || tripCurrency, fxRate)).toLocaleString()} THB
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons: Google Maps & Create Expense */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] hover:border-emerald-400 text-slate-700 dark:text-slate-300 hover:text-emerald-600 text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <MapPin className="h-3 w-3 text-rose-500" />
                          <span>Google Maps</span>
                          <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                        </a>

                        {hasExpense ? (
                          <span className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" /> บันทึกแล้ว
                          </span>
                        ) : stay.price && stay.price > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleCreateExpenseForStay(stay)}
                            className="py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs hover:scale-102 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                            title="บันทึกราคาที่พักนี้ลงในแท็บรายจ่าย"
                          >
                            <Receipt className="h-3 w-3" />
                            <span>ลงรายจ่าย</span>
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== ADD / EDIT MODAL ==================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center backdrop-blur-md bg-black/60 p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#151b2b] shadow-2xl border border-slate-200/90 dark:border-[#222c42] glow-blue max-h-[88vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200 ease-out">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 pb-3 flex justify-between items-center border-b border-slate-100 dark:border-[#222c42]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <Building className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    {editingStay ? 'แก้ไขข้อมูลที่พัก 🏨' : 'เพิ่มที่พักใหม่ในทริป 🏨'}
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    ใส่วันเข้าพักผ่านปฏิทิน (Date Picker) เพื่อคำนวณคืนและบันทึกรายจ่ายอัตโนมัติ
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1c2438] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveForm} className="p-4 sm:p-5 space-y-3 overflow-y-auto custom-scrollbar flex-1">
              {/* Hotel Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  ชื่อโรงแรม / ที่พัก *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น Shinjuku Granbell Hotel หรือ Hakone Ryokan"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                />
              </div>

              {/* City & Room Type */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    เมือง / ย่าน
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น Tokyo, Shinjuku"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    ประเภทห้องพัก
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น Deluxe Twin, Tatami"
                    value={formRoomType}
                    onChange={(e) => setFormRoomType(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Check-in, Check-out & Nights with Date Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    วันเช็คอิน (Check-in) *
                  </label>
                  <input
                    type="date"
                    required
                    value={formCheckIn}
                    onChange={(e) => handleCheckInChange(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    วันเช็คเอาท์ (Check-out) *
                  </label>
                  <input
                    type="date"
                    required
                    value={formCheckOut}
                    onChange={(e) => handleCheckOutChange(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    จำนวนคืน *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      required
                      value={formNights}
                      onChange={(e) => setFormNights(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">คืน</span>
                  </div>
                </div>
              </div>

              {/* Price & Currency */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    ราคาที่พัก (ยอดรวมทั้งหมด)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="เช่น 45000"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                  {formPrice && parseFloat(formPrice) > 0 && formCurrency !== 'THB' && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block font-bold">
                      ≈ ฿{Math.round(convertToThb(parseFloat(formPrice), formCurrency, fxRate)).toLocaleString()} THB
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    สกุลเงิน
                  </label>
                  <select
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  >
                    <option value="JPY">JPY (¥)</option>
                    <option value="THB">THB (฿)</option>
                    <option value="USD">USD ($)</option>
                    <option value="CNY">CNY (元)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="KRW">KRW (₩)</option>
                  </select>
                </div>
              </div>

              {/* Booking Reference No. & Phone */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    เลขที่การจอง (Booking Ref)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น Agoda: #81923019"
                    value={formBookingRef}
                    onChange={(e) => setFormBookingRef(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    เบอร์โทรศัพท์โรงแรม
                  </label>
                  <input
                    type="tel"
                    placeholder="เช่น +81 3-1234-5678"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Google Maps link */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  ลิงก์ Google Maps (ถ้ามี)
                </label>
                <input
                  type="url"
                  placeholder="https://maps.app.goo.gl/... (ไม่ใส่ก็ได้ ระบบจะค้นหาให้อัตโนมัติ)"
                  value={formGoogleMapsUrl}
                  onChange={(e) => setFormGoogleMapsUrl(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  หมายเหตุ / เงื่อนไข
                </label>
                <textarea
                  rows={2}
                  placeholder="เช่น เช็คอินได้หลัง 15:00 น., รวมอาหารเช้า, ฝากกระเป๋าได้ก่อนเวลา"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                />
              </div>

              {/* Auto Create Expense Checkbox (Only for new stays) */}
              {!editingStay && (
                <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="autoExpense"
                    checked={formAutoCreateExpense}
                    onChange={(e) => setFormAutoCreateExpense(e.target.checked)}
                    className="mt-0.5 h-4 w-4 text-emerald-600 rounded border-slate-300 dark:border-[#222c42] cursor-pointer"
                  />
                  <label htmlFor="autoExpense" className="text-xs text-slate-800 dark:text-slate-200 cursor-pointer">
                    <span className="font-bold block">⚡ บันทึกเป็นรายจ่ายลงในแท็บ 'รายการ' ทันที</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      ระบบจะสร้างรายการค่าที่พักในหมวด 🏨 ให้อัตโนมัติ ไม่ต้องกรอกซ้ำ
                    </span>
                  </label>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#222c42] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1c2438] cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/25 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  <span>{editingStay ? 'บันทึกการแก้ไข' : 'บันทึกที่พัก'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccommodationsCard;
