'use client';

import React from 'react';
import { 
  Coins, ChevronRight, ChevronUp, ChevronDown, 
  FileText, Upload, Download, Plus, Navigation 
} from 'lucide-react';
import WeatherWidget from '@/components/WeatherWidget';
import RouteVisualizer from '@/components/RouteVisualizer';
import InteractiveTripMap from '@/components/InteractiveTripMap';
import { ItineraryStopCard } from '@/components/trip-detail/ItineraryStopCard';
import AnimatedNumber from '@/components/AnimatedNumber';
import { convertCurrency, convertToThb } from '@/lib/currency';

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
}: TripPlanTabProps) {
  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* Quick Status Bar: FX Rate + Weather Toggle + Travel Hub */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 sm:p-3 rounded-2xl bg-white/95 dark:bg-[#222638]/95 border border-rose-100/80 dark:border-[#323850]/80 card-elevation">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-50 text-[#e06b88] dark:bg-[#e06b88]/20 dark:text-[#f7a1b5] border border-rose-200/80 dark:border-[#e06b88]/35 shadow-2xs">
            {tripBaseCurrency} Workspace
          </span>
          <span className="text-[10px] sm:text-[11px] font-bold text-[#e06b88] dark:text-[#f7a1b5] bg-rose-50 dark:bg-[#e06b88]/20 px-2 py-0.5 rounded-full border border-rose-200/80 dark:border-[#e06b88]/35 shadow-2xs">
            {tripBaseCurrency === 'CNY'
              ? `1 CNY ≈ ${convertCurrency(1, 'CNY', 'THB', fxRate).toFixed(2)} THB`
              : tripBaseCurrency === 'USD'
              ? `1 USD ≈ ${convertCurrency(1, 'USD', 'THB', fxRate).toFixed(2)} THB`
              : `100 JPY = ${(fxRate * 100).toFixed(2)} THB`}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowWeatherSection(!showWeatherSection)}
            className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
              showWeatherSection 
                ? 'bg-[#e06b88] text-white border-[#e06b88] shadow-xs' 
                : 'bg-slate-100 dark:bg-[#2a2f45] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#323850] hover:border-[#e06b88]/50'
            }`}
          >
            <span>🌤️ เส้นทาง & อากาศ</span>
            {showWeatherSection ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          <button
            type="button"
            onClick={() => setShowTravelHubModal(true)}
            className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black text-white bg-[#e06b88] hover:bg-[#d25875] px-3 py-1.5 rounded-xl shadow-md shadow-[#e06b88]/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <span>🧰 Travel Hub</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        </div>
      </div>

      {/* Aesthetic 3-Block Pastel Budget Overview Card (Click to jump to Expenses Tab) */}
      <div 
        onClick={() => onSwitchTab('expenses')}
        className="p-3 sm:p-3.5 rounded-3xl border border-rose-100/80 dark:border-[#323850]/80 bg-white/95 dark:bg-[#222638]/95 card-elevation space-y-2.5 cursor-pointer hover:border-[#e06b88]/50 dark:hover:border-slate-600 transition-all group"
      >
        {/* Card Header */}
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-200">
            <Coins className="h-4 w-4 text-[#e06b88]" />
            <span>สรุปงบประมาณทริป</span>
            <span className="text-[10px] font-semibold text-slate-400">({heroDisplayData.title})</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-black text-[#e06b88] dark:text-[#f7a1b5] group-hover:translate-x-0.5 transition-transform">
            <span>ไปหน้ารายจ่าย</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* 3 Pastel Summary Blocks with Animated Counters */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {/* Block 1: Used / จ่ายแล้ว */}
          <div className="rounded-2xl p-2.5 sm:p-3 bg-rose-50/90 dark:bg-[#e06b88]/15 border border-rose-200/70 dark:border-[#e06b88]/30 flex flex-col justify-between">
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-black text-[#e06b88] dark:text-[#f7a1b5]">
              <span>💸</span>
              <span>ใช้ไปแล้ว</span>
            </div>
            <div className="mt-1">
              <div className="text-sm sm:text-base md:text-lg font-black text-[#e06b88] dark:text-[#f7a1b5] leading-tight">
                <AnimatedNumber value={heroDisplayData.spent} />
              </div>
              {tripBaseCurrency !== 'THB' ? (
                <div className="text-[9px] sm:text-[10px] font-semibold text-[#e06b88]/80 dark:text-[#f7a1b5]/70 truncate">
                  ≈ ฿<AnimatedNumber value={Math.round(convertToThb(heroDisplayData.spent, tripBaseCurrency, fxRate))} />
                </div>
              ) : (
                <div className="text-[9px] sm:text-[10px] font-semibold text-[#e06b88]/80 dark:text-[#f7a1b5]/70 truncate">
                  {tripBaseCurrency}
                </div>
              )}
            </div>
          </div>

          {/* Block 2: Target / ตั้งเป้า */}
          <div className="rounded-2xl p-2.5 sm:p-3 bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50 flex flex-col justify-between">
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-black text-emerald-600 dark:text-emerald-300">
              <span>🎯</span>
              <span>ตั้งเป้าไว้</span>
            </div>
            <div className="mt-1">
              <div className="text-sm sm:text-base md:text-lg font-black text-emerald-700 dark:text-emerald-200 leading-tight">
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

          {/* Block 3: Remaining / คงเหลือ */}
          <div className={`rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between ${
            heroDisplayData.isOver 
              ? 'bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50' 
              : 'bg-sky-50/90 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-900/50'
          }`}>
            <div className={`flex items-center gap-1 text-[10px] sm:text-[11px] font-black ${
              heroDisplayData.isOver ? 'text-amber-700 dark:text-amber-300' : 'text-sky-600 dark:text-sky-300'
            }`}>
              <span>{heroDisplayData.isOver ? '⚠️' : '💰'}</span>
              <span>{heroDisplayData.isOver ? 'เกินงบ' : 'คงเหลือ'}</span>
            </div>
            <div className="mt-1">
              <div className={`text-sm sm:text-base md:text-lg font-black leading-tight ${
                heroDisplayData.isOver ? 'text-amber-700 dark:text-amber-300' : 'text-sky-700 dark:text-sky-200'
              }`}>
                <AnimatedNumber value={heroDisplayData.isOver ? heroDisplayData.diff : heroDisplayData.remaining} />
              </div>
              {tripBaseCurrency !== 'THB' ? (
                <div className={`text-[9px] sm:text-[10px] font-semibold truncate ${
                  heroDisplayData.isOver ? 'text-amber-600/80 dark:text-amber-300/70' : 'text-sky-600/80 dark:text-sky-300/70'
                }`}>
                  ≈ ฿<AnimatedNumber value={Math.round(convertToThb((heroDisplayData.isOver ? heroDisplayData.diff : heroDisplayData.remaining), tripBaseCurrency, fxRate))} />
                </div>
              ) : (
                <div className={`text-[9px] sm:text-[10px] font-semibold truncate ${
                  heroDisplayData.isOver ? 'text-amber-600/80 dark:text-amber-300/70' : 'text-sky-600/80 dark:text-sky-300/70'
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
        <div className="rounded-3xl border border-slate-200/80 dark:border-purple-900/50 bg-white/95 dark:bg-[#1a182d]/95 card-elevation p-3.5 sm:p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <WeatherWidget defaultCity={itinerary[0]?.city || 'Osaka'} />
          <RouteVisualizer dayLabel="ทริปทั้งหมด" items={itinerary} />
        </div>
      )}

      {/* Itinerary Filter, View Mode Toggle & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 sm:p-3 rounded-2xl bg-white/95 dark:bg-[#222638]/95 border border-rose-100/80 dark:border-[#323850]/80 card-elevation">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* View Mode Toggle: List vs Map */}
          <div className="inline-flex p-0.5 rounded-xl bg-slate-100 dark:bg-[#2a2f45] border border-slate-200/70 dark:border-[#323850]">
            <button
              onClick={() => setItineraryViewMode('list')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                itineraryViewMode === 'list' 
                  ? 'bg-white dark:bg-[#1b1f30] text-[#e06b88] dark:text-[#f7a1b5] shadow-2xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              📋 รายการ
            </button>
            <button
              onClick={() => setItineraryViewMode('map')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                itineraryViewMode === 'map' 
                  ? 'bg-white dark:bg-[#1b1f30] text-[#e06b88] dark:text-[#f7a1b5] shadow-2xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              🗺️ แผนที่
            </button>
          </div>

          {/* Day Filter Pills */}
          {availableDays.length > 1 && (
            <div className="flex items-center gap-1 overflow-x-auto py-0.5 custom-scrollbar">
              <button
                onClick={() => setSelectedDayFilter('all')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  selectedDayFilter === 'all'
                    ? 'bg-[#e06b88] text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-[#2a2f45] text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                ทุกวัน ({itinerary.length})
              </button>
              {availableDays.map((day) => (
                <button
                  key={day}
                  onClick={() => setSelectedDayFilter(day)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    selectedDayFilter === day
                      ? 'bg-[#e06b88] text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-[#2a2f45] text-slate-700 dark:text-slate-300 hover:bg-slate-200'
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#323850] bg-white/90 dark:bg-[#2a2f45] text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-rose-300 transition-all cursor-pointer shadow-2xs"
            title="พิมพ์ / เซฟเป็น PDF"
          >
            <FileText className="h-3.5 w-3.5 text-rose-500" />
            <span className="hidden sm:inline">พิมพ์ PDF</span>
          </button>

          {canImportExcel && (
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-[#323850] bg-rose-50/80 dark:bg-[#2a2f45] text-rose-700 dark:text-rose-200 text-xs font-bold hover:border-rose-400 cursor-pointer transition-all shadow-2xs">
              <Upload className="h-3.5 w-3.5 text-rose-500" />
              <span className="hidden sm:inline">Import Excel</span>
              <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
            </label>
          )}

          <button
            onClick={exportToExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#323850] bg-white/90 dark:bg-[#2a2f45] text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-emerald-500 transition-all cursor-pointer shadow-2xs"
            title="ดาวน์โหลดไฟล์ Excel"
          >
            <Download className="h-3.5 w-3.5 text-emerald-500" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>

          {canEditPlan && (
            <button
              onClick={() => handleOpenAddActivity(null, selectedDayFilter !== 'all' ? selectedDayFilter : undefined)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#e06b88] hover:bg-[#d25875] text-white text-xs font-bold shadow-md shadow-[#e06b88]/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>เพิ่มกิจกรรม</span>
            </button>
          )}
        </div>
      </div>

      {itineraryViewMode === 'map' ? (
        <InteractiveTripMap itinerary={itinerary} selectedDay={selectedDayFilter} />
      ) : (
        filteredItinerary.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-[#323850] rounded-3xl p-6 bg-white/60 dark:bg-[#222638]/60">
            <Navigation className="h-10 w-10 text-rose-400 mx-auto mb-2 animate-float-slow" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">ยังไม่มีกิจกรรมในแผนเที่ยวนี้</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
              กดปุ่มเพิ่มกิจกรรม หรือนำเข้าจากไฟล์ Excel ได้ทันที
            </p>
            {canEditPlan && (
              <button
                onClick={() => handleOpenAddActivity()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#e06b88] hover:bg-[#d25875] text-white text-xs font-bold shadow-md hover:scale-105 transition-all"
              >
                <Plus className="h-4 w-4" /> เพิ่มกิจกรรมแรก
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItinerary.map((item, idx) => (
              <ItineraryStopCard
                key={item.id || idx}
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
            ))}
          </div>
        )
      )}
    </div>
  );
}

export default TripPlanTab;
