import React from 'react';
import { 
  Clock, ExternalLink, Utensils, Bus, ChevronUp, 
  ChevronDown, ArrowUp, ArrowDown, Edit3, Trash2, Shield,
  Navigation, Eye, MoreHorizontal, Camera, ZoomIn,
  SkipForward, RotateCcw, ShoppingBag, MessageSquare, Calendar, Plus, Send, Receipt, GripVertical, ThumbsUp
} from 'lucide-react';
import { toast } from 'sonner';
import { parseTransitInfo } from '@/lib/transitGuide';
import {
  isActivityVisited,
  toggleActivityVisited,
  subscribeVisitedStamps,
  getActivityCheckInMeta,
  CheckInMeta,
} from '@/lib/visitedStamps';
import {
  StopSmartMeta,
  ComputedStopSchedule,
  getStopKey,
  getStopMeta,
  updateStopMeta,
  subscribeStopMeta,
  detectStopAmenities,
  detectStationElevatorAndLastTrain,
  toggleStopOptionVote,
} from '@/lib/smartTimeline';
import {
  ShoppingBagItem,
  SHOPPING_CATEGORY_META,
  getShoppingBag,
  getShoppingItemsForStop,
  addShoppingBagItem,
  subscribeShoppingBag,
} from '@/lib/shoppingBag';
import { ShowToStaffModal } from '@/components/trip-detail/ShowToStaffModal';
import {
  CustomPlacePhotoModal,
  PlacePhotoLightboxModal,
} from '@/components/trip-detail/CustomPlacePhotoModal';
import { usePlaceVisualMeta, PlaceVisualMeta } from '@/lib/placeThumbnails';
import { triggerHaptic } from '@/lib/haptics';

function hasMeaningfulText(val?: string | null): boolean {
  const trimmed = (val || '').trim();
  return trimmed.length > 0 && !/^[-–—_•]+$/.test(trimmed);
}

/**
 * One-hand mobile horizontal swipe gesture hook (Swipe Right -> Check-in 済, Swipe Left -> Quick Expense / Navigate).
 * Ignores vertical page scrolling and taps on interactive controls.
 */
function useStopSwipeGesture({
  onSwipeRight,
  onSwipeLeft,
}: {
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
}) {
  const [swipeDx, setSwipeDx] = React.useState(0);
  const touchRef = React.useRef<{ startX: number; startY: number; active: boolean; lockedAxis: 'x' | 'y' | null }>({
    startX: 0,
    startY: 0,
    active: false,
    lockedAxis: null,
  });

  const onTouchStart = React.useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && target.closest('button, a, input, textarea, select')) {
      touchRef.current.active = false;
      return;
    }
    const t = e.touches?.[0];
    if (!t) return;
    touchRef.current = {
      startX: t.clientX,
      startY: t.clientY,
      active: true,
      lockedAxis: null,
    };
  }, []);

  const onTouchMove = React.useCallback((e: React.TouchEvent) => {
    if (!touchRef.current.active) return;
    const t = e.touches?.[0];
    if (!t) return;
    const dx = t.clientX - touchRef.current.startX;
    const dy = t.clientY - touchRef.current.startY;

    if (!touchRef.current.lockedAxis) {
      if (Math.abs(dx) < 14 && Math.abs(dy) < 14) return;
      touchRef.current.lockedAxis = Math.abs(dx) > Math.abs(dy) * 1.3 ? 'x' : 'y';
    }
    if (touchRef.current.lockedAxis !== 'x') return;

    const clamped = Math.max(-88, Math.min(88, Math.round(dx * 0.75)));
    setSwipeDx(clamped);
  }, []);

  const onTouchEnd = React.useCallback(
    (e: React.TouchEvent) => {
      if (!touchRef.current.active) return;
      const t = e.changedTouches?.[0];
      const dx = t ? t.clientX - touchRef.current.startX : swipeDx;
      const axis = touchRef.current.lockedAxis;
      touchRef.current.active = false;
      touchRef.current.lockedAxis = null;
      setSwipeDx(0);

      if (axis === 'x' || Math.abs(dx) >= 64) {
        if (dx >= 64) {
          triggerHaptic('medium');
          onSwipeRight();
        } else if (dx <= -64) {
          triggerHaptic('light');
          onSwipeLeft();
        }
      }
    },
    [onSwipeLeft, onSwipeRight, swipeDx]
  );

  const onTouchCancel = React.useCallback(() => {
    touchRef.current.active = false;
    touchRef.current.lockedAxis = null;
    setSwipeDx(0);
  }, []);

  return {
    swipeDx,
    swipeHandlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel,
    },
  };
}

/**
 * Resilient place image selector: tries visual.imageUrl first, and if it fails
 * (e.g., expired Google Places photoUri or 403 hotlink block), automatically falls
 * back to visual.fallbackImageUrl instead of leaving a blank placeholder banner.
 */
function useResilientPlaceImage(visual: PlaceVisualMeta) {
  const [failedUrls, setFailedUrls] = React.useState<string[]>([]);

  const primaryFailed = failedUrls.includes(visual.imageUrl);
  const fallbackUrl =
    visual.fallbackImageUrl && visual.fallbackImageUrl !== visual.imageUrl
      ? visual.fallbackImageUrl
      : null;
  const fallbackFailed = fallbackUrl ? failedUrls.includes(fallbackUrl) : true;

  const activeSrc = !primaryFailed
    ? visual.imageUrl
    : fallbackUrl && !fallbackFailed
    ? fallbackUrl
    : null;

  const isUsingFallback = Boolean(primaryFailed && activeSrc);

  const handleImgError = React.useCallback(() => {
    if (!activeSrc) return;
    setFailedUrls((prev) => (prev.includes(activeSrc) ? prev : [...prev, activeSrc]));
  }, [activeSrc]);

  return { activeSrc, isUsingFallback, handleImgError };
}

export interface ItineraryStopCardProps {
  item: any;
  idx: number;
  totalItems: number;
  canEditPlan: boolean;
  currentUser?: any;
  reordering: boolean;
  isPlanBOpen: boolean;
  onTogglePlanB: (id: string) => void;
  onMoveActivity: (idx: number, direction: 'up' | 'down') => void;
  onOpenEditActivity: (item: any) => void;
  onDeleteActivity: (id: string) => void;
  // TabiPlan Smart Timeline & Shopping Integrations
  computedSchedule?: ComputedStopSchedule;
  stopMeta?: StopSmartMeta;
  onUpdateStopMeta?: (stopKey: string, patch: Partial<StopSmartMeta>) => void;
  availableDays?: string[];
  onMoveStopToDay?: (item: any, targetDayLabel: string) => void;
  stopShoppingItems?: ShoppingBagItem[];
  onToggleShoppingItemStatus?: (item: ShoppingBagItem) => void;
  memberNames?: string[];
  onLogExpenseForStop?: (item: any) => void;
  focusMode?: boolean;
  defaultShowDetails?: boolean;
}

function useStopVisitedState(item: any, canEditPlan: boolean = true, currentUser?: any) {
  const [visited, setVisited] = React.useState(false);
  const [meta, setMeta] = React.useState<CheckInMeta | null>(null);
  const activityKey = item?.id || item?.main_place || '';
  const tripId = item?.trip_id;

  const syncVisited = React.useCallback(() => {
    if (typeof window !== 'undefined' && activityKey) {
      setVisited(isActivityVisited(tripId, activityKey));
      setMeta(getActivityCheckInMeta(tripId, activityKey));
    }
  }, [tripId, activityKey]);

  React.useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) syncVisited();
    });
    const unsub = subscribeVisitedStamps(syncVisited);
    return () => {
      cancelled = true;
      unsub();
    };
  }, [syncVisited]);

  const toggleVisited = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e && 'stopPropagation' in e) e.stopPropagation();
    if (!activityKey) return;

    if (canEditPlan === false) {
      toast.error('เฉพาะผู้ดูแลหรือสมาชิกทริปเท่านั้นที่สามารถเช็กอินหรือยกเลิกได้');
      return;
    }

    const userName =
      currentUser?.user_metadata?.display_name ||
      currentUser?.user_metadata?.full_name ||
      currentUser?.email?.split('@')[0] ||
      'สมาชิก';

    const willBeVisited = !visited;
    const next = toggleActivityVisited(tripId, activityKey, willBeVisited, {
      userId: currentUser?.id,
      userName: userName,
    });
    setVisited(next);
    setMeta(getActivityCheckInMeta(tripId, activityKey));
    triggerHaptic(next ? 'success' : 'light');

    const placeName = item.main_place || 'กิจกรรมนี้';
    if (next) {
      toast.success(`เช็กอินแล้ว: ${placeName} ✨`, {
        description: `โดย ${userName} (บันทึกและซิงก์ทุกคนในกลุ่ม)`,
        action: {
          label: 'ยกเลิก',
          onClick: () => {
            toggleActivityVisited(tripId, activityKey, false, {
              userId: currentUser?.id,
              userName,
            });
            setVisited(false);
            setMeta(null);
            triggerHaptic('light');
            toast.info(`ยกเลิกเช็กอิน ${placeName} แล้ว ↩️`);
          },
        },
      });
    } else {
      toast.info(`ยกเลิกเช็กอิน ${placeName} แล้ว ↩️`, {
        description: 'คืนค่าสถานะเป็นยังไม่ได้แวะ',
      });
    }
  };

  return { visited, toggleVisited, meta };
}

function buildStopUrls(item: any) {
  const mainPlaceMapsUrl =
    item.main_place_links && item.main_place_links[0]
      ? item.main_place_links[0]
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          item.main_place + ' ' + (item.city || 'Japan')
        )}`;

  const mainPlaceDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    item.main_place + (item.city ? ' ' + item.city : '')
  )}`;

  return { mainPlaceMapsUrl, mainPlaceDirectionsUrl };
}

/**
 * 1. Detailed Card View (Decluttered & Friendly + Real Place Visual Thumbnail)
 */
function ItineraryStopCardComponent({
  item,
  idx,
  totalItems,
  canEditPlan,
  currentUser,
  reordering,
  isPlanBOpen,
  onTogglePlanB,
  onMoveActivity,
  onOpenEditActivity,
  onDeleteActivity,
  computedSchedule,
  stopMeta: propStopMeta,
  onUpdateStopMeta,
  availableDays = [],
  onMoveStopToDay,
  stopShoppingItems: propShoppingItems,
  onToggleShoppingItemStatus,
  onLogExpenseForStop,
  focusMode = false,
  defaultShowDetails = false,
}: ItineraryStopCardProps) {
  const { visited, toggleVisited, meta } = useStopVisitedState(item, canEditPlan, currentUser);
  const [showStaffModal, setShowStaffModal] = React.useState(false);
  const [showCustomPhotoModal, setShowCustomPhotoModal] = React.useState(false);
  const [showLightbox, setShowLightbox] = React.useState(false);
  const [showAdminMenu, setShowAdminMenu] = React.useState(false);
  const [showMoveDayList, setShowMoveDayList] = React.useState(false);
  const [detailsOverride, setDetailsOverride] = React.useState<{
    base: boolean;
    value: boolean;
  } | null>(null);
  const isDetailsOpen =
    detailsOverride && detailsOverride.base === defaultShowDetails
      ? detailsOverride.value
      : defaultShowDetails;
  const setLocalShowDetails = (next: boolean) =>
    setDetailsOverride({ base: defaultShowDetails, value: next });

  // TabiPlan Interactive Panels
  const [showTimeTuner, setShowTimeTuner] = React.useState(false);
  const [showStopShopping, setShowStopShopping] = React.useState(false);
  const [showStopNotes, setShowStopNotes] = React.useState(false);
  const [newNoteText, setNewNoteText] = React.useState('');
  const [quickShopName, setQuickShopName] = React.useState('');
  const [quickShopPrice, setQuickShopPrice] = React.useState('');

  const stopKey = React.useMemo(() => getStopKey(item), [item]);
  const tripId = item?.trip_id || '';

  const [localStopMeta, setLocalStopMeta] = React.useState<StopSmartMeta>(() =>
    propStopMeta !== undefined ? propStopMeta : {}
  );
  const [localShoppingItems, setLocalShoppingItems] = React.useState<ShoppingBagItem[]>(() =>
    propShoppingItems !== undefined ? propShoppingItems : []
  );

  React.useEffect(() => {
    if (!tripId || propStopMeta !== undefined) return;
    let cancelled = false;
    const syncMeta = () => setLocalStopMeta(getStopMeta(tripId, stopKey, item?.main_place));
    queueMicrotask(() => {
      if (!cancelled) syncMeta();
    });
    const unsub = subscribeStopMeta(syncMeta);
    return () => {
      cancelled = true;
      unsub();
    };
  }, [tripId, stopKey, item?.main_place, propStopMeta]);

  React.useEffect(() => {
    if (!tripId || propShoppingItems !== undefined) return;
    let cancelled = false;
    const syncShop = () =>
      setLocalShoppingItems(getShoppingItemsForStop(getShoppingBag(tripId), item));
    queueMicrotask(() => {
      if (!cancelled) syncShop();
    });
    const unsub = subscribeShoppingBag(syncShop);
    return () => {
      cancelled = true;
      unsub();
    };
  }, [tripId, item, propShoppingItems]);

  const activeStopMeta = propStopMeta || localStopMeta;
  const activeShoppingItems = propShoppingItems || localShoppingItems;
  const isSkipped = Boolean(activeStopMeta?.skipped);

  const handlePatchMeta = (patch: Partial<StopSmartMeta>) => {
    if (onUpdateStopMeta) {
      onUpdateStopMeta(stopKey, patch);
    } else if (tripId) {
      updateStopMeta(tripId, stopKey, patch);
    }
  };

  const handleToggleSkip = () => {
    const nextSkipped = !isSkipped;
    handlePatchMeta({
      skipped: nextSkipped,
      skippedAt: nextSkipped ? new Date().toISOString() : undefined,
    });
    triggerHaptic('light');
    if (nextSkipped) {
      toast.info(`ข้ามจุดแวะ "${item.main_place}" ชั่วคราว ⏭️`, {
        description: 'คำนวณเวลาเดินทางและเส้นทาง Google Maps ใหม่โดยไม่นับจุดนี้แล้ว',
      });
    } else {
      toast.success(`นำ "${item.main_place}" กลับเข้าตารางเวลาแล้ว ↩️`);
    }
  };

  const handleAddPinnedNote = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newNoteText.trim();
    if (!trimmed) return;
    const author =
      currentUser?.user_metadata?.display_name ||
      currentUser?.user_metadata?.full_name ||
      currentUser?.email?.split('@')[0] ||
      'สมาชิก';
    const existingNotes = activeStopMeta.pinnedNotes || [];
    const nextNotes = [
      ...existingNotes,
      {
        id: `note-${Date.now()}`,
        author,
        text: trimmed,
        createdAt: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      },
    ];
    handlePatchMeta({ pinnedNotes: nextNotes });
    setNewNoteText('');
    toast.success('ปักหมุดโน้ตไว้ที่จุดแวะนี้แล้ว 💬');
  };

  const handleDeletePinnedNote = (noteId: string) => {
    const existingNotes = activeStopMeta.pinnedNotes || [];
    handlePatchMeta({ pinnedNotes: existingNotes.filter((n) => n.id !== noteId) });
  };

  const handleQuickAddShopping = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickShopName.trim();
    if (!trimmed || !tripId) return;
    const price = parseInt(quickShopPrice, 10) || 1500;
    addShoppingBagItem(tripId, {
      name: trimmed,
      category: 'other',
      estPrice: price,
      quantity: 1,
      store: item.main_place,
      dayLabel: item.date_label,
      stopId: item.id,
      stopName: item.main_place,
      status: 'planned',
      taxFreeEligible: price >= 5000,
    });
    setQuickShopName('');
    setQuickShopPrice('');
    toast.success(`เพิ่ม "${trimmed}" ผูกกับจุดแวะนี้แล้ว 🛍️`);
  };

  const amenities = React.useMemo(
    () => detectStopAmenities(item, activeStopMeta.amenityTags),
    [item, activeStopMeta.amenityTags]
  );

  const { elevatorTip, lastTrainTip } = React.useMemo(
    () => detectStationElevatorAndLastTrain(item, computedSchedule),
    [item, computedSchedule]
  );

  const hasCustomTime = Boolean(
    activeStopMeta.durationMin !== undefined ||
    activeStopMeta.fixedStartTime ||
    activeStopMeta.openTime ||
    activeStopMeta.closeTime
  );

  const visual = usePlaceVisualMeta(item.main_place, item.city, idx, item.id, item.trip_id);
  const { activeSrc, isUsingFallback, handleImgError } = useResilientPlaceImage(visual);
  const transitGuide = React.useMemo(() => parseTransitInfo(item.transport_info), [item.transport_info]);
  const hasTransitNote = hasMeaningfulText(transitGuide.details);
  const hasFoodNote = hasMeaningfulText(item.food_recommendation);
  const hasBackupPlan = hasMeaningfulText(item.backup_plan);
  const { mainPlaceMapsUrl, mainPlaceDirectionsUrl } = React.useMemo(() => buildStopUrls(item), [item]);

  const cleanFoodQuery = React.useMemo(() => {
    if (!item.food_recommendation || item.food_recommendation === '-') return '';
    let text = item.food_recommendation;
    const engMatch = text.match(/[A-Za-z0-9&'\- ]{3,}/);
    if (engMatch && engMatch[0].trim().length > 3) {
      return engMatch[0].trim() + ' ' + (item.city || 'Japan');
    }
    text = text.replace(/^(มื้อกลางวัน|มื้อค่ำ|มื้อเย็น|ทานร้าน|ร้านอาหาร|แวะชิม|นั่งจิบกาแฟที่|นั่งจิบชาและชิมขนมที่|เลือกทานอาหารที่)\s*/i, '');
    const firstPart = text.split(/[,(]/)[0].trim();
    return (firstPart || item.food_recommendation) + ' ' + (item.city || 'Japan');
  }, [item.food_recommendation, item.city]);

  const foodSearchUrl =
    item.food_links && item.food_links[0]
      ? item.food_links[0]
      : cleanFoodQuery
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanFoodQuery)}`
      : '';

  const boughtShopCount = activeShoppingItems.filter((s) => s.status === 'bought').length;
  const pinnedNotesCount = activeStopMeta.pinnedNotes?.length || 0;
  const voterName =
    currentUser?.user_metadata?.display_name || currentUser?.email?.split('@')[0] || 'ฉัน';
  const optionVotes = activeStopMeta.optionVotes || {};

  const handleVoteOption = React.useCallback(
    (optionKey: string, label: string) => {
      if (!tripId) return;
      triggerHaptic('light');
      const nextList = toggleStopOptionVote(tripId, stopKey, optionKey, voterName);
      if (nextList.includes(voterName)) {
        toast.success(`👍 โหวต "${label}" แล้ว (${nextList.length} เสียง)`);
      }
    },
    [tripId, stopKey, voterName]
  );

  const { swipeDx, swipeHandlers } = useStopSwipeGesture({
    onSwipeRight: toggleVisited,
    onSwipeLeft: () => {
      if (onLogExpenseForStop) {
        onLogExpenseForStop(item);
      } else if (typeof window !== 'undefined' && mainPlaceDirectionsUrl) {
        window.open(mainPlaceDirectionsUrl, '_blank', 'noopener,noreferrer');
      }
    },
  });

  return (
    <>
      <div
        data-swipeable-card="true"
        {...swipeHandlers}
        style={
          swipeDx !== 0
            ? { transform: `translate3d(${swipeDx}px, 0, 0)` }
            : idx > 2 && !showAdminMenu
            ? { contentVisibility: 'auto', containIntrinsicSize: '0 320px' }
            : undefined
        }
        className={`group rounded-2xl border transition-all duration-300 relative ${
          showAdminMenu ? 'overflow-visible z-30' : 'overflow-hidden'
        } ${
          isSkipped
            ? 'border-dashed border-[#cbd5e1] dark:border-[#334155] bg-white/70 dark:bg-[#161c27]/60 opacity-65'
            : visited
            ? 'border-[#bae6fd] dark:border-emerald-700/50 border-l-4 border-l-[#0284c7] dark:border-l-emerald-400 bg-white dark:bg-[#161c27] shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_24px_-4px_rgba(4,9,20,0.55)]'
            : 'border-[#e2e8f0] dark:border-[#24324a] border-l-4 border-l-[#2563eb] dark:border-l-[#4cd7f6] bg-white dark:bg-[#161c27] shadow-[0_4px_18px_-4px_rgba(15,23,42,0.06)] hover:shadow-[0_10px_28px_-6px_rgba(37,99,235,0.14)] dark:shadow-[0_8px_28px_-4px_rgba(4,9,20,0.55)] dark:hover:border-[#4cd7f6]/40'
        }`}
      >
        <div className="relative z-10 bg-white dark:bg-[#161c27] rounded-2xl">
          {/* Skipped Stop Banner */}
          {isSkipped && (
            <div className="px-4 py-2 bg-[#f1f5f9] dark:bg-[#080e19]/80 border-b border-[#e2e8f0] dark:border-[#24324a] rounded-t-2xl flex items-center justify-between gap-2 text-xs">
              <span className="font-bold text-[#475569] dark:text-[#94a3b8] flex items-center gap-1.5">
                <SkipForward className="h-3.5 w-3.5 text-[#2563eb] dark:text-[#4cd7f6]" />
                <span>ข้ามจุดแวะนี้ชั่วคราว (ไม่นับรวมในเวลาและเส้นทางนำทาง)</span>
              </span>
              <button
                type="button"
                onClick={handleToggleSkip}
                className="px-2.5 py-1 rounded-lg bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer shrink-0"
              >
                <RotateCcw className="h-3 w-3" />
                <span>คืนค่าเข้าแผน</span>
              </button>
            </div>
          )}

          {/* Clean Editorial 16:9 Media Strip (Photography stays clean; title moves to solid card surface below) */}
          <div
            onClick={() => setShowLightbox(true)}
            className={`relative w-full h-32 sm:h-40 bg-gradient-to-br from-[#081326] to-[#1e3a8a] flex flex-col justify-between p-3 sm:p-3.5 cursor-zoom-in ${
              isSkipped ? '' : 'rounded-t-2xl'
            }`}
            title="แตะเพื่อขยายดูรูปสถานที่จริง / ดูหน้าร้าน Street View"
          >
            {/* Background Media Layer (clipped cleanly while dropdowns remain unclipped) */}
            <div className={`absolute inset-0 overflow-hidden pointer-events-none ${isSkipped ? '' : 'rounded-t-2xl'}`}>
              {/* Decorative oceanic wave fallback background */}
              <svg
                className="absolute inset-0 w-full h-full opacity-25 pointer-events-none"
                viewBox="0 0 400 200"
                preserveAspectRatio="none"
              >
                <path d="M0,80 C120,40 220,120 400,60 L400,200 L0,200 Z" fill="#1d4ed8" />
                <path d="M0,130 C150,90 260,170 400,110 L400,200 L0,200 Z" fill="#080e19" />
              </svg>

              {activeSrc && (
                <img
                  src={activeSrc}
                  alt={item.main_place || 'Destination'}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={handleImgError}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              )}

              {/* Oceanic Glacial Vignette for badge legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#080e19]/80 via-transparent to-[#080e19]/40 pointer-events-none" />
            </div>

            {/* Top Row Overlay: Editorial Tag (Left) + Stamp Check-in & Menu (Right) */}
            <div
              className="relative z-20 flex items-start justify-between gap-2 w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
                <span className="px-2.5 py-0.5 rounded-full bg-[#080e19]/80 backdrop-blur-md border border-[#4cd7f6]/25 text-[#acedff] font-mono text-[10px] font-bold tracking-wider uppercase shadow-2xs">
                  STOP {String(idx + 1).padStart(2, '0')} / {visual.tagLabel}
                </span>
                {visual.isCustomPhoto && !isUsingFallback && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600/90 text-white text-[9px] font-bold backdrop-blur-xs">
                    ✨ รูปของฉัน
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0 relative">
                {/* Oceanic Stamp / Check-in Button */}
                <button
                  type="button"
                  onClick={toggleVisited}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer active:scale-95 ${
                    visited
                      ? 'bg-[#e0f2fe]/95 dark:bg-[#080e19]/90 text-[#0369a1] dark:text-[#4cd7f6] border border-[#0284c7] dark:border-[#4cd7f6] shadow-xs'
                      : 'bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] hover:from-[#1e40af] hover:to-[#1d4ed8] text-white border border-white/20 shadow-xs'
                  }`}
                  title={visited ? 'คลิกเพื่อยกเลิกสถานะเช็กอิน (คืนค่าเดิม)' : 'ประทับตราเช็กอิน ⛩️'}
                >
                  <span>{visited ? `VISITED ${meta?.at || '済'}` : 'CHECK-IN'}</span>
                </button>

                {/* Change Photo Quick Button */}
                <button
                  type="button"
                  onClick={() => setShowCustomPhotoModal(true)}
                  className="p-1.5 rounded-[4px] bg-black/55 hover:bg-black/80 text-white border border-white/25 backdrop-blur-xs cursor-pointer transition-colors"
                  title="เปลี่ยนรูปสถานที่ (เลือกรูป Google Maps / อัปโหลด PNG)"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>

                {/* Decluttered Stop Action & Admin Menu Button (hidden in On-Trip Focus Mode) */}
                {!focusMode && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminMenu((v) => !v);
                      setShowMoveDayList(false);
                    }}
                    className="p-1.5 rounded-[4px] bg-black/55 hover:bg-black/80 text-white border border-white/25 backdrop-blur-xs cursor-pointer transition-colors"
                    title="ตัวเลือกเพิ่มเติม (ปรับเวลาแวะ / ของต้องซื้อ / โน้ตกลุ่ม / จัดการจุดแวะ)"
                    aria-label="ตัวเลือกเพิ่มเติม"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>

                  {showAdminMenu && (
                    <div className="absolute right-0 top-9 z-30 w-56 rounded-xl bg-white dark:bg-[#1a202c] border border-[#e2e8f0] dark:border-[#24324a] shadow-xl p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAdminMenu(false);
                          setShowTimeTuner((v) => !v);
                        }}
                        className="w-full px-3 py-2 rounded-lg text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 flex items-center gap-2 cursor-pointer"
                      >
                        <Clock className="h-3.5 w-3.5 text-indigo-500" />
                        <span>ปรับเวลาแวะ / เวลาเปิด-ปิดร้าน</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowAdminMenu(false);
                          setShowStopShopping((v) => !v);
                        }}
                        className="w-full px-3 py-2 rounded-lg text-xs font-bold text-fuchsia-700 dark:text-fuchsia-300 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-950/50 flex items-center gap-2 cursor-pointer"
                      >
                        <ShoppingBag className="h-3.5 w-3.5 text-fuchsia-500" />
                        <span>
                          ของต้องซื้อจุดนี้
                          {activeShoppingItems.length > 0
                            ? ` (${boughtShopCount}/${activeShoppingItems.length})`
                            : ''}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowAdminMenu(false);
                          setShowStopNotes((v) => !v);
                        }}
                        className="w-full px-3 py-2 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 flex items-center gap-2 cursor-pointer"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
                        <span>
                          โน้ตกลุ่มปักหมุด{pinnedNotesCount > 0 ? ` (${pinnedNotesCount})` : ''}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowAdminMenu(false);
                          handleToggleSkip();
                        }}
                        className="w-full px-3 py-2 rounded-lg text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 flex items-center gap-2 cursor-pointer"
                      >
                        <SkipForward className="h-3.5 w-3.5 text-amber-500" />
                        <span>{isSkipped ? 'คืนค่าเข้าตารางเที่ยว' : 'ข้ามจุดแวะนี้ชั่วคราว'}</span>
                      </button>

                      {canEditPlan && (
                        <>
                          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                          {availableDays.length > 1 && onMoveStopToDay && (
                            <div>
                              <button
                                type="button"
                                onClick={() => setShowMoveDayList((v) => !v)}
                                className="w-full px-3 py-2 rounded-lg text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 flex items-center justify-between gap-2 cursor-pointer"
                              >
                                <span className="flex items-center gap-2">
                                  <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                                  <span>ย้ายไปวันอื่น...</span>
                                </span>
                                <ChevronDown className="h-3.5 w-3.5" />
                              </button>
                              {showMoveDayList && (
                                <div className="pl-3 pr-1 py-1 space-y-0.5 max-h-40 overflow-y-auto border-l-2 border-indigo-200 dark:border-indigo-800 ml-3 my-1">
                                  {availableDays
                                    .filter((d) => d !== item.date_label)
                                    .map((dayLabel) => (
                                      <button
                                        key={dayLabel}
                                        type="button"
                                        onClick={() => {
                                          setShowAdminMenu(false);
                                          setShowMoveDayList(false);
                                          onMoveStopToDay(item, dayLabel);
                                        }}
                                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 truncate cursor-pointer"
                                      >
                                        ➔ {dayLabel}
                                      </button>
                                    ))}
                                </div>
                              )}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setShowAdminMenu(false);
                              setShowCustomPhotoModal(true);
                            }}
                            className="w-full px-3 py-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-600 flex items-center gap-2 cursor-pointer"
                          >
                            <Camera className="h-3.5 w-3.5 text-emerald-500" />
                            <span>เปลี่ยนรูปสถานที่</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAdminMenu(false);
                              onOpenEditActivity(item);
                            }}
                            className="w-full px-3 py-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 flex items-center gap-2 cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-blue-500" />
                            <span>แก้ไขรายละเอียด</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAdminMenu(false);
                              onMoveActivity(idx, 'up');
                            }}
                            disabled={idx === 0 || reordering}
                            className="w-full px-3 py-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#253048] flex items-center gap-2 disabled:opacity-40 cursor-pointer"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                            <span>เลื่อนขึ้น</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAdminMenu(false);
                              onMoveActivity(idx, 'down');
                            }}
                            disabled={idx === totalItems - 1 || reordering}
                            className="w-full px-3 py-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#253048] flex items-center gap-2 disabled:opacity-40 cursor-pointer"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                            <span>เลื่อนลง</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAdminMenu(false);
                              onDeleteActivity(item.id);
                            }}
                            className="w-full px-3 py-2 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center gap-2 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>ลบกิจกรรมนี้</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                )}
              </div>
            </div>

            {/* Bottom Minimal City Pill inside Hero Media */}
            <div className="relative z-10 flex items-center justify-between gap-2 w-full pointer-events-none">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/55 backdrop-blur-xs text-[11px] font-semibold text-white/95 border border-white/15 max-w-full truncate">
                <span>{visual.emoji}</span>
                <span className="truncate">{item.city || 'Japan'}</span>
                {item.date_label && <span className="text-white/75 shrink-0">· {item.date_label}</span>}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/45 backdrop-blur-xs text-[10px] font-medium text-white/80 shrink-0">
                <ZoomIn className="h-3 w-3" />
                <span>แตะดูรูป</span>
              </span>
            </div>
          </div>

          {/* Editorial Main Card Body */}
          <div className="p-4 sm:p-5 space-y-3.5">
            {/* Clean Solid Editorial Place Title Header (High-contrast & 100% overlap-proof on all screens) */}
            <div className="space-y-1.5 text-left" onClick={(e) => e.stopPropagation()}>
              <a
                href={mainPlaceMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="font-serif text-base sm:text-xl font-bold text-[#0f172a] dark:text-[#f8fafc] hover:text-[#2563eb] dark:hover:text-[#4cd7f6] inline-flex items-baseline gap-1.5 transition-colors cursor-pointer leading-snug break-words max-w-full"
              >
                <span className="min-w-0 break-words">{item.main_place}</span>
                <ExternalLink className="h-3.5 w-3.5 text-[#64748b] dark:text-[#7bd0ff] shrink-0 self-center" />
              </a>
              {visited && meta?.by && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 font-semibold text-[10px]">
                    ✓ เช็กอินโดย {meta.by}
                  </span>
                </div>
              )}
            </div>

            {/* Oceanic Timing & Schedule Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#e2e8f0] dark:border-[#24324a]">
              <div className="flex items-center gap-2 flex-wrap">
                {item.time_slot && (
                  <span className="font-mono tabular-nums lining-nums text-base sm:text-lg font-bold text-[#1d4ed8] dark:text-[#4cd7f6] tracking-tight">
                    {item.time_slot.replace('-', ' — ')}
                  </span>
                )}

                {!isSkipped && computedSchedule && (
                  <button
                    type="button"
                    onClick={() => setShowTimeTuner((v) => !v)}
                    className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-[#475569] dark:text-[#c3c6d7] bg-[#f1f5f9] dark:bg-[#080e19] px-2.5 py-0.5 rounded-full border border-[#e2e8f0] dark:border-[#24324a] hover:border-[#2563eb] dark:hover:border-[#4cd7f6] transition-colors cursor-pointer"
                    title="แตะเพื่อปรับเวลาแวะพัก / เวลานัดหมาย / เวลาเปิด-ปิดร้าน (คำนวณไหลอัตโนมัติ)"
                  >
                    <span>
                      {!item.time_slot
                        ? `${computedSchedule.arriveTime} — ${computedSchedule.leaveTime} `
                        : ''}
                      ({computedSchedule.durationMin} นาที)
                    </span>
                  </button>
                )}

                {!isSkipped && computedSchedule && computedSchedule.waitMin > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/60">
                    ⏱️ รอคิว/รอเปิด ~{computedSchedule.waitMin} น.
                  </span>
                )}

                {!isSkipped && computedSchedule && computedSchedule.lateMin > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-[#ffb4ab] bg-rose-50 dark:bg-rose-950/50 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800/60 animate-pulse">
                    ⚠️ {computedSchedule.lateReason || `สาย ${computedSchedule.lateMin} นาที!`}
                  </span>
                )}
              </div>

              {/* Right Pill: Platform / Live Transit Check */}
              {transitGuide.hasGuide && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                    item.main_place + ' ' + (item.city || 'Japan')
                  )}&travelmode=transit`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#eff6ff] dark:bg-[#080e19] text-[#1d4ed8] dark:text-[#4cd7f6] border border-[#bfdbfe] dark:border-[#4cd7f6]/25 text-[11px] font-semibold hover:bg-[#dbeafe] dark:hover:bg-[#1a202c] transition-colors shrink-0"
                >
                  <span>🚉 {transitGuide.platform ? `ชานชาลา ${transitGuide.platform}` : 'เช็กชานชาลาสด'}</span>
                  <ExternalLink className="h-2.5 w-2.5 opacity-75" />
                </a>
              )}
            </div>

            {/* Progressive Disclosure Summary Bar (keeps cards airy & scannable; tap to reveal notes/tips/amenities) */}
            {(() => {
              const hasCollapsibleInfo = Boolean(
                hasTransitNote ||
                  hasFoodNote ||
                  amenities.length > 0 ||
                  elevatorTip ||
                  lastTrainTip ||
                  transitGuide.bestTip ||
                  hasCustomTime ||
                  activeShoppingItems.length > 0 ||
                  pinnedNotesCount > 0 ||
                  hasBackupPlan
              );
              if (!hasCollapsibleInfo) return null;

              const detailChips: string[] = [];
              if (hasTransitNote) detailChips.push('🚌 เส้นทาง');
              if (hasFoodNote) detailChips.push('🍜 ร้านแนะนำ');
              if (amenities.length > 0) detailChips.push(`✨ ${amenities.length} แท็ก`);
              if (elevatorTip || lastTrainTip) detailChips.push('🚇 ทิปสถานี');
              if (activeShoppingItems.length > 0) detailChips.push(`🛍️ ช้อป ${boughtShopCount}/${activeShoppingItems.length}`);
              if (hasBackupPlan) detailChips.push('🛡️ Plan B');

              return (
                <div className="space-y-2.5 text-left">
                  <button
                    type="button"
                    onClick={() => setLocalShowDetails(!isDetailsOpen)}
                    aria-expanded={isDetailsOpen}
                    className={`w-full px-3 py-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isDetailsOpen
                        ? 'bg-[#eff6ff] dark:bg-[#080e19] border-[#bfdbfe] dark:border-[#4cd7f6]/35 text-[#1d4ed8] dark:text-[#4cd7f6]'
                        : 'bg-[#f8fafc] dark:bg-[#080e19]/65 border-[#e2e8f0] dark:border-[#24324a] hover:border-[#2563eb]/50 dark:hover:border-[#4cd7f6]/40 text-[#475569] dark:text-[#94a3b8]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      {detailChips.slice(0, 4).map((chip) => (
                        <span
                          key={chip}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-[#161c27] border border-[#e2e8f0] dark:border-[#24324a] text-[#334155] dark:text-[#c3c6d7]"
                        >
                          {chip}
                        </span>
                      ))}
                      {detailChips.length > 4 && (
                        <span className="text-[10px] font-mono font-bold text-[#64748b] dark:text-[#94a3b8]">
                          +{detailChips.length - 4}
                        </span>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold shrink-0 text-[#1d4ed8] dark:text-[#4cd7f6]">
                      <span>{isDetailsOpen ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียด'}</span>
                      {isDetailsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </span>
                  </button>

                  {isDetailsOpen && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                      {/* Oceanic Pills Container (Amenities, Elevator, Last Train & Smart Badges) */}
                      {(amenities.length > 0 ||
                        elevatorTip ||
                        lastTrainTip ||
                        transitGuide.bestTip ||
                        hasCustomTime ||
                        isSkipped ||
                        activeShoppingItems.length > 0 ||
                        pinnedNotesCount > 0 ||
                        showTimeTuner ||
                        showStopShopping ||
                        showStopNotes) && (
                        <div className="space-y-2 text-left">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {transitGuide.bestTip && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#eff6ff] dark:bg-[#2563eb]/20 border border-[#bfdbfe] dark:border-[#3b82f6]/35 text-[#1d4ed8] dark:text-[#b4c5ff]">
                                <span>✨ {transitGuide.bestTip}</span>
                              </span>
                            )}

                            {amenities.map((tag) => (
                              <span
                                key={tag.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#f1f5f9] dark:bg-[#080e19]/80 border border-[#e2e8f0] dark:border-[#24324a] text-[#334155] dark:text-[#c3c6d7]"
                              >
                                <span>{tag.emoji}</span>
                                <span>{tag.label}</span>
                              </span>
                            ))}

                            {(hasCustomTime || showTimeTuner) && (
                              <button
                                type="button"
                                onClick={() => setShowTimeTuner((v) => !v)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                                  showTimeTuner
                                    ? 'bg-[#2563eb] text-white border-[#2563eb]'
                                    : 'bg-[#f1f5f9] dark:bg-[#080e19] text-[#334155] dark:text-[#c3c6d7] border-[#e2e8f0] dark:border-[#24324a]'
                                }`}
                              >
                                <Clock className="h-3 w-3" />
                                <span>
                                  เวลาแวะ ({activeStopMeta.durationMin ?? computedSchedule?.durationMin ?? 90}น.)
                                </span>
                              </button>
                            )}

                            {(activeShoppingItems.length > 0 || showStopShopping) && (
                              <button
                                type="button"
                                onClick={() => setShowStopShopping((v) => !v)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer bg-[#e0f2fe] dark:bg-[#03b5d3]/20 text-[#0369a1] dark:text-[#4cd7f6] border-[#bae6fd] dark:border-[#4cd7f6]/30"
                              >
                                <ShoppingBag className="h-3 w-3" />
                                <span>
                                  ของต้องซื้อ ({boughtShopCount}/{activeShoppingItems.length})
                                </span>
                              </button>
                            )}

                            {(pinnedNotesCount > 0 || showStopNotes) && (
                              <button
                                type="button"
                                onClick={() => setShowStopNotes((v) => !v)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer bg-[#f1f5f9] dark:bg-[#080e19] text-[#334155] dark:text-[#c3c6d7] border-[#e2e8f0] dark:border-[#24324a]"
                              >
                                <MessageSquare className="h-3 w-3" />
                                <span>โน้ตกลุ่ม ({pinnedNotesCount})</span>
                              </button>
                            )}
                          </div>

                          {elevatorTip && (
                            <div className="px-3 py-2 rounded-xl bg-[#f0f9ff] dark:bg-sky-950/35 border border-[#bae6fd] dark:border-[#38bdf8]/25 text-[11px] font-medium text-[#0c4a6e] dark:text-[#bae6fd] leading-relaxed">
                              {elevatorTip}
                            </div>
                          )}

                          {lastTrainTip && (
                            <div className="px-3 py-2 rounded-xl bg-[#eff6ff] dark:bg-indigo-950/40 border border-[#bfdbfe] dark:border-indigo-700/50 text-[11px] font-semibold text-[#1e3a8a] dark:text-[#b4c5ff] leading-relaxed">
                              {lastTrainTip}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Recessed Oceanic Telemetry Note Box (Transit Details + Food Recommendation) */}
                      {(hasTransitNote || hasFoodNote) && (
                        <div className="bg-[#f8fafc] dark:bg-[#080e19]/80 border border-[#e2e8f0] dark:border-[#24324a] border-l-2 border-l-[#2563eb] dark:border-l-[#4cd7f6] rounded-xl p-3.5 space-y-2.5 text-left">
                          {hasTransitNote && (
                            <div>
                              <div className="text-[10px] font-mono font-bold tracking-widest text-[#1d4ed8] dark:text-[#4cd7f6] uppercase mb-0.5">
                                Transit & Route Note
                              </div>
                              <p className="text-xs text-[#334155] dark:text-[#dde2f3] leading-relaxed selectable-text">
                                {transitGuide.details}
                              </p>
                            </div>
                          )}

                          {hasFoodNote && (() => {
                            const foodOptions = String(item.food_recommendation || '')
                              .split(/[,/\n•]+/)
                              .map((s) => s.trim())
                              .filter((s) => s.length > 1);
                            const maxFoodVotes = Math.max(
                              0,
                              ...foodOptions.map((_, fIdx) => (optionVotes[`food:${fIdx}`] || []).length)
                            );
                            return (
                              <div className={hasTransitNote ? 'pt-2.5 border-t border-[#e2e8f0] dark:border-[#24324a]' : ''}>
                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                  <span className="text-[10px] font-mono font-bold tracking-widest text-[#0284c7] dark:text-[#7bd0ff] uppercase">
                                    Traveler’s Note · ร้านแนะนำ
                                  </span>
                                  {foodSearchUrl && (
                                    <a
                                      href={foodSearchUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#1e3a8a] hover:bg-[#1d4ed8] dark:bg-[#2563eb] dark:hover:bg-[#3b82f6] text-white transition-all shrink-0 cursor-pointer"
                                    >
                                      <span>แผนที่ร้าน 📍</span>
                                      <ExternalLink className="h-2.5 w-2.5 opacity-80" />
                                    </a>
                                  )}
                                </div>
                                <p className="text-xs text-[#334155] dark:text-[#dde2f3] leading-relaxed selectable-text">
                                  {item.food_recommendation}
                                </p>
                                {foodOptions.length > 0 && (
                                  <div className="flex items-center gap-1.5 flex-wrap pt-2">
                                    {foodOptions.map((opt, fIdx) => {
                                      const optKey = `food:${fIdx}`;
                                      const votes = optionVotes[optKey] || [];
                                      const votedByMe = votes.includes(voterName);
                                      const isTopChoice =
                                        votes.length > 0 &&
                                        votes.length === maxFoodVotes &&
                                        foodOptions.length > 1;
                                      return (
                                        <button
                                          key={optKey}
                                          type="button"
                                          aria-label={`โหวตร้าน ${opt}`}
                                          onClick={() => handleVoteOption(optKey, opt)}
                                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer active:scale-95 ${
                                            votedByMe
                                              ? 'bg-[#2563eb] text-white border-[#2563eb] shadow-2xs'
                                              : 'bg-white dark:bg-[#161c27] text-[#334155] dark:text-[#c3c6d7] border-[#cbd5e1] dark:border-[#24324a] hover:border-[#2563eb]'
                                          }`}
                                        >
                                          <ThumbsUp className="h-2.5 w-2.5" />
                                          <span className="truncate max-w-[140px]">{opt}</span>
                                          <span className="font-mono">({votes.length})</span>
                                          {isTopChoice && (
                                            <span className="px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 text-[9px] font-black">
                                              🏆 อันดับ 1
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Backup Plan (Plan B) — Shown when details expanded OR when Rainy Day Mode / Plan B toggled open */}
            {hasBackupPlan && (isDetailsOpen || isPlanBOpen) && (
              <div className="pt-0.5 text-left">
                <button
                  type="button"
                  onClick={() => onTogglePlanB(item.id)}
                  className="text-xs font-bold text-[#334155] dark:text-[#c3c6d7] inline-flex items-center gap-1.5 hover:text-[#2563eb] dark:hover:text-[#4cd7f6] transition-colors cursor-pointer"
                >
                  <div className="w-5 h-5 rounded-md bg-[#eff6ff] dark:bg-[#080e19] border border-[#bfdbfe] dark:border-[#4cd7f6]/30 flex items-center justify-center text-[#2563eb] dark:text-[#4cd7f6]">
                    <Shield className="h-3 w-3" />
                  </div>
                  <span>แผนสำรอง (Plan B)</span>
                  {isPlanBOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                {isPlanBOpen && (
                  <div className="p-3.5 mt-2 rounded-xl bg-[#f8fafc] dark:bg-[#080e19]/90 text-xs text-[#334155] dark:text-[#dde2f3] space-y-2 border border-[#dbeafe] dark:border-[#24324a] text-left">
                    <div className="text-[10px] font-mono font-bold tracking-widest uppercase text-[#0284c7] dark:text-[#7bd0ff] text-left">
                      Backup Spots & Dining
                    </div>
                    <div className="space-y-1.5">
                      {(() => {
                        const backupLines = item.backup_plan
                          .split('\n')
                          .filter((line: string) => line.trim().length > 0);
                        const maxPlanBVotes = Math.max(
                          0,
                          ...backupLines.map((_: string, bIdx: number) => (optionVotes[`planb:${bIdx}`] || []).length)
                        );
                        return backupLines.map((line: string, lineIdx: number) => {
                          let cleanName = line
                            .replace(/^(ร้านอาหารสำรอง|สถานที่สำรอง|จุดเที่ยวสำรอง|แผนสำรอง|\d+[\).:-]|\*|•)\s*/i, '')
                            .trim();
                          if (cleanName.includes(':')) {
                            cleanName = cleanName.split(':')[1].trim();
                          }

                          const lineMapsUrl =
                            item.backup_links && item.backup_links[lineIdx]
                              ? item.backup_links[lineIdx]
                              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                  cleanName + ' ' + (item.city || 'Japan')
                                )}`;
                          const optKey = `planb:${lineIdx}`;
                          const votes = optionVotes[optKey] || [];
                          const votedByMe = votes.includes(voterName);
                          const isTopPlanB =
                            votes.length > 0 &&
                            votes.length === maxPlanBVotes &&
                            backupLines.length > 1;

                          return (
                            <div
                              key={lineIdx}
                              className="p-2.5 rounded-lg bg-white dark:bg-[#161c27] border border-[#e2e8f0] dark:border-[#24324a] flex flex-wrap items-center justify-between gap-2 hover:border-[#2563eb] dark:hover:border-[#4cd7f6]/50 transition-all text-left"
                            >
                              <div className="flex items-center gap-1.5 flex-1 min-w-0 flex-wrap">
                                <span className="font-medium text-[#0f172a] dark:text-[#dde2f3] leading-relaxed text-left">
                                  {line}
                                </span>
                                {isTopPlanB && (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-400/30 text-[10px] font-black">
                                    🏆 เพื่อนโหวตอันดับ 1
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  aria-label={`โหวตแผนสำรอง ${cleanName || line}`}
                                  onClick={() => handleVoteOption(optKey, cleanName || line)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer active:scale-95 ${
                                    votedByMe
                                      ? 'bg-[#2563eb] text-white border-[#2563eb]'
                                      : 'bg-[#f8fafc] dark:bg-[#080e19] text-[#334155] dark:text-[#c3c6d7] border-[#cbd5e1] dark:border-[#24324a] hover:border-[#2563eb]'
                                  }`}
                                >
                                  <ThumbsUp className="h-3 w-3" />
                                  <span className="font-mono">{votes.length}</span>
                                </button>
                                <a
                                  href={lineMapsUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#eff6ff] dark:bg-[#080e19] text-[#1d4ed8] dark:text-[#4cd7f6] border border-[#bfdbfe] dark:border-[#4cd7f6]/25 hover:bg-[#2563eb] hover:text-white transition-all shrink-0 cursor-pointer"
                                >
                                  <span>แผนที่ 📍</span>
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Interactive Drawers (Time Tuner, Shopping, Group Notes) */}
            {(showTimeTuner || showStopShopping || showStopNotes) && (
              <div className="pt-2 border-t border-[#e2e8f0] dark:border-[#1a202c] space-y-2 text-left">

            {/* 1. Smart Cascade Time Tuner Drawer */}
            {showTimeTuner && (
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/25 border border-indigo-200/80 dark:border-indigo-800/50 space-y-3 text-xs animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="font-black text-indigo-900 dark:text-indigo-200">
                    ⚡ ตั้งค่าเวลาแวะ & คำนวณตารางไหลอัตโนมัติ (Smart Cascade)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowTimeTuner(false)}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    ปิด
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    เวลาที่ใช้ในจุดนี้ (นาที):
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[30, 45, 60, 90, 120, 150, 180].map((mins) => {
                      const activeDur =
                        activeStopMeta.durationMin ?? computedSchedule?.durationMin ?? 90;
                      return (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => handlePatchMeta({ durationMin: mins })}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-black border cursor-pointer transition-all ${
                            activeDur === mins
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white dark:bg-[#1a202c] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {mins} นาที
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      เวลานัดจอง (ถ้ามี)
                    </label>
                    <input
                      type="time"
                      value={activeStopMeta.fixedStartTime || ''}
                      onChange={(e) =>
                        handlePatchMeta({ fixedStartTime: e.target.value || undefined })
                      }
                      className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-[#1a202c] border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      เวลาเปิดร้าน
                    </label>
                    <input
                      type="time"
                      value={activeStopMeta.openTime || ''}
                      onChange={(e) => handlePatchMeta({ openTime: e.target.value || undefined })}
                      className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-[#1a202c] border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      เวลาปิดร้าน
                    </label>
                    <input
                      type="time"
                      value={activeStopMeta.closeTime || ''}
                      onChange={(e) => handlePatchMeta({ closeTime: e.target.value || undefined })}
                      className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-[#1a202c] border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      ค่ารถไปจุดถัดไป (¥)
                    </label>
                    <input
                      type="number"
                      placeholder="เช่น 240"
                      value={activeStopMeta.fareToNext ?? ''}
                      onChange={(e) =>
                        handlePatchMeta({
                          fareToNext: e.target.value ? parseInt(e.target.value, 10) : undefined,
                        })
                      }
                      className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-[#1a202c] border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. Stop-Linked Shopping Bag Drawer */}
            {showStopShopping && (
              <div className="p-3.5 rounded-2xl bg-fuchsia-50/60 dark:bg-fuchsia-950/20 border border-fuchsia-200/80 dark:border-fuchsia-800/50 space-y-2.5 text-xs animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="font-black text-fuchsia-900 dark:text-fuchsia-200 flex items-center gap-1.5">
                    <ShoppingBag className="h-3.5 w-3.5 text-fuchsia-600" />
                    <span>รายการของต้องซื้อที่จุดแวะนี้ (ติ๊กแล้วตัดงบอัตโนมัติ)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowStopShopping(false)}
                    className="text-[11px] font-bold text-fuchsia-600 dark:text-fuchsia-400 hover:underline cursor-pointer"
                  >
                    ปิด
                  </button>
                </div>

                {activeShoppingItems.length === 0 ? (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    ยังไม่มีรายการของต้องซื้อผูกกับจุดนี้ เพิ่มด่วนด้านล่างได้เลย!
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {activeShoppingItems.map((shopItem) => {
                      const isBought = shopItem.status === 'bought';
                      const catMeta = SHOPPING_CATEGORY_META[shopItem.category] || SHOPPING_CATEGORY_META.other;
                      return (
                        <div
                          key={shopItem.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                            isBought
                              ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/60'
                              : 'bg-white dark:bg-[#1a202c] border-slate-200/80 dark:border-[#24324a]'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{catMeta.emoji}</span>
                              <span
                                className={`font-black text-xs ${
                                  isBought
                                    ? 'line-through text-slate-500 dark:text-slate-400'
                                    : 'text-slate-900 dark:text-white'
                                }`}
                              >
                                {shopItem.name}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-fuchsia-700 dark:text-fuchsia-300 bg-fuchsia-100/70 dark:bg-fuchsia-900/40 px-1.5 py-0.2 rounded">
                                ¥{(shopItem.actualPrice ?? shopItem.estPrice).toLocaleString()} × {shopItem.quantity || 1}
                              </span>
                              {shopItem.taxFreeEligible && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-600 dark:text-rose-300">
                                  Tax-Free
                                </span>
                              )}
                            </div>
                            {shopItem.note && (
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                💡 {shopItem.note}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => onToggleShoppingItemStatus?.(shopItem)}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-black shrink-0 cursor-pointer transition-all ${
                              isBought
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-fuchsia-600 hover:text-white'
                            }`}
                          >
                            {isBought ? '✓ ซื้อแล้ว' : 'ติ๊กซื้อแล้ว'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <form onSubmit={handleQuickAddShopping} className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    placeholder="เพิ่มของต้องซื้อที่จุดนี้..."
                    value={quickShopName}
                    onChange={(e) => setQuickShopName(e.target.value)}
                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#1a202c] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                  <input
                    type="number"
                    placeholder="¥ ราคา"
                    value={quickShopPrice}
                    onChange={(e) => setQuickShopPrice(e.target.value)}
                    className="w-20 px-2 py-1.5 rounded-xl bg-white dark:bg-[#1a202c] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black text-xs inline-flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>เพิ่ม</span>
                  </button>
                </form>
              </div>
            )}

            {/* 3. Stop-Pinned Group Chat Drawer */}
            {showStopNotes && (
              <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/50 space-y-3 text-xs animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                    <span>โน้ตปักหมุดจุดแวะนี้</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowStopNotes(false)}
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    ปิด
                  </button>
                </div>

                {/* Pinned Notes List */}
                <div className="space-y-1.5">
                  {(activeStopMeta.pinnedNotes || []).map((note) => (
                    <div
                      key={note.id}
                      className="p-2.5 rounded-xl bg-white dark:bg-[#1a202c] border border-slate-200/80 dark:border-[#24324a] flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-[11px] text-emerald-700 dark:text-emerald-400">
                            {note.author}
                          </span>
                          <span className="text-[10px] text-slate-400">{note.createdAt}</span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-200 mt-0.5 break-words">
                          {note.text}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeletePinnedNote(note.id)}
                        className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                        title="ลบโน้ต"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddPinnedNote} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="ฝากโน้ต/จุดนัดพบไว้ที่สถานที่นี้..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#1a202c] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs inline-flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Send className="h-3 w-3" />
                    <span>ปักหมุด</span>
                  </button>
                </form>
              </div>
            )}
          </div>
          )}

            {/* Oceanic Action Grid (2-Button default, or 2+1 / 3-Button with 1-Tap Quick Expense) */}
            <div className={`grid gap-2 pt-1 ${onLogExpenseForStop ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}`}>
              <a
                href={mainPlaceDirectionsUrl}
                target="_blank"
                rel="noreferrer"
                className={`${onLogExpenseForStop ? 'col-span-2 sm:col-span-1' : ''} min-h-10 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] hover:from-[#1e40af] hover:to-[#1d4ed8] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer text-center touch-manipulation shadow-[0_4px_14px_rgba(37,99,235,0.28)] active:scale-95`}
              >
                <Navigation className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">นำทาง Google Maps</span>
              </a>

              <button
                type="button"
                onClick={() => setShowStaffModal(true)}
                className="min-h-10 py-2.5 px-3 rounded-xl bg-[#f1f5f9] hover:bg-[#e2e8f0] dark:bg-[#1a202c] dark:hover:bg-[#242a36] text-[#0f172a] dark:text-[#dde2f3] border border-[#e2e8f0] dark:border-[#24324a] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center touch-manipulation active:scale-95"
                title="แสดงชื่อสถานที่ภาษาญี่ปุ่นตัวใหญ่ให้คนขับแท็กซี่หรือพนักงานสถานีรถไฟดู"
              >
                <MessageSquare className="h-3.5 w-3.5 text-[#0284c7] dark:text-[#4cd7f6] shrink-0" />
                <span className="truncate">โชว์ชื่อภาษาญี่ปุ่น</span>
              </button>

              {onLogExpenseForStop && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onLogExpenseForStop(item);
                  }}
                  aria-label="จดรายจ่ายจุดนี้"
                  className="min-h-10 py-2.5 px-3 rounded-xl bg-[#e0f2fe] hover:bg-[#bae6fd] dark:bg-[#080e19] dark:hover:bg-[#1a202c] text-[#0369a1] dark:text-[#4cd7f6] border border-[#bae6fd] dark:border-[#4cd7f6]/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center touch-manipulation active:scale-95"
                  title="จดรายจ่ายที่จุดแวะนี้ทันที"
                >
                  <Receipt className="h-3.5 w-3.5 text-[#0284c7] dark:text-[#4cd7f6] shrink-0" />
                  <span className="truncate">จดจ่ายจุดนี้</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showStaffModal && (
        <ShowToStaffModal
          isOpen={showStaffModal}
          onClose={() => setShowStaffModal(false)}
          placeName={item.main_place || 'จุดหมาย'}
          city={item.city}
          timeSlot={item.time_slot}
          transportInfo={item.transport_info}
          platformInfo={transitGuide.platform}
          transportNote={transitGuide.bestTip}
          mapsUrl={mainPlaceMapsUrl}
          directionsUrl={mainPlaceDirectionsUrl}
        />
      )}

      {showCustomPhotoModal && (
        <CustomPlacePhotoModal
          isOpen={showCustomPhotoModal}
          onClose={() => setShowCustomPhotoModal(false)}
          placeName={item.main_place || 'จุดหมาย'}
          city={item.city}
          itemId={item.id}
          tripId={item.trip_id}
          currentAutoImageUrl={visual.imageUrl}
        />
      )}

      {showLightbox && (
        <PlacePhotoLightboxModal
          isOpen={showLightbox}
          onClose={() => setShowLightbox(false)}
          imageUrl={activeSrc || visual.imageUrl}
          placeName={item.main_place || 'จุดหมาย'}
          city={item.city}
          tagLabel={visual.tagLabel}
          emoji={visual.emoji}
          mapsUrl={mainPlaceMapsUrl}
          directionsUrl={mainPlaceDirectionsUrl}
          onOpenCustomPhoto={() => setShowCustomPhotoModal(true)}
        />
      )}
    </>
  );
}

/**
 * 2. Thumbnail / Magazine Grid View (Option A - Modern Japanese Editorial)
 * Uses aspect-[16/10] (aspect-ratio) on image container to reserve layout space and prevent CLS.
 */
function ItineraryThumbnailCardComponent({
  item,
  idx,
  canEditPlan,
  currentUser,
  onOpenEditActivity,
  onLogExpenseForStop,
}: {
  item: any;
  idx: number;
  canEditPlan: boolean;
  currentUser?: any;
  onOpenEditActivity: (item: any) => void;
  onLogExpenseForStop?: (item: any) => void;
}) {
  const { visited, toggleVisited, meta } = useStopVisitedState(item, canEditPlan, currentUser);
  const [showStaffModal, setShowStaffModal] = React.useState(false);
  const [showCustomPhotoModal, setShowCustomPhotoModal] = React.useState(false);
  const [showLightbox, setShowLightbox] = React.useState(false);

  const visual = usePlaceVisualMeta(item.main_place, item.city, idx, item.id, item.trip_id);
  const { activeSrc, handleImgError } = useResilientPlaceImage(visual);
  const transitGuide = React.useMemo(() => parseTransitInfo(item.transport_info), [item.transport_info]);
  const hasTransitNote = hasMeaningfulText(transitGuide.details);
  const hasFoodNote = hasMeaningfulText(item.food_recommendation);
  const { mainPlaceMapsUrl, mainPlaceDirectionsUrl } = React.useMemo(() => buildStopUrls(item), [item]);

  return (
    <>
      <div
        className={`group rounded-xl border border-[#e2e8f0] dark:border-[#1e293b] border-l-4 border-l-[#2563eb] overflow-hidden flex flex-col justify-between transition-all duration-300 bg-white dark:bg-[#161c27] shadow-[0_3px_14px_rgba(35,30,20,0.05)] hover:-translate-y-0.5`}
      >
        {/* Top Visual Thumbnail (Clean media strip — title lives cleanly below image) */}
        <div>
          <div
            onClick={() => setShowLightbox(true)}
            style={{ aspectRatio: '16 / 10' }}
            className="relative w-full aspect-[16/10] flex flex-col justify-between p-2.5 sm:p-3 bg-gradient-to-br from-[#1e3a8a] to-[#1e3a8a] cursor-zoom-in overflow-hidden"
            title="แตะที่รูปเพื่อขยายเต็มจอ / ดูหน้าร้าน Street View"
          >
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {activeSrc && (
                <img
                  src={activeSrc}
                  alt={item.main_place || 'Destination'}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={handleImgError}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#080e19]/70 via-transparent to-black/30" />
            </div>

            {/* Top Badges */}
            <div
              className="relative z-10 flex items-start justify-between gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-1 flex-wrap min-w-0 flex-1">
                <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-bold tracking-wider uppercase bg-white/95 text-[#0f172a]">
                  STOP {String(idx + 1).padStart(2, '0')}
                </span>
                {item.time_slot && (
                  <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-bold bg-[#1e3a8a]/90 text-white">
                    {item.time_slot}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={toggleVisited}
                className={`px-2 py-0.5 rounded-[3px] text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer active:scale-95 shrink-0 ${
                  visited
                    ? 'bg-[#eff6ff]/95 text-[#2563eb] border border-[#2563eb] -rotate-2'
                    : 'bg-[#2563eb] text-white hover:bg-[#1d4ed8]'
                }`}
              >
                {visited ? `VISITED ${meta?.at || '済'}` : 'CHECK-IN'}
              </button>
            </div>

            {/* Bottom Landmark Tag & Quick Photo Controls */}
            <div className="relative z-10 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/55 backdrop-blur-xs text-[10px] font-semibold text-white/95 tracking-wide truncate min-w-0">
                <span>{visual.emoji}</span>
                <span className="truncate">
                  {visual.tagLabel}
                  {item.city && !visual.tagLabel.toLowerCase().includes(item.city.toLowerCase())
                    ? ` · ${item.city}`
                    : ''}
                </span>
              </span>

              <div
                className="flex items-center gap-1 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setShowLightbox(true)}
                  className="p-1.5 rounded-[4px] bg-black/55 hover:bg-black/80 text-white/90 border border-white/20 shrink-0 cursor-pointer"
                  title="ขยายดูรูปเต็มจอ / ดูหน้าร้าน Street View"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomPhotoModal(true)}
                  className="p-1.5 rounded-[4px] bg-black/55 hover:bg-black/80 text-white/90 border border-white/20 shrink-0 cursor-pointer"
                  title="เปลี่ยนรูปสถานที่ (เลือกรูป Google Maps / อัปโหลด PNG)"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
                {canEditPlan && (
                  <button
                    type="button"
                    onClick={() => onOpenEditActivity(item)}
                    className="p-1.5 rounded-[4px] bg-black/55 hover:bg-black/80 text-white/90 border border-white/20 shrink-0 cursor-pointer"
                    title="แก้ไข"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Solid Editorial Title & Snippet Body */}
          <div className="p-3 sm:p-3.5 space-y-1.5 text-left">
            <a
              href={mainPlaceMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="block font-serif text-sm sm:text-base font-bold text-[#0f172a] dark:text-white hover:text-[#2563eb] dark:hover:text-[#4cd7f6] leading-snug break-words transition-colors"
            >
              {item.main_place}
            </a>

            {hasTransitNote ? (
              <p className="text-[11px] text-[#334155] dark:text-slate-300 line-clamp-1 flex items-center gap-1.5 font-medium">
                <Bus className="h-3 w-3 text-[#2563eb] shrink-0" />
                <span className="truncate">{transitGuide.details}</span>
              </p>
            ) : null}

            {hasFoodNote ? (
              <p className="text-[11px] text-[#1d4ed8] dark:text-amber-300 line-clamp-1 flex items-center gap-1.5 font-semibold">
                <Utensils className="h-3 w-3 text-[#2563eb] shrink-0" />
                <span className="truncate">{item.food_recommendation}</span>
              </p>
            ) : null}

            {!hasTransitNote && !hasFoodNote && (
              <p className="text-[11px] text-[#64748b] dark:text-slate-500 font-medium">
                {item.date_label || `Day ${idx + 1}`} · แตะที่รูปเพื่อขยายเต็มจอ
              </p>
            )}
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className={`grid gap-1.5 p-2.5 pt-0 ${onLogExpenseForStop ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <a
            href={mainPlaceDirectionsUrl}
            target="_blank"
            rel="noreferrer"
            className="min-h-9 py-1.5 px-2 rounded bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer touch-manipulation"
          >
            <Navigation className="h-3 w-3 shrink-0" />
            <span className="truncate">นำทาง</span>
          </a>
          <button
            type="button"
            onClick={() => setShowStaffModal(true)}
            className="min-h-9 py-1.5 px-2 rounded bg-white hover:bg-[#f8fafd] dark:bg-[#1a202c] text-[#1e293b] dark:text-slate-200 border border-[#cbd5e1] dark:border-[#24324a] text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer touch-manipulation"
          >
            <MessageSquare className="h-3 w-3 text-[#2563eb] shrink-0" />
            <span className="truncate">โชว์ชื่อญี่ปุ่น</span>
          </button>
          {onLogExpenseForStop && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onLogExpenseForStop(item);
              }}
              aria-label="จดรายจ่ายจุดนี้"
              className="min-h-9 py-1.5 px-2 rounded bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer touch-manipulation"
              title="จดรายจ่ายที่จุดแวะนี้"
            >
              <Receipt className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">จดจ่าย</span>
            </button>
          )}
        </div>
      </div>

      {showStaffModal && (
        <ShowToStaffModal
          isOpen={showStaffModal}
          onClose={() => setShowStaffModal(false)}
          placeName={item.main_place || 'จุดหมาย'}
          city={item.city}
          timeSlot={item.time_slot}
          transportInfo={item.transport_info}
          platformInfo={transitGuide.platform}
          transportNote={transitGuide.bestTip}
          mapsUrl={mainPlaceMapsUrl}
          directionsUrl={mainPlaceDirectionsUrl}
        />
      )}

      {showCustomPhotoModal && (
        <CustomPlacePhotoModal
          isOpen={showCustomPhotoModal}
          onClose={() => setShowCustomPhotoModal(false)}
          placeName={item.main_place || 'จุดหมาย'}
          city={item.city}
          itemId={item.id}
          tripId={item.trip_id}
          currentAutoImageUrl={visual.imageUrl}
        />
      )}

      {showLightbox && (
        <PlacePhotoLightboxModal
          isOpen={showLightbox}
          onClose={() => setShowLightbox(false)}
          imageUrl={activeSrc || visual.imageUrl}
          placeName={item.main_place || 'จุดหมาย'}
          city={item.city}
          tagLabel={visual.tagLabel}
          emoji={visual.emoji}
          mapsUrl={mainPlaceMapsUrl}
          directionsUrl={mainPlaceDirectionsUrl}
          onOpenCustomPhoto={() => setShowCustomPhotoModal(true)}
        />
      )}
    </>
  );
}

/**
 * 3. Compact Timeline / Checklist Row View (Option A - Collapsed Stop Style)
 */
function ItineraryCompactRowComponent({
  item,
  idx,
  canEditPlan,
  currentUser,
  onOpenEditActivity,
  onLogExpenseForStop,
  isDragOver = false,
  onDragStartStop,
  onDragOverStop,
  onDropOnStop,
  onDragEndStop,
  onKeyboardMoveStop,
}: {
  item: any;
  idx: number;
  canEditPlan: boolean;
  currentUser?: any;
  onOpenEditActivity: (item: any) => void;
  onLogExpenseForStop?: (item: any) => void;
  isDragOver?: boolean;
  onDragStartStop?: (id: string) => void;
  onDragOverStop?: (e: React.DragEvent, id: string) => void;
  onDropOnStop?: (e: React.DragEvent, targetId: string) => void;
  onDragEndStop?: () => void;
  onKeyboardMoveStop?: (id: string, direction: 'up' | 'down') => void;
}) {
  const { visited, toggleVisited, meta } = useStopVisitedState(item, canEditPlan, currentUser);
  const [showStaffModal, setShowStaffModal] = React.useState(false);
  const [showCustomPhotoModal, setShowCustomPhotoModal] = React.useState(false);
  const [showLightbox, setShowLightbox] = React.useState(false);
  const visual = usePlaceVisualMeta(item.main_place, item.city, idx, item.id, item.trip_id);
  const { activeSrc, handleImgError } = useResilientPlaceImage(visual);
  const transitGuide = React.useMemo(() => parseTransitInfo(item.transport_info), [item.transport_info]);
  const { mainPlaceMapsUrl, mainPlaceDirectionsUrl } = buildStopUrls(item);
  const isDraggable = Boolean(canEditPlan && item?.id && onDragStartStop);
  const { swipeDx: compactSwipeDx, swipeHandlers: compactSwipeHandlers } = useStopSwipeGesture({
    onSwipeRight: toggleVisited,
    onSwipeLeft: () => {
      if (onLogExpenseForStop) {
        onLogExpenseForStop(item);
      } else if (typeof window !== 'undefined' && mainPlaceDirectionsUrl) {
        window.open(mainPlaceDirectionsUrl, '_blank', 'noopener,noreferrer');
      }
    },
  });

  return (
    <>
      <div
        data-swipeable-card="true"
        {...compactSwipeHandlers}
        style={compactSwipeDx !== 0 ? { transform: `translate3d(${compactSwipeDx}px, 0, 0)` } : undefined}
        draggable={isDraggable}
        onDragStart={
          isDraggable
            ? (e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(item.id));
                onDragStartStop?.(String(item.id));
              }
            : undefined
        }
        onDragOver={
          isDraggable && onDragOverStop ? (e) => onDragOverStop(e, String(item.id)) : undefined
        }
        onDrop={isDraggable && onDropOnStop ? (e) => onDropOnStop(e, String(item.id)) : undefined}
        onDragEnd={isDraggable ? onDragEndStop : undefined}
        className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-lg border transition-all ${
          isDragOver
            ? 'border-[#2563eb] dark:border-[#4cd7f6] ring-2 ring-[#4cd7f6]/40 bg-[#eff6ff] dark:bg-[#080e19]'
            : visited
            ? 'border-[#e2e8f0] dark:border-emerald-800/60 bg-white dark:bg-[#161c27] shadow-[0_1px_3px_rgba(0,0,0,0.03)]'
            : 'border-[#e2e8f0] dark:border-[#24324a] border-l-3 border-l-[#2563eb] bg-white dark:bg-[#161c27] hover:border-[#2563eb]/60 shadow-[0_1px_3px_rgba(0,0,0,0.03)]'
        }`}
      >
        {/* Left: Drag Handle + Mini Thumbnail + Editorial Time & Serif Title */}
        <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
          {isDraggable && (
            <button
              type="button"
              style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'none' }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  onKeyboardMoveStop?.(String(item.id), e.key === 'ArrowUp' ? 'up' : 'down');
                }
              }}
              className="p-0.5 rounded text-[#94a3b8] dark:text-[#64748b] hover:text-[#2563eb] dark:hover:text-[#4cd7f6] focus-visible:bg-[#eff6ff] dark:focus-visible:bg-[#1a202c] focus-visible:text-[#2563eb] cursor-grab active:cursor-grabbing shrink-0 mt-1.5 sm:mt-0"
              title="ลากหรือกดลูกศรขึ้น-ลงเพื่อสลับลำดับจุดแวะ"
              aria-label={`ลากหรือกดลูกศรขึ้นลงเพื่อสลับลำดับ ${item.main_place || 'จุดแวะ'}`}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowLightbox(true)}
            style={{ aspectRatio: '1 / 1' }}
            className="w-10 h-10 rounded-md overflow-hidden shrink-0 bg-[#1e3a8a] border border-[#e2e8f0] dark:border-[#24324a] block cursor-zoom-in"
            title="แตะเพื่อขยายดูรูปสถานที่จริง"
          >
            {activeSrc && (
              <img
                src={activeSrc}
                alt={item.main_place || 'Stop'}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={handleImgError}
                className="w-full h-full object-cover"
              />
            )}
          </button>

          <div className="min-w-0 flex-1 text-left">
            <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-semibold text-[#475569] dark:text-slate-400">
              <span>{item.time_slot || item.date_label || `STOP ${idx + 1}`}</span>
              {item.city && <span>· {item.city}</span>}
            </div>

            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
              <a
                href={mainPlaceMapsUrl}
                target="_blank"
                rel="noreferrer"
                className={`font-serif text-sm font-semibold line-clamp-2 sm:truncate break-words hover:text-[#2563eb] transition-colors ${
                  visited ? 'text-[#334155] dark:text-slate-400' : 'text-[#0f172a] dark:text-white'
                }`}
              >
                {idx + 1}. {item.main_place}
              </a>
            </div>
          </div>
        </div>

        {/* Right: Editorial Visited Stamp + Quick Action Icons */}
        <div className="flex items-center justify-end gap-1.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={toggleVisited}
            className={`px-2 py-0.5 rounded-[3px] text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer ${
              visited
                ? 'border border-[#2563eb] text-[#2563eb] -rotate-2 bg-[#eff6ff]/60'
                : 'border border-[#cbd5e1] dark:border-slate-700 text-[#475569] dark:text-slate-300 hover:border-[#2563eb] hover:text-[#2563eb]'
            }`}
            title={visited ? 'แวะแล้ว (済)' : 'กดเพื่อเช็กอิน'}
          >
            {visited ? `VISITED ${meta?.at || '済'}` : 'CHECK-IN'}
          </button>

          <a
            href={mainPlaceDirectionsUrl}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-md bg-[#1e3a8a] text-white hover:bg-[#1d4ed8] transition-colors cursor-pointer"
            title="นำทาง Google Maps"
          >
            <Navigation className="h-3.5 w-3.5" />
          </a>

          <button
            type="button"
            onClick={() => setShowStaffModal(true)}
            className="p-2 rounded-md bg-[#f8fafd] dark:bg-[#1a202c] text-[#1e293b] dark:text-slate-200 border border-[#cbd5e1] dark:border-[#24324a] hover:border-[#2563eb] transition-colors cursor-pointer"
            title="โชว์ถามทาง / แท็กซี่"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>

          {onLogExpenseForStop && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onLogExpenseForStop(item);
              }}
              aria-label="จดรายจ่ายจุดนี้"
              className="p-2 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70 hover:bg-emerald-100 transition-colors cursor-pointer"
              title="จดรายจ่ายที่จุดแวะนี้"
            >
              <Receipt className="h-3.5 w-3.5" />
            </button>
          )}

          {canEditPlan && (
            <button
              type="button"
              onClick={() => onOpenEditActivity(item)}
              className="p-2 rounded-md text-[#64748b] hover:text-[#0f172a] dark:hover:text-white hover:bg-[#f1f5f9] dark:hover:bg-[#1a202c] transition-colors cursor-pointer"
              title="แก้ไข"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {showStaffModal && (
        <ShowToStaffModal
          isOpen={showStaffModal}
          onClose={() => setShowStaffModal(false)}
          placeName={item.main_place || 'จุดหมาย'}
          city={item.city}
          timeSlot={item.time_slot}
          transportInfo={item.transport_info}
          platformInfo={transitGuide.platform}
          transportNote={transitGuide.bestTip}
          mapsUrl={mainPlaceMapsUrl}
          directionsUrl={mainPlaceDirectionsUrl}
        />
      )}

      {showCustomPhotoModal && (
        <CustomPlacePhotoModal
          isOpen={showCustomPhotoModal}
          onClose={() => setShowCustomPhotoModal(false)}
          placeName={item.main_place || 'จุดหมาย'}
          city={item.city}
          itemId={item.id}
          tripId={item.trip_id}
          currentAutoImageUrl={visual.imageUrl}
        />
      )}

      {showLightbox && (
        <PlacePhotoLightboxModal
          isOpen={showLightbox}
          onClose={() => setShowLightbox(false)}
          imageUrl={activeSrc || visual.imageUrl}
          placeName={item.main_place || 'จุดหมาย'}
          city={item.city}
          tagLabel={visual.tagLabel}
          emoji={visual.emoji}
          mapsUrl={mainPlaceMapsUrl}
          directionsUrl={mainPlaceDirectionsUrl}
          onOpenCustomPhoto={() => setShowCustomPhotoModal(true)}
        />
      )}
    </>
  );
}

export const ItineraryStopCard = React.memo(ItineraryStopCardComponent);
export const ItineraryThumbnailCard = React.memo(ItineraryThumbnailCardComponent);
export const ItineraryCompactRow = React.memo(ItineraryCompactRowComponent);
