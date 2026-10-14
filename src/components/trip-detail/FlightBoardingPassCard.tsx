// src/components/trip-detail/FlightBoardingPassCard.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plane, Clock, ChevronDown, ChevronUp, Edit3, Check, X, 
  Plus, Trash2, Copy, ExternalLink, Receipt, CheckCircle2, 
  BookmarkCheck, Loader2 
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  FlightTicket, 
  getFlights, 
  addOrUpdateFlight, 
  deleteFlight, 
  toggleFlightPaymentStatus,
  syncFlightsToSupabase 
} from '@/lib/flights';
import { convertToThb, convertCurrency } from '@/lib/currency';
import { supabase } from '@/lib/supabase';
import { triggerConfetti } from '@/lib/confetti';
import { sanitizeSpentAtDate } from './AccommodationsCard';

interface FlightBoardingPassCardProps {
  tripId: string;
  defaultDestination?: string;
  tripCurrency?: string;
  fxRate?: number;
  currentUser?: any;
  defaultOpen?: boolean;
  tripStartDate?: string;
  tripEndDate?: string;
  onExpenseCreated?: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function FlightBoardingPassCard({ 
  tripId, 
  defaultDestination = 'Tokyo',
  tripCurrency = 'THB',
  fxRate = 1,
  currentUser,
  defaultOpen = false,
  tripStartDate,
  tripEndDate,
  onExpenseCreated,
  onShowToast,
}: FlightBoardingPassCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [flights, setFlights] = useState<FlightTicket[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Modal State for Add / Edit
  const [showModal, setShowModal] = useState(false);
  const [editingFlight, setEditingFlight] = useState<FlightTicket | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [formAirline, setFormAirline] = useState('Thai Airways');
  const [formFlightNo, setFormFlightNo] = useState('TG682');
  const [formOriginCode, setFormOriginCode] = useState('BKK');
  const [formOriginCity, setFormOriginCity] = useState('Bangkok');
  const [formDestCode, setFormDestCode] = useState('HND');
  const [formDestCity, setFormDestCity] = useState(defaultDestination);
  const [formDepartureDate, setFormDepartureDate] = useState('');
  const [formDepartureTime, setFormDepartureTime] = useState('22:45');
  const [formBoardingTime, setFormBoardingTime] = useState('22:05');
  const [formTerminal, setFormTerminal] = useState('1');
  const [formGate, setFormGate] = useState('D4');
  const [formSeat, setFormSeat] = useState('24K');
  const [formPassengerName, setFormPassengerName] = useState('');
  const [formBookingRef, setFormBookingRef] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCurrency, setFormCurrency] = useState(tripCurrency || 'THB');
  const [formPaymentStatus, setFormPaymentStatus] = useState<'paid' | 'unpaid'>('paid');
  const [formNotes, setFormNotes] = useState('');
  const [formAutoCreateExpense, setFormAutoCreateExpense] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll and Escape key listener when modal is open
  useEffect(() => {
    if (showModal && typeof document !== 'undefined') {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setShowModal(false);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = prev;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [showModal]);

  // Load flights from localStorage and sync from Supabase
  useEffect(() => {
    if (!tripId) return;

    const loadLatestFlights = async () => {
      // 1. Initial local load
      const local = getFlights(tripId);
      if (local && local.length > 0) {
        setFlights(local);
      }

      // 2. Fetch latest from Supabase metadata row
      try {
        const { data: metaRow } = await supabase
          .from('itinerary_items')
          .select('backup_plan')
          .eq('trip_id', tripId)
          .eq('date_label', '__meta_trip_data__')
          .maybeSingle();

        if (metaRow?.backup_plan) {
          const parsed = JSON.parse(metaRow.backup_plan);
          if (parsed.flights !== undefined && Array.isArray(parsed.flights)) {
            setFlights(parsed.flights);
            if (typeof window !== 'undefined') {
              localStorage.setItem(`flight_pass_${tripId}`, JSON.stringify(parsed.flights));
            }
          } else if (parsed.flight) {
            // Backward compatibility for single flight
            const singleFlight = [{
              ...parsed.flight,
              id: parsed.flight.id || 'flight_default',
              tripId,
              createdAt: parsed.flight.createdAt || Date.now(),
            }];
            setFlights(singleFlight);
            if (typeof window !== 'undefined') {
              localStorage.setItem(`flight_pass_${tripId}`, JSON.stringify(singleFlight));
            }
          }
        }
      } catch (err) {
        console.warn('Flight fetch error:', err);
      }
    };

    loadLatestFlights();

    // Listen to local update events across components
    const handleLocalUpdate = (e: any) => {
      if (e.detail?.tripId === tripId && Array.isArray(e.detail?.flights)) {
        setFlights(e.detail.flights);
      }
    };
    window.addEventListener('travel_tracker_flights_updated', handleLocalUpdate);

    // Subscribe to Supabase Realtime changes on itinerary_items for multi-browser sync
    const channel = supabase
      .channel(`rt_flights_${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'itinerary_items',
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          loadLatestFlights();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('travel_tracker_flights_updated', handleLocalUpdate);
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  const totalFlightCost = useMemo(() => {
    return flights.reduce((acc, f) => {
      if (!f.price) return acc;
      return acc + convertCurrency(f.price, f.currency || tripCurrency, tripCurrency, fxRate);
    }, 0);
  }, [flights, tripCurrency, fxRate]);

  // Open modal to add a new flight
  const handleOpenAdd = () => {
    setEditingFlight(null);
    setFormAirline('Thai Airways');
    setFormFlightNo('TG682');
    setFormOriginCode('BKK');
    setFormOriginCity('Bangkok');
    setFormDestCode('HND');
    setFormDestCity(defaultDestination || 'Tokyo');
    setFormDepartureDate(new Date().toISOString().split('T')[0]);
    setFormDepartureTime('22:45');
    setFormBoardingTime('22:05');
    setFormTerminal('1');
    setFormGate('D4');
    setFormSeat('24K');
    setFormPassengerName(currentUser?.user_metadata?.display_name || currentUser?.email?.split('@')[0] || 'TRAVELER');
    setFormBookingRef('');
    setFormPrice('');
    setFormCurrency(tripCurrency || 'THB');
    setFormPaymentStatus('paid');
    setFormNotes('');
    setFormAutoCreateExpense(true);
    setShowModal(true);
  };

  // Open modal to edit flight
  const handleOpenEdit = (flight: FlightTicket) => {
    setEditingFlight(flight);
    setFormAirline(flight.airline);
    setFormFlightNo(flight.flightNo);
    setFormOriginCode(flight.originCode);
    setFormOriginCity(flight.originCity);
    setFormDestCode(flight.destCode);
    setFormDestCity(flight.destCity);
    setFormDepartureDate(flight.departureDate || '');
    setFormDepartureTime(flight.departureTime || '');
    setFormBoardingTime(flight.boardingTime || '');
    setFormTerminal(flight.terminal || '');
    setFormGate(flight.gate || '');
    setFormSeat(flight.seat || '');
    setFormPassengerName(flight.passengerName || '');
    setFormBookingRef(flight.bookingRef || '');
    setFormPrice(flight.price ? String(flight.price) : '');
    setFormCurrency(flight.currency || tripCurrency || 'THB');
    setFormPaymentStatus(flight.paymentStatus || 'paid');
    setFormNotes(flight.notes || '');
    setFormAutoCreateExpense(false);
    setShowModal(true);
  };

  // Delete flight with confirmation and Supabase sync
  const handleDelete = async (flightId: string, flightNo: string) => {
    if (confirm(`ต้องการลบตั๋วเครื่องบิน "${flightNo}" ใช่หรือไม่?`)) {
      const updated = await deleteFlight(tripId, flightId, flights);
      setFlights(updated);
      onShowToast?.(`ลบตั๋วเครื่องบิน "${flightNo}" เรียบร้อยแล้ว 🗑️`, 'info');
    }
  };

  // Toggle payment status checklist (Paid vs Pay Later)
  const handleTogglePayment = async (flight: FlightTicket) => {
    const updated = await toggleFlightPaymentStatus(tripId, flight.id, flights);
    setFlights(updated);
    const updatedFlight = updated.find((f) => f.id === flight.id);
    if (updatedFlight?.paymentStatus === 'paid') {
      toast.success(`อัปเดตเที่ยวบิน "${flight.flightNo}" เป็น จ่ายเงินแล้ว ✅`);
      // If price exists and not yet in expenses, prompt user
      if (flight.price && flight.price > 0 && !flight.expenseId) {
        if (window.confirm(`ต้องการบันทึกราคาตั๋วบิน ${flight.price.toLocaleString()} ${flight.currency || tripCurrency} เป็นรายจ่ายลงในทริปด้วยเลยไหม?`)) {
          handleCreateExpenseForFlight(updatedFlight);
        }
      }
    } else {
      toast.info(`อัปเดตเที่ยวบิน "${flight.flightNo}" เป็น ยังไม่จ่าย / จ่ายทีหลัง ⏳`);
    }
  };

  // Copy booking ref to clipboard
  const handleCopyRef = (id: string, ref: string) => {
    if (typeof window !== 'undefined' && ref) {
      navigator.clipboard.writeText(ref);
      setCopiedId(id);
      onShowToast?.('คัดลอกรหัสการจองตั๋วบินเรียบร้อยแล้ว! 📋', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Create an expense for a flight
  const handleCreateExpenseForFlight = async (flight: FlightTicket) => {
    if (!flight.price || flight.price <= 0) {
      toast.warning('ตั๋วนี้ยังไม่ได้ระบุราคา กรุณาแก้ไขเพื่อใส่ราคาก่อนบันทึกเป็นรายจ่าย');
      return;
    }
    try {
      const priceNum = Number(flight.price);
      const title = `ตั๋วเครื่องบิน: ${flight.airline} ${flight.flightNo} (${flight.originCode} ➔ ${flight.destCode})`;
      const validSpentAt = sanitizeSpentAtDate(flight.departureDate);

      const { data, error } = await supabase.from('expenses').insert([
        {
          trip_id: tripId,
          title,
          amount: priceNum,
          currency: flight.currency || tripCurrency || 'THB',
          category: 'transport',
          spent_at: validSpentAt,
          payer_id: currentUser?.id || null,
          payer_name: currentUser?.user_metadata?.display_name || currentUser?.email?.split('@')[0] || 'ฉัน',
        },
      ]).select('id').single();

      if (error) throw error;

      // Update flight with expenseId
      const updatedFlight: FlightTicket = {
        ...flight,
        expenseId: data?.id || 'linked',
      };
      const updatedList = await addOrUpdateFlight(tripId, updatedFlight);
      setFlights(updatedList);
      triggerConfetti();

      if (onExpenseCreated) {
        onExpenseCreated();
      }
      toast.success('บันทึกค่าตั๋วบินลงในรายการค่าใช้จ่ายเรียบร้อยแล้ว! ✈️💰');
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาดในการบันทึกรายจ่าย: ' + err.message);
    }
  };

  // Save Modal Form
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFlightNo.trim()) {
      toast.error('กรุณากรอกเลขไฟลต์ เช่น TG682 หรือ MM028');
      return;
    }

    setIsSubmitting(true);
    try {
      const priceNum = formPrice ? parseFloat(formPrice) : undefined;
      const validSpentAt = sanitizeSpentAtDate(formDepartureDate);

      let createdExpenseId: string | undefined = editingFlight?.expenseId;

      // Auto create expense if requested
      if (!editingFlight && formAutoCreateExpense && priceNum && priceNum > 0 && formPaymentStatus === 'paid') {
        try {
          const { data, error } = await supabase.from('expenses').insert([
            {
              trip_id: tripId,
              title: `ตั๋วเครื่องบิน: ${formAirline.trim()} ${formFlightNo.trim()} (${formOriginCode.trim()} ➔ ${formDestCode.trim()})`,
              amount: priceNum,
              currency: formCurrency || tripCurrency || 'THB',
              category: 'transport',
              spent_at: validSpentAt,
              payer_id: currentUser?.id || null,
              payer_name: currentUser?.user_metadata?.display_name || currentUser?.email?.split('@')[0] || 'ฉัน',
            },
          ]).select('id').single();

          if (!error && data?.id) {
            createdExpenseId = data.id;
          }
        } catch (expErr) {
          console.warn('Could not auto-create flight expense:', expErr);
        }
      }

      const flightData: FlightTicket = {
        id: editingFlight?.id || 'flight_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
        tripId,
        airline: formAirline.trim() || 'สายการบิน',
        flightNo: formFlightNo.trim().toUpperCase(),
        originCode: formOriginCode.trim().toUpperCase() || 'BKK',
        originCity: formOriginCity.trim() || 'Bangkok',
        destCode: formDestCode.trim().toUpperCase() || 'DEST',
        destCity: formDestCity.trim() || 'Destination',
        departureDate: formDepartureDate.trim(),
        departureTime: formDepartureTime.trim(),
        boardingTime: formBoardingTime.trim(),
        terminal: formTerminal.trim(),
        gate: formGate.trim(),
        seat: formSeat.trim(),
        passengerName: formPassengerName.trim(),
        bookingRef: formBookingRef.trim(),
        price: priceNum,
        currency: formCurrency,
        paymentStatus: formPaymentStatus,
        notes: formNotes.trim(),
        expenseId: createdExpenseId,
        createdAt: editingFlight?.createdAt || Date.now(),
      };

      const updated = await addOrUpdateFlight(tripId, flightData, flights);
      setFlights(updated);
      triggerConfetti();
      setShowModal(false);
      toast.success(editingFlight ? 'แก้ไขข้อมูลเที่ยวบินเรียบร้อยแล้ว ✨' : 'บันทึกเที่ยวบินใหม่เรียบร้อยแล้ว ✈️');

      if (onExpenseCreated) {
        onExpenseCreated();
      }
    } catch (err: any) {
      toast.error('บันทึกเที่ยวบินไม่สำเร็จ: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200/90 dark:border-[#222c42] bg-white dark:bg-[#151b2b] shadow-sm overflow-hidden transition-all">
      {/* Accordion Trigger Header */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1c2438] transition-colors"
      >
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-blue-600 dark:bg-blue-700 flex items-center justify-center text-white shadow-xs shrink-0">
            <Plane className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                ตั๋วเครื่องบิน & Boarding Pass ✈️
              </span>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
                {flights.length > 0 ? `${flights.length} เที่ยวบิน` : 'ยังไม่มีตั๋วบิน'}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
              {flights.length > 0 
                ? flights.map((f) => `${f.airline} (${f.originCode}➔${f.destCode})`).join(' • ')
                : 'บันทึกเที่ยวบินขาไป-กลับ, เลขที่นั่ง, เกท และเชื่อมกับรายจ่าย'}
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
            className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-xs hover:scale-105 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">เพิ่มตั๋วบิน</span>
          </button>

          <div className="p-1.5 rounded-xl bg-slate-100 dark:bg-[#1c2438] text-slate-500 dark:text-slate-300 border border-slate-200/80 dark:border-[#222c42]">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isOpen && (
        <div className="p-4 sm:p-6 pt-0 border-t border-slate-100 dark:border-[#222c42] space-y-4 animate-in slide-in-from-top-2 duration-200">
          {/* Financial Summary & Quick Add Bar */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 p-2.5 sm:p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-sm">✈️</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                รวมค่าตั๋วบินทั้งหมด:
              </span>
              <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-sm">
                {totalFlightCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} {tripCurrency}
              </span>
              {tripCurrency !== 'THB' && totalFlightCost > 0 && (
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 font-mono">
                  (≈ ฿{Math.round(convertToThb(totalFlightCost, tripCurrency, fxRate)).toLocaleString()} THB)
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleOpenAdd}
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer ml-auto"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>เพิ่มเที่ยวบินอีกไฟลต์</span>
            </button>
          </div>

          {/* Flights List */}
          {flights.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-[#222c42] bg-slate-50/50 dark:bg-[#151b2b]/50 space-y-2">
              <Plane className="h-9 w-9 text-blue-500 mx-auto opacity-80" />
              <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                ยังไม่มีตั๋วเครื่องบินในทริปนี้
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium">
                กรอกข้อมูลเที่ยวบิน (เช่น ขาไป / ขากลับ), เลขที่นั่ง, และเกท พร้อมบันทึกเป็นรายจ่ายอัตโนมัติ
              </p>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/25 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" /> เพิ่มเที่ยวบิน (เช่น ไฟลต์ขาไป)
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {flights.map((flight, idx) => {
                const hasExpense = Boolean(flight.expenseId);

                return (
                  <div
                    key={flight.id}
                    className="relative rounded-3xl bg-white dark:bg-[#111624] border border-slate-200/90 dark:border-[#222c42] shadow-xl overflow-hidden flex flex-col justify-between group"
                  >
                    {/* Notice Ribbon */}
                    <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/70 dark:border-amber-900/40 flex items-center justify-between text-[11px] font-bold text-amber-800 dark:text-amber-300">
                      <span className="flex items-center gap-1.5">
                        <span>✈️</span>
                        <span>เที่ยวบินที่ {idx + 1} • Gate {flight.gate || '-'}</span>
                      </span>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                        Seat {flight.seat || '-'}
                      </span>
                    </div>

                    {/* Ticket Header Ribbon */}
                    <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Plane className="h-4 w-4 text-white" />
                        <span className="text-xs font-black tracking-wider uppercase">{flight.airline}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-black">{flight.flightNo}</span>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(flight)}
                          className="p-1 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                          title="แก้ไขข้อมูลเที่ยวบิน"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(flight.id, flight.flightNo)}
                          className="p-1 rounded-lg bg-white/20 hover:bg-rose-500/80 text-white transition-colors cursor-pointer"
                          title="ลบเที่ยวบิน"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Main Flight Route Cities */}
                    <div className="p-4 sm:p-5 space-y-3.5 flex-1 flex flex-col justify-between">
                      <div className="flex justify-between items-center text-center">
                        <div>
                          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                            {flight.originCode}
                          </div>
                          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            {flight.originCity}
                          </div>
                        </div>

                        <div className="flex-1 px-3 flex flex-col items-center">
                          <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 mb-1">
                            {flight.departureDate || 'Direct'}
                          </span>
                          <div className="w-full flex items-center gap-1">
                            <div className="h-0.5 flex-1 bg-slate-200 dark:bg-slate-700" />
                            <Plane className="h-4 w-4 text-blue-600 dark:text-blue-400 rotate-90" />
                            <div className="h-0.5 flex-1 bg-slate-200 dark:bg-slate-700" />
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 mt-1">
                            Boarding {flight.boardingTime || '-'}
                          </span>
                        </div>

                        <div>
                          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                            {flight.destCode}
                          </div>
                          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            {flight.destCity}
                          </div>
                        </div>
                      </div>

                      {/* Perforated Divider Line */}
                      <div className="relative py-1 flex items-center">
                        <div className="absolute -left-6 sm:-left-7 w-5 h-5 rounded-full bg-slate-50 dark:bg-[#151b2b] border-r border-slate-200 dark:border-[#222c42]" />
                        <div className="w-full border-t-2 border-dashed border-slate-200 dark:border-[#222c42]" />
                        <div className="absolute -right-6 sm:-right-7 w-5 h-5 rounded-full bg-slate-50 dark:bg-[#151b2b] border-l border-slate-200 dark:border-[#222c42]" />
                      </div>

                      {/* Metadata Grid */}
                      <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#182033] border border-slate-200/70 dark:border-[#222c42]">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Terminal</span>
                          <span className="font-mono font-black text-slate-800 dark:text-white text-xs">{flight.terminal || '-'}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#182033] border border-slate-200/70 dark:border-[#222c42]">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Gate</span>
                          <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-xs">{flight.gate || '-'}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#182033] border border-slate-200/70 dark:border-[#222c42]">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Seat</span>
                          <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-xs">{flight.seat || '-'}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#182033] border border-slate-200/70 dark:border-[#222c42]">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Dep Time</span>
                          <span className="font-mono font-black text-slate-800 dark:text-white text-xs">{flight.departureTime || '-'}</span>
                        </div>
                      </div>

                      {/* Booking Reference No. if available */}
                      {flight.bookingRef && (
                        <div className="flex items-center justify-between gap-1 p-2 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 text-[11px]">
                          <div className="min-w-0 flex items-center gap-1 text-slate-700 dark:text-slate-300 font-mono truncate">
                            <BookmarkCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span className="truncate">Ref: {flight.bookingRef}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyRef(flight.id, flight.bookingRef!)}
                            className="px-2 py-0.5 rounded-lg bg-white dark:bg-[#151b2b] text-[10px] font-bold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shadow-2xs hover:bg-blue-50 transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                          >
                            {copiedId === flight.id ? (
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

                      {/* Simulated Barcode */}
                      <div className="pt-1 flex flex-col items-center justify-center opacity-85">
                        <div className="flex gap-1 h-8 w-full max-w-xs items-center justify-center bg-slate-900 dark:bg-white p-1.5 rounded-lg">
                          {Array.from({ length: 36 }).map((_, i) => (
                            <div
                              key={i}
                              className={`h-full ${i % 3 === 0 ? 'w-1 bg-white dark:bg-slate-900' : 'w-0.5 bg-transparent'}`}
                            />
                          ))}
                        </div>
                        <span className="text-[8px] font-mono text-slate-400 mt-1 tracking-widest">
                          ELECTRONIC BOARDING PASS
                        </span>
                      </div>

                      {/* Price & Payment Checklist Section */}
                      <div className="pt-2 border-t border-slate-100 dark:border-[#222c42] flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs gap-2">
                          <button
                            type="button"
                            onClick={() => handleTogglePayment(flight)}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                              flight.paymentStatus === 'unpaid'
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                            }`}
                            title={flight.paymentStatus === 'unpaid' ? 'คลิกเพื่อเปลี่ยนเป็นจ่ายแล้ว' : 'คลิกเพื่อเปลี่ยนเป็นจ่ายทีหลัง'}
                          >
                            {flight.paymentStatus === 'unpaid' ? (
                              <>
                                <Clock className="h-3 w-3 text-amber-500" />
                                <span>⏳ ยังไม่จ่าย / จ่ายทีหลัง</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                <span>✅ จ่ายเงินแล้ว</span>
                              </>
                            )}
                          </button>

                          <div className="text-right">
                            <span className="font-mono font-black text-slate-900 dark:text-white">
                              {flight.price ? `${flight.price.toLocaleString()} ${flight.currency || tripCurrency}` : 'ไม่ระบุราคา'}
                            </span>
                            {flight.price && (flight.currency || tripCurrency) !== 'THB' && (
                              <span className="block text-[9px] text-slate-400 font-mono">
                                ≈ ฿{Math.round(convertToThb(flight.price, flight.currency || tripCurrency, fxRate)).toLocaleString()} THB
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons: Online Check-in & Expense */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <a
                            href={`https://www.google.com/search?q=${encodeURIComponent((flight.airline || '') + ' ' + (flight.flightNo || '') + ' check in online')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] hover:border-blue-400 text-slate-700 dark:text-slate-300 hover:text-blue-600 text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1 shadow-2xs"
                          >
                            <Plane className="h-3 w-3 text-blue-500" />
                            <span>เช็คอินออนไลน์</span>
                            <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                          </a>

                          {hasExpense ? (
                            <span className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" /> บันทึกแล้ว
                            </span>
                          ) : flight.price && flight.price > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleCreateExpenseForFlight(flight)}
                              className="py-1.5 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-xs hover:scale-102 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                              title="บันทึกราคาตั๋วบินนี้ลงในแท็บรายจ่าย"
                            >
                              <Receipt className="h-3 w-3" />
                              <span>ลงรายจ่าย</span>
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== ADD / EDIT FLIGHT MODAL ==================== */}
      {showModal && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-md bg-black/80 p-3 sm:p-4 overscroll-contain overflow-x-hidden animate-in fade-in duration-200 select-none" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl sm:rounded-3xl bg-white dark:bg-[#151b2b] shadow-2xl border border-slate-200/90 dark:border-[#222c42] glow-blue max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ease-out">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 pb-3 flex justify-between items-center border-b border-slate-100 dark:border-[#222c42] shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <Plane className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    {editingFlight ? 'แก้ไขข้อมูลเที่ยวบิน ✈️' : 'เพิ่มเที่ยวบินใหม่ ✈️'}
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    บันทึกตั๋วบิน เลขไฟลต์ เกท ที่นั่ง และเชื่อมต่อกับรายจ่ายอัตโนมัติ
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1c2438] cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form id="flight-form" onSubmit={handleSaveForm} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto overflow-x-hidden touch-pan-y overscroll-contain flex-1 custom-scrollbar pb-6 min-h-0">
                {/* Airline & Flight Number */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      สายการบิน *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น Thai Airways, AirAsia"
                      value={formAirline}
                      onChange={(e) => setFormAirline(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      เลขไฟลต์ (Flight No) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น TG682, MM028"
                      value={formFlightNo}
                      onChange={(e) => setFormFlightNo(e.target.value.toUpperCase())}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Origin: Code & City */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      สนามบินต้นทาง (IATA Code) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น BKK, DMK"
                      value={formOriginCode}
                      onChange={(e) => setFormOriginCode(e.target.value.toUpperCase())}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      เมืองต้นทาง
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น Bangkok"
                      value={formOriginCity}
                      onChange={(e) => setFormOriginCity(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Destination: Code & City */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      สนามบินปลายทาง (IATA Code) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น KIX, HND, NRT"
                      value={formDestCode}
                      onChange={(e) => setFormDestCode(e.target.value.toUpperCase())}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      เมืองปลายทาง
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น Osaka, Tokyo"
                      value={formDestCity}
                      onChange={(e) => setFormDestCity(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Date & Times */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      วันเดินทาง (Date)
                    </label>
                    <input
                      type="date"
                      value={formDepartureDate}
                      onChange={(e) => setFormDepartureDate(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      เวลาขึ้นบิน (Departure)
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น 22:45"
                      value={formDepartureTime}
                      onChange={(e) => setFormDepartureTime(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      เวลา Boarding
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น 22:05"
                      value={formBoardingTime}
                      onChange={(e) => setFormBoardingTime(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Terminal, Gate, Seat */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Terminal
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น 1, 2, Inter"
                      value={formTerminal}
                      onChange={(e) => setFormTerminal(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Gate
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น D4, A12"
                      value={formGate}
                      onChange={(e) => setFormGate(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      ที่นั่ง (Seat)
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น 24K, 15A"
                      value={formSeat}
                      onChange={(e) => setFormSeat(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Booking Reference & Passenger Name */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      เลขที่การจอง (Booking Ref / PNR)
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น 6-digit PNR / Trip.com ref"
                      value={formBookingRef}
                      onChange={(e) => setFormBookingRef(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      ชื่อผู้โดยสาร (Passenger Name)
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น TRAVELER"
                      value={formPassengerName}
                      onChange={(e) => setFormPassengerName(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Payment Checklist: Paid vs Pay Later */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    สถานะการชำระเงิน (Payment Checklist)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFormPaymentStatus('paid');
                        if (!editingFlight) setFormAutoCreateExpense(true);
                      }}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        formPaymentStatus === 'paid'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs ring-1 ring-emerald-500'
                          : 'bg-slate-50 dark:bg-[#1c2438] border-slate-200 dark:border-[#222c42] text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span>✅ จ่ายเงินแล้ว (Paid)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormPaymentStatus('unpaid');
                        if (!editingFlight) setFormAutoCreateExpense(false);
                      }}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        formPaymentStatus === 'unpaid'
                          ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-700 dark:text-amber-300 shadow-xs ring-1 ring-amber-500'
                          : 'bg-slate-50 dark:bg-[#1c2438] border-slate-200 dark:border-[#222c42] text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      <Clock className="h-4 w-4 text-amber-500" />
                      <span>⏳ จ่ายทีหลัง / ยังไม่ตัดบัตร</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    กรณีจองผ่านเอเจนต์ที่ยังไม่ตัดเงิน หรือจองรอชำระภายหลัง
                  </p>
                </div>

                {/* Price & Currency */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      ราคาตั๋วเครื่องบิน (ยอดรวม)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="เช่น 18500"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                    {formPrice && parseFloat(formPrice) > 0 && formCurrency !== 'THB' && (
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono mt-0.5 block font-bold">
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
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    >
                      <option value="THB">THB (฿)</option>
                      <option value="JPY">JPY (¥)</option>
                      <option value="USD">USD ($)</option>
                      <option value="CNY">CNY (元)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="KRW">KRW (₩)</option>
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    หมายเหตุ (Notes)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="เช่น น้ำหนักกระเป๋าโหลด 20kg, รวมอาหารบนเครื่อง"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>

                {/* Auto Create Expense Checkbox (Only for new flights) */}
                {!editingFlight && (
                  <div className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="autoFlightExpense"
                      checked={formAutoCreateExpense}
                      onChange={(e) => setFormAutoCreateExpense(e.target.checked)}
                      className="mt-0.5 h-4 w-4 text-blue-600 rounded border-slate-300 dark:border-[#222c42] cursor-pointer"
                    />
                    <label htmlFor="autoFlightExpense" className="text-xs text-slate-800 dark:text-slate-200 cursor-pointer">
                      <span className="font-bold block">⚡ บันทึกเป็นรายจ่ายลงในแท็บ &ldquo;รายการ&rdquo; ทันที</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        ระบบจะสร้างรายการค่าตั๋วเครื่องบินในหมวด ✈️ เดินทาง ให้อัตโนมัติ ไม่ต้องกรอกซ้ำ
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Submit Footer */}
              <div className="p-3.5 sm:p-4 px-4 sm:px-6 border-t border-slate-100 dark:border-[#222c42] bg-white/95 dark:bg-[#151b2b]/95 backdrop-blur-md shrink-0 flex items-center justify-end gap-2.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 min-h-[42px] rounded-xl border border-slate-200 dark:border-[#222c42] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1c2438] cursor-pointer transition-colors touch-manipulation"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  form="flight-form"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 min-h-[42px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/25 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 touch-manipulation"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <span>{editingFlight ? 'บันทึกการแก้ไข' : 'บันทึกเที่ยวบิน'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default FlightBoardingPassCard;
