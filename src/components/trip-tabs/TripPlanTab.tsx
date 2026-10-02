'use client';

import React, { useMemo } from 'react';
import { 
  Coins, ChevronRight, ChevronUp, ChevronDown, 
  FileText, Upload, Download, Plus, Navigation, MapPin 
} from 'lucide-react';
import { getAccommodations, getGoogleMapsUrl } from '@/lib/accommodations';
import WeatherWidget from '@/components/WeatherWidget';
import RouteVisualizer from '@/components/RouteVisualizer';
import InteractiveTripMap from '@/components/InteractiveTripMap';
import { ItineraryStopCard } from '@/components/trip-detail/ItineraryStopCard';
import { TransitConnector } from '@/components/trip-detail/TransitConnector';
import { FlightBoardingPassCard } from '@/components/trip-detail/FlightBoardingPassCard';
import { AccommodationsCard, formatStayDateDisplay } from '@/components/trip-detail/AccommodationsCard';
import { TripHeroCover } from '@/components/trip-detail/TripHeroCover';
import AnimatedNumber from '@/components/AnimatedNumber';
import { convertCurrency, convertToThb, formatExchangeRateDisplay } from '@/lib/currency';

interface TripPlanTabProps {
  trip: any;
  tripBaseCurrency: string;
  fxRate: number;
  heroDisplayData: {
    title: string;
    spent: number;
    targetBudget: number;
    remaining: number;
    isOver: boolean;
    diff: number;
    progress: number;
    budgetLabel: string;
  };
  itinerary: any[];
  filteredItinerary: any[];
  availableDays: string[];
  selectedDayFilter: string;
  setSelectedDayFilter: (day: string) => void;
  itineraryViewMode: 'list' | 'map';
  setItineraryViewMode: (mode: 'list' | 'map') => void;
  showWeatherSection: boolean;
  setShowWeatherSection: (show: boolean) => void;
  setShowTravelHubModal: (show: boolean) => void;
  setShowPrintableModal: (show: boolean) => void;
  canImportExcel: boolean;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  exportToExcel: () => void;
  canEditPlan: boolean;
  handleOpenAddActivity: (item?: any, defaultDay?: string) => void;
  reordering: boolean;
  expandedPlanB: Record<string, boolean>;
  setExpandedPlanB: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  handleMoveActivity: (idx: number, direction: 'up' | 'down') => void;
  handleOpenEditActivity: (item: any) => void;
  handleDeleteActivity: (id: string) => void;
  onSwitchTab: (tab: 'plan' | 'expenses' | 'analytics' | 'members') => void;
  members?: any[];
  currentUser?: any;
  onRefreshTrip?: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function TripPlanTab({
  trip,
  tripBaseCurrency,
  fxRate,
  heroDisplayData,
  itinerary,
  filteredItinerary,
  availableDays,
  selectedDayFilter,
  setSelectedDayFilter,
  itineraryViewMode,
  setItineraryViewMode,
  showWeatherSection,
  setShowWeatherSection,
  setShowTravelHubModal,
  setShowPrintableModal,
  canImportExcel,
  handleFileUpload,
  exportToExcel,
  canEditPlan,
  handleOpenAddActivity,
  reordering,
  expandedPlanB,
  setExpandedPlanB,
  handleMoveActivity,
  handleOpenEditActivity,
  handleDeleteActivity,
  onSwitchTab,
  members = [],
  currentUser,
  onRefreshTrip,
  onShowToast,
}: TripPlanTabProps) {
  // Check if any accommodation is for this day
  const stays = useMemo(() => (trip?.id ? getAccommodations(trip.id) : []), [trip?.id]);
  const activeStayForSelectedDay = useMemo(() => {
    if (selectedDayFilter === 'all' || stays.length === 0) return null;
    const filterLower = selectedDayFilter.toLowerCase();
    return (
      stays.find((s) => {
        const inStr = (s.checkInDate || '').toLowerCase();
        const outStr = (s.checkOutDate || '').toLowerCase();
        const inFormatted = formatStayDateDisplay(s.checkInDate).toLowerCase();
        const outFormatted = formatStayDateDisplay(s.checkOutDate).toLowerCase();
        return (
          inStr.includes(filterLower) ||
          outStr.includes(filterLower) ||
          filterLower.includes(inStr) ||
          inFormatted.includes(filterLower) ||
          outFormatted.includes(filterLower) ||
          filterLower.includes(inFormatted) ||
          (s.notes && s.notes.toLowerCase().includes(filterLower))
        );
      }) || null
    );
  }, [selectedDayFilter, stays]);

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* 1. Trip Hero Cover Banner with Countdown & Cat AI Companion Greeting */}
      <TripHeroCover 
        trip={trip} 
        itineraryCount={itinerary.length} 
        totalSpent={heroDisplayData.spent} 
        currency={tripBaseCurrency} 
      />

      {/* 2. Apple Wallet Style Flight Boarding Pass */}
      <FlightBoardingPassCard 
        tripId={trip?.id || ''} 
        defaultDestination={trip?.destination || 'Tokyo'} 
      />

      {/* 3. Accommodations / Hotels Card */}
      <AccommodationsCard
        tripId={trip?.id || ''}
        tripCurrency={tripBaseCurrency}
        fxRate={fxRate}
        members={members}
        currentUser={currentUser}
        onExpenseCreated={onRefreshTrip}
        onShowToast={onShowToast}
      />

      {/* Quick Status Bar: FX Rate + Weather Toggle + Travel Hub */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-[#151b2b] border border-slate-200/90 dark:border-[#222c42] card-elevation">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/70 dark:border-blue-900/50 shadow-2xs">
            {tripBaseCurrency} Workspace
          </span>
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#1c2438] px-2.5 py-0.5 rounded-full border border-slate-200/70 dark:border-[#222c42] font-mono">
            {formatExchangeRateDisplay(tripBaseCurrency, fxRate)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowWeatherSection(!showWeatherSection)}
            className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
              showWeatherSection 
                ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-900/50' 
                : 'bg-slate-100 dark:bg-[#1c2438] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#222c42]'
            }`}
          >
            <span>🌤️ เส้นทาง & อากาศ</span>
            {showWeatherSection ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          <button
            type="button"
            onClick={() => setShowTravelHubModal(true)}
            className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-xl shadow-md shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <span>🧰 Travel Hub</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        </div>
      </div>

      {/* Aesthetic 3-Block Travel Budget Overview Card (Trip.com style metrics) */}
      <div 
        onClick={() => onSwitchTab('expenses')}
        className="p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 dark:border-[#222c42] bg-white dark:bg-[#151b2b] card-elevation space-y-3 cursor-pointer hover:border-blue-400/50 dark:hover:border-blue-500/40 transition-all group"
      >
        {/* Card Header */}
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white">
            <div className="p-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Coins className="h-4 w-4" />
            </div>
            <span>สรุปงบประมาณทริป</span>
            <span className="text-[10px] font-semibold text-slate-400">({heroDisplayData.title})</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
            <span>ไปหน้ารายจ่าย</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* 3 Summary Blocks */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {/* Block 1: Used / จ่ายแล้ว (Travel Blue) */}
          <div className="rounded-2xl p-2.5 sm:p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 flex flex-col justify-between">
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-black text-blue-600 dark:text-blue-400">
              <span>💸</span>
              <span>ใช้ไปแล้ว</span>
            </div>
            <div className="mt-1">
              <div className="text-sm sm:text-base md:text-lg font-black text-blue-700 dark:text-blue-300 leading-tight">
                <AnimatedNumber value={heroDisplayData.spent} />
              </div>
              {tripBaseCurrency !== 'THB' ? (
                <div className="text-[9px] sm:text-[10px] font-semibold text-blue-600/80 dark:text-blue-300/70 truncate">
                  ≈ ฿<AnimatedNumber value={Math.round(convertToThb(heroDisplayData.spent, tripBaseCurrency, fxRate))} />
                </div>
              ) : (
                <div className="text-[9px] sm:text-[10px] font-semibold text-blue-600/80 dark:text-blue-300/70 truncate">
                  {tripBaseCurrency}
                </div>
              )}
            </div>
          </div>

          {/* Block 2: Target / ตั้งเป้า (Emerald) */}
          <div className="rounded-2xl p-2.5 sm:p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-900/50 flex flex-col justify-between">
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-black text-emerald-600 dark:text-emerald-400">
              <span>🎯</span>
              <span>ตั้งเป้าไว้</span>
            </div>
            <div className="mt-1">
              <div className="text-sm sm:text-base md:text-lg font-black text-emerald-700 dark:text-emerald-300 leading-tight">
                {heroDisplayData.targetBudget > 0 ? (
                  <AnimatedNumber value={heroDisplayData.targetBudget} />
                ) : (
                  '-'
                )}
              </div>
              {heroDisplayData.targetBudget > 0 ? (
                tripBaseCurrency !== 'THB' ? (
                  <div className="text-[9px] sm:text-[10px] font-semibold text-emerald-600/80 dark:text-emerald-300/70 truncate">
                    ≈ ฿<AnimatedNumber value={Math.round(convertToThb(heroDisplayData.targetBudget, tripBaseCurrency, fxRate))} />
                  </div>
                ) : (
                  <div className="text-[9px] sm:text-[10px] font-semibold text-emerald-600/80 dark:text-emerald-300/70 truncate">
                    {tripBaseCurrency}
                  </div>
                )
              ) : (
                <div className="text-[9px] sm:text-[10px] font-semibold text-emerald-600/80 dark:text-emerald-300/70 truncate">
                  ยังไม่ระบุงบ
                </div>
              )}
            </div>
          </div>

          {/* Block 3: Remaining / คงเหลือ (Amber/Rose) */}
          <div className={`rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between ${
            heroDisplayData.isOver 
              ? 'bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-900/50' 
              : 'bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-900/50'
          }`}>
            <div className={`flex items-center gap-1 text-[10px] sm:text-[11px] font-black ${
              heroDisplayData.isOver ? 'text-rose-600 dark:text-rose-400' : 'text-amber-700 dark:text-amber-300'
            }`}>
              <span>{heroDisplayData.isOver ? '⚠️' : '💰'}</span>
              <span>{heroDisplayData.isOver ? 'เกินงบ' : 'คงเหลือ'}</span>
            </div>
            <div className="mt-1">
              <div className={`text-sm sm:text-base md:text-lg font-black leading-tight ${
                heroDisplayData.isOver ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300'
              }`}>
                <AnimatedNumber value={heroDisplayData.isOver ? heroDisplayData.diff : heroDisplayData.remaining} />
              </div>
              {tripBaseCurrency !== 'THB' ? (
                <div className={`text-[9px] sm:text-[10px] font-semibold truncate ${
                  heroDisplayData.isOver ? 'text-rose-600/80 dark:text-rose-300/70' : 'text-amber-600/80 dark:text-amber-300/70'
                }`}>
                  ≈ ฿<AnimatedNumber value={Math.round(convertToThb((heroDisplayData.isOver ? heroDisplayData.diff : heroDisplayData.remaining), tripBaseCurrency, fxRate))} />
                </div>
              ) : (
                <div className={`text-[9px] sm:text-[10px] font-semibold truncate ${
                  heroDisplayData.isOver ? 'text-rose-600/80 dark:text-rose-300/70' : 'text-amber-600/80 dark:text-amber-300/70'
                }`}>
                  {tripBaseCurrency}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Accordion Weather & Route Visualizer Section */}
      {showWeatherSection && (
        <div className="rounded-3xl border border-slate-200/90 dark:border-[#222c42] bg-white dark:bg-[#151b2b] card-elevation p-3.5 sm:p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <WeatherWidget defaultCity={itinerary[0]?.city || 'Osaka'} />
          <RouteVisualizer dayLabel="ทริปทั้งหมด" items={itinerary} />
        </div>
      )}

      {/* Itinerary Filter, View Mode Toggle & Action Buttons (Trip.com Horizontal Chips) */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-[#151b2b] border border-slate-200/90 dark:border-[#222c42] card-elevation">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* View Mode Toggle: List vs Map */}
          <div className="inline-flex p-0.5 rounded-xl bg-slate-100 dark:bg-[#1c2438] border border-slate-200/70 dark:border-[#222c42]">
            <button
              onClick={() => setItineraryViewMode('list')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                itineraryViewMode === 'list' 
                  ? 'bg-white dark:bg-[#151b2b] text-blue-600 dark:text-blue-400 shadow-2xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              📋 รายการ
            </button>
            <button
              onClick={() => setItineraryViewMode('map')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                itineraryViewMode === 'map' 
                  ? 'bg-white dark:bg-[#151b2b] text-blue-600 dark:text-blue-400 shadow-2xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              🗺️ แผนที่
            </button>
          </div>

          {/* Day Filter Pills */}
          {availableDays.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 custom-scrollbar">
              <button
                onClick={() => setSelectedDayFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  selectedDayFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-[#1c2438] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#222c42]'
                }`}
              >
                ทุกวัน ({itinerary.length})
              </button>
              {availableDays.map((day) => (
                <button
                  key={day}
                  onClick={() => setSelectedDayFilter(day)}
                  className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    selectedDayFilter === day
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-[#1c2438] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#222c42]'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setShowPrintableModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-white dark:bg-[#1c2438] text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-blue-400 transition-all cursor-pointer shadow-2xs"
            title="พิมพ์ / เซฟเป็น PDF"
          >
            <FileText className="h-3.5 w-3.5 text-blue-500" />
            <span className="hidden sm:inline">พิมพ์ PDF</span>
          </button>

          {canImportExcel && (
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-bold hover:border-blue-400 cursor-pointer transition-all shadow-2xs">
              <Upload className="h-3.5 w-3.5 text-blue-500" />
              <span className="hidden sm:inline">Import Excel</span>
              <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
            </label>
          )}

          <button
            onClick={exportToExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-white dark:bg-[#1c2438] text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-emerald-500 transition-all cursor-pointer shadow-2xs"
            title="ดาวน์โหลดไฟล์ Excel"
          >
            <Download className="h-3.5 w-3.5 text-emerald-500" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>

          {canEditPlan && (
            <button
              onClick={() => handleOpenAddActivity(null, selectedDayFilter !== 'all' ? selectedDayFilter : undefined)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>เพิ่มกิจกรรม</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Stay Banner for selected day if applicable */}
      {activeStayForSelectedDay && (
        <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl">🏨</span>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block uppercase">
                ที่พักของวันนี้ ({selectedDayFilter})
              </span>
              <span className="font-black text-slate-900 dark:text-white truncate block">
                {activeStayForSelectedDay.name}
                {activeStayForSelectedDay.city ? ` • ${activeStayForSelectedDay.city}` : ''}
              </span>
            </div>
          </div>
          <a
            href={getGoogleMapsUrl(activeStayForSelectedDay)}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#151b2b] text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs hover:bg-emerald-50 flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <MapPin className="h-3 w-3 text-rose-500" />
            <span>เปิดแผนที่</span>
          </a>
        </div>
      )}

      {itineraryViewMode === 'map' ? (
        <InteractiveTripMap itinerary={itinerary} selectedDay={selectedDayFilter} />
      ) : (
        filteredItinerary.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-[#222c42] rounded-3xl p-6 bg-white dark:bg-[#151b2b]">
            <Navigation className="h-10 w-10 text-blue-500 mx-auto mb-2 animate-float-slow" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">ยังไม่มีกิจกรรมในแผนเที่ยวนี้</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
              กดปุ่มเพิ่มกิจกรรม หรือนำเข้าจากไฟล์ Excel ได้ทันที
            </p>
            {canEditPlan && (
              <button
                onClick={() => handleOpenAddActivity()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:scale-105 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" /> เพิ่มกิจกรรมแรก
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItinerary.map((item, idx) => {
              const nextItem = filteredItinerary[idx + 1];
              return (
                <React.Fragment key={item.id || idx}>
                  <ItineraryStopCard
                    item={item}
                    idx={idx}
                    totalItems={itinerary.length}
                    canEditPlan={canEditPlan}
                    reordering={reordering}
                    isPlanBOpen={expandedPlanB[item.id] || false}
                    onTogglePlanB={(id) => setExpandedPlanB((prev) => ({ ...prev, [id]: !prev[id] }))}
                    onMoveActivity={handleMoveActivity}
                    onOpenEditActivity={handleOpenEditActivity}
                    onDeleteActivity={handleDeleteActivity}
                  />
                  {nextItem && (
                    <TransitConnector
                      fromPlace={item.main_place}
                      toPlace={nextItem.main_place}
                      fromCity={item.city}
                      toCity={nextItem.city}
                      isSameDay={item.date_label === nextItem.date_label}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

export default TripPlanTab;
