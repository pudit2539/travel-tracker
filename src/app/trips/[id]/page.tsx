// src/app/trips/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo, useDeferredValue, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/components/ThemeProvider';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import NotificationBell from '@/components/NotificationBell';
import { TripPlanTab } from '@/components/trip-tabs/TripPlanTab';

const TripExpensesTab = dynamic(
  () => import('@/components/trip-tabs/TripExpensesTab').then((m) => m.TripExpensesTab),
  { ssr: false }
);
const TripAnalyticsTab = dynamic(
  () => import('@/components/trip-tabs/TripAnalyticsTab').then((m) => m.TripAnalyticsTab),
  { ssr: false }
);
const TripMembersTab = dynamic(
  () => import('@/components/trip-tabs/TripMembersTab').then((m) => m.TripMembersTab),
  { ssr: false }
);
import {
  useOfflineSync,
  getOfflineExpenseQueue,
  enqueueOfflineExpense,
  removeOfflineQueuedExpense,
} from '@/hooks/useOfflineSync';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/PullToRefreshIndicator';
import { getCatAvatar } from '@/lib/avatars';
import { CatAvatarBadge } from '@/components/CatAvatarBadge';
import { getCustomJpyToThbRate, setCustomJpyToThbRate, convertCurrency } from '@/lib/currency';
import { triggerConfetti } from '@/lib/confetti';
import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/clipboard';
import { buildQuickExpensePrefillFromStop } from '@/lib/quickStopExpense';
import { GoshuinPassportModal } from '@/components/trip-detail/GoshuinPassportModal';
import { isSuperAdmin, TripRole, ROLE_INFO, canModifyExpense } from '@/lib/permissions';
import { getSafeSession, trackCurrentDevice } from '@/lib/sessionManager';
import { 
  CategoryItem, 
  CategoryBudgetMap, 
  MemberBudgetMap, 
  getTripCategories, 
  getCategoryBudgets, 
  getMemberBudgets, 
  getCategoryMeta 
} from '@/lib/categories';
import { getTripPhotos } from '@/lib/photos';
import { getLocalReceiptPhoto } from '@/lib/localReceipts';
import { uploadTripMedia, deleteTripMedia } from '@/lib/mediaStorage';
import { compressReceiptImage } from '@/lib/imageCompressor';
import type { ItemizedDish } from '@/components/ItemizedReceiptSplitter';
import { parseTransitInfo, formatTransitInfo } from '@/lib/transitGuide';
import { getTripExpenseSplits, setExpenseSplitMembers, deleteExpenseSplit } from '@/lib/expenseSplits';
import { getTripPaymentMethods, setExpensePaymentMethod, PaymentMethod } from '@/lib/paymentMethods';
import { syncExpenseToAccommodation } from '@/lib/accommodations';
import { syncExpenseToFlight } from '@/lib/flights';
import { calculateSettlement } from '@/lib/settlement';
import CurrencyPillSwitcher from '@/components/CurrencyPillSwitcher';
import { hydrateCustomPlacePhotosFromMap, triggerViewTransition } from '@/lib/placeThumbnails';
import { hydrateVisitedStampsFromSupabase } from '@/lib/visitedStamps';
import { hydrateStopMetaFromSupabase } from '@/lib/smartTimeline';
import { hydrateShoppingBagFromSupabase, updateShoppingBagItem, ShoppingBagItem, ShoppingItemStatus } from '@/lib/shoppingBag';
import { hydrateTicketsVaultFromSupabase } from '@/lib/ticketsVault';
import { hydratePackingChecklistFromSupabase } from '@/lib/packingChecklist';
import { hydrateStarredPlacesFromSupabase } from '@/lib/starredPlaces';
import { useTripModals } from '@/hooks/useTripModals';
import { ScanExpenseModal } from '@/components/trip-detail/modals/ScanExpenseModal';
import { ActivityFormModal } from '@/components/trip-detail/modals/ActivityFormModal';
import { ShareTripModal } from '@/components/trip-detail/modals/ShareTripModal';
import { ReceiptPreviewModal, AiKeySetupModal } from '@/components/trip-detail/modals/ReceiptAndAiKeyModals';
import type { 
  TripRow, 
  ItineraryItemRow, 
  ExpenseRow, 
  TripMemberWithProfile, 
  ProfileRow 
} from '@/types/database.types';

// Code Splitting / Lazy Loaded Modals for 50%+ lighter initial bundle
const ProfileModal = dynamic(() => import('@/components/ProfileModal'), { ssr: false });
const SettlementModal = dynamic(() => import('@/components/SettlementModal'), { ssr: false });
const AIAssistantModal = dynamic(() => import('@/components/AIAssistantModal'), { ssr: false });
const BudgetCategoryModal = dynamic(() => import('@/components/BudgetCategoryModal'), { ssr: false });
const PrintableItineraryModal = dynamic(() => import('@/components/PrintableItineraryModal'), { ssr: false });
const PhotoScrapbookModal = dynamic(() => import('@/components/PhotoScrapbookModal'), { ssr: false });
const VersionRollbackModal = dynamic(() => import('@/components/VersionRollbackModal'), { ssr: false });
const QuickCurrencyCalculator = dynamic(() => import('@/components/QuickCurrencyCalculator'), { ssr: false });
const GourmetRadarModal = dynamic(() => import('@/components/GourmetRadarModal'), { ssr: false });
const DiningDecisionPickerModal = dynamic(() => import('@/components/DiningDecisionPickerModal'), { ssr: false });
const TicketPassLockerModal = dynamic(() => import('@/components/TicketPassLockerModal'), { ssr: false });
const PackingChecklistModal = dynamic(() => import('@/components/PackingChecklistModal'), { ssr: false });
const TravelHubModal = dynamic(() => import('@/components/TravelHubModal'), { ssr: false });
const ExpenseDetailModal = dynamic(() => import('@/components/ExpenseDetailModal'), { ssr: false });
const TransferOwnershipModal = dynamic(() => import('@/components/TransferOwnershipModal'), { ssr: false });
const AddMemberModal = dynamic(() => import('@/components/AddMemberModal'), { ssr: false });
import { 
  MapPin, 
  Moon, Sun, 
  ArrowLeft, Loader2, 
  Share2, Users, PieChart, Sparkles, 
  X, AlertCircle, 
  CheckCircle2, DollarSign, 
  Bot, Wifi, WifiOff, 
  LogOut, Receipt,
  Compass, Eye
} from 'lucide-react';

const getNowMs = () => Date.now();

function omitPaymentMethod<T extends Record<string, any>>(row: T): Omit<T, 'payment_method'> {
  const copy = { ...row };
  delete copy.payment_method;
  return copy;
}

export default function TripDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const rawId = params?.id;
  const tripId = Array.isArray(rawId) ? rawId[0] : (typeof rawId === 'string' ? decodeURIComponent(rawId) : '');
  const inviteParam = searchParams?.get('invite') || searchParams?.get('code') || '';
  const isReadOnlyParam = searchParams?.get('view') === 'readonly' || searchParams?.get('readonly') === '1';
  const [manualJoinCode, setManualJoinCode] = useState(inviteParam);
  const { theme, setTheme, mounted } = useTheme();

  // Offline Hook
  const { isOnline, cacheTripOffline, getOfflineTripCache } = useOfflineSync(tripId);

  // State ข้อมูลหลัก
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<ProfileRow | null>(null);
  const [trip, setTrip] = useState<TripRow | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryItemRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [members, setMembers] = useState<TripMemberWithProfile[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudgetMap>({});
  const [memberBudgets, setMemberBudgets] = useState<MemberBudgetMap>({});
  const [activeTab, setActiveTab] = useState<'plan' | 'expenses' | 'analytics' | 'members'>('plan');
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set(['plan']));
  const [heroBudgetView, setHeroBudgetView] = useState<'all' | 'me' | string>('all');
  const [itineraryViewMode, setItineraryViewMode] = useState<'list' | 'map'>('list');
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [joiningTrip, setJoiningTrip] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [fxRate, setFxRate] = useState<number>(0.235);
  const [currencyView, setCurrencyView] = useState<'foreign' | 'thb'>('foreign');
  const [showWeatherSection, setShowWeatherSection] = useState(false);

  // Track timestamps of self-initiated user actions to prevent duplicate/spammy Realtime toasts
  const lastLocalActionTime = useRef<number>(0);
  const markLocalAction = useCallback(() => {
    lastLocalActionTime.current = Date.now();
  }, []);

  // Filter states
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>('all');
  const [expensePayerFilter, setExpensePayerFilter] = useState<string>('all');
  const [expenseSearchQuery, setExpenseSearchQuery] = useState<string>('');
  const deferredExpenseSearch = useDeferredValue(expenseSearchQuery);

  // Global Toast State
  const [globalToast, setGlobalToast] = useState<{
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setGlobalToast({ id, message, type });
    setTimeout(() => {
      setGlobalToast((curr) => (curr?.id === id ? null : curr));
    }, 3200);
  }, []);

  // Encapsulated Modal states via useTripModals custom hook
  const {
    showProfileModal, setShowProfileModal,
    showSettlementModal, setShowSettlementModal,
    showAIAssistantModal, setShowAIAssistantModal,
    showBudgetCategoryModal, setShowBudgetCategoryModal,
    budgetModalInitialTab, setBudgetModalInitialTab,
    showPrintableModal, setShowPrintableModal,
    showScrapbookModal, setShowScrapbookModal,
    showRollbackModal, setShowRollbackModal,
    showPackingModal, setShowPackingModal,
    showCurrencyCalculator, setShowCurrencyCalculator,
    showTravelHubModal, setShowTravelHubModal,
    showGourmetRadarModal, setShowGourmetRadarModal,
    showDiningDecisionModal, setShowDiningDecisionModal,
    showTicketPassLockerModal, setShowTicketPassLockerModal,
    diningPickerDefaultCity, setDiningPickerDefaultCity,
    showScanModal, setShowScanModal,
    scanning, setScanning,
    savingExpense, setSavingExpense,
    ocrSuccessToast, setOcrSuccessToast,
    ocrErrorToast, setOcrErrorToast,
    showAiKeyModal, setShowAiKeyModal,
    splitAsSeparateExpenses, setSplitAsSeparateExpenses,
    selectedExpenseForDetail, setSelectedExpenseForDetail,
    startInExpenseEditMode, setStartInExpenseEditMode,
    showActivityModal, setShowActivityModal,
    editingActivity, setEditingActivity,
    showShareModal, setShowShareModal,
    showTransferModal, setShowTransferModal,
    transferTargetMember, setTransferTargetMember,
    showAddMemberModal, setShowAddMemberModal,
    previewImage, setPreviewImage,
    setPreviewLoading,
    copiedLink, setCopiedLink,
    copiedAuthLink, setCopiedAuthLink,
    copiedCode, setCopiedCode,
  } = useTripModals();

  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState('');
  const [hasSavedGeminiKey, setHasSavedGeminiKey] = useState(false);
  const [sharePrivacy, setSharePrivacy] = useState<{
    hideDates?: boolean;
    hideHotels?: boolean;
    allowPublicReadOnly?: boolean;
  }>({
    hideDates: false,
    hideHotels: false,
    allowPublicReadOnly: true,
  });

  // Sync live FX updates triggered from QuickCurrencyCalculator or TripExpensesTab
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleFxUpdated = () => {
      setFxRate(getCustomJpyToThbRate());
    };
    window.addEventListener('travel_tracker_fx_rate_updated', handleFxUpdated);
    return () => window.removeEventListener('travel_tracker_fx_rate_updated', handleFxUpdated);
  }, []);

  // Lock body scroll on mobile/iPad when any page modal is active
  useEffect(() => {
    const isAnyModalOpen = Boolean(
      showScanModal ||
      showActivityModal ||
      showShareModal ||
      showTransferModal ||
      showAddMemberModal ||
      showAiKeyModal ||
      previewImage
    );
    if (isAnyModalOpen && typeof document !== 'undefined') {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [showScanModal, showActivityModal, showShareModal, showTransferModal, showAddMemberModal, showAiKeyModal, previewImage]);

  const copyTripCode = async () => {
    if (typeof window !== 'undefined' && tripId) {
      const ok = await copyToClipboard(tripId);
      if (ok) {
        setCopiedCode(true);
        toast.success('คัดลอกรหัสทริปเรียบร้อยแล้ว ✨');
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        toast.info('สามารถคัดลอกรหัสทริปได้จากช่องข้อความด้านล่าง');
      }
    }
  };

  const copyInviteLink = async () => {
    if (typeof window !== 'undefined' && tripId) {
      const origin = window.location.origin;
      const shareUrl = `${origin}/trips/${tripId}?invite=${tripId}`;
      const ok = await copyToClipboard(shareUrl);
      if (ok) {
        setCopiedLink(true);
        toast.success('คัดลอกลิงก์ตรงเรียบร้อยแล้ว ✨');
        setTimeout(() => setCopiedLink(false), 2000);
      } else {
        toast.info('สามารถคัดลอกลิงก์ได้จากกล่องข้อความด้านล่าง');
      }
    }
  };

  const copyAuthInviteLink = async () => {
    if (typeof window !== 'undefined' && tripId) {
      const origin = window.location.origin;
      const inviteUrl = `${origin}/login?invite=${tripId}`;
      const ok = await copyToClipboard(inviteUrl);
      if (ok) {
        setCopiedAuthLink(true);
        toast.success('คัดลอกลิงก์เชิญสมาชิกใหม่เรียบร้อยแล้ว ✨');
        setTimeout(() => setCopiedAuthLink(false), 2000);
      } else {
        toast.info('สามารถคัดลอกลิงก์ได้จากกล่องข้อความด้านล่าง');
      }
    }
  };

  const handleNativeShare = async () => {
    if (typeof window === 'undefined') return;
    const shareUrl = `${window.location.origin}/trips/${tripId}?invite=${tripId}`;
    const tripName = trip?.name || trip?.title || 'ทริปท่องเที่ยว';
    if (navigator?.share) {
      try {
        await navigator.share({
          title: `${tripName} - Travel Tracker`,
          text: `ชวนมาดูแผนเที่ยวและช่วยกันจดค่าใช้จ่ายทริป "${tripName}" ✈️`,
          url: shareUrl,
        });
        toast.success('แชร์เรียบร้อยแล้ว ✨');
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          copyInviteLink();
        }
      }
    } else {
      copyInviteLink();
    }
  };

  // Form states for Expense
  const [scannedData, setScannedData] = useState<any>({
    title: '',
    amount: '',
    category: 'shopping',
    currency: 'THB',
    receipt_url: '',
    spent_at: new Date().toISOString().split('T')[0],
    payer_id: 'me',
    payment_method: 'cash' as PaymentMethod,
    items: [] as ItemizedDish[],
  });

  // Split With State for Add Expense Modal
  const [addSplitMode, setAddSplitMode] = useState<'all' | 'single' | 'custom'>('all');
  const [addSplitWith, setAddSplitWith] = useState<string[]>([]);

  // Form states for Activity
  const [activityForm, setActivityForm] = useState({
    date_label: '',
    time_slot: '',
    city: '',
    main_place: '',
    main_place_links: [''],
    food_recommendations: [{ name: '', link: '' }],
    backup_plans: [{ text: '', link: '' }],
    transport_info: '',
    platform: '',
    best_route_tip: '',
    insert_after_order: null as number | null,
  });
  const [savingActivity, setSavingActivity] = useState(false);

  // State เปิดดู Plan B แบบ Accordion
  const [expandedPlanB, setExpandedPlanB] = useState<{ [key: string]: boolean }>({});
  const [hideFloatingPills, setHideFloatingPills] = useState(false);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    const handleScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY;
      if (delta > 12 && currentY > 120) {
        setHideFloatingPills(true);
      } else if (delta < -8 || currentY < 80) {
        setHideFloatingPills(false);
      }
      lastScrollY = currentY;

      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        setHideFloatingPills(false);
      }, 900);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, []);

  const fetchTripData = useCallback(async () => {
    if (!tripId) return;
    
    let hasCachedTrip = false;
    try {
      const offlineCached = getOfflineTripCache();
      if (offlineCached?.data) {
        if (offlineCached.data.trip) {
          setTrip(offlineCached.data.trip);
          hasCachedTrip = true;
        }
        if (offlineCached.data.itinerary) setItinerary(offlineCached.data.itinerary);
        if (offlineCached.data.expenses) setExpenses(offlineCached.data.expenses);
      }
    } catch {}

    if (!hasCachedTrip) {
      setLoading(true);
    }
    try {
      setFxRate(getCustomJpyToThbRate());

      const cats = getTripCategories(tripId);
      const cBudgets = getCategoryBudgets(tripId);
      const mBudgets = getMemberBudgets(tripId);
      setCategories(cats);
      setCategoryBudgets(cBudgets);
      setMemberBudgets(mBudgets);

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setLoading(false);
        return;
      }

      // Parallelize auth session + all 4 database queries simultaneously for instant load!
      const [
        sessionRes,
        { data: tripData },
        { data: planData },
        { data: expData },
        { data: memberData, error: memErr }
      ] = await Promise.all([
        getSafeSession(),
        supabase.from('trips').select('*').eq('id', tripId).maybeSingle(),
        supabase.from('itinerary_items').select('*').eq('trip_id', tripId).order('sort_order', { ascending: true }),
        supabase.from('expenses').select('*').eq('trip_id', tripId).order('spent_at', { ascending: false }),
        supabase.from('trip_members').select('*, profiles(*)').eq('trip_id', tripId)
      ]);

      const session = sessionRes.session;
      const rawMetaItem = planData?.find((item: any) => item.date_label === '__meta_trip_data__');
      let parsedMeta: any = null;
      if (rawMetaItem?.backup_plan) {
        try {
          parsedMeta = JSON.parse(rawMetaItem.backup_plan);
        } catch {}
      }
      const allowGuestReadOnly = isReadOnlyParam && parsedMeta?.sharePrivacy?.allowPublicReadOnly !== false;

      if (!session?.user) {
        if (!allowGuestReadOnly) {
          router.push(`/login?returnUrl=/trips/${tripId}`);
          return;
        }
        setCurrentUser(null);
        if (!tripData) {
          setTrip(null);
          setLoading(false);
          return;
        }
        setUnauthorized(false);
        setTrip(tripData);
        setExpenses([]);
        setMembers([]);
        const guestPlan = (planData || []).filter((item: any) => item.date_label !== '__meta_trip_data__');
        setItinerary(guestPlan);
        if (parsedMeta?.sharePrivacy) {
          setSharePrivacy(parsedMeta.sharePrivacy);
        }
        if (parsedMeta?.customPlacePhotos && typeof parsedMeta.customPlacePhotos === 'object' && typeof window !== 'undefined') {
          hydrateCustomPlacePhotosFromMap(parsedMeta.customPlacePhotos, tripId);
        }
        setLoading(false);
        return;
      }
      setCurrentUser(session.user);
      trackCurrentDevice(session.user.id);

      if (!tripData) {
        setTrip(null);
        setLoading(false);
        return;
      }

      // ตรวจสอบสิทธิ์การเข้าถึงทริป (ต้องเป็นผู้สร้าง หรือเป็นสมาชิกในตาราง trip_members หรือ Super Admin หรือเปิดลิงก์ Read-Only)
      const isSuper = isSuperAdmin(session.user, null);
      const isCreator = tripData.created_by === session.user.id;
      const matchedMember = memberData?.find((m: any) => m.user_id === session.user.id);
      const isMember = Boolean(matchedMember);

      if (!isCreator && !isMember && !isSuper) {
        if (allowGuestReadOnly) {
          setUnauthorized(false);
          setTrip(tripData);
          setExpenses([]);
          setMembers([]);
          const guestPlan = (planData || []).filter((item: any) => item.date_label !== '__meta_trip_data__');
          setItinerary(guestPlan);
          if (parsedMeta?.sharePrivacy) {
            setSharePrivacy(parsedMeta.sharePrivacy);
          }
          setLoading(false);
          return;
        }
        setTrip(tripData);
        setItinerary([]);
        setExpenses([]);
        setMembers([]);
        setUnauthorized(true);
        setLoading(false);
        return;
      }

      setUnauthorized(false);
      setTrip(tripData);
      setScannedData((prev: any) => ({ ...prev, currency: tripData.currency || 'JPY' }));

      if (matchedMember?.profiles) {
        setUserProfile(matchedMember.profiles);
      } else {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()
          .then(({ data: prof }) => { if (prof) setUserProfile(prof); });
      }

      let cleanPlanData: any[] = [];
      if (planData) {
        const metaItem = planData.find((item: any) => item.date_label === '__meta_trip_data__');
        cleanPlanData = planData.filter((item: any) => item.date_label !== '__meta_trip_data__');
        setItinerary(cleanPlanData);

        if (metaItem?.backup_plan) {
          try {
            const parsed = JSON.parse(metaItem.backup_plan);
            if (parsed.accommodations !== undefined && Array.isArray(parsed.accommodations)) {
              if (typeof window !== 'undefined') {
                localStorage.setItem(`travel_tracker_accommodations_${tripId}`, JSON.stringify(parsed.accommodations));
                window.dispatchEvent(new CustomEvent('travel_tracker_accommodations_updated', { detail: { tripId, stays: parsed.accommodations } }));
              }
            }
            if (parsed.flights !== undefined && Array.isArray(parsed.flights) && typeof window !== 'undefined') {
              localStorage.setItem(`flight_pass_${tripId}`, JSON.stringify(parsed.flights));
              window.dispatchEvent(new CustomEvent('travel_tracker_flights_updated', { detail: { tripId, flights: parsed.flights } }));
            } else if (parsed.flight && typeof window !== 'undefined') {
              localStorage.setItem(`flight_pass_${tripId}`, JSON.stringify(parsed.flight));
            }
            const writeStorageIfChanged = (storageKey: string, value: unknown) => {
              try {
                const serialized = JSON.stringify(value);
                if (localStorage.getItem(storageKey) !== serialized) {
                  localStorage.setItem(storageKey, serialized);
                }
              } catch {}
            };

            if (parsed.splits && typeof window !== 'undefined') {
              const localSplits = getTripExpenseSplits(tripId);
              const mergedSplits = { ...parsed.splits, ...localSplits };
              writeStorageIfChanged(`travel_tracker_expense_splits_${tripId}`, mergedSplits);
            }
            if (parsed.paymentMethods && typeof window !== 'undefined') {
              const localMethods = getTripPaymentMethods(tripId);
              const mergedMethods = { ...parsed.paymentMethods, ...localMethods };
              writeStorageIfChanged(`travel_tracker_expense_payment_methods_${tripId}`, mergedMethods);
            }
            if (parsed.customCategories && Array.isArray(parsed.customCategories) && typeof window !== 'undefined') {
              writeStorageIfChanged(`travel_tracker_custom_categories_${tripId}`, parsed.customCategories);
              setCategories(getTripCategories(tripId));
            }
            if (parsed.categoryBudgets && typeof window !== 'undefined') {
              writeStorageIfChanged(`travel_tracker_cat_budgets_${tripId}`, parsed.categoryBudgets);
              setCategoryBudgets(parsed.categoryBudgets);
            }
            if (parsed.memberBudgets && typeof window !== 'undefined') {
              writeStorageIfChanged(`travel_tracker_member_budgets_${tripId}`, parsed.memberBudgets);
              setMemberBudgets(parsed.memberBudgets);
            }
            if (parsed.photos && Array.isArray(parsed.photos) && typeof window !== 'undefined') {
              writeStorageIfChanged(`travel_tracker_photos_${tripId}`, parsed.photos);
            }
            if (parsed.settledTransfers && typeof window !== 'undefined') {
              const localSettled = (() => {
                try {
                  const raw = localStorage.getItem(`travel_tracker_settled_transfers_${tripId}`);
                  return raw ? JSON.parse(raw) : {};
                } catch { return {}; }
              })();
              const mergedSettled = { ...parsed.settledTransfers, ...localSettled };
              writeStorageIfChanged(`travel_tracker_settled_transfers_${tripId}`, mergedSettled);
            }
            if (parsed.fxRate && typeof window !== 'undefined') {
              setFxRate(parsed.fxRate);
              setCustomJpyToThbRate(parsed.fxRate);
            }
            if (parsed.ticketsVault && Array.isArray(parsed.ticketsVault) && typeof window !== 'undefined') {
              hydrateTicketsVaultFromSupabase(tripId, parsed.ticketsVault);
            }
            if (parsed.packingChecklist && Array.isArray(parsed.packingChecklist) && typeof window !== 'undefined') {
              hydratePackingChecklistFromSupabase(tripId, parsed.packingChecklist);
            }
            if (parsed.starredPlaces && Array.isArray(parsed.starredPlaces) && typeof window !== 'undefined') {
              hydrateStarredPlacesFromSupabase(tripId, parsed.starredPlaces);
            }
            if (parsed.customPlacePhotos && typeof parsed.customPlacePhotos === 'object' && typeof window !== 'undefined') {
              hydrateCustomPlacePhotosFromMap(parsed.customPlacePhotos, tripId);
            }
            if (parsed.checkedInSpots && typeof parsed.checkedInSpots === 'object' && typeof window !== 'undefined') {
              hydrateVisitedStampsFromSupabase(tripId, parsed.checkedInSpots);
            }
            if (parsed.stopMetaMap && typeof parsed.stopMetaMap === 'object' && typeof window !== 'undefined') {
              hydrateStopMetaFromSupabase(tripId, parsed.stopMetaMap);
            }
            if (parsed.shoppingBag && Array.isArray(parsed.shoppingBag) && typeof window !== 'undefined') {
              hydrateShoppingBagFromSupabase(tripId, parsed.shoppingBag);
            }
            if (parsed.trainBookings && Array.isArray(parsed.trainBookings) && typeof window !== 'undefined') {
              writeStorageIfChanged(`travel_train_bookings_${tripId}`, parsed.trainBookings);
            }
            if (parsed.sharedFunds && Array.isArray(parsed.sharedFunds) && typeof window !== 'undefined') {
              writeStorageIfChanged(`travel_shared_funds_${tripId}`, parsed.sharedFunds);
            }
            if (parsed.guardianMap && typeof parsed.guardianMap === 'object' && typeof window !== 'undefined') {
              writeStorageIfChanged(`travel_guardian_map_${tripId}`, parsed.guardianMap);
            }
            if (parsed.sharePrivacy && typeof parsed.sharePrivacy === 'object' && typeof window !== 'undefined') {
              setSharePrivacy(parsed.sharePrivacy);
              writeStorageIfChanged(`travel_share_privacy_${tripId}`, parsed.sharePrivacy);
            }
          } catch (e) {
            console.warn('Trip meta parse error:', e);
          }
        }
      }

      let uniqueExpList: any[] = [];
      if (expData) {
        const seenExpIds = new Set<string>();
        const paymentMap = getTripPaymentMethods(tripId);
        uniqueExpList = expData
          .filter((e) => {
            if (!e.id) return true;
            if (seenExpIds.has(e.id)) return false;
            seenExpIds.add(e.id);
            return true;
          })
          .map((e) => ({
            ...e,
            payment_method: e.payment_method || paymentMap[e.id] || 'cash',
          }));
        setExpenses(uniqueExpList);
      }

      // Process unique members list
      try {
        if (memberData && !memErr) {
          const seenMemKeys = new Set<string>();
          const uniqueMembers = memberData.filter((m) => {
            const k = m.user_id || m.id;
            if (seenMemKeys.has(k)) return false;
            seenMemKeys.add(k);
            return true;
          });
          setMembers(uniqueMembers);
        } else {
          const { data: simpleMembers } = await supabase
            .from('trip_members')
            .select('*')
            .eq('trip_id', tripId);
          if (simpleMembers) {
            const seenMemKeys = new Set<string>();
            const uniqueSimple = simpleMembers.filter((m) => {
              const k = m.user_id || m.id;
              if (seenMemKeys.has(k)) return false;
              seenMemKeys.add(k);
              return true;
            });
            setMembers(uniqueSimple);
          }
        }
      } catch (memE) {
        console.warn('Trip members fetch warn:', memE);
      }
      // Cache offline
      cacheTripOffline({
        trip: tripData,
        itinerary: cleanPlanData || [],
        expenses: uniqueExpList || [],
        categories: cats,
        categoryBudgets: cBudgets,
      });

    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [tripId, cacheTripOffline, getOfflineTripCache, router, isReadOnlyParam]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void fetchTripData();
    });
    return () => {
      cancelled = true;
    };
  }, [fetchTripData]);

  // 100% Offline-First Expense Queue Auto-Flush when internet reconnects
  useEffect(() => {
    if (!isOnline || !tripId) return;
    const queued = getOfflineExpenseQueue(tripId);
    if (queued.length === 0) return;

    let cancelled = false;
    (async () => {
      let syncedCount = 0;
      for (const item of queued) {
        if (cancelled) break;
        try {
          const row = item.payload;
          const { data: insertedRows, error } = await supabase
            .from('expenses')
            .insert([row as any])
            .select();
          if (error) {
            const fallbackRow = omitPaymentMethod(row as Record<string, any>);
            const { data: fbRows, error: err2 } = await supabase
              .from('expenses')
              .insert([fallbackRow as any])
              .select();
            if (err2) throw err2;
            if (fbRows && fbRows[0]) {
              setExpensePaymentMethod(tripId, fbRows[0].id, row.payment_method || 'cash');
            }
          } else if (insertedRows && insertedRows[0]) {
            setExpensePaymentMethod(tripId, insertedRows[0].id, row.payment_method || 'cash');
          }
          removeOfflineQueuedExpense(tripId, item.localId);
          syncedCount += 1;
        } catch (err) {
          console.warn('Offline expense sync deferred:', err);
          break;
        }
      }
      if (syncedCount > 0 && !cancelled) {
        markLocalAction();
        fetchTripData();
        toast.success(`☁️ ซิงก์ค่าใช้จ่ายที่บันทึกไว้ตอนออฟไลน์ (${syncedCount} รายการ) ขึ้นระบบแล้ว!`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOnline, tripId, fetchTripData, markLocalAction]);

  // Supabase Realtime Subscription: ฟังการเปลี่ยนแปลงแบบ Real-time (พร้อม debounce เพื่อลด query ซ้ำซ้อนเมื่อมี batch edits)
  const currentUserId = currentUser?.id;
  useEffect(() => {
    if (!tripId) return;

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleFetchTripData = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        fetchTripData();
      }, 320);
    };

    const channel = supabase
      .channel(`trip-realtime-${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_members',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload: any) => {
          console.log('[Realtime] trip_members event:', payload);
          const isSelf = Date.now() - lastLocalActionTime.current < 4500;

          if (payload.eventType === 'INSERT') {
            if (!isSelf && payload.new?.user_id !== currentUserId) {
              toast.info('✨ มีสมาชิกใหม่เข้าร่วมทริปแล้ว!');
            }
          } else if (payload.eventType === 'UPDATE') {
            if (currentUserId && payload.new?.user_id === currentUserId) {
              const newRole = payload.new?.role;
              const roleLabel = ROLE_INFO[newRole as TripRole]?.label || newRole;
              if (!isSelf) {
                toast.success(`✨ สิทธิ์การเข้าถึงของคุณถูกปรับปรุงเป็น "${roleLabel}"`);
              }
            } else if (!isSelf) {
              toast.info('มีการอัปเดตสิทธิ์หรือข้อมูลสมาชิกในทริป');
            }
          } else if (payload.eventType === 'DELETE') {
            if (currentUserId && payload.old?.user_id === currentUserId) {
              toast.error('คุณถูกนำออกจากทริปนี้แล้ว');
            } else if (!isSelf) {
              toast.info('มีสมาชิกออกจากทริป');
            }
          }
          scheduleFetchTripData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${tripId}`,
        },
        (payload: any) => {
          console.log('[Realtime] trips event:', payload);
          const isSelf = Date.now() - lastLocalActionTime.current < 4500;
          if (payload.eventType === 'UPDATE' && !isSelf) {
            toast.info('มีการอัปเดตข้อมูลทริป');
          }
          scheduleFetchTripData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload: any) => {
          const isSelf = 
            Date.now() - lastLocalActionTime.current < 4500 || 
            (currentUserId && (payload.new?.created_by === currentUserId || payload.new?.payer_id === currentUserId));

          // Only notify when another member makes changes
          if (!isSelf) {
            if (payload.eventType === 'INSERT') {
              toast.info('💸 เพื่อนร่วมทริปบันทึกรายการใช้จ่ายใหม่');
            } else if (payload.eventType === 'UPDATE') {
              toast.info('✏️ เพื่อนร่วมทริปแก้ไขรายการใช้จ่าย');
            } else if (payload.eventType === 'DELETE') {
              toast.info('🗑️ เพื่อนร่วมทริปลบรายการใช้จ่าย');
            }
          }
          scheduleFetchTripData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'itinerary_items',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload: any) => {
          const isSelf = 
            Date.now() - lastLocalActionTime.current < 4500 || 
            (currentUserId && payload.new?.updated_by === currentUserId);

          if (payload.new?.date_label !== '__meta_trip_data__' && payload.old?.date_label !== '__meta_trip_data__') {
            if (!isSelf && (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE')) {
              toast.info('🗓️ เพื่อนร่วมทริปอัปเดตแผนการเดินทาง');
            }
          }
          scheduleFetchTripData();
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] Subscription status for trip ${tripId}:`, status);
      });

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, [tripId, currentUserId, fetchTripData]);

  const handleJoinTripDirectly = async (codeToUse?: string) => {
    if (!currentUser || !tripId) return;
    const finalCode = (codeToUse || manualJoinCode || inviteParam || '').trim();
    if (finalCode !== tripId) {
      toast.error('รหัสเชิญไม่ถูกต้อง กรุณาขอรหัสเชิญที่ถูกต้องจากเจ้าของทริป');
      return;
    }
    setJoiningTrip(true);
    try {
      // ตรวจสอบว่าเคยเป็นสมาชิกอยู่แล้วหรือไม่
      const { data: existingMember } = await supabase
        .from('trip_members')
        .select('id, role')
        .eq('trip_id', tripId)
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (!existingMember) {
        const { error } = await supabase.from('trip_members').insert([
          {
            trip_id: tripId,
            user_id: currentUser.id,
            role: 'plan_only', // เริ่มต้นด้วยสิทธิ์ดูเฉพาะแผนเที่ยวเสมอ (ปลอดภัยที่สุด)
          },
        ]);
        if (error) {
          toast.error('ไม่สามารถเข้าร่วมทริปได้: ' + error.message);
          return;
        }
      }
      toast.success('เข้าร่วมทริปเรียบร้อยแล้ว! (เริ่มต้นด้วยสิทธิ์ดูเฉพาะแผนเที่ยว) 🎉');
      setUnauthorized(false);
      fetchTripData();
    } catch (e: any) {
      toast.error('เกิดข้อผิดพลาด: ' + (e.message || ''));
    } finally {
      setJoiningTrip(false);
    }
  };

  // ตรวจสอบ Gemini API Key จาก Browser LocalStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedKey = localStorage.getItem('travel_tracker_gemini_api_key');
    if (!savedKey) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setHasSavedGeminiKey(true);
      setGeminiApiKeyInput(savedKey);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveGeminiKey = (key: string) => {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem('travel_tracker_gemini_api_key', trimmed);
      setHasSavedGeminiKey(true);
      setShowAiKeyModal(false);
      setOcrErrorToast(null);
      setOcrSuccessToast('✅ บันทึก Gemini API Key เรียบร้อยแล้ว พร้อมสแกนใบเสร็จจริง!');
      setTimeout(() => setOcrSuccessToast(null), 4000);
    } else {
      localStorage.removeItem('travel_tracker_gemini_api_key');
      setHasSavedGeminiKey(false);
      setShowAiKeyModal(false);
    }
  };

  const userDisplayName = userProfile?.display_name || currentUser?.user_metadata?.display_name || currentUser?.email?.split('@')[0] || 'นักเดินทาง';
  const userCat = getCatAvatar(userProfile?.avatar_id || currentUser?.user_metadata?.avatar_id);

  // คำนวณยอดเงินรวม (แปลงทุกค่าใช้จ่ายเป็นสกุลเงินหลักของทริป)
  const tripBaseCurrency = trip?.currency || 'THB';

  // รายชื่อผู้จ่ายคนอื่นๆ ทั้งหมด (สำหรับแท็บตัวกรองรายจ่าย กรองตัวฉันเองออกอย่างสมบูรณ์)
  const otherPayers = useMemo(() => {
    const myId = currentUser?.id?.toLowerCase();
    const myName = userDisplayName?.trim().toLowerCase();
    const myEmail = currentUser?.email?.trim().toLowerCase();

    const map = new Map<string, { key: string; name: string; avatar?: string }>();

    // 1. จากตารางสมาชิก (Members)
    members.forEach((m) => {
      const mUserId = m.user_id?.toLowerCase();
      const mName = (m.profiles?.display_name || m.profiles?.email?.split('@')[0] || 'สมาชิก').trim();
      const mEmail = m.profiles?.email?.trim().toLowerCase();

      const isMe = (myId && mUserId === myId) || 
                   (myName && mName.toLowerCase() === myName) || 
                   (myEmail && mEmail === myEmail);
      if (isMe) return;

      const norm = mName.toLowerCase();
      const key = m.user_id || mName;
      if (!map.has(norm) && !map.has(key)) {
        const obj = { key, name: mName, avatar: m.profiles?.avatar_id || undefined };
        map.set(norm, obj);
        map.set(key, obj);
      }
    });

    // 2. จากประวัติค่าใช้จ่าย (Expenses)
    expenses.forEach((e) => {
      const pName = (e.payer_name || '').trim();
      if (!pName) return;

      const isMe = (myId && e.payer_id?.toLowerCase() === myId) || 
                   (myName && pName.toLowerCase() === myName);
      if (isMe) return;

      const norm = pName.toLowerCase();
      const pKey = e.payer_id || pName;
      if (!map.has(norm) && !map.has(pKey)) {
        const obj = { key: pKey, name: pName, avatar: e.payer_avatar || undefined };
        map.set(norm, obj);
        map.set(pKey, obj);
      }
    });

    return Array.from(new Set(map.values()));
  }, [members, expenses, currentUser, userDisplayName]);

  // สมาชิกทั้งหมดสำหรับใช้ใน Itemized Receipt Splitter
  const mySplitId = currentUser?.id || 'me';
  const mySplitName = userDisplayName || currentUser?.user_metadata?.display_name || currentUser?.email?.split('@')[0] || 'ฉัน';
  const mySplitAvatar = userProfile?.avatar_id || currentUser?.user_metadata?.avatar_id || 'cat_pink';
  const allMembersForSplit = useMemo(
    () => [
      { id: mySplitId, name: `${mySplitName} (ฉัน)`, avatar: mySplitAvatar },
      ...otherPayers.map((p) => ({
        id: p.key || p.name,
        name: p.name,
        avatar: p.avatar || 'cat_purple',
      })),
    ],
    [mySplitId, mySplitName, mySplitAvatar, otherPayers]
  );

  // จัดการการนำเข้าไฟล์ Excel
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const [{ parseTripExcel }, buffer] = await Promise.all([
        import('@/lib/excelParser'),
        file.arrayBuffer(),
      ]);
      const parsedItems = parseTripExcel(buffer);

      if (parsedItems.length === 0) {
        toast.error('ไม่พบข้อมูลแผนเที่ยวในไฟล์ Excel หรือโครงสร้างตารางไม่ตรง');
        return;
      }

      const formatted = parsedItems.map((item, idx) => ({
        ...item,
        trip_id: tripId,
        sort_order: itinerary.length + idx,
      }));

      markLocalAction();
      const { error } = await supabase.from('itinerary_items').insert(formatted);
      if (!error) {
        triggerConfetti();
        toast.success(`🎉 นำเข้าแผนเที่ยวสำเร็จจำนวน ${parsedItems.length} รายการ!`);
        fetchTripData();
      } else {
        toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message);
      }
    } catch (err: any) {
      toast.error('ไม่สามารถประมวลผลไฟล์ได้: ' + err.message);
    }
  };

  // ย้ายแถวกิจกรรมขึ้น / ลง
  const handleMoveActivity = async (currentIndex: number, direction: 'up' | 'down') => {
    if (reordering) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= itinerary.length) return;

    setReordering(true);
    const updated = [...itinerary];
    const temp = updated[currentIndex];
    updated[currentIndex] = updated[targetIndex];
    updated[targetIndex] = temp;

    setItinerary(updated);
    markLocalAction();

    try {
      await Promise.all([
        supabase
          .from('itinerary_items')
          .update({ sort_order: targetIndex })
          .eq('id', updated[targetIndex].id),
        supabase
          .from('itinerary_items')
          .update({ sort_order: currentIndex })
          .eq('id', updated[currentIndex].id),
      ]);
    } catch (err) {
      console.error('Failed to reorder activity:', err);
      fetchTripData();
    } finally {
      setReordering(false);
    }
  };

  // Drag & Drop สลับลำดับจุดแวะในมุมมองตารางเวลาย่อ (Compact View)
  const handleReorderActivity = useCallback(
    async (draggedId: string, targetId: string) => {
      if (reordering || !draggedId || !targetId || draggedId === targetId) return;
      const fromIdx = itinerary.findIndex((it) => String(it.id) === String(draggedId));
      const toIdx = itinerary.findIndex((it) => String(it.id) === String(targetId));
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;

      setReordering(true);
      const targetDayLabel = itinerary[toIdx]?.date_label;
      const reordered = [...itinerary];
      const [moved] = reordered.splice(fromIdx, 1);
      const updatedMoved =
        targetDayLabel && moved.date_label !== targetDayLabel
          ? { ...moved, date_label: targetDayLabel }
          : moved;
      reordered.splice(toIdx, 0, updatedMoved);

      const normalized = reordered.map((it, idx) => ({ ...it, sort_order: idx }));
      triggerViewTransition(() => {
        setItinerary(normalized);
      });
      markLocalAction();

      try {
        const minIdx = Math.min(fromIdx, toIdx);
        const maxIdx = Math.max(fromIdx, toIdx);
        const affected = normalized.slice(minIdx, maxIdx + 1);
        await Promise.all(
          affected
            .filter((it) => Boolean(it.id))
            .map((it) =>
              supabase
                .from('itinerary_items')
                .update({ sort_order: it.sort_order, date_label: it.date_label })
                .eq('id', it.id)
            )
        );
        toast.success(`สลับลำดับ "${moved.main_place}" เรียบร้อยแล้ว ✨`);
      } catch (err) {
        console.error('Failed to drag-reorder activity:', err);
        fetchTripData();
      } finally {
        setReordering(false);
      }
    },
    [reordering, itinerary, markLocalAction, fetchTripData]
  );

  const handleOpenAddActivity = (
    afterOrderOrPrefill:
      | number
      | null
      | {
          title?: string;
          main_place?: string;
          location?: string;
          city?: string;
          category?: string;
          mapsQuery?: string;
          main_place_links?: string[];
          transport_info?: string;
          food_recommend?: string;
          date_label?: string;
          afterOrder?: number | null;
        } = null,
    defaultDateLabel?: string
  ) => {
    resetActivityForm();
    setEditingActivity(null);
    const isPrefillObj = afterOrderOrPrefill !== null && typeof afterOrderOrPrefill === 'object';
    const prefill = isPrefillObj ? afterOrderOrPrefill : null;
    const afterOrder = isPrefillObj ? (prefill?.afterOrder ?? null) : afterOrderOrPrefill;
    const mapsUrl =
      prefill?.main_place_links?.[0] ||
      (prefill?.mapsQuery
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(prefill.mapsQuery)}`
        : '');

    setActivityForm((prev) => ({
      ...prev,
      insert_after_order: typeof afterOrder === 'number' ? afterOrder : null,
      date_label: defaultDateLabel || prefill?.date_label || prev.date_label,
      city: prefill?.city || prefill?.location || prev.city,
      main_place: prefill?.main_place || prefill?.title || prev.main_place,
      main_place_links: mapsUrl ? [mapsUrl] : prev.main_place_links,
      food_recommendations: prefill?.food_recommend
        ? [{ name: prefill.food_recommend, link: '' }]
        : prev.food_recommendations,
      transport_info: prefill?.transport_info || prev.transport_info,
    }));
    setShowActivityModal(true);
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityForm.main_place.trim()) return;

    setSavingActivity(true);

    const placeLinksFiltered = activityForm.main_place_links.filter((l) => l.trim().length > 0);
    const foodFormatted = activityForm.food_recommendations
      .filter((f) => f.name.trim().length > 0)
      .map((f) => f.name.trim())
      .join(', ');
    const foodLinksFiltered = activityForm.food_recommendations
      .map((f) => f.link.trim())
      .filter((l) => l.length > 0);

    const backupFormatted = activityForm.backup_plans
      .filter((b) => b.text.trim().length > 0)
      .map((b) => b.text.trim())
      .join('\n\n');
    const backupLinksFiltered = activityForm.backup_plans
      .map((b) => b.link.trim())
      .filter((l) => l.length > 0);

    try {
      const fullTransport = formatTransitInfo(
        activityForm.platform,
        activityForm.best_route_tip,
        activityForm.transport_info
      );

      if (editingActivity) {
        const { error } = await supabase
          .from('itinerary_items')
          .update({
            date_label: activityForm.date_label,
            time_slot: activityForm.time_slot,
            city: activityForm.city,
            main_place: activityForm.main_place,
            main_place_links: placeLinksFiltered,
            food_recommendation: foodFormatted,
            food_links: foodLinksFiltered,
            transport_info: fullTransport,
            backup_plan: backupFormatted,
            backup_links: backupLinksFiltered,
          })
          .eq('id', editingActivity.id);

        if (!error) {
          markLocalAction();
          setShowActivityModal(false);
          fetchTripData();
          toast.success(editingActivity ? 'แก้ไขกิจกรรมเรียบร้อยแล้ว' : 'เพิ่มกิจกรรมในแผนเที่ยวแล้ว');
        } else {
          toast.error('เกิดข้อผิดพลาดในการแก้ไข: ' + error.message);
        }
      } else {
        let nextOrder = itinerary.length;
        if (activityForm.insert_after_order !== null) {
          nextOrder = activityForm.insert_after_order + 1;
        }

        const { error } = await supabase.from('itinerary_items').insert([
          {
            trip_id: tripId,
            date_label: activityForm.date_label,
            time_slot: activityForm.time_slot,
            city: activityForm.city,
            main_place: activityForm.main_place,
            main_place_links: placeLinksFiltered,
            food_recommendation: foodFormatted,
            food_links: foodLinksFiltered,
            transport_info: fullTransport,
            backup_plan: backupFormatted,
            backup_links: backupLinksFiltered,
            sort_order: nextOrder,
          },
        ]);

        if (!error) {
          markLocalAction();
          setShowActivityModal(false);
          fetchTripData();
          toast.success('เพิ่มกิจกรรมในแผนเที่ยวแล้ว');
        } else {
          toast.error('เกิดข้อผิดพลาดในการเพิ่มกิจกรรม: ' + error.message);
        }
      }
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setSavingActivity(false);
    }
  };

  const handleOpenEditActivity = (item: any) => {
    setEditingActivity(item);

    let placeLinks = item.main_place_links || [];
    if (placeLinks.length === 0) placeLinks = [''];

    let foodItems = (item.food_recommendation || '')
      .split(',')
      .map((name: string, i: number) => ({
        name: name.trim(),
        link: item.food_links?.[i] || '',
      }))
      .filter((f: any) => f.name.length > 0);
    if (foodItems.length === 0) {
      foodItems = [{ name: item.food_recommendation || '', link: item.food_links?.[0] || '' }];
    }

    const backupLines = (item.backup_plan || '').split('\n\n').filter((l: string) => l.trim().length > 0);
    const backupLinks = item.backup_links || [];
    let backupItems = backupLines.map((text: string, i: number) => ({
      text,
      link: backupLinks[i] || '',
    }));
    if (backupItems.length === 0) {
      backupItems = [{ text: item.backup_plan || '', link: backupLinks[0] || '' }];
    }

    const transit = parseTransitInfo(item.transport_info);

    setActivityForm({
      date_label: item.date_label || '',
      time_slot: item.time_slot || '',
      city: item.city || '',
      main_place: item.main_place || '',
      main_place_links: placeLinks,
      food_recommendations: foodItems,
      backup_plans: backupItems,
      transport_info: transit.details,
      platform: transit.platform,
      best_route_tip: transit.bestTip,
      insert_after_order: null,
    });
    setShowActivityModal(true);
  };

  const handleDeleteActivity = async (id: string) => {
    if (!confirm('ต้องการลบกิจกรรมนี้ออกจากแผนเที่ยวใช่หรือไม่?')) return;
    markLocalAction();
    const { error } = await supabase.from('itinerary_items').delete().eq('id', id);
    if (!error) {
      fetchTripData();
      showToast('ลบกิจกรรมออกจากแผนเที่ยวแล้ว', 'info');
    }
  };

  // TabiPlan Upgrade: ย้ายจุดแวะไปวันอื่นในคลิกเดียว (Move Stop to Another Day)
  const handleMoveStopToDay = async (item: any, targetDayLabel: string) => {
    if (!item?.id || !targetDayLabel) return;
    markLocalAction();
    const { error } = await supabase
      .from('itinerary_items')
      .update({ date_label: targetDayLabel })
      .eq('id', item.id);
    if (!error) {
      setItinerary((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, date_label: targetDayLabel } : it))
      );
      fetchTripData();
      toast.success(`📅 ย้าย "${item.main_place}" ไปยัง ${targetDayLabel} เรียบร้อยแล้ว!`);
    } else {
      toast.error('ไม่สามารถย้ายวันได้: ' + error.message);
    }
  };

  // TabiPlan Upgrade: ซิงก์รายการกระเป๋าช้อปปิ้งเข้าบิลค่าใช้จ่ายอัตโนมัติเมื่อติ๊ก "ซื้อแล้ว"
  const handleSyncShoppingExpense = async (shopItem: ShoppingBagItem, nextStatus: ShoppingItemStatus) => {
    if (!tripId) return;
    try {
      if (nextStatus === 'bought') {
        const unitPrice = Number(shopItem.actualPrice ?? shopItem.estPrice ?? 0);
        const totalAmt = Math.round(unitPrice * Math.max(1, Number(shopItem.quantity || 1)));
        if (totalAmt <= 0) {
          toast.success(`✅ ติ๊กซื้อ "${shopItem.name}" แล้ว`);
          return;
        }
        const payerName =
          userProfile?.display_name ||
          currentUser?.user_metadata?.display_name ||
          currentUser?.email?.split('@')[0] ||
          'ฉัน';
        const payerAvatar =
          userProfile?.avatar_id || currentUser?.user_metadata?.avatar_id || 'cat_pink';

        const rowToInsert = {
          trip_id: tripId,
          title: `🛍️ ช้อป: ${shopItem.name}${shopItem.quantity > 1 ? ` (x${shopItem.quantity})` : ''}`,
          amount: totalAmt,
          currency: 'JPY',
          category: 'shopping',
          spent_at: new Date().toISOString().split('T')[0],
          payer_id: currentUser?.id || null,
          payer_name: payerName,
          payer_avatar: payerAvatar,
        };

        markLocalAction();
        const { data: insertedRows, error } = await supabase
          .from('expenses')
          .insert([rowToInsert])
          .select();

        if (!error && insertedRows && insertedRows[0]?.id) {
          updateShoppingBagItem(tripId, shopItem.id, { linkedExpenseId: insertedRows[0].id });
          fetchTripData();
          triggerConfetti();
          toast.success(`🛍️ ซื้อ "${shopItem.name}" แล้ว! ตัดงบอัตโนมัติ ${totalAmt.toLocaleString()} ${rowToInsert.currency}`);
        } else {
          toast.success(`✅ ติ๊กซื้อ "${shopItem.name}" แล้ว`);
        }
      } else if (shopItem.linkedExpenseId) {
        markLocalAction();
        await supabase.from('expenses').delete().eq('id', shopItem.linkedExpenseId);
        updateShoppingBagItem(tripId, shopItem.id, { linkedExpenseId: undefined });
        fetchTripData();
        toast.info(`คืนยอดงบประมาณของ "${shopItem.name}" เรียบร้อยแล้ว`);
      }
    } catch (err) {
      console.warn('Shopping expense sync warning:', err);
    }
  };

  const resetActivityForm = () => {
    setActivityForm({
      date_label: '',
      time_slot: '',
      city: '',
      main_place: '',
      main_place_links: [''],
      food_recommendations: [{ name: '', link: '' }],
      backup_plans: [{ text: '', link: '' }],
      transport_info: '',
      platform: '',
      best_route_tip: '',
      insert_after_order: null,
    });
  };

  // สแกนใบเสร็จด้วย AI OCR พร้อม Client-Side Compression & Auth Token
  const handleReceiptImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    setOcrSuccessToast(null);
    setOcrErrorToast(null);

    try {
      // 1. Client-Side Image Compression (ย่อขนาดรูปทันทีก่อนอัปโหลด ลดจาก 5-15MB เหลือ ~250KB)
      const compressed = await compressReceiptImage(file, 1200, 0.82);

      // 2. ดึง Session Token สำหรับ Auth Check และคีย์ AI จาก LocalStorage
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      const localGeminiKey = typeof window !== 'undefined' ? localStorage.getItem('travel_tracker_gemini_api_key') : null;
      if (localGeminiKey) {
        headers['x-gemini-key'] = localGeminiKey;
      }
      const localAnthropicKey = typeof window !== 'undefined' ? localStorage.getItem('travel_tracker_anthropic_api_key') : null;
      if (localAnthropicKey) {
        headers['x-anthropic-key'] = localAnthropicKey;
      }

      // 3. ส่งข้อมูลภาพที่บีบอัดแล้วไปยัง API พร้อม Trip Currency Context
      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          imageBase64: compressed.base64, 
          mimeType: compressed.mimeType,
          tripCurrency: trip?.currency || 'THB',
        }),
      });
      const json = await res.json();

      if (json.noKey) {
        setScannedData((prev: any) => ({ ...prev, receipt_url: compressed.dataUrl }));
        setOcrErrorToast('ยังไม่ได้เชื่อมต่อ AI API Key ในระบบ กรุณาใส่ Gemini API Key เพื่อให้อ่านภาพจริง หรือกรอกรายการด้วยตนเอง');
        setShowAiKeyModal(true);
        return;
      }

      if (!json.success || !json.data) {
        setScannedData((prev: any) => ({ ...prev, receipt_url: compressed.dataUrl }));
        setOcrErrorToast(json.error || 'ไม่สามารถอ่านข้อความจากใบเสร็จนี้ได้ กรุณากรอกรายการด้วยตนเอง');
        return;
      }

      const rawItems = Array.isArray(json.data.items) ? json.data.items : [];
      const allIds = allMembersForSplit.map((m) => m.id);
      const mappedItems: ItemizedDish[] = rawItems.map((item: any, idx: number) => ({
        id: `item_${Date.now()}_${idx}`,
        name: item.name || 'รายการสินค้า',
        amount: Number(item.amount || 0),
        qty: Number(item.qty || 1),
        assignedMemberIds: allIds, // default to all members
      }));

      setScannedData((prev: any) => ({
        ...prev,
        title: json.data.merchant || prev.title || 'ค่าใช้จ่ายตามใบเสร็จ',
        amount: json.data.amount > 0 ? String(json.data.amount) : (prev.amount || ''),
        category: json.data.category || 'shopping',
        currency: json.data.currency || trip?.currency || 'THB',
        spent_at: json.data.date || prev.spent_at || new Date().toISOString().split('T')[0],
        receipt_url: compressed.dataUrl,
        items: mappedItems,
      }));

      if (mappedItems.length > 0) {
        setSplitAsSeparateExpenses(false);
        setOcrSuccessToast(`✨ AI สแกนใบเสร็จสำเร็จ: "${json.data.merchant}" (แยกได้ ${mappedItems.length} รายการ)`);
      } else {
        setOcrSuccessToast(`ℹ️ สแกนสำเร็จ: "${json.data.merchant}" ยอดรวม ${Number(json.data.amount || 0).toLocaleString()} ${json.data.currency || 'THB'} (ไม่พบรายการย่อยในใบเสร็จ)`);
      }
      setTimeout(() => {
        setOcrSuccessToast(null);
      }, 5000);
    } catch (err) {
      console.warn('OCR scan error:', err);
      const reader = new FileReader();
      reader.onload = () => {
        const fallbackUrl = reader.result as string;
        setScannedData((prev: any) => ({
          ...prev,
          receipt_url: fallbackUrl,
        }));
      };
      reader.readAsDataURL(file);
      setOcrErrorToast('ไม่สามารถสแกนใบเสร็จได้ กรุณากรอกข้อมูลด้วยตนเอง');
    } finally {
      setScanning(false);
    }
  };

  // บันทึกค่าใช้จ่าย
  const handleSaveExpense = async () => {
    if (savingExpense) return;

    // คำนวณหายอดเงินรวม (หากไม่ได้พิมพ์ยอดรวม แต่มีรายการย่อย ให้ใช้ผลรวมรายการย่อย)
    let calculatedAmount = Number(scannedData.amount);
    if ((!calculatedAmount || isNaN(calculatedAmount) || calculatedAmount <= 0) && scannedData.items && scannedData.items.length > 0) {
      calculatedAmount = scannedData.items.reduce((sum: number, it: any) => sum + (Number(it.amount) || 0), 0);
    }

    // ตั้งชื่อรายการเริ่มต้นหากไม่ได้กรอก
    let finalTitle = (scannedData.title || '').trim();
    if (!finalTitle) {
      if (scannedData.items && scannedData.items.length > 0 && scannedData.items[0]?.name) {
        finalTitle = scannedData.items[0].name;
      } else {
        finalTitle = 'ค่าใช้จ่ายทั่วไป';
      }
    }

    if (!calculatedAmount || calculatedAmount <= 0) {
      toast.error('กรุณาระบุจำนวนเงิน หรือเพิ่มรายการสินค้า');
      return;
    }

    setSavingExpense(true);
    try {
      // ระบุผู้สำรองจ่ายที่เลือก
      const selectedPayerId = scannedData.payer_id || 'me';
      const selectedPayer = allMembersForSplit.find((m) => m.id === selectedPayerId) || {
        id: currentUser?.id || 'me',
        name: userProfile?.display_name || currentUser?.user_metadata?.display_name || currentUser?.email?.split('@')[0] || 'สมาชิก',
        avatar: userProfile?.avatar_id || currentUser?.user_metadata?.avatar_id || 'cat_pink',
      };
      const payerName = selectedPayer.name.replace(' (ฉัน)', '');
      const payerAvatar = selectedPayer.avatar || 'cat_pink';
      const payerId = selectedPayer.id === 'me' ? (currentUser?.id || null) : (selectedPayer.id === selectedPayer.name ? null : selectedPayer.id);

      let receiptStorageRef = null;
      if (scannedData.receipt_url) {
        const uploadedReceipt = await uploadTripMedia({
          tripId,
          folder: 'receipts',
          dataUrl: scannedData.receipt_url,
          cacheOffline: true,
        });
        receiptStorageRef = uploadedReceipt.url;
      }

      let primaryExpenseId: string | undefined;
      // ตรวจสอบว่าเลือกแยกบันทึกเป็นรายคนหรือไม่
      if (splitAsSeparateExpenses && scannedData.items && scannedData.items.length > 0) {
        const memberTotals: Record<string, { member: any; total: number; count: number }> = {};
        allMembersForSplit.forEach((m) => {
          memberTotals[m.id] = { member: m, total: 0, count: 0 };
        });

        scannedData.items.forEach((item: ItemizedDish) => {
          const price = Number(item.amount || 0);
          const assigned = item.assignedMemberIds && item.assignedMemberIds.length > 0 
            ? item.assignedMemberIds 
            : allMembersForSplit.map((m) => m.id);
          const splitPrice = assigned.length > 0 ? price / assigned.length : 0;
          assigned.forEach((mId) => {
            if (memberTotals[mId]) {
              memberTotals[mId].total += splitPrice;
              memberTotals[mId].count += 1;
            }
          });
        });

        const rowsToInsert = Object.values(memberTotals)
          .filter((mt) => Math.round(mt.total) > 0)
          .map((mt) => {
            const isMe = mt.member.id === 'me' || mt.member.id === currentUser?.id;
            return {
              trip_id: tripId,
              title: `${finalTitle} (${mt.member.name.replace(' (ฉัน)', '')})`,
              amount: Math.round(mt.total),
              currency: scannedData.currency || trip?.currency || 'THB',
              category: scannedData.category || 'shopping',
              receipt_url: receiptStorageRef,
              spent_at: scannedData.spent_at || new Date().toISOString().split('T')[0],
              payer_id: isMe ? (currentUser?.id || null) : (mt.member.id === mt.member.name ? null : mt.member.id),
              payer_name: mt.member.name.replace(' (ฉัน)', ''),
              payer_avatar: mt.member.avatar,
              payment_method: scannedData.payment_method || 'cash',
            };
          });

        if (rowsToInsert.length > 0) {
          const { data: insertedRows, error } = await supabase.from('expenses').insert(rowsToInsert).select();
          if (error) {
            // Supabase fallback if column payment_method doesn't exist yet
            const fallbackRows = rowsToInsert.map((r) => omitPaymentMethod(r));
            const { data: fbRows, error: err2 } = await supabase.from('expenses').insert(fallbackRows).select();
            if (err2) throw err2;
            if (fbRows) {
              fbRows.forEach((r: any) => setExpensePaymentMethod(tripId, r.id, scannedData.payment_method || 'cash'));
              primaryExpenseId = fbRows[0]?.id;
            }
          } else if (insertedRows) {
            insertedRows.forEach((r: any) => setExpensePaymentMethod(tripId, r.id, scannedData.payment_method || 'cash'));
            primaryExpenseId = insertedRows[0]?.id;
          }
        }
      } else {
        // บันทึกเป็นบิลรวม 1 รายการ
        const rowToInsert = {
          trip_id: tripId,
          title: finalTitle,
          amount: calculatedAmount,
          currency: scannedData.currency || trip?.currency || 'THB',
          category: scannedData.category || 'shopping',
          receipt_url: receiptStorageRef,
          spent_at: scannedData.spent_at || new Date().toISOString().split('T')[0],
          payer_id: payerId,
          payer_name: payerName,
          payer_avatar: payerAvatar,
          payment_method: scannedData.payment_method || 'cash',
        };

        if (!isOnline) {
          const queuedItem = enqueueOfflineExpense(tripId, rowToInsert);
          primaryExpenseId = queuedItem.localId;
          setExpensePaymentMethod(tripId, queuedItem.localId, scannedData.payment_method || 'cash');
          setExpenses((prev) => [
            {
              id: queuedItem.localId,
              ...rowToInsert,
              created_at: queuedItem.queuedAt,
            } as any,
            ...prev,
          ]);
        } else {
          const { data: insertedRows, error } = await supabase.from('expenses').insert([rowToInsert]).select();
          if (error) {
            const fallbackRow = omitPaymentMethod(rowToInsert);
            const { data: fbRows, error: err2 } = await supabase.from('expenses').insert([fallbackRow]).select();
            if (err2) {
              // If network failed mid-request, fallback to offline queue seamlessly
              const queuedItem = enqueueOfflineExpense(tripId, rowToInsert);
              primaryExpenseId = queuedItem.localId;
              setExpensePaymentMethod(tripId, queuedItem.localId, scannedData.payment_method || 'cash');
              setExpenses((prev) => [
                {
                  id: queuedItem.localId,
                  ...rowToInsert,
                  created_at: queuedItem.queuedAt,
                } as any,
                ...prev,
              ]);
            } else if (fbRows && fbRows[0]) {
              setExpensePaymentMethod(tripId, fbRows[0].id, scannedData.payment_method || 'cash');
              primaryExpenseId = fbRows[0].id;
            }
          } else if (insertedRows && insertedRows[0]) {
            setExpensePaymentMethod(tripId, insertedRows[0].id, scannedData.payment_method || 'cash');
            primaryExpenseId = insertedRows[0].id;
          }
        }
      }

      // บันทึก custom split สมาชิกที่ร่วมหาร (Split With) สำหรับบิลรวม
      if (tripId && primaryExpenseId && (!scannedData.items || scannedData.items.length === 0)) {
        const finalSplit = (addSplitWith && addSplitWith.length > 0)
          ? addSplitWith
          : allMembersForSplit.map((m) => m.id);
        setExpenseSplitMembers(tripId, primaryExpenseId, finalSplit);
      }

      // Sync related expense to Accommodations / Flights if category is hotel or transport/flight
      const isHotel = scannedData.category === 'hotel' || finalTitle.toLowerCase().includes('hotel') || finalTitle.includes('โรงแรม') || finalTitle.includes('ที่พัก');
      const isFlight = scannedData.category === 'transport' || finalTitle.toLowerCase().includes('flight') || finalTitle.includes('ตั๋ว') || finalTitle.includes('บิน');

      if (isHotel) {
        syncExpenseToAccommodation(tripId, {
          id: primaryExpenseId || 'exp_' + getNowMs(),
          title: finalTitle,
          amount: calculatedAmount,
          currency: scannedData.currency || trip?.currency || 'THB',
          spent_at: scannedData.spent_at,
        }).catch(() => {});
      } else if (isFlight) {
        syncExpenseToFlight(tripId, {
          id: primaryExpenseId || 'exp_' + getNowMs(),
          title: finalTitle,
          amount: calculatedAmount,
          currency: scannedData.currency || trip?.currency || 'THB',
          spent_at: scannedData.spent_at,
        }).catch(() => {});
      }

      markLocalAction();
      triggerConfetti();
      setShowScanModal(false);
      setOcrSuccessToast(null);
      setSplitAsSeparateExpenses(false);
      setAddSplitMode('all');
      setAddSplitWith([]);
      setScannedData({
        title: '',
        amount: '',
        category: 'shopping',
        currency: trip?.currency || 'THB',
        receipt_url: '',
        spent_at: new Date().toISOString().split('T')[0],
        payer_id: 'me',
        payment_method: 'cash',
        items: [] as ItemizedDish[],
      });
      if (primaryExpenseId?.startsWith('offline-exp-')) {
        toast.success('💾 บันทึกค่าใช้จ่ายลงเครื่องแบบออฟไลน์แล้ว! จะซิงก์ขึ้นคลาวด์อัตโนมัติเมื่อมีสัญญาณเน็ต');
      } else {
        fetchTripData();
        toast.success('บันทึกค่าใช้จ่ายใหม่เรียบร้อยแล้ว! 🎉');
      }
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาดในการบันทึกค่าใช้จ่าย: ' + (err?.message || err));
    } finally {
      setSavingExpense(false);
    }
  };

  // เปิดดูรูปใบเสร็จ
  const handleOpenReceiptPreview = async (exp: any) => {
    if (!exp.receipt_url) return;
    setPreviewLoading(true);
    try {
      if (exp.receipt_url.startsWith('data:image') || exp.receipt_url.startsWith('http')) {
        setPreviewImage(exp.receipt_url);
      } else {
        const localData = await getLocalReceiptPhoto(exp.receipt_url);
        if (localData) {
          setPreviewImage(localData);
        } else {
          setPreviewImage(null);
          toast.info('รูปใบเสร็จถูกบันทึกไว้ในอุปกรณ์ต้นทางที่ถ่ายรูป ไม่พบในอุปกรณ์นี้');
        }
      }
    } catch (e) {
      console.warn('Failed to load local receipt', e);
    } finally {
      setPreviewLoading(false);
    }
  };

  // ดาวน์โหลด / บันทึกรูปภาพใบเสร็จ (รองรับ Web Share API บน iOS / Android)
  const handleDownloadReceiptImage = async (imgUrl: string) => {
    if (!imgUrl) return;
    try {
      if (imgUrl.startsWith('data:')) {
        const arr = imgUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const ext = mime.includes('png') ? '.png' : '.jpg';
        const filename = `travel_receipt_${Date.now()}${ext}`;
        const file = new File([blob], filename, { type: mime });

        if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'รูปภาพใบเสร็จ',
            });
            return;
          } catch (shareErr: any) {
            if (shareErr.name === 'AbortError') return;
          }
        }

        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        return;
      }
    } catch (e) {
      console.warn('Failed to download via blob/share', e);
    }
    const link = document.createElement('a');
    link.href = imgUrl;
    link.download = 'travel_receipt.jpg';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteExpense = async (id: string, receiptRef?: string) => {
    const targetExp = expenses.find((e) => e.id === id);
    if (targetExp && !checkCanModifyExpense(targetExp)) {
      toast.error('คุณไม่มีสิทธิ์ลบรายการนี้ (ผู้ร่วมทริปสามารถแก้ไข/ลบได้เฉพาะรายการของตนเอง)');
      return;
    }
    if (!confirm('ต้องการลบรายการค่าใช้จ่ายนี้ใช่หรือไม่?')) return;
    if (receiptRef) {
      try {
        await deleteTripMedia({ urlOrPath: receiptRef, storageKey: receiptRef });
      } catch {}
    }
    if (tripId) {
      deleteExpenseSplit(tripId, id);
    }
    markLocalAction();
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) {
      setSelectedExpenseForDetail(null);
      fetchTripData();
      showToast('ลบรายการค่าใช้จ่ายเรียบร้อยแล้ว', 'info');
    }
  };

  const handleSelectExpense = (exp: any) => {
    setSelectedExpenseForDetail(exp);
    setStartInExpenseEditMode(true);
  };

  const handleEditExpense = (exp: any) => {
    setSelectedExpenseForDetail(exp);
    setStartInExpenseEditMode(true);
  };

  const handleSaveUpdatedExpense = async (updatedExpense: any, customSplits?: string[]) => {
    const targetExp = expenses.find((e) => e.id === updatedExpense.id) || updatedExpense;
    if (!checkCanModifyExpense(targetExp)) {
      toast.error('คุณไม่มีสิทธิ์แก้ไขรายการนี้ (ผู้ร่วมทริปสามารถแก้ไข/ลบได้เฉพาะรายการของตนเอง)');
      return;
    }
    try {
      if (customSplits && updatedExpense.id && tripId) {
        setExpenseSplitMembers(tripId, updatedExpense.id, customSplits);
      }

      const { error } = await supabase
        .from('expenses')
        .update({
          title: updatedExpense.title,
          amount: Number(updatedExpense.amount),
          currency: updatedExpense.currency || tripBaseCurrency,
          category: updatedExpense.category,
          spent_at: updatedExpense.spent_at,
          payer_id: updatedExpense.payer_id,
          payer_name: updatedExpense.payer_name,
          payer_avatar: updatedExpense.payer_avatar,
          receipt_url: updatedExpense.receipt_url,
        })
        .eq('id', updatedExpense.id);

      if (error) throw error;

      markLocalAction();
      // Update in-memory state immediately for instant feedback
      setExpenses((prev) =>
        prev.map((e) => (e.id === updatedExpense.id ? { ...e, ...updatedExpense } : e))
      );
      setSelectedExpenseForDetail(null);
      fetchTripData();
      triggerConfetti();
      toast.success('บันทึกการแก้ไขค่าใช้จ่ายเรียบร้อยแล้ว ✨');
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาดในการบันทึกการแก้ไข: ' + (err?.message || err));
      throw err;
    }
  };

  // ส่งออก Excel (Dynamic import XLSX เพื่อไม่ให้หนัก Bundle หน้าแรก)
  const exportToExcel = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    const expenseRows = expenses.map((e, idx) => {
      const catMeta = getCategoryMeta(categories, e.category);
      return {
        'ลำดับ': idx + 1,
        'วันที่': e.spent_at,
        'รายการ / ร้านค้า': e.title,
        'ผู้จ่าย': e.payer_name || '-',
        'หมวดหมู่': catMeta.label,
        'จำนวนเงิน': e.amount,
        'สกุลเงิน': e.currency,
      };
    });
    const expSheet = XLSX.utils.json_to_sheet(expenseRows);
    XLSX.utils.book_append_sheet(wb, expSheet, 'Expenses');

    const planRows = itinerary.map((item, idx) => ({
      'ลำดับ': idx + 1,
      'วันที่ / Day': item.date_label,
      'เวลา': item.time_slot,
      'เมือง / ย่าน': item.city,
      'สถานที่หลัก': item.main_place,
      'ลิงก์ Google Maps': item.main_place_links?.join(', '),
      'ร้านอาหารแนะนำ': item.food_recommendation,
      'ลิงก์ร้านอาหาร': item.food_links?.join(', '),
      'การเดินทาง': item.transport_info,
      'แผนสำรอง (Plan B)': item.backup_plan,
      'ลิงก์ Plan B': item.backup_links?.join(', '),
    }));
    const planSheet = XLSX.utils.json_to_sheet(planRows);
    XLSX.utils.book_append_sheet(wb, planSheet, 'Itinerary');

    const tripTitle = (trip?.name || trip?.title || 'trip').replace(/[/\\?%*:|"<>]/g, '-');
    XLSX.writeFile(wb, `${tripTitle}_export.xlsx`);
  };

  // ส่งออกเฉพาะค่าใช้จ่ายและแผนเคลียร์หนี้เป็น Excel 4 Sheet ละเอียด
  const exportExpensesToExcel = async () => {
    try {
      const currentTripCurrency = trip?.currency || 'THB';
      const myDisplayName = userProfile?.display_name || currentUser?.user_metadata?.display_name || currentUser?.email?.split('@')[0] || 'ฉัน';
      const seenNames = new Set<string>();
      const seenIds = new Set<string>();
      const allMembersList: { name: string; avatar: string; id?: string }[] = [];

      // 1. Current user
      const myAvatar = userProfile?.avatar_id || currentUser?.user_metadata?.avatar_id || 'cat_pink';
      allMembersList.push({ name: myDisplayName, avatar: myAvatar, id: currentUser?.id });
      seenNames.add(myDisplayName.toLowerCase().trim());
      if (currentUser?.id) seenIds.add(currentUser.id.toLowerCase());
      if (currentUser?.email) seenNames.add(currentUser.email.toLowerCase().trim());

      // 2. Members from trip_members
      members.forEach((m) => {
        const name = (m.profiles?.display_name || m.profiles?.email?.split('@')[0] || 'สมาชิก').trim();
        const mUserId = m.user_id?.toLowerCase();
        const isAlreadyIn = (mUserId && seenIds.has(mUserId)) || seenNames.has(name.toLowerCase());
        if (!isAlreadyIn) {
          allMembersList.push({
            name,
            avatar: m.profiles?.avatar_id || 'cat_purple',
            id: m.user_id,
          });
          seenNames.add(name.toLowerCase());
          if (m.user_id) seenIds.add(m.user_id.toLowerCase());
          if (m.profiles?.email) seenNames.add(m.profiles.email.toLowerCase().trim());
        }
      });

      // 3. Any payers in expenses
      expenses.forEach((e) => {
        const pName = (e.payer_name || '').trim();
        const pId = e.payer_id?.toLowerCase();
        const isAlreadyIn = (pId && seenIds.has(pId)) || (pName && seenNames.has(pName.toLowerCase()));
        if (pName && !isAlreadyIn) {
          allMembersList.push({
            name: pName,
            avatar: e.payer_avatar || 'cat_blue',
            id: e.payer_id || undefined,
          });
          seenNames.add(pName.toLowerCase());
          if (e.payer_id) seenIds.add(e.payer_id.toLowerCase());
        }
      });

      const splitsMap = getTripExpenseSplits(tripId);
      const settlement = calculateSettlement(expenses, allMembersList, currentTripCurrency, fxRate, splitsMap);
      const catNames: Record<string, string> = {};
      categories.forEach((c) => { catNames[c.id] = c.label; });

      const { exportExpensesToExcel: runExportExpensesToExcel } = await import('@/lib/exportExpensesExcel');
      runExportExpensesToExcel({
        tripName: trip?.name || 'Trip',
        expenses,
        membersList: allMembersList,
        settlementSummary: settlement,
        tripCurrency: currentTripCurrency,
        fxRate,
        categoryNames: catNames,
      });
      toast.success('ดาวน์โหลดไฟล์ Excel (.xlsx) สรุปค่าใช้จ่ายและเคลียร์หนี้แล้ว 📥✨');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('ไม่สามารถส่งออกไฟล์ Excel ได้');
    }
  };

  // Permissions & Super Admin
  const isSuper = useMemo(() => {
    return isSuperAdmin(currentUser, userProfile);
  }, [currentUser, userProfile]);

  const isOwner = useMemo(() => {
    if (!currentUser) return false;
    if (isSuper) return true;
    if (trip?.created_by && trip.created_by === currentUser.id) return true;
    const currentMember = members.find((m) => m.user_id === currentUser.id);
    return currentMember?.role === 'owner';
  }, [trip, currentUser, members, isSuper]);

  const currentUserRole = useMemo<TripRole>(() => {
    if (!currentUser) return 'viewer';
    if (isSuper) return 'owner';
    if (trip?.created_by && trip.created_by === currentUser.id) return 'owner';
    const currentMember = members.find((m) => m.user_id === currentUser.id);
    return (currentMember?.role as TripRole) || 'viewer';
  }, [currentUser, trip, members, isSuper]);

  const canSeeMoney = !isReadOnlyParam && (isSuper || currentUserRole !== 'plan_only');
  const canEditPlan = !isReadOnlyParam && (isSuper || currentUserRole === 'owner' || currentUserRole === 'editor');
  const canAddExpense = canSeeMoney && (isSuper || currentUserRole === 'owner' || currentUserRole === 'editor' || currentUserRole === 'contributor');
  const checkCanModifyExpense = useCallback((exp: any) => {
    if (isReadOnlyParam) return false;
    return canModifyExpense(currentUserRole, isSuper, exp, currentUser?.id);
  }, [isReadOnlyParam, currentUserRole, isSuper, currentUser?.id]);
  const canImportExcel = !isReadOnlyParam && isOwner;

  const handleSwitchTab = useCallback((tab: 'plan' | 'expenses' | 'analytics' | 'members') => {
    if (!canSeeMoney && (tab === 'expenses' || tab === 'analytics')) {
      toast.info('สิทธิ์ของคุณคือดูเฉพาะแผนเที่ยว (Plan Only)');
      return;
    }
    setVisitedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [canSeeMoney]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (!canSeeMoney && (activeTab === 'expenses' || activeTab === 'analytics')) {
        setActiveTab('plan');
      }
      setVisitedTabs((prev) => {
        if (prev.has(activeTab)) return prev;
        const next = new Set(prev);
        next.add(activeTab);
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [canSeeMoney, activeTab]);

  const handleUpdateMemberRole = async (memberId: string, newRole: TripRole) => {
    if (!isOwner) return;
    try {
      const { error } = await supabase
        .from('trip_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (!error) {
        markLocalAction();
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
        );
        toast.success(`อัปเดตสิทธิ์สมาชิกเป็น "${ROLE_INFO[newRole]?.label || newRole}" เรียบร้อยแล้ว ✨`);
      } else {
        toast.error('ไม่สามารถเปลี่ยนสิทธิ์ได้: ' + error.message);
      }
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!isOwner) return;
    if (!confirm(`คุณต้องการลบ "${memberName}" ออกจากทริปใช่หรือไม่?`)) return;

    try {
      markLocalAction();
      const { error } = await supabase
        .from('trip_members')
        .delete()
        .eq('id', memberId);

      if (!error) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
        toast.success(`ลบสมาชิก "${memberName}" ออกจากทริปแล้ว`);
      } else {
        toast.error('ไม่สามารถลบสมาชิกได้: ' + error.message);
      }
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  const handleConfirmTransferOwnership = async (password: string): Promise<boolean> => {
    if (!currentUser?.email || !tripId || !transferTargetMember) {
      toast.error('ข้อมูลไม่ครบถ้วน ไม่สามารถโอนสิทธิ์ได้');
      return false;
    }

    // 1. ตรวจสอบรหัสผ่านบัญชีของเจ้าของทริปปัจจุบันผ่าน Supabase Auth
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: currentUser.email,
      password: password,
    });

    if (authErr) {
      toast.error('รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
      throw new Error('รหัสผ่านไม่ถูกต้อง');
    }

    const targetUserId = transferTargetMember.user_id;
    const targetMemberName =
      transferTargetMember.profiles?.display_name ||
      transferTargetMember.profiles?.email?.split('@')[0] ||
      'สมาชิก';

    try {
      markLocalAction();
      // 2. อัปเดต trips: เปลี่ยน created_by เป็นสมาชิกคนใหม่
      const { error: tripUpdateErr } = await supabase
        .from('trips')
        .update({ created_by: targetUserId })
        .eq('id', tripId);

      if (tripUpdateErr) {
        toast.error('ไม่สามารถอัปเดตเจ้าของทริปได้: ' + tripUpdateErr.message);
        return false;
      }

      // 3. อัปเดต trip_members: สมาชิกใหม่รับสิทธิ์ 'owner'
      await supabase
        .from('trip_members')
        .update({ role: 'owner' })
        .eq('id', transferTargetMember.id);

      // 4. อัปเดตตัวเราเองใน trip_members: ปรับสถานะเป็น 'editor'
      const myMembership = members.find((m) => m.user_id === currentUser.id);
      if (myMembership) {
        await supabase
          .from('trip_members')
          .update({ role: 'editor' })
          .eq('id', myMembership.id);
      } else {
        await supabase
          .from('trip_members')
          .insert([
            {
              trip_id: tripId,
              user_id: currentUser.id,
              role: 'editor',
            },
          ]);
      }

      triggerConfetti();
      toast.success(`🎉 โอนสิทธิ์ความเป็นเจ้าของทริปให้คุณ ${targetMemberName} เรียบร้อยแล้ว!`);
      setShowTransferModal(false);
      setTransferTargetMember(null);
      await fetchTripData();
      return true;
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาดในการโอนสิทธิ์: ' + (err.message || ''));
      return false;
    }
  };

  const totalSpent = useMemo(() => {
    return expenses.reduce((acc, curr) => {
      const amt = Number(curr.amount || 0);
      const converted = convertCurrency(amt, curr.currency || tripBaseCurrency, tripBaseCurrency, fxRate);
      return acc + converted;
    }, 0);
  }, [expenses, tripBaseCurrency, fxRate]);

  const targetBudget = Number(trip?.total_budget ?? trip?.budget ?? 0);

  // สมาชิกคนอื่นๆ (กรองตัวฉันเองออกอย่างเข้มงวด และตัดชื่อซ้ำ)
  const otherMembers = useMemo(() => {
    const myId = currentUser?.id?.toLowerCase();
    const myName = userDisplayName?.trim().toLowerCase();
    const myEmail = currentUser?.email?.trim().toLowerCase();
    const seen = new Set<string>();

    return members.filter((m) => {
      const mUserId = m.user_id?.toLowerCase();
      const mName = (m.profiles?.display_name || m.profiles?.email?.split('@')[0] || '').trim().toLowerCase();
      const mEmail = m.profiles?.email?.trim().toLowerCase();

      const isMe = (myId && mUserId === myId) ||
                   (myName && mName === myName) ||
                   (myEmail && mEmail === myEmail);
      if (isMe) return false;

      const uniqueKey = mUserId || mName || m.id;
      if (seen.has(uniqueKey)) return false;
      seen.add(uniqueKey);

      return true;
    });
  }, [members, currentUser, userDisplayName]);

  // ข้อมูล Hero Budget Display
  const heroDisplayData = useMemo(() => {
    // จำนวนสมาชิกทั้งหมดในทริป (ตัวฉัน + สมาชิกคนอื่นๆ) ป้องกันปัญหาหารซ้ำ
    const totalMembersCount = Math.max(1, 1 + otherMembers.length);

    if (heroBudgetView === 'all') {
      const progress = targetBudget > 0 ? Math.min(Math.round((totalSpent / targetBudget) * 100), 100) : 0;
      const remaining = targetBudget > totalSpent ? targetBudget - totalSpent : 0;
      const isOver = targetBudget > 0 && totalSpent > targetBudget;
      const diff = Math.abs(totalSpent - targetBudget);

      return {
        title: 'ยอดค่าใช้จ่ายรวมทุกคน (Total Spent)',
        spent: totalSpent,
        targetBudget: targetBudget,
        budgetLabel: 'งบประมาณรวมทริป',
        progress,
        remaining,
        isOver,
        diff,
        viewName: 'รวมทุกคน',
      };
    } else if (heroBudgetView === 'me') {
      const splitsMap = getTripExpenseSplits(tripId);
      const myId = currentUser?.id?.toLowerCase();
      const myName = userDisplayName?.trim().toLowerCase();

      const mySpent = expenses.reduce((acc, curr) => {
        const amt = convertCurrency(Number(curr.amount || 0), curr.currency || tripBaseCurrency, tripBaseCurrency, fxRate);
        const splits = splitsMap[curr.id];
        if (!splits || splits.length === 0) {
          return acc + (amt / totalMembersCount);
        }
        const participates = splits.some((k) => {
          const lk = (k || '').toLowerCase().trim();
          return lk === 'me' || (myId && lk === myId) || (myName && lk === myName) || lk.includes('ฉัน');
        });
        if (participates) {
          return acc + (amt / Math.max(1, splits.length));
        }
        return acc;
      }, 0);

      const roundedMySpent = Math.round(mySpent);
      const myBudget = memberBudgets['me'] || (targetBudget > 0 && totalMembersCount > 0 ? Math.round(targetBudget / totalMembersCount) : 0);
      const progress = myBudget > 0 ? Math.min(Math.round((roundedMySpent / myBudget) * 100), 100) : 0;
      const remaining = myBudget > roundedMySpent ? myBudget - roundedMySpent : 0;
      const isOver = myBudget > 0 && roundedMySpent > myBudget;
      const diff = Math.abs(roundedMySpent - myBudget);

      return {
        title: `ยอดค่าใช้จ่ายของฉัน (${userDisplayName})`,
        spent: roundedMySpent,
        targetBudget: myBudget,
        budgetLabel: 'งบส่วนตัวของฉัน',
        progress,
        remaining,
        isOver,
        diff,
        viewName: 'ของฉัน',
      };
    } else {
      const splitsMap = getTripExpenseSplits(tripId);
      const targetMember = members.find((m) => m.user_id === heroBudgetView || m.id === heroBudgetView);
      const mName = targetMember?.profiles?.display_name || targetMember?.profiles?.email?.split('@')[0] || 'สมาชิก';
      const targetUserId = (targetMember?.user_id || '').toLowerCase();
      const targetId = (targetMember?.id || '').toLowerCase();
      const targetName = mName.toLowerCase();

      const memberSpent = expenses.reduce((acc, curr) => {
        const amt = convertCurrency(Number(curr.amount || 0), curr.currency || tripBaseCurrency, tripBaseCurrency, fxRate);
        const splits = splitsMap[curr.id];
        if (!splits || splits.length === 0) {
          return acc + (amt / totalMembersCount);
        }
        const participates = splits.some((k) => {
          const lk = (k || '').toLowerCase().trim();
          return lk === targetUserId || lk === targetId || lk === targetName;
        });
        if (participates) {
          return acc + (amt / Math.max(1, splits.length));
        }
        return acc;
      }, 0);

      const roundedMemberSpent = Math.round(memberSpent);
      const mBudget = memberBudgets[heroBudgetView] || 0;
      const progress = mBudget > 0 ? Math.min(Math.round((roundedMemberSpent / mBudget) * 100), 100) : 0;
      const remaining = mBudget > roundedMemberSpent ? mBudget - roundedMemberSpent : 0;
      const isOver = mBudget > 0 && roundedMemberSpent > mBudget;
      const diff = Math.abs(roundedMemberSpent - mBudget);

      return {
        title: `ยอดค่าใช้จ่ายของ ${mName}`,
        spent: roundedMemberSpent,
        targetBudget: mBudget,
        budgetLabel: `งบเฉพาะบุคคล (${mName})`,
        progress,
        remaining,
        isOver,
        diff,
        viewName: mName,
      };
    }
  }, [heroBudgetView, totalSpent, targetBudget, expenses, currentUser, userDisplayName, memberBudgets, members, otherMembers, tripBaseCurrency, fxRate, tripId]);

  // สรุปยอดจ่ายแยกตามรายคน (ตัดชื่อซ้ำ)
  const distinctPayers = useMemo(() => {
    const myId = currentUser?.id?.toLowerCase();
    const myName = userDisplayName?.trim().toLowerCase();
    const map = new Map<string, { name: string; avatar?: string; total: number; isMe: boolean; key: string }>();

    expenses.forEach((e) => {
      const isMe = (myId && e.payer_id?.toLowerCase() === myId) ||
                   (myName && e.payer_name && e.payer_name.trim().toLowerCase() === myName);
      const key = isMe ? 'me' : ((e.payer_id || e.payer_name || 'สมาชิก').trim());
      const name = isMe ? `${userDisplayName} (ฉัน)` : (e.payer_name || 'สมาชิก');
      const avatar = isMe ? (userProfile?.avatar_id || currentUser?.user_metadata?.avatar_id) : e.payer_avatar;

      if (!map.has(key)) {
        map.set(key, { name, avatar, total: 0, isMe, key });
      }
      const amt = Number(e.amount || 0);
      map.get(key)!.total += convertCurrency(amt, e.currency || tripBaseCurrency, tripBaseCurrency, fxRate);
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [expenses, currentUser, userDisplayName, userProfile, tripBaseCurrency, fxRate]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    const splitsMap = getTripExpenseSplits(tripId);
    const myId = currentUser?.id?.toLowerCase();
    const myName = userDisplayName?.trim().toLowerCase();

    return expenses.filter((e) => {
      if (expenseCategoryFilter !== 'all' && e.category !== expenseCategoryFilter) return false;
      
      if (expensePayerFilter !== 'all') {
        const splits = splitsMap[e.id];
        // If a custom split is recorded, check if the selected member participates:
        if (splits && splits.length > 0) {
          if (expensePayerFilter === 'me') {
            const participates = splits.some((k) => {
              const lk = (k || '').toLowerCase().trim();
              return lk === 'me' || (myId && lk === myId) || (myName && lk === myName) || lk.includes('ฉัน');
            });
            if (!participates) return false;
          } else {
            const target = expensePayerFilter.trim().toLowerCase();
            const participates = splits.some((k) => {
              const lk = (k || '').toLowerCase().trim();
              return lk === target;
            });
            if (!participates) return false;
          }
        }
        // If no custom split is recorded, everyone in the trip shares it, so it is included!
      }

      if (deferredExpenseSearch.trim()) {
        const query = deferredExpenseSearch.toLowerCase();
        const titleMatch = (e.title || '').toLowerCase().includes(query);
        const payerMatch = (e.payer_name || '').toLowerCase().includes(query);
        if (!titleMatch && !payerMatch) return false;
      }
      return true;
    });
  }, [expenses, expenseCategoryFilter, expensePayerFilter, deferredExpenseSearch, currentUser, userDisplayName, tripId]);

  // Mask dates when viewing via Public Read-Only Share Link with hideDates enabled
  const privacySafeItinerary = useMemo(() => {
    if (!isReadOnlyParam || !sharePrivacy.hideDates) return itinerary;
    const dayMap = new Map<string, string>();
    let dayCounter = 1;
    return itinerary.map((item) => {
      const rawDay = (item.date_label || '').trim();
      if (!rawDay) return item;
      if (!dayMap.has(rawDay)) {
        dayMap.set(rawDay, `Day ${dayCounter++}`);
      }
      return { ...item, date_label: dayMap.get(rawDay)! };
    });
  }, [itinerary, isReadOnlyParam, sharePrivacy.hideDates]);

  // วันทั้งหมดที่มีใน Itinerary
  const availableDays = useMemo(() => {
    const days = new Set<string>();
    privacySafeItinerary.forEach((item) => {
      if (item.date_label && item.date_label.trim().length > 0) {
        days.add(item.date_label.trim());
      }
    });
    return Array.from(days);
  }, [privacySafeItinerary]);

  const filteredItinerary = useMemo(() => {
    if (selectedDayFilter === 'all') return privacySafeItinerary;
    return privacySafeItinerary.filter((item) => item.date_label?.trim() === selectedDayFilter);
  }, [privacySafeItinerary, selectedDayFilter]);

  const [showPassportModal, setShowPassportModal] = useState(false);
  const [passportInitialTab, setPassportInitialTab] = useState<'passport' | 'wrapped'>('passport');

  const handleOpenPassport = useCallback((tab: 'passport' | 'wrapped' = 'passport') => {
    setPassportInitialTab(tab);
    setShowPassportModal(true);
  }, []);

  const handleLogExpenseForStop = useCallback(
    (stop?: any) => {
      const prefill = buildQuickExpensePrefillFromStop(stop, tripBaseCurrency, trip?.start_date);
      setScannedData((prev: any) => ({
        ...prev,
        title: prefill.title,
        amount: '',
        category: prefill.category,
        currency: prefill.currency,
        spent_at: prefill.spent_at,
        receipt_url: '',
        items: [],
      }));
      setShowScanModal(true);
    },
    [tripBaseCurrency, trip?.start_date, setShowScanModal]
  );

  const { pullDistance, isRefreshing, isReadyToRefresh } = usePullToRefresh({
    onRefresh: fetchTripData,
  });

  if (loading && !trip) {
    return (
      <div className="max-w-5xl mx-auto px-3.5 sm:px-4 pt-6 pb-20 min-h-[70dvh] space-y-4 animate-in fade-in duration-200">
        {/* Hero Cover Skeleton */}
        <div className="rounded-3xl border border-[#e2e8f0] dark:border-[#24324a] bg-white dark:bg-[#161c27] overflow-hidden shadow-xs">
          <div className="h-44 sm:h-52 bg-slate-200/80 dark:bg-[#1a202c] animate-pulse" />
          <div className="p-4 sm:p-5 space-y-3">
            <div className="h-6 w-2/3 rounded-xl bg-slate-200/90 dark:bg-[#24324a] animate-pulse" />
            <div className="flex gap-2">
              <div className="h-4 w-28 rounded-lg bg-slate-200/70 dark:bg-[#1a202c] animate-pulse" />
              <div className="h-4 w-20 rounded-lg bg-slate-200/70 dark:bg-[#1a202c] animate-pulse" />
            </div>
          </div>
        </div>
        {/* Quick Bar Skeleton */}
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-9 w-24 rounded-xl bg-slate-200/80 dark:bg-[#1a202c] animate-pulse shrink-0"
            />
          ))}
        </div>
        {/* Editorial Stop Card Skeletons */}
        {[1, 2].map((n) => (
          <div
            key={n}
            className="rounded-2xl border border-[#e2e8f0] dark:border-[#24324a] bg-white dark:bg-[#161c27] overflow-hidden p-4 space-y-3"
          >
            <div className="h-32 rounded-xl bg-slate-200/75 dark:bg-[#1a202c] animate-pulse" />
            <div className="h-5 w-3/4 rounded-lg bg-slate-200/80 dark:bg-[#24324a] animate-pulse" />
            <div className="h-4 w-1/2 rounded-lg bg-slate-200/60 dark:bg-[#1a202c] animate-pulse" />
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="h-10 rounded-lg bg-slate-200/75 dark:bg-[#1a202c] animate-pulse" />
              <div className="h-10 rounded-lg bg-slate-200/60 dark:bg-[#1a202c] animate-pulse" />
            </div>
          </div>
        ))}
        <div className="flex items-center justify-center gap-2 pt-2 text-slate-500 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <p className="text-xs font-bold">กำลังโหลดข้อมูลทริป...</p>
        </div>
      </div>
    );
  }

  if (unauthorized && trip) {
    const hasValidInvite = Boolean(
      (inviteParam && inviteParam === tripId) || 
      (manualJoinCode && manualJoinCode.trim() === tripId)
    );

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-grid-pattern">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-[#24324a] bg-white dark:bg-[#161c27] p-6 sm:p-8 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto text-3xl">
            🔒
          </div>
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              พื้นที่เฉพาะสมาชิกทริป
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              {trip.name || trip.title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              ทริปนี้เป็นพื้นที่ส่วนตัวสำหรับสมาชิกเท่านั้น คุณยังไม่ได้ถูกเพิ่มเป็นสมาชิกในทริปนี้
            </p>
          </div>

          {hasValidInvite ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 font-medium space-y-1">
              <div className="font-bold flex items-center justify-center gap-1.5">
                <span>✨ มีลิงก์เชิญที่ถูกต้อง</span>
              </div>
              <p>คุณได้รับคำเชิญเข้าร่วมทริปนี้แล้ว กดปุ่มด้านล่างเพื่อเริ่มดูแผนเที่ยวได้เลย</p>
            </div>
          ) : (
            <div className="space-y-2.5 text-left p-4 rounded-2xl bg-slate-50 dark:bg-[#0d131f] border border-slate-200/80 dark:border-[#24324a]">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                กรอกรหัสเชิญประจำทริป (Trip ID) เพื่อเข้าร่วม:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="วางรหัสเชิญที่นี่..."
                  value={manualJoinCode}
                  onChange={(e) => setManualJoinCode(e.target.value)}
                  className="flex-1 p-2.5 rounded-xl border border-slate-200 dark:border-[#24324a] bg-white dark:bg-[#161c27] text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => handleJoinTripDirectly(manualJoinCode)}
                  disabled={joiningTrip || !manualJoinCode.trim()}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  ยืนยัน
                </button>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                * หากไม่มีรหัสเชิญ กรุณาติดต่อผู้สร้างทริปเพื่อขอลิงก์เชิญ
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2.5 pt-2">
            {hasValidInvite && (
              <button
                type="button"
                onClick={() => handleJoinTripDirectly()}
                disabled={joiningTrip}
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {joiningTrip ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>กำลังเข้าร่วมทริป...</span>
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4" />
                    <span>เข้าร่วมทริปนี้</span>
                  </>
                )}
              </button>
            )}

            <Link
              href="/"
              className="w-full py-2.5 rounded-2xl border border-slate-200 dark:border-[#24324a] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0d131f] text-xs font-bold transition-all text-center"
            >
              กลับสู่หน้าทริปของฉัน
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!loading && !trip) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-grid-pattern">
        <div className="w-full max-w-sm rounded-3xl border border-slate-200 dark:border-[#24324a] bg-white dark:bg-[#161c27] p-6 text-center space-y-4 shadow-xl">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
          <h2 className="text-base font-black text-slate-900 dark:text-white">ไม่พบทริปนี้</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">ทริปนี้อาจถูกลบไปแล้ว หรือรหัสทริปไม่ถูกต้อง</p>
          <Link
            href="/"
            className="inline-block px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md"
          >
            กลับสู่หน้าหลัก
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-40 sm:pb-24 bg-[#f8fafd] dark:bg-[#0d131f] text-[#0f172a] dark:text-[#dde2f3] bg-grid-pattern transition-colors duration-300">
      
      {/* iOS/iPad Touch Pull-to-Refresh Indicator */}
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        isReadyToRefresh={isReadyToRefresh}
      />
      
      {/* ==================== TOP NAVIGATION & STICKY APP HEADER (Oceanic Glacial) ==================== */}
      <nav className="sticky top-0 z-40 border-b border-[#e2e8f0] dark:border-[#4cd7f6]/15 bg-white/95 dark:bg-[#0d131f]/88 backdrop-blur-xl shadow-[0_4px_24px_rgba(15,23,42,0.05)] dark:shadow-[0_4px_24px_rgba(4,9,20,0.55)] transition-colors safe-top-nav">
        <div className="max-w-5xl mx-auto safe-nav-container px-3.5 sm:px-4 pb-2 sm:pb-2.5 space-y-2">
          
          {/* Row 1: Back Arrow, Trip Title & Action Icons */}
          <div className="pt-1 sm:pt-1.5 flex items-center justify-between gap-2 sm:gap-4">
            
            {/* Left: Back Arrow & Trip Details */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <Link
                href="/"
                className="p-1.5 sm:p-2 rounded-2xl border border-slate-200 dark:border-[#24324a] bg-white dark:bg-[#161c27] text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105 active:scale-95 shadow-2xs transition-all shrink-0 cursor-pointer"
                title="กลับไปหน้าทริปทั้งหมด"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <h1 className="text-sm sm:text-base md:text-lg font-black text-slate-900 dark:text-white truncate min-w-0">
                    {(trip?.name || trip?.title) || 'รายละเอียดทริป'}
                  </h1>
                  
                  <span 
                    title={isOnline ? 'สถานะ: ออนไลน์' : 'สถานะ: ออฟไลน์ (แคชเครื่อง)'}
                    className={`hidden sm:inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                      isOnline 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900' 
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900'
                    }`}
                  >
                    {isOnline ? <Wifi className="h-3 w-3 text-emerald-500" /> : <WifiOff className="h-3 w-3 text-amber-500" />}
                    <span>{isOnline ? 'ออนไลน์' : 'ออฟไลน์'}</span>
                  </span>

                  {isSuper && (
                    <span 
                      title="Super Admin"
                      className="hidden sm:inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0"
                    >
                      👑 <span>Super Admin</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-[#475569] dark:text-[#94a3b8] font-semibold truncate pt-0.5">
                  <span
                    className={`sm:hidden w-2 h-2 rounded-full shrink-0 ${isOnline ? 'bg-emerald-500 dark:bg-[#4cd7f6]' : 'bg-amber-500'}`}
                    title={isOnline ? 'ออนไลน์' : 'ออฟไลน์'}
                  />
                  <span className="text-[#0284c7] dark:text-[#4cd7f6] font-mono font-bold">{trip?.currency || 'JPY'}</span>
                  <span>•</span>
                  <span className="truncate font-mono text-[10px] sm:text-xs">
                    {isReadOnlyParam && sharePrivacy.hideDates
                      ? `${availableDays.length || 1} วัน`
                      : trip?.start_date
                      ? new Date(trip.start_date).toLocaleDateString('th-TH')
                      : 'ไม่ระบุวัน'}
                  </span>
                  {isSuper && <span className="sm:hidden shrink-0" title="Super Admin">👑</span>}
                </div>
              </div>
            </div>

            {/* Right: Action Icons */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowAIAssistantModal(true)}
                className="sm:hidden w-8 h-8 rounded-2xl border border-slate-200 dark:border-[#24324a] bg-white dark:bg-[#161c27] text-[#2563eb] dark:text-blue-400 hover:border-[#2563eb] active:scale-95 shadow-2xs transition-all cursor-pointer flex items-center justify-center shrink-0"
                title="ถาม AI ผู้ช่วยวางแผนทริป"
                aria-label="ถาม AI ผู้ช่วย"
              >
                <Bot className="h-4 w-4" />
              </button>

              <NotificationBell 
                expenses={expenses} 
                itinerary={itinerary} 
                members={members} 
                tripTitle={trip?.name || trip?.title || undefined}
                currentUser={currentUser}
                userDisplayName={userDisplayName}
              />

              <button
                onClick={() => setShowProfileModal(true)}
                className="flex items-center gap-1.5 p-1 sm:p-1.5 sm:pr-2.5 rounded-2xl border border-slate-200 dark:border-[#24324a] bg-white dark:bg-[#161c27] hover:border-blue-500 hover:scale-105 active:scale-95 shadow-2xs transition-all cursor-pointer group"
                title="ตั้งค่าโปรไฟล์"
              >
                <CatAvatarBadge cat={userCat} size="xs" className="group-hover:scale-110 transition-transform shadow-xs" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 hidden md:inline max-w-[90px] truncate">
                  {userDisplayName}
                </span>
              </button>

              {isOwner && (
                <button
                  onClick={() => setShowShareModal(true)}
                  className="inline-flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl border border-slate-200 dark:border-[#24324a] bg-white dark:bg-[#161c27] text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105 active:scale-95 shadow-2xs transition-all shrink-0 cursor-pointer min-w-8 min-h-8 justify-center"
                  title="แชร์ทริป / ชวนเพื่อนเข้าทริป (เฉพาะเจ้าของทริป)"
                >
                  <Share2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="hidden sm:inline">แชร์</span>
                </button>
              )}

              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-1.5 sm:p-2 rounded-2xl border border-slate-200 dark:border-[#24324a] bg-white dark:bg-[#161c27] text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:rotate-45 active:scale-95 shadow-2xs transition-all duration-300 cursor-pointer min-w-8 min-h-8 flex items-center justify-center"
                title="สลับโหมด มืด/สว่าง"
                aria-label="Toggle theme"
              >
                <Sun className="h-4 w-4 text-amber-400 hidden dark:block" />
                <Moon className="h-4 w-4 text-slate-700 block dark:hidden" />
              </button>

              {currentUser && (
                <button
                  onClick={async () => {
                    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ?')) return;
                    toast.info('กำลังออกจากระบบ...');
                    try {
                      await Promise.race([
                        supabase.auth.signOut(),
                        new Promise((resolve) => setTimeout(resolve, 600)),
                      ]);
                    } catch (e) {
                      console.error('Signout error', e);
                    } finally {
                      try {
                        localStorage.removeItem('travel_tracker_cached_profile');
                        sessionStorage.clear();
                      } catch {}
                      window.location.replace('/login');
                    }
                  }}
                  className="hidden sm:flex p-1.5 sm:p-2 rounded-2xl border border-slate-200 dark:border-[#24324a] bg-white dark:bg-[#161c27] text-slate-400 hover:text-rose-500 hover:border-rose-300 shadow-2xs transition-all cursor-pointer items-center justify-center"
                  title="ออกจากระบบ (Sign Out)"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Row 2: The Tabs (Travo & TravelGo Hybrid Pill Selector - visible on sm+/iPad/Landscape, while <640px uses Sticky Bottom Bar) */}
          <div className={`hidden sm:grid ${canSeeMoney ? 'grid-cols-4' : 'grid-cols-2'} gap-1 sm:gap-1.5 p-1 sm:p-1.5 bg-slate-100/90 dark:bg-[#161c27] backdrop-blur-xl border border-slate-200/90 dark:border-[#24324a] rounded-2xl sm:rounded-3xl shadow-inner`}>
            <button
              type="button"
              onClick={() => handleSwitchTab('plan')}
              className={`relative py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 active:scale-95 ${
                activeTab === 'plan' 
                  ? 'text-white' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-[#24324a]/50'
              }`}
            >
              {activeTab === 'plan' && (
                <motion.div
                  layoutId="activeTopTabPill"
                  className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 rounded-xl sm:rounded-2xl shadow-md shadow-blue-500/30 border border-white/20 ring-1 ring-black/5"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex items-center justify-center gap-1 sm:gap-1.5 truncate">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">แผนเที่ยว</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold hidden md:inline transition-colors ${
                  activeTab === 'plan' ? 'bg-white/20 text-white' : 'bg-slate-200/70 dark:bg-[#24324a] text-slate-500 dark:text-slate-400'
                }`}>
                  {itinerary.length}
                </span>
              </span>
            </button>

            {canSeeMoney && (
              <button
                type="button"
                onClick={() => handleSwitchTab('expenses')}
                className={`relative py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 active:scale-95 ${
                  activeTab === 'expenses' 
                    ? 'text-white' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-[#24324a]/50'
                }`}
              >
                {activeTab === 'expenses' && (
                  <motion.div
                    layoutId="activeTopTabPill"
                    className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 rounded-xl sm:rounded-2xl shadow-md shadow-blue-500/30 border border-white/20 ring-1 ring-black/5"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-1 sm:gap-1.5 truncate">
                  <Receipt className="h-3.5 w-3.5" />
                  <span className="truncate">รายจ่าย</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold hidden md:inline transition-colors ${
                    activeTab === 'expenses' ? 'bg-white/20 text-white' : 'bg-slate-200/70 dark:bg-[#24324a] text-slate-500 dark:text-slate-400'
                  }`}>
                    {expenses.length}
                  </span>
                </span>
              </button>
            )}

            {canSeeMoney && (
              <button
                type="button"
                onClick={() => handleSwitchTab('analytics')}
                className={`relative py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 active:scale-95 ${
                  activeTab === 'analytics' 
                    ? 'text-white' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-[#24324a]/50'
                }`}
              >
                {activeTab === 'analytics' && (
                  <motion.div
                    layoutId="activeTopTabPill"
                    className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 rounded-xl sm:rounded-2xl shadow-md shadow-blue-500/30 border border-white/20 ring-1 ring-black/5"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-1 sm:gap-1.5 truncate">
                  <PieChart className="h-3.5 w-3.5" />
                  <span className="truncate">สถิติ & งบ</span>
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSwitchTab('members')}
              className={`relative py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 active:scale-95 ${
                activeTab === 'members' 
                  ? 'text-white' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-[#24324a]/50'
              }`}
            >
              {activeTab === 'members' && (
                <motion.div
                  layoutId="activeTopTabPill"
                  className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 rounded-xl sm:rounded-2xl shadow-md shadow-blue-500/30 border border-white/20 ring-1 ring-black/5"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex items-center justify-center gap-1 sm:gap-1.5 truncate">
                <Users className="h-3.5 w-3.5" />
                <span className="truncate">สมาชิก</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold hidden md:inline transition-colors ${
                  activeTab === 'members' ? 'bg-white/20 text-white' : 'bg-slate-200/70 dark:bg-[#24324a] text-slate-500 dark:text-slate-400'
                }`}>
                  {members.length}
                </span>
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* ==================== MAIN CONTENT CONTAINER ==================== */}
      <main className="relative z-10 max-w-5xl mx-auto px-3.5 sm:px-4 safe-area-x pt-3 sm:pt-4 pb-48 sm:pb-28 space-y-3.5 sm:space-y-4">

        {/* Public Read-Only Share Banner & Guest Preview Invitation */}
        {isReadOnlyParam ? (
          <div className="p-3.5 sm:p-4 rounded-3xl bg-[#eff6ff]/95 dark:bg-[#161c27] border border-[#bfdbfe] dark:border-[#4cd7f6]/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm animate-in fade-in">
            <div className="flex items-center gap-3 text-left">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#2563eb] flex items-center justify-center text-white shadow-xs shrink-0">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  โหมดดูแพลนเที่ยวอย่างเดียว (Read-Only Share)
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                  เปิดดูแผนการเดินทางและกดนำทาง Google Maps ได้ทันที โดยซ่อนข้อมูลการเงินและปิดการแก้ไข
                </p>
              </div>
            </div>
            {currentUser ? (
              <Link
                href={`/trips/${tripId}`}
                className="w-full sm:w-auto text-center px-4 py-2 rounded-2xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-black shadow-xs transition-all shrink-0 cursor-pointer"
              >
                กลับโหมดสมาชิกปกติ
              </Link>
            ) : (
              <Link
                href={`/login?returnUrl=/trips/${tripId}`}
                className="w-full sm:w-auto text-center px-4 py-2 rounded-2xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-black shadow-xs transition-all shrink-0 cursor-pointer"
              >
                เข้าสู่ระบบ / เข้าร่วมทริป
              </Link>
            )}
          </div>
        ) : !currentUser ? (
          <div className="p-3.5 sm:p-4 rounded-3xl bg-blue-50/95 dark:bg-[#161c27] border border-blue-200/80 dark:border-blue-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md animate-in fade-in">
            <div className="flex items-center gap-3 text-left">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  คุณกำลังดูทริปนี้ในฐานะผู้มาเยือน (Guest Preview)
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                  เข้าสู่ระบบเพื่อร่วมบันทึกค่าใช้จ่าย แก้ไขแผนเที่ยว และสแกนบิลด้วย AI
                </p>
              </div>
            </div>
            <Link
              href={`/login?returnUrl=/trips/${tripId}`}
              className="w-full sm:w-auto text-center px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-500/20 hover:scale-105 transition-all shrink-0 cursor-pointer"
            >
              เข้าสู่ระบบ / สมัครสมาชิก
            </Link>
          </div>
        ) : null}

        {/* Tab Content Panels - Keep-Alive for Zero-Latency Instant Switching */}
        <div className="tab-panels-wrapper">
          {visitedTabs.has('plan') && (
            <div className={activeTab === 'plan' ? 'block animate-in fade-in duration-200' : 'hidden'} role="tabpanel">
              <TripPlanTab
                trip={trip}
                tripBaseCurrency={tripBaseCurrency}
                fxRate={fxRate}
                currencyView={currencyView}
                heroDisplayData={heroDisplayData}
                canSeeMoney={canSeeMoney}
                itinerary={privacySafeItinerary}
                filteredItinerary={filteredItinerary}
                availableDays={availableDays}
                selectedDayFilter={selectedDayFilter}
                setSelectedDayFilter={setSelectedDayFilter}
                itineraryViewMode={itineraryViewMode}
                setItineraryViewMode={setItineraryViewMode}
                showWeatherSection={showWeatherSection}
                setShowWeatherSection={setShowWeatherSection}
                setShowTravelHubModal={setShowTravelHubModal}
                setShowPrintableModal={setShowPrintableModal}
                canImportExcel={canImportExcel}
                handleFileUpload={handleFileUpload}
                exportToExcel={exportToExcel}
                canEditPlan={canEditPlan}
                handleOpenAddActivity={handleOpenAddActivity}
                reordering={reordering}
                expandedPlanB={expandedPlanB}
                setExpandedPlanB={setExpandedPlanB}
                handleMoveActivity={handleMoveActivity}
                handleOpenEditActivity={handleOpenEditActivity}
                handleDeleteActivity={handleDeleteActivity}
                onSwitchTab={handleSwitchTab}
                members={members}
                currentUser={currentUser}
                onRefreshTrip={fetchTripData}
                onShowToast={showToast}
                onOpenGourmetRadar={() => setShowGourmetRadarModal(true)}
                onOpenDiningDecision={(city) => {
                  setDiningPickerDefaultCity(city);
                  setShowDiningDecisionModal(true);
                }}
                onOpenTicketLocker={() => setShowTicketPassLockerModal(true)}
                onOpenPacking={() => setShowPackingModal(true)}
                onOpenScrapbook={() => setShowScrapbookModal(true)}
                onOpenAIAssistant={() => setShowAIAssistantModal(true)}
                onMoveStopToDay={handleMoveStopToDay}
                onSyncShoppingExpense={handleSyncShoppingExpense}
                onLogExpenseForStop={canAddExpense ? handleLogExpenseForStop : undefined}
                onOpenPassport={handleOpenPassport}
                onReorderActivity={canEditPlan ? handleReorderActivity : undefined}
                hideHotels={Boolean(isReadOnlyParam && sharePrivacy.hideHotels)}
              />
            </div>
          )}

          {visitedTabs.has('expenses') && (
            <div className={activeTab === 'expenses' ? 'block animate-in fade-in duration-200' : 'hidden'} role="tabpanel">
              <TripExpensesTab
                trip={trip}
                tripBaseCurrency={tripBaseCurrency}
                fxRate={fxRate}
                currencyView={currencyView}
                heroDisplayData={heroDisplayData}
                heroBudgetView={heroBudgetView}
                setHeroBudgetView={setHeroBudgetView}
                userDisplayName={userDisplayName}
                userCat={userCat}
                otherMembers={otherMembers}
                expenses={expenses}
                filteredExpenses={filteredExpenses}
                categories={categories}
                currentUser={currentUser}
                canAddExpense={canAddExpense}
                canModifyExpense={checkCanModifyExpense}
                expensePayerFilter={expensePayerFilter}
                setExpensePayerFilter={setExpensePayerFilter}
                otherPayers={otherPayers}
                expenseSearchQuery={expenseSearchQuery}
                setExpenseSearchQuery={setExpenseSearchQuery}
                expenseCategoryFilter={expenseCategoryFilter}
                setExpenseCategoryFilter={setExpenseCategoryFilter}
                setShowTravelHubModal={setShowTravelHubModal}
                setShowScanModal={setShowScanModal}
                setShowSettlementModal={setShowSettlementModal}
                setShowBudgetCategoryModal={setShowBudgetCategoryModal}
                setOcrSuccessToast={setOcrSuccessToast}
                handleOpenReceiptPreview={handleOpenReceiptPreview}
                handleDeleteExpense={handleDeleteExpense}
                exportExpensesToExcel={exportExpensesToExcel}
                onSelectExpense={handleSelectExpense}
                onEditExpense={handleEditExpense}
              />
            </div>
          )}

          {visitedTabs.has('analytics') && (
            <div className={activeTab === 'analytics' ? 'block animate-in fade-in duration-200' : 'hidden'} role="tabpanel">
              <TripAnalyticsTab
                distinctPayers={distinctPayers}
                totalSpent={totalSpent}
                members={members}
                memberBudgets={memberBudgets}
                categories={categories}
                categoryBudgets={categoryBudgets}
                expenses={expenses}
                trip={trip}
                tripBaseCurrency={tripBaseCurrency}
                fxRate={fxRate}
                setShowSettlementModal={setShowSettlementModal}
                setShowBudgetCategoryModal={setShowBudgetCategoryModal}
                targetBudget={targetBudget}
                onOpenBudgetModalWithTab={(tab) => {
                  setBudgetModalInitialTab(tab);
                  setShowBudgetCategoryModal(true);
                }}
              />
            </div>
          )}

          {visitedTabs.has('members') && (
            <div className={activeTab === 'members' ? 'block animate-in fade-in duration-200' : 'hidden'} role="tabpanel">
              <TripMembersTab
                members={members}
                isOwner={isOwner}
                currentUser={currentUser}
                trip={trip}
                setShowShareModal={setShowShareModal}
                handleUpdateMemberRole={handleUpdateMemberRole}
                handleRemoveMember={handleRemoveMember}
                onInitiateTransferOwnership={(member) => {
                  setTransferTargetMember(member);
                  setShowTransferModal(true);
                }}
                onOpenAddMemberModal={() => setShowAddMemberModal(true)}
              />
            </div>
          )}
        </div>

      </main>

      {/* ==================== FLOATING CAT AI ASSISTANT PILL (Desktop/Tablet only so mobile bottom cards stay unobstructed) ==================== */}
      <div className="hidden sm:block fixed bottom-6 left-6 z-40 transition-all duration-300">
        <button
          type="button"
          onClick={() => setShowAIAssistantModal(true)}
          className="group flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#ffffff]/95 dark:bg-[#161c27]/95 border border-[#e2e8f0] dark:border-[#24324a] shadow-lg shadow-black/10 text-[#0f172a] dark:text-white backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95 transition-all"
          title="ถาม AI ผู้ช่วยวางแผนทริป"
        >
          <span className="w-6 h-6 rounded-full bg-[#2563eb]/15 dark:bg-blue-500/25 text-[#2563eb] dark:text-blue-400 flex items-center justify-center shadow-2xs">
            <Bot className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs font-black text-[#0f172a] dark:text-slate-100 flex items-center gap-1">
            <span>ถาม</span> <span className="text-[#2563eb] dark:text-blue-400">AI ผู้ช่วย</span>
            <Sparkles className="h-3 w-3 text-amber-500 animate-pulse" />
          </span>
        </button>
      </div>

      {/* ==================== STICKY FLOATING BOTTOM APP BAR (OCEANIC GLACIAL STYLE) ==================== */}
      <div className="fixed bottom-0 inset-x-0 z-40 sm:hidden px-3 pt-2 safe-bottom-nav bg-white/95 dark:bg-[#0d131f]/92 backdrop-blur-xl border-t border-[#e2e8f0] dark:border-[#4cd7f6]/15 shadow-[0_-8px_28px_rgba(15,23,42,0.08)] dark:shadow-[0_-8px_28px_rgba(4,9,20,0.65)]">
        <div className={`grid ${canSeeMoney ? 'grid-cols-4' : 'grid-cols-2'} gap-1 max-w-md mx-auto`}>
          <button
            type="button"
            onClick={() => handleSwitchTab('plan')}
            className={`relative flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'plan'
                ? 'text-blue-600 dark:text-blue-400 font-black'
                : 'text-slate-500 dark:text-slate-400 font-semibold active:scale-95'
            }`}
          >
            {activeTab === 'plan' && (
              <motion.div
                layoutId="activeBottomTabPill"
                className="absolute inset-0 bg-blue-600/10 dark:bg-blue-500/20 rounded-2xl"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <div className="relative z-10 flex flex-col items-center justify-center">
              <MapPin className="h-4 w-4 mb-0.5" />
              <span className="text-[10px]">แผนเที่ยว ({itinerary.length})</span>
            </div>
          </button>

          {canSeeMoney && (
            <button
              type="button"
              onClick={() => handleSwitchTab('expenses')}
              className={`relative flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all cursor-pointer ${
                activeTab === 'expenses'
                  ? 'text-blue-600 dark:text-blue-400 font-black'
                  : 'text-slate-500 dark:text-slate-400 font-semibold active:scale-95'
              }`}
            >
              {activeTab === 'expenses' && (
                <motion.div
                  layoutId="activeBottomTabPill"
                  className="absolute inset-0 bg-blue-600/10 dark:bg-blue-500/20 rounded-2xl"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <div className="relative z-10 flex flex-col items-center justify-center">
                <DollarSign className="h-4 w-4 mb-0.5" />
                <span className="text-[10px]">รายจ่าย ({expenses.length})</span>
              </div>
            </button>
          )}

          {canSeeMoney && (
            <button
              type="button"
              onClick={() => handleSwitchTab('analytics')}
              className={`relative flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all cursor-pointer ${
                activeTab === 'analytics'
                  ? 'text-blue-600 dark:text-blue-400 font-black'
                  : 'text-slate-500 dark:text-slate-400 font-semibold active:scale-95'
              }`}
            >
              {activeTab === 'analytics' && (
                <motion.div
                  layoutId="activeBottomTabPill"
                  className="absolute inset-0 bg-blue-600/10 dark:bg-blue-500/20 rounded-2xl"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <div className="relative z-10 flex flex-col items-center justify-center">
                <PieChart className="h-4 w-4 mb-0.5" />
                <span className="text-[10px]">สถิติ & งบ</span>
              </div>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSwitchTab('members')}
            className={`relative flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'members'
                ? 'text-blue-600 dark:text-blue-400 font-black'
                : 'text-slate-500 dark:text-slate-400 font-semibold active:scale-95'
            }`}
          >
            {activeTab === 'members' && (
              <motion.div
                layoutId="activeBottomTabPill"
                className="absolute inset-0 bg-blue-600/10 dark:bg-blue-500/20 rounded-2xl"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <div className="relative z-10 flex flex-col items-center justify-center">
              <Users className="h-4 w-4 mb-0.5" />
              <span className="text-[10px]">สมาชิก ({members.length})</span>
            </div>
          </button>
        </div>
      </div>

      {/* ==================== MODALS ==================== */}

      {/* 1. Quick Currency & Tax-Free Calculator Modal */}
      {showCurrencyCalculator && (
        <QuickCurrencyCalculator
          isOpen={showCurrencyCalculator}
          onClose={() => setShowCurrencyCalculator(false)}
          defaultCurrency={tripBaseCurrency}
          fxRate={fxRate}
          tripId={tripId}
          currentUser={currentUser}
          userDisplayName={userDisplayName}
          userProfile={userProfile}
          allMembers={allMembersForSplit}
          onExpenseLogged={fetchTripData}
          onApplyExpense={(amount, curr, note) => {
            setScannedData((prev: any) => ({
              ...prev,
              amount: String(amount),
              currency: curr,
              title: note || prev.title,
            }));
            setShowScanModal(true);
          }}
        />
      )}

      {/* Gourmet & Cafe Radar Modal */}
      {showGourmetRadarModal && (
        <GourmetRadarModal
          isOpen={showGourmetRadarModal}
          onClose={() => setShowGourmetRadarModal(false)}
          itinerary={itinerary}
          tripId={tripId}
          tripDestination={`${trip?.name || trip?.title || ''} ${trip?.country || ''}`.trim()}
          fxRate={fxRate}
          availableDays={availableDays}
          defaultDay={selectedDayFilter !== 'all' ? selectedDayFilter : availableDays[0]}
          onAddToItinerary={(item) =>
            handleOpenAddActivity(
              {
                title: item.title,
                city: item.city,
                food_recommend: item.food_recommend,
                mapsQuery: item.mapsQuery,
                date_label: item.date_label,
              },
              item.date_label
            )
          }
          onOpenDecisionPicker={(city) => {
            setDiningPickerDefaultCity(city);
            setShowDiningDecisionModal(true);
          }}
        />
      )}

      {/* Dining Decision Concierge / Smart Picker Modal */}
      {showDiningDecisionModal && (
        <DiningDecisionPickerModal
          isOpen={showDiningDecisionModal}
          onClose={() => setShowDiningDecisionModal(false)}
          itinerary={itinerary}
          defaultCity={diningPickerDefaultCity}
          tripId={tripId}
          tripDestination={`${trip?.name || trip?.title || ''} ${trip?.country || ''}`.trim()}
          availableDays={availableDays}
          defaultDay={selectedDayFilter !== 'all' ? selectedDayFilter : availableDays[0]}
          onAddToItinerary={(item) =>
            handleOpenAddActivity(
              {
                title: item.title,
                city: item.city,
                food_recommend: item.food_recommend,
                mapsQuery: item.mapsQuery,
                date_label: item.date_label,
              },
              item.date_label
            )
          }
          onOpenRadar={() => setShowGourmetRadarModal(true)}
        />
      )}

      {/* Goshuin Digital Stamp Passport & Trip Wrapped Story Modal */}
      {showPassportModal && (
        <GoshuinPassportModal
          isOpen={showPassportModal}
          onClose={() => setShowPassportModal(false)}
          trip={trip}
          itinerary={itinerary}
          expenses={expenses}
          fxRate={fxRate}
          tripBaseCurrency={tripBaseCurrency}
          initialTab={passportInitialTab}
        />
      )}

      {/* Pass & Offline Ticket Locker Modal */}
      {showTicketPassLockerModal && (
        <TicketPassLockerModal
          isOpen={showTicketPassLockerModal}
          onClose={() => setShowTicketPassLockerModal(false)}
          tripId={tripId}
          tripName={trip?.name}
          members={members}
          currentUser={currentUser}
          userDisplayName={userDisplayName}
        />
      )}

      {/* 2. Packing Checklist Modal */}
      {showPackingModal && (
        <PackingChecklistModal
          isOpen={showPackingModal}
          onClose={() => setShowPackingModal(false)}
          tripId={tripId}
          tripName={trip?.name || trip?.title || undefined}
          tripCountry={trip?.country || undefined}
          tripStartDate={trip?.start_date || undefined}
        />
      )}

      {/* 3. Profile Modal */}
      {showProfileModal && (
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          user={currentUser}
          onProfileUpdated={(updated) => {
            setUserProfile((prev: any) => ({ ...prev, ...updated }));
            setCurrentUser((prev: any) => ({
              ...prev,
              user_metadata: { ...(prev?.user_metadata || {}), ...updated },
            }));
            setMembers((prev) =>
              prev.map((m) =>
                m.user_id === currentUser?.id
                  ? {
                      ...m,
                      profiles: {
                        id: currentUser?.id || '',
                        display_name: updated?.display_name || m.profiles?.display_name || null,
                        avatar_id: updated?.avatar_id || m.profiles?.avatar_id || null,
                        email: (updated as any)?.email || m.profiles?.email || null,
                        role: m.profiles?.role || null,
                        is_super_admin: m.profiles?.is_super_admin || null,
                        created_at: m.profiles?.created_at || null,
                        updated_at: m.profiles?.updated_at || null,
                      },
                    }
                  : m
              )
            );
          }}
        />
      )}

      {/* Travel Command Center Hub Modal (5-in-1) */}
      {showTravelHubModal && (
        <TravelHubModal
          isOpen={showTravelHubModal}
          onClose={() => setShowTravelHubModal(false)}
          trip={trip}
          expenses={expenses}
          itinerary={itinerary}
          members={members}
          userDisplayName={userDisplayName}
          fxRate={fxRate}
          onOpenScrapbook={() => setShowScrapbookModal(true)}
          onOpenPacking={() => setShowPackingModal(true)}
          onOpenTicketLocker={() => setShowTicketPassLockerModal(true)}
        />
      )}

      {/* 4. Settlement Modal */}
      {showSettlementModal && (
        <SettlementModal
          isOpen={showSettlementModal}
          onClose={() => setShowSettlementModal(false)}
          expenses={expenses}
          members={members}
          currentUser={currentUser}
          userDisplayName={userDisplayName}
          currency={trip?.currency || 'THB'}
          fxRate={fxRate}
          tripId={tripId}
        />
      )}

      {/* 5. AI Assistant Modal */}
      {showAIAssistantModal && (
        <AIAssistantModal
          isOpen={showAIAssistantModal}
          onClose={() => setShowAIAssistantModal(false)}
          currentCity={itinerary[0]?.city || 'Osaka'}
          availableDays={availableDays}
          defaultDay={selectedDayFilter !== 'all' ? selectedDayFilter : availableDays[0]}
          onAddToItinerary={(item) =>
            handleOpenAddActivity(
              {
                title: item.title,
                city: item.city,
                mapsQuery: item.mapsQuery,
                transport_info: item.transport_info,
                food_recommend: item.food_recommend,
                date_label: item.date_label,
              },
              item.date_label
            )
          }
          onOpenAiKeyModal={() => setShowAiKeyModal(true)}
        />
      )}

      {/* 6. Budget & Category Manager Modal */}
      {showBudgetCategoryModal && (
        <BudgetCategoryModal
          isOpen={showBudgetCategoryModal}
          onClose={() => setShowBudgetCategoryModal(false)}
          trip={trip}
          expenses={expenses}
          members={members}
          currentUser={currentUser}
          userDisplayName={userDisplayName}
          fxRate={fxRate}
          initialTab={budgetModalInitialTab}
          onUpdated={fetchTripData}
          onOpenRollback={() => setShowRollbackModal(true)}
          onShowToast={showToast}
        />
      )}

      {/* 7. Printable PDF Itinerary Modal */}
      {showPrintableModal && (
        <PrintableItineraryModal
          isOpen={showPrintableModal}
          onClose={() => setShowPrintableModal(false)}
          trip={trip}
          itinerary={itinerary}
          expenses={expenses}
          categories={categories}
          fxRate={fxRate}
        />
      )}

      {/* 8. Photo Scrapbook Modal */}
      {showScrapbookModal && (
        <PhotoScrapbookModal
          isOpen={showScrapbookModal}
          onClose={() => {
            setShowScrapbookModal(false);
          }}
          tripId={tripId}
          tripName={trip?.name || trip?.title || ''}
        />
      )}

      {/* 9. Version Rollback Modal */}
      {showRollbackModal && (
        <VersionRollbackModal
          isOpen={showRollbackModal}
          onClose={() => setShowRollbackModal(false)}
          tripId={tripId}
          trip={trip}
          itinerary={itinerary}
          expenses={expenses}
          categories={categories}
          categoryBudgets={categoryBudgets}
          photos={getTripPhotos(tripId)}
          onRestored={fetchTripData}
        />
      )}

      {/* Expense Detail & Edit Modal */}
      {selectedExpenseForDetail && (
        <ExpenseDetailModal
          isOpen={!!selectedExpenseForDetail}
          onClose={() => setSelectedExpenseForDetail(null)}
          expense={selectedExpenseForDetail}
          categories={categories}
          members={members}
          currentUser={currentUser}
          userDisplayName={userDisplayName}
          tripBaseCurrency={tripBaseCurrency}
          fxRate={fxRate}
          canEdit={checkCanModifyExpense(selectedExpenseForDetail)}
          startInEditMode={startInExpenseEditMode}
          tripId={tripId}
          onSaveExpense={handleSaveUpdatedExpense}
          onDeleteExpense={handleDeleteExpense}
          onOpenReceiptFullscreen={(img) => setPreviewImage(img)}
        />
      )}

      {/* 10. Scan / Add Expense Modal (Extracted Component with 1-Tap Japan Tax-Free) */}
      <ScanExpenseModal
        isOpen={showScanModal}
        mounted={mounted}
        onClose={() => setShowScanModal(false)}
        userCat={userCat}
        scanning={scanning}
        savingExpense={savingExpense}
        hasSavedGeminiKey={hasSavedGeminiKey}
        onOpenAiKeyModal={() => setShowAiKeyModal(true)}
        onReceiptImageChange={handleReceiptImage}
        ocrErrorToast={ocrErrorToast}
        ocrSuccessToast={ocrSuccessToast}
        scannedData={scannedData}
        setScannedData={setScannedData}
        fxRate={fxRate}
        categories={categories}
        allMembersForSplit={allMembersForSplit}
        addSplitMode={addSplitMode}
        setAddSplitMode={setAddSplitMode}
        addSplitWith={addSplitWith}
        setAddSplitWith={setAddSplitWith}
        splitAsSeparateExpenses={splitAsSeparateExpenses}
        setSplitAsSeparateExpenses={setSplitAsSeparateExpenses}
        onSaveExpense={handleSaveExpense}
        existingExpenses={expenses}
      />

      {/* 11. Activity Form Modal (Extracted Component) */}
      <ActivityFormModal
        isOpen={showActivityModal}
        mounted={mounted}
        editingActivity={editingActivity}
        savingActivity={savingActivity}
        activityForm={activityForm}
        setActivityForm={setActivityForm}
        onClose={() => setShowActivityModal(false)}
        onSubmit={handleSaveActivity}
      />

      {/* 12. Receipt Fullscreen Preview Modal (Extracted Component) */}
      <ReceiptPreviewModal
        previewImage={previewImage}
        mounted={mounted}
        onClose={() => setPreviewImage(null)}
        onDownloadReceipt={handleDownloadReceiptImage}
      />

      {/* 13. Share Trip & Public Read-Only Link Modal (Extracted Component) */}
      <ShareTripModal
        isOpen={showShareModal}
        isOwner={isOwner}
        mounted={mounted}
        tripId={tripId}
        copiedLink={copiedLink}
        copiedAuthLink={copiedAuthLink}
        copiedCode={copiedCode}
        sharePrivacy={sharePrivacy}
        setSharePrivacy={setSharePrivacy}
        onClose={() => setShowShareModal(false)}
        onNativeShare={handleNativeShare}
        onCopyInviteLink={copyInviteLink}
        onCopyAuthInviteLink={copyAuthInviteLink}
        onCopyTripCode={copyTripCode}
      />

      {/* 13.5 Gemini AI Key Setup Modal (Extracted Component) */}
      <AiKeySetupModal
        isOpen={showAiKeyModal}
        mounted={mounted}
        geminiApiKeyInput={geminiApiKeyInput}
        setGeminiApiKeyInput={setGeminiApiKeyInput}
        hasSavedGeminiKey={hasSavedGeminiKey}
        onSaveGeminiKey={handleSaveGeminiKey}
        onClose={() => setShowAiKeyModal(false)}
      />

      {/* Global Success / Feedback Floating Toast (Positioned at bottom for iPhone 17 Pro Max Safe Zone) */}
      <AnimatePresence>
        {globalToast && (
          <motion.div
            key={globalToast.id}
            initial={{ opacity: 0, y: 32, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 450, damping: 28 }}
            className="fixed bottom-[calc(4.75rem+max(env(safe-area-inset-bottom,0px),1.25rem))] sm:bottom-8 inset-x-4 sm:inset-x-auto sm:right-6 sm:left-auto sm:max-w-sm z-50 pointer-events-none"
          >
            <div className={`p-3.5 sm:p-4 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 pointer-events-auto ${
              globalToast.type === 'error'
                ? 'bg-rose-600/95 text-white border-rose-400 shadow-rose-900/40'
                : globalToast.type === 'info'
                ? 'bg-slate-900/95 dark:bg-slate-800/95 text-white border-slate-700 shadow-slate-900/40'
                : 'bg-emerald-600/95 text-white border-emerald-400 shadow-emerald-900/40'
            }`}>
              {globalToast.type === 'error' ? (
                <AlertCircle className="h-5 w-5 shrink-0 text-white animate-bounce" />
              ) : globalToast.type === 'info' ? (
                <Sparkles className="h-5 w-5 shrink-0 text-amber-300" />
              ) : (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-white" />
              )}
              <span className="text-xs sm:text-sm font-black flex-1 leading-snug">
                {globalToast.message}
              </span>
              <button
                type="button"
                onClick={() => setGlobalToast(null)}
                className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/20 active:scale-95 cursor-pointer transition-all"
                title="ปิดการแจ้งเตือน"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Global Currency Switcher Pill & Quick Calculator Dock (Micro-Interactions) */}
      <CurrencyPillSwitcher
        primaryCurrency={trip?.currency || 'JPY'}
        activeView={currencyView}
        onToggle={(view) => {
          setCurrencyView(view);
          showToast(view === 'thb' ? 'สลับดูยอดเป็นเงินบาทไทย (THB) 🇹🇭' : `สลับดูยอดเป็นสกุลเงิน ${trip?.currency || 'JPY'} 🇯🇵`, 'info');
        }}
        fxRate={fxRate}
        onOpenCalculator={() => setShowCurrencyCalculator(true)}
        hiddenOnScroll={hideFloatingPills}
      />

      {/* 14. Transfer Ownership Modal with Password Confirmation */}
      {showTransferModal && mounted && (
        <TransferOwnershipModal
          isOpen={showTransferModal}
          onClose={() => {
            setShowTransferModal(false);
            setTransferTargetMember(null);
          }}
          targetMember={transferTargetMember}
          tripName={trip?.name || trip?.title || ''}
          currentUserEmail={currentUser?.email || ''}
          onConfirmTransfer={handleConfirmTransferOwnership}
        />
      )}

      {/* 15. Add Member from System Modal (Owner / Super Admin) */}
      {showAddMemberModal && mounted && (
        <AddMemberModal
          isOpen={showAddMemberModal}
          onClose={() => setShowAddMemberModal(false)}
          tripId={tripId}
          tripName={trip?.name || trip?.title || ''}
          existingMemberUserIds={members.map((m) => m.user_id || m.id)}
          onMemberAdded={fetchTripData}
        />
      )}

    </div>
  );
}
