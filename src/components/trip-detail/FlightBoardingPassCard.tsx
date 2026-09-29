// src/components/trip-detail/FlightBoardingPassCard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Plane, QrCode, Clock, MapPin, ChevronDown, ChevronUp, Edit3, Check, X } from 'lucide-react';

interface FlightBoardingPassCardProps {
  tripId: string;
  defaultDestination?: string;
}

interface FlightData {
  airline: string;
  flightNo: string;
  originCode: string;
  originCity: string;
  destCode: string;
  destCity: string;
  departureTime: string;
  boardingTime: string;
  terminal: string;
  gate: string;
  seat: string;
  passengerName: string;
}

const DEFAULT_FLIGHT: FlightData = {
  airline: 'Thai Airways',
  flightNo: 'TG682',
  originCode: 'BKK',
  originCity: 'Bangkok',
  destCode: 'HND',
  destCity: 'Tokyo Haneda',
  departureTime: '22:45',
  boardingTime: '22:05',
  terminal: '1',
  gate: 'D4',
  seat: '24K',
  passengerName: 'TRAVELER',
};

export function FlightBoardingPassCard({ tripId, defaultDestination }: FlightBoardingPassCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [flight, setFlight] = useState<FlightData>(DEFAULT_FLIGHT);
  const [editForm, setEditForm] = useState<FlightData>(DEFAULT_FLIGHT);

  // Load from localStorage for persistent flight storage per trip
  useEffect(() => {
    if (typeof window !== 'undefined' && tripId) {
      const saved = localStorage.getItem(`flight_pass_${tripId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setFlight(parsed);
          setEditForm(parsed);
        } catch (e) {
          // ignore error
        }
      }
    }
  }, [tripId]);

  const handleSave = () => {
    setFlight(editForm);
    if (typeof window !== 'undefined' && tripId) {
      localStorage.setItem(`flight_pass_${tripId}`, JSON.stringify(editForm));
    }
    setIsEditing(false);
  };

  return (
    <div className="rounded-3xl border border-slate-200/90 dark:border-[#262c3d] bg-white dark:bg-[#171a23] shadow-sm overflow-hidden transition-all">
      {/* Collapsed Header / Accordion trigger */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1e2230]/70 transition-colors"
      >
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#c25872] to-[#8b5cf6] dark:from-[#d47087] dark:to-[#7c3aed] flex items-center justify-center text-white shadow-xs shrink-0">
            <Plane className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                ตั๋วเครื่องบิน & Boarding Pass ✈️
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.2 rounded-full bg-rose-50 dark:bg-[#d47087]/15 text-[#c25872] dark:text-[#d47087] border border-rose-200 dark:border-[#d47087]/30">
                {flight.airline} • {flight.flightNo}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {flight.originCode} ➔ {flight.destCode} | Gate {flight.gate} • ที่นั่ง {flight.seat}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 hidden sm:inline">
            {isOpen ? 'ซ่อน' : 'เปิดดูตั๋ว'}
          </span>
          <div className="p-1.5 rounded-xl bg-white dark:bg-[#1f2433] text-slate-400 dark:text-slate-300 border border-slate-200/80 dark:border-[#262c3d]">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </div>

      {/* Expanded Apple Wallet Boarding Pass Card */}
      {isOpen && (
        <div className="p-4 sm:p-6 pt-0 border-t border-slate-100 dark:border-[#262c3d] space-y-4 animate-in slide-in-from-top-2 duration-200">
          {!isEditing ? (
            <div className="relative rounded-3xl bg-white dark:bg-[#13161f] border border-slate-200/90 dark:border-[#262c3d] shadow-xl overflow-hidden mt-3 max-w-xl mx-auto">
              {/* Ticket Top Ribbon */}
              <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-[#1c212e] dark:via-[#222838] dark:to-[#1c212e] border-b border-slate-700/40 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Plane className="h-4 w-4 text-[#d47087]" />
                  <span className="text-xs font-black tracking-wider uppercase">{flight.airline}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-black">{flight.flightNo}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(true);
                    }}
                    className="p-1 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                    title="แก้ไขข้อมูลเที่ยวบิน"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Main Flight Route Cities */}
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-center text-center">
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                      {flight.originCode}
                    </div>
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      {flight.originCity}
                    </div>
                  </div>

                  <div className="flex-1 px-4 flex flex-col items-center">
                    <span className="text-[10px] font-black text-[#e06b88] mb-1">Direct Flight</span>
                    <div className="w-full flex items-center gap-1">
                      <div className="h-0.5 flex-1 bg-slate-300 dark:bg-slate-700" />
                      <Plane className="h-4 w-4 text-[#e06b88] rotate-90" />
                      <div className="h-0.5 flex-1 bg-slate-300 dark:bg-slate-700" />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 mt-1">Boarding {flight.boardingTime}</span>
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
                <div className="relative py-2 flex items-center">
                  <div className="absolute -left-8 w-6 h-6 rounded-full bg-slate-50 dark:bg-[#171a23] border-r border-slate-200 dark:border-[#262c3d]" />
                  <div className="w-full border-t-2 border-dashed border-slate-200 dark:border-[#262c3d]" />
                  <div className="absolute -right-8 w-6 h-6 rounded-full bg-slate-50 dark:bg-[#171a23] border-l border-slate-200 dark:border-[#262c3d]" />
                </div>

                {/* Flight Metadata Grid */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#1a1e2b] border border-slate-200/70 dark:border-[#262c3d]">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Terminal</span>
                    <span className="font-mono font-black text-slate-800 dark:text-white text-sm">{flight.terminal}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#1a1e2b] border border-slate-200/70 dark:border-[#262c3d]">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Gate</span>
                    <span className="font-mono font-black text-[#c25872] dark:text-[#d47087] text-sm">{flight.gate}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#1a1e2b] border border-slate-200/70 dark:border-[#262c3d]">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Seat</span>
                    <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm">{flight.seat}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#1a1e2b] border border-slate-200/70 dark:border-[#262c3d]">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Dep Time</span>
                    <span className="font-mono font-black text-slate-800 dark:text-white text-sm">{flight.departureTime}</span>
                  </div>
                </div>

                {/* Simulated Barcode */}
                <div className="pt-2 flex flex-col items-center justify-center opacity-85">
                  <div className="flex gap-1 h-10 w-full max-w-xs items-center justify-center bg-slate-900 dark:bg-white p-2 rounded-lg">
                    {Array.from({ length: 42 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-full ${i % 3 === 0 ? 'w-1 bg-white dark:bg-slate-900' : 'w-0.5 bg-transparent'}`}
                      />
                    ))}
                  </div>
                  <span className="text-[9px] font-mono text-slate-400 mt-1 tracking-widest">
                    BOARDING PASS ELECTRONIC TICKET
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Edit Flight Form */
            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#171a23] border border-slate-200 dark:border-[#262c3d] space-y-3 max-w-xl mx-auto shadow-lg">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-[#262c3d]">
                <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  แก้ไขข้อมูลเที่ยวบิน ✏️
                </h4>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">สายการบิน</label>
                  <input
                    type="text"
                    value={editForm.airline}
                    onChange={(e) => setEditForm({ ...editForm, airline: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-[#323850] bg-slate-50 dark:bg-[#222638] font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">เลขไฟลต์ (Flight No)</label>
                  <input
                    type="text"
                    value={editForm.flightNo}
                    onChange={(e) => setEditForm({ ...editForm, flightNo: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-[#323850] bg-slate-50 dark:bg-[#222638] font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">สนามบินต้นทาง (Code)</label>
                  <input
                    type="text"
                    value={editForm.originCode}
                    onChange={(e) => setEditForm({ ...editForm, originCode: e.target.value.toUpperCase() })}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-[#323850] bg-slate-50 dark:bg-[#222638] font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">สนามบินปลายทาง (Code)</label>
                  <input
                    type="text"
                    value={editForm.destCode}
                    onChange={(e) => setEditForm({ ...editForm, destCode: e.target.value.toUpperCase() })}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-[#323850] bg-slate-50 dark:bg-[#222638] font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Terminal</label>
                  <input
                    type="text"
                    value={editForm.terminal}
                    onChange={(e) => setEditForm({ ...editForm, terminal: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-[#323850] bg-slate-50 dark:bg-[#222638] font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Gate</label>
                  <input
                    type="text"
                    value={editForm.gate}
                    onChange={(e) => setEditForm({ ...editForm, gate: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-[#323850] bg-slate-50 dark:bg-[#222638] font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">ที่นั่ง (Seat)</label>
                  <input
                    type="text"
                    value={editForm.seat}
                    onChange={(e) => setEditForm({ ...editForm, seat: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-[#323850] bg-slate-50 dark:bg-[#222638] font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">เวลา Boarding</label>
                  <input
                    type="text"
                    value={editForm.boardingTime}
                    onChange={(e) => setEditForm({ ...editForm, boardingTime: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-[#323850] bg-slate-50 dark:bg-[#222638] font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-[#323850] text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex-1 py-2 rounded-xl bg-[#e06b88] hover:bg-[#d25875] text-white text-xs font-black shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" /> บันทึกตั๋วบิน
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FlightBoardingPassCard;
