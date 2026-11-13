import React from 'react';
import { 
  Clock, ExternalLink, Utensils, Bus, ChevronUp, 
  ChevronDown, ArrowUp, ArrowDown, Edit3, Trash2, Shield,
  Navigation, Eye, MoreHorizontal, Camera, ZoomIn,
  SkipForward, RotateCcw, ShoppingBag, MessageSquare, Calendar, Plus, Send
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
import { usePlaceVisualMeta } from '@/lib/placeThumbnails';
import { triggerHaptic } from '@/lib/haptics';

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
}: ItineraryStopCardProps) {
  const { visited, toggleVisited, meta } = useStopVisitedState(item, canEditPlan, currentUser);
  const [showStaffModal, setShowStaffModal] = React.useState(false);
  const [showCustomPhotoModal, setShowCustomPhotoModal] = React.useState(false);
  const [showLightbox, setShowLightbox] = React.useState(false);
  const [showAdminMenu, setShowAdminMenu] = React.useState(false);
  const [showMoveDayList, setShowMoveDayList] = React.useState(false);
  const [failedImgUrl, setFailedImgUrl] = React.useState<string | null>(null);

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
  const imgError = failedImgUrl === visual.imageUrl;
  const transitGuide = React.useMemo(() => parseTransitInfo(item.transport_info), [item.transport_info]);
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

  return (
    <>
      <div
        style={
          idx > 2 && !showAdminMenu
            ? { contentVisibility: 'auto', containIntrinsicSize: '0 320px' }
            : undefined
        }
        className={`group rounded-xl border transition-all duration-300 relative overflow-hidden ${
          isSkipped
            ? 'border-dashed border-[#D6CEC0] dark:border-slate-700 bg-[#FDFCF9]/70 dark:bg-[#14161b]/70 opacity-65'
            : visited
            ? 'border-[#DFD7C7] dark:border-emerald-800/60 border-l-4 border-l-[#C83E2D] bg-white dark:bg-[#181a20] shadow-[0_2px_10px_rgba(35,30,20,0.04)]'
            : 'border-[#DFD7C7] dark:border-[#2C2A26] border-l-4 border-l-[#C83E2D] bg-white dark:bg-[#181a20] shadow-[0_3px_14px_rgba(35,30,20,0.05)] hover:shadow-[0_6px_20px_rgba(35,30,20,0.09)]'
        }`}
      >
        <div className="relative z-10 bg-white dark:bg-[#181a20]">
          {/* Skipped Stop Banner */}
          {isSkipped && (
            <div className="px-4 py-2 bg-[#F4EFE6] dark:bg-slate-800/80 border-b border-[#E5DEC9] dark:border-slate-700 flex items-center justify-between gap-2 text-xs">
              <span className="font-bold text-[#4A4640] dark:text-slate-300 flex items-center gap-1.5">
                <SkipForward className="h-3.5 w-3.5 text-[#C83E2D]" />
                <span>ข้ามจุดแวะนี้ชั่วคราว (ไม่นับรวมในเวลาและเส้นทางนำทาง)</span>
              </span>
              <button
                type="button"
                onClick={handleToggleSkip}
                className="px-2.5 py-1 rounded bg-[#1C2630] hover:bg-[#2B3947] text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer shrink-0"
              >
                <RotateCcw className="h-3 w-3" />
                <span>คืนค่าเข้าแผน</span>
              </button>
            </div>
          )}

          {/* Editorial 16:9 Hero Header (Option A - POPEYE/BRUTUS Style) */}
          <div
            onClick={() => setShowLightbox(true)}
            className="relative w-full h-36 sm:h-44 overflow-hidden bg-gradient-to-br from-[#1C2630] to-[#35475A] flex items-end p-3.5 sm:p-4 cursor-zoom-in"
            title="แตะเพื่อขยายดูรูปสถานที่จริง / ดูหน้าร้าน Street View"
          >
            {/* Decorative Japanese wave fallback background */}
            <svg
              className="absolute inset-0 w-full h-full opacity-25 pointer-events-none"
              viewBox="0 0 400 200"
              preserveAspectRatio="none"
            >
              <path d="M0,80 C120,40 220,120 400,60 L400,200 L0,200 Z" fill="#4B627A" />
              <path d="M0,130 C150,90 260,170 400,110 L400,200 L0,200 Z" fill="#243342" />
            </svg>

            {!imgError && (
              <img
                src={visual.imageUrl}
                alt={item.main_place || 'Destination'}
                loading="lazy"
                onError={() => setFailedImgUrl(visual.imageUrl)}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            )}

            {/* Editorial Dark Gradient Scrim for Typography Legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#141C24]/90 via-[#141C24]/35 to-black/25 pointer-events-none" />

            {/* Top Row Overlay: Editorial Tag (Left) + Stamp Check-in & Menu (Right) */}
            <div
              className="absolute top-3 inset-x-3.5 sm:inset-x-4 flex items-center justify-between gap-2 z-20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-[3px] bg-white/95 text-[#1A1A1A] text-[10px] font-bold tracking-wider uppercase shadow-2xs">
                  STOP {String(idx + 1).padStart(2, '0')} / {visual.tagLabel}
                </span>
                {visual.isCustomPhoto && (
                  <span className="px-1.5 py-0.5 rounded-[3px] bg-emerald-600/90 text-white text-[9px] font-bold">
                    ✨ รูปของฉัน
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0 relative">
                {/* Editorial Stamp / Live Badge Check-in Button */}
                <button
                  type="button"
                  onClick={toggleVisited}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-[3px] text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer active:scale-95 ${
                    visited
                      ? 'bg-[#FFF5F2]/95 text-[#C83E2D] border border-[#C83E2D] -rotate-2 shadow-xs'
                      : 'bg-[#C83E2D] hover:bg-[#B33324] text-white shadow-xs'
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

                {/* Decluttered Stop Action & Admin Menu Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminMenu((v) => !v);
                      setShowMoveDayList(false);
                    }}
                    className="p-1.5 rounded-[4px] bg-black/55 hover:bg-black/80 text-white border border-white/25 backdrop-blur-xs cursor-pointer transition-colors"
                    title="ตัวเลือกเพิ่มเติม (ปรับเวลาแวะ / ของต้องซื้อ / โน้ตกลุ่ม / จัดการจุดแวะ)"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>

                  {showAdminMenu && (
                    <div className="absolute right-0 top-9 z-30 w-56 rounded-xl bg-white dark:bg-[#1e2027] border border-[#DFD7C7] dark:border-[#262932] shadow-xl p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
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
              </div>
            </div>

            {/* Bottom Place Title & Subtitle Overlay inside Hero */}
            <div className="relative z-10 w-full text-left" onClick={(e) => e.stopPropagation()}>
              <a
                href={mainPlaceMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="font-serif text-lg sm:text-xl font-bold text-white hover:text-[#FFD8CE] inline-flex items-center gap-1.5 transition-colors cursor-pointer leading-snug drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] break-words"
              >
                <span>{item.main_place}</span>
                <ExternalLink className="h-3.5 w-3.5 text-white/75 shrink-0" />
              </a>
              <div className="flex items-center gap-2 flex-wrap mt-0.5 text-[11px] text-white/90 font-medium tracking-wide">
                <span>
                  {visual.emoji} {item.city || 'Japan'}
                </span>
                {item.date_label && <span>· {item.date_label}</span>}
                {visited && meta?.by && (
                  <span className="text-emerald-300 font-semibold">
                    · ✓ เช็กอินโดย {meta.by}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Editorial Main Card Body */}
          <div className="p-4 sm:p-5 space-y-3.5">
            {/* Editorial Timing & Schedule Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#F0ECE3] dark:border-[#262932]">
              <div className="flex items-center gap-2 flex-wrap">
                {item.time_slot && (
                  <span className="font-serif text-base sm:text-lg font-bold text-[#181818] dark:text-white tracking-tight">
                    {item.time_slot.replace('-', ' — ')}
                  </span>
                )}

                {!isSkipped && computedSchedule && (
                  <button
                    type="button"
                    onClick={() => setShowTimeTuner((v) => !v)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#685E50] dark:text-slate-300 bg-[#F4EFE6] dark:bg-[#22252E] px-2.5 py-0.5 rounded-[4px] border border-[#E5DEC9] dark:border-[#323642] hover:border-[#C83E2D] transition-colors cursor-pointer"
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
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#685E50] dark:text-amber-300 bg-[#F4EFE6] dark:bg-amber-950/50 px-2 py-0.5 rounded-[4px]">
                    ⏱️ รอคิว/รอเปิด ~{computedSchedule.waitMin} น.
                  </span>
                )}

                {!isSkipped && computedSchedule && computedSchedule.lateMin > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B52F1E] bg-[#FFF5F2] px-2 py-0.5 rounded-[4px] border border-[#F8D3CB] animate-pulse">
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
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#F4EFE6] dark:bg-[#22252E] text-[#403B33] dark:text-amber-300 text-[11px] font-semibold hover:bg-[#EAE2D3] transition-colors shrink-0"
                >
                  <span>🚉 {transitGuide.platform ? `ชานชาลา ${transitGuide.platform}` : 'เช็กชานชาลาสด'}</span>
                  <ExternalLink className="h-2.5 w-2.5 opacity-75" />
                </a>
              )}
            </div>

            {/* Editorial Pills Container (Amenities, Elevator, Last Train & Smart Badges) */}
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
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[3px] text-[11px] font-semibold bg-[#FFF5F2] dark:bg-rose-950/40 border border-[#F8D3CB] dark:border-rose-800/50 text-[#B52F1E] dark:text-rose-300">
                      <span>✨ {transitGuide.bestTip}</span>
                    </span>
                  )}

                  {amenities.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[3px] text-[11px] font-medium bg-[#F6F3EB] dark:bg-[#22242B] border border-[#EAE2D3] dark:border-[#323540] text-[#403B33] dark:text-slate-200"
                    >
                      <span>{tag.emoji}</span>
                      <span>{tag.label}</span>
                    </span>
                  ))}

                  {(hasCustomTime || showTimeTuner) && (
                    <button
                      type="button"
                      onClick={() => setShowTimeTuner((v) => !v)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-[3px] text-[11px] font-semibold border transition-all cursor-pointer ${
                        showTimeTuner
                          ? 'bg-[#1C2630] text-white border-[#1C2630]'
                          : 'bg-[#F6F3EB] dark:bg-[#22242B] text-[#403B33] dark:text-slate-200 border-[#EAE2D3] dark:border-[#323540]'
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
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[3px] text-[11px] font-semibold border transition-all cursor-pointer bg-[#FFF5F2] dark:bg-rose-950/40 text-[#B52F1E] dark:text-rose-300 border-[#F8D3CB] dark:border-rose-800/50"
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
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[3px] text-[11px] font-semibold border transition-all cursor-pointer bg-[#F6F3EB] dark:bg-[#22242B] text-[#403B33] dark:text-slate-200 border-[#EAE2D3] dark:border-[#323540]"
                    >
                      <MessageSquare className="h-3 w-3" />
                      <span>โน้ตกลุ่ม ({pinnedNotesCount})</span>
                    </button>
                  )}
                </div>

                {elevatorTip && (
                  <div className="px-3 py-2 rounded-[4px] bg-[#F6F3EB] dark:bg-teal-950/35 border border-[#EAE2D3] dark:border-teal-800/60 text-[11px] font-medium text-[#403B33] dark:text-teal-200 leading-relaxed">
                    {elevatorTip}
                  </div>
                )}

                {lastTrainTip && (
                  <div className="px-3 py-2 rounded-[4px] bg-[#FFF5F2] dark:bg-indigo-950/35 border border-[#F8D3CB] dark:border-indigo-800/60 text-[11px] font-semibold text-[#B52F1E] dark:text-indigo-200 leading-relaxed">
                    {lastTrainTip}
                  </div>
                )}
              </div>
            )}

            {/* Editorial Traveler's Note Box (Transit Details + Food Recommendation) */}
            {(transitGuide.details || item.food_recommendation) && (
              <div className="bg-[#FAF7F2] dark:bg-[#1D1F26] border-l-2 border-l-[#C83E2D] rounded-r-md p-3 space-y-2.5 text-left">
                {transitGuide.details && (
                  <div>
                    <div className="text-[10px] font-bold tracking-widest text-[#C83E2D] dark:text-[#E05A47] uppercase mb-0.5">
                      Transit & Route Note
                    </div>
                    <p className="text-xs text-[#443E36] dark:text-slate-200 leading-relaxed">
                      {transitGuide.details}
                    </p>
                  </div>
                )}

                {item.food_recommendation && (
                  <div className={transitGuide.details ? 'pt-2 border-t border-[#EBE4D8] dark:border-[#2C2F3A]' : ''}>
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-[10px] font-bold tracking-widest text-[#C83E2D] dark:text-[#E05A47] uppercase">
                        Traveler’s Note · ร้านแนะนำ
                      </span>
                      {foodSearchUrl && (
                        <a
                          href={foodSearchUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-[3px] bg-[#1C2630] hover:bg-[#2D3B4A] text-white transition-all shrink-0 cursor-pointer"
                        >
                          <span>แผนที่ร้าน 📍</span>
                          <ExternalLink className="h-2.5 w-2.5 opacity-80" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-[#443E36] dark:text-slate-200 leading-relaxed">
                      {item.food_recommendation}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Backup Plan (Plan B) */}
            {item.backup_plan && (
              <div className="pt-0.5 text-left">
                <button
                  type="button"
                  onClick={() => onTogglePlanB(item.id)}
                  className="text-xs font-bold text-[#403B33] dark:text-slate-300 inline-flex items-center gap-1.5 hover:text-[#C83E2D] dark:hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <div className="w-5 h-5 rounded-[4px] bg-[#FFF5F2] dark:bg-rose-500/20 border border-[#F8D3CB] dark:border-rose-800 flex items-center justify-center text-[#C83E2D] dark:text-rose-400">
                    <Shield className="h-3 w-3" />
                  </div>
                  <span>แผนสำรอง (Plan B)</span>
                  {isPlanBOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                {isPlanBOpen && (
                  <div className="p-3.5 mt-2 rounded-lg bg-[#FAF7F2] dark:bg-[#121316] text-xs text-[#443E36] dark:text-slate-200 space-y-2 border border-[#EAE2D3] dark:border-[#262932] text-left">
                    <div className="text-[10px] font-bold tracking-widest uppercase text-[#8C8275] dark:text-slate-400 text-left">
                      Backup Spots & Dining
                    </div>
                    <div className="space-y-1.5">
                      {item.backup_plan
                        .split('\n')
                        .filter((line: string) => line.trim().length > 0)
                        .map((line: string, lineIdx: number) => {
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

                          return (
                            <div
                              key={lineIdx}
                              className="p-2.5 rounded-md bg-white dark:bg-[#1e2027] border border-[#EAE2D3] dark:border-[#262932] flex items-center justify-between gap-3 hover:border-[#C83E2D] transition-all text-left"
                            >
                              <span className="font-medium text-[#2D2820] dark:text-slate-200 leading-relaxed text-left flex-1">
                                {line}
                              </span>
                              <a
                                href={lineMapsUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-[4px] bg-[#F6F3EB] dark:bg-slate-800 text-[#2D2820] dark:text-slate-200 hover:bg-[#1C2630] hover:text-white transition-all shrink-0 cursor-pointer"
                              >
                                <span>แผนที่ 📍</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Interactive Drawers (Time Tuner, Shopping, Group Notes) */}
            {(showTimeTuner || showStopShopping || showStopNotes) && (
              <div className="pt-2 border-t border-[#F0ECE3] dark:border-[#22252e] space-y-2 text-left">

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
                              : 'bg-white dark:bg-[#1e2027] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
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
                      className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-[#1e2027] border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white"
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
                      className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-[#1e2027] border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white"
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
                      className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-[#1e2027] border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white"
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
                      className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-[#1e2027] border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white"
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
                              : 'bg-white dark:bg-[#1e2027] border-slate-200/80 dark:border-[#262932]'
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
                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#1e2027] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                  <input
                    type="number"
                    placeholder="¥ ราคา"
                    value={quickShopPrice}
                    onChange={(e) => setQuickShopPrice(e.target.value)}
                    className="w-20 px-2 py-1.5 rounded-xl bg-white dark:bg-[#1e2027] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
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
                      className="p-2.5 rounded-xl bg-white dark:bg-[#1e2027] border border-slate-200/80 dark:border-[#262932] flex items-start justify-between gap-2"
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
                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#1e2027] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
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

            {/* Editorial 2-Button Action Grid (Option A - POPEYE/BRUTUS Style) */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={mainPlaceDirectionsUrl}
                target="_blank"
                rel="noreferrer"
                className="min-h-10 py-2.5 px-3 rounded-md bg-[#1C2630] hover:bg-[#293847] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center touch-manipulation shadow-2xs"
              >
                <Navigation className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">นำทาง Google Maps</span>
              </a>

              <button
                type="button"
                onClick={() => setShowStaffModal(true)}
                className="min-h-10 py-2.5 px-3 rounded-md bg-white hover:bg-[#F8F6F0] dark:bg-[#22252E] dark:hover:bg-[#2B2F3A] text-[#2D2820] dark:text-slate-100 border border-[#D8D0C2] dark:border-[#363A45] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center touch-manipulation"
                title="แสดงชื่อสถานที่ภาษาญี่ปุ่นตัวใหญ่ให้คนขับแท็กซี่หรือพนักงานสถานีรถไฟดู"
              >
                <MessageSquare className="h-3.5 w-3.5 text-[#C83E2D] dark:text-rose-400 shrink-0" />
                <span className="truncate">โชว์ชื่อภาษาญี่ปุ่น</span>
              </button>
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
          imageUrl={visual.imageUrl}
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
}: {
  item: any;
  idx: number;
  canEditPlan: boolean;
  currentUser?: any;
  onOpenEditActivity: (item: any) => void;
}) {
  const { visited, toggleVisited, meta } = useStopVisitedState(item, canEditPlan, currentUser);
  const [showStaffModal, setShowStaffModal] = React.useState(false);
  const [showCustomPhotoModal, setShowCustomPhotoModal] = React.useState(false);
  const [showLightbox, setShowLightbox] = React.useState(false);
  const [failedImgUrl, setFailedImgUrl] = React.useState<string | null>(null);

  const visual = usePlaceVisualMeta(item.main_place, item.city, idx, item.id, item.trip_id);
  const imgError = failedImgUrl === visual.imageUrl;
  const transitGuide = React.useMemo(() => parseTransitInfo(item.transport_info), [item.transport_info]);
  const { mainPlaceMapsUrl, mainPlaceDirectionsUrl } = React.useMemo(() => buildStopUrls(item), [item]);

  return (
    <>
      <div
        className={`group rounded-xl border border-[#DFD7C7] dark:border-[#2C2A26] border-l-4 border-l-[#C83E2D] overflow-hidden flex flex-col justify-between transition-all duration-300 bg-white dark:bg-[#181a20] shadow-[0_3px_14px_rgba(35,30,20,0.05)] hover:-translate-y-0.5`}
      >
        {/* Top Visual Thumbnail with aspect-ratio to prevent CLS */}
        <div>
          <div
            style={{ aspectRatio: '16 / 10' }}
            onClick={() => setShowLightbox(true)}
            className="relative w-full aspect-[16/10] overflow-hidden bg-gradient-to-br from-[#1C2630] to-[#35475A] cursor-zoom-in"
            title="แตะที่รูปเพื่อขยายเต็มจอ / ดูหน้าร้าน Street View"
          >
            {!imgError && (
              <img
                src={visual.imageUrl}
                alt={item.main_place || 'Destination'}
                loading="lazy"
                onError={() => setFailedImgUrl(visual.imageUrl)}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#141C24]/90 via-[#141C24]/25 to-black/15" />

            {/* Top Overlay Badges */}
            <div
              className="absolute top-2.5 inset-x-2.5 flex items-center justify-between gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-1 flex-wrap">
                <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-bold tracking-wider uppercase bg-white/95 text-[#1A1A1A]">
                  STOP {String(idx + 1).padStart(2, '0')}
                </span>
                {item.time_slot && (
                  <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-bold bg-[#1C2630]/90 text-white">
                    {item.time_slot}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={toggleVisited}
                className={`px-2 py-0.5 rounded-[3px] text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer active:scale-95 ${
                  visited
                    ? 'bg-[#FFF5F2]/95 text-[#C83E2D] border border-[#C83E2D] -rotate-2'
                    : 'bg-[#C83E2D] text-white hover:bg-[#B23222]'
                }`}
              >
                {visited ? `VISITED ${meta?.at || '済'}` : 'CHECK-IN'}
              </button>
            </div>

            {/* Bottom Overlay Landmark Tag & City */}
            <div className="absolute bottom-2.5 inset-x-3 flex items-end justify-between gap-2">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-white/85 tracking-wide flex-wrap">
                  <span>{visual.emoji}</span>
                  <span>
                    {visual.tagLabel}
                    {item.city && !visual.tagLabel.toLowerCase().includes(item.city.toLowerCase())
                      ? ` · ${item.city}`
                      : ''}
                  </span>
                </span>
                <h3 className="font-serif text-sm sm:text-base font-bold text-white leading-snug line-clamp-2 drop-shadow-sm">
                  {item.main_place}
                </h3>
              </div>

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

          {/* Compact Snippet Body */}
          <div className="p-3 sm:p-3.5 space-y-1.5 text-left">
            {transitGuide.details ? (
              <p className="text-[11px] text-[#443E36] dark:text-slate-300 line-clamp-1 flex items-center gap-1.5 font-medium">
                <Bus className="h-3 w-3 text-[#C83E2D] shrink-0" />
                <span className="truncate">{transitGuide.details}</span>
              </p>
            ) : null}

            {item.food_recommendation ? (
              <p className="text-[11px] text-[#B52F1E] dark:text-amber-300 line-clamp-1 flex items-center gap-1.5 font-semibold">
                <Utensils className="h-3 w-3 text-[#C83E2D] shrink-0" />
                <span className="truncate">{item.food_recommendation}</span>
              </p>
            ) : null}

            {!transitGuide.details && !item.food_recommendation && (
              <p className="text-[11px] text-[#8C8275] dark:text-slate-500 font-medium">
                {item.date_label || `Day ${idx + 1}`} · แตะที่รูปเพื่อขยายเต็มจอ
              </p>
            )}
          </div>
        </div>

        {/* Bottom 2-Action Bar */}
        <div className="grid grid-cols-2 gap-1.5 p-2.5 pt-0">
          <a
            href={mainPlaceDirectionsUrl}
            target="_blank"
            rel="noreferrer"
            className="min-h-9 py-1.5 px-2 rounded bg-[#1C2630] hover:bg-[#293847] text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer touch-manipulation"
          >
            <Navigation className="h-3 w-3 shrink-0" />
            <span className="truncate">นำทาง Maps</span>
          </a>
          <button
            type="button"
            onClick={() => setShowStaffModal(true)}
            className="min-h-9 py-1.5 px-2 rounded bg-white hover:bg-[#F8F6F0] dark:bg-[#22252E] text-[#2D2820] dark:text-slate-200 border border-[#D8D0C2] dark:border-[#363A45] text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer touch-manipulation"
          >
            <MessageSquare className="h-3 w-3 text-[#C83E2D] shrink-0" />
            <span className="truncate">โชว์ชื่อญี่ปุ่น</span>
          </button>
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
          imageUrl={visual.imageUrl}
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
}: {
  item: any;
  idx: number;
  canEditPlan: boolean;
  currentUser?: any;
  onOpenEditActivity: (item: any) => void;
}) {
  const { visited, toggleVisited, meta } = useStopVisitedState(item, canEditPlan, currentUser);
  const [showStaffModal, setShowStaffModal] = React.useState(false);
  const [showCustomPhotoModal, setShowCustomPhotoModal] = React.useState(false);
  const [showLightbox, setShowLightbox] = React.useState(false);
  const [failedImgUrl, setFailedImgUrl] = React.useState<string | null>(null);
  const visual = usePlaceVisualMeta(item.main_place, item.city, idx, item.id, item.trip_id);
  const imgError = failedImgUrl === visual.imageUrl;
  const { mainPlaceMapsUrl, mainPlaceDirectionsUrl } = buildStopUrls(item);

  return (
    <>
      <div
        className={`group flex items-center justify-between gap-2.5 p-3 rounded-lg border transition-all ${
          visited
            ? 'border-[#EAE3D6] dark:border-emerald-800/60 bg-white dark:bg-[#181a20] shadow-[0_1px_3px_rgba(0,0,0,0.03)]'
            : 'border-[#EAE3D6] dark:border-[#262932] border-l-3 border-l-[#C83E2D] bg-white dark:bg-[#181a20] hover:border-[#C83E2D]/60 shadow-[0_1px_3px_rgba(0,0,0,0.03)]'
        }`}
      >
        {/* Left: Mini Thumbnail + Editorial Time & Serif Title */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setShowLightbox(true)}
            style={{ aspectRatio: '1 / 1' }}
            className="w-10 h-10 rounded-md overflow-hidden shrink-0 bg-[#1C2630] border border-[#EAE3D6] dark:border-[#262932] block cursor-zoom-in"
            title="แตะเพื่อขยายดูรูปสถานที่จริง"
          >
            {!imgError && (
              <img
                src={visual.imageUrl}
                alt={item.main_place || 'Stop'}
                loading="lazy"
                onError={() => setFailedImgUrl(visual.imageUrl)}
                className="w-full h-full object-cover"
              />
            )}
          </button>

          <div className="min-w-0 flex-1 text-left">
            <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-semibold text-[#7D7467] dark:text-slate-400">
              <span>{item.time_slot || item.date_label || `STOP ${idx + 1}`}</span>
              {item.city && <span>· {item.city}</span>}
            </div>

            <div className="flex items-center gap-1.5 mt-0.5">
              <a
                href={mainPlaceMapsUrl}
                target="_blank"
                rel="noreferrer"
                className={`font-serif text-sm font-semibold truncate hover:text-[#C83E2D] transition-colors ${
                  visited ? 'text-[#4A4640] dark:text-slate-400' : 'text-[#1A1A1A] dark:text-white'
                }`}
              >
                {idx + 1}. {item.main_place}
              </a>
            </div>
          </div>
        </div>

        {/* Right: Editorial Visited Stamp + Quick Action Icons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={toggleVisited}
            className={`px-2 py-0.5 rounded-[3px] text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer ${
              visited
                ? 'border border-[#C83E2D] text-[#C83E2D] -rotate-2 bg-[#FFF5F2]/60'
                : 'border border-[#D8CFC0] dark:border-slate-700 text-[#7A7062] dark:text-slate-300 hover:border-[#C83E2D] hover:text-[#C83E2D]'
            }`}
            title={visited ? 'แวะแล้ว (済)' : 'กดเพื่อเช็กอิน'}
          >
            {visited ? `VISITED ${meta?.at || '済'}` : 'CHECK-IN'}
          </button>

          <a
            href={mainPlaceDirectionsUrl}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-md bg-[#1C2630] text-white hover:bg-[#2B3A48] transition-colors cursor-pointer"
            title="นำทาง Google Maps"
          >
            <Navigation className="h-3.5 w-3.5" />
          </a>

          <button
            type="button"
            onClick={() => setShowStaffModal(true)}
            className="p-2 rounded-md bg-[#F8F6F0] dark:bg-[#22252E] text-[#2D2820] dark:text-slate-200 border border-[#D8D0C2] dark:border-[#363A45] hover:border-[#C83E2D] transition-colors cursor-pointer"
            title="โชว์ถามทาง / แท็กซี่"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>

          {canEditPlan && (
            <button
              type="button"
              onClick={() => onOpenEditActivity(item)}
              className="p-2 rounded-md text-[#8C8275] hover:text-[#1A1A1A] dark:hover:text-white hover:bg-[#F4EFE6] dark:hover:bg-[#1e2027] transition-colors cursor-pointer"
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
          imageUrl={visual.imageUrl}
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
