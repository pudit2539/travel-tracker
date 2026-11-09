'use client';

import React, { useMemo, useState, useDeferredValue } from 'react';
import { 
  Coins, ChevronRight, ChevronUp, ChevronDown, 
  FileText, Upload, Download, Plus, Navigation, MapPin, Compass,
  BookmarkCheck, List, Building2, Utensils, Dices, QrCode,
  LayoutGrid, Rows3, Plane, CloudSun, FolderDown, Sparkles, ExternalLink,
  Users, UserCheck, Clock, Train, ArrowUpToLine, ArrowDownToLine, ShoppingBag,
  Search, X, Shield, Calendar
} from 'lucide-react';
import dynamic from 'next/dynamic';
import LiveTripCard from '@/components/LiveTripCard';
import { getAccommodations, getGoogleMapsUrl } from '@/lib/accommodations';

const WeatherWidget = dynamic(() => import('@/components/WeatherWidget'), { ssr: false });
const RouteVisualizer = dynamic(() => import('@/components/RouteVisualizer'), { ssr: false });
const WishlistDrawer = dynamic(() => import('@/components/WishlistDrawer'), { ssr: false });
const InteractiveTripMap = dynamic(() => import('@/components/InteractiveTripMap'), { ssr: false });
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
import {
  StopSmartMeta,
  getStopKey,
  getTripStopMetaMap,
  updateStopMeta,
  subscribeStopMeta,
  calculateDayCascadeSchedule,
} from '@/lib/smartTimeline';
import {
  ShoppingBagItem,
  EMPTY_SHOPPING_ITEMS,
  getShoppingBag,
  updateShoppingBagItem,
  subscribeShoppingBag,
  getShoppingItemsForStop,
  getShoppingBagSummary,
} from '@/lib/shoppingBag';

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
  onMoveStopToDay?: (item: any, targetDayLabel: string) => void;
  onSyncShoppingExpense?: (
    item: ShoppingBagItem,
    nextStatus: 'planned' | 'bought' | 'out_of_stock' | 'skipped'
  ) => Promise<void> | void;
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
  onMoveStopToDay,
  onSyncShoppingExpense,
}: TripPlanTabProps) {
  const [showWishlistDrawer, setShowWishlistDrawer] = useState(false);
  const [wishlistInitialTab, setWishlistInitialTab] = useState<'wishlist' | 'shopping'>('wishlist');
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [groupViewFilter, setGroupViewFilter] = useState<'all' | 'mine'>('all');
  const [showScrollJump, setShowScrollJump] = useState(false);
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});

  const toggleDayCollapse = React.useCallback((dayLabel: string) => {
    setCollapsedDays((prev) => ({
      ...prev,
      [dayLabel]: !prev[dayLabel],
    }));
  }, []);
  const [planSearchQuery, setPlanSearchQuery] = useState('');
  const deferredPlanSearch = useDeferredValue(planSearchQuery);

  const tripId = trip?.id || '';
  const [stopMetaMap, setStopMetaMap] = useState<Record<string, StopSmartMeta>>(() =>
    getTripStopMetaMap(tripId)
  );
  const [shoppingBag, setShoppingBag] = useState<ShoppingBagItem[]>(() => getShoppingBag(tripId));

  React.useEffect(() => {
    if (!tripId) return;
    const syncMeta = () => setStopMetaMap(getTripStopMetaMap(tripId));
    syncMeta();
    return subscribeStopMeta(syncMeta);
  }, [tripId]);

  React.useEffect(() => {
    if (!tripId) return;
    const syncShop = () => setShoppingBag(getShoppingBag(tripId));
    syncShop();
    return subscribeShoppingBag(syncShop);
  }, [tripId]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => {
      setShowScrollJump(window.scrollY > 420);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const currentUserName = useMemo(() => {
    return (
      currentUser?.user_metadata?.display_name ||
      currentUser?.user_metadata?.full_name ||
      currentUser?.email?.split('@')[0] ||
      'ฉัน'
    );
  }, [currentUser]);

  const memberNames = useMemo(() => {
    const names = new Set<string>();
    if (currentUserName) names.add(currentUserName);
    (members || []).forEach((m: any) => {
      const n = m?.display_name || m?.name || m?.email?.split('@')[0];
      if (n) names.add(n);
    });
    return Array.from(names);
  }, [members, currentUserName]);

  const handleUpdateStopMeta = React.useCallback(
    (stopKey: string, patch: Partial<StopSmartMeta>) => {
      if (!tripId) return;
      const next = updateStopMeta(tripId, stopKey, patch);
      setStopMetaMap(next);
    },
    [tripId]
  );

  const handleToggleShoppingItemStatus = React.useCallback(
    async (shopItem: ShoppingBagItem) => {
      if (!tripId) return;
      const nextStatus = shopItem.status === 'bought' ? 'planned' : 'bought';
      if (onSyncShoppingExpense) {
        await onSyncShoppingExpense(shopItem, nextStatus);
      } else {
        updateShoppingBagItem(tripId, shopItem.id, {
          status: nextStatus,
          boughtAt: nextStatus === 'bought' ? new Date().toISOString() : undefined,
        });
      }
      setShoppingBag(getShoppingBag(tripId));
    },
    [tripId, onSyncShoppingExpense]
  );

  const shoppingSummary = useMemo(() => getShoppingBagSummary(shoppingBag), [shoppingBag]);

  const handleTogglePlanB = React.useCallback(
    (id: string) => {
      setExpandedPlanB((prev) => ({ ...prev, [id]: !prev[id] }));
    },
    [setExpandedPlanB]
  );

  // Filter stops by Split Group View + Quick Search Query
  const displayedItinerary = useMemo(() => {
    const base =
      groupViewFilter === 'all'
        ? filteredItinerary
        : filteredItinerary.filter((item) => {
            const key = getStopKey(item);
            const meta = stopMetaMap[key] || stopMetaMap[(item.main_place || '').trim()];
            if (!meta?.goers || meta.goers.length === 0) return true;
            return meta.goers.includes(currentUserName);
          });

    const q = deferredPlanSearch.trim().toLowerCase();
    if (!q) return base;
    return base.filter((item) => {
      const hay = [
        item.main_place || '',
        item.city || '',
        item.date_label || '',
        item.time_slot || '',
        item.food_recommendation || '',
        item.backup_plan || '',
        item.transport_info || '',
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [filteredItinerary, groupViewFilter, stopMetaMap, currentUserName, deferredPlanSearch]);

  const stopsWithPlanB = useMemo(
    () => displayedItinerary.filter((it) => it.backup_plan && it.backup_plan !== '-'),
    [displayedItinerary]
  );

  const allPlanBExpanded = useMemo(
    () => stopsWithPlanB.length > 0 && stopsWithPlanB.every((it) => Boolean(expandedPlanB[it.id])),
    [stopsWithPlanB, expandedPlanB]
  );

  const handleToggleAllPlanB = React.useCallback(() => {
    const nextOpen = !allPlanBExpanded;
    setExpandedPlanB((prev) => {
      const next = { ...prev };
      for (const it of stopsWithPlanB) {
        if (it.id) next[it.id] = nextOpen;
      }
      return next;
    });
  }, [allPlanBExpanded, stopsWithPlanB, setExpandedPlanB]);

  // Pre-compute shopping items per stop once per render so React.memo(ItineraryStopCard) gets stable array references
  const stopShoppingByKey = useMemo(() => {
    const map: Record<string, ShoppingBagItem[]> = {};
    for (const item of displayedItinerary) {
      const key = getStopKey(item);
      const matched = getShoppingItemsForStop(shoppingBag, item);
      map[key] = matched.length > 0 ? matched : EMPTY_SHOPPING_ITEMS;
    }
    return map;
  }, [displayedItinerary, shoppingBag]);

  // TabiPlan Smart Cascade Schedule for displayed stops (Only calculated for a single day so 'all' 42 stops don't merge into 1 fake day)
  const dayCascadeSchedule = useMemo(
    () =>
      selectedDayFilter === 'all'
        ? calculateDayCascadeSchedule([], stopMetaMap)
        : calculateDayCascadeSchedule(displayedItinerary, stopMetaMap),
    [displayedItinerary, stopMetaMap, selectedDayFilter]
  );

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

  // Google Maps Multi-Stop Directions URL for the current filtered day
  const multiStopRouteUrl = useMemo(() => {
    if (!filteredItinerary || filteredItinerary.length < 2) return null;
    const places = filteredItinerary
      .map((item) => {
        const name = (item.main_place || item.title || '').trim();
        if (!name) return null;
        const city = item.city ? ` ${item.city}` : '';
        return encodeURIComponent(`${name}${city}`);
      })
      .filter(Boolean);

    if (places.length < 2) return null;
    return `https://www.google.com/maps/dir/${places.join('/')}`;
  }, [filteredItinerary]);

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
      <div className="p-2 sm:p-2.5 rounded-2xl bg-[#FDFBF7] dark:bg-[#181a20] border border-[#DFD7C7] dark:border-[#262932] shadow-[0_2px_10px_rgba(35,30,20,0.04)]">
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-0.5">
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Logistics Drawers Toggles */}
            <button
              type="button"
              onClick={() => toggleLogisticsPanel('flights')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 active:scale-95 ${
                showFlights
                  ? 'bg-[#1C2630] dark:bg-blue-600 text-white border-[#1C2630] dark:border-blue-600 shadow-xs'
                  : 'bg-[#F6F2E9] dark:bg-[#121316] text-[#2C2A26] dark:text-slate-300 border-[#DFD7C7] dark:border-[#262932] hover:border-[#C83E2D]'
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
                  ? 'bg-[#2E7D5B] text-white border-[#2E7D5B] shadow-xs'
                  : 'bg-[#F6F2E9] dark:bg-[#121316] text-[#2C2A26] dark:text-slate-300 border-[#DFD7C7] dark:border-[#262932] hover:border-[#2E7D5B]'
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
                    ? 'bg-[#C83E2D] text-white border-[#C83E2D] shadow-xs'
                    : 'bg-[#F6F2E9] dark:bg-[#121316] text-[#2C2A26] dark:text-slate-300 border-[#DFD7C7] dark:border-[#262932] hover:border-[#C83E2D]'
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
                  ? 'bg-[#1C2630] dark:bg-sky-600 text-white border-[#1C2630] dark:border-sky-600 shadow-xs'
                  : 'bg-[#F6F2E9] dark:bg-[#121316] text-[#2C2A26] dark:text-slate-300 border-[#DFD7C7] dark:border-[#262932] hover:border-[#1C2630]'
              }`}
            >
              <CloudSun className="h-3.5 w-3.5 shrink-0" />
              <span>อากาศ</span>
            </button>

            <div className="h-5 w-px bg-[#DFD7C7] dark:bg-[#262932] mx-0.5 shrink-0" />

            {/* Concierge Tools */}
            <button
              type="button"
              onClick={onOpenTicketLocker}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2C2A26] dark:text-slate-300 bg-[#F6F2E9] dark:bg-[#121316] border border-[#DFD7C7] dark:border-[#262932] hover:border-[#C83E2D] px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <QrCode className="h-3.5 w-3.5 text-[#1C2630] dark:text-indigo-500 shrink-0" />
              <span>QR Pass</span>
            </button>

            <button
              type="button"
              onClick={onOpenGourmetRadar}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2C2A26] dark:text-slate-300 bg-[#F6F2E9] dark:bg-[#121316] border border-[#DFD7C7] dark:border-[#262932] hover:border-[#C83E2D] px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <Utensils className="h-3.5 w-3.5 text-[#C83E2D] shrink-0" />
              <span>ร้านอร่อย</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenDiningDecision?.()}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2C2A26] dark:text-slate-300 bg-[#F6F2E9] dark:bg-[#121316] border border-[#DFD7C7] dark:border-[#262932] hover:border-[#C83E2D] px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <Dices className="h-3.5 w-3.5 text-[#1C2630] dark:text-blue-500 shrink-0" />
              <span>สุ่มมื้อ</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setWishlistInitialTab('shopping');
                setShowWishlistDrawer(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2C2A26] dark:text-slate-300 bg-[#F6F2E9] dark:bg-[#121316] border border-[#DFD7C7] dark:border-[#262932] hover:border-[#C83E2D] px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <ShoppingBag className="h-3.5 w-3.5 text-[#C83E2D] shrink-0" />
              <span>
                กระเป๋าช้อป ({shoppingSummary.boughtCount}/{shoppingSummary.totalCount})
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowTravelHubModal(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#1C2630] hover:bg-[#2A3744] dark:bg-blue-600 dark:hover:bg-blue-700 px-3 py-1.5 rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
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
      <div
        id="itinerary-day-bar"
        className="p-3 sm:p-3.5 rounded-3xl bg-white dark:bg-[#181a20] border border-slate-200/90 dark:border-[#262932] shadow-2xs space-y-2.5 scroll-mt-20"
      >
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

            <button
              type="button"
              onClick={() => {
                setWishlistInitialTab('wishlist');
                setShowWishlistDrawer(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70 text-xs font-bold transition-all cursor-pointer active:scale-95"
              title="เปิดดูที่เที่ยวแนะนำและคลังพิกัดสำรอง"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
              <span>ที่เที่ยวแนะนำ</span>
            </button>

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

        {/* Quick Search Input + Expand/Collapse All Backup Plans */}
        <div className="flex items-center gap-2 pt-0.5">
          <div className="relative flex-1 min-w-0">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={planSearchQuery}
              onChange={(e) => setPlanSearchQuery(e.target.value)}
              placeholder="ค้นหาสถานที่, เมือง, ร้านอาหาร, แผนสำรอง..."
              className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-slate-50 dark:bg-[#121316] border border-slate-200/80 dark:border-[#262932] text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {planSearchQuery && (
              <button
                type="button"
                onClick={() => setPlanSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="ล้างคำค้นหา"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {stopsWithPlanB.length > 0 && displayLayout === 'card' && (
            <button
              type="button"
              onClick={handleToggleAllPlanB}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border shrink-0 transition-all cursor-pointer active:scale-95 ${
                allPlanBExpanded
                  ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                  : 'bg-slate-50 dark:bg-[#121316] text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-[#262932] hover:border-amber-400'
              }`}
              title="เปิดหรือย่อแผนสำรองและร้านสำรองของทุกการ์ดพร้อมกัน"
            >
              <Shield className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="hidden sm:inline">
                {allPlanBExpanded ? 'ย่อแผนสำรองทั้งหมด' : 'เปิดแผนสำรองทั้งหมด'}
              </span>
              <span className="sm:hidden">{allPlanBExpanded ? 'ย่อสำรอง' : 'แผนสำรอง'}</span>
            </button>
          )}
        </div>

        {/* Bottom Row: Swipeable Day Filter Pills */}
        {availableDays.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pt-1 pb-0.5">
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
        {/* 4.5 TabiPlan Smart Cascade Summary (Shown when a specific day is selected) */}
        {displayedItinerary.length > 0 && selectedDayFilter !== 'all' && (
          <div className="mb-3.5 p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#181a20] border border-slate-200/90 dark:border-[#262932] shadow-2xs space-y-3">
            {/* Top Row: Smart Cascade Schedule Summary Pills */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-[#232630]">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white">
                  <Clock className="h-3.5 w-3.5 text-indigo-500" />
                  <span>
                    ตารางเวลาไหลอัตโนมัติ: {dayCascadeSchedule.dayStartTime}–{dayCascadeSchedule.dayEndTime}
                  </span>
                </span>
                <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50">
                  🎯 เวลาเที่ยว {(dayCascadeSchedule.totalSightseeingMin / 60).toFixed(1)} ชม.
                </span>
                <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/50">
                  🚆 เดินทางรวม {dayCascadeSchedule.totalTravelMin} นาที
                </span>
                {dayCascadeSchedule.totalTransitFareJpy > 0 && (
                  <span className="px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/50">
                    💴 ค่ารถไฟ ≈ ¥{dayCascadeSchedule.totalTransitFareJpy.toLocaleString()}
                  </span>
                )}
                {dayCascadeSchedule.skippedStopsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    ⏭️ ข้ามชั่วคราว {dayCascadeSchedule.skippedStopsCount} จุด
                  </span>
                )}
                {dayCascadeSchedule.lateStopsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-lg text-[11px] font-black bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">
                    ⚠️ สายกว่าเวลานัด {dayCascadeSchedule.lateStopsCount} จุด!
                  </span>
                )}
              </div>

              {multiStopRouteUrl && (
                <a
                  href={multiStopRouteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-2xs hover:scale-102 active:scale-95 transition-all shrink-0 cursor-pointer"
                >
                  <Navigation className="h-3 w-3" />
                  <span>เปิดเส้นทางใน Google Maps</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>

            {/* Sequential Route Trail Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
              {displayedItinerary.map((stop, sIdx) => {
                const isLast = sIdx === displayedItinerary.length - 1;
                const stopName = stop.main_place || stop.title || `จุดที่ ${sIdx + 1}`;
                const stopKey = getStopKey(stop);
                const sched = dayCascadeSchedule.byStopKey[stopKey];
                const isSkipped = Boolean(sched?.skipped);
                return (
                  <React.Fragment key={stop.id || sIdx}>
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border shrink-0 ${
                        isSkipped
                          ? 'bg-slate-100/60 dark:bg-slate-900/40 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 line-through'
                          : 'bg-slate-50 dark:bg-[#121316] border-slate-200/80 dark:border-[#262932] text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full text-white text-[10px] font-mono font-black flex items-center justify-center shrink-0 ${
                          isSkipped ? 'bg-slate-400' : 'bg-blue-600'
                        }`}
                      >
                        {sIdx + 1}
                      </span>
                      <span className="font-bold text-[11px] max-w-[120px] sm:max-w-[160px] truncate" title={stopName}>
                        {stopName}
                      </span>
                      {!isSkipped && sched && (
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                          {sched.arriveTime}
                        </span>
                      )}
                    </div>
                    {!isLast && (
                      <span className="text-slate-300 dark:text-slate-600 font-black text-xs shrink-0 select-none">
                        ➔
                      </span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {displayedItinerary.length === 0 ? (
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
                <span>📋 รายการจุดแวะ ({displayedItinerary.length} จุด)</span>
                <span>iPad / Split View</span>
              </div>
              {displayedItinerary.map((item, idx) => (
                <ItineraryCompactRow
                  key={item.id || idx}
                  item={item}
                  idx={idx}
                  canEditPlan={canEditPlan}
                  currentUser={currentUser}
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
            {displayedItinerary.map((item, idx) => (
              <ItineraryThumbnailCard
                key={item.id || idx}
                item={item}
                idx={idx}
                canEditPlan={canEditPlan}
                currentUser={currentUser}
                onOpenEditActivity={handleOpenEditActivity}
              />
            ))}
          </div>
        ) : displayLayout === 'compact' ? (
          /* Compact Timeline / Checklist Mode (Wanderlog / Google Calendar Style) */
          <div className="p-3 sm:p-4 rounded-3xl border border-slate-200/90 dark:border-[#262932] bg-white dark:bg-[#181a20] card-elevation space-y-2">
            <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-100 dark:border-[#262932] text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <span>⚡ มุมมองตารางเวลาย่อ ({displayedItinerary.length} รายการ)</span>
              <span>แตะไอคอนด้านซ้ายเพื่อเช็กอิน</span>
            </div>
            {displayedItinerary.map((item, idx) => (
              <ItineraryCompactRow
                key={item.id || idx}
                item={item}
                idx={idx}
                canEditPlan={canEditPlan}
                currentUser={currentUser}
                onOpenEditActivity={handleOpenEditActivity}
              />
            ))}
          </div>
        ) : (
          /* Detailed Card Mode */
          <div className="space-y-3">
            {displayedItinerary.map((item, idx) => {
              const prevItem = idx > 0 ? displayedItinerary[idx - 1] : null;
              const nextItem = displayedItinerary[idx + 1];
              const isNewDayGroup =
                selectedDayFilter === 'all' &&
                (!prevItem || prevItem.date_label !== item.date_label);
              const dayNumber = availableDays.indexOf(item.date_label) + 1;
              const dayStopsCount = isNewDayGroup
                ? displayedItinerary.filter((d) => d.date_label === item.date_label).length
                : 0;
              const stopKey = getStopKey(item);
              const stopMeta = stopMetaMap[stopKey] || stopMetaMap[(item.main_place || '').trim()];
              const computedSchedule = dayCascadeSchedule.byStopKey[stopKey];
              const stopShopping = stopShoppingByKey[stopKey] || EMPTY_SHOPPING_ITEMS;
              const isDayCollapsed = selectedDayFilter === 'all' && Boolean(collapsedDays[item.date_label]);
              return (
                <React.Fragment key={item.id || idx}>
                  {isNewDayGroup && item.date_label && (
                    <div className="pt-3 first:pt-0">
                      <div
                        onClick={() => toggleDayCollapse(item.date_label)}
                        className="px-4 py-3 rounded-xl bg-[#FDFBF7] dark:bg-[#181a20] border border-[#DFD7C7] dark:border-[#2C2A26] border-l-4 border-l-[#C83E2D] space-y-2 cursor-pointer hover:bg-[#FAF6EE] dark:hover:bg-[#1e2129] transition-colors select-none shadow-[0_2px_8px_rgba(35,30,20,0.04)]"
                        title="แตะเพื่อพับ/กางกิจกรรมของวันนี้"
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] font-semibold tracking-widest uppercase text-[#8C8275] dark:text-slate-400">
                          <span>
                            {dayNumber > 0 ? `DAY ${String(dayNumber).padStart(2, '0')}` : 'TRAVEL DAY'} //{' '}
                            {item.city || 'JAPAN'}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <span>{dayStopsCount} STOPS</span>
                            <span className="px-1.5 py-0.5 rounded bg-[#F1ECE1] dark:bg-white/10 text-[#1C2630] dark:text-slate-200 text-[10px] font-bold">
                              {isDayCollapsed ? '▾ กางออก' : '▴ พับเก็บ'}
                            </span>
                          </span>
                        </div>
                        <div className="flex items-end justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <h3 className="font-serif text-lg sm:text-xl font-bold text-[#151515] dark:text-white tracking-tight leading-tight">
                              {item.date_label}
                            </h3>
                            {isDayCollapsed && (
                              <span className="text-[11px] font-bold text-[#8C8275] dark:text-slate-400 truncate">
                                (พับเก็บ {dayStopsCount} กิจกรรม)
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectDay(item.date_label);
                            }}
                            className="text-[11px] font-bold text-[#C83E2D] dark:text-amber-400 hover:underline inline-flex items-center gap-0.5 shrink-0 cursor-pointer"
                          >
                            <span>ดูเฉพาะวันนี้</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="flex gap-1 pt-0.5">
                          <div className="h-0.5 flex-1 rounded-full bg-[#C83E2D]" />
                          <div className="h-0.5 flex-1 rounded-full bg-[#E5DED2] dark:bg-slate-700" />
                          <div className="h-0.5 flex-1 rounded-full bg-[#E5DED2] dark:bg-slate-700" />
                        </div>
                      </div>
                    </div>
                  )}
                  {!isDayCollapsed && (
                    <>
                      <ItineraryStopCard
                        item={item}
                        idx={idx}
                        totalItems={itinerary.length}
                        canEditPlan={canEditPlan}
                        currentUser={currentUser}
                        reordering={reordering}
                        isPlanBOpen={expandedPlanB[item.id] || false}
                        onTogglePlanB={handleTogglePlanB}
                        onMoveActivity={handleMoveActivity}
                        onOpenEditActivity={handleOpenEditActivity}
                        onDeleteActivity={handleDeleteActivity}
                        computedSchedule={computedSchedule}
                        stopMeta={stopMeta}
                        onUpdateStopMeta={handleUpdateStopMeta}
                        availableDays={availableDays}
                        onMoveStopToDay={onMoveStopToDay}
                        stopShoppingItems={stopShopping}
                        onToggleShoppingItemStatus={handleToggleShoppingItemStatus}
                        memberNames={memberNames}
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
                    </>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* TabiPlan Floating Scroll Jump Buttons (เลือกวัน / บนสุด / ล่างสุด) */}
      {showScrollJump && (
        <div className="fixed right-3 sm:right-5 bottom-24 z-30 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('itinerary-day-bar');
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              else window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="w-9 h-9 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:bg-blue-700 transition-all cursor-pointer"
            title="เลื่อนไปแถบเลือกวัน & ค้นหา"
          >
            <Calendar className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="w-9 h-9 rounded-full bg-white/90 dark:bg-[#1e2027]/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-blue-600 hover:text-white transition-all cursor-pointer"
            title="เลื่อนกลับขึ้นบนสุด"
          >
            <ArrowUpToLine className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
            }
            className="w-9 h-9 rounded-full bg-white/90 dark:bg-[#1e2027]/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-blue-600 hover:text-white transition-all cursor-pointer"
            title="เลื่อนลงล่างสุด"
          >
            <ArrowDownToLine className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Wishlist & Shopping Bag Drawer Modal */}
      {showWishlistDrawer && (
        <WishlistDrawer
          isOpen={showWishlistDrawer}
          onClose={() => setShowWishlistDrawer(false)}
          tripId={trip?.id}
          selectedDay={selectedDayFilter}
          availableDays={availableDays}
          itinerary={itinerary}
          initialTab={wishlistInitialTab}
          onSyncShoppingExpense={onSyncShoppingExpense}
          onAddToItinerary={(item) => {
            handleOpenAddActivity({
              title: item.title,
              category: item.category,
              location: item.location,
            }, selectedDayFilter === 'all' ? availableDays[0] : selectedDayFilter);
          }}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
});

export default TripPlanTab;
