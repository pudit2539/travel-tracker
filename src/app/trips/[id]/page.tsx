// src/app/trips/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo, useDeferredValue } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { parseTripExcel } from '@/lib/excelParser';
import { useTheme } from '@/components/ThemeProvider';
import dynamic from 'next/dynamic';
import NotificationBell from '@/components/NotificationBell';
import WeatherWidget from '@/components/WeatherWidget';
import RouteVisualizer from '@/components/RouteVisualizer';
import InteractiveTripMap from '@/components/InteractiveTripMap';
import { ExpenseCard } from '@/components/trip-detail/ExpenseCard';
import { ItineraryStopCard } from '@/components/trip-detail/ItineraryStopCard';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/PullToRefreshIndicator';
import { getCatAvatar } from '@/lib/avatars';
import { getCustomJpyToThbRate, formatCurrencyWithThb } from '@/lib/currency';
import { triggerConfetti } from '@/lib/confetti';
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
import { 
  saveLocalReceiptPhoto, 
  getLocalReceiptPhoto, 
  deleteLocalReceiptPhoto 
} from '@/lib/localReceipts';
import { compressReceiptImage } from '@/lib/imageCompressor';

// Code Splitting / Lazy Loaded Modals for 50%+ lighter initial bundle
const ProfileModal = dynamic(() => import('@/components/ProfileModal'), { ssr: false });
const SettlementModal = dynamic(() => import('@/components/SettlementModal'), { ssr: false });
const AIAssistantModal = dynamic(() => import('@/components/AIAssistantModal'), { ssr: false });
const BudgetCategoryModal = dynamic(() => import('@/components/BudgetCategoryModal'), { ssr: false });
const PrintableItineraryModal = dynamic(() => import('@/components/PrintableItineraryModal'), { ssr: false });
const PhotoScrapbookModal = dynamic(() => import('@/components/PhotoScrapbookModal'), { ssr: false });
const VersionRollbackModal = dynamic(() => import('@/components/VersionRollbackModal'), { ssr: false });
const QuickCurrencyCalculator = dynamic(() => import('@/components/QuickCurrencyCalculator'), { ssr: false });
const PackingChecklistModal = dynamic(() => import('@/components/PackingChecklistModal'), { ssr: false });
const TravelHubModal = dynamic(() => import('@/components/TravelHubModal'), { ssr: false });
import { 
  Camera, Upload, MapPin, Utensils, ShieldAlert, 
  Plus, Download, Moon, Sun, ExternalLink, ChevronDown, 
  ChevronUp, ArrowLeft, Trash2, Clock, Bus, Loader2, 
  Edit3, Share2, Users, PieChart, Sparkles, Search, 
  Copy, Check, Image as ImageIcon, X, AlertCircle, 
  CheckCircle2, DollarSign, Calendar, ArrowUp, ArrowDown,
  PlusCircle, User, Wallet, Filter, Calculator, Navigation, 
  Bot, Sliders, AlertTriangle, FileText, History, Wifi, WifiOff, 
  LogOut, ChevronRight, Eye, ShieldCheck, HardDriveDownload, Receipt,
  Luggage, Coins, Map as MapIcon, List
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function TripDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const tripId = Array.isArray(rawId) ? rawId[0] : (typeof rawId === 'string' ? decodeURIComponent(rawId) : '');
  const { theme, setTheme } = useTheme();

  // Offline Hook
  const { isOnline, lastSyncedAt, cacheTripOffline, getOfflineTripCache } = useOfflineSync(tripId);

  // State ข้อมูลหลัก
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [trip, setTrip] = useState<any>(null);
  const [itinerary, setItinerary] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudgetMap>({});
  const [memberBudgets, setMemberBudgets] = useState<MemberBudgetMap>({});
  const [photosCount, setPhotosCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'plan' | 'expenses' | 'analytics' | 'members'>('plan');
  const handleSwitchTab = useCallback((tab: 'plan' | 'expenses' | 'analytics' | 'members') => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, []);
  const [heroBudgetView, setHeroBudgetView] = useState<'all' | 'me' | string>('all');
  const [itineraryViewMode, setItineraryViewMode] = useState<'list' | 'map'>('list');
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);
  const [fxRate, setFxRate] = useState<number>(0.235);
  const [showWeatherSection, setShowWeatherSection] = useState(true);

  // Filter states
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>('all');
  const [expensePayerFilter, setExpensePayerFilter] = useState<string>('all');
  const [expenseSearchQuery, setExpenseSearchQuery] = useState<string>('');
  const deferredExpenseSearch = useDeferredValue(expenseSearchQuery);

  // Modals state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [showAIAssistantModal, setShowAIAssistantModal] = useState(false);
  const [showBudgetCategoryModal, setShowBudgetCategoryModal] = useState(false);
  const [showPrintableModal, setShowPrintableModal] = useState(false);
  const [showScrapbookModal, setShowScrapbookModal] = useState(false);
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [showPackingModal, setShowPackingModal] = useState(false);
  const [showCurrencyCalculator, setShowCurrencyCalculator] = useState(false);
  const [showTravelHubModal, setShowTravelHubModal] = useState(false);

  const [showScanModal, setShowScanModal] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [ocrSuccessToast, setOcrSuccessToast] = useState<string | null>(null);

  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<any>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedAuthLink, setCopiedAuthLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const copyTripCode = () => {
    if (typeof window !== 'undefined' && tripId) {
      navigator.clipboard.writeText(tripId);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const copyInviteLink = () => {
    if (typeof window !== 'undefined' && tripId) {
      const origin = window.location.origin;
      const shareUrl = `${origin}/trips/${tripId}`;
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const copyAuthInviteLink = () => {
    if (typeof window !== 'undefined' && tripId) {
      const origin = window.location.origin;
      const inviteUrl = `${origin}/login?invite=${tripId}`;
      navigator.clipboard.writeText(inviteUrl);
      setCopiedAuthLink(true);
      setTimeout(() => setCopiedAuthLink(false), 2000);
    }
  };

  // Form states for Expense
  const [scannedData, setScannedData] = useState<any>({
    title: '',
    amount: '',
    category: 'food',
    currency: 'JPY',
    receipt_url: '',
    spent_at: new Date().toISOString().split('T')[0],
  });

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
    insert_after_order: null as number | null,
  });
  const [savingActivity, setSavingActivity] = useState(false);

  // State เปิดดู Plan B แบบ Accordion
  const [expandedPlanB, setExpandedPlanB] = useState<{ [key: string]: boolean }>({});

  const fetchTripData = useCallback(async () => {
    if (!tripId) return;
    
    try {
      const offlineCached = getOfflineTripCache();
      if (offlineCached?.data) {
        if (offlineCached.data.trip) setTrip(offlineCached.data.trip);
        if (offlineCached.data.itinerary) setItinerary(offlineCached.data.itinerary);
        if (offlineCached.data.expenses) setExpenses(offlineCached.data.expenses);
      } else {
        const homeCache = localStorage.getItem('travel_tracker_home_trips_cache');
        if (homeCache) {
          const list = JSON.parse(homeCache);
          const found = list.find((t: any) => t.id === tripId);
          if (found) {
            setTrip(found);
            setScannedData((prev: any) => ({ ...prev, currency: found.currency || 'JPY' }));
          }
        }
      }
    } catch {}

    setLoading(true);
    try {
      setFxRate(getCustomJpyToThbRate());

      const cats = getTripCategories(tripId);
      const cBudgets = getCategoryBudgets(tripId);
      const mBudgets = getMemberBudgets(tripId);
      const tripPhotos = getTripPhotos(tripId);
      setCategories(cats);
      setCategoryBudgets(cBudgets);
      setMemberBudgets(mBudgets);
      setPhotosCount(tripPhotos.length);

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setCurrentUser(session.user);
          const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
          if (prof) setUserProfile(prof);
        }
      } catch (e) {
        console.warn('Session profile fetch warn:', e);
      }

      // Parallelize all 4 database queries for 3-4x faster response!
      const [
        { data: tripData },
        { data: planData },
        { data: expData },
        { data: memberData, error: memErr }
      ] = await Promise.all([
        supabase.from('trips').select('*').eq('id', tripId).maybeSingle(),
        supabase.from('itinerary_items').select('*').eq('trip_id', tripId).order('sort_order', { ascending: true }),
        supabase.from('expenses').select('*').eq('trip_id', tripId).order('spent_at', { ascending: false }),
        supabase.from('trip_members').select('*, profiles(*)').eq('trip_id', tripId)
      ]);

      if (tripData) {
        setTrip(tripData);
        setScannedData((prev: any) => ({ ...prev, currency: tripData.currency || 'JPY' }));
      }

      if (planData) setItinerary(planData);

      let uniqueExpList: any[] = [];
      if (expData) {
        const seenExpIds = new Set<string>();
        uniqueExpList = expData.filter((e) => {
          if (!e.id) return true;
          if (seenExpIds.has(e.id)) return false;
          seenExpIds.add(e.id);
          return true;
        });
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
        itinerary: planData || [],
        expenses: uniqueExpList || [],
        categories: cats,
        categoryBudgets: cBudgets,
      });

    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchTripData();
  }, [tripId]);

  // จัดการการนำเข้าไฟล์ Excel
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const parsedItems = parseTripExcel(buffer);

      if (parsedItems.length === 0) {
        alert('ไม่พบข้อมูลแผนเที่ยวในไฟล์ Excel หรือโครงสร้างตารางไม่ตรง');
        return;
      }

      const formatted = parsedItems.map((item, idx) => ({
        ...item,
        trip_id: tripId,
        sort_order: itinerary.length + idx,
      }));

      const { error } = await supabase.from('itinerary_items').insert(formatted);
      if (!error) {
        triggerConfetti();
        alert(`🎉 นำเข้าแผนเที่ยวสำเร็จจำนวน ${parsedItems.length} รายการ!`);
        fetchTripData();
      } else {
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message);
      }
    } catch (err: any) {
      alert('ไม่สามารถประมวลผลไฟล์ได้: ' + err.message);
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

  const handleOpenAddActivity = (afterOrder: number | null = null, defaultDateLabel?: string) => {
    resetActivityForm();
    setEditingActivity(null);
    setActivityForm((prev) => ({
      ...prev,
      insert_after_order: afterOrder,
      date_label: defaultDateLabel || prev.date_label,
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
            transport_info: activityForm.transport_info,
            backup_plan: backupFormatted,
            backup_links: backupLinksFiltered,
          })
          .eq('id', editingActivity.id);

        if (!error) {
          setShowActivityModal(false);
          fetchTripData();
        } else {
          alert('เกิดข้อผิดพลาดในการแก้ไข: ' + error.message);
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
            transport_info: activityForm.transport_info,
            backup_plan: backupFormatted,
            backup_links: backupLinksFiltered,
            sort_order: nextOrder,
          },
        ]);

        if (!error) {
          setShowActivityModal(false);
          fetchTripData();
        } else {
          alert('เกิดข้อผิดพลาดในการเพิ่มกิจกรรม: ' + error.message);
        }
      }
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
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

    setActivityForm({
      date_label: item.date_label || '',
      time_slot: item.time_slot || '',
      city: item.city || '',
      main_place: item.main_place || '',
      main_place_links: placeLinks,
      food_recommendations: foodItems,
      backup_plans: backupItems,
      transport_info: item.transport_info || '',
      insert_after_order: null,
    });
    setShowActivityModal(true);
  };

  const handleDeleteActivity = async (id: string) => {
    if (!confirm('ต้องการลบกิจกรรมนี้ออกจากแผนเที่ยวใช่หรือไม่?')) return;
    const { error } = await supabase.from('itinerary_items').delete().eq('id', id);
    if (!error) fetchTripData();
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
      insert_after_order: null,
    });
  };

  // สแกนใบเสร็จด้วย AI OCR พร้อม Client-Side Compression & Auth Token
  const handleReceiptImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    setOcrSuccessToast(null);

    try {
      // 1. Client-Side Image Compression (ย่อขนาดรูปทันทีก่อนอัปโหลด ลดจาก 5-15MB เหลือ ~250KB)
      const compressed = await compressReceiptImage(file, 1200, 0.82);

      // 2. ดึง Session Token สำหรับ Auth Check
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // 3. ส่งข้อมูลภาพที่บีบอัดแล้วไปยัง API
      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers,
        body: JSON.stringify({ imageBase64: compressed.base64, mimeType: compressed.mimeType }),
      });
      const json = await res.json();
      if (json.data) {
        setScannedData((prev: any) => ({
          ...prev,
          title: json.data.merchant || prev.title || 'ค่าใช้จ่ายทั่วไป',
          amount: json.data.amount ? String(json.data.amount) : prev.amount || '1000',
          category: json.data.category || prev.category || 'food',
          currency: json.data.currency || trip?.currency || 'JPY',
          spent_at: json.data.date || prev.spent_at || new Date().toISOString().split('T')[0],
          receipt_url: compressed.dataUrl,
        }));
        setOcrSuccessToast(`✨ AI สแกนใบเสร็จสำเร็จ: "${json.data.merchant}" ยอด ${Number(json.data.amount || 0).toLocaleString()} ${json.data.currency || 'JPY'}`);
        setTimeout(() => setOcrSuccessToast(null), 5000);
      } else {
        setScannedData((prev: any) => ({ ...prev, receipt_url: compressed.dataUrl }));
      }
    } catch (err) {
      console.warn('OCR scan fallback:', err);
      // Fallback
      const reader = new FileReader();
      reader.onload = () => {
        const fallbackUrl = reader.result as string;
        setScannedData((prev: any) => ({
          ...prev,
          title: prev.title || 'ค่าใช้จ่ายใบเสร็จ',
          amount: prev.amount || '1000',
          receipt_url: fallbackUrl,
        }));
      };
      reader.readAsDataURL(file);
    } finally {
      setScanning(false);
    }
  };

  // บันทึกค่าใช้จ่าย
  const handleSaveExpense = async () => {
    if (savingExpense) return;
    if (!scannedData.amount || !scannedData.title) {
      alert('กรุณากรอกชื่อรายการและจำนวนเงิน');
      return;
    }

    setSavingExpense(true);
    try {
      const payerName = userProfile?.display_name || currentUser?.user_metadata?.display_name || currentUser?.email?.split('@')[0] || 'สมาชิก';
      const payerAvatar = userProfile?.avatar_id || currentUser?.user_metadata?.avatar_id || 'cat_pink';

      let receiptStorageRef = null;
      if (scannedData.receipt_url) {
        const localReceiptKey = `receipt_${tripId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        try {
          await saveLocalReceiptPhoto(localReceiptKey, scannedData.receipt_url);
          receiptStorageRef = localReceiptKey;
        } catch {
          receiptStorageRef = 'local';
        }
      }

      const { error } = await supabase.from('expenses').insert([
        {
          trip_id: tripId,
          title: scannedData.title.trim(),
          amount: Number(scannedData.amount),
          currency: scannedData.currency,
          category: scannedData.category,
          receipt_url: receiptStorageRef,
          spent_at: scannedData.spent_at,
          payer_id: currentUser?.id || null,
          payer_name: payerName,
          payer_avatar: payerAvatar,
        },
      ]);

      if (!error) {
        triggerConfetti();
        setShowScanModal(false);
        setOcrSuccessToast(null);
        setScannedData({
          title: '',
          amount: '',
          category: 'food',
          currency: trip?.currency || 'JPY',
          receipt_url: '',
          spent_at: new Date().toISOString().split('T')[0],
        });
        fetchTripData();
      } else {
        alert('เกิดข้อผิดพลาดในการบันทึกค่าใช้จ่าย: ' + error.message);
      }
    } catch (saveErr: any) {
      alert('เกิดข้อผิดพลาด: ' + (saveErr?.message || 'ไม่สามารถบันทึกได้'));
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
          alert('รูปใบเสร็จถูกบันทึกไว้ในอุปกรณ์ต้นทางที่ถ่ายรูป ไม่พบในอุปกรณ์นี้');
        }
      }
    } catch (e) {
      console.warn('Failed to load local receipt', e);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDeleteExpense = async (id: string, receiptRef?: string) => {
    if (!confirm('ต้องการลบรายการค่าใช้จ่ายนี้ใช่หรือไม่?')) return;
    if (receiptRef) {
      try {
        await deleteLocalReceiptPhoto(receiptRef);
      } catch {}
    }
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) fetchTripData();
  };

  // ส่งออก Excel
  const exportToExcel = () => {
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

  // Permissions
  const isOwner = useMemo(() => {
    if (!currentUser) return false;
    if (trip?.created_by && trip.created_by === currentUser.id) return true;
    const currentMember = members.find((m) => m.user_id === currentUser.id);
    return currentMember?.role === 'owner';
  }, [trip, currentUser, members]);

  const currentUserRole = useMemo(() => {
    if (!currentUser) return 'guest';
    if (isOwner) return 'owner';
    const currentMember = members.find((m) => m.user_id === currentUser.id);
    return currentMember?.role || 'viewer';
  }, [currentUser, isOwner, members]);

  const canEditPlan = currentUserRole === 'owner' || currentUserRole === 'editor';
  const canAddExpense = currentUserRole === 'owner' || currentUserRole === 'editor' || currentUserRole === 'viewer';
  const canImportExcel = isOwner;

  const handleUpdateMemberRole = async (memberId: string, newRole: 'editor' | 'viewer') => {
    if (!isOwner) return;
    try {
      const { error } = await supabase
        .from('trip_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (!error) {
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
        );
      } else {
        alert('ไม่สามารถเปลี่ยนสิทธิ์ได้: ' + error.message);
      }
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!isOwner) return;
    if (!confirm(`คุณต้องการลบ "${memberName}" ออกจากทริปใช่หรือไม่?`)) return;

    try {
      const { error } = await supabase
        .from('trip_members')
        .delete()
        .eq('id', memberId);

      if (!error) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
      } else {
        alert('ไม่สามารถลบสมาชิกได้: ' + error.message);
      }
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  const userDisplayName = userProfile?.display_name || currentUser?.user_metadata?.display_name || currentUser?.email?.split('@')[0] || 'นักเดินทาง';
  const userCat = getCatAvatar(userProfile?.avatar_id || currentUser?.user_metadata?.avatar_id);

  // คำนวณยอดเงินรวม
  const totalSpent = useMemo(() => {
    return expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  }, [expenses]);

  const targetBudget = Number(trip?.total_budget ?? trip?.budget ?? 0);

  // ข้อมูล Hero Budget Display
  const heroDisplayData = useMemo(() => {
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
      const mySpent = expenses
        .filter((e) => (e.payer_id && e.payer_id === currentUser?.id) || (e.payer_name && e.payer_name.toLowerCase() === userDisplayName.toLowerCase()))
        .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

      const myBudget = memberBudgets['me'] || (targetBudget > 0 && members.length > 0 ? Math.round(targetBudget / (members.length + 1)) : 0);
      const progress = myBudget > 0 ? Math.min(Math.round((mySpent / myBudget) * 100), 100) : 0;
      const remaining = myBudget > mySpent ? myBudget - mySpent : 0;
      const isOver = myBudget > 0 && mySpent > myBudget;
      const diff = Math.abs(mySpent - myBudget);

      return {
        title: `ยอดค่าใช้จ่ายของฉัน (${userDisplayName})`,
        spent: mySpent,
        targetBudget: myBudget,
        budgetLabel: 'งบส่วนตัวของฉัน',
        progress,
        remaining,
        isOver,
        diff,
        viewName: 'ของฉัน',
      };
    } else {
      const targetMember = members.find((m) => m.user_id === heroBudgetView || m.id === heroBudgetView);
      const mName = targetMember?.profiles?.display_name || targetMember?.profiles?.email?.split('@')[0] || 'สมาชิก';
      
      const memberSpent = expenses
        .filter((e) => (e.payer_id && e.payer_id === targetMember?.user_id) || (e.payer_name && e.payer_name.toLowerCase() === mName.toLowerCase()))
        .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

      const mBudget = memberBudgets[heroBudgetView] || 0;
      const progress = mBudget > 0 ? Math.min(Math.round((memberSpent / mBudget) * 100), 100) : 0;
      const remaining = mBudget > memberSpent ? mBudget - memberSpent : 0;
      const isOver = mBudget > 0 && memberSpent > mBudget;
      const diff = Math.abs(memberSpent - mBudget);

      return {
        title: `ยอดค่าใช้จ่ายของ ${mName}`,
        spent: memberSpent,
        targetBudget: mBudget,
        budgetLabel: `งบเฉพาะบุคคล (${mName})`,
        progress,
        remaining,
        isOver,
        diff,
        viewName: mName,
      };
    }
  }, [heroBudgetView, totalSpent, targetBudget, expenses, currentUser, userDisplayName, memberBudgets, members]);

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
        const obj = { key, name: mName, avatar: m.profiles?.avatar_id };
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
        const obj = { key: pKey, name: pName, avatar: e.payer_avatar };
        map.set(norm, obj);
        map.set(pKey, obj);
      }
    });

    return Array.from(new Set(map.values()));
  }, [members, expenses, currentUser, userDisplayName]);

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
      map.get(key)!.total += Number(e.amount || 0);
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [expenses, currentUser, userDisplayName, userProfile]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (expenseCategoryFilter !== 'all' && e.category !== expenseCategoryFilter) return false;
      
      if (expensePayerFilter !== 'all') {
        const myId = currentUser?.id?.toLowerCase();
        const myName = userDisplayName?.trim().toLowerCase();
        const isMe = (myId && e.payer_id?.toLowerCase() === myId) ||
                     (myName && e.payer_name && e.payer_name.trim().toLowerCase() === myName);

        if (expensePayerFilter === 'me') {
          if (!isMe) return false;
        } else {
          if (isMe) return false;
          const target = expensePayerFilter.trim().toLowerCase();
          const matchesId = e.payer_id && e.payer_id.trim().toLowerCase() === target;
          const matchesName = e.payer_name && e.payer_name.trim().toLowerCase() === target;
          if (!matchesId && !matchesName) return false;
        }
      }

      if (deferredExpenseSearch.trim()) {
        const query = deferredExpenseSearch.toLowerCase();
        const titleMatch = (e.title || '').toLowerCase().includes(query);
        const payerMatch = (e.payer_name || '').toLowerCase().includes(query);
        if (!titleMatch && !payerMatch) return false;
      }
      return true;
    });
  }, [expenses, expenseCategoryFilter, expensePayerFilter, deferredExpenseSearch, currentUser, userDisplayName]);

  // วันทั้งหมดที่มีใน Itinerary
  const availableDays = useMemo(() => {
    const days = new Set<string>();
    itinerary.forEach((item) => {
      if (item.date_label && item.date_label.trim().length > 0) {
        days.add(item.date_label.trim());
      }
    });
    return Array.from(days);
  }, [itinerary]);

  const filteredItinerary = useMemo(() => {
    if (selectedDayFilter === 'all') return itinerary;
    return itinerary.filter((item) => item.date_label?.trim() === selectedDayFilter);
  }, [itinerary, selectedDayFilter]);

  const { pullDistance, isRefreshing, isReadyToRefresh } = usePullToRefresh({
    onRefresh: fetchTripData,
  });

  if (loading && !trip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
        <Loader2 className="h-9 w-9 animate-spin text-pink-500" />
        <p className="text-xs font-bold text-slate-500 dark:text-purple-400">กำลังโหลดข้อมูลทริป...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-28 md:pb-20 bg-grid-pattern transition-colors duration-300">
      
      {/* iOS/iPad Touch Pull-to-Refresh Indicator */}
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        isReadyToRefresh={isReadyToRefresh}
      />
      
      {/* Background Floating Glow Orbs */}
      <div className="absolute top-20 left-10 w-80 sm:w-96 h-80 sm:h-96 bg-pink-500/10 dark:bg-pink-500/15 rounded-full blur-3xl pointer-events-none animate-float-slow" />
      <div className="absolute top-80 right-10 w-80 sm:w-96 h-80 sm:h-96 bg-purple-600/10 dark:bg-purple-600/15 rounded-full blur-3xl pointer-events-none animate-float-reverse" />

      {/* ==================== TOP NAVIGATION & STICKY APP HEADER ==================== */}
      <nav className="sticky top-0 z-40 border-b border-pink-100/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#121524]/95 backdrop-blur-2xl transition-colors safe-top-nav">
        <div className="max-w-5xl mx-auto px-3.5 sm:px-4 pb-2 sm:pb-2.5 space-y-2">
          
          {/* Row 1: Back & Title & Action Icons */}
          <div className="pt-1 sm:pt-1.5 flex items-center justify-between gap-2">
            
            {/* Left: Back & Title */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Link
                href="/"
                className="p-1.5 sm:p-2 rounded-2xl border border-pink-100/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#151826]/90 text-slate-700 dark:text-slate-200 hover:border-pink-300 dark:hover:border-slate-700 hover:text-pink-600 dark:hover:text-pink-400 hover:scale-105 active:scale-95 shadow-2xs transition-all shrink-0 cursor-pointer"
                title="กลับไปหน้าทริปทั้งหมด"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h1 className="text-sm sm:text-base font-black bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 dark:from-pink-400 dark:via-rose-400 dark:to-purple-300 bg-clip-text text-transparent truncate max-w-[130px] xs:max-w-[180px] sm:max-w-xs md:max-w-md">
                    {(trip?.name || trip?.title) || 'รายละเอียดทริป'}
                  </h1>
                  
                  <span className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full border shrink-0 ${
                    isOnline 
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900' 
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900'
                  }`}>
                    {isOnline ? <Wifi className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-500" /> : <WifiOff className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-500" />}
                    <span className="hidden md:inline">{isOnline ? 'ออนไลน์' : 'ออฟไลน์ (แคชเครื่อง)'}</span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-semibold truncate">
                  <span>{trip?.currency || 'JPY'}</span>
                  <span>•</span>
                  <span>{trip?.start_date ? new Date(trip.start_date).toLocaleDateString('th-TH') : 'ไม่ระบุวัน'}</span>
                </div>
              </div>
            </div>

            {/* Right Action Icons */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <NotificationBell expenses={expenses} itinerary={itinerary} members={members} tripTitle={trip?.name || trip?.title} />

              <button
                onClick={() => setShowProfileModal(true)}
                className="flex items-center gap-1.5 p-1 sm:p-1.5 sm:pr-2.5 rounded-2xl border border-pink-100/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#151826]/90 hover:border-pink-300 dark:hover:border-slate-700 hover:scale-105 active:scale-95 shadow-2xs transition-all cursor-pointer group"
                title="ตั้งค่าโปรไฟล์"
              >
                <div className={`w-6 h-6 rounded-lg bg-gradient-to-tr ${userCat.bgGradient} flex items-center justify-center text-xs shadow-sm group-hover:scale-110 transition-transform overflow-hidden`}>
                  {userCat.imgUrl ? (
                    <img src={userCat.imgUrl} alt={userCat.name} className="w-full h-full object-cover" />
                  ) : (
                    userCat.emoji
                  )}
                </div>
                <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 max-w-[80px] truncate hidden lg:inline">
                  {userDisplayName}
                </span>
              </button>

              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-pink-100/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#151826]/90 text-slate-700 dark:text-slate-200 text-xs font-bold hover:border-pink-300 dark:hover:border-slate-700 hover:text-pink-600 dark:hover:text-pink-400 hover:scale-105 active:scale-95 shadow-2xs transition-all cursor-pointer"
                title="แชร์ทริป"
              >
                <Share2 className="h-3.5 w-3.5 text-pink-500" />
                <span className="hidden sm:inline">แชร์</span>
              </button>

              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-1.5 sm:p-2 rounded-xl border border-pink-100/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#151826]/90 text-slate-700 dark:text-slate-200 hover:border-pink-300 dark:hover:border-slate-700 hover:rotate-45 active:scale-95 shadow-2xs transition-all duration-300 cursor-pointer"
                title="สลับโหมด มืด/สว่าง"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-purple-600" />}
              </button>

              {currentUser && (
                <button
                  onClick={async () => {
                    if (confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
                      try {
                        await supabase.auth.signOut();
                      } catch (e) {
                        console.error('Signout error', e);
                      } finally {
                        try {
                          localStorage.clear();
                          sessionStorage.clear();
                        } catch {}
                        window.location.href = '/login';
                      }
                    }
                  }}
                  className="p-1.5 sm:p-2 rounded-xl border border-pink-100/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#151826]/90 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:border-rose-400 shadow-2xs transition-all cursor-pointer"
                  title="ออกจากระบบ (Sign Out)"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Row 2: The 4 Tabs */}
          <div className="grid grid-cols-4 gap-1 sm:gap-2 p-1 sm:p-1.5 bg-pink-50/70 dark:bg-[#151826]/90 border border-pink-100/80 dark:border-slate-800/80 rounded-2xl sm:rounded-3xl shadow-xs">
            <button
              type="button"
              onClick={() => handleSwitchTab('plan')}
              className={`py-1.5 sm:py-2 px-1 sm:px-3 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
                activeTab === 'plan' 
                  ? 'bg-gradient-to-r from-pink-400 via-rose-400 to-purple-400 text-white shadow-md shadow-pink-400/25 scale-[1.02]' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <span>🗺️</span>
              <span className="truncate">แผนเที่ยว</span>
              <span className="text-[10px] opacity-85 hidden md:inline">({itinerary.length})</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('expenses')}
              className={`py-1.5 sm:py-2 px-1 sm:px-3 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
                activeTab === 'expenses' 
                  ? 'bg-gradient-to-r from-pink-400 via-rose-400 to-purple-400 text-white shadow-md shadow-pink-400/25 scale-[1.02]' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <span>💰</span>
              <span className="truncate">รายจ่าย</span>
              <span className="text-[10px] opacity-85 hidden md:inline">({expenses.length})</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('analytics')}
              className={`py-1.5 sm:py-2 px-1 sm:px-3 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
                activeTab === 'analytics' 
                  ? 'bg-gradient-to-r from-pink-400 via-rose-400 to-purple-400 text-white shadow-md shadow-pink-400/25 scale-[1.02]' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <span>📊</span>
              <span className="truncate">สถิติ & งบ</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('members')}
              className={`py-1.5 sm:py-2 px-1 sm:px-3 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
                activeTab === 'members' 
                  ? 'bg-gradient-to-r from-pink-400 via-rose-400 to-purple-400 text-white shadow-md shadow-pink-400/25 scale-[1.02]' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <span>👥</span>
              <span className="truncate">สมาชิก</span>
              <span className="text-[10px] opacity-85 hidden md:inline">({members.length})</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ==================== MAIN CONTENT CONTAINER ==================== */}
      <main className="relative z-10 max-w-5xl mx-auto px-3.5 sm:px-4 pt-3 sm:pt-4 pb-28 space-y-3.5 sm:space-y-4">

        {/* Guest Preview & Join Invitation Banner */}
        {!currentUser && (
          <div className="p-3.5 sm:p-4 rounded-3xl bg-gradient-to-r from-pink-500/15 via-purple-600/15 to-indigo-600/15 border border-pink-300 dark:border-purple-800/80 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md animate-in fade-in">
            <div className="flex items-center gap-3 text-left">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white text-base sm:text-lg shadow-sm shrink-0">
                👋
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  คุณกำลังดูทริปนี้ในฐานะผู้มาเยือน (Guest Preview)
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-600 dark:text-purple-300/80 font-medium">
                  เข้าสู่ระบบเพื่อร่วมบันทึกค่าใช้จ่าย แก้ไขแผนเที่ยว และสแกนบิลด้วย AI
                </p>
              </div>
            </div>
            <Link
              href={`/login?returnUrl=/trips/${tripId}`}
              className="w-full sm:w-auto text-center px-4 py-2 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-black shadow-md shadow-pink-500/25 hover:scale-105 transition-all shrink-0 cursor-pointer"
            >
              เข้าสู่ระบบ / สมัครสมาชิก
            </Link>
          </div>
        )}

        {/* ==================== TAB 1: แผนการเดินทาง (ITINERARY - MAIN SCREEN) ==================== */}
        {activeTab === 'plan' && (
          <div className="space-y-3.5 sm:space-y-4">
            
            {/* Quick Status Bar: FX Rate + Weather Toggle + Travel Hub */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 sm:p-3 rounded-2xl bg-white/95 dark:bg-[#151826]/95 border border-pink-100/80 dark:border-slate-800/80 card-elevation">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300 border border-pink-200 dark:border-pink-900 shadow-2xs">
                  {trip?.currency || 'JPY'} Workspace
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/60 px-2 py-0.5 rounded-full border border-pink-200 dark:border-pink-900 shadow-2xs">
                  100 JPY = {(fxRate * 100).toFixed(2)} THB
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowWeatherSection(!showWeatherSection)}
                  className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                    showWeatherSection 
                      ? 'bg-pink-500 text-white border-pink-500 shadow-xs' 
                      : 'bg-slate-100 dark:bg-[#1e2235] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-pink-400'
                  }`}
                >
                  <span>🌤️ เส้นทาง & อากาศ</span>
                  {showWeatherSection ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>

                <button
                  type="button"
                  onClick={() => setShowTravelHubModal(true)}
                  className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black text-white bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 px-3 py-1.5 rounded-xl shadow-md shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer glow-pink-purple"
                >
                  <span>🧰 Travel Hub</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </button>
              </div>
            </div>

            {/* Aesthetic 3-Block Pastel Budget Overview Card (Click to jump to Expenses Tab) */}
            <div 
              onClick={() => handleSwitchTab('expenses')}
              className="p-3 sm:p-3.5 rounded-3xl border border-pink-100/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#151826]/95 card-elevation space-y-2.5 cursor-pointer hover:border-pink-300 dark:hover:border-slate-700 transition-all group"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between px-0.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-200">
                  <Coins className="h-4 w-4 text-pink-500" />
                  <span>สรุปงบประมาณทริป</span>
                  <span className="text-[10px] font-semibold text-slate-400">({heroDisplayData.title})</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-black text-pink-600 dark:text-pink-400 group-hover:translate-x-0.5 transition-transform">
                  <span>ไปหน้ารายจ่าย</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* 3 Pastel Summary Blocks */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {/* Block 1: Used / จ่ายแล้ว (Soft Rose/Strawberry Pastel) */}
                <div className="rounded-2xl p-2.5 sm:p-3 bg-rose-50/90 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/50 flex flex-col justify-between">
                  <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-black text-rose-600 dark:text-rose-300">
                    <span>💸</span>
                    <span>ใช้ไปแล้ว</span>
                  </div>
                  <div className="mt-1">
                    <div className="text-sm sm:text-base md:text-lg font-black text-rose-700 dark:text-rose-200 leading-tight">
                      {heroDisplayData.spent.toLocaleString()}
                    </div>
                    <div className="text-[9px] sm:text-[10px] font-semibold text-rose-500/80 dark:text-rose-300/70 truncate">
                      ≈ ฿{Math.round(heroDisplayData.spent * fxRate).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Block 2: Target / ตั้งเป้า (Soft Mint/Emerald Pastel) */}
                <div className="rounded-2xl p-2.5 sm:p-3 bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50 flex flex-col justify-between">
                  <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-black text-emerald-600 dark:text-emerald-300">
                    <span>🎯</span>
                    <span>ตั้งเป้าไว้</span>
                  </div>
                  <div className="mt-1">
                    <div className="text-sm sm:text-base md:text-lg font-black text-emerald-700 dark:text-emerald-200 leading-tight">
                      {heroDisplayData.targetBudget > 0 ? heroDisplayData.targetBudget.toLocaleString() : '-'}
                    </div>
                    <div className="text-[9px] sm:text-[10px] font-semibold text-emerald-600/80 dark:text-emerald-300/70 truncate">
                      {heroDisplayData.targetBudget > 0 ? `≈ ฿${Math.round(heroDisplayData.targetBudget * fxRate).toLocaleString()}` : 'ยังไม่ระบุงบ'}
                    </div>
                  </div>
                </div>

                {/* Block 3: Remaining / คงเหลือ (Soft Sky/Indigo Pastel) */}
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
                      heroDisplayData.isOver 
                        ? 'text-amber-700 dark:text-amber-200' 
                        : 'text-sky-700 dark:text-sky-200'
                    }`}>
                      {heroDisplayData.targetBudget > 0 
                        ? (heroDisplayData.isOver ? `+${heroDisplayData.diff.toLocaleString()}` : heroDisplayData.remaining.toLocaleString())
                        : heroDisplayData.spent.toLocaleString()}
                    </div>
                    <div className={`text-[9px] sm:text-[10px] font-semibold truncate ${
                      heroDisplayData.isOver ? 'text-amber-600/80 dark:text-amber-400/80' : 'text-sky-600/80 dark:text-sky-300/70'
                    }`}>
                      {heroDisplayData.targetBudget > 0 
                        ? (heroDisplayData.isOver ? 'เกินงบที่ตั้งไว้' : `เหลือ ${Math.max(0, 100 - heroDisplayData.progress)}%`) 
                        : 'แตะจัดการงบ'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Collapsible Weather & Route Widget inside Plan */}
            {showWeatherSection && (
              <div className="rounded-3xl border border-slate-200/80 dark:border-purple-900/50 bg-white/95 dark:bg-[#1a182d]/95 card-elevation p-3.5 sm:p-4 space-y-4">
                <WeatherWidget defaultCity="Osaka" />
                <RouteVisualizer dayLabel="เส้นทางภาพรวม" items={itinerary} />
              </div>
            )}
            
            {/* Header Toolbar */}
            <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full custom-scrollbar">
                <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-200 dark:bg-[#11101d] border border-slate-300 dark:border-purple-900/60 shrink-0">
                  <button
                    onClick={() => setItineraryViewMode('list')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      itineraryViewMode === 'list'
                        ? 'bg-white dark:bg-[#1a182d] text-pink-600 dark:text-pink-400 shadow-2xs'
                        : 'text-slate-600 dark:text-purple-400 hover:text-slate-900'
                    }`}
                  >
                    <List className="h-3 w-3" />
                    <span>รายการ</span>
                  </button>
                  <button
                    onClick={() => setItineraryViewMode('map')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      itineraryViewMode === 'map'
                        ? 'bg-white dark:bg-[#1a182d] text-pink-600 dark:text-pink-400 shadow-2xs'
                        : 'text-slate-600 dark:text-purple-400 hover:text-slate-900'
                    }`}
                  >
                    <MapIcon className="h-3 w-3" />
                    <span>แผนที่หมุด 🗺️</span>
                  </button>
                </div>

                {availableDays.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedDayFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                        selectedDayFilter === 'all'
                          ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-xs scale-105'
                          : 'bg-slate-100 dark:bg-[#11101d] text-slate-800 dark:text-purple-200 border border-slate-300/80 dark:border-purple-900/50 hover:bg-slate-200'
                      }`}
                    >
                      ทั้งหมด ({itinerary.length})
                    </button>
                    {availableDays.map((day) => (
                      <button
                        key={day}
                        onClick={() => setSelectedDayFilter(day)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                          selectedDayFilter === day
                            ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-xs scale-105'
                            : 'bg-slate-100 dark:bg-[#11101d] text-slate-800 dark:text-purple-200 border border-slate-300/80 dark:border-purple-900/50 hover:bg-slate-200'
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-purple-800 bg-white/90 dark:bg-[#1a182d]/90 text-xs font-bold text-slate-700 dark:text-purple-200 hover:border-pink-500 transition-all cursor-pointer shadow-2xs"
                  title="พิมพ์ / เซฟเป็น PDF"
                >
                  <FileText className="h-3.5 w-3.5 text-pink-500" />
                  <span className="hidden sm:inline">พิมพ์ PDF</span>
                </button>

                {canImportExcel && (
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-300 dark:border-purple-800 bg-purple-50/80 dark:bg-purple-950/40 text-purple-700 dark:text-purple-200 text-xs font-bold hover:border-pink-500 cursor-pointer transition-all shadow-2xs">
                    <Upload className="h-3.5 w-3.5 text-purple-500" />
                    <span className="hidden sm:inline">Import Excel</span>
                    <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
                  </label>
                )}

                <button
                  onClick={exportToExcel}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-purple-800 bg-white/90 dark:bg-[#1a182d]/90 text-xs font-bold text-slate-700 dark:text-purple-200 hover:border-pink-500 transition-all cursor-pointer shadow-2xs"
                  title="ดาวน์โหลดไฟล์ Excel"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="hidden sm:inline">Export Excel</span>
                </button>

                {canEditPlan && (
                  <button
                    onClick={() => handleOpenAddActivity(null, selectedDayFilter !== 'all' ? selectedDayFilter : undefined)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold shadow-md shadow-pink-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
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
                <div className="text-center py-12 border-2 border-dashed border-slate-300 dark:border-purple-900/50 rounded-3xl p-6 bg-white/60 dark:bg-[#1a182d]/60">
                  <Navigation className="h-10 w-10 text-pink-500 mx-auto mb-2 animate-float-slow" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">ยังไม่มีกิจกรรมในแผนเที่ยวนี้</h3>
                  <p className="text-xs text-slate-500 dark:text-purple-400 mt-1 mb-4">
                    กดปุ่มเพิ่มกิจกรรม หรือนำเข้าจากไฟล์ Excel ได้ทันที
                  </p>
                  {canEditPlan && (
                    <button
                      onClick={() => handleOpenAddActivity()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-md hover:scale-105 transition-all"
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
        )}

        {/* ==================== TAB 2: รายจ่าย (EXPENSES - FOCUSED) ==================== */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            
            {/* HERO BUDGET & QUICK ACTION CARD */}
            <div className="relative overflow-hidden rounded-3xl border border-pink-100/80 dark:border-slate-800/80 bg-gradient-to-br from-pink-50/60 via-purple-50/30 to-indigo-50/30 dark:from-slate-900/60 dark:via-[#151826] dark:to-[#151826] bg-white/95 dark:bg-[#151826]/95 backdrop-blur-xl card-elevation p-4 sm:p-6 md:p-7 space-y-4">
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-pink-400/15 rounded-full blur-3xl pointer-events-none animate-float-slow" />
              <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl pointer-events-none animate-float-reverse" />

              {/* Row 1: Badges & Quick Tool Pills */}
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300 border border-pink-200 dark:border-pink-900 shadow-2xs">
                    {trip?.currency || 'JPY'} Workspace
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/60 px-2 py-0.5 rounded-full border border-pink-200 dark:border-pink-900 shadow-2xs">
                    100 JPY = {(fxRate * 100).toFixed(2)} THB
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowTravelHubModal(true)}
                    className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black text-white bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 px-3 py-1.5 rounded-xl shadow-md shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer glow-pink-purple"
                  >
                    <span>🧰 Travel Hub</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowBudgetCategoryModal(true)}
                    className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-200 bg-white/90 dark:bg-[#1e2235] px-2.5 py-1.5 rounded-xl border border-pink-100 dark:border-slate-700 hover:border-pink-400 hover:text-pink-600 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                  >
                    <Sliders className="h-3 w-3 text-pink-500" /> 
                    <span>งบ & หมวด</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Swipeable Segmented Member Chips */}
              <div className="relative z-10 flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                <button
                  type="button"
                  onClick={() => setHeroBudgetView('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    heroBudgetView === 'all'
                      ? 'bg-gradient-to-r from-pink-400 via-rose-400 to-purple-400 text-white shadow-xs scale-105'
                      : 'bg-white/80 dark:bg-[#1e2235] text-slate-700 dark:text-slate-300 hover:bg-pink-50 border border-pink-100 dark:border-slate-800'
                  }`}
                >
                  👥 รวมทุกคน
                </button>

                <button
                  type="button"
                  onClick={() => setHeroBudgetView('me')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                    heroBudgetView === 'me'
                      ? 'bg-gradient-to-r from-pink-400 via-rose-400 to-purple-400 text-white shadow-xs scale-105'
                      : 'bg-white/80 dark:bg-[#1e2235] text-slate-700 dark:text-slate-300 hover:bg-pink-50 border border-pink-100 dark:border-slate-800'
                  }`}
                >
                  <span>{userCat.emoji}</span>
                  <span>ของฉัน ({userDisplayName})</span>
                </button>

                {otherMembers.map((m) => {
                  const mName = m.profiles?.display_name || m.profiles?.email?.split('@')[0] || 'สมาชิก';
                  const mCat = getCatAvatar(m.profiles?.avatar_id);
                  const mKey = m.user_id || m.id;
                  const isSelected = heroBudgetView === mKey;

                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setHeroBudgetView(mKey)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-gradient-to-r from-pink-400 via-rose-400 to-purple-400 text-white shadow-xs scale-105'
                          : 'bg-white/80 dark:bg-[#1e2235] text-slate-700 dark:text-slate-300 hover:bg-pink-50 border border-pink-100 dark:border-slate-800'
                      }`}
                    >
                      <span>{mCat.emoji}</span>
                      <span>{mName}</span>
                    </button>
                  );
                })}
              </div>

              {/* Row 3: Spent Metric */}
              <div className="relative z-10 pt-1">
                <div className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>{heroDisplayData.title}</span>
                  {heroDisplayData.isOver && (
                    <span className="text-[10px] sm:text-[11px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900">
                      ⚠️ เกินงบ +{heroDisplayData.diff.toLocaleString()} {trip?.currency}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-baseline gap-1 sm:gap-2 mt-0.5">
                  <span className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                    {heroDisplayData.spent.toLocaleString()}
                  </span>
                  <span className="text-base sm:text-xl font-bold text-pink-600 dark:text-pink-400">
                    {trip?.currency || 'JPY'}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 ml-1">
                    (≈ ฿{Math.round(heroDisplayData.spent * fxRate).toLocaleString()})
                  </span>
                </div>
              </div>

              {/* Row 4: Progress Bar */}
              <div className="relative z-10 space-y-1.5">
                <div className="flex justify-between text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>
                    {heroDisplayData.targetBudget > 0 
                      ? `ใช้ไปแล้ว ${heroDisplayData.progress}% ของเป้าหมาย` 
                      : 'ยังไม่ได้ตั้งเป้างบประมาณ'}
                  </span>
                  <span className="flex items-center gap-1">
                    {heroDisplayData.budgetLabel}: {heroDisplayData.targetBudget > 0 ? `${heroDisplayData.targetBudget.toLocaleString()} ${trip?.currency || 'JPY'}` : 'ไม่ระบุ'}
                    <button
                      onClick={() => setShowBudgetCategoryModal(true)}
                      className="p-0.5 text-slate-400 hover:text-pink-500 transition-colors cursor-pointer"
                      title="ตั้งค่าเป้าหมายงบประมาณ"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                  </span>
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-3 sm:h-3.5 p-0.5 overflow-hidden shadow-inner relative">
                  <div
                    className={`h-full rounded-full transition-all duration-700 relative overflow-hidden ${
                      heroDisplayData.isOver
                        ? 'bg-gradient-to-r from-rose-500 via-pink-600 to-red-600'
                        : heroDisplayData.progress > 80
                        ? 'bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600'
                        : 'bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600'
                    }`}
                    style={{ width: `${Math.max(heroDisplayData.progress, 3)}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-shimmer" />
                  </div>
                </div>
              </div>

              {/* Row 5: Remaining Ribbon & Primary Action Buttons */}
              <div className="relative z-10 pt-1 space-y-3">
                {heroDisplayData.targetBudget > 0 && (
                  <div className={`p-2.5 sm:p-3 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-2xs ${
                    heroDisplayData.isOver
                      ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900 text-rose-700 dark:text-rose-300'
                      : 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      {heroDisplayData.isOver ? (
                        <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      )}
                      <span>
                        {heroDisplayData.isOver ? 'ยอดเงินที่ใช้เกินงบประมาณ:' : 'ยอดเงินคงเหลือ:'}
                      </span>
                    </div>
                    <div className="font-black text-right">
                      <span>{heroDisplayData.isOver ? heroDisplayData.diff.toLocaleString() : heroDisplayData.remaining.toLocaleString()} {trip?.currency}</span>
                      <span className="text-[10px] opacity-80 block sm:inline sm:ml-1">
                        (≈ ฿{Math.round((heroDisplayData.isOver ? heroDisplayData.diff : heroDisplayData.remaining) * fxRate).toLocaleString()})
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
                  <button
                    onClick={() => {
                      setOcrSuccessToast(null);
                      setShowScanModal(true);
                    }}
                    disabled={!canAddExpense}
                    className="py-3 px-3 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Camera className="h-4 w-4 shrink-0" />
                    <span className="truncate">บันทึกรายจ่าย AI OCR</span>
                  </button>

                  <button
                    onClick={() => setShowSettlementModal(true)}
                    className="py-3 px-3 rounded-2xl bg-white dark:bg-[#1e2235] border border-pink-200/80 dark:border-slate-700 hover:border-pink-400 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm shadow-sm hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer"
                  >
                    <Calculator className="h-4 w-4 text-pink-500 shrink-0" />
                    <span className="truncate">เคลียร์บิลหารเงิน</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Horizontal Filter Row */}
            <div className="p-3.5 rounded-3xl border border-pink-100/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#151826]/95 card-elevation space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-black text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-pink-500" />
                  <span>กรองดูรายจ่ายตามผู้จ่าย:</span>
                </div>
                <div className="text-xs font-bold text-pink-600 dark:text-pink-400">
                  ยอดรวมที่เลือก: {filteredExpenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0).toLocaleString()} {trip?.currency || 'JPY'}
                </div>
              </div>

              {/* Swipeable Payer Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                <button
                  type="button"
                  onClick={() => setExpensePayerFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    expensePayerFilter === 'all'
                      ? 'bg-gradient-to-r from-pink-400 via-rose-400 to-purple-400 text-white shadow-xs scale-105'
                      : 'bg-slate-100 dark:bg-[#1e2235] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60'
                  }`}
                >
                  👥 ทุกคน ({expenses.length})
                </button>

                <button
                  type="button"
                  onClick={() => setExpensePayerFilter('me')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                    expensePayerFilter === 'me'
                      ? 'bg-gradient-to-r from-pink-400 via-rose-400 to-purple-400 text-white shadow-xs scale-105'
                      : 'bg-slate-100 dark:bg-[#1e2235] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60'
                  }`}
                >
                  <span>{userCat.emoji}</span>
                  <span>ของฉัน ({userDisplayName})</span>
                </button>

                {otherPayers.map((p) => {
                  const pCat = getCatAvatar(p.avatar);
                  const isSelected = expensePayerFilter.toLowerCase() === p.key.toLowerCase() || expensePayerFilter.toLowerCase() === p.name.toLowerCase();

                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setExpensePayerFilter(p.key)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-gradient-to-r from-pink-400 via-rose-400 to-purple-400 text-white shadow-xs scale-105'
                          : 'bg-slate-100 dark:bg-[#1e2235] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60'
                      }`}
                    >
                      <span>{pCat.emoji}</span>
                      <span>{p.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Search & Category Filter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหารายการ, ร้านค้า..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-pink-100 dark:border-slate-700 bg-white/80 dark:bg-[#1e2235] text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-medium"
                    value={expenseSearchQuery}
                    onChange={(e) => setExpenseSearchQuery(e.target.value)}
                  />
                </div>

                <select
                  value={expenseCategoryFilter}
                  onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-pink-100 dark:border-slate-700 bg-white/80 dark:bg-[#1e2235] text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-bold cursor-pointer"
                >
                  <option value="all">ทุกหมวดหมู่ ({categories.length})</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* List of Expenses */}
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-pink-200 dark:border-slate-800 rounded-3xl p-6 bg-white/60 dark:bg-[#151826]/60">
                <Receipt className="h-10 w-10 text-pink-500 mx-auto mb-2 animate-float-slow" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">ยังไม่มีรายการค่าใช้จ่าย</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                  กดปุ่มถ่ายรูปใบเสร็จเพื่อใช้ AI สแกนและกรอกยอดให้อัตโนมัติ
                </p>
                {canAddExpense && (
                  <button
                    onClick={() => {
                      setOcrSuccessToast(null);
                      setShowScanModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <Camera className="h-4 w-4" /> บันทึกรายจ่ายแรก
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-pink-50 dark:divide-slate-800/80 rounded-3xl border border-pink-100/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#151826]/95 overflow-hidden card-elevation">
                {filteredExpenses.map((exp, idx) => (
                  <ExpenseCard
                    key={exp.id || idx}
                    expense={exp}
                    categories={categories}
                    currentUserId={currentUser?.id}
                    userDisplayName={userDisplayName}
                    fxRate={fxRate}
                    canAddExpense={canAddExpense}
                    onOpenReceiptPreview={handleOpenReceiptPreview}
                    onDeleteExpense={handleDeleteExpense}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 3: สถิติ & จัดการงบหมวดหมู่ (ANALYTICS) ==================== */}
        {activeTab === 'analytics' && (
          <div className="space-y-4 sm:space-y-6">
            
            {/* สรุปยอดจ่ายแยกตามรายคน */}
            <div className="p-4 sm:p-6 rounded-3xl border border-pink-100/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#151826]/95 card-elevation space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-pink-500" /> 
                  <span>สรุปยอดจ่ายแยกตามรายคน (Who Paid)</span>
                </h2>
                <button
                  onClick={() => setShowSettlementModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white text-xs font-bold shadow-sm shadow-pink-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Calculator className="h-3.5 w-3.5" /> ดูการโอนเงินเคลียร์บิล
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {distinctPayers.map((p) => {
                  const pCat = getCatAvatar(p.avatar);
                  const sharePercent = totalSpent > 0 ? (p.total / totalSpent) * 100 : 0;
                  
                  const targetMemberObj = members.find((m) => m.profiles?.display_name?.toLowerCase() === p.name.toLowerCase() || m.user_id === p.key);
                  const pKey = p.isMe ? 'me' : (targetMemberObj?.user_id || targetMemberObj?.id || p.key);
                  const pBudget = memberBudgets[pKey] || 0;
                  const pRemaining = pBudget > p.total ? pBudget - p.total : 0;
                  const pOver = pBudget > 0 && p.total > pBudget ? p.total - pBudget : 0;

                  return (
                    <div key={p.key} className="p-3.5 rounded-2xl bg-rose-50/40 dark:bg-[#1e2235] border border-pink-100/70 dark:border-slate-700/80 space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{pCat.emoji}</span>
                          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">{p.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                            {p.total.toLocaleString()} {trip?.currency || 'JPY'}
                          </span>
                          <span className="text-[10px] text-pink-600 dark:text-pink-400 block font-bold">
                            ({sharePercent.toFixed(1)}% ของทริป)
                          </span>
                        </div>
                      </div>

                      {pBudget > 0 && (
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex justify-between border-t border-pink-100/60 dark:border-slate-700/60 pt-1.5">
                          <span>งบตั้งไว้: {pBudget.toLocaleString()} {trip?.currency}</span>
                          {pOver > 0 ? (
                            <span className="text-rose-600 font-bold">เกินงบ +{pOver.toLocaleString()}</span>
                          ) : (
                            <span className="text-emerald-600 font-bold">เหลือ {pRemaining.toLocaleString()}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* หมวดหมู่ค่าใช้จ่าย */}
            <div className="p-4 sm:p-6 rounded-3xl border border-pink-100/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#151826]/95 card-elevation space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <PieChart className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                  <span>สัดส่วนค่าใช้จ่ายตามหมวดหมู่</span>
                </h2>
                <button
                  onClick={() => setShowBudgetCategoryModal(true)}
                  className="text-xs font-bold text-pink-600 hover:underline cursor-pointer"
                >
                  แก้ไขงบหมวดหมู่
                </button>
              </div>

              <div className="space-y-3">
                {categories.map((cat) => {
                  const spentInCat = expenses
                    .filter((e) => e.category === cat.id)
                    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
                  const catTarget = categoryBudgets[cat.id] || 0;
                  const catPercent = totalSpent > 0 ? (spentInCat / totalSpent) * 100 : 0;

                  return (
                    <div key={cat.id} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-300">
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </span>
                        <div className="text-right">
                          <span className="text-slate-900 dark:text-white">{spentInCat.toLocaleString()} {trip?.currency}</span>
                          <span className="text-[10px] text-slate-400 ml-1">({catPercent.toFixed(0)}%)</span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-pink-400 via-rose-400 to-purple-500 rounded-full"
                          style={{ width: `${Math.min(catPercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 4: สมาชิก & สิทธิ์ (MEMBERS) ==================== */}
        {activeTab === 'members' && (
          <div className="space-y-4">
            <div className="p-4 sm:p-6 rounded-3xl border border-pink-100/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#151826]/95 card-elevation space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-pink-500" />
                    <span>สมาชิกในทริปนี้ ({members.length})</span>
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    {isOwner ? '👑 คุณเป็นเจ้าของทริป สามารถกำหนดสิทธิ์ให้เพื่อนแก้ไขหรือดูได้อย่างเดียว' : 'รายชื่อเพื่อนร่วมทริป'}
                  </p>
                </div>

                <button
                  onClick={() => setShowShareModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white text-xs font-bold shadow-md shadow-pink-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Share2 className="h-3.5 w-3.5" /> ชวนเพื่อนเข้าทริป
                </button>
              </div>

              <div className="divide-y divide-pink-50 dark:divide-slate-800/80">
                {members.map((m) => {
                  const mName = m.profiles?.display_name || m.profiles?.email?.split('@')[0] || 'สมาชิก';
                  const mCat = getCatAvatar(m.profiles?.avatar_id);
                  const isCurrent = m.user_id === currentUser?.id;
                  const isTripOwner = m.role === 'owner' || m.user_id === trip?.created_by;

                  return (
                    <div key={m.id} className="py-3 flex justify-between items-center gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${mCat.bgGradient} flex items-center justify-center text-base shadow-2xs`}>
                          {mCat.emoji}
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{mName}</span>
                            {isCurrent && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300">
                                ฉัน
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {isTripOwner ? '👑 เจ้าของทริป' : m.role === 'editor' ? '✏️ สิทธิ์แก้ไขแผนและรายจ่าย' : '👁️ สิทธิ์เปิดดูอย่างเดียว'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isOwner && !isTripOwner ? (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={m.role}
                              onChange={(e) => handleUpdateMemberRole(m.id, e.target.value as any)}
                              className="px-2.5 py-1 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#1e2235] text-slate-900 dark:text-white outline-none cursor-pointer"
                            >
                              <option value="editor">✏️ ผู้แก้ไข (Editor)</option>
                              <option value="viewer">👁️ ผู้เข้าชม (Viewer)</option>
                            </select>
                            <button
                              onClick={() => handleRemoveMember(m.id, mName)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="ลบสมาชิก"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-pink-600 dark:text-pink-400">
                            {isTripOwner ? 'Owner' : m.role === 'editor' ? 'Editor' : 'Viewer'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ==================== FLOATING QUICK CURRENCY CALCULATOR FAB ==================== */}
      <button
        type="button"
        onClick={() => setShowCurrencyCalculator(true)}
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-full bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-black text-xs sm:text-sm shadow-xl shadow-pink-500/30 hover:shadow-pink-500/50 hover:scale-110 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer glow-pink-purple"
        title="เครื่องคิดเลขแปลงเงินเยน-บาทด่วน"
      >
        <Coins className="h-4 w-4 sm:h-5 sm:w-5 animate-pulse" />
        <span className="text-xs sm:text-sm font-black">¥ ⇄ ฿</span>
      </button>

      {/* ==================== STICKY FLOATING BOTTOM APP BAR (IPHONE / IPAD NATIVE STYLE) ==================== */}
      <div className="fixed bottom-0 inset-x-0 z-40 sm:hidden px-3 pt-2 safe-bottom-nav bg-white/95 dark:bg-[#121524]/95 backdrop-blur-2xl border-t border-pink-100/80 dark:border-slate-800/80 shadow-2xl">
        <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => handleSwitchTab('plan')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'plan'
                ? 'bg-gradient-to-tr from-pink-400/20 via-rose-400/20 to-purple-400/20 text-pink-600 dark:text-pink-400 font-black scale-105'
                : 'text-slate-500 dark:text-slate-400 font-semibold active:scale-95'
            }`}
          >
            <MapPin className="h-4 w-4 mb-0.5" />
            <span className="text-[10px]">แผนเที่ยว ({itinerary.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchTab('expenses')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'expenses'
                ? 'bg-gradient-to-tr from-pink-400/20 via-rose-400/20 to-purple-400/20 text-pink-600 dark:text-pink-400 font-black scale-105'
                : 'text-slate-500 dark:text-slate-400 font-semibold active:scale-95'
            }`}
          >
            <DollarSign className="h-4 w-4 mb-0.5" />
            <span className="text-[10px]">รายจ่าย ({expenses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchTab('analytics')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-tr from-pink-400/20 via-rose-400/20 to-purple-400/20 text-pink-600 dark:text-pink-400 font-black scale-105'
                : 'text-slate-500 dark:text-slate-400 font-semibold active:scale-95'
            }`}
          >
            <PieChart className="h-4 w-4 mb-0.5" />
            <span className="text-[10px]">สถิติ & งบ</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchTab('members')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'members'
                ? 'bg-gradient-to-tr from-pink-400/20 via-rose-400/20 to-purple-400/20 text-pink-600 dark:text-pink-400 font-black scale-105'
                : 'text-slate-500 dark:text-slate-400 font-semibold active:scale-95'
            }`}
          >
            <Users className="h-4 w-4 mb-0.5" />
            <span className="text-[10px]">สมาชิก ({members.length})</span>
          </button>
        </div>
      </div>

      {/* ==================== MODALS ==================== */}

      {/* 1. Quick Currency Calculator Modal */}
      <QuickCurrencyCalculator
        isOpen={showCurrencyCalculator}
        onClose={() => setShowCurrencyCalculator(false)}
        defaultCurrency={trip?.currency || 'JPY'}
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

      {/* 2. Packing Checklist Modal */}
      <PackingChecklistModal
        isOpen={showPackingModal}
        onClose={() => setShowPackingModal(false)}
        tripId={tripId}
      />

      {/* 3. Profile Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={currentUser}
        onProfileUpdated={(updated) => setUserProfile((prev: any) => ({ ...prev, ...updated }))}
      />

      {/* Travel Command Center Hub Modal (5-in-1) */}
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
      />

      {/* 4. Settlement Modal */}
      <SettlementModal
        isOpen={showSettlementModal}
        onClose={() => setShowSettlementModal(false)}
        expenses={expenses}
        members={members}
        currentUser={currentUser}
        userDisplayName={userDisplayName}
        currency={trip?.currency || 'JPY'}
      />

      {/* 5. AI Assistant Modal */}
      <AIAssistantModal
        isOpen={showAIAssistantModal}
        onClose={() => setShowAIAssistantModal(false)}
        currentCity={itinerary[0]?.city || 'Osaka'}
      />

      {/* 6. Budget & Category Manager Modal */}
      <BudgetCategoryModal
        isOpen={showBudgetCategoryModal}
        onClose={() => setShowBudgetCategoryModal(false)}
        trip={trip}
        expenses={expenses}
        members={members}
        currentUser={currentUser}
        userDisplayName={userDisplayName}
        fxRate={fxRate}
        onUpdated={fetchTripData}
        onOpenRollback={() => setShowRollbackModal(true)}
      />

      {/* 7. Printable PDF Itinerary Modal */}
      <PrintableItineraryModal
        isOpen={showPrintableModal}
        onClose={() => setShowPrintableModal(false)}
        trip={trip}
        itinerary={itinerary}
        expenses={expenses}
        categories={categories}
      />

      {/* 8. Photo Scrapbook Modal */}
      <PhotoScrapbookModal
        isOpen={showScrapbookModal}
        onClose={() => {
          setShowScrapbookModal(false);
          setPhotosCount(getTripPhotos(tripId).length);
        }}
        tripId={tripId}
        tripName={trip?.name || trip?.title}
      />

      {/* 9. Version Rollback Modal */}
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

      {/* 10. Scan / Add Expense Modal */}
      {showScanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#151826] shadow-2xl border border-pink-100 dark:border-slate-800 glow-pink-purple max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="p-6 pb-3 flex justify-between items-center border-b border-pink-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${userCat.bgGradient} flex items-center justify-center text-sm`}>
                  {userCat.emoji}
                </div>
                <div>
                  <h2 className="text-base font-black bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 dark:from-pink-400 dark:via-rose-400 dark:to-purple-300 bg-clip-text text-transparent">
                    บันทึกค่าใช้จ่าย 🧾
                  </h2>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    บันทึกในนาม: <b className="text-pink-600 dark:text-pink-400">{userDisplayName}</b>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowScanModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 pt-4 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              <div>
                <label className="relative overflow-hidden flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-pink-300 dark:border-slate-700 rounded-2xl cursor-pointer bg-pink-50/40 dark:bg-[#1e2235] hover:opacity-90 transition-opacity">
                  {scanning && <div className="animate-scan-laser z-20" />}

                  {scanning ? (
                    <div className="flex flex-col items-center gap-1.5 text-pink-600 dark:text-pink-400 z-10">
                      <Loader2 className="h-7 w-7 animate-spin text-purple-600 dark:text-purple-400" />
                      <span className="text-xs font-black tracking-wide">⚡ AI กำลังวิเคราะห์ใบเสร็จ...</span>
                    </div>
                  ) : scannedData.receipt_url ? (
                    <div className="flex items-center gap-3 p-2 text-xs font-bold text-pink-600 dark:text-pink-400">
                      <CheckCircle2 className="h-5 w-5" />
                      <span>แนบรูปใบเสร็จแล้ว (บันทึกลงโทรศัพท์อัตโนมัติ)</span>
                    </div>
                  ) : (
                    <>
                      <Camera className="h-8 w-8 text-pink-500 mb-1 animate-float-slow" />
                      <span className="text-xs font-black text-pink-600 dark:text-pink-400">
                        ถ่ายรูปใบเสร็จ หรือเลือกจากโทรศัพท์
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">AI สกัดยอดเงินและร้านค้าให้อัตโนมัติ</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" disabled={scanning} onChange={handleReceiptImage} />
                </label>
              </div>

              {ocrSuccessToast && (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/80 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span className="line-clamp-2">{ocrSuccessToast}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">ชื่อรายการ / ร้านค้า *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ข้าวหน้าเนื้อ, ตั๋วรถไฟ Shinkansen"
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-[#1e2235] text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-bold"
                    value={scannedData.title}
                    onChange={(e) => setScannedData({ ...scannedData, title: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">จำนวนเงิน *</label>
                    <input
                      type="number"
                      required
                      placeholder="0.00"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-[#1e2235] text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-black"
                      value={scannedData.amount}
                      onChange={(e) => setScannedData({ ...scannedData, amount: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">สกุลเงิน</label>
                    <select
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-[#1e2235] text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-bold"
                      value={scannedData.currency}
                      onChange={(e) => setScannedData({ ...scannedData, currency: e.target.value })}
                    >
                      <option value="JPY">JPY (¥)</option>
                      <option value="THB">THB (฿)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="KRW">KRW (₩)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="SGD">SGD (S$)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">หมวดหมู่</label>
                    <select
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-[#1e2235] text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-bold"
                      value={scannedData.category}
                      onChange={(e) => setScannedData({ ...scannedData, category: e.target.value })}
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">วันที่ใช้จ่าย</label>
                    <input
                      type="date"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-[#1e2235] text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-bold"
                      value={scannedData.spent_at}
                      onChange={(e) => setScannedData({ ...scannedData, spent_at: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 pt-3 border-t border-pink-100 dark:border-slate-800/80 flex gap-2">
              <button
                type="button"
                onClick={() => setShowScanModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveExpense}
                disabled={scanning || savingExpense}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold shadow-lg shadow-pink-500/25 transition-all disabled:opacity-50 cursor-pointer hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-1.5"
              >
                {savingExpense ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> กำลังบันทึก...
                  </>
                ) : (
                  'บันทึกรายการ'
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 11. Activity Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#151826] shadow-2xl border border-pink-100 dark:border-slate-800 glow-purple max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="p-6 pb-3 flex justify-between items-center border-b border-pink-100 dark:border-slate-800/80">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-slate-100">
                  {editingActivity ? 'แก้ไขกิจกรรม ✏️' : 'เพิ่มกิจกรรมในแผนเที่ยว 🗺️'}
                </h2>
              </div>
              <button
                onClick={() => setShowActivityModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form id="activity-form" onSubmit={handleSaveActivity} className="p-6 pt-4 overflow-y-auto custom-scrollbar flex-1 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">วัน / Day (เช่น 04-Dec)</label>
                  <input
                    type="text"
                    required
                    placeholder="Day 1 (04-Dec)"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-[#1e2235] text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-medium"
                    value={activityForm.date_label}
                    onChange={(e) => setActivityForm({ ...activityForm, date_label: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">เวลา (เช่น 09:00 - 12:00)</label>
                  <input
                    type="text"
                    placeholder="09:00 - 12:00"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-[#1e2235] text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-medium"
                    value={activityForm.time_slot}
                    onChange={(e) => setActivityForm({ ...activityForm, time_slot: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">เมือง / ย่าน</label>
                  <input
                    type="text"
                    placeholder="Osaka / Namba"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-[#1e2235] text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-medium"
                    value={activityForm.city}
                    onChange={(e) => setActivityForm({ ...activityForm, city: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">สถานที่หลัก *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น Universal Studios Japan"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-[#1e2235] text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-bold"
                    value={activityForm.main_place}
                    onChange={(e) => setActivityForm({ ...activityForm, main_place: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">ลิงก์ Google Maps ของสถานที่หลัก</label>
                {activityForm.main_place_links.map((link, lIdx) => (
                  <div key={lIdx} className="flex gap-2 mb-2">
                    <input
                      type="url"
                      placeholder="https://maps.app.goo.gl/..."
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-[#1e2235] text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-medium"
                      value={link}
                      onChange={(e) => {
                        const updated = [...activityForm.main_place_links];
                        updated[lIdx] = e.target.value;
                        setActivityForm({ ...activityForm, main_place_links: updated });
                      }}
                    />
                    {activityForm.main_place_links.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = activityForm.main_place_links.filter((_, i) => i !== lIdx);
                          setActivityForm({ ...activityForm, main_place_links: updated });
                        }}
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-slate-800 cursor-pointer"
                        title="ลบลิงก์"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">การเดินทาง (Transport Info)</label>
                <input
                  type="text"
                  placeholder="เช่น นั่งสาย Midosuji Line ลงสถานี Namba ทางออก 14"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-[#1e2235] text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-medium"
                  value={activityForm.transport_info}
                  onChange={(e) => setActivityForm({ ...activityForm, transport_info: e.target.value })}
                />
              </div>

            </form>

            <div className="p-6 pt-3 border-t border-pink-100 dark:border-slate-800/80 flex gap-2">
              <button
                type="button"
                onClick={() => setShowActivityModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                form="activity-form"
                disabled={savingActivity}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white text-xs font-bold shadow-md shadow-pink-500/25 hover:opacity-95 disabled:opacity-50 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all"
              >
                {savingActivity ? 'กำลังบันทึก...' : 'บันทึกกิจกรรม'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 12. Preview Receipt Image */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-lg w-full bg-white dark:bg-[#151826] p-4 sm:p-5 rounded-3xl border border-pink-100 dark:border-slate-800 shadow-2xl space-y-3 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-2 border-b border-pink-100 dark:border-slate-800/80">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-pink-500" /> 
                <span>รูปภาพใบเสร็จ (บันทึกในโทรศัพท์)</span>
              </h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-pink-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-slate-950/20 flex items-center justify-center max-h-[68vh]">
              <img src={previewImage} alt="Receipt Preview" className="max-h-[65vh] w-auto object-contain rounded-xl shadow-md" />
            </div>

            <div className="pt-2 flex gap-2">
              <a
                href={previewImage}
                download="travel_receipt.jpg"
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-pink-500/20 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer"
              >
                <HardDriveDownload className="h-4 w-4" />
                <span>ดาวน์โหลด / บันทึกลงโทรศัพท์</span>
              </a>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 13. Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#151826] p-6 shadow-2xl border border-pink-100 dark:border-slate-800 glow-pink-purple animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-pink-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-pink-500/25">
                  <Share2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">แชร์ทริปนี้ให้เพื่อน ✈️</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    ส่งให้เพื่อนเพื่อร่วมวางแผนเที่ยวและบันทึกค่าใช้จ่าย
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-pink-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl border border-pink-100 dark:border-slate-800 bg-pink-50/40 dark:bg-[#1e2235] space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    🔗 ลิงก์ตรงเข้าหน้าทริป (Direct Link)
                  </label>
                  <span className="text-[10px] font-bold text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-950 px-2 py-0.5 rounded-full">
                    แนะนำ
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  สำหรับเพื่อนที่มีบัญชีแล้ว หรือต้องการเปิดดูรายละเอียดทริปทันที
                </p>
                <button
                  onClick={copyInviteLink}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs shadow-md shadow-pink-500/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedLink ? 'คัดลอกลิงก์เรียบร้อยแล้ว!' : 'คัดลอกลิงก์ตรง (Direct Link)'}</span>
                </button>
              </div>

              <div className="p-3.5 rounded-2xl border border-pink-100 dark:border-slate-800 bg-pink-50/40 dark:bg-[#1e2235] space-y-2">
                <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  👥 ลิงก์เชิญเพื่อนใหม่ (สมัครเสร็จแล้วเข้าทริปทันที)
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  เพื่อนที่ยังไม่มีบัญชี กดลิงก์นี้เพื่อสมัครสมาชิกแล้วระบบจะดึงเข้ากลุ่มทริปนี้ให้อัตโนมัติ
                </p>
                <button
                  onClick={copyAuthInviteLink}
                  className="w-full py-2.5 rounded-xl border border-pink-200 dark:border-slate-700 bg-white dark:bg-[#1e2235] hover:border-pink-400 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  {copiedAuthLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-pink-500" />}
                  <span>{copiedAuthLink ? 'คัดลอกลิงก์เชิญเรียบร้อยแล้ว!' : 'คัดลอกลิงก์เชิญสมาชิกใหม่'}</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">รหัสเชิญประจำทริป (Trip ID)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1e2235] text-xs font-mono text-slate-900 dark:text-white select-all font-bold"
                    value={tripId}
                  />
                  <button
                    onClick={copyTripCode}
                    className="px-4 py-2.5 bg-pink-50 hover:bg-pink-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-pink-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer active:scale-95"
                  >
                    {copiedCode ? 'คัดลอกแล้ว' : 'คัดลอก'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
