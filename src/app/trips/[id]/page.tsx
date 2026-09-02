// src/app/trips/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { parseTripExcel } from '@/lib/excelParser';
import { useTheme } from '@/components/ThemeProvider';
import ProfileModal from '@/components/ProfileModal';
import NotificationBell from '@/components/NotificationBell';
import WeatherWidget from '@/components/WeatherWidget';
import RouteVisualizer from '@/components/RouteVisualizer';
import SettlementModal from '@/components/SettlementModal';
import AIAssistantModal from '@/components/AIAssistantModal';
import BudgetCategoryModal from '@/components/BudgetCategoryModal';
import PrintableItineraryModal from '@/components/PrintableItineraryModal';
import PhotoScrapbookModal from '@/components/PhotoScrapbookModal';
import VersionRollbackModal from '@/components/VersionRollbackModal';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { getCatAvatar } from '@/lib/avatars';
import { getCustomJpyToThbRate, formatCurrencyWithThb } from '@/lib/currency';
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
import { 
  Camera, Upload, MapPin, Utensils, ShieldAlert, 
  Plus, Download, Moon, Sun, ExternalLink, ChevronDown, 
  ChevronUp, ArrowLeft, Trash2, Clock, Bus, Loader2, 
  Edit3, Share2, Users, PieChart, Sparkles, Search, 
  Copy, Check, Image as ImageIcon, X, AlertCircle, 
  CheckCircle2, DollarSign, Calendar, ArrowUp, ArrowDown,
  PlusCircle, User, Wallet, Filter, Calculator, Navigation, 
  Bot, Sliders, AlertTriangle, FileText, History, Wifi, WifiOff, 
  LogOut, ChevronRight, Eye, ShieldCheck, HardDriveDownload, Receipt
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
  const [heroBudgetView, setHeroBudgetView] = useState<'all' | 'me' | string>('all');
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);
  const [fxRate, setFxRate] = useState<number>(0.235);
  const [showWeatherSection, setShowWeatherSection] = useState(true);

  // Filter states
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>('all');
  const [expensePayerFilter, setExpensePayerFilter] = useState<string>('all');
  const [expenseSearchQuery, setExpenseSearchQuery] = useState<string>('');
  const [analyticsPayerFilter, setAnalyticsPayerFilter] = useState<string>('all');

  // Modals state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [showAIAssistantModal, setShowAIAssistantModal] = useState(false);
  const [showBudgetCategoryModal, setShowBudgetCategoryModal] = useState(false);
  const [showPrintableModal, setShowPrintableModal] = useState(false);
  const [showScrapbookModal, setShowScrapbookModal] = useState(false);
  const [showRollbackModal, setShowRollbackModal] = useState(false);

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

  // Form states for Activity with dynamic rows
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
    
    // 1. Load immediate local cache to display content instantaneously
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

      // Load Categories & Budgets & Photos
      const cats = getTripCategories(tripId);
      const cBudgets = getCategoryBudgets(tripId);
      const mBudgets = getMemberBudgets(tripId);
      const tripPhotos = getTripPhotos(tripId);
      setCategories(cats);
      setCategoryBudgets(cBudgets);
      setMemberBudgets(mBudgets);
      setPhotosCount(tripPhotos.length);

      // Check if Offline
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setLoading(false);
        return;
      }

      // 0. ดึง session และโปรไฟล์ปัจจุบันอย่างปลอดภัย
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

      // 1. ดึงข้อมูลทริป
      const { data: tripData } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .maybeSingle();

      if (tripData) {
        setTrip(tripData);
        setScannedData((prev: any) => ({ ...prev, currency: tripData.currency || 'JPY' }));
      }

      // 2. ดึงแผนการเดินทาง
      const { data: planData } = await supabase
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', tripId)
        .order('sort_order', { ascending: true });
      if (planData) setItinerary(planData);

      // 3. ดึงรายการค่าใช้จ่าย
      const { data: expData } = await supabase
        .from('expenses')
        .select('*')
        .eq('trip_id', tripId)
        .order('spent_at', { ascending: false });
      if (expData) setExpenses(expData);

      // 4. ดึงรายชื่อสมาชิกทริป
      try {
        const { data: memberData, error: memErr } = await supabase
          .from('trip_members')
          .select('*, profiles(*)')
          .eq('trip_id', tripId);
        
        if (memberData && !memErr) {
          setMembers(memberData);
        } else {
          // Fallback to simple select if join fails
          const { data: simpleMembers } = await supabase
            .from('trip_members')
            .select('*')
            .eq('trip_id', tripId);
          if (simpleMembers) setMembers(simpleMembers);
        }
      } catch (memE) {
        console.warn('Trip members fetch warn:', memE);
      }

      // Cache offline
      cacheTripOffline({
        trip: tripData,
        itinerary: planData || [],
        expenses: expData || [],
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
        alert(`🎉 นำเข้าแผนเที่ยวสำเร็จจำนวน ${parsedItems.length} รายการ!`);
        fetchTripData();
      } else {
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message);
      }
    } catch (err: any) {
      alert('ไม่สามารถประมวลผลไฟล์ได้: ' + err.message);
    }
  };

  // ย้ายแถวกิจกรรมขึ้น / ลง (Move Row Up / Down)
  const handleMoveActivity = async (currentIndex: number, direction: 'up' | 'down') => {
    if (reordering) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= itinerary.length) return;

    setReordering(true);
    const updated = [...itinerary];
    const temp = updated[currentIndex];
    updated[currentIndex] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Optimistic UI update
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

  // เปิด Modal เพิ่มกิจกรรมใหม่
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

  // บันทึก / แก้ไขกิจกรรม
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
        // แก้ไข
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
        // เพิ่มใหม่
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

  // สแกนใบเสร็จด้วย AI OCR & Smart Extractor
  const handleReceiptImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    setOcrSuccessToast(null);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      try {
        const res = await fetch('/api/scan-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
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
            receipt_url: dataUrl,
          }));
          setOcrSuccessToast(`✨ AI สแกนใบเสร็จสำเร็จ: "${json.data.merchant}" ยอด ${Number(json.data.amount || 0).toLocaleString()} ${json.data.currency || 'JPY'}`);
          setTimeout(() => setOcrSuccessToast(null), 5000);
        } else {
          setScannedData((prev: any) => ({ ...prev, receipt_url: dataUrl }));
        }
      } catch (err) {
        console.warn('OCR scan fallback:', err);
        setScannedData((prev: any) => ({
          ...prev,
          title: prev.title || 'ค่าใช้จ่ายใบเสร็จ',
          amount: prev.amount || '1000',
          receipt_url: dataUrl,
        }));
      } finally {
        setScanning(false);
      }
    };
  };

  // บันทึกค่าใช้จ่ายพร้อมเก็บรูปใบเสร็จไว้ใน Client IndexedDB Storage (ไม่ทำให้ DB ล้น)
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

      // Generate local receipt key if photo attached
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

  // เปิดดูรูปใบเสร็จ (ดึงจาก IndexedDB ของโทรศัพท์ / แคชเครื่อง)
  const handleOpenReceiptPreview = async (exp: any) => {
    if (!exp.receipt_url) return;
    setPreviewLoading(true);
    try {
      if (exp.receipt_url.startsWith('data:image') || exp.receipt_url.startsWith('http')) {
        setPreviewImage(exp.receipt_url);
      } else {
        // Load from phone IndexedDB
        const localData = await getLocalReceiptPhoto(exp.receipt_url);
        if (localData) {
          setPreviewImage(localData);
        } else {
          // Fallback
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

  // RBAC permissions
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

  // เปลี่ยนสิทธิ์สมาชิก
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

  // สรุปยอดจ่ายแยกตามรายคน
  const distinctPayers = useMemo(() => {
    const map = new Map<string, { name: string; avatar?: string; total: number; isMe: boolean; key: string }>();

    expenses.forEach((e) => {
      const isMe = (e.payer_id && e.payer_id === currentUser?.id) ||
                   (e.payer_name && e.payer_name.toLowerCase() === userDisplayName.toLowerCase());
      const key = isMe ? 'me' : (e.payer_id || e.payer_name || 'สมาชิก');
      const name = isMe ? `${userDisplayName} (ฉัน)` : (e.payer_name || 'สมาชิก');
      const avatar = isMe ? userProfile?.avatar_id : e.payer_avatar;

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
        const isMe = (e.payer_id && e.payer_id === currentUser?.id) ||
                     (e.payer_name && e.payer_name.toLowerCase() === userDisplayName.toLowerCase());
        if (expensePayerFilter === 'me' && !isMe) return false;
        if (expensePayerFilter !== 'me' && e.payer_id !== expensePayerFilter && e.payer_name !== expensePayerFilter) return false;
      }
      if (expenseSearchQuery.trim()) {
        const query = expenseSearchQuery.toLowerCase();
        const titleMatch = (e.title || '').toLowerCase().includes(query);
        const payerMatch = (e.payer_name || '').toLowerCase().includes(query);
        if (!titleMatch && !payerMatch) return false;
      }
      return true;
    });
  }, [expenses, expenseCategoryFilter, expensePayerFilter, expenseSearchQuery, currentUser, userDisplayName]);

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
      
      {/* Background Floating Glow Orbs */}
      <div className="absolute top-20 left-10 w-80 sm:w-96 h-80 sm:h-96 bg-pink-500/10 dark:bg-pink-500/15 rounded-full blur-3xl pointer-events-none animate-float-slow" />
      <div className="absolute top-80 right-10 w-80 sm:w-96 h-80 sm:h-96 bg-purple-600/10 dark:bg-purple-600/15 rounded-full blur-3xl pointer-events-none animate-float-reverse" />

      {/* ==================== TOP NAVIGATION ==================== */}
      <nav className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-purple-900/40 bg-white/90 dark:bg-[#090611]/90 backdrop-blur-xl transition-colors">
        <div className="max-w-5xl mx-auto px-3.5 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          
          {/* Left: Back & Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href="/"
              className="p-2 rounded-2xl border border-slate-200/80 dark:border-purple-800/80 bg-white/90 dark:bg-[#130d22]/90 text-slate-700 dark:text-purple-200 hover:border-pink-500 hover:text-pink-600 dark:hover:text-pink-400 hover:scale-105 shadow-2xs transition-all shrink-0 cursor-pointer"
              title="กลับไปหน้าทริปทั้งหมด"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-sm sm:text-base font-black bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 dark:from-pink-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent truncate max-w-[130px] xs:max-w-[180px] sm:max-w-xs md:max-w-md">
                  {(trip?.name || trip?.title) || 'รายละเอียดทริป'}
                </h1>
                
                {/* Online / Offline Status Badge */}
                <span className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full border shrink-0 ${
                  isOnline 
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900' 
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900'
                }`}>
                  {isOnline ? <Wifi className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-500" /> : <WifiOff className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-500" />}
                  <span className="hidden md:inline">{isOnline ? 'ออนไลน์' : 'ออฟไลน์ (แคชเครื่อง)'}</span>
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-500 dark:text-purple-300/70 font-semibold truncate">
                <span>{trip?.currency || 'JPY'}</span>
                <span>•</span>
                <span>{trip?.start_date ? new Date(trip.start_date).toLocaleDateString('th-TH') : 'ไม่ระบุวัน'}</span>
              </div>
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Notification Bell */}
            <NotificationBell expenses={expenses} itinerary={itinerary} members={members} tripTitle={trip?.name || trip?.title} />

            {/* Profile Avatar Button */}
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-1.5 p-1 sm:p-1.5 sm:pr-2.5 rounded-2xl border border-slate-200/80 dark:border-purple-800/80 bg-white/90 dark:bg-[#130d22]/90 hover:border-pink-500 hover:scale-105 shadow-2xs transition-all cursor-pointer group"
              title="ตั้งค่าโปรไฟล์"
            >
              <div className={`w-6 h-6 rounded-lg bg-gradient-to-tr ${userCat.bgGradient} flex items-center justify-center text-xs shadow-sm group-hover:scale-110 transition-transform overflow-hidden`}>
                {userCat.imgUrl ? (
                  <img src={userCat.imgUrl} alt={userCat.name} className="w-full h-full object-cover" />
                ) : (
                  userCat.emoji
                )}
              </div>
              <span className="text-[11px] font-black text-slate-800 dark:text-purple-100 max-w-[80px] truncate hidden lg:inline">
                {userDisplayName}
              </span>
            </button>

            {/* Share button */}
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-purple-800/80 bg-white/90 dark:bg-[#130d22]/90 text-slate-700 dark:text-purple-200 text-xs font-bold hover:border-pink-500 hover:text-pink-600 dark:hover:text-pink-400 hover:scale-105 shadow-2xs transition-all cursor-pointer"
              title="แชร์ทริป"
            >
              <Share2 className="h-3.5 w-3.5 text-pink-500" />
              <span className="hidden sm:inline">แชร์</span>
            </button>

            {/* Dark/Light Switcher */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 sm:p-2 rounded-xl border border-slate-200/80 dark:border-purple-800/80 bg-white/90 dark:bg-[#130d22]/90 text-slate-700 dark:text-purple-200 hover:border-pink-500 hover:rotate-45 shadow-2xs transition-all duration-300 cursor-pointer"
              title="สลับโหมด มืด/สว่าง"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-purple-600" />}
            </button>

            {/* Quick Logout Button */}
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
                className="p-1.5 sm:p-2 rounded-xl border border-slate-200/80 dark:border-purple-800/80 bg-white/90 dark:bg-[#130d22]/90 text-slate-500 hover:text-rose-600 dark:text-purple-300 dark:hover:text-rose-400 hover:border-rose-400 shadow-2xs transition-all cursor-pointer"
                title="ออกจากระบบ (Sign Out)"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ==================== MAIN CONTENT CONTAINER ==================== */}
      <main className="relative z-10 max-w-5xl mx-auto px-3.5 sm:px-4 pt-4 sm:pt-6 space-y-4 sm:space-y-6">

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

        {/* ==================== HERO BUDGET & QUICK ACTION CARD (IPHONE / IPAD OPTIMIZED) ==================== */}
        <div className="relative overflow-hidden rounded-3xl border border-purple-200/80 dark:border-purple-800/60 bg-gradient-to-br from-pink-500/10 via-purple-600/10 to-indigo-600/10 bg-white/95 dark:bg-[#130d22]/95 backdrop-blur-xl card-elevation p-4 sm:p-6 md:p-7 space-y-4">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl pointer-events-none animate-float-slow" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none animate-float-reverse" />

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
                onClick={() => setShowBudgetCategoryModal(true)}
                className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-purple-200 bg-white/90 dark:bg-[#1c1328] px-2.5 py-1 rounded-xl border border-slate-300 dark:border-purple-800 hover:border-pink-500 hover:text-pink-600 transition-all cursor-pointer shadow-2xs hover:scale-105"
              >
                <Sliders className="h-3 w-3 text-pink-500" /> 
                <span>ตั้งงบ & หมวด</span>
              </button>

              <button
                onClick={() => setShowScrapbookModal(true)}
                className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-purple-200 bg-white/90 dark:bg-[#1c1328] px-2.5 py-1 rounded-xl border border-slate-300 dark:border-purple-800 hover:border-pink-500 hover:text-pink-600 transition-all cursor-pointer shadow-2xs hover:scale-105"
              >
                <span>📸 สมุดภาพ ({photosCount})</span>
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
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-xs scale-105'
                  : 'bg-slate-100 dark:bg-[#1c1328] text-slate-700 dark:text-purple-300 hover:bg-slate-200 border border-slate-200 dark:border-purple-900/50'
              }`}
            >
              👥 รวมทุกคน
            </button>

            <button
              type="button"
              onClick={() => setHeroBudgetView('me')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                heroBudgetView === 'me'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-xs scale-105'
                  : 'bg-slate-100 dark:bg-[#1c1328] text-slate-700 dark:text-purple-300 hover:bg-slate-200 border border-slate-200 dark:border-purple-900/50'
              }`}
            >
              <span>{userCat.emoji}</span>
              <span>ของฉัน ({userDisplayName})</span>
            </button>

            {members.map((m) => {
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
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-xs scale-105'
                      : 'bg-slate-100 dark:bg-[#1c1328] text-slate-700 dark:text-purple-300 hover:bg-slate-200 border border-slate-200 dark:border-purple-900/50'
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
            <div className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-purple-300/70 flex items-center justify-between">
              <span>{heroDisplayData.title}</span>
              {heroDisplayData.isOver && (
                <span className="text-[10px] sm:text-[11px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900">
                  ⚠️ เกินงบ +{heroDisplayData.diff.toLocaleString()} {trip?.currency}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-baseline gap-1 sm:gap-2 mt-0.5">
              <span className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
                {heroDisplayData.spent.toLocaleString()}
              </span>
              <span className="text-base sm:text-xl font-bold text-pink-600 dark:text-pink-400">
                {trip?.currency || 'JPY'}
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-purple-400 ml-1">
                (≈ ฿{Math.round(heroDisplayData.spent * fxRate).toLocaleString()})
              </span>
            </div>
          </div>

          {/* Row 4: Progress Bar */}
          <div className="relative z-10 space-y-1.5">
            <div className="flex justify-between text-[11px] sm:text-xs font-bold text-slate-700 dark:text-purple-200">
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

            <div className="w-full bg-slate-200/80 dark:bg-[#1e1530] rounded-full h-3 sm:h-3.5 p-0.5 overflow-hidden shadow-inner relative">
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

            {/* Two Primary Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
              <button
                onClick={() => {
                  setOcrSuccessToast(null);
                  setShowScanModal(true);
                }}
                disabled={!canAddExpense}
                className="py-3 px-3 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer disabled:opacity-50"
              >
                <Camera className="h-4 w-4 shrink-0" />
                <span className="truncate">บันทึกรายจ่าย AI OCR</span>
              </button>

              <button
                onClick={() => setShowSettlementModal(true)}
                className="py-3 px-3 rounded-2xl bg-white dark:bg-[#1a1228] border border-purple-300 dark:border-purple-800/80 hover:border-pink-500 text-slate-800 dark:text-purple-100 font-bold text-xs sm:text-sm shadow-sm hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer"
              >
                <Calculator className="h-4 w-4 text-pink-500 shrink-0" />
                <span className="truncate">เคลียร์บิลหารเงิน</span>
              </button>
            </div>
          </div>
        </div>

        {/* ==================== COLLAPSIBLE WEATHER & ROUTE WIDGET ==================== */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-purple-900/50 bg-white/95 dark:bg-[#130d22]/95 card-elevation overflow-hidden">
          <div 
            onClick={() => setShowWeatherSection(!showWeatherSection)}
            className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-purple-950/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🌤️</span>
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                พยากรณ์อากาศ & เส้นทางเที่ยวสด
              </span>
            </div>
            <button className="p-1 text-slate-400">
              {showWeatherSection ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          {showWeatherSection && (
            <div className="p-3.5 sm:p-4 pt-0 space-y-4 border-t border-slate-100 dark:border-purple-900/30">
              <WeatherWidget defaultCity="Osaka" />
              <RouteVisualizer dayLabel="เส้นทางภาพรวม" items={itinerary} />
            </div>
          )}
        </div>

        {/* ==================== DESKTOP & TABLET TAB NAVIGATION BAR ==================== */}
        <div className="hidden sm:grid grid-cols-4 gap-2 p-1.5 bg-slate-100/80 dark:bg-[#130d22]/80 border border-slate-200/80 dark:border-purple-900/40 rounded-3xl backdrop-blur-xl">
          <button
            onClick={() => setActiveTab('plan')}
            className={`py-2.5 px-3 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'plan' 
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/25 scale-[1.01]' 
                : 'text-slate-600 dark:text-purple-300/70 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>🗺️ แผนการเดินทาง ({itinerary.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`py-2.5 px-3 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'expenses' 
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/25 scale-[1.01]' 
                : 'text-slate-600 dark:text-purple-300/70 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>💰 รายจ่าย ({expenses.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2.5 px-3 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'analytics' 
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/25 scale-[1.01]' 
                : 'text-slate-600 dark:text-purple-300/70 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>📊 สถิติ & งบหมวด</span>
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`py-2.5 px-3 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'members' 
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/25 scale-[1.01]' 
                : 'text-slate-600 dark:text-purple-300/70 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>👥 สมาชิก ({members.length})</span>
          </button>
        </div>

        {/* ==================== TAB 1: แผนการเดินทาง (ITINERARY) ==================== */}
        {activeTab === 'plan' && (
          <div className="space-y-4">
            
            {/* Header Toolbar */}
            <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
              {/* Day filter pills */}
              {availableDays.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full custom-scrollbar">
                  <button
                    onClick={() => setSelectedDayFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      selectedDayFilter === 'all'
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-xs scale-105'
                        : 'bg-slate-100 dark:bg-purple-950/70 text-slate-800 dark:text-purple-200 border border-slate-300/80 dark:border-purple-900/50 hover:bg-slate-200'
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
                          : 'bg-slate-100 dark:bg-purple-950/70 text-slate-800 dark:text-purple-200 border border-slate-300/80 dark:border-purple-900/50 hover:bg-slate-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => setShowPrintableModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-purple-800 bg-white/90 dark:bg-[#130d22]/90 text-xs font-bold text-slate-700 dark:text-purple-200 hover:border-pink-500 transition-all cursor-pointer shadow-2xs"
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-purple-800 bg-white/90 dark:bg-[#130d22]/90 text-xs font-bold text-slate-700 dark:text-purple-200 hover:border-pink-500 transition-all cursor-pointer shadow-2xs"
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

            {/* List of Itinerary Activities */}
            {filteredItinerary.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-300 dark:border-purple-900/50 rounded-3xl p-6 bg-white/60 dark:bg-[#130d22]/60">
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
                {filteredItinerary.map((item, idx) => {
                  const isPlanBOpen = expandedPlanB[item.id] || false;
                  return (
                    <div
                      key={item.id || idx}
                      className="group p-4 rounded-3xl border border-slate-200/90 dark:border-purple-900/50 bg-white/95 dark:bg-[#130d22]/95 card-elevation hover:border-pink-500/50 transition-all duration-300"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-900">
                            {item.date_label || `Day ${idx + 1}`}
                          </span>
                          {item.time_slot && (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-purple-300">
                              <Clock className="h-3 w-3 text-pink-500" /> {item.time_slot}
                            </span>
                          )}
                          {item.city && (
                            <span className="text-[10px] font-bold text-slate-500 dark:text-purple-400">
                              📍 {item.city}
                            </span>
                          )}
                        </div>

                        {canEditPlan && (
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleMoveActivity(idx, 'up')}
                              disabled={idx === 0 || reordering}
                              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-purple-900/50 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                              title="เลื่อนขึ้น"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveActivity(idx, 'down')}
                              disabled={idx === itinerary.length - 1 || reordering}
                              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-purple-900/50 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                              title="เลื่อนลง"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEditActivity(item)}
                              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-purple-900/50 text-slate-400 hover:text-purple-600 transition-colors cursor-pointer"
                              title="แก้ไขกิจกรรม"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteActivity(item.id)}
                              className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="ลบกิจกรรม"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white">
                            {item.main_place}
                          </h4>
                          {item.main_place_links && item.main_place_links.length > 0 && (
                            item.main_place_links.map((link: string, lIdx: number) => (
                              <a
                                key={lIdx}
                                href={link}
                                target="_blank"
                                rel="noreferrer"
                                className="text-pink-600 hover:text-pink-700 text-[10px] font-bold inline-flex items-center gap-0.5 hover:underline"
                              >
                                <span>แผนที่ {lIdx > 0 ? lIdx + 1 : ''}</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            ))
                          )}
                        </div>

                        {item.food_recommendation && (
                          <div className="text-xs text-slate-600 dark:text-purple-300 flex items-center gap-1.5 font-medium">
                            <Utensils className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            <span>ร้านอาหารแนะนำ: {item.food_recommendation}</span>
                          </div>
                        )}

                        {item.transport_info && (
                          <div className="text-xs text-slate-600 dark:text-purple-300 flex items-center gap-1.5 font-medium">
                            <Bus className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                            <span>การเดินทาง: {item.transport_info}</span>
                          </div>
                        )}

                        {item.backup_plan && (
                          <div className="mt-2 pt-2 border-t border-dashed border-slate-200 dark:border-purple-900/40">
                            <button
                              type="button"
                              onClick={() => setExpandedPlanB({ ...expandedPlanB, [item.id]: !isPlanBOpen })}
                              className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5 hover:underline cursor-pointer"
                            >
                              <span>🛡️ แผนสำรอง (Plan B)</span>
                              {isPlanBOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>
                            {isPlanBOpen && (
                              <div className="p-2.5 mt-1 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 text-xs text-slate-700 dark:text-purple-200 space-y-1">
                                <p className="whitespace-pre-line font-medium">{item.backup_plan}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 2: รายจ่าย (EXPENSES) ==================== */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            
            {/* Horizontal Filter Row */}
            <div className="p-3.5 rounded-3xl border border-slate-200/80 dark:border-purple-900/50 bg-white/95 dark:bg-[#130d22]/95 card-elevation space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
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
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-xs scale-105'
                      : 'bg-slate-100 dark:bg-purple-950/60 text-slate-700 dark:text-purple-300'
                  }`}
                >
                  👥 ทุกคน ({expenses.length})
                </button>

                <button
                  type="button"
                  onClick={() => setExpensePayerFilter('me')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                    expensePayerFilter === 'me'
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-xs scale-105'
                      : 'bg-slate-100 dark:bg-purple-950/60 text-slate-700 dark:text-purple-300'
                  }`}
                >
                  <span>{userCat.emoji}</span>
                  <span>ของฉัน ({userDisplayName})</span>
                </button>

                {members.map((m) => {
                  const mName = m.profiles?.display_name || m.profiles?.email?.split('@')[0] || 'สมาชิก';
                  const mCat = getCatAvatar(m.profiles?.avatar_id);
                  const isSelected = expensePayerFilter === (m.user_id || m.id) || expensePayerFilter === mName;

                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setExpensePayerFilter(m.user_id || mName)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-xs scale-105'
                          : 'bg-slate-100 dark:bg-purple-950/60 text-slate-700 dark:text-purple-300'
                      }`}
                    >
                      <span>{mCat.emoji}</span>
                      <span>{mName}</span>
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
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-medium"
                    value={expenseSearchQuery}
                    onChange={(e) => setExpenseSearchQuery(e.target.value)}
                  />
                </div>

                <select
                  value={expenseCategoryFilter}
                  onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-bold cursor-pointer"
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
              <div className="text-center py-12 border-2 border-dashed border-slate-300 dark:border-purple-900/50 rounded-3xl p-6 bg-white/60 dark:bg-[#130d22]/60">
                <Receipt className="h-10 w-10 text-pink-500 mx-auto mb-2 animate-float-slow" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">ยังไม่มีรายการค่าใช้จ่าย</h3>
                <p className="text-xs text-slate-500 dark:text-purple-400 mt-1 mb-4">
                  กดปุ่มถ่ายรูปใบเสร็จเพื่อใช้ AI สแกนและกรอกยอดให้อัตโนมัติ
                </p>
                {canAddExpense && (
                  <button
                    onClick={() => {
                      setOcrSuccessToast(null);
                      setShowScanModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-md hover:scale-105 transition-all"
                  >
                    <Camera className="h-4 w-4" /> บันทึกรายจ่ายแรก
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-purple-900/40 rounded-3xl border border-slate-200/80 dark:border-purple-900/50 bg-white/95 dark:bg-[#130d22]/95 overflow-hidden card-elevation">
                {filteredExpenses.map((exp, idx) => {
                  const catMeta = getCategoryMeta(categories, exp.category);
                  const payerCat = getCatAvatar(exp.payer_avatar);
                  const isMyExpense = (exp.payer_id && exp.payer_id === currentUser?.id) || 
                                      (exp.payer_name && exp.payer_name.toLowerCase() === userDisplayName.toLowerCase());

                  return (
                    <div key={exp.id || idx} className="p-3.5 sm:p-4 flex justify-between items-center hover:bg-pink-50/30 dark:hover:bg-purple-950/30 transition-all duration-200 gap-2">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className="text-lg sm:text-xl p-2 sm:p-2.5 rounded-2xl bg-gradient-to-tr from-purple-50 to-pink-50 dark:from-purple-950/70 dark:to-pink-950/60 border border-purple-200/60 dark:border-purple-900/60 shadow-2xs shrink-0">
                          {catMeta.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                            <span className="truncate">{exp.title}</span>
                            {exp.receipt_url && (
                              <button
                                onClick={() => handleOpenReceiptPreview(exp)}
                                className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 border border-pink-200 dark:border-pink-900 hover:scale-105 transition-transform cursor-pointer shrink-0"
                                title="ดูรูปใบเสร็จ"
                              >
                                <ImageIcon className="h-3 w-3" /> ใบเสร็จ
                              </button>
                            )}
                          </div>
                          <div className="text-[10px] sm:text-xs text-slate-500 dark:text-purple-300/70 flex flex-wrap items-center gap-1.5 mt-0.5 font-medium">
                            <span className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-extrabold px-2 py-0.2 rounded-full border ${
                              isMyExpense
                                ? 'bg-pink-100 text-pink-700 dark:bg-pink-950/80 dark:text-pink-300 border-pink-300 dark:border-pink-800'
                                : 'bg-slate-100 text-slate-700 dark:bg-purple-950 dark:text-purple-300 border-slate-300 dark:border-purple-900/60'
                            }`}>
                              <span>{payerCat.emoji}</span>
                              <span className="truncate max-w-[80px] sm:max-w-none">{exp.payer_name || 'สมาชิก'} {isMyExpense ? '(ฉัน)' : ''}</span>
                            </span>

                            <span>•</span>
                            <span className="font-semibold text-slate-700 dark:text-purple-200">{catMeta.label}</span>
                            <span>•</span>
                            <span>{new Date(exp.spent_at).toLocaleDateString('th-TH')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <div className="font-black text-sm sm:text-base text-slate-900 dark:text-white text-right">
                          <div>{Number(exp.amount).toLocaleString()} <span className="text-[10px] sm:text-xs text-slate-400 dark:text-purple-400">{exp.currency}</span></div>
                          <span className="text-[9px] sm:text-[10px] font-bold text-pink-600 dark:text-pink-400 block">
                            ≈ ฿{Math.round(Number(exp.amount) * fxRate).toLocaleString()}
                          </span>
                        </div>
                        {canAddExpense && (
                          <button
                            onClick={() => handleDeleteExpense(exp.id, exp.receipt_url)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 transition-colors cursor-pointer hover:scale-110"
                            title="ลบรายการ"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 3: สถิติ & จัดการงบหมวดหมู่ (ANALYTICS) ==================== */}
        {activeTab === 'analytics' && (
          <div className="space-y-4 sm:space-y-6">
            
            {/* สรุปยอดจ่ายแยกตามรายคน */}
            <div className="p-4 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-purple-900/50 bg-white/95 dark:bg-[#130d22]/95 card-elevation space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-pink-500" /> 
                  <span>สรุปยอดจ่ายแยกตามรายคน (Who Paid)</span>
                </h2>
                <button
                  onClick={() => setShowSettlementModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-sm shadow-pink-500/20 hover:scale-105 transition-all cursor-pointer flex items-center gap-1"
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
                    <div key={p.key} className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-purple-950/30 border border-slate-200/70 dark:border-purple-900/40 space-y-2">
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
                        <div className="text-[10px] font-bold text-slate-500 dark:text-purple-300 flex justify-between border-t border-slate-200/60 dark:border-purple-900/30 pt-1.5">
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
            <div className="p-4 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-purple-900/50 bg-white/95 dark:bg-[#130d22]/95 card-elevation space-y-4">
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
                        <span className="flex items-center gap-1.5 text-slate-800 dark:text-purple-200">
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </span>
                        <div className="text-right">
                          <span className="text-slate-900 dark:text-white">{spentInCat.toLocaleString()} {trip?.currency}</span>
                          <span className="text-[10px] text-slate-400 ml-1">({catPercent.toFixed(0)}%)</span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-200/80 dark:bg-[#1e1530] rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full"
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
            <div className="p-4 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-purple-900/50 bg-white/95 dark:bg-[#130d22]/95 card-elevation space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-pink-500" />
                    <span>สมาชิกในทริปนี้ ({members.length})</span>
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-purple-300 font-medium mt-0.5">
                    {isOwner ? '👑 คุณเป็นเจ้าของทริป สามารถกำหนดสิทธิ์ให้เพื่อนแก้ไขหรือดูได้อย่างเดียว' : 'รายชื่อเพื่อนร่วมทริป'}
                  </p>
                </div>

                <button
                  onClick={() => setShowShareModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-md shadow-pink-500/20 hover:scale-105 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Share2 className="h-3.5 w-3.5" /> ชวนเพื่อนเข้าทริป
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-purple-900/30">
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

                      {/* Role Switcher for Owner */}
                      <div className="flex items-center gap-2">
                        {isOwner && !isTripOwner ? (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={m.role}
                              onChange={(e) => handleUpdateMemberRole(m.id, e.target.value as any)}
                              className="px-2.5 py-1 rounded-xl text-xs font-bold border border-slate-300 dark:border-purple-800 bg-slate-50 dark:bg-[#1c1328] text-slate-900 dark:text-white outline-none cursor-pointer"
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
                          <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
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

      {/* ==================== STICKY FLOATING BOTTOM APP BAR (IPHONE / IPAD NATIVE STYLE) ==================== */}
      <div className="fixed bottom-0 inset-x-0 z-40 sm:hidden p-3 bg-white/85 dark:bg-[#090611]/85 backdrop-blur-2xl border-t border-slate-200/80 dark:border-purple-900/50 shadow-2xl">
        <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setActiveTab('plan')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'plan'
                ? 'bg-gradient-to-tr from-pink-500/20 to-purple-600/20 text-pink-600 dark:text-pink-400 font-black'
                : 'text-slate-500 dark:text-purple-400 font-semibold'
            }`}
          >
            <MapPin className="h-4 w-4 mb-0.5" />
            <span className="text-[10px]">แผนเที่ยว ({itinerary.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('expenses')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'expenses'
                ? 'bg-gradient-to-tr from-pink-500/20 to-purple-600/20 text-pink-600 dark:text-pink-400 font-black'
                : 'text-slate-500 dark:text-purple-400 font-semibold'
            }`}
          >
            <DollarSign className="h-4 w-4 mb-0.5" />
            <span className="text-[10px]">รายจ่าย ({expenses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-tr from-pink-500/20 to-purple-600/20 text-pink-600 dark:text-pink-400 font-black'
                : 'text-slate-500 dark:text-purple-400 font-semibold'
            }`}
          >
            <PieChart className="h-4 w-4 mb-0.5" />
            <span className="text-[10px]">สถิติ & งบ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'members'
                ? 'bg-gradient-to-tr from-pink-500/20 to-purple-600/20 text-pink-600 dark:text-pink-400 font-black'
                : 'text-slate-500 dark:text-purple-400 font-semibold'
            }`}
          >
            <Users className="h-4 w-4 mb-0.5" />
            <span className="text-[10px]">สมาชิก ({members.length})</span>
          </button>
        </div>
      </div>

      {/* ==================== MODALS ==================== */}

      {/* 1. Profile Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={currentUser}
        onProfileUpdated={(updated) => setUserProfile((prev: any) => ({ ...prev, ...updated }))}
      />

      {/* 2. Settlement Modal */}
      <SettlementModal
        isOpen={showSettlementModal}
        onClose={() => setShowSettlementModal(false)}
        expenses={expenses}
        members={members}
        currentUser={currentUser}
        currency={trip?.currency || 'JPY'}
      />

      {/* 3. AI Assistant Modal */}
      <AIAssistantModal
        isOpen={showAIAssistantModal}
        onClose={() => setShowAIAssistantModal(false)}
        currentCity={itinerary[0]?.city || 'Osaka'}
      />

      {/* 4. Budget & Category Manager Modal */}
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

      {/* 5. Printable PDF Itinerary Modal */}
      <PrintableItineraryModal
        isOpen={showPrintableModal}
        onClose={() => setShowPrintableModal(false)}
        trip={trip}
        itinerary={itinerary}
        expenses={expenses}
        categories={categories}
      />

      {/* 6. Photo Scrapbook Modal */}
      <PhotoScrapbookModal
        isOpen={showScrapbookModal}
        onClose={() => {
          setShowScrapbookModal(false);
          setPhotosCount(getTripPhotos(tripId).length);
        }}
        tripId={tripId}
        tripName={trip?.name || trip?.title}
      />

      {/* 7. Version Rollback Modal */}
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

      {/* 8. Scan / Add Expense Modal (with Client Storage & OCR) */}
      {showScanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#130d22] shadow-2xl border border-slate-200/90 dark:border-purple-800/60 glow-pink-purple max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="p-6 pb-3 flex justify-between items-center border-b border-slate-100 dark:border-purple-900/40">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${userCat.bgGradient} flex items-center justify-center text-sm`}>
                  {userCat.emoji}
                </div>
                <div>
                  <h2 className="text-base font-black bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400 bg-clip-text text-transparent">
                    บันทึกค่าใช้จ่าย 🧾
                  </h2>
                  <p className="text-[11px] text-slate-600 dark:text-purple-300/70 font-medium">
                    บันทึกในนาม: <b className="text-pink-600 dark:text-pink-400">{userDisplayName}</b>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowScanModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-purple-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 pt-4 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              <div>
                <label className="relative overflow-hidden flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-pink-400/80 dark:border-pink-600/80 rounded-2xl cursor-pointer bg-pink-50/40 dark:bg-pink-950/20 hover:opacity-90 transition-opacity">
                  {/* Laser Scan Beam when scanning */}
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
                      <span className="text-[10px] text-slate-500 dark:text-purple-400 mt-0.5 font-medium">AI สกัดยอดเงินและร้านค้าให้อัตโนมัติ</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" disabled={scanning} onChange={handleReceiptImage} />
                </label>
              </div>

              {/* OCR Success Banner */}
              {ocrSuccessToast && (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/80 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span className="line-clamp-2">{ocrSuccessToast}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-purple-200">ชื่อรายการ / ร้านค้า *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ข้าวหน้าเนื้อ, ตั๋วรถไฟ Shinkansen"
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-bold"
                    value={scannedData.title}
                    onChange={(e) => setScannedData({ ...scannedData, title: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-purple-200">จำนวนเงิน *</label>
                    <input
                      type="number"
                      required
                      placeholder="0.00"
                      className="w-full p-3 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-black"
                      value={scannedData.amount}
                      onChange={(e) => setScannedData({ ...scannedData, amount: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-purple-200">สกุลเงิน</label>
                    <select
                      className="w-full p-3 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-bold"
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
                    <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-purple-200">หมวดหมู่</label>
                    <select
                      className="w-full p-3 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-bold"
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
                    <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-purple-200">วันที่ใช้จ่าย</label>
                    <input
                      type="date"
                      className="w-full p-3 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-bold"
                      value={scannedData.spent_at}
                      onChange={(e) => setScannedData({ ...scannedData, spent_at: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 pt-3 border-t border-slate-100 dark:border-purple-900/40 flex gap-2">
              <button
                type="button"
                onClick={() => setShowScanModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-purple-800 text-xs font-bold text-slate-700 dark:text-purple-200 hover:bg-slate-100 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveExpense}
                disabled={scanning || savingExpense}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold shadow-lg shadow-pink-500/25 transition-all disabled:opacity-50 cursor-pointer hover:scale-[1.02] flex items-center justify-center gap-1.5"
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

      {/* 9. Activity Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#130d22] shadow-2xl border border-slate-200/90 dark:border-purple-800/60 glow-purple max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="p-6 pb-3 flex justify-between items-center border-b border-slate-100 dark:border-purple-900/40">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  {editingActivity ? 'แก้ไขกิจกรรม ✏️' : 'เพิ่มกิจกรรมในแผนเที่ยว 🗺️'}
                </h2>
              </div>
              <button
                onClick={() => setShowActivityModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-purple-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form id="activity-form" onSubmit={handleSaveActivity} className="p-6 pt-4 overflow-y-auto custom-scrollbar flex-1 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-purple-200">วัน / Day (เช่น 04-Dec)</label>
                  <input
                    type="text"
                    required
                    placeholder="Day 1 (04-Dec)"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-medium"
                    value={activityForm.date_label}
                    onChange={(e) => setActivityForm({ ...activityForm, date_label: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-purple-200">เวลา (เช่น 09:00 - 12:00)</label>
                  <input
                    type="text"
                    placeholder="09:00 - 12:00"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-medium"
                    value={activityForm.time_slot}
                    onChange={(e) => setActivityForm({ ...activityForm, time_slot: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-purple-200">เมือง / ย่าน</label>
                  <input
                    type="text"
                    placeholder="Osaka / Namba"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-medium"
                    value={activityForm.city}
                    onChange={(e) => setActivityForm({ ...activityForm, city: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-purple-200">สถานที่หลัก *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น Universal Studios Japan"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-bold"
                    value={activityForm.main_place}
                    onChange={(e) => setActivityForm({ ...activityForm, main_place: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-purple-200">ลิงก์ Google Maps ของสถานที่หลัก</label>
                {activityForm.main_place_links.map((link, lIdx) => (
                  <div key={lIdx} className="flex gap-2 mb-2">
                    <input
                      type="url"
                      placeholder="https://maps.app.goo.gl/..."
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-medium"
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
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        title="ลบลิงก์"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-purple-200">การเดินทาง (Transport Info)</label>
                <input
                  type="text"
                  placeholder="เช่น นั่งสาย Midosuji Line ลงสถานี Namba ทางออก 14"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-medium"
                  value={activityForm.transport_info}
                  onChange={(e) => setActivityForm({ ...activityForm, transport_info: e.target.value })}
                />
              </div>

            </form>

            <div className="p-6 pt-3 border-t border-slate-100 dark:border-purple-900/40 flex gap-2">
              <button
                type="button"
                onClick={() => setShowActivityModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-purple-800 text-xs font-bold text-slate-700 dark:text-purple-200 hover:bg-slate-100 dark:hover:bg-purple-950/40 cursor-pointer transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                form="activity-form"
                disabled={savingActivity}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-md shadow-pink-500/25 hover:opacity-95 disabled:opacity-50 cursor-pointer hover:scale-[1.02] transition-all"
              >
                {savingActivity ? 'กำลังบันทึก...' : 'บันทึกกิจกรรม'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 10. Preview Receipt Image (High-Res Client Modal with Download Option) */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-lg w-full bg-white dark:bg-[#130d22] p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-purple-800/60 shadow-2xl space-y-3 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-purple-900/40">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-pink-500" /> 
                <span>รูปภาพใบเสร็จ (บันทึกในโทรศัพท์)</span>
              </h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-purple-200 hover:bg-slate-100 dark:hover:bg-purple-950/50 transition-colors cursor-pointer"
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
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-pink-500/20 hover:scale-[1.01] transition-all cursor-pointer"
              >
                <HardDriveDownload className="h-4 w-4" />
                <span>ดาวน์โหลด / บันทึกลงโทรศัพท์</span>
              </a>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-purple-800 text-xs font-bold text-slate-700 dark:text-purple-200 hover:bg-slate-100 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#130d22] p-6 shadow-2xl border border-slate-200/90 dark:border-purple-800/60 glow-pink-purple animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-purple-900/40">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-pink-500/25">
                  <Share2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">แชร์ทริปนี้ให้เพื่อน ✈️</h2>
                  <p className="text-[11px] text-slate-500 dark:text-purple-300/70 font-medium">
                    ส่งให้เพื่อนเพื่อร่วมวางแผนเที่ยวและบันทึกค่าใช้จ่าย
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-purple-200 hover:bg-slate-100 dark:hover:bg-purple-950/50 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              {/* 1. Direct Link */}
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-purple-900/50 bg-slate-50/60 dark:bg-[#1c1328]/60 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    🔗 ลิงก์ตรงเข้าหน้าทริป (Direct Link)
                  </label>
                  <span className="text-[10px] font-bold text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-950 px-2 py-0.5 rounded-full">
                    แนะนำ
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-purple-300/70">
                  สำหรับเพื่อนที่มีบัญชีแล้ว หรือต้องการเปิดดูรายละเอียดทริปทันที
                </p>
                <button
                  onClick={copyInviteLink}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs shadow-md shadow-pink-500/20 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedLink ? 'คัดลอกลิงก์เรียบร้อยแล้ว!' : 'คัดลอกลิงก์ตรง (Direct Link)'}</span>
                </button>
              </div>

              {/* 2. Register / Login & Auto-Join Link */}
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-purple-900/50 bg-slate-50/60 dark:bg-[#1c1328]/60 space-y-2">
                <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  👥 ลิงก์เชิญเพื่อนใหม่ (สมัครเสร็จแล้วเข้าทริปทันที)
                </label>
                <p className="text-[11px] text-slate-500 dark:text-purple-300/70">
                  เพื่อนที่ยังไม่มีบัญชี กดลิงก์นี้เพื่อสมัครสมาชิกแล้วระบบจะดึงเข้ากลุ่มทริปนี้ให้อัตโนมัติ
                </p>
                <button
                  onClick={copyAuthInviteLink}
                  className="w-full py-2.5 rounded-xl border border-purple-300 dark:border-purple-800 bg-white dark:bg-[#130d22] hover:border-pink-500 text-slate-800 dark:text-purple-200 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedAuthLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-purple-500" />}
                  <span>{copiedAuthLink ? 'คัดลอกลิงก์เชิญเรียบร้อยแล้ว!' : 'คัดลอกลิงก์เชิญสมาชิกใหม่'}</span>
                </button>
              </div>

              {/* 3. Trip ID Code */}
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-purple-200">รหัสเชิญประจำทริป (Trip ID)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50 dark:bg-purple-950/30 text-xs font-mono text-slate-900 dark:text-white select-all font-bold"
                    value={tripId}
                  />
                  <button
                    onClick={copyTripCode}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-purple-900 dark:hover:bg-purple-800 text-slate-800 dark:text-purple-100 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer"
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
