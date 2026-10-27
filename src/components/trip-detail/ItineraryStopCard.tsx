import React from 'react';
import { 
  Clock, ExternalLink, Utensils, Bus, ChevronUp, 
  ChevronDown, ArrowUp, ArrowDown, Edit3, Trash2, Shield,
  Navigation, Eye, MoreHorizontal, Check, Camera, ZoomIn, RotateCcw
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
    syncVisited();
    return subscribeVisitedStamps(syncVisited);
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
}: ItineraryStopCardProps) {
  const { visited, toggleVisited, meta } = useStopVisitedState(item, canEditPlan, currentUser);
  const [showStaffModal, setShowStaffModal] = React.useState(false);
  const [showCustomPhotoModal, setShowCustomPhotoModal] = React.useState(false);
  const [showLightbox, setShowLightbox] = React.useState(false);
  const [showAdminMenu, setShowAdminMenu] = React.useState(false);
  const [imgError, setImgError] = React.useState(false);

  const visual = usePlaceVisualMeta(item.main_place, item.city, idx, item.id, item.trip_id);
  const transitGuide = parseTransitInfo(item.transport_info);
  const { mainPlaceMapsUrl, mainPlaceDirectionsUrl } = buildStopUrls(item);

  React.useEffect(() => {
    setImgError(false);
  }, [visual.imageUrl]);

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

  const [touchStartX, setTouchStartX] = React.useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = React.useState<number>(0);
  const [isSwiping, setIsSwiping] = React.useState<boolean>(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (reordering) return;
    setTouchStartX(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null || !isSwiping) return;
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - touchStartX;
    if (deltaX > 0) {
      setSwipeOffset(Math.min(deltaX, 85));
    } else {
      setSwipeOffset(0);
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset >= 60) {
      toggleVisited();
    }
    setSwipeOffset(0);
    setIsSwiping(false);
    setTouchStartX(null);
  };

  return (
    <>
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`group rounded-3xl border transition-all duration-300 relative overflow-hidden card-elevation ${
          visited 
            ? 'border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/20' 
            : 'border-slate-200/90 dark:border-[#262932] bg-white dark:bg-[#181a20] hover:border-blue-400/60 dark:hover:border-blue-500/40'
        }`}
      >
        {/* Swipe Reveal Action Background */}
        {swipeOffset > 8 && (
          <div
            className={`absolute inset-y-0 left-0 w-36 flex items-center pl-4 font-black text-xs gap-1.5 z-0 transition-opacity ${
              visited ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
            }`}
          >
            {visited ? (
              <>
                <RotateCcw className="h-4 w-4 stroke-[3]" />
                <span className="text-[11px] font-bold">ยกเลิกเช็กอิน</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4 stroke-[3]" />
                <span className="text-[11px] font-bold">เช็กอิน</span>
              </>
            )}
          </div>
        )}

        <div
          style={{
            transform: swipeOffset > 0 ? `translateX(${swipeOffset}px)` : undefined,
            transition: isSwiping ? 'none' : 'transform 0.25s ease-out',
          }}
          className={`relative z-10 transition-colors ${
            visited 
              ? 'bg-emerald-50/30 dark:bg-[#181a20]' 
              : 'bg-white dark:bg-[#181a20]'
          }`}
        >
          {/* Top Notice / Platform Banner */}
        {transitGuide.hasGuide && (
          <div className="px-4 py-2 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border-b border-amber-200/70 dark:border-amber-900/40 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 font-black text-amber-800 dark:text-amber-300">
                <span>🚉</span>
                <span>{transitGuide.platform ? `ชานชาลา ${transitGuide.platform}` : 'การเดินทาง'}</span>
              </span>
              {transitGuide.bestTip && (
                <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                  • {transitGuide.bestTip}
                </span>
              )}
            </div>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(item.main_place + ' ' + (item.city || 'Japan'))}&travelmode=transit`}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-black text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 shrink-0"
            >
              <span>เช็กชานชาลาสด</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        )}

        {/* Main Card Body */}
        <div className="p-4 sm:p-5 space-y-3">
          {/* Top Header Line: Day badge, Time slot, City & Eki Stamp Checkin */}
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/70 dark:border-blue-900/50 shadow-2xs">
                {item.date_label || `Day ${idx + 1}`}
              </span>

              {item.time_slot && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#1e2027] px-2.5 py-0.5 rounded-full border border-slate-200/70 dark:border-[#262932]">
                  <Clock className="h-3 w-3 text-blue-500" />
                  <span>{item.time_slot}</span>
                </span>
              )}

              {item.city && (
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  📍 {item.city}
                </span>
              )}

              {visited && meta?.by && (
                <span className="inline-flex text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-lg bg-emerald-100/70 dark:bg-emerald-950/50 border border-emerald-200/50 dark:border-emerald-900/40" title={`เช็กอินโดย ${meta.by} ${meta.at || ''}`}>
                  ✓ {meta.by} {meta.at ? `(${meta.at})` : ''}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0 relative">
              {/* Eki-Stamp / Paw Checkin Button */}
              <button
                type="button"
                onClick={toggleVisited}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 ${
                  visited
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs'
                    : 'bg-slate-100 dark:bg-[#181a20] text-slate-700 dark:text-slate-300 border border-slate-200/90 dark:border-[#262932] hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
                title={visited ? 'คลิกเพื่อยกเลิกสถานะเช็กอิน (คืนค่าเดิม)' : 'ประทับตราเช็กอิน ⛩️'}
              >
                <span className={visited ? 'animate-bounce' : ''}>{visited ? '💮' : '🐾'}</span>
                <span>{visited ? 'แวะแล้ว' : 'เช็กอิน'}</span>
              </button>

              {/* Decluttered Admin Menu Button */}
              {canEditPlan && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowAdminMenu((v) => !v)}
                    className="p-1.5 rounded-xl border border-slate-200/80 dark:border-[#262932] bg-slate-50 dark:bg-[#1e2027] text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer transition-colors"
                    title="จัดการกิจกรรม (แก้ไข / เลื่อนลำดับ / ลบ)"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>

                  {showAdminMenu && (
                    <div className="absolute right-0 top-9 z-30 w-44 rounded-2xl bg-white dark:bg-[#1e2027] border border-slate-200 dark:border-[#262932] shadow-xl p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAdminMenu(false);
                          setShowCustomPhotoModal(true);
                        }}
                        className="w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-600 flex items-center gap-2 cursor-pointer"
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
                        className="w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 flex items-center gap-2 cursor-pointer"
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
                        className="w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#253048] flex items-center gap-2 disabled:opacity-40 cursor-pointer"
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
                        className="w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#253048] flex items-center gap-2 disabled:opacity-40 cursor-pointer"
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
                        className="w-full px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center gap-2 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>ลบกิจกรรมนี้</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Main Place Title + Real Place Thumbnail + Optional Stamp Watermark */}
          <div className="pt-0.5 text-left w-full flex items-start justify-between gap-3">
            {/* Real Place Thumbnail (Tap to expand Lightbox, Corner button to change photo) */}
            <div className="relative shrink-0 group/thumb">
              <button
                type="button"
                onClick={() => setShowLightbox(true)}
                style={{ aspectRatio: '1 / 1' }}
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-gradient-to-br ${visual.gradient} border border-slate-200/80 dark:border-[#262932] shadow-xs relative block cursor-pointer`}
                title="แตะเพื่อขยายดูรูปสถานที่จริง / ดูหน้าร้าน Street View"
              >
                {!imgError && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={visual.imageUrl}
                    alt={item.main_place || 'Destination'}
                    loading="lazy"
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                  />
                )}
                <span className="absolute bottom-1 left-1 px-1.5 py-0.2 rounded-md bg-black/65 text-white text-[9px] font-bold backdrop-blur-xs">
                  {visual.emoji}
                </span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCustomPhotoModal(true);
                }}
                className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-slate-900/85 hover:bg-blue-600 text-white border border-white/25 shadow-sm cursor-pointer transition-colors"
                title="เปลี่ยนรูปสถานที่ (เลือกรูป Google Maps / อัปโหลด PNG)"
              >
                <Camera className="h-3 w-3" />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                  {visual.emoji} {visual.tagLabel}
                </span>
                {visual.isCustomPhoto ? (
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[9px] font-black">
                    ✨ รูปของฉัน
                  </span>
                ) : visual.photoSource === 'google_places' ? (
                  <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-[#1e2027] text-slate-500 dark:text-slate-400 text-[9px] font-semibold">
                    Google Maps
                  </span>
                ) : null}
              </div>
              <a
                href={mainPlaceMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-base sm:text-lg font-black text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1.5 transition-colors cursor-pointer group/title leading-relaxed text-left break-words"
              >
                <span>{item.main_place}</span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover/title:text-blue-500 transition-colors shrink-0" />
              </a>
            </div>

            {visited && (
              <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed border-rose-500/70 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black rotate-[-6deg]">
                <span>済</span>
                <span>VISITED</span>
              </span>
            )}
          </div>

          {/* Transit Details text if any */}
          {transitGuide.details && (
            <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-800/40 text-left flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/20 dark:bg-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                <Bus className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 mr-1.5">
                  การเดินทาง:
                </span>
                <span className="text-xs text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
                  {transitGuide.details}
                </span>
              </div>
            </div>
          )}

          {/* Food & Dining Recommendations */}
          {item.food_recommendation && (
            <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/40 text-left transition-all space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 dark:bg-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                    <Utensils className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-300">
                    ร้านอาหารแนะนำ / ของกินเด่น
                  </span>
                </div>
                {foodSearchUrl && (
                  <a
                    href={foodSearchUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-600 dark:hover:bg-amber-500 shadow-2xs hover:scale-102 active:scale-98 transition-all shrink-0 cursor-pointer"
                  >
                    <span>แผนที่ร้าน 📍</span>
                    <ExternalLink className="h-2.5 w-2.5 opacity-80" />
                  </a>
                )}
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-200 font-medium leading-relaxed pl-8 text-left">
                {item.food_recommendation}
              </p>
            </div>
          )}

          {/* Backup Plan (Plan B) */}
          {item.backup_plan && (
            <div className="pt-1 text-left">
              <button
                type="button"
                onClick={() => onTogglePlanB(item.id)}
                className="text-xs font-bold text-slate-700 dark:text-slate-300 inline-flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
              >
                <div className="w-5 h-5 rounded-md bg-rose-500/15 dark:bg-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <Shield className="h-3 w-3" />
                </div>
                <span>แผนสำรอง (Plan B)</span>
                {isPlanBOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              {isPlanBOpen && (
                <div className="p-3.5 mt-2 rounded-2xl bg-slate-50 dark:bg-[#121316] text-xs text-slate-700 dark:text-slate-200 space-y-2.5 border border-slate-200/70 dark:border-[#262932] text-left">
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-left">
                    รายการสถานที่ & ร้านอาหารสำรอง:
                  </div>
                  <div className="space-y-2">
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
                            className="p-2.5 rounded-xl bg-white dark:bg-[#1e2027] border border-slate-200/60 dark:border-[#262932] flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all text-left"
                          >
                            <span className="font-medium text-slate-800 dark:text-slate-200 leading-relaxed text-left flex-1">
                              {line}
                            </span>
                            <a
                              href={lineMapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 transition-all shrink-0 cursor-pointer shadow-2xs"
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
        </div>

        {/* Clean 2-Button Action Footer (Navigate Maps | Show to Staff Card) */}
        <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-[#262932] border-t border-slate-100 dark:border-[#262932] bg-slate-50/50 dark:bg-[#121316]/60 text-xs font-bold text-slate-700 dark:text-slate-300">
          <a
            href={mainPlaceDirectionsUrl}
            target="_blank"
            rel="noreferrer"
            className="min-h-11 py-2.5 px-3 flex items-center justify-center gap-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 active:bg-blue-100/50 transition-colors cursor-pointer text-center touch-manipulation"
          >
            <Navigation className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span className="truncate">นำทาง Maps</span>
          </a>

          <button
            type="button"
            onClick={() => setShowStaffModal(true)}
            className="min-h-11 py-2.5 px-3 flex items-center justify-center gap-1.5 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 dark:hover:text-amber-400 active:bg-amber-100/50 transition-colors cursor-pointer text-center touch-manipulation"
            title="แสดงชื่อสถานที่ตัวใหญ่ให้คนขับแท็กซี่หรือพนักงานสถานีรถไฟดู"
          >
            <Eye className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span className="truncate">โชว์ถามทาง 🚕</span>
          </button>
        </div>
      </div>
    </div>

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

      <CustomPlacePhotoModal
        isOpen={showCustomPhotoModal}
        onClose={() => setShowCustomPhotoModal(false)}
        placeName={item.main_place || 'จุดหมาย'}
        city={item.city}
        itemId={item.id}
        tripId={item.trip_id}
        currentAutoImageUrl={visual.imageUrl}
      />

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
    </>
  );
}

/**
 * 2. Thumbnail / Magazine Grid View (Ref: Trip.com / Airbnb / Lemon8)
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
  const [imgError, setImgError] = React.useState(false);

  const visual = usePlaceVisualMeta(item.main_place, item.city, idx, item.id, item.trip_id);
  const transitGuide = parseTransitInfo(item.transport_info);
  const { mainPlaceMapsUrl, mainPlaceDirectionsUrl } = buildStopUrls(item);

  React.useEffect(() => {
    setImgError(false);
  }, [visual.imageUrl]);

  return (
    <>
      <div
        className={`group rounded-3xl border overflow-hidden flex flex-col justify-between transition-all duration-300 card-elevation ${
          visited
            ? 'border-emerald-300 dark:border-emerald-800/70 bg-emerald-50/15 dark:bg-emerald-950/15'
            : 'border-slate-200/90 dark:border-[#262932] bg-white dark:bg-[#181a20] hover:border-blue-500/60 hover:-translate-y-0.5'
        }`}
      >
        {/* Top Visual Thumbnail with aspect-ratio to prevent CLS */}
        <div>
          <div
            style={{ aspectRatio: '16 / 10' }}
            onClick={() => setShowLightbox(true)}
            className={`relative w-full aspect-[16/10] overflow-hidden bg-gradient-to-br ${visual.gradient} cursor-zoom-in`}
            title="แตะที่รูปเพื่อขยายเต็มจอ / ดูหน้าร้าน Street View"
          >
            {!imgError && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={visual.imageUrl}
                alt={item.main_place || 'Destination'}
                loading="lazy"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/15" />

            {/* Top Overlay Badges */}
            <div
              className="absolute top-2.5 inset-x-2.5 flex items-center justify-between gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-1 flex-wrap">
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-black/60 text-white backdrop-blur-md border border-white/15">
                  {item.date_label || `Day ${idx + 1}`}
                </span>
                {item.time_slot && (
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-600/85 text-white backdrop-blur-md">
                    {item.time_slot}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={toggleVisited}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-black backdrop-blur-md border transition-all cursor-pointer active:scale-95 ${
                  visited
                    ? 'bg-emerald-500 text-white border-emerald-300 shadow-md'
                    : 'bg-black/55 text-white border-white/25 hover:bg-black/75'
                }`}
              >
                {visited ? '💮 แวะแล้ว (済)' : '🐾 เช็กอิน'}
              </button>
            </div>

            {/* Bottom Overlay Landmark Tag & City */}
            <div className="absolute bottom-2.5 inset-x-3 flex items-end justify-between gap-2">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 drop-shadow-xs flex-wrap">
                  <span>{visual.emoji}</span>
                  <span>
                    {visual.tagLabel}
                    {item.city && !visual.tagLabel.toLowerCase().includes(item.city.toLowerCase())
                      ? ` • ${item.city}`
                      : ''}
                  </span>
                  {visual.isCustomPhoto ? (
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/80 text-white text-[9px] font-black">
                      ✨ รูปของฉัน
                    </span>
                  ) : visual.photoSource === 'google_places' ? (
                    <span className="px-1.5 py-0.2 rounded bg-white/20 text-white/95 text-[9px] font-semibold">
                      Google Maps
                    </span>
                  ) : null}
                </span>
                <h3 className="text-sm sm:text-base font-black text-white leading-snug line-clamp-2 drop-shadow-sm">
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
                  className="p-1.5 rounded-xl bg-black/50 hover:bg-black/75 text-white/90 border border-white/20 backdrop-blur-md shrink-0 cursor-pointer"
                  title="ขยายดูรูปเต็มจอ / ดูหน้าร้าน Street View"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomPhotoModal(true)}
                  className="p-1.5 rounded-xl bg-black/50 hover:bg-black/75 text-white/90 border border-white/20 backdrop-blur-md shrink-0 cursor-pointer"
                  title="เปลี่ยนรูปสถานที่ (เลือกรูป Google Maps / อัปโหลด PNG)"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
                {canEditPlan && (
                  <button
                    type="button"
                    onClick={() => onOpenEditActivity(item)}
                    className="p-1.5 rounded-xl bg-black/50 hover:bg-black/75 text-white/90 border border-white/20 backdrop-blur-md shrink-0 cursor-pointer"
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
              <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1 flex items-center gap-1.5 font-medium">
                <Bus className="h-3 w-3 text-indigo-500 shrink-0" />
                <span className="truncate">{transitGuide.details}</span>
              </p>
            ) : null}

            {item.food_recommendation ? (
              <p className="text-[11px] text-amber-700 dark:text-amber-300 line-clamp-1 flex items-center gap-1.5 font-semibold">
                <Utensils className="h-3 w-3 text-amber-500 shrink-0" />
                <span className="truncate">{item.food_recommendation}</span>
              </p>
            ) : null}

            {!transitGuide.details && !item.food_recommendation && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                แตะที่รูปเพื่อขยายเต็มจอ หรือแตะปุ่มด้านล่างเพื่อนำทาง
              </p>
            )}
          </div>
        </div>

        {/* Bottom 2-Action Bar */}
        <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-[#262932] border-t border-slate-100 dark:border-[#262932] bg-slate-50/60 dark:bg-[#121316]/60 text-[11px] font-bold text-slate-700 dark:text-slate-300">
          <a
            href={mainPlaceDirectionsUrl}
            target="_blank"
            rel="noreferrer"
            className="min-h-10 py-2 px-2 flex items-center justify-center gap-1 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 active:bg-blue-100/50 transition-colors cursor-pointer touch-manipulation"
          >
            <Navigation className="h-3 w-3 text-blue-500 shrink-0" />
            <span className="truncate">นำทาง Maps</span>
          </a>
          <button
            type="button"
            onClick={() => setShowStaffModal(true)}
            className="min-h-10 py-2 px-2 flex items-center justify-center gap-1 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 dark:hover:text-amber-400 active:bg-amber-100/50 transition-colors cursor-pointer touch-manipulation"
          >
            <Eye className="h-3 w-3 text-amber-500 shrink-0" />
            <span className="truncate">โชว์ถามทาง 🚕</span>
          </button>
        </div>
      </div>

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

      <CustomPlacePhotoModal
        isOpen={showCustomPhotoModal}
        onClose={() => setShowCustomPhotoModal(false)}
        placeName={item.main_place || 'จุดหมาย'}
        city={item.city}
        itemId={item.id}
        tripId={item.trip_id}
        currentAutoImageUrl={visual.imageUrl}
      />

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
    </>
  );
}

/**
 * 3. Compact Timeline / Checklist Row View (Ref: Wanderlog / Google Calendar)
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
  const [imgError, setImgError] = React.useState(false);
  const visual = usePlaceVisualMeta(item.main_place, item.city, idx, item.id, item.trip_id);
  const { mainPlaceMapsUrl, mainPlaceDirectionsUrl } = buildStopUrls(item);

  React.useEffect(() => {
    setImgError(false);
  }, [visual.imageUrl]);

  return (
    <>
      <div
        className={`group flex items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-2xl border transition-all ${
          visited
            ? 'border-emerald-300/80 dark:border-emerald-800/60 bg-emerald-50/25 dark:bg-emerald-950/20'
            : 'border-slate-200/80 dark:border-[#262932] bg-white dark:bg-[#181a20] hover:border-blue-400/60'
        }`}
      >
        {/* Left: Check-in Circle + Real Place Mini Thumbnail + Time */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={toggleVisited}
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border transition-all cursor-pointer active:scale-90 ${
              visited
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-2xs'
                : 'bg-slate-50 dark:bg-[#1e2027] text-slate-400 border-slate-200 dark:border-[#262932] hover:border-blue-400 hover:text-blue-500'
            }`}
            title={visited ? 'แวะแล้ว (済)' : 'กดเพื่อเช็กอิน'}
          >
            {visited ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <span className="text-xs">{visual.emoji}</span>}
          </button>

          <button
            type="button"
            onClick={() => setShowLightbox(true)}
            style={{ aspectRatio: '1 / 1' }}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br ${visual.gradient} block cursor-zoom-in`}
            title="แตะเพื่อขยายดูรูปสถานที่จริง"
          >
            {!imgError && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={visual.imageUrl}
                alt={item.main_place || 'Stop'}
                loading="lazy"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            )}
          </button>

          <div className="min-w-0 flex-1 text-left">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-mono">
                {item.date_label || `D${idx + 1}`}
              </span>
              {item.time_slot && (
                <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                  {item.time_slot}
                </span>
              )}
              {item.city && (
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 truncate">
                  • {item.city}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 mt-0.5">
              <a
                href={mainPlaceMapsUrl}
                target="_blank"
                rel="noreferrer"
                className={`text-xs sm:text-sm font-black truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${
                  visited ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'
                }`}
              >
                {item.main_place}
              </a>
              {visited && (
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 shrink-0">
                  済
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Quick Action Icons */}
        <div className="flex items-center gap-1 shrink-0">
          <a
            href={mainPlaceDirectionsUrl}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
            title="นำทาง Google Maps"
          >
            <Navigation className="h-3.5 w-3.5" />
          </a>

          <button
            type="button"
            onClick={() => setShowStaffModal(true)}
            className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition-colors cursor-pointer"
            title="โชว์ถามทาง / แท็กซี่"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>

          {canEditPlan && (
            <button
              type="button"
              onClick={() => onOpenEditActivity(item)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1e2027] transition-colors cursor-pointer"
              title="แก้ไข"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

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

      <CustomPlacePhotoModal
        isOpen={showCustomPhotoModal}
        onClose={() => setShowCustomPhotoModal(false)}
        placeName={item.main_place || 'จุดหมาย'}
        city={item.city}
        itemId={item.id}
        tripId={item.trip_id}
        currentAutoImageUrl={visual.imageUrl}
      />

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
    </>
  );
}

export const ItineraryStopCard = React.memo(ItineraryStopCardComponent);
export const ItineraryThumbnailCard = React.memo(ItineraryThumbnailCardComponent);
export const ItineraryCompactRow = React.memo(ItineraryCompactRowComponent);
