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
  getTripCategories, 
  getCategoryBudgets, 
  getCategoryMeta 
} from '@/lib/categories';
import { getTripPhotos } from '@/lib/photos';
import { 
  Camera, Upload, MapPin, Utensils, ShieldAlert, 
  Plus, Download, Moon, Sun, ExternalLink, ChevronDown, 
  ChevronUp, ArrowLeft, Trash2, Clock, Bus, Loader2, 
  Edit3, Share2, Users, PieChart, Sparkles, Search, 
  Copy, Check, Image as ImageIcon, X, AlertCircle, 
  CheckCircle2, DollarSign, Calendar, ArrowUp, ArrowDown,
  PlusCircle, User, Wallet, Filter, Calculator, Navigation, 
  Bot, Sliders, AlertTriangle, FileText, History, Wifi, WifiOff
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function TripDetailPage() {
  const params = useParams();
  const tripId = params?.id as string;
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
  const [photosCount, setPhotosCount] = useState<number>(0);
  
  const [activeTab, setActiveTab] = useState<'plan' | 'expenses' | 'analytics' | 'members'>('plan');
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);
  const [fxRate, setFxRate] = useState<number>(0.235);

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
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<any>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

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
    setLoading(true);
    try {
      setFxRate(getCustomJpyToThbRate());

      // Load Categories & Budgets & Photos
      const cats = getTripCategories(tripId);
      const cBudgets = getCategoryBudgets(tripId);
      const tripPhotos = getTripPhotos(tripId);
      setCategories(cats);
      setCategoryBudgets(cBudgets);
      setPhotosCount(tripPhotos.length);

      // Check if Offline
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const cached = getOfflineTripCache();
        if (cached?.data) {
          if (cached.data.trip) setTrip(cached.data.trip);
          if (cached.data.itinerary) setItinerary(cached.data.itinerary);
          if (cached.data.expenses) setExpenses(cached.data.expenses);
          setLoading(false);
          return;
        }
      }

      // 0. ดึง session และโปรไฟล์ปัจจุบัน
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser(session.user);
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (prof) setUserProfile(prof);
      }

      // 1. ดึงข้อมูลทริป
      const { data: tripData } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();
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
      const { data: memberData } = await supabase
        .from('trip_members')
        .select('*, profiles(*)')
        .eq('trip_id', tripId);
      if (memberData) setMembers(memberData);

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
      // Try fallback from offline cache
      const cached = getOfflineTripCache();
      if (cached?.data) {
        if (cached.data.trip) setTrip(cached.data.trip);
        if (cached.data.itinerary) setItinerary(cached.data.itinerary);
        if (cached.data.expenses) setExpenses(cached.data.expenses);
      }
    } finally {
      setLoading(false);
    }
  }, [tripId, cacheTripOffline, getOfflineTripCache]);

  useEffect(() => {
    fetchTripData();
  }, [fetchTripData]);

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
    const newItinerary = [...itinerary];
    const [movedItem] = newItinerary.splice(currentIndex, 1);
    newItinerary.splice(targetIndex, 0, movedItem);

    const updatedWithOrder = newItinerary.map((item, idx) => ({
      ...item,
      sort_order: idx,
    }));

    setItinerary(updatedWithOrder);

    try {
      const updates = updatedWithOrder.map((item) => ({
        id: item.id,
        trip_id: tripId,
        sort_order: item.sort_order,
      }));

      await supabase.from('itinerary_items').upsert(updates);
    } catch (err) {
      console.error('Reorder fail:', err);
    } finally {
      setReordering(false);
    }
  };

  // บันทึก / แก้ไขกิจกรรม
  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityForm.main_place.trim()) {
      alert('กรุณากรอกชื่อสถานที่หลัก');
      return;
    }

    setSavingActivity(true);

    const cleanPlaceLinks = activityForm.main_place_links
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const cleanFoodTexts = activityForm.food_recommendations
      .map((f) => f.name.trim())
      .filter((n) => n.length > 0)
      .join('\n');

    const cleanFoodLinks = activityForm.food_recommendations
      .map((f) => f.link.trim())
      .filter((l) => l.length > 0);

    const cleanBackupTexts = activityForm.backup_plans
      .map((b) => b.text.trim())
      .filter((t) => t.length > 0)
      .join('\n\n');

    const cleanBackupLinks = activityForm.backup_plans
      .map((b) => b.link.trim())
      .filter((l) => l.length > 0);

    const payload = {
      trip_id: tripId,
      date_label: activityForm.date_label.trim(),
      time_slot: activityForm.time_slot.trim(),
      city: activityForm.city.trim(),
      main_place: activityForm.main_place.trim(),
      main_place_links: cleanPlaceLinks,
      food_recommendation: cleanFoodTexts,
      food_links: cleanFoodLinks,
      backup_plan: cleanBackupTexts,
      backup_links: cleanBackupLinks,
      transport_info: activityForm.transport_info.trim(),
    };

    if (editingActivity) {
      const { error } = await supabase
        .from('itinerary_items')
        .update(payload)
        .eq('id', editingActivity.id);
      if (!error) {
        setShowActivityModal(false);
        setEditingActivity(null);
        fetchTripData();
      } else {
        alert('เกิดข้อผิดพลาด: ' + error.message);
      }
    } else {
      let insertOrder = itinerary.length;
      if (activityForm.insert_after_order !== null) {
        insertOrder = activityForm.insert_after_order + 1;
        const updates = itinerary
          .filter((item) => item.sort_order >= insertOrder)
          .map((item) => ({
            id: item.id,
            trip_id: tripId,
            sort_order: item.sort_order + 1,
          }));
        if (updates.length > 0) {
          await supabase.from('itinerary_items').upsert(updates);
        }
      }

      const { error } = await supabase
        .from('itinerary_items')
        .insert([{ ...payload, sort_order: insertOrder }]);
      if (!error) {
        setShowActivityModal(false);
        resetActivityForm();
        fetchTripData();
      } else {
        alert('เกิดข้อผิดพลาด: ' + error.message);
      }
    }
    setSavingActivity(false);
  };

  const openAddActivityModal = (prefillDate?: string, prefillCity?: string, insertAfterIndex?: number) => {
    resetActivityForm();
    if (prefillDate) {
      setActivityForm((prev) => ({
        ...prev,
        date_label: prefillDate,
        city: prefillCity || '',
        insert_after_order: insertAfterIndex !== undefined ? insertAfterIndex : null,
      }));
    }
    setEditingActivity(null);
    setShowActivityModal(true);
  };

  const openEditActivityModal = (item: any) => {
    setEditingActivity(item);
    
    const placeLinks = item.main_place_links?.length > 0 ? item.main_place_links : [''];

    const foodLines = (item.food_recommendation || '').split('\n').filter((l: string) => l.trim().length > 0);
    const foodLinks = item.food_links || [];
    let foodItems = foodLines.map((name: string, i: number) => ({
      name,
      link: foodLinks[i] || '',
    }));
    if (foodItems.length === 0) {
      foodItems = [{ name: item.food_recommendation || '', link: foodLinks[0] || '' }];
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

  // สแกนใบเสร็จด้วย Claude AI OCR
  const handleReceiptImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
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
        if (json.success && json.data) {
          setScannedData((prev: any) => ({
            ...prev,
            title: json.data.merchant || 'ค่าใช้จ่ายทั่วไป',
            amount: json.data.amount || '',
            category: json.data.category || 'food',
            currency: json.data.currency || trip?.currency || 'JPY',
            receipt_url: dataUrl,
          }));
        } else {
          setScannedData((prev: any) => ({ ...prev, receipt_url: dataUrl }));
          alert('AI ไม่สามารถอ่านข้อมูลใบเสร็จนี้ได้ทั้งหมด กรุณาตรวจสอบและกรอกข้อมูลเพิ่มเติม');
        }
      } catch (err) {
        console.error('OCR scan error:', err);
        setScannedData((prev: any) => ({ ...prev, receipt_url: dataUrl }));
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI OCR กรุณากรอกข้อมูลเอง');
      } finally {
        setScanning(false);
      }
    };
  };

  // บันทึกค่าใช้จ่ายพร้อมระบุ Payer
  const handleSaveExpense = async () => {
    if (!scannedData.amount || !scannedData.title) {
      alert('กรุณากรอกชื่อรายการและจำนวนเงิน');
      return;
    }

    const payerName = userProfile?.display_name || currentUser?.user_metadata?.display_name || currentUser?.email?.split('@')[0] || 'สมาชิก';
    const payerAvatar = userProfile?.avatar_id || currentUser?.user_metadata?.avatar_id || 'cat_pink';

    const { error } = await supabase.from('expenses').insert([
      {
        trip_id: tripId,
        title: scannedData.title.trim(),
        amount: Number(scannedData.amount),
        currency: scannedData.currency,
        category: scannedData.category,
        receipt_url: scannedData.receipt_url || null,
        spent_at: scannedData.spent_at,
        payer_id: currentUser?.id || null,
        payer_name: payerName,
        payer_avatar: payerAvatar,
      },
    ]);

    if (!error) {
      setShowScanModal(false);
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
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('ต้องการลบรายการค่าใช้จ่ายนี้ใช่หรือไม่?')) return;
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) fetchTripData();
  };

  // คัดลอกรหัสเชิญ / ลิงก์แชร์
  const copyInviteLink = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/trips/${tripId}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const copyTripCode = () => {
    navigator.clipboard.writeText(tripId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
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

    XLSX.writeFile(wb, `${((trip?.name || trip?.title)) || 'Trip'}_Export.xlsx`);
  };

  // คำนวณสรุปงบประมาณ
  const totalSpent = useMemo(() => {
    return expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  }, [expenses]);

  const budgetProgress = useMemo(() => {
    const b = (trip?.total_budget ?? trip?.budget ?? 0);
    if (!b || b === 0) return 0;
    return Math.min(Math.round((totalSpent / b) * 100), 100);
  }, [totalSpent, trip]);

  const userDisplayName = userProfile?.display_name || currentUser?.user_metadata?.display_name || currentUser?.email?.split('@')[0] || 'ฉัน';
  const userCat = getCatAvatar(userProfile?.avatar_id || currentUser?.user_metadata?.avatar_id);

  // รายชื่อผู้จ่ายทั้งหมด
  const distinctPayers = useMemo(() => {
    const map = new Map<string, { name: string; avatar: string; count: number; total: number; isMe: boolean }>();
    
    const myName = userDisplayName;
    const myAvatar = userProfile?.avatar_id || 'cat_pink';
    map.set('me', { name: myName, avatar: myAvatar, count: 0, total: 0, isMe: true });

    expenses.forEach((e) => {
      const isMyExpense = (e.payer_id && e.payer_id === currentUser?.id) || 
                          (e.payer_name && e.payer_name.toLowerCase() === myName.toLowerCase());
      
      const key = isMyExpense ? 'me' : (e.payer_name || 'สมาชิก');
      const current = map.get(key) || { 
        name: e.payer_name || 'สมาชิก', 
        avatar: e.payer_avatar || 'cat_pink', 
        count: 0, 
        total: 0, 
        isMe: isMyExpense 
      };

      current.count += 1;
      current.total += Number(e.amount || 0);
      map.set(key, current);
    });

    return Array.from(map.entries()).map(([key, data]) => ({ key, ...data }));
  }, [expenses, userDisplayName, userProfile, currentUser]);

  // กรองรายจ่าย
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchCat = expenseCategoryFilter === 'all' || e.category === expenseCategoryFilter;
      
      let matchPayer = true;
      if (expensePayerFilter === 'me') {
        matchPayer = (e.payer_id && e.payer_id === currentUser?.id) || 
                     (e.payer_name && e.payer_name.toLowerCase() === userDisplayName.toLowerCase());
      } else if (expensePayerFilter !== 'all') {
        matchPayer = e.payer_name === expensePayerFilter;
      }

      const matchQuery = expenseSearchQuery.trim() === '' || 
        (e.title && e.title.toLowerCase().includes(expenseSearchQuery.toLowerCase())) ||
        (e.payer_name && e.payer_name.toLowerCase().includes(expenseSearchQuery.toLowerCase()));

      return matchCat && matchPayer && matchQuery;
    });
  }, [expenses, expenseCategoryFilter, expensePayerFilter, expenseSearchQuery, currentUser, userDisplayName]);

  const filteredExpensesTotal = useMemo(() => {
    return filteredExpenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  }, [filteredExpenses]);

  // สรุปยอดตามหมวดหมู่ (รวม Category Budgets)
  const categoryAnalytics = useMemo(() => {
    const spentMap: { [key: string]: number } = {};
    categories.forEach((cat) => {
      spentMap[cat.id] = 0;
    });

    const targetExpenses = expenses.filter((e) => {
      if (analyticsPayerFilter === 'me') {
        return (e.payer_id && e.payer_id === currentUser?.id) || 
               (e.payer_name && e.payer_name.toLowerCase() === userDisplayName.toLowerCase());
      }
      if (analyticsPayerFilter !== 'all') {
        return e.payer_name === analyticsPayerFilter;
      }
      return true;
    });

    targetExpenses.forEach((e) => {
      const catId = e.category || 'other';
      spentMap[catId] = (spentMap[catId] || 0) + Number(e.amount || 0);
    });

    return categories.map((cat) => {
      const spent = spentMap[cat.id] || 0;
      const budget = categoryBudgets[cat.id] || 0;
      const percent = budget > 0 ? (spent / budget) * 100 : 0;
      const isOver = budget > 0 && spent > budget;
      return {
        ...cat,
        spent,
        budget,
        percent,
        isOver,
        diff: spent - budget,
      };
    });
  }, [categories, expenses, categoryBudgets, analyticsPayerFilter, currentUser, userDisplayName]);

  const analyticsExpensesTotal = useMemo(() => {
    return categoryAnalytics.reduce((a, b) => a + b.spent, 0);
  }, [categoryAnalytics]);

  // กรองวันที่สำหรับแท็บแผนเที่ยว
  const availableDays = useMemo(() => {
    const days = new Set<string>();
    itinerary.forEach((item) => {
      if (item.date_label) days.add(item.date_label.trim());
    });
    return Array.from(days);
  }, [itinerary]);

  const filteredItinerary = useMemo(() => {
    if (selectedDayFilter === 'all') return itinerary;
    return itinerary.filter((item) => item.date_label?.trim() === selectedDayFilter);
  }, [itinerary, selectedDayFilter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
        <Loader2 className="h-9 w-9 animate-spin text-pink-500" />
        <p className="text-xs font-bold text-slate-500 dark:text-purple-400">กำลังโหลดข้อมูลทริป...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-24 bg-grid-pattern transition-colors duration-300">
      
      {/* Background Floating Glow Orbs */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-pink-500/10 dark:bg-pink-500/15 rounded-full blur-3xl pointer-events-none animate-float-slow" />
      <div className="absolute top-80 right-10 w-96 h-96 bg-purple-600/10 dark:bg-purple-600/15 rounded-full blur-3xl pointer-events-none animate-float-reverse" />

      {/* ==================== TOP NAVIGATION ==================== */}
      <nav className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-purple-900/40 bg-white/85 dark:bg-[#090611]/85 backdrop-blur-xl transition-colors">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-2xl border border-slate-200/80 dark:border-purple-800/80 bg-white/90 dark:bg-[#130d22]/90 text-slate-700 dark:text-purple-200 hover:border-pink-500 hover:text-pink-600 dark:hover:text-pink-400 hover:scale-105 shadow-2xs transition-all cursor-pointer"
              title="กลับไปหน้าทริปทั้งหมด"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm md:text-base font-black bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 dark:from-pink-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent truncate max-w-[140px] sm:max-w-xs md:max-w-md">
                  {(trip?.name || trip?.title) || 'รายละเอียดทริป'}
                </h1>
                
                {/* Online / Offline Status Badge */}
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${
                  isOnline 
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900' 
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900'
                }`}>
                  {isOnline ? <Wifi className="h-3 w-3 text-emerald-500" /> : <WifiOff className="h-3 w-3 text-amber-500" />}
                  <span className="hidden sm:inline">{isOnline ? 'ออนไลน์' : 'ออฟไลน์ (แคชเครื่อง)'}</span>
                </span>
              </div>

              <div className="flex items-center gap-2 text-[10px] md:text-xs text-slate-500 dark:text-purple-300/70 font-semibold">
                <span>{trip?.currency || 'JPY'}</span>
                <span>•</span>
                <span>{trip?.start_date ? new Date(trip.start_date).toLocaleDateString('th-TH') : 'ไม่ระบุวัน'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Notification Bell */}
            <NotificationBell expenses={expenses} itinerary={itinerary} tripTitle={trip?.name || trip?.title} />

            {/* Profile Avatar Button */}
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-1.5 p-1.5 pr-2.5 rounded-2xl border border-slate-200/80 dark:border-purple-800/80 bg-white/90 dark:bg-[#130d22]/90 hover:border-pink-500 hover:scale-105 shadow-2xs transition-all cursor-pointer group"
              title="ตั้งค่าโปรไฟล์"
            >
              <div className={`w-6 h-6 rounded-lg bg-gradient-to-tr ${userCat.bgGradient} flex items-center justify-center text-xs shadow-sm group-hover:scale-110 transition-transform`}>
                {userCat.emoji}
              </div>
              <span className="text-[11px] font-black text-slate-800 dark:text-purple-100 max-w-[80px] truncate hidden sm:inline">
                {userDisplayName}
              </span>
            </button>

            {/* Share button */}
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-purple-800/80 bg-white/90 dark:bg-[#130d22]/90 text-slate-700 dark:text-purple-200 text-xs font-bold hover:border-pink-500 hover:text-pink-600 dark:hover:text-pink-400 hover:scale-105 shadow-2xs transition-all cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5 text-pink-500" />
              <span className="hidden sm:inline">แชร์ทริป</span>
            </button>

            {/* Dark/Light Switcher */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl border border-slate-200/80 dark:border-purple-800/80 bg-white/90 dark:bg-[#130d22]/90 text-slate-700 dark:text-purple-200 hover:border-pink-500 hover:rotate-45 shadow-2xs transition-all duration-300 cursor-pointer"
              title="สลับโหมด มืด/สว่าง"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-purple-600" />}
            </button>
          </div>
        </div>
      </nav>

      {/* ==================== MAIN CONTENT CONTAINER ==================== */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 pt-6 space-y-6">

        {/* Guest Preview & Join Invitation Banner */}
        {!currentUser && (
          <div className="p-4 rounded-3xl bg-gradient-to-r from-pink-500/15 via-purple-600/15 to-indigo-600/15 border border-pink-300 dark:border-purple-800/80 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md animate-in fade-in">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white text-lg shadow-sm shrink-0">
                👋
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  คุณกำลังดูทริปนี้ในฐานะผู้มาเยือน (Guest Preview)
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-purple-300/80 font-medium">
                  เข้าสู่ระบบหรือสมัครสมาชิกใหม่เพื่อบันทึกค่าใช้จ่าย แก้ไขแผนเที่ยว และสแกนบิลด้วย AI
                </p>
              </div>
            </div>
            <Link
              href={`/login?returnUrl=/trips/${tripId}`}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-black shadow-md shadow-pink-500/25 hover:scale-105 transition-all shrink-0 cursor-pointer"
            >
              เข้าสู่ระบบ / สมัครสมาชิก
            </Link>
          </div>
        )}

        {/* ==================== HERO BUDGET & QUICK ACTION CARD ==================== */}
        <div className="relative overflow-hidden rounded-3xl border border-purple-200/80 dark:border-purple-800/60 bg-gradient-to-br from-pink-500/10 via-purple-600/10 to-indigo-600/10 bg-white/90 dark:bg-[#130d22]/90 backdrop-blur-xl card-elevation p-6 md:p-7">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl pointer-events-none animate-float-slow" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none animate-float-reverse" />

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Left: Total Spent & Budget */}
            <div className="md:col-span-2 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300 border border-pink-200 dark:border-pink-900 shadow-2xs">
                  {trip?.currency || 'JPY'} Workspace
                </span>
                <span className="text-[11px] font-bold text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/60 px-2 py-0.5 rounded-full border border-pink-200 dark:border-pink-900 shadow-2xs">
                  100 JPY = {(fxRate * 100).toFixed(2)} THB
                </span>
                
                {/* Direct Edit Budget Button */}
                <button
                  onClick={() => setShowBudgetCategoryModal(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-purple-200 bg-white/90 dark:bg-[#1c1328] px-2.5 py-0.5 rounded-full border border-slate-300 dark:border-purple-800 hover:border-pink-500 hover:text-pink-600 transition-all cursor-pointer shadow-2xs hover:scale-105"
                >
                  <Sliders className="h-3 w-3 text-pink-500" /> ตั้งงบ & หมวดหมู่
                </button>

                {/* Photo Scrapbook Trigger Button */}
                <button
                  onClick={() => setShowScrapbookModal(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-purple-200 bg-white/90 dark:bg-[#1c1328] px-2.5 py-0.5 rounded-full border border-slate-300 dark:border-purple-800 hover:border-pink-500 hover:text-pink-600 transition-all cursor-pointer shadow-2xs hover:scale-105"
                >
                  <span>📸 สมุดภาพ ({photosCount})</span>
                </button>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-500 dark:text-purple-300/70">ยอดค่าใช้จ่ายรวมทุกคน</div>
                <div className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                  {totalSpent.toLocaleString()} <span className="text-lg md:text-xl font-bold text-pink-600 dark:text-pink-400">{trip?.currency || 'JPY'}</span>
                  <span className="text-sm md:text-base font-bold text-slate-500 dark:text-purple-400 block sm:inline sm:ml-2">
                    (≈ ฿{Math.round(totalSpent * fxRate).toLocaleString()})
                  </span>
                </div>
              </div>

              {/* Progress Bar with Shimmer */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-purple-200">
                  <span>ใช้ไปแล้ว {budgetProgress}%</span>
                  <span className="flex items-center gap-1">
                    งบประมาณ {Number((trip?.total_budget ?? trip?.budget ?? 0)).toLocaleString()} {trip?.currency || 'JPY'}
                    <button
                      onClick={() => setShowBudgetCategoryModal(true)}
                      className="p-1 text-slate-400 hover:text-pink-500 transition-colors cursor-pointer"
                      title="แก้ไขงบประมาณ"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                  </span>
                </div>
                <div className="w-full bg-slate-200/80 dark:bg-purple-950/80 rounded-full h-3.5 overflow-hidden p-0.5 shadow-inner">
                  <div 
                    className={`h-full rounded-full transition-all duration-700 ${
                      totalSpent > (trip?.total_budget ?? trip?.budget ?? 0) && (trip?.total_budget ?? trip?.budget ?? 0) > 0
                        ? 'bg-gradient-to-r from-rose-500 to-pink-600' 
                        : 'shimmer-gradient'
                    }`}
                    style={{ width: `${Math.min(budgetProgress, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-1 gap-2.5">
              <button
                onClick={() => setShowScanModal(true)}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <Camera className="h-4 w-4" />
                <span>บันทึกรายจ่าย AI OCR</span>
              </button>

              <button
                onClick={() => setShowSettlementModal(true)}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-pink-300 dark:border-pink-800/80 bg-white/95 dark:bg-[#130d22] text-pink-600 dark:text-pink-400 font-black text-xs hover:scale-105 transition-all cursor-pointer shadow-xs"
              >
                <Calculator className="h-4 w-4 text-pink-500" />
                <span>💸 เคลียร์บิลหารเงิน</span>
              </button>
            </div>
          </div>
        </div>

        {/* ==================== LIVE WEATHER FORECAST WIDGET ==================== */}
        <WeatherWidget defaultCity={itinerary[0]?.city || 'osaka'} />

        {/* ==================== WORKSPACE TABS ==================== */}
        <div className="flex gap-2 p-1.5 rounded-2xl border border-slate-200/80 dark:border-purple-900/40 bg-white/90 dark:bg-[#130d22]/90 backdrop-blur-xl card-elevation overflow-x-auto">
          <button
            onClick={() => setActiveTab('plan')}
            className={`px-4 py-2 rounded-2xl font-bold text-xs md:text-sm transition-all cursor-pointer ${
              activeTab === 'plan' 
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/25 scale-[1.02]' 
                : 'text-slate-600 dark:text-purple-300/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-purple-950/40'
            }`}
          >
            🗺️ แผนการเดินทาง ({itinerary.length})
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2 rounded-2xl font-bold text-xs md:text-sm transition-all cursor-pointer ${
              activeTab === 'expenses' 
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/25 scale-[1.02]' 
                : 'text-slate-600 dark:text-purple-300/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-purple-950/40'
            }`}
          >
            💰 รายจ่าย ({expenses.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-2xl font-bold text-xs md:text-sm transition-all cursor-pointer ${
              activeTab === 'analytics' 
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/25 scale-[1.02]' 
                : 'text-slate-600 dark:text-purple-300/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-purple-950/40'
            }`}
          >
            📊 สถิติ & จัดการงบหมวดหมู่
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 rounded-2xl font-bold text-xs md:text-sm transition-all cursor-pointer ${
              activeTab === 'members' 
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/25 scale-[1.02]' 
                : 'text-slate-600 dark:text-purple-300/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-purple-950/40'
            }`}
          >
            👥 สมาชิก & ลิงก์แชร์
          </button>
        </div>

        {/* ==================== TAB 1: แผนการเดินทาง (ITINERARY) ==================== */}
        {activeTab === 'plan' && (
          <div className="space-y-4">
            
            {/* Header Toolbar */}
            <div className="flex flex-wrap justify-between items-center gap-3 mb-2">
              {/* Day filter pills */}
              {availableDays.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                  <button
                    onClick={() => setSelectedDayFilter('all')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      selectedDayFilter === 'all'
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm scale-105'
                        : 'bg-slate-100 dark:bg-purple-950/70 text-slate-800 dark:text-purple-200 border border-slate-300/80 dark:border-purple-900/50 hover:bg-slate-200'
                    }`}
                  >
                    ทั้งหมด ({itinerary.length})
                  </button>
                  {availableDays.map((day) => (
                    <button
                      key={day}
                      onClick={() => setSelectedDayFilter(day)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                        selectedDayFilter === day
                          ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm scale-105'
                          : 'bg-slate-100 dark:bg-purple-950/70 text-slate-800 dark:text-purple-200 border border-slate-300/80 dark:border-purple-900/50 hover:bg-slate-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 ml-auto">
                <button
                  onClick={() => setShowPrintableModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/95 dark:bg-[#130d22]/95 text-slate-800 dark:text-purple-200 border border-slate-300 dark:border-purple-800 rounded-xl text-xs font-bold hover:border-pink-500 hover:text-pink-600 dark:hover:text-pink-400 hover:scale-105 shadow-2xs transition-all cursor-pointer"
                  title="ส่งออกเอกสาร PDF หรือพิมพ์ A4"
                >
                  <FileText className="h-4 w-4 text-pink-500" />
                  <span>พิมพ์ / PDF</span>
                </button>

                <button
                  onClick={() => setShowAIAssistantModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/95 dark:bg-[#130d22]/95 text-slate-800 dark:text-purple-200 border border-slate-300 dark:border-purple-800 rounded-xl text-xs font-bold hover:border-pink-500 hover:text-pink-600 dark:hover:text-pink-400 hover:scale-105 shadow-2xs transition-all cursor-pointer"
                >
                  <Bot className="h-4 w-4 text-pink-500 animate-pulse" />
                  <span>AI Co-Pilot</span>
                </button>

                <button
                  onClick={() => openAddActivityModal(selectedDayFilter !== 'all' ? selectedDayFilter : undefined)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-pink-500/20 hover:scale-105 transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> เพิ่มกิจกรรม
                </button>

                <label className="flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-300 dark:border-purple-800 bg-white/90 dark:bg-[#130d22]/90 rounded-xl text-xs font-bold text-slate-800 dark:text-purple-200 hover:border-pink-500 hover:scale-105 shadow-2xs cursor-pointer transition-all">
                  <Upload className="h-4 w-4 text-pink-500" />
                  <span>Import Excel</span>
                  <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            </div>

            {/* Route Visualizer for selected day */}
            {selectedDayFilter !== 'all' && (
              <RouteVisualizer dayLabel={selectedDayFilter} items={filteredItinerary} />
            )}

            {/* Itinerary Cards */}
            {filteredItinerary.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-300 dark:border-purple-900/50 rounded-3xl p-6 bg-white/60 dark:bg-[#130d22]/60 shadow-sm">
                <MapPin className="h-10 w-10 text-pink-500 mx-auto mb-2 animate-float-slow" />
                <h3 className="font-black text-base text-slate-900 dark:text-white mb-1">ยังไม่มีแผนการเดินทาง</h3>
                <p className="text-xs text-slate-600 dark:text-purple-300/70 mb-4 max-w-sm mx-auto font-medium">
                  กดปุ่ม "Import Excel" เพื่อนำเข้าแผนเที่ยวจากไฟล์ หรือคลิก "เพิ่มกิจกรรม" เพื่อเริ่มสร้างแผน
                </p>
                <button
                  onClick={() => openAddActivityModal()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-md shadow-pink-500/20 hover:scale-105 transition-all"
                >
                  <Plus className="h-4 w-4" /> เพิ่มกิจกรรมแรก
                </button>
              </div>
            ) : (
              filteredItinerary.map((item, idx) => {
                const globalIndex = itinerary.findIndex((it) => it.id === item.id);
                return (
                  <div key={item.id || idx} className="space-y-2">
                    <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-purple-900/50 bg-white/95 dark:bg-[#130d22]/95 card-elevation hover:border-pink-500/60 dark:hover:border-pink-500/60 transition-all duration-300 group">
                      
                      {/* Row Top Header: Badges & Controls */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {item.date_label && (
                            <span className="px-3 py-1 rounded-xl bg-pink-100 text-pink-700 dark:bg-pink-950/80 dark:text-pink-300 text-xs font-black border border-pink-300/80 dark:border-pink-900 shadow-2xs">
                              {item.date_label}
                            </span>
                          )}
                          {item.time_slot && (
                            <span className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-purple-300 bg-slate-100 dark:bg-purple-950/60 border border-slate-200 dark:border-purple-900/40 px-2.5 py-1 rounded-xl shadow-2xs">
                              <Clock className="h-3 w-3 text-purple-600 dark:text-purple-400" /> {item.time_slot}
                            </span>
                          )}
                          {item.city && (
                            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-xl border border-indigo-200 dark:border-indigo-900/40 shadow-2xs">
                              {item.city}
                            </span>
                          )}
                        </div>

                        {/* Row Controls */}
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-purple-950/60 p-1 rounded-xl border border-slate-200 dark:border-purple-900/40 shadow-2xs">
                          <button
                            onClick={() => handleMoveActivity(globalIndex, 'up')}
                            disabled={globalIndex === 0 || reordering}
                            className="p-1 rounded-lg text-slate-700 dark:text-purple-300 hover:bg-slate-200 dark:hover:bg-purple-900 disabled:opacity-30 transition-all cursor-pointer hover:scale-110"
                            title="ย้ายขึ้น (Move Up)"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => handleMoveActivity(globalIndex, 'down')}
                            disabled={globalIndex === itinerary.length - 1 || reordering}
                            className="p-1 rounded-lg text-slate-700 dark:text-purple-300 hover:bg-slate-200 dark:hover:bg-purple-900 disabled:opacity-30 transition-all cursor-pointer hover:scale-110"
                            title="ย้ายลง (Move Down)"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>

                          <div className="w-[1px] h-3 bg-slate-300 dark:bg-purple-800 mx-0.5" />

                          <button
                            onClick={() => openEditActivityModal(item)}
                            className="p-1 rounded-lg text-slate-700 dark:text-purple-300 hover:bg-pink-100 dark:hover:bg-pink-950 hover:text-pink-600 transition-all cursor-pointer hover:scale-110"
                            title="แก้ไขกิจกรรม"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteActivity(item.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-all cursor-pointer hover:scale-110"
                            title="ลบกิจกรรม"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Main Place Content */}
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 p-2 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white shrink-0 shadow-sm shadow-pink-500/20 group-hover:scale-105 transition-transform">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm md:text-base font-black text-slate-900 dark:text-white leading-snug">
                            {item.main_place}
                          </h4>

                          {item.main_place_links && item.main_place_links.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {item.main_place_links.map((link: string, lIdx: number) => (
                                <a
                                  key={lIdx}
                                  href={link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-pink-50 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 rounded-full text-xs font-bold hover:underline hover:scale-105 border border-pink-200 dark:border-pink-900 shadow-2xs transition-all"
                                >
                                  <ExternalLink className="h-3 w-3" /> เปิด Google Maps {item.main_place_links.length > 1 ? `(${lIdx + 1})` : ''}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Food Recommendation */}
                      {item.food_recommendation && item.food_recommendation !== '-' && (
                        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-purple-900/40 flex items-start gap-2.5 text-xs text-slate-800 dark:text-purple-200">
                          <Utensils className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <span className="font-bold text-amber-700 dark:text-amber-400">ร้านแนะนำ: </span>
                            <span className="whitespace-pre-line font-medium">{item.food_recommendation}</span>
                            {item.food_links?.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-1.5">
                                {item.food_links.map((link: string, lIdx: number) => (
                                  <a
                                    key={lIdx}
                                    href={link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
                                  >
                                    <ExternalLink className="h-3 w-3" /> พิกัดร้าน {item.food_links.length > 1 ? `(${lIdx + 1})` : ''}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Transport info */}
                      {item.transport_info && (
                        <div className="mt-2.5 flex items-start gap-2 text-xs text-slate-700 dark:text-purple-300/80 font-medium">
                          <Bus className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                          <span><b>การเดินทาง:</b> {item.transport_info}</span>
                        </div>
                      )}

                      {/* Plan B Accordion */}
                      {item.backup_plan && (
                        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-purple-900/40">
                          <button
                            onClick={() =>
                              setExpandedPlanB((prev) => ({ ...prev, [idx]: !prev[idx] }))
                            }
                            className="flex items-center justify-between w-full text-xs font-bold text-purple-700 dark:text-purple-300 hover:opacity-80 transition-opacity cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              <ShieldAlert className="h-4 w-4 text-pink-500" /> แผนสำรอง & ร้านเผื่อเลือก (Plan B)
                            </span>
                            {expandedPlanB[idx] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>

                          {expandedPlanB[idx] && (
                            <div className="mt-2 text-xs text-slate-800 dark:text-purple-200 bg-slate-50 dark:bg-purple-950/40 p-3.5 rounded-2xl whitespace-pre-line border border-slate-200 dark:border-purple-900/40 font-medium">
                              {item.backup_plan}
                              {item.backup_links?.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2.5">
                                  {item.backup_links.map((link: string, lIdx: number) => (
                                    <a
                                      key={lIdx}
                                      href={link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-pink-600 dark:text-pink-300 underline font-bold inline-flex items-center gap-1"
                                    >
                                      <ExternalLink className="h-3 w-3" /> พิกัด Plan B {item.backup_links.length > 1 ? `(${lIdx + 1})` : ''}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quick Add Row Button Below */}
                    <div className="flex justify-center my-1">
                      <button
                        onClick={() => openAddActivityModal(item.date_label, item.city, item.sort_order)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-purple-300 bg-white/90 dark:bg-[#130d22]/90 px-3.5 py-1 rounded-full border border-slate-300 dark:border-purple-800 shadow-2xs hover:border-pink-500 hover:text-pink-600 dark:hover:text-pink-400 hover:scale-105 transition-all cursor-pointer"
                      >
                        <PlusCircle className="h-3 w-3 text-pink-500" /> แทรกกิจกรรมต่อจากนี้
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ==================== TAB 2: รายจ่าย & AI OCR ==================== */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            
            {/* Payer Quick-Filter Pill Bar */}
            <div className="p-4 rounded-3xl border border-slate-200/80 dark:border-purple-800/50 bg-white/95 dark:bg-[#130d22]/95 backdrop-blur-xl card-elevation space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-purple-100 flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-pink-500" /> กรองดูรายจ่ายตามผู้จ่าย:
                </span>
                <span className="text-[11px] font-extrabold text-pink-600 dark:text-pink-400">
                  ยอดรวมที่เลือก: {filteredExpensesTotal.toLocaleString()} {trip?.currency || 'JPY'} (≈ ฿{Math.round(filteredExpensesTotal * fxRate).toLocaleString()})
                </span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setExpensePayerFilter('all')}
                  className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    expensePayerFilter === 'all'
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/20 scale-105'
                      : 'bg-slate-100 dark:bg-purple-950/70 text-slate-800 dark:text-purple-200 border border-slate-300/80 dark:border-purple-900/50 hover:bg-slate-200'
                  }`}
                >
                  <span>👥 ทุกคน</span>
                  <span className="text-[10px] opacity-80">({expenses.length})</span>
                </button>

                {distinctPayers.map((p) => {
                  const isSelected = expensePayerFilter === (p.isMe ? 'me' : p.name);
                  const pCat = getCatAvatar(p.avatar);

                  return (
                    <button
                      key={p.key}
                      onClick={() => setExpensePayerFilter(p.isMe ? 'me' : p.name)}
                      className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/20 scale-105'
                          : 'bg-slate-100 dark:bg-purple-950/70 text-slate-800 dark:text-purple-200 border border-slate-300/80 dark:border-purple-900/50 hover:bg-slate-200'
                      }`}
                    >
                      <span className="text-sm">{pCat.emoji}</span>
                      <span>{p.isMe ? `ของฉัน (${p.name})` : p.name}</span>
                      <span className="text-[10px] opacity-80 font-mono">
                        {p.total.toLocaleString()} {trip?.currency || 'JPY'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Expense Toolbar */}
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative w-full sm:w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-purple-400" />
                  <input
                    type="text"
                    placeholder="ค้นหารายการ, ร้านค้า..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-white/90 dark:bg-[#130d22]/90 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 shadow-2xs font-medium"
                    value={expenseSearchQuery}
                    onChange={(e) => setExpenseSearchQuery(e.target.value)}
                  />
                </div>

                <select
                  className="px-3 py-2 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-white/90 dark:bg-[#130d22]/90 text-xs outline-none focus:border-pink-500 text-slate-800 dark:text-purple-200 font-bold shadow-2xs"
                  value={expenseCategoryFilter}
                  onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                >
                  <option value="all">ทุกหมวดหมู่ ({categories.length})</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBudgetCategoryModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800 rounded-xl text-xs font-bold hover:bg-purple-100 hover:scale-105 transition-all cursor-pointer shadow-2xs"
                >
                  <Sliders className="h-4 w-4 text-purple-500" /> ตั้งงบ & หมวด
                </button>

                <button
                  onClick={() => setShowSettlementModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-pink-50 text-pink-700 dark:bg-pink-950 dark:text-pink-300 border border-pink-300 dark:border-pink-800 rounded-xl text-xs font-black hover:bg-pink-100 hover:scale-105 transition-all cursor-pointer shadow-2xs"
                >
                  <Calculator className="h-4 w-4 text-pink-500" /> เคลียร์บิล
                </button>

                <button
                  onClick={() => setShowScanModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-pink-500/25 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <Camera className="h-4 w-4" /> บันทึกรายจ่าย / AI OCR
                </button>
                
                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 dark:border-purple-800 bg-white/90 dark:bg-[#130d22]/90 rounded-xl text-xs font-bold text-slate-800 dark:text-purple-200 hover:border-pink-500 hover:scale-105 shadow-2xs transition-all cursor-pointer"
                >
                  <Download className="h-4 w-4 text-pink-500" /> Export
                </button>
              </div>
            </div>

            {/* Expense List */}
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-300 dark:border-purple-900/50 rounded-3xl p-6 bg-white/60 dark:bg-[#130d22]/60 shadow-sm">
                <Camera className="h-10 w-10 text-pink-500 mx-auto mb-2 animate-float-slow" />
                <h3 className="font-black text-base text-slate-900 dark:text-white mb-1">ไม่พบรายการค่าใช้จ่าย</h3>
                <p className="text-xs text-slate-600 dark:text-purple-300/70 mb-4 font-medium">
                  {expensePayerFilter !== 'all' || expenseCategoryFilter !== 'all' || expenseSearchQuery
                    ? 'ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา/ฟิลเตอร์ที่เลือก'
                    : 'กดปุ่มบันทึกรายจ่าย เพื่อถ่ายรูปใบเสร็จให้ Claude AI ดึงข้อมูลให้อัตโนมัติ หรือกรอกข้อมูลด้วยตนเอง'}
                </p>
                {expensePayerFilter !== 'all' && (
                  <button
                    onClick={() => { setExpensePayerFilter('all'); setExpenseCategoryFilter('all'); }}
                    className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-purple-950 text-slate-800 dark:text-purple-300 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                  >
                    ล้างการกรอง (แสดงทุกคน)
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
                    <div key={idx} className="p-4 flex justify-between items-center hover:bg-pink-50/30 dark:hover:bg-purple-950/30 transition-all duration-200">
                      <div className="flex items-center gap-3">
                        <div className="text-xl p-2.5 rounded-2xl bg-gradient-to-tr from-purple-50 to-pink-50 dark:from-purple-950/70 dark:to-pink-950/60 border border-purple-200/60 dark:border-purple-900/60 shadow-2xs">
                          {catMeta.icon}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{exp.title}</span>
                            {exp.receipt_url && (
                              <button
                                onClick={() => setPreviewImage(exp.receipt_url)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 border border-pink-200 dark:border-pink-900 hover:scale-105 transition-transform cursor-pointer"
                                title="ดูรูปใบเสร็จ"
                              >
                                <ImageIcon className="h-3 w-3" /> ใบเสร็จ
                              </button>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-purple-300/70 flex flex-wrap items-center gap-2 mt-0.5 font-medium">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                              isMyExpense
                                ? 'bg-pink-100 text-pink-700 dark:bg-pink-950/80 dark:text-pink-300 border-pink-300 dark:border-pink-800'
                                : 'bg-slate-100 text-slate-700 dark:bg-purple-950 dark:text-purple-300 border-slate-300 dark:border-purple-900/60'
                            }`}>
                              <span>{payerCat.emoji}</span>
                              <span>{exp.payer_name || 'สมาชิก'} {isMyExpense ? '(ฉัน)' : ''}</span>
                            </span>

                            <span>•</span>
                            <span className="font-semibold text-slate-700 dark:text-purple-200">{catMeta.label}</span>
                            <span>•</span>
                            <span>{new Date(exp.spent_at).toLocaleDateString('th-TH')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="font-black text-base text-slate-900 dark:text-white text-right">
                          <div>{Number(exp.amount).toLocaleString()} <span className="text-xs text-slate-400 dark:text-purple-400">{exp.currency}</span></div>
                          <span className="text-[10px] font-bold text-pink-600 dark:text-pink-400 block">
                            ≈ ฿{Math.round(Number(exp.amount) * fxRate).toLocaleString()}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 transition-colors cursor-pointer hover:scale-110"
                          title="ลบรายการ"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
          <div className="space-y-6">
            
            {/* สรุปยอดจ่ายแยกตามรายคน */}
            <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-purple-900/50 bg-white/95 dark:bg-[#130d22]/95 card-elevation">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-pink-500" /> สรุปยอดจ่ายแยกตามรายคน (Who Paid How Much)
                </h2>
                <button
                  onClick={() => setShowSettlementModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-sm shadow-pink-500/20 hover:scale-105 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Calculator className="h-3.5 w-3.5" /> ดูการโอนเงินเคลียร์บิล
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {distinctPayers.map((p) => {
                  const pCat = getCatAvatar(p.avatar);
                  const sharePercent = totalSpent > 0 ? (p.total / totalSpent) * 100 : 0;

                  return (
                    <div
                      key={p.key}
                      className={`p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.01] ${
                        p.isMe
                          ? 'border-pink-300 dark:border-pink-900/60 bg-pink-50/40 dark:bg-pink-950/20'
                          : 'border-slate-200 dark:border-purple-900/40 bg-slate-50/60 dark:bg-purple-950/20'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${pCat.bgGradient} flex items-center justify-center text-sm shadow-sm`}>
                            {pCat.emoji}
                          </div>
                          <div>
                            <span className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-1">
                              {p.name} {p.isMe ? <span className="text-[10px] text-pink-600 font-bold">(ฉัน)</span> : ''}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-purple-400 font-medium block">
                              {p.count} รายการที่จ่าย
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-black text-slate-900 dark:text-white">
                            {p.total.toLocaleString()} <span className="text-[10px] text-slate-400 dark:text-purple-400">{trip?.currency || 'JPY'}</span>
                          </div>
                          <span className="text-[10px] font-extrabold text-pink-600 dark:text-pink-400">
                            ≈ ฿{Math.round(p.total * fxRate).toLocaleString()} ({sharePercent.toFixed(1)}%)
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-200 dark:bg-purple-950 rounded-full h-2.5 overflow-hidden mt-1 shadow-inner">
                        <div
                          className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full transition-all duration-700"
                          style={{ width: `${sharePercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* การจัดสรรงบประมาณ & สัดส่วนตามหมวดหมู่ (Category Budgets) */}
            <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-purple-900/50 bg-white/95 dark:bg-[#130d22]/95 card-elevation space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-pink-500" /> งบประมาณ & ค่าใช้จ่ายแยกตามหมวดหมู่
                  </h2>
                  <span className="text-xs text-slate-500 dark:text-purple-400">
                    เปรียบเทียบยอดใช้จริงกับเป้าหมายงบประมาณที่ตั้งไว้ในแต่ละหมวด
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowBudgetCategoryModal(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-sm hover:scale-105 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Sliders className="h-3.5 w-3.5" /> ตั้งงบ / เพิ่มหมวดหมู่
                  </button>

                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-purple-950/60 p-1 rounded-xl border border-slate-200 dark:border-purple-900/40">
                    <button
                      onClick={() => setAnalyticsPayerFilter('all')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        analyticsPayerFilter === 'all'
                          ? 'bg-pink-500 text-white shadow-sm'
                          : 'text-slate-700 dark:text-purple-300 hover:bg-slate-200 dark:hover:bg-purple-900'
                      }`}
                    >
                      รวมทุกคน
                    </button>
                    <button
                      onClick={() => setAnalyticsPayerFilter('me')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        analyticsPayerFilter === 'me'
                          ? 'bg-pink-500 text-white shadow-sm'
                          : 'text-slate-700 dark:text-purple-300 hover:bg-slate-200 dark:hover:bg-purple-900'
                      }`}
                    >
                      เฉพาะของฉัน
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryAnalytics.map((item) => {
                  const shareOfTotal = analyticsExpensesTotal > 0 ? (item.spent / analyticsExpensesTotal) * 100 : 0;

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all duration-300 ${
                        item.isOver
                          ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20'
                          : 'border-slate-200 dark:border-purple-900/40 bg-slate-50/50 dark:bg-purple-950/20'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl p-1.5 rounded-xl bg-white dark:bg-[#1c1328] shadow-2xs">
                            {item.icon}
                          </span>
                          <div>
                            <span className="font-black text-xs text-slate-900 dark:text-white block">
                              {item.label}
                            </span>
                            {item.budget > 0 ? (
                              <span className={`text-[10px] font-bold ${item.isOver ? 'text-rose-600' : 'text-slate-500 dark:text-purple-400'}`}>
                                {item.isOver 
                                  ? `⚠️ เกินงบ +${item.diff.toLocaleString()} ${trip?.currency}` 
                                  : `เป้างบ: ${item.budget.toLocaleString()} ${trip?.currency}`}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 dark:text-purple-400">ยังไม่ตั้งงบเฉพาะหมวด</span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-black text-slate-900 dark:text-white">
                            {item.spent.toLocaleString()} <span className="text-[10px] text-slate-400 dark:text-purple-400">{trip?.currency || 'JPY'}</span>
                          </div>
                          <span className="text-[10px] font-bold text-pink-600 dark:text-pink-400">
                            {shareOfTotal.toFixed(1)}% ของทั้งหมด
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-200 dark:bg-purple-950 rounded-full h-2.5 overflow-hidden shadow-inner mt-1">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            item.isOver
                              ? 'bg-gradient-to-r from-rose-500 to-red-600'
                              : 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500'
                          }`}
                          style={{ width: `${Math.min(item.budget > 0 ? item.percent : shareOfTotal, 100)}%` }}
                        />
                      </div>

                      {item.budget > 0 && (
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-purple-400 mt-1">
                          <span>ใช้ไป {item.percent.toFixed(1)}% ของงบหมวดนี้</span>
                          <span>คงเหลือ {(item.budget - item.spent).toLocaleString()} {trip?.currency}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* ==================== TAB 4: สมาชิกในทริป ==================== */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl border border-purple-200 dark:border-purple-800/60 bg-gradient-to-br from-pink-500/10 via-purple-600/10 to-indigo-600/10 bg-white/90 dark:bg-[#130d22]/90 backdrop-blur-xl card-elevation">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/25">
                  <Share2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    ชวนเพื่อนเข้าร่วมทริป 👥
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-purple-300/70 font-medium">
                    แชร์รหัสเชิญหรือลิงก์ทริปนี้เพื่อให้เพื่อนร่วมดูแผนเที่ยวและบันทึกค่าใช้จ่าย
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <button
                  onClick={copyTripCode}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-300 dark:border-purple-800 bg-white dark:bg-[#120c1e] hover:border-pink-500 hover:scale-[1.02] shadow-2xs transition-all cursor-pointer"
                >
                  <div className="text-left">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-purple-400 block">รหัสเชิญ (Trip ID)</span>
                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate max-w-[160px] block">{tripId}</span>
                  </div>
                  {copiedCode ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-pink-500" />}
                </button>

                <button
                  onClick={copyInviteLink}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs shadow-md shadow-pink-500/20 hover:scale-[1.02] transition-all cursor-pointer"
                >
                  <span>{copiedLink ? 'คัดลอกลิงก์เรียบร้อยแล้ว!' : 'คัดลอกลิงก์แชร์ทริป (Share Link)'}</span>
                  {copiedLink ? <Check className="h-4 w-4 text-white" /> : <Share2 className="h-4 w-4 text-white" />}
                </button>
              </div>
            </div>

            <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-purple-900/50 bg-white/95 dark:bg-[#130d22]/95 card-elevation">
              <h3 className="text-sm font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-pink-500" /> สมาชิกที่เข้าร่วมทริปนี้ ({members.length + 1})
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-purple-900/40">
                <div className="py-3 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-2xl bg-gradient-to-tr ${userCat.bgGradient} flex items-center justify-center text-base shadow-sm`}>
                      {userCat.emoji}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{userDisplayName} (ฉัน)</span>
                        <span className="text-[10px]">👑</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-purple-400 font-medium">{currentUser?.email}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300 shadow-2xs">
                    Owner
                  </span>
                </div>

                {members.map((m, idx) => {
                  const mCat = getCatAvatar(m.profiles?.avatar_id);
                  const mName = m.profiles?.display_name || m.profiles?.email || 'สมาชิกในกลุ่ม';
                  return (
                    <div key={idx} className="py-3 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-2xl bg-gradient-to-tr ${mCat.bgGradient} flex items-center justify-center text-base shadow-sm`}>
                          {mCat.emoji}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900 dark:text-white">
                            {mName}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-purple-400 font-medium">{m.profiles?.email || 'สมาชิกกลุ่ม'}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 shadow-2xs">
                        {m.role || 'Editor'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Disaster Recovery & Version Rollback Card */}
            <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-purple-900/50 bg-white/95 dark:bg-[#130d22]/95 card-elevation flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">
                    ความปลอดภัยข้อมูล & กู้คืนเวอร์ชัน (Disaster Recovery)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-purple-400 font-medium">
                    สร้างจุดบันทึกเวอร์ชัน (Snapshot), ถอยกลับเวอร์ชันเดิมเมื่อเจอบัค หรือสำรองไฟล์ JSON
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowRollbackModal(true)}
                className="px-4 py-2.5 rounded-xl border border-purple-300 dark:border-purple-800 bg-purple-50/70 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 hover:scale-105"
              >
                <History className="h-4 w-4" />
                <span>จัดการเวอร์ชัน & สำรองข้อมูล</span>
              </button>
            </div>

          </div>
        )}

      </main>

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

      {/* 7. Version Rollback & Disaster Recovery Modal */}
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

      {/* 8. Scan / Add Expense Modal (with Sci-Fi Laser Scan Beam!) */}
      {showScanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#130d22] shadow-2xl border border-slate-200/90 dark:border-purple-800/60 glow-pink-purple max-h-[88vh] flex flex-col overflow-hidden">
            
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
                  {/* Sci-Fi Laser Scan Beam when scanning */}
                  {scanning && <div className="animate-scan-laser z-20" />}

                  {scanning ? (
                    <div className="flex flex-col items-center gap-1.5 text-pink-600 dark:text-pink-400 z-10">
                      <Loader2 className="h-7 w-7 animate-spin text-purple-600 dark:text-purple-400" />
                      <span className="text-xs font-black tracking-wide">⚡ Claude AI กำลังวิเคราะห์ใบเสร็จ...</span>
                    </div>
                  ) : scannedData.receipt_url ? (
                    <div className="flex items-center gap-3 p-2 text-xs font-bold text-pink-600 dark:text-pink-400">
                      <CheckCircle2 className="h-5 w-5" />
                      <span>แนบรูปใบเสร็จเรียบร้อยแล้ว (คลิกเพื่อเปลี่ยนรูป)</span>
                    </div>
                  ) : (
                    <>
                      <Camera className="h-8 w-8 text-pink-500 mb-1 animate-float-slow" />
                      <span className="text-xs font-black text-pink-600 dark:text-pink-400">
                        ถ่ายรูปใบเสร็จ หรือเลือกจากคลังรูปภาพ
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-purple-400 mt-0.5 font-medium">AI สกัดยอดเงินและร้านค้าให้อัตโนมัติ</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" disabled={scanning} onChange={handleReceiptImage} />
                </label>
              </div>

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
                disabled={scanning}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold shadow-lg shadow-pink-500/25 transition-all disabled:opacity-50 cursor-pointer hover:scale-[1.02]"
              >
                บันทึกรายการ
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 9. Activity Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#130d22] shadow-2xl border border-slate-200/90 dark:border-purple-800/60 glow-purple max-h-[88vh] flex flex-col overflow-hidden">
            
            <div className="p-6 pb-3 flex justify-between items-center border-b border-slate-100 dark:border-purple-900/40">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  {editingActivity ? 'แก้ไขกิจกรรม ✏️' : 'เพิ่มกิจกรรมในแผนเที่ยว 🗺️'}
                </h2>
                <p className="text-[11px] text-slate-600 dark:text-purple-300/70 font-medium">
                  รองรับการเพิ่มหลายสถานที่ ลิงก์แผนที่หลายจุด และร้านสำรอง (Plan B)
                </p>
              </div>
              <button
                onClick={() => setShowActivityModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-purple-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form id="activity-form" onSubmit={handleSaveActivity} className="p-6 pt-4 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold mb-1 text-slate-800 dark:text-purple-200">วันที่ / Day</label>
                  <input
                    type="text"
                    placeholder="เช่น 7 ธ.ค., Day 1"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-bold"
                    value={activityForm.date_label}
                    onChange={(e) => setActivityForm({ ...activityForm, date_label: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1 text-slate-800 dark:text-purple-200">เวลา / ช่วงเวลา</label>
                  <input
                    type="text"
                    placeholder="เช่น 09:00 น."
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-bold"
                    value={activityForm.time_slot}
                    onChange={(e) => setActivityForm({ ...activityForm, time_slot: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1 text-slate-800 dark:text-purple-200">ย่าน / เมือง</label>
                  <input
                    type="text"
                    placeholder="เช่น Osaka (Namba)"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-bold"
                    value={activityForm.city}
                    onChange={(e) => setActivityForm({ ...activityForm, city: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold mb-1 text-slate-800 dark:text-purple-200">สถานที่หลัก *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น เดินย่านโดทอนโบริ ชอปปิงร้านรองเท้า และถ่ายรูปคู่ป้าย Glico Sign"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-bold"
                  value={activityForm.main_place}
                  onChange={(e) => setActivityForm({ ...activityForm, main_place: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-[11px] font-bold text-slate-800 dark:text-purple-200">ลิงก์ Google Maps สถานที่หลัก</label>
                  <button
                    type="button"
                    onClick={() => setActivityForm({
                      ...activityForm,
                      main_place_links: [...activityForm.main_place_links, ''],
                    })}
                    className="text-[10px] font-bold text-pink-600 dark:text-pink-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> เพิ่มลิงก์แผนที่อีกแถว
                  </button>
                </div>
                {activityForm.main_place_links.map((link, lIdx) => (
                  <div key={lIdx} className="flex gap-2 items-center">
                    <input
                      type="url"
                      placeholder={`https://maps.google.com/?q=... (แถว ${lIdx + 1})`}
                      className="flex-1 p-2.5 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-medium"
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
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        title="ลบแถวลิงก์นี้"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-900/40 space-y-2.5">
                <div className="flex justify-between items-center">
                  <div className="text-xs font-black text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <Utensils className="h-3.5 w-3.5" /> ร้านอาหาร / คาเฟ่แนะนำ
                  </div>
                  <button
                    type="button"
                    onClick={() => setActivityForm({
                      ...activityForm,
                      food_recommendations: [...activityForm.food_recommendations, { name: '', link: '' }],
                    })}
                    className="text-[10px] font-bold text-amber-800 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> เพิ่มแถวร้านอาหาร
                  </button>
                </div>

                {activityForm.food_recommendations.map((food, fIdx) => (
                  <div key={fIdx} className="space-y-1.5 p-2.5 rounded-xl bg-white dark:bg-[#130d22] border border-amber-200/70 dark:border-amber-900/40 shadow-xs">
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="ชื่อร้านอาหาร เช่น Chibo Okonomiyaki"
                        className="flex-1 p-2 rounded-lg border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/80 text-slate-900 dark:text-white text-xs outline-none focus:border-amber-500 font-bold"
                        value={food.name}
                        onChange={(e) => {
                          const updated = [...activityForm.food_recommendations];
                          updated[fIdx].name = e.target.value;
                          setActivityForm({ ...activityForm, food_recommendations: updated });
                        }}
                      />
                      {activityForm.food_recommendations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = activityForm.food_recommendations.filter((_, i) => i !== fIdx);
                            setActivityForm({ ...activityForm, food_recommendations: updated });
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="ลบแถวร้านอาหารนี้"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <input
                      type="url"
                      placeholder="ลิงก์ Google Maps ร้านอาหาร (ถ้ามี)"
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/80 text-slate-900 dark:text-white text-xs outline-none focus:border-amber-500 font-medium"
                      value={food.link}
                      onChange={(e) => {
                        const updated = [...activityForm.food_recommendations];
                        updated[fIdx].link = e.target.value;
                        setActivityForm({ ...activityForm, food_recommendations: updated });
                      }}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-[11px] font-bold mb-1 text-slate-800 dark:text-purple-200">การเดินทาง & ตั๋วแนะนำ</label>
                <input
                  type="text"
                  placeholder="เช่น เดินเท้าจากที่พัก | ฟรี หรือ Osaka Metro (190 เยน)"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-medium"
                  value={activityForm.transport_info}
                  onChange={(e) => setActivityForm({ ...activityForm, transport_info: e.target.value })}
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-purple-950/30 border border-slate-200 dark:border-purple-900/40 space-y-2.5">
                <div className="flex justify-between items-center">
                  <div className="text-xs font-black text-pink-700 dark:text-pink-400 flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5" /> แผนสำรอง & ร้านเผื่อเลือก (Plan B)
                  </div>
                  <button
                    type="button"
                    onClick={() => setActivityForm({
                      ...activityForm,
                      backup_plans: [...activityForm.backup_plans, { text: '', link: '' }],
                    })}
                    className="text-[10px] font-bold text-pink-700 dark:text-pink-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> เพิ่มแถว Plan B
                  </button>
                </div>

                {activityForm.backup_plans.map((b, bIdx) => (
                  <div key={bIdx} className="space-y-1.5 p-2.5 rounded-xl bg-white dark:bg-[#130d22] border border-slate-200 dark:border-purple-900/40 shadow-xs">
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="รายละเอียด Plan B เช่น ร้านอาหารสำรอง 1: Mizuno Okonomiyaki"
                        className="flex-1 p-2 rounded-lg border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/80 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-medium"
                        value={b.text}
                        onChange={(e) => {
                          const updated = [...activityForm.backup_plans];
                          updated[bIdx].text = e.target.value;
                          setActivityForm({ ...activityForm, backup_plans: updated });
                        }}
                      />
                      {activityForm.backup_plans.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = activityForm.backup_plans.filter((_, i) => i !== bIdx);
                            setActivityForm({ ...activityForm, backup_plans: updated });
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="ลบแถว Plan B นี้"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <input
                      type="url"
                      placeholder="ลิงก์ Google Maps ของ Plan B (ถ้ามี)"
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/80 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-medium"
                      value={b.link}
                      onChange={(e) => {
                        const updated = [...activityForm.backup_plans];
                        updated[bIdx].link = e.target.value;
                        setActivityForm({ ...activityForm, backup_plans: updated });
                      }}
                    />
                  </div>
                ))}
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

      {/* 10. Preview Receipt Image */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-lg w-full bg-white dark:bg-[#130d22] p-4 rounded-3xl border border-slate-200 dark:border-purple-800/60 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-pink-500" /> รูปภาพใบเสร็จ
              </h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-purple-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-black/5 flex items-center justify-center max-h-[70vh]">
              <img src={previewImage} alt="Receipt Preview" className="max-h-[68vh] object-contain rounded-xl" />
            </div>
          </div>
        </div>
      )}

      {/* 11. Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#130d22] p-6 shadow-2xl border border-slate-200/90 dark:border-purple-800/60 glow-pink">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300 shadow-2xs">
                  <Share2 className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">แชร์ทริปนี้ให้เพื่อน ✈️</h2>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-purple-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-purple-300/70 mb-5 font-medium">
              คัดลอกลิงก์หรือรหัสเชิญส่งให้เพื่อนในกลุ่มเพื่อร่วมวางแผนเที่ยวและดูรายจ่ายได้แบบ Real-time
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-purple-200">รหัสเชิญ (Trip ID)</label>
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

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-purple-200">ลิงก์แชร์ทริป (Direct Link)</label>
                <button
                  onClick={copyInviteLink}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-pink-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedLink ? 'คัดลอกลิงก์เรียบร้อยแล้ว!' : 'คัดลอกลิงก์แชร์ทริป'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
