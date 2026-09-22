// src/app/trips/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo, useDeferredValue } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { parseTripExcel } from '@/lib/excelParser';
import { useTheme } from '@/components/ThemeProvider';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import NotificationBell from '@/components/NotificationBell';
import { TripPlanTab } from '@/components/trip-tabs/TripPlanTab';
import { TripExpensesTab } from '@/components/trip-tabs/TripExpensesTab';
import { TripAnalyticsTab } from '@/components/trip-tabs/TripAnalyticsTab';
import { TripMembersTab } from '@/components/trip-tabs/TripMembersTab';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/PullToRefreshIndicator';
import { getCatAvatar } from '@/lib/avatars';
import { getCustomJpyToThbRate, formatCurrencyWithThb, convertCurrency, convertToThb } from '@/lib/currency';
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
import ItemizedReceiptSplitter, { ItemizedDish } from '@/components/ItemizedReceiptSplitter';

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
  const [ocrErrorToast, setOcrErrorToast] = useState<string | null>(null);
  const [showAiKeyModal, setShowAiKeyModal] = useState(false);
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState('');
  const [hasSavedGeminiKey, setHasSavedGeminiKey] = useState(false);
  const [splitAsSeparateExpenses, setSplitAsSeparateExpenses] = useState(false);

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
    category: 'shopping',
    currency: 'THB',
    receipt_url: '',
    spent_at: new Date().toISOString().split('T')[0],
    payer_id: 'me',
    items: [] as ItemizedDish[],
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

  // ตรวจสอบ Gemini API Key จาก Browser LocalStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('travel_tracker_gemini_api_key');
      if (savedKey) {
        setHasSavedGeminiKey(true);
        setGeminiApiKeyInput(savedKey);
      }
    }
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
        setSplitAsSeparateExpenses(true);
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
      alert('กรุณาระบุจำนวนเงิน หรือเพิ่มรายการสินค้า');
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
        const localReceiptKey = `receipt_${tripId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        try {
          await saveLocalReceiptPhoto(localReceiptKey, scannedData.receipt_url);
          receiptStorageRef = localReceiptKey;
        } catch {
          receiptStorageRef = 'local';
        }
      }

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
            };
          });

        if (rowsToInsert.length > 0) {
          const { error } = await supabase.from('expenses').insert(rowsToInsert);
          if (error) throw error;
        }
      } else {
        // บันทึกเป็นบิลรวม 1 รายการ
        const { error } = await supabase.from('expenses').insert([
          {
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
          },
        ]);
        if (error) throw error;
      }

      triggerConfetti();
      setShowScanModal(false);
      setOcrSuccessToast(null);
      setSplitAsSeparateExpenses(false);
      setScannedData({
        title: '',
        amount: '',
        category: 'shopping',
        currency: trip?.currency || 'THB',
        receipt_url: '',
        spent_at: new Date().toISOString().split('T')[0],
        payer_id: 'me',
        items: [] as ItemizedDish[],
      });
      fetchTripData();
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการบันทึกค่าใช้จ่าย: ' + (err?.message || err));
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

  // ส่งออกเฉพาะค่าใช้จ่ายเป็น Excel อย่างละเอียดพร้อมแปลง THB
  const exportExpensesToExcel = () => {
    const wb = XLSX.utils.book_new();

    const expenseRows = expenses.map((e, idx) => {
      const catMeta = getCategoryMeta(categories, e.category);
      const thbAmount = Math.round(convertToThb(Number(e.amount || 0), e.currency || tripBaseCurrency, fxRate));
      return {
        'ลำดับ': idx + 1,
        'วันที่': e.spent_at || '-',
        'รายการ / ร้านค้า': e.title || '-',
        'ผู้จ่าย': e.payer_name || '-',
        'หมวดหมู่': catMeta.label,
        'จำนวนเงิน': Number(e.amount || 0),
        'สกุลเงิน': e.currency || tripBaseCurrency,
        'เทียบเท่าเงินบาท (THB)': thbAmount,
        'มีรูปใบเสร็จ': e.receipt_url ? 'มี' : 'ไม่มี',
      };
    });

    const expSheet = XLSX.utils.json_to_sheet(expenseRows);
    expSheet['!cols'] = [
      { wch: 6 },
      { wch: 12 },
      { wch: 28 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 10 },
      { wch: 20 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, expSheet, 'Expenses_Summary');

    const tripTitle = (trip?.name || trip?.title || 'trip').replace(/[/\\?%*:|"<>]/g, '-');
    XLSX.writeFile(wb, `${tripTitle}_Expenses_${new Date().toISOString().split('T')[0]}.xlsx`);
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

  // คำนวณยอดเงินรวม (แปลงทุกค่าใช้จ่ายเป็นสกุลเงินหลักของทริป)
  const tripBaseCurrency = trip?.currency || 'THB';

  const totalSpent = useMemo(() => {
    return expenses.reduce((acc, curr) => {
      const amt = Number(curr.amount || 0);
      const converted = convertCurrency(amt, curr.currency || tripBaseCurrency, tripBaseCurrency, fxRate);
      return acc + converted;
    }, 0);
  }, [expenses, tripBaseCurrency, fxRate]);

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
        .reduce((acc, curr) => {
          const amt = Number(curr.amount || 0);
          return acc + convertCurrency(amt, curr.currency || tripBaseCurrency, tripBaseCurrency, fxRate);
        }, 0);

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
        .reduce((acc, curr) => {
          const amt = Number(curr.amount || 0);
          return acc + convertCurrency(amt, curr.currency || tripBaseCurrency, tripBaseCurrency, fxRate);
        }, 0);

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
  }, [heroBudgetView, totalSpent, targetBudget, expenses, currentUser, userDisplayName, memberBudgets, members, tripBaseCurrency, fxRate]);

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

  // สมาชิกทั้งหมดสำหรับใช้ใน Itemized Receipt Splitter
  const allMembersForSplit = useMemo(() => {
    const list: Array<{ id: string; name: string; avatar: string }> = [];
    const myName = userDisplayName || currentUser?.user_metadata?.display_name || currentUser?.email?.split('@')[0] || 'ฉัน';
    const myAvatar = userProfile?.avatar_id || currentUser?.user_metadata?.avatar_id || 'cat_pink';
    list.push({ id: currentUser?.id || 'me', name: `${myName} (ฉัน)`, avatar: myAvatar });

    otherPayers.forEach((p) => {
      list.push({ id: p.key || p.name, name: p.name, avatar: p.avatar || 'cat_purple' });
    });

    return list;
  }, [currentUser, userDisplayName, userProfile, otherPayers]);

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
        <Loader2 className="h-9 w-9 animate-spin text-rose-400" />
        <p className="text-xs font-bold text-slate-500 dark:text-purple-300">กำลังโหลดข้อมูลทริป...</p>
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
      <div className="absolute top-20 left-10 w-80 sm:w-96 h-80 sm:h-96 bg-rose-400/8 dark:bg-rose-400/10 rounded-full blur-3xl pointer-events-none animate-float-slow" />
      <div className="absolute top-80 right-10 w-80 sm:w-96 h-80 sm:h-96 bg-purple-500/8 dark:bg-purple-500/10 rounded-full blur-3xl pointer-events-none animate-float-reverse" />

      {/* ==================== TOP NAVIGATION & STICKY APP HEADER ==================== */}
      <nav className="sticky top-0 z-40 border-b border-rose-100/80 dark:border-[#323850]/80 bg-white/95 dark:bg-[#1b1f30]/95 backdrop-blur-2xl transition-colors safe-top-nav">
        <div className="max-w-5xl mx-auto px-3.5 sm:px-4 pb-2 sm:pb-2.5 space-y-2">
          
          {/* Row 1: Back & Title & Action Icons */}
          <div className="pt-1 sm:pt-1.5 flex items-center justify-between gap-2">
            
            {/* Left: Back & Title */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Link
                href="/"
                className="p-1.5 sm:p-2 rounded-2xl border border-rose-100/80 dark:border-[#323850]/80 bg-white/90 dark:bg-[#222638]/90 text-slate-700 dark:text-slate-200 hover:border-rose-300 dark:hover:border-slate-600 hover:text-rose-600 dark:hover:text-rose-300 hover:scale-105 active:scale-95 shadow-2xs transition-all shrink-0 cursor-pointer"
                title="กลับไปหน้าทริปทั้งหมด"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate max-w-[130px] xs:max-w-[180px] sm:max-w-xs md:max-w-md">
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
                className="flex items-center gap-1.5 p-1 sm:p-1.5 sm:pr-2.5 rounded-2xl border border-rose-100/80 dark:border-[#323850]/80 bg-white/90 dark:bg-[#222638]/90 hover:border-rose-300 dark:hover:border-slate-600 hover:scale-105 active:scale-95 shadow-2xs transition-all cursor-pointer group"
                title="ตั้งค่าโปรไฟล์"
              >
                <div className={`w-6 h-6 rounded-lg bg-gradient-to-tr ${userCat.bgGradient} flex items-center justify-center text-xs shadow-sm group-hover:scale-110 transition-transform overflow-hidden`}>
                  {userCat.emoji}
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 hidden sm:inline max-w-[80px] truncate">
                  {userDisplayName}
                </span>
              </button>

              <button
                onClick={() => setShowShareModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border border-rose-100/80 dark:border-[#323850]/80 bg-white/90 dark:bg-[#222638]/90 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-rose-300 dark:hover:border-slate-600 hover:text-rose-600 dark:hover:text-rose-300 hover:scale-105 active:scale-95 shadow-2xs transition-all shrink-0 cursor-pointer"
                title="แชร์ทริป / จัดการสิทธิ์"
              >
                <Share2 className="h-3.5 w-3.5 text-rose-500" />
                <span className="hidden sm:inline">แชร์</span>
              </button>


              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-1.5 sm:p-2 rounded-2xl border border-rose-100/80 dark:border-[#323850]/80 bg-white/90 dark:bg-[#222638]/90 text-slate-700 dark:text-slate-200 hover:border-rose-300 dark:hover:border-slate-600 hover:rotate-45 active:scale-95 shadow-2xs transition-all duration-300 cursor-pointer"
                title="สลับโหมด มืด/สว่าง"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-[#e06b88]" />}
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
                  className="p-1.5 sm:p-2 rounded-2xl border border-rose-100/80 dark:border-[#323850]/80 bg-white/90 dark:bg-[#222638]/90 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:border-rose-400 shadow-2xs transition-all cursor-pointer"
                  title="ออกจากระบบ (Sign Out)"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Row 2: The 4 Tabs */}
          <div className="grid grid-cols-4 gap-1 sm:gap-2 p-1 sm:p-1.5 bg-rose-50/70 dark:bg-[#222638]/90 border border-rose-100/80 dark:border-[#323850]/80 rounded-2xl sm:rounded-3xl shadow-xs">
            <button
              type="button"
              onClick={() => handleSwitchTab('plan')}
              className={`relative py-1.5 sm:py-2 px-1 sm:px-3 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
                activeTab === 'plan' 
                  ? 'text-white' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {activeTab === 'plan' && (
                <motion.div
                  layoutId="activeTopTabPill"
                  className="absolute inset-0 bg-[#e06b88] rounded-xl sm:rounded-2xl shadow-sm shadow-[#e06b88]/30"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center justify-center gap-1 sm:gap-1.5 truncate">
                <span>🗺️</span>
                <span className="truncate">แผนเที่ยว</span>
                <span className="text-[10px] opacity-85 hidden md:inline">({itinerary.length})</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('expenses')}
              className={`relative py-1.5 sm:py-2 px-1 sm:px-3 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
                activeTab === 'expenses' 
                  ? 'text-white' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {activeTab === 'expenses' && (
                <motion.div
                  layoutId="activeTopTabPill"
                  className="absolute inset-0 bg-[#e06b88] rounded-xl sm:rounded-2xl shadow-sm shadow-[#e06b88]/30"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center justify-center gap-1 sm:gap-1.5 truncate">
                <span>💰</span>
                <span className="truncate">รายจ่าย</span>
                <span className="text-[10px] opacity-85 hidden md:inline">({expenses.length})</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('analytics')}
              className={`relative py-1.5 sm:py-2 px-1 sm:px-3 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
                activeTab === 'analytics' 
                  ? 'text-white' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {activeTab === 'analytics' && (
                <motion.div
                  layoutId="activeTopTabPill"
                  className="absolute inset-0 bg-[#e06b88] rounded-xl sm:rounded-2xl shadow-sm shadow-[#e06b88]/30"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center justify-center gap-1 sm:gap-1.5 truncate">
                <span>📊</span>
                <span className="truncate">สถิติ & งบ</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('members')}
              className={`relative py-1.5 sm:py-2 px-1 sm:px-3 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
                activeTab === 'members' 
                  ? 'text-white' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {activeTab === 'members' && (
                <motion.div
                  layoutId="activeTopTabPill"
                  className="absolute inset-0 bg-[#e06b88] rounded-xl sm:rounded-2xl shadow-sm shadow-[#e06b88]/30"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center justify-center gap-1 sm:gap-1.5 truncate">
                <span>👥</span>
                <span className="truncate">สมาชิก</span>
                <span className="text-[10px] opacity-85 hidden md:inline">({members.length})</span>
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* ==================== MAIN CONTENT CONTAINER ==================== */}
      <main className="relative z-10 max-w-5xl mx-auto px-3.5 sm:px-4 pt-3 sm:pt-4 pb-28 space-y-3.5 sm:space-y-4">

        {/* Guest Preview & Join Invitation Banner */}
        {!currentUser && (
          <div className="p-3.5 sm:p-4 rounded-3xl bg-rose-50/80 dark:bg-[#222638] border border-rose-200/80 dark:border-[#323850] backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md animate-in fade-in">
            <div className="flex items-center gap-3 text-left">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#e06b88] flex items-center justify-center text-white text-base sm:text-lg shadow-sm shrink-0">
                👋
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
              className="w-full sm:w-auto text-center px-4 py-2 rounded-2xl bg-[#e06b88] hover:bg-[#d25875] text-white text-xs font-black shadow-md shadow-[#e06b88]/20 hover:scale-105 transition-all shrink-0 cursor-pointer"
            >
              เข้าสู่ระบบ / สมัครสมาชิก
            </Link>
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'plan' && (
            <motion.div
              key="plan"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <TripPlanTab
                trip={trip}
                tripBaseCurrency={tripBaseCurrency}
                fxRate={fxRate}
                heroDisplayData={heroDisplayData}
                itinerary={itinerary}
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
              />
            </motion.div>
          )}

          {activeTab === 'expenses' && (
            <motion.div
              key="expenses"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <TripExpensesTab
                trip={trip}
                tripBaseCurrency={tripBaseCurrency}
                fxRate={fxRate}
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
              />
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
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
              />
            </motion.div>
          )}

          {activeTab === 'members' && (
            <motion.div
              key="members"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <TripMembersTab
                members={members}
                isOwner={isOwner}
                currentUser={currentUser}
                trip={trip}
                setShowShareModal={setShowShareModal}
                handleUpdateMemberRole={handleUpdateMemberRole}
                handleRemoveMember={handleRemoveMember}
              />
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* ==================== FLOATING QUICK CURRENCY CALCULATOR FAB ==================== */}
      <button
        type="button"
        onClick={() => setShowCurrencyCalculator(true)}
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-full bg-[#e06b88] hover:bg-[#d25875] text-white font-black text-xs sm:text-sm shadow-xl shadow-[#e06b88]/30 hover:scale-110 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer glow-pink"
        title={`เครื่องคิดเลขแปลงเงินด่วน (${tripBaseCurrency} ⇄ THB)`}
      >
        <Coins className="h-4 w-4 sm:h-5 sm:w-5 animate-pulse" />
        <span className="text-xs sm:text-sm font-black">
          {tripBaseCurrency === 'CNY'
            ? '元 ⇄ ฿'
            : tripBaseCurrency === 'USD'
            ? '$ ⇄ ฿'
            : tripBaseCurrency === 'EUR'
            ? '€ ⇄ ฿'
            : tripBaseCurrency === 'THB'
            ? '฿ ⇄ ¥'
            : '¥ ⇄ ฿'}
        </span>
      </button>

      {/* ==================== STICKY FLOATING BOTTOM APP BAR (IPHONE / IPAD NATIVE STYLE) ==================== */}
      <div className="fixed bottom-0 inset-x-0 z-40 sm:hidden px-3 pt-2 safe-bottom-nav bg-white/95 dark:bg-[#1b1f30]/95 backdrop-blur-2xl border-t border-rose-100/80 dark:border-[#323850]/80 shadow-2xl">
        <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => handleSwitchTab('plan')}
            className={`relative flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'plan'
                ? 'text-[#e06b88] dark:text-[#f497aa] font-black'
                : 'text-slate-500 dark:text-slate-400 font-semibold active:scale-95'
            }`}
          >
            {activeTab === 'plan' && (
              <motion.div
                layoutId="activeBottomTabPill"
                className="absolute inset-0 bg-[#e06b88]/15 dark:bg-[#e06b88]/20 rounded-2xl"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <div className="relative z-10 flex flex-col items-center justify-center">
              <MapPin className="h-4 w-4 mb-0.5" />
              <span className="text-[10px]">แผนเที่ยว ({itinerary.length})</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchTab('expenses')}
            className={`relative flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'expenses'
                ? 'text-[#e06b88] dark:text-[#f497aa] font-black'
                : 'text-slate-500 dark:text-slate-400 font-semibold active:scale-95'
            }`}
          >
            {activeTab === 'expenses' && (
              <motion.div
                layoutId="activeBottomTabPill"
                className="absolute inset-0 bg-[#e06b88]/15 dark:bg-[#e06b88]/20 rounded-2xl"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <div className="relative z-10 flex flex-col items-center justify-center">
              <DollarSign className="h-4 w-4 mb-0.5" />
              <span className="text-[10px]">รายจ่าย ({expenses.length})</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchTab('analytics')}
            className={`relative flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'text-[#e06b88] dark:text-[#f497aa] font-black'
                : 'text-slate-500 dark:text-slate-400 font-semibold active:scale-95'
            }`}
          >
            {activeTab === 'analytics' && (
              <motion.div
                layoutId="activeBottomTabPill"
                className="absolute inset-0 bg-[#e06b88]/15 dark:bg-[#e06b88]/20 rounded-2xl"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <div className="relative z-10 flex flex-col items-center justify-center">
              <PieChart className="h-4 w-4 mb-0.5" />
              <span className="text-[10px]">สถิติ & งบ</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchTab('members')}
            className={`relative flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'members'
                ? 'text-[#e06b88] dark:text-[#f497aa] font-black'
                : 'text-slate-500 dark:text-slate-400 font-semibold active:scale-95'
            }`}
          >
            {activeTab === 'members' && (
              <motion.div
                layoutId="activeBottomTabPill"
                className="absolute inset-0 bg-[#e06b88]/15 dark:bg-[#e06b88]/20 rounded-2xl"
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

      {/* 1. Quick Currency Calculator Modal */}
      <QuickCurrencyCalculator
        isOpen={showCurrencyCalculator}
        onClose={() => setShowCurrencyCalculator(false)}
        defaultCurrency={tripBaseCurrency}
        fxRate={fxRate}
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
        currency={trip?.currency || 'THB'}
        fxRate={fxRate}
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

      {/* 10. Scan / Add Expense Modal with Itemized Split */}
      {/* 10. Scan / Add Expense Modal (Unified Single Clean Form) */}
      {showScanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#222638] shadow-2xl border border-rose-100 dark:border-[#323850] glow-pink-purple max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 pb-3 flex justify-between items-center border-b border-rose-100 dark:border-[#323850]/80">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${userCat.bgGradient} flex items-center justify-center text-sm shadow-xs`}>
                  {userCat.emoji}
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    บันทึกค่าใช้จ่าย 🧾
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    กรอกข้อมูลหรือสแกนใบเสร็จในหน้าเดียว
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowScanModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#2a2f45] cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 pt-3 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              
              {/* 1. Receipt Upload Area */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1 text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">⚡ สแกนตัวหนังสือตามภาพจริง (ไม่สุ่มมั่ว)</span>
                  <button
                    type="button"
                    onClick={() => setShowAiKeyModal(true)}
                    className="inline-flex items-center gap-1 font-bold text-[#e06b88] hover:text-[#d25875] dark:text-[#fbc2cf] cursor-pointer active:scale-95"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>{hasSavedGeminiKey ? 'Gemini Key (เชื่อมต่อแล้ว ✨)' : '🔑 ตั้งค่า AI Key'}</span>
                  </button>
                </div>

                <label className="relative overflow-hidden flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-rose-300 dark:border-[#323850] rounded-2xl cursor-pointer bg-rose-50/40 dark:bg-[#2a2f45] hover:opacity-90 transition-opacity">
                  {scanning && <div className="animate-scan-laser z-20" />}

                  {scanning ? (
                    <div className="flex flex-col items-center gap-1.5 text-rose-600 dark:text-[#fbc2cf] z-10">
                      <Loader2 className="h-6 w-6 animate-spin text-[#e06b88]" />
                      <span className="text-xs font-black tracking-wide">⚡ AI กำลังสแกนแยกรายการจากใบเสร็จ...</span>
                    </div>
                  ) : scannedData.receipt_url ? (
                    <div className="flex items-center gap-2.5 p-2 text-xs font-bold text-rose-600 dark:text-[#fbc2cf]">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                      <span className="truncate">แนบรูปใบเสร็จแล้ว (แตะเพื่อเปลี่ยนรูป)</span>
                    </div>
                  ) : (
                    <>
                      <Camera className="h-6 w-6 text-rose-400 mb-1 animate-float-slow" />
                      <span className="text-xs font-black text-rose-600 dark:text-[#fbc2cf]">
                        ถ่ายรูปใบเสร็จ หรือเลือกรูปจากโทรศัพท์
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                        AI ช่วยเติมชื่อร้าน ยอดเงิน และรายการสินค้าให้อัตโนมัติ ✨
                      </span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" disabled={scanning} onChange={handleReceiptImage} />
                </label>
              </div>

              {ocrErrorToast && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/80 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-start justify-between gap-2 animate-in fade-in">
                  <div className="flex items-start gap-2 min-w-0">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                    <span className="leading-snug">{ocrErrorToast}</span>
                  </div>
                  {!hasSavedGeminiKey && (
                    <button
                      type="button"
                      onClick={() => setShowAiKeyModal(true)}
                      className="px-2.5 py-1 rounded-lg bg-[#e06b88] hover:bg-[#d25875] text-white text-[10px] font-black shrink-0 cursor-pointer shadow-xs active:scale-95"
                    >
                      ใส่ API Key
                    </button>
                  )}
                </div>
              )}

              {ocrSuccessToast && (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/80 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span className="line-clamp-2">{ocrSuccessToast}</span>
                </div>
              )}

              {/* 2. Main Expense Fields Card */}
              <div className="space-y-3 p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-[#1c2032] border border-slate-200/80 dark:border-[#323850]">
                {/* Store / Merchant Name */}
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">
                    ชื่อรายการ / ร้านค้า *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น KFC พระโขนง, Shabu Buffet, ร้านขายยา Matsumoto"
                    className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-[#323850] bg-white dark:bg-[#2a2f45] text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:border-[#e06b88] font-bold"
                    value={scannedData.title}
                    onChange={(e) => setScannedData({ ...scannedData, title: e.target.value })}
                  />
                </div>

                {/* Amount & Currency */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>ยอดเงินรวม *</span>
                      {scannedData.items && scannedData.items.length > 0 && (
                        <span className="text-[10px] text-[#e06b88] dark:text-[#fbc2cf] font-bold">
                          (คำนวณจากรายการ)
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="0.00"
                      className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-[#323850] bg-white dark:bg-[#2a2f45] text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:border-[#e06b88] font-black"
                      value={scannedData.amount}
                      onChange={(e) => setScannedData({ ...scannedData, amount: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">สกุลเงิน</label>
                    <select
                      className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-[#323850] bg-white dark:bg-[#2a2f45] text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:border-[#e06b88] font-bold"
                      value={scannedData.currency}
                      onChange={(e) => setScannedData({ ...scannedData, currency: e.target.value })}
                    >
                      <option value="THB">THB (฿)</option>
                      <option value="JPY">JPY (¥)</option>
                      <option value="CNY">CNY (元)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="KRW">KRW (₩)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="SGD">SGD (S$)</option>
                    </select>
                  </div>
                </div>

                {/* Category & Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">หมวดหมู่</label>
                    <select
                      className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-[#323850] bg-white dark:bg-[#2a2f45] text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:border-[#e06b88] font-bold"
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
                      className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-[#323850] bg-white dark:bg-[#2a2f45] text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:border-[#e06b88] font-bold"
                      value={scannedData.spent_at}
                      onChange={(e) => setScannedData({ ...scannedData, spent_at: e.target.value })}
                    />
                  </div>
                </div>

                {/* Payer (ผู้สำรองจ่าย) */}
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">
                    💳 ใครเป็นคนสำรองจ่ายเงินไปก่อน?
                  </label>
                  <select
                    className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-[#323850] bg-white dark:bg-[#2a2f45] text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:border-[#e06b88] font-bold"
                    value={scannedData.payer_id || 'me'}
                    onChange={(e) => setScannedData({ ...scannedData, payer_id: e.target.value })}
                  >
                    {allMembersForSplit.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Itemized Split Section (แยกรายชิ้น / เลือกคนหาร) */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Utensils className="h-4 w-4 text-[#e06b88] dark:text-[#fbc2cf]" />
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                      แยกรายการสินค้า / สมาชิกที่ร่วมหาร
                    </h3>
                    {scannedData.items && scannedData.items.length > 0 && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#e06b88] text-white">
                        {scannedData.items.length} รายการ
                      </span>
                    )}
                  </div>

                  {(!scannedData.items || scannedData.items.length === 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        const defaultItem: ItemizedDish = {
                          id: `item_${Date.now()}`,
                          name: scannedData.title || 'รายการที่ 1',
                          amount: Number(scannedData.amount) || 0,
                          qty: 1,
                          assignedMemberIds: allMembersForSplit.map((m) => m.id),
                        };
                        setScannedData((prev: any) => ({
                          ...prev,
                          items: [defaultItem],
                        }));
                        setSplitAsSeparateExpenses(true);
                      }}
                      className="text-xs font-black text-[#e06b88] hover:text-[#d25875] dark:text-[#fbc2cf] flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>+ เพิ่มรายการแยกคนหาร</span>
                    </button>
                  )}
                </div>

                {/* If items exist */}
                {scannedData.items && scannedData.items.length > 0 ? (
                  <div className="space-y-3">
                    <ItemizedReceiptSplitter
                      items={scannedData.items}
                      onChangeItems={(newItems) => {
                        setScannedData((prev: any) => {
                          const newSum = newItems.reduce((sum, it) => sum + Number(it.amount || 0), 0);
                          return {
                            ...prev,
                            items: newItems,
                            amount: newSum > 0 ? String(newSum) : prev.amount,
                          };
                        });
                      }}
                      members={allMembersForSplit}
                      currency={scannedData.currency || 'THB'}
                      totalReceiptAmount={Number(scannedData.amount) || 0}
                      onUpdateTotalAmount={(newTotal) => setScannedData((prev: any) => ({ ...prev, amount: String(newTotal) }))}
                    />

                    {/* Separate Expenses Checkbox Toggle */}
                    <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-rose-50/70 dark:bg-[#1c2032] border border-rose-200/80 dark:border-[#323850] cursor-pointer hover:border-[#e06b88] transition-all shadow-2xs">
                      <input
                        type="checkbox"
                        checked={splitAsSeparateExpenses}
                        onChange={(e) => setSplitAsSeparateExpenses(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded text-[#e06b88] focus:ring-[#e06b88] accent-[#e06b88] cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-black text-slate-900 dark:text-white block">
                          แยกบันทึกเป็นรายการของแต่ละคนอัตโนมัติ 🪄
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-300 block font-medium mt-0.5">
                          ระบบจะสร้างรายการค่าใช้จ่ายแยกชื่อตามยอดที่แต่ละคนกิน/ใช้จริง เพื่อให้เห็นสถิติชัดเจนในกราฟ
                        </span>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl border border-dashed border-slate-200 dark:border-[#323850] bg-slate-50/50 dark:bg-[#1c2032]/40 text-center space-y-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      💡 บิลนี้จะบันทึกเป็นยอดรวมก้อนเดียว ({scannedData.amount || '0'} {scannedData.currency || 'THB'})
                    </p>
                    <p className="text-[11px] text-slate-400">
                      หรือกด <button type="button" onClick={() => {
                        const defaultItem: ItemizedDish = {
                          id: `item_${Date.now()}`,
                          name: scannedData.title || 'รายการที่ 1',
                          amount: Number(scannedData.amount) || 0,
                          qty: 1,
                          assignedMemberIds: allMembersForSplit.map((m) => m.id),
                        };
                        setScannedData((prev: any) => ({
                          ...prev,
                          items: [defaultItem],
                        }));
                        setSplitAsSeparateExpenses(true);
                      }} className="text-[#e06b88] font-bold underline cursor-pointer">+ เพิ่มรายการย่อย</button> เพื่อเลือกว่าเมนูไหนใครกินบ้าง
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Buttons */}
            <div className="p-4 sm:p-5 pt-3 border-t border-rose-100 dark:border-[#323850]/80 flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowScanModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-[#323850] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2a2f45] transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveExpense}
                disabled={scanning || savingExpense}
                className="flex-1 py-2.5 rounded-xl bg-[#e06b88] hover:bg-[#d25875] text-white text-xs font-bold shadow-md shadow-[#e06b88]/20 transition-all disabled:opacity-50 cursor-pointer hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-1.5"
              >
                {savingExpense ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> กำลังบันทึก...
                  </>
                ) : (
                  splitAsSeparateExpenses && scannedData.items?.length > 0 ? 'แยกบันทึกรายคน ✨' : 'บันทึกรายการ'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. Activity Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#222638] shadow-2xl border border-rose-100 dark:border-[#323850] glow-purple max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="p-6 pb-3 flex justify-between items-center border-b border-rose-100 dark:border-[#323850]/80">
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
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#323850] bg-slate-50/50 dark:bg-[#2a2f45] text-slate-900 dark:text-white text-xs outline-none focus:border-rose-400 font-medium"
                    value={activityForm.date_label}
                    onChange={(e) => setActivityForm({ ...activityForm, date_label: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">เวลา (เช่น 09:00 - 12:00)</label>
                  <input
                    type="text"
                    placeholder="09:00 - 12:00"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#323850] bg-slate-50/50 dark:bg-[#2a2f45] text-slate-900 dark:text-white text-xs outline-none focus:border-rose-400 font-medium"
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
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#323850] bg-slate-50/50 dark:bg-[#2a2f45] text-slate-900 dark:text-white text-xs outline-none focus:border-rose-400 font-medium"
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
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#323850] bg-slate-50/50 dark:bg-[#2a2f45] text-slate-900 dark:text-white text-xs outline-none focus:border-rose-400 font-bold"
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
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#323850] bg-slate-50/50 dark:bg-[#2a2f45] text-slate-900 dark:text-white text-xs outline-none focus:border-rose-400 font-medium"
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
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-[#2a2f45] cursor-pointer"
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
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#323850] bg-slate-50/50 dark:bg-[#2a2f45] text-slate-900 dark:text-white text-xs outline-none focus:border-rose-400 font-medium"
                  value={activityForm.transport_info}
                  onChange={(e) => setActivityForm({ ...activityForm, transport_info: e.target.value })}
                />
              </div>

            </form>

            <div className="p-6 pt-3 border-t border-rose-100 dark:border-[#323850]/80 flex gap-2">
              <button
                type="button"
                onClick={() => setShowActivityModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-[#323850] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2a2f45] cursor-pointer transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                form="activity-form"
                disabled={savingActivity}
                className="flex-1 py-2.5 rounded-xl bg-[#e06b88] hover:bg-[#d25875] text-white text-xs font-bold shadow-md shadow-[#e06b88]/20 hover:opacity-95 disabled:opacity-50 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-lg w-full bg-white dark:bg-[#222638] p-4 sm:p-5 rounded-3xl border border-rose-100 dark:border-[#323850] shadow-2xl space-y-3 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-2 border-b border-rose-100 dark:border-[#323850]/80">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-[#e06b88]" /> 
                <span>รูปภาพใบเสร็จ (บันทึกในโทรศัพท์)</span>
              </h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-rose-50 dark:hover:bg-[#2a2f45] transition-colors cursor-pointer"
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
                className="flex-1 py-2.5 rounded-xl bg-[#e06b88] hover:bg-[#d25875] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#e06b88]/20 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer"
              >
                <HardDriveDownload className="h-4 w-4" />
                <span>ดาวน์โหลด / บันทึกลงโทรศัพท์</span>
              </a>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#323850] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2a2f45] transition-colors cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 13. Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#222638] p-6 shadow-2xl border border-rose-100 dark:border-[#323850] glow-pink animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-rose-100 dark:border-[#323850]/80">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#e06b88] flex items-center justify-center text-white shadow-md shadow-[#e06b88]/20">
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
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-rose-50 dark:hover:bg-[#2a2f45] transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl border border-rose-100 dark:border-[#323850] bg-rose-50/40 dark:bg-[#2a2f45] space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    🔗 ลิงก์ตรงเข้าหน้าทริป (Direct Link)
                  </label>
                  <span className="text-[10px] font-bold text-[#e06b88] dark:text-[#f7a1b5] bg-rose-50 dark:bg-[#e06b88]/20 px-2 py-0.5 rounded-full border border-rose-200/80 dark:border-[#e06b88]/35">
                    แนะนำ
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  สำหรับเพื่อนที่มีบัญชีแล้ว หรือต้องการเปิดดูรายละเอียดทริปทันที
                </p>
                <button
                  onClick={copyInviteLink}
                  className="w-full py-2.5 rounded-xl bg-[#e06b88] hover:bg-[#d25875] text-white font-bold text-xs shadow-md shadow-[#e06b88]/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedLink ? 'คัดลอกลิงก์เรียบร้อยแล้ว!' : 'คัดลอกลิงก์ตรง (Direct Link)'}</span>
                </button>
              </div>

              <div className="p-3.5 rounded-2xl border border-rose-100 dark:border-[#323850] bg-rose-50/40 dark:bg-[#2a2f45] space-y-2">
                <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  👥 ลิงก์เชิญเพื่อนใหม่ (สมัครเสร็จแล้วเข้าทริปทันที)
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  เพื่อนที่ยังไม่มีบัญชี กดลิงก์นี้เพื่อสมัครสมาชิกแล้วระบบจะดึงเข้ากลุ่มทริปนี้ให้อัตโนมัติ
                </p>
                <button
                  onClick={copyAuthInviteLink}
                  className="w-full py-2.5 rounded-xl border border-rose-200 dark:border-[#323850] bg-white dark:bg-[#2a2f45] hover:border-rose-400 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  {copiedAuthLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-rose-400" />}
                  <span>{copiedAuthLink ? 'คัดลอกลิงก์เชิญเรียบร้อยแล้ว!' : 'คัดลอกลิงก์เชิญสมาชิกใหม่'}</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">รหัสเชิญประจำทริป (Trip ID)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#323850] bg-slate-50 dark:bg-[#2a2f45] text-xs font-mono text-slate-900 dark:text-white select-all font-bold"
                    value={tripId}
                  />
                  <button
                    onClick={copyTripCode}
                    className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-[#2a2f45] dark:hover:bg-[#323850] text-rose-700 dark:text-rose-200 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer active:scale-95"
                  >
                    {copiedCode ? 'คัดลอกแล้ว' : 'คัดลอก'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: ตั้งค่า Gemini API Key สำหรับ AI Vision สแกนใบเสร็จจริง */}
      {showAiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-[#1c2032] border border-rose-200 dark:border-[#323850] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-base">
                <div className="w-8 h-8 rounded-xl bg-[#e06b88] text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span>ตั้งค่า AI สแกนใบเสร็จ (Gemini)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAiKeyModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#2a2f45] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              เพื่อให้ระบบอ่านตัวหนังสือ ชื่อร้าน ราคาสินค้า (อุปกรณ์ไอที, เสื้อผ้า, ค่าเดินทาง, อาหาร) จากใบเสร็จจริงโดย<strong>ไม่สุ่มหรือสมมุติข้อมูล</strong> กรุณาระบุ Google Gemini API Key
            </p>

            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-2 text-xs font-bold text-amber-800 dark:text-amber-200 hover:opacity-95 transition-opacity"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">🎁</span>
                <span>รับ Gemini API Key ฟรีจาก Google AI Studio</span>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-amber-600" />
            </a>

            <div>
              <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">
                Google Gemini API Key
              </label>
              <input
                type="password"
                value={geminiApiKeyInput}
                onChange={(e) => setGeminiApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#323850] bg-slate-50 dark:bg-[#2a2f45] text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-[#e06b88]"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                คีย์จะถูกบันทึกไว้ใน Browser ของคุณอย่างปลอดภัย หรือใส่ GEMINI_API_KEY ใน .env.local ก็ได้
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              {hasSavedGeminiKey && (
                <button
                  type="button"
                  onClick={() => {
                    setGeminiApiKeyInput('');
                    handleSaveGeminiKey('');
                  }}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-[#323850] text-slate-500 hover:text-rose-600 text-xs font-bold transition-colors cursor-pointer"
                >
                  ล้างค่า
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSaveGeminiKey(geminiApiKeyInput)}
                className="flex-1 py-2.5 rounded-xl bg-[#e06b88] hover:bg-[#d25875] text-white text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95"
              >
                บันทึก API Key
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
