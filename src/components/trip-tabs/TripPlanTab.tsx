'use client';

import React, { useMemo, useState } from 'react';
import { 
  Coins, ChevronRight, ChevronUp, ChevronDown, 
  FileText, Upload, Download, Plus, Navigation, MapPin, Compass,
  BookmarkCheck, List, Building2, Utensils, Dices, QrCode,
  LayoutGrid, Rows3, Plane, CloudSun, FolderDown, Sparkles
} from 'lucide-react';
import LiveTripCard from '@/components/LiveTripCard';
import WishlistDrawer from '@/components/WishlistDrawer';
import { getAccommodations, getGoogleMapsUrl } from '@/lib/accommodations';
import WeatherWidget from '@/components/WeatherWidget';
import RouteVisualizer from '@/components/RouteVisualizer';
import InteractiveTripMap from '@/components/InteractiveTripMap';
import { 
  ItineraryStopCard, 
  ItineraryThumbnailCard, 
  ItineraryCompactRow 
} from '@/components/trip-detail/ItineraryStopCard';
import { TransitConnector } from '@/components/trip-detail/TransitConnector';
import { FlightBoardingPassCard } from '@/components/trip-detail/FlightBoardingPassCard';
import { AccommodationsCard, formatStayDateDisplay } from '@/components/trip-detail/AccommodationsCard';
import { TripHeroCover } from '@/components/trip-detail/TripHeroCover';
import AnimatedNumber from '@/components/AnimatedNumber';
import { formatExchangeRateDisplay } from '@/lib/currency';
import { resolveDisplayCurrency } from '@/lib/tripStatus';
import { triggerViewTransition } from '@/lib/placeThumbnails';

export type ItineraryDisplayLayout = 'card' | 'thumbnail' | 'compact' | 'map';

interface TripPlanTabProps {
  trip: any;
  tripBaseCurrency: string;
  fxRate: number;
  currencyView?: 'foreign' | 'thb';
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
  canSeeMoney?: boolean;
  onOpenGourmetRadar?: () => void;
  onOpenDiningDecision?: (city?: string) => void;
  onOpenTicketLocker?: () => void;
}

export const TripPlanTab = React.memo(function TripPlanTab({
  trip,
  tripBaseCurrency,
  fxRate,
  currencyView = 'foreign',
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
  canSeeMoney = true,
  onOpenGourmetRadar,
  onOpenDiningDecision,
  onOpenTicketLocker,
}: TripPlanTabProps) {
  const [showWishlistDrawer, setShowWishlistDrawer] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);

  // Sub-layout state for itinerary ('card' | 'thumbnail' | 'compact' | 'map')
  const [displayLayout, setDisplayLayout] = useState<ItineraryDisplayLayout>(() =>
    itineraryViewMode === 'map' ? 'map' : 'card'
  );

  // Sync when parent itineraryViewMode changes
  React.useEffect(() => {
    if (itineraryViewMode === 'map' && displayLayout !== 'map') {
      setDisplayLayout('map');
    } else if (itineraryViewMode === 'list' && displayLayout === 'map') {
      setDisplayLayout('card');
    }
  }, [itineraryViewMode]);

  const handleSelectDisplayLayout = (nextLayout: ItineraryDisplayLayout) => {
    triggerViewTransition(() => {
      setDisplayLayout(nextLayout);
      setItineraryViewMode(nextLayout === 'map' ? 'map' : 'list');
    }, 'itinerary-view-container');
  };

  const handleSelectDay = (day: string) => {
    triggerViewTransition(() => {
      setSelectedDayFilter(day);
    }, 'itinerary-view-container');
  };

  // Collapsible Logistics Panels so the page isn't overloaded with giant cards at once
  const [openLogisticsPanel, setOpenLogisticsPanel] = useState<'none' | 'flights' | 'hotels' | 'budget' | 'all'>('none');

  const toggleLogisticsPanel = (panel: 'flights' | 'hotels' | 'budget') => {
    setOpenLogisticsPanel((prev) => (prev === panel ? 'none' : panel));
  };

  // Check if any accommodation is for this day
  const tripId = trip?.id;
  const stays = useMemo(() => (tripId ? getAccommodations(tripId) : []), [tripId]);
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

  const spentDisp = resolveDisplayCurrency(heroDisplayData.spent, tripBaseCurrency, fxRate, currencyView);
  const targetDisp = resolveDisplayCurrency(heroDisplayData.targetBudget, tripBaseCurrency, fxRate, currencyView);
  const remDisp = resolveDisplayCurrency(
    heroDisplayData.isOver ? heroDisplayData.diff : heroDisplayData.remaining,
    tripBaseCurrency,
    fxRate,
    currencyView
  );

  const showFlights = openLogisticsPanel === 'flights' || openLogisticsPanel === 'all';
  const showHotels = openLogisticsPanel === 'hotels' || openLogisticsPanel === 'all';
  const showBudget = openLogisticsPanel === 'budget' || openLogisticsPanel === 'all';

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* 1. Trip Hero Cover Banner */}
      <TripHeroCover 
        trip={trip} 
        itineraryCount={itinerary.length} 
        totalSpent={heroDisplayData.spent} 
        currency={tripBaseCurrency} 
        showBudget={canSeeMoney}
      />

      {/* 2. Sleek Quick-Glance Logistics & Concierge Tray (Single Compact Row) */}
      <div className="p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-[#181a20] border border-slate-200/90 dark:border-[#262932] shadow-2xs">
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-0.5">
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Logistics Drawers Toggles */}
            <button
              type="button"
              onClick={() => toggleLogisticsPanel('flights')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 active:scale-95 ${
                showFlights
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-[#121316] text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-[#262932] hover:border-blue-400'
              }`}
            >
              <Plane className="h-3.5 w-3.5 shrink-0" />
              <span>ตั๋วบิน</span>
              {showFlights ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3 opacity-60" />}
            </button>

            <button
              type="button"
              onClick={() => toggleLogisticsPanel('hotels')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 active:scale-95 ${
                showHotels
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-[#121316] text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-[#262932] hover:border-emerald-400'
              }`}
            >
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span>ที่พัก ({stays.length})</span>
              {showHotels ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3 opacity-60" />}
            </button>

            {canSeeMoney && (
              <button
                type="button"
                onClick={() => toggleLogisticsPanel('budget')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 active:scale-95 ${
                  showBudget
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-[#121316] text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-[#262932] hover:border-indigo-400'
                }`}
              >
                <Coins className="h-3.5 w-3.5 shrink-0" />
                <span className="font-mono">{spentDisp.primaryText}</span>
                {showBudget ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3 opacity-60" />}
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowWeatherSection(!showWeatherSection)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 active:scale-95 ${
                showWeatherSection
                  ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-[#121316] text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-[#262932] hover:border-sky-400'
              }`}
            >
              <CloudSun className="h-3.5 w-3.5 shrink-0" />
              <span>อากาศ</span>
            </button>

            <div className="h-5 w-px bg-slate-200 dark:bg-[#262932] mx-0.5 shrink-0" />

            {/* Concierge Tools */}
            <button
              type="button"
              onClick={onOpenTicketLocker}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#121316] border border-slate-200/80 dark:border-[#262932] hover:border-indigo-400 px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <QrCode className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <span>QR Pass</span>
            </button>

            <button
              type="button"
              onClick={onOpenGourmetRadar}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#121316] border border-slate-200/80 dark:border-[#262932] hover:border-orange-400 px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <Utensils className="h-3.5 w-3.5 text-orange-500 shrink-0" />
              <span>ร้านอร่อย</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenDiningDecision?.()}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#121316] border border-slate-200/80 dark:border-[#262932] hover:border-blue-400 px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <Dices className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              <span>สุ่มมื้อ</span>
            </button>

            <button
              type="button"
              onClick={() => setShowWishlistDrawer(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#121316] border border-slate-200/80 dark:border-[#262932] hover:border-amber-400 px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <BookmarkCheck className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>Wishlist</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowTravelHubModal(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <Compass className="h-3.5 w-3.5 shrink-0" />
            <span>Travel Hub</span>
          </button>
        </div>
      </div>

      {/* Expandable Logistics Panels (Only shown when toggled so the journey stays super clean) */}
      {showFlights && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          <FlightBoardingPassCard 
            tripId={trip?.id || ''} 
            defaultDestination={trip?.destination || 'Tokyo'} 
            tripCurrency={tripBaseCurrency}
            fxRate={fxRate}
            currentUser={currentUser}
            tripStartDate={trip?.start_date}
            tripEndDate={trip?.end_date}
            onExpenseCreated={onRefreshTrip}
            onShowToast={onShowToast}
          />
        </div>
      )}

      {showHotels && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          <AccommodationsCard
            tripId={trip?.id || ''}
            tripCurrency={tripBaseCurrency}
            fxRate={fxRate}
            members={members}
            currentUser={currentUser}
            tripStartDate={trip?.start_date}
            tripEndDate={trip?.end_date}
            onExpenseCreated={onRefreshTrip}
            onShowToast={onShowToast}
          />
        </div>
      )}

      {showBudget && canSeeMoney && (
        <div 
          onClick={() => onSwitchTab('expenses')}
          className="p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 dark:border-[#262932] bg-white dark:bg-[#181a20] space-y-3 cursor-pointer hover:border-blue-500/50 transition-all group shadow-2xs animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
              <div className="p-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Coins className="h-4 w-4" />
              </div>
              <span>สรุปงบประมาณทริป ({heroDisplayData.title})</span>
              <span className="text-[10px] font-mono text-slate-400">{formatExchangeRateDisplay(tripBaseCurrency, fxRate)}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
              <span>ไปหน้ารายจ่าย</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-2xl p-2.5 sm:p-3 bg-blue-500/10 border border-blue-500/20 flex flex-col justify-between">
              <div className="text-[10px] sm:text-[11px] font-bold text-blue-600 dark:text-blue-400">
                ใช้ไปแล้ว ({spentDisp.primaryCurrency})
              </div>
              <div className="mt-1">
                <div className="text-sm sm:text-base md:text-lg font-black text-slate-900 dark:text-white leading-tight font-mono">
                  <AnimatedNumber value={spentDisp.primaryAmount} />
                </div>
                <div className="text-[9px] sm:text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                  {spentDisp.secondaryText || spentDisp.primaryCurrency}
                </div>
              </div>
            </div>

            <div className="rounded-2xl p-2.5 sm:p-3 bg-slate-50 dark:bg-[#121316] border border-slate-200 dark:border-[#262932] flex flex-col justify-between">
              <div className="text-[10px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-300">
                ตั้งเป้าไว้ ({targetDisp.primaryCurrency})
              </div>
              <div className="mt-1">
                <div className="text-sm sm:text-base md:text-lg font-black text-slate-900 dark:text-white leading-tight font-mono">
                  {heroDisplayData.targetBudget > 0 ? (
                    <AnimatedNumber value={targetDisp.primaryAmount} />
                  ) : (
                    '-'
                  )}
                </div>
                <div className="text-[9px] sm:text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                  {heroDisplayData.targetBudget > 0 ? (targetDisp.secondaryText || targetDisp.primaryCurrency) : 'ยังไม่ระบุงบ'}
                </div>
              </div>
            </div>

            <div className={`rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between ${
              heroDisplayData.isOver 
                ? 'bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/40' 
                : 'bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/40'
            }`}>
              <div className={`text-[10px] sm:text-[11px] font-bold ${
                heroDisplayData.isOver ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-300'
              }`}>
                {heroDisplayData.isOver ? 'เกินงบ' : 'คงเหลือ'} ({remDisp.primaryCurrency})
              </div>
              <div className="mt-1">
                <div className={`text-sm sm:text-base md:text-lg font-black leading-tight font-mono ${
                  heroDisplayData.isOver ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'
                }`}>
                  <AnimatedNumber value={remDisp.primaryAmount} />
                </div>
                <div className={`text-[9px] sm:text-[10px] font-semibold truncate ${
                  heroDisplayData.isOver ? 'text-rose-600/80 dark:text-rose-300/70' : 'text-amber-600/80 dark:text-amber-300/70'
                }`}>
                  {remDisp.secondaryText || remDisp.primaryCurrency}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showWeatherSection && (
        <div className="rounded-3xl border border-slate-200/90 dark:border-[#262932] bg-white dark:bg-[#181a20] card-elevation p-3.5 sm:p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <WeatherWidget defaultCity={itinerary[0]?.city || 'Osaka'} />
          <RouteVisualizer dayLabel="ทริปทั้งหมด" items={itinerary} />
        </div>
      )}

      {/* 3. Live On-Trip Destination & Next-Up Spotlight Card */}
      <LiveTripCard
        trip={trip}
        itinerary={itinerary}
        availableDays={availableDays}
        selectedDay={selectedDayFilter}
        fxRate={fxRate}
        onOpenActivityDetail={handleOpenEditActivity}
        onShowToast={onShowToast}
      />

      {/* 4. Unified Itinerary View Switcher + Day Filter Bar */}
      <div className="p-3 sm:p-3.5 rounded-3xl bg-white dark:bg-[#181a20] border border-slate-200/90 dark:border-[#262932] shadow-2xs space-y-2.5">
        {/* Top Row: 4-Mode View Switcher + File Menu & Add Button */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* 4-Mode Segmented View Switcher */}
          <div
            className="inline-flex p-1 rounded-2xl bg-slate-100 dark:bg-[#121316] border border-slate-200/70 dark:border-[#262932]"
            role="group"
            aria-label="เลือกมุมมองแผนเที่ยว"
          >
            <button
              type="button"
              onClick={() => handleSelectDisplayLayout('thumbnail')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                displayLayout === 'thumbnail'
                  ? 'bg-white dark:bg-[#181a20] text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="มุมมองการ์ดรูปภาพ Thumbnail"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Thumbnail</span>
              <span className="sm:hidden">รูป</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectDisplayLayout('card')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                displayLayout === 'card'
                  ? 'bg-white dark:bg-[#181a20] text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="มุมมองการ์ดรายละเอียดครบถ้วน"
            >
              <List className="h-3.5 w-3.5" />
              <span>การ์ด</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectDisplayLayout('compact')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                displayLayout === 'compact'
                  ? 'bg-white dark:bg-[#181a20] text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="มุมมองรายการย่อ 1 บรรทัด"
            >
              <Rows3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">รายการย่อ</span>
              <span className="sm:hidden">ย่อ</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectDisplayLayout('map')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                displayLayout === 'map'
                  ? 'bg-white dark:bg-[#181a20] text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="มุมมองแผนที่"
            >
              <MapPin className="h-3.5 w-3.5" />
              <span>แผนที่</span>
            </button>
          </div>

          {/* Right Actions: Clean File Dropdown (PDF/Excel) + Primary Add Activity */}
          <div className="flex items-center gap-2 ml-auto relative">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFileMenu((v) => !v)}
                className="btn-luxury-glass inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-2xs active:scale-95"
                title="พิมพ์ PDF หรือนำเข้า/ส่งออก Excel"
              >
                <FolderDown className="h-3.5 w-3.5 text-blue-500" />
                <span>ไฟล์ / PDF</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>

              {showFileMenu && (
                <div className="absolute right-0 top-11 z-30 w-48 rounded-2xl bg-white dark:bg-[#1e2027] border border-slate-200 dark:border-[#262932] shadow-xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setShowFileMenu(false);
                      setShowPrintableModal(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5 text-blue-500" />
                    <span>พิมพ์ / เซฟเป็น PDF</span>
                  </button>

                  {canImportExcel && (
                    <label className="w-full px-3 py-2 rounded-xl text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 flex items-center gap-2 cursor-pointer">
                      <Upload className="h-3.5 w-3.5 text-blue-500" />
                      <span>นำเข้าไฟล์ Excel</span>
                      <input
                        type="file"
                        accept=".xlsx, .xls"
                        className="hidden"
                        onChange={(e) => {
                          setShowFileMenu(false);
                          handleFileUpload(e);
                        }}
                      />
                    </label>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setShowFileMenu(false);
                      exportToExcel();
                    }}
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 text-emerald-500" />
                    <span>ส่งออกไฟล์ Excel</span>
                  </button>
                </div>
              )}
            </div>

            {canEditPlan && (
              <button
                type="button"
                onClick={() => handleOpenAddActivity(null, selectedDayFilter !== 'all' ? selectedDayFilter : undefined)}
                className="btn-luxury-primary inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-bold shadow-md shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>เพิ่มกิจกรรม</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Row: Swipeable Day Filter Pills */}
        {availableDays.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 custom-scrollbar">
            <button
              type="button"
              onClick={() => handleSelectDay('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                selectedDayFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-[#1e2027] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#262932]'
              }`}
            >
              📅 ทุกวัน ({itinerary.length})
            </button>
            {availableDays.map((day, dIdx) => (
              <button
                key={day}
                type="button"
                onClick={() => handleSelectDay(day)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  selectedDayFilter === day
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-[#1e2027] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#262932]'
                }`}
              >
                Day {dIdx + 1} • {day}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active Stay Banner for selected day if applicable */}
      {activeStayForSelectedDay && (
        <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block uppercase">
                🏨 ที่พักของวันนี้ ({selectedDayFilter})
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
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#181a20] text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs hover:bg-emerald-50 flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <MapPin className="h-3 w-3 text-rose-500" />
            <span>นำทางกลับที่พัก</span>
          </a>
        </div>
      )}

      {/* 5. Main Itinerary Content Area (4 View Modes with Accessibility Focus Target) */}
      <div id="itinerary-view-container" tabIndex={-1} className="outline-none">
        {filteredItinerary.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-[#262932] rounded-3xl p-6 bg-white dark:bg-[#181a20]">
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
        ) : displayLayout === 'map' ? (
          /* Map & iPad Landscape Split-View Mode (Wanderlog Style) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <div className="hidden lg:block lg:col-span-5 space-y-2 max-h-[75dvh] overflow-y-auto pr-1 custom-scrollbar">
              <div className="px-2 py-1 text-xs font-black text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>📋 รายการจุดแวะ ({filteredItinerary.length} จุด)</span>
                <span>iPad / Split View</span>
              </div>
              {filteredItinerary.map((item, idx) => (
                <ItineraryCompactRow
                  key={item.id || idx}
                  item={item}
                  idx={idx}
                  canEditPlan={canEditPlan}
                  onOpenEditActivity={handleOpenEditActivity}
                />
              ))}
            </div>
            <div className="lg:col-span-7 lg:sticky lg:top-24">
              <InteractiveTripMap itinerary={itinerary} selectedDay={selectedDayFilter} />
            </div>
          </div>
        ) : displayLayout === 'thumbnail' ? (
          /* Thumbnail / Magazine Grid Mode (Trip.com / Airbnb Style) */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {filteredItinerary.map((item, idx) => (
              <ItineraryThumbnailCard
                key={item.id || idx}
                item={item}
                idx={idx}
                canEditPlan={canEditPlan}
                onOpenEditActivity={handleOpenEditActivity}
              />
            ))}
          </div>
        ) : displayLayout === 'compact' ? (
          /* Compact Timeline / Checklist Mode (Wanderlog / Google Calendar Style) */
          <div className="p-3 sm:p-4 rounded-3xl border border-slate-200/90 dark:border-[#262932] bg-white dark:bg-[#181a20] card-elevation space-y-2">
            <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-100 dark:border-[#262932] text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <span>⚡ มุมมองตารางเวลาย่อ ({filteredItinerary.length} รายการ)</span>
              <span>แตะไอคอนด้านซ้ายเพื่อเช็กอิน</span>
            </div>
            {filteredItinerary.map((item, idx) => (
              <ItineraryCompactRow
                key={item.id || idx}
                item={item}
                idx={idx}
                canEditPlan={canEditPlan}
                onOpenEditActivity={handleOpenEditActivity}
              />
            ))}
          </div>
        ) : (
          /* Detailed Card Mode */
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
        )}
      </div>

      {/* Wishlist Drawer Modal */}
      <WishlistDrawer
        isOpen={showWishlistDrawer}
        onClose={() => setShowWishlistDrawer(false)}
        tripId={trip?.id}
        selectedDay={selectedDayFilter}
        availableDays={availableDays}
        onAddToItinerary={(item) => {
          handleOpenAddActivity({
            title: item.title,
            category: item.category,
            location: item.location,
          }, selectedDayFilter === 'all' ? availableDays[0] : selectedDayFilter);
        }}
        onShowToast={onShowToast}
      />
    </div>
  );
});

export default TripPlanTab;
