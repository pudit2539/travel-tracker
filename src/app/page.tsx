// src/app/page.tsx
'use client';

import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Compass, Plus, Calendar, DollarSign, ArrowRight, 
  LogOut, Moon, Sun, PlaneTakeoff, Search, Edit3, 
  Trash2, Users, Sparkles, TrendingUp, AlertCircle, 
  Share2, CheckCircle2, Loader2, X, User, Bell, Coins, 
  Check, ArrowUpRight, Shield, Globe2, KeyRound, Sparkle,
  MapPin, Clock, CloudSun, Heart, Shuffle, ChevronRight, BookmarkCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/components/ThemeProvider';
import ProfileModal from '@/components/ProfileModal';
import NotificationBell from '@/components/NotificationBell';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/PullToRefreshIndicator';
import { getCatAvatar } from '@/lib/avatars';
import { getCustomJpyToThbRate, setCustomJpyToThbRate, formatCurrencyWithThb, convertToThb, formatExchangeRateDisplay } from '@/lib/currency';
import { triggerConfetti } from '@/lib/confetti';

export default function HomePage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [fxRate, setFxRate] = useState<number>(0.235);
  
  // Modals state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [createdTripSuccess, setCreatedTripSuccess] = useState<any>(null);
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Form states for Create & Edit
  const [formData, setFormData] = useState({
    title: '',
    budget: '100000',
    currency: 'JPY',
    startDate: '',
    endDate: '',
  });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    setFxRate(getCustomJpyToThbRate());
    
    // Load local cache immediately to prevent blank/hanging state
    try {
      const cached = localStorage.getItem('travel_tracker_home_trips_cache');
      if (cached) {
        setTrips(JSON.parse(cached));
      }
    } catch {}

    checkUserAndFetchTrips();
  }, []);

  const checkUserAndFetchTrips = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);

      // 1. ดึงโปรไฟล์ผู้ใช้อย่างปลอดภัย
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        if (prof) setProfile(prof);
      } catch (e) {
        console.warn('Profile fetch warning', e);
      }

      // 2. ดึงทริปทั้งหมด
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        setTrips(data);
        try {
          localStorage.setItem('travel_tracker_home_trips_cache', JSON.stringify(data));
        } catch {}
      }
    } catch (err) {
      console.error('Error fetching trips:', err);
    } finally {
      setLoading(false);
    }
  };

  // สร้างทริปใหม่ พร้อม Popup แจ้งเตือนสวยงามและ Redirect อัตโนมัติ
  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setActionLoading(true);
    try {
      // ดึง ID ผู้ใช้ปัจจุบัน
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id || user?.id;

      if (!currentUserId) {
        alert('กรุณาเข้าสู่ระบบก่อนสร้างทริป');
        window.location.href = '/login';
        return;
      }

      // บันทึกลงตาราง trips (ใช้ created_by)
      const { data, error } = await supabase
        .from('trips')
        .insert([
          {
            name: formData.title.trim(),
            total_budget: Number(formData.budget) || 0,
            currency: formData.currency,
            start_date: formData.startDate || null,
            end_date: formData.endDate || null,
            created_by: currentUserId,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Create trip error:', error);
        alert('เกิดข้อผิดพลาดในการสร้างทริป: ' + error.message);
        return;
      }

      if (data) {
        // เพิ่มเจ้าของทริปในตารางสมาชิก (role: owner)
        try {
          await supabase.from('trip_members').insert([
            {
              trip_id: data.id,
              user_id: currentUserId,
              role: 'owner',
            },
          ]);
        } catch (memErr) {
          console.warn('Trip members auto add warn:', memErr);
        }

        // อัปเดต State และ Local Cache ทันที
        const newTripList = [data, ...trips];
        setTrips(newTripList);
        try {
          localStorage.setItem('travel_tracker_home_trips_cache', JSON.stringify(newTripList));
        } catch {}

        setShowCreateModal(false);
        resetForm();
        setCreatedTripSuccess(data);
        triggerConfetti();

        // Auto navigate ไปยังหน้าทริป
        setTimeout(() => {
          window.location.href = `/trips/${data.id}`;
        }, 1200);
      }
    } catch (err: any) {
      console.error('Create trip exception:', err);
      alert('เกิดข้อผิดพลาด: ' + (err.message || 'ไม่สามารถสร้างทริปได้'));
    } finally {
      setActionLoading(false);
    }
  };

  // แก้ไขทริป
  const handleUpdateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrip || !formData.title.trim()) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('trips')
        .update({
          name: formData.title.trim(),
          total_budget: Number(formData.budget) || 0,
          currency: formData.currency,
          start_date: formData.startDate || null,
          end_date: formData.endDate || null,
        })
        .eq('id', selectedTrip.id);

      if (!error) {
        const updated = trips.map(t => t.id === selectedTrip.id ? {
          ...t,
          name: formData.title.trim(),
          total_budget: Number(formData.budget) || 0,
          currency: formData.currency,
          start_date: formData.startDate || null,
          end_date: formData.endDate || null,
        } : t);
        setTrips(updated);
        try {
          localStorage.setItem('travel_tracker_home_trips_cache', JSON.stringify(updated));
        } catch {}

        setShowEditModal(false);
        setSelectedTrip(null);
        resetForm();
      } else {
        alert('เกิดข้อผิดพลาดในการแก้ไขทริป: ' + error.message);
      }
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ลบทริป
  const handleDeleteTrip = async () => {
    if (!selectedTrip) return;
    setActionLoading(true);

    try {
      await supabase.from('itinerary_items').delete().eq('trip_id', selectedTrip.id);
      await supabase.from('expenses').delete().eq('trip_id', selectedTrip.id);
      await supabase.from('trip_members').delete().eq('trip_id', selectedTrip.id);
      const { error } = await supabase.from('trips').delete().eq('id', selectedTrip.id);

      if (!error) {
        const updated = trips.filter(t => t.id !== selectedTrip.id);
        setTrips(updated);
        try {
          localStorage.setItem('travel_tracker_home_trips_cache', JSON.stringify(updated));
        } catch {}
        setShowDeleteModal(false);
        setSelectedTrip(null);
      } else {
        alert('เกิดข้อผิดพลาดในการลบทริป: ' + error.message);
      }
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // เข้าร่วมทริปด้วยรหัสเชิญ
  const handleJoinTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !user) return;

    setJoinLoading(true);
    setJoinError('');

    try {
      const code = joinCode.trim();
      const { data: tripData, error: tripErr } = await supabase
        .from('trips')
        .select('*')
        .eq('id', code)
        .single();

      if (tripErr || !tripData) {
        setJoinError('ไม่พบทริปตามรหัสเชิญนี้ กรุณาตรวจสอบอีกครั้ง');
        setJoinLoading(false);
        return;
      }

      await supabase.from('trip_members').upsert({
        trip_id: code,
        user_id: user.id,
        role: 'editor',
      });

      setShowJoinModal(false);
      setJoinCode('');
      window.location.href = `/trips/${code}`;
    } catch (err: any) {
      setJoinError('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setJoinLoading(false);
    }
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (t: any, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedTrip(t);
    setFormData({
      title: t.name || t.title || '',
      budget: String(t.total_budget ?? t.budget ?? 100000),
      currency: t.currency || 'JPY',
      startDate: t.start_date || '',
      endDate: t.end_date || '',
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (t: any, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedTrip(t);
    setShowDeleteModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      budget: '100000',
      currency: 'JPY',
      startDate: '',
      endDate: '',
    });
  };

  const filteredTrips = useMemo(() => {
    if (!deferredSearchQuery.trim()) return trips;
    return trips.filter((t) => {
      const name = t.name || t.title || '';
      return name.toLowerCase().includes(deferredSearchQuery.toLowerCase());
    });
  }, [trips, deferredSearchQuery]);

  const totalCombinedBudgetInThb = useMemo(() => {
    return trips.reduce((acc, curr) => {
      const budget = Number(curr.total_budget ?? curr.budget ?? 0);
      const currCode = curr.currency || 'JPY';
      return acc + convertToThb(budget, currCode, fxRate);
    }, 0);
  }, [trips, fxRate]);

  const userCat = getCatAvatar(profile?.avatar_id);
  const userDisplayName = profile?.display_name || user?.email?.split('@')[0] || 'นักเดินทาง';

  // Interactive Cat Tips Widget State
  const CAT_TRAVEL_TIPS = [
    { id: 1, tag: 'iPhone 17 Pro Max 📱', text: 'เพิ่มบัตร Suica หรือ ICOCA ลง Apple Wallet บน iPhone แตะเข้าเกต JR และรถไฟใต้ดินได้ทันที ไม่ต้องต่อคิวซื้อตั๋ว!' },
    { id: 2, tag: 'Tax-Free Shopping 🛍️', text: 'ช้อปปิ้งที่ดองกี้หรือห้างในญี่ปุ่นเกิน 5,000 เยน แสดง Passport รับส่วนลดภาษี 10% ทันที' },
    { id: 3, tag: 'Exchange & Cash 💴', text: 'ร้านอาหารสตรีทฟู้ดและตู้กดตั๋วราเมงยังนิยมเงินสด พกเหรียญ 100/500 เยนติดกระเป๋าไว้เสมอ' },
    { id: 4, tag: 'Offline Mode ✈️', text: 'ทริปนี้รองรับโหมดออฟไลน์เต็มรูปแบบ แม้ไม่มีเน็ตบนเครื่องบินหรือรถไฟใต้ดินก็เปิดดูแพลนได้ 100%' },
    { id: 5, tag: 'Luggage & Trains 🧳', text: 'รถไฟชินคันเซ็นสำหรับกระเป๋าขนาดใหญ่ (รวมเกิน 160 ซม.) ต้องจองที่นั่งพร้อมที่วางสัมภาระล่วงหน้านะเมี้ยว!' }
  ];
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Quick Currency Mini-Calculator State
  const [quickCalcAmount, setQuickCalcAmount] = useState('10000');
  const [quickCalcCurr, setQuickCalcCurr] = useState<'JPY' | 'CNY' | 'USD' | 'EUR' | 'KRW'>('JPY');
  const quickRates: Record<string, { rate: number; label: string; symbol: string; flag: string }> = {
    JPY: { rate: fxRate || 0.235, label: 'JPY', symbol: '¥', flag: '🇯🇵' },
    CNY: { rate: 4.75, label: 'CNY', symbol: '元', flag: '🇨🇳' },
    USD: { rate: 34.50, label: 'USD', symbol: '$', flag: '🇺🇸' },
    EUR: { rate: 37.80, label: 'EUR', symbol: '€', flag: '🇪🇺' },
    KRW: { rate: 0.026, label: 'KRW', symbol: '₩', flag: '🇰🇷' },
  };

  // ทริปถัดไปที่มีกำหนดการเร็วที่สุด (Upcoming Spotlight)
  const upcomingTrip = useMemo(() => {
    if (!trips || trips.length === 0) return null;
    return trips.find((t) => t.start_date) || trips[0];
  }, [trips]);

  const daysUntilTrip = useMemo(() => {
    if (!upcomingTrip?.start_date) return null;
    const target = new Date(upcomingTrip.start_date);
    const now = new Date();
    target.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [upcomingTrip]);

  const openCreateModalWithIdea = (ideaTitle: string, curr: string = 'JPY') => {
    resetForm();
    setFormData((prev) => ({
      ...prev,
      title: ideaTitle,
      currency: curr,
    }));
    setShowCreateModal(true);
  };

  const handleQuickLogout = async () => {
    if (confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Signout error', err);
      } finally {
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch {}
        window.location.href = '/login';
      }
    }
  };

  const { pullDistance, isRefreshing, isReadyToRefresh } = usePullToRefresh({
    onRefresh: checkUserAndFetchTrips,
  });

  return (
    <div className="relative min-h-screen pb-20 bg-grid-pattern transition-colors duration-300">
      
      {/* iOS/iPad Touch Pull-to-Refresh Indicator */}
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        isReadyToRefresh={isReadyToRefresh}
      />
      
      {/* Background Floating Glow Orbs */}
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-rose-400/8 dark:bg-rose-400/10 rounded-full blur-3xl pointer-events-none animate-float-slow" />
      <div className="absolute top-60 right-10 w-80 h-80 bg-purple-500/8 dark:bg-purple-500/10 rounded-full blur-3xl pointer-events-none animate-float-reverse" />

      {/* ==================== TOP NAVIGATION ==================== */}
      <nav className="sticky top-0 z-40 border-b border-slate-200/90 dark:border-[#222c42] bg-white/98 dark:bg-[#151b2b]/98 shadow-xs transition-colors safe-top-nav">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              <img
                src="/app-logo.png"
                alt="Travel Tracker Logo"
                className="w-10 h-10 rounded-2xl object-cover shadow-md shadow-blue-500/20 border border-slate-200/90 dark:border-[#222c42] group-hover:scale-110 transition-transform"
              />
              <div>
                <span className="text-base md:text-lg font-black text-slate-900 dark:text-white">
                  Travel Tracker
                </span>
                <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-wider uppercase">
                  Expense & Itinerary Hub
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Notification Bell */}
            <NotificationBell tripTitle="Travel Hub" />

            {/* Profile Avatar Button */}
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-2 p-1.5 pr-3 rounded-2xl border border-slate-200/90 dark:border-[#222c42] bg-white/90 dark:bg-[#1c2438]/90 hover:border-blue-400 dark:hover:border-blue-500 hover:scale-105 shadow-xs transition-all cursor-pointer group"
              title="ตั้งค่าโปรไฟล์"
            >
              <div className={`w-7 h-7 rounded-xl bg-gradient-to-tr ${userCat.bgGradient} flex items-center justify-center text-sm shadow-sm group-hover:scale-110 transition-transform overflow-hidden`}>
                {userCat.imgUrl ? (
                  <img src={userCat.imgUrl} alt={userCat.name} className="w-full h-full object-cover" />
                ) : (
                  userCat.emoji
                )}
              </div>
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 max-w-[100px] truncate hidden sm:inline">
                {userDisplayName}
              </span>
            </button>

            {/* Dark/Light Switcher */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2.5 rounded-2xl border border-slate-200/90 dark:border-[#222c42] bg-white/90 dark:bg-[#1c2438]/90 text-slate-700 dark:text-slate-200 hover:border-blue-400 dark:hover:border-blue-500 hover:rotate-45 shadow-xs transition-all duration-300 cursor-pointer"
              title="สลับโหมด มืด/สว่าง"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-blue-600" />}
            </button>

            {/* Quick Logout Button */}
            <button
              onClick={handleQuickLogout}
              className="p-2.5 rounded-2xl border border-slate-200/90 dark:border-[#222c42] bg-white/90 dark:bg-[#1c2438]/90 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:border-rose-400 shadow-xs transition-all cursor-pointer"
              title="ออกจากระบบ (Sign Out)"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* ==================== MAIN CONTENT CONTAINER ==================== */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 pt-6 space-y-6">

        {/* ==================== WELCOME & STATS ROW ==================== */}
        {/* ==================== 1. WELCOME & STATS & INTERACTIVE COMPANION DECK ==================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Left: User Welcome & Stats & Cat AI Interactive Tip */}
          <div className="md:col-span-2 p-5 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-[#222c42] bg-gradient-to-br from-blue-50/60 via-indigo-50/30 to-white dark:from-[#151b2b] dark:via-[#1c2438] dark:to-[#151b2b] bg-white/95 dark:bg-[#151b2b]/95 backdrop-blur-xl card-elevation relative overflow-hidden group space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${userCat.bgGradient} flex items-center justify-center text-2xl shadow-md group-hover:scale-105 transition-transform overflow-hidden ring-2 ring-white dark:ring-[#222c42]`}>
                  {userCat.imgUrl ? (
                    <img src={userCat.imgUrl} alt={userCat.name} className="w-full h-full object-cover" />
                  ) : (
                    userCat.emoji
                  )}
                </div>
                <div>
                  <h1 className="text-lg md:text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>สวัสดี, {userDisplayName}!</span>
                    <span className="text-xl animate-float-slow">✈️</span>
                  </h1>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    จัดการแผนเที่ยว สแกนใบเสร็จด้วย AI และติดตามงบประมาณทริปของคุณ
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100/70 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 text-[11px] font-bold border border-blue-200/60 dark:border-blue-900/60 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>พร้อมใช้งาน & ซิงค์คลาวด์</span>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-white/70 dark:bg-[#111624]/60 border border-slate-200/70 dark:border-[#222c42]">
              <div>
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Compass className="h-3 w-3 text-blue-500" />
                  <span>ทริปทั้งหมด</span>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                  {trips.length} <span className="text-xs font-bold text-blue-600 dark:text-blue-400">ทริป</span>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Coins className="h-3 w-3 text-amber-500" />
                  <span>งบประมาณรวมทุกทริป</span>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5 truncate">
                  ≈ ฿{Math.round(totalCombinedBudgetInThb).toLocaleString()}{' '}
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">THB</span>
                </div>
              </div>
            </div>

            {/* Interactive Cat AI Mascot Tip of the Day */}
            <div className="relative p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 flex items-start gap-3 shadow-2xs">
              <span className="text-2xl select-none animate-bounce shrink-0 mt-0.5">🐱</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800">
                    {CAT_TRAVEL_TIPS[currentTipIndex].tag}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentTipIndex((prev) => (prev + 1) % CAT_TRAVEL_TIPS.length)}
                    className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 flex items-center gap-1 cursor-pointer active:scale-95 transition-transform"
                    title="สุ่มอ่านทริคถัดไป"
                  >
                    <Shuffle className="h-3 w-3" />
                    <span>สุ่มทิปใหม่ 🎲</span>
                  </button>
                </div>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={currentTipIndex}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-relaxed"
                  >
                    {CAT_TRAVEL_TIPS[currentTipIndex].text}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Right: Live Currency Radar & Instant Mini-Calculator */}
          <div className="p-5 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-[#222c42] bg-white/95 dark:bg-[#151b2b]/95 card-elevation flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800 font-mono shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live FX Radar</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono font-medium">1 JPY = {fxRate} THB</span>
              </div>

              <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>คำนวณแปลงเงินด่วน</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                แตะเลือกสกุลเงินและพิมพ์ยอดเพื่อแปลงเป็นเงินบาททันที
              </p>

              {/* Currency Selector Pills */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {(['JPY', 'CNY', 'USD', 'EUR', 'KRW'] as const).map((curr) => {
                  const info = quickRates[curr];
                  const isSelected = quickCalcCurr === curr;
                  return (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => setQuickCalcCurr(curr)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all border cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs scale-105'
                          : 'bg-slate-50 dark:bg-[#1c2438] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#222c42] hover:border-blue-300'
                      }`}
                    >
                      {info.flag} {info.label}
                    </button>
                  );
                })}
              </div>

              {/* Mini Calculator Input & Live Result */}
              <div className="mt-3 p-3 rounded-2xl bg-slate-50/80 dark:bg-[#111624] border border-slate-200 dark:border-[#222c42] space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-bold text-slate-400">ระบุยอด ({quickCalcCurr}):</span>
                  <input
                    type="number"
                    value={quickCalcAmount}
                    onChange={(e) => setQuickCalcAmount(e.target.value)}
                    className="w-28 text-right font-mono font-black text-sm p-1 rounded-lg border border-slate-200 dark:border-[#222c42] bg-white dark:bg-[#151b2b] text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    placeholder="10000"
                  />
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-[#222c42]">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">เทียบเท่าเงินบาท:</span>
                  <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-base">
                    ≈ ฿{Math.round((Number(quickCalcAmount) || 0) * (quickRates[quickCalcCurr]?.rate || 1)).toLocaleString()} THB
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowJoinModal(true)}
              className="w-full py-2.5 px-4 rounded-2xl border border-blue-200/80 dark:border-[#222c42] bg-blue-50/40 dark:bg-[#1c2438] text-blue-600 dark:text-blue-400 font-bold text-xs hover:border-blue-400 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <KeyRound className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>เข้าร่วมด้วยรหัสเชิญทริป</span>
            </button>
          </div>
        </div>

        {/* ==================== 2. FEATURED UPCOMING TRIP SPOTLIGHT ==================== */}
        {upcomingTrip && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="p-5 sm:p-6 rounded-3xl border border-blue-200/90 dark:border-blue-900/60 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-xl shadow-blue-500/15 card-elevation relative overflow-hidden"
          >
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-md text-white border border-white/30 flex items-center gap-1.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>ทริปไฮไลต์ที่จะถึงนี้</span>
                  </span>

                  {daysUntilTrip !== null && (
                    <span className="px-3 py-1 rounded-full text-[10px] font-black bg-amber-400 text-amber-950 shadow-sm flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {daysUntilTrip > 0
                        ? `อีก ${daysUntilTrip} วันจะออกเดินทาง! ✈️`
                        : daysUntilTrip === 0
                        ? 'ออกเดินทางวันนี้! 🎉'
                        : 'ทริปท่องเที่ยว 🗺️'}
                    </span>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <span>🏯</span>
                  <span>{upcomingTrip.name || upcomingTrip.title}</span>
                </h2>

                <div className="flex flex-wrap items-center gap-3 text-xs text-white/90 font-medium">
                  {upcomingTrip.start_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-blue-200" />
                      <span>{new Date(upcomingTrip.start_date).toLocaleDateString('th-TH')} - {upcomingTrip.end_date ? new Date(upcomingTrip.end_date).toLocaleDateString('th-TH') : 'ไม่ระบุวันกลับ'}</span>
                    </span>
                  )}
                  <span className="opacity-60">•</span>
                  <span className="flex items-center gap-1">
                    <CloudSun className="h-3.5 w-3.5 text-amber-300" />
                    <span>Osaka 19°C 🌤️ อากาศดี ท้องฟ้าแจ่มใส</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full md:w-auto">
                <Link
                  href={`/trips/${upcomingTrip.id}`}
                  className="flex-1 md:flex-none px-5 py-3 rounded-2xl bg-white text-blue-700 hover:bg-blue-50 font-black text-xs sm:text-sm shadow-lg shadow-black/10 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>เข้าสู่ทริปทันที</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Background Decorative Pattern */}
            <div className="absolute right-0 bottom-0 text-8xl opacity-10 pointer-events-none select-none translate-x-4 translate-y-4">
              🎌
            </div>
          </motion.div>
        )}

        {/* ==================== 3. ACTION BAR & SEARCH ==================== */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อทริป หรือจุดหมายปลายทาง..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-[#222c42] bg-white/90 dark:bg-[#151b2b]/90 text-slate-900 dark:text-slate-100 text-xs outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 shadow-xs transition-all font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black shadow-md shadow-blue-500/25 hover:scale-105 active:scale-95 transition-all cursor-pointer glow-blue"
            >
              <Plus className="h-4 w-4" />
              <span>สร้างทริปใหม่</span>
            </button>
          </div>
        </div>

        {/* ==================== 4. TRIP CARDS GRID & INSPIRATION BOARD ==================== */}
        {loading && trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">กำลังโหลดรายการทริป...</span>
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-[#222c42] rounded-3xl p-8 bg-white/60 dark:bg-[#151b2b]/60 shadow-sm">
            <PlaneTakeoff className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-3 animate-float-slow" />
            <h3 className="font-black text-base text-slate-900 dark:text-slate-100 mb-1">ยังไม่มีทริปท่องเที่ยว</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-5 max-w-sm mx-auto font-medium">
              สร้างทริปแรกของคุณเพื่อเริ่มจัดทำแผนเที่ยวและติดตามค่าใช้จ่าย
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 hover:scale-105 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" /> สร้างทริปแรกเลย
            </button>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.08 }
              }
            }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5"
          >
            {filteredTrips.map((t) => {
              const tripName = t.name || t.title || 'ทริปท่องเที่ยว';
              const tripBudget = Number(t.total_budget ?? t.budget ?? 0);
              const isJapan = tripName.toLowerCase().includes('osaka') || tripName.toLowerCase().includes('kyoto') || tripName.toLowerCase().includes('tokyo') || tripName.toLowerCase().includes('japan') || t.currency === 'JPY';

              return (
                <motion.div
                  key={t.id}
                  variants={{
                    hidden: { opacity: 0, y: 16 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
                  }}
                  whileHover={{ y: -6, transition: { duration: 0.2 } }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    window.location.href = `/trips/${t.id}`;
                  }}
                  className="group relative rounded-3xl border border-slate-200/90 dark:border-[#222c42] bg-white/95 dark:bg-[#151b2b]/95 card-elevation hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-xl hover:shadow-blue-500/10"
                >
                  {/* Card Cover Header with Destination Badge */}
                  <div className={`p-4 bg-gradient-to-r ${isJapan ? 'from-rose-500/15 via-blue-500/10 to-indigo-500/10' : 'from-blue-500/15 to-indigo-500/10'} border-b border-slate-100 dark:border-[#222c42] flex items-center justify-between gap-2`}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xl">{isJapan ? '🏯' : '✈️'}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-600 text-white shadow-2xs">
                        {t.currency || 'JPY'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => openEditModal(t, e)}
                        className="p-1.5 rounded-xl hover:bg-white/80 dark:hover:bg-[#1c2438] text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                        title="แก้ไขทริป"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => openDeleteModal(t, e)}
                        className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                        title="ลบทริป"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="font-black text-base text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                        {tripName}
                      </h3>
                      {t.start_date && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>{new Date(t.start_date).toLocaleDateString('th-TH')} - {t.end_date ? new Date(t.end_date).toLocaleDateString('th-TH') : 'ไม่ระบุวันกลับ'}</span>
                        </p>
                      )}
                    </div>

                    {/* Actions & Budget Row */}
                    <div className="pt-3 border-t border-slate-100 dark:border-[#222c42] flex items-center justify-between gap-2">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        งบ: <span className="font-black text-slate-900 dark:text-slate-200">{tripBudget > 0 ? `${tripBudget.toLocaleString()} ${t.currency || 'JPY'}` : 'ไม่ระบุ'}</span>
                      </div>

                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 group-hover:bg-blue-600 group-hover:text-white dark:bg-[#1c2438] dark:group-hover:bg-blue-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer shadow-2xs">
                        <span>เข้าชม</span>
                        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Inspiration Board: "+ ปักหมุดทริปในฝันครั้งต่อไป" to fill empty space */}
            {filteredTrips.length < 4 && (
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 16 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
                }}
                whileHover={{ y: -4 }}
                className="p-5 rounded-3xl border-2 border-dashed border-blue-200 dark:border-[#222c42] bg-blue-50/20 dark:bg-[#151b2b]/40 flex flex-col justify-between space-y-3 hover:border-blue-400 transition-all group"
              >
                <div>
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black text-xs mb-2">
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    <span>ปักหมุดทริปในฝันถัดไป</span>
                  </div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">
                    อยากไปเที่ยวที่ไหนต่อ? 🗺️
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    แตะที่ไอเดียจุดหมายเพื่อเริ่มวางแผนทริปใหม่ได้ทันที
                  </p>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <button
                      type="button"
                      onClick={() => openCreateModalWithIdea('Tokyo Cherry Blossom Trip', 'JPY')}
                      className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#1c2438] border border-slate-200 dark:border-[#222c42] hover:border-rose-300 text-xs font-bold text-slate-700 dark:text-slate-300 hover:scale-105 transition-all cursor-pointer shadow-2xs"
                    >
                      🌸 โตเกียว (Tokyo)
                    </button>
                    <button
                      type="button"
                      onClick={() => openCreateModalWithIdea('Hokkaido Winter Wonderland', 'JPY')}
                      className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#1c2438] border border-slate-200 dark:border-[#222c42] hover:border-blue-300 text-xs font-bold text-slate-700 dark:text-slate-300 hover:scale-105 transition-all cursor-pointer shadow-2xs"
                    >
                      ❄️ ฮอกไกโด (Hokkaido)
                    </button>
                    <button
                      type="button"
                      onClick={() => openCreateModalWithIdea('Seoul Cafe & Shopping Trip', 'KRW')}
                      className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#1c2438] border border-slate-200 dark:border-[#222c42] hover:border-purple-300 text-xs font-bold text-slate-700 dark:text-slate-300 hover:scale-105 transition-all cursor-pointer shadow-2xs"
                    >
                      🇰🇷 โซล (Seoul)
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openCreateModal}
                  className="w-full py-2.5 rounded-2xl bg-white dark:bg-[#1c2438] hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>สร้างทริปใหม่ตามใจคุณ</span>
                </button>
              </motion.div>
            )}
          </motion.div>
        )}


      </main>

      {/* ==================== PROFILE SETTINGS MODAL ==================== */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
        onProfileUpdated={(updated) => setProfile((prev: any) => ({ ...prev, ...updated }))}
      />

      {/* ==================== CREATE TRIP MODAL ==================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#151b2b] shadow-2xl border border-slate-200/90 dark:border-[#222c42] max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200 glow-blue">
            {/* Mobile Sheet Handle */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />
            
            {/* Modal Header */}
            <div className="p-4 sm:p-6 pb-4 flex justify-between items-center border-b border-slate-200/90 dark:border-[#222c42]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-lg shadow-md shadow-blue-500/25">
                  ✈️
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-slate-100">
                    สร้างทริปท่องเที่ยวใหม่ 🎌
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    กำหนดชื่อทริป, งบประมาณ และช่วงเวลาเดินทาง
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowCreateModal(false)} 
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1c2438] transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleCreateTrip} className="p-6 pt-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-800 dark:text-slate-200">
                  ชื่อทริปท่องเที่ยว *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น Japan Osaka & Tokyo Trip (04-15 Dec 2026)"
                  className="w-full p-3 rounded-2xl border border-slate-200 dark:border-[#222c42] bg-slate-50/60 dark:bg-[#1c2438] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-bold shadow-2xs transition-all"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              {/* Budget & Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-800 dark:text-slate-200">
                    งบประมาณรวมทริป
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      placeholder="100000"
                      className="w-full p-3 rounded-2xl border border-slate-200 dark:border-[#222c42] bg-slate-50/60 dark:bg-[#1c2438] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-black shadow-2xs transition-all"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      {formData.currency}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-800 dark:text-slate-200">
                    สกุลเงินหลัก
                  </label>
                  <select
                    className="w-full p-3 rounded-2xl border border-slate-200 dark:border-[#222c42] bg-slate-50/60 dark:bg-[#1c2438] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-600 font-bold shadow-2xs cursor-pointer transition-all"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  >
                    <option value="JPY">🇯🇵 JPY (เยนญี่ปุ่น - ¥)</option>
                    <option value="THB">🇹🇭 THB (บาทไทย - ฿)</option>
                    <option value="CNY">🇨🇳 CNY (หยวนจีน - 元)</option>
                    <option value="USD">🇺🇸 USD (ดอลลาร์สหรัฐ - $)</option>
                    <option value="EUR">🇪🇺 EUR (ยูโร - €)</option>
                    <option value="KRW">🇰🇷 KRW (วอนเกาหลี - ₩)</option>
                    <option value="GBP">🇬🇧 GBP (ปอนด์อังกฤษ - £)</option>
                    <option value="SGD">🇸🇬 SGD (ดอลลาร์สิงคโปร์ - S$)</option>
                  </select>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 mr-1">งบแนะนำ:</span>
                {['50000', '100000', '200000', '300000'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setFormData({ ...formData, budget: preset })}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                      formData.budget === preset
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-[#1c2438] text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-[#222c42] border border-slate-200 dark:border-[#222c42]'
                    }`}
                  >
                    {Number(preset).toLocaleString()} {formData.currency}
                  </button>
                ))}
              </div>

              {/* Travel Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-800 dark:text-slate-200">
                    วันเริ่มเดินทาง (Start Date)
                  </label>
                  <input
                    type="date"
                    className="w-full p-3 rounded-2xl border border-slate-200 dark:border-[#222c42] bg-slate-50/60 dark:bg-[#1c2438] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-600 shadow-2xs font-medium transition-all"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-800 dark:text-slate-200">
                    วันเดินทางกลับ (End Date)
                  </label>
                  <input
                    type="date"
                    className="w-full p-3 rounded-2xl border border-slate-200 dark:border-[#222c42] bg-slate-50/60 dark:bg-[#1c2438] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-600 shadow-2xs font-medium transition-all"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-3 border-t border-slate-200/90 dark:border-[#222c42]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-[#222c42] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1c2438] transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> กำลังสร้างทริป...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" /> สร้างทริปเลย
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== CREATE SUCCESS MODAL TOAST ==================== */}
      {createdTripSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#151b2b] shadow-2xl border border-blue-400/50 glow-blue p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-blue-600 text-white text-3xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30 animate-bounce">
              🎉
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                Created Successfully
              </span>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 mt-2">
                สร้างทริปสำเร็จเรียบร้อยแล้ว! ✈️
              </h3>
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1 line-clamp-1">
                {createdTripSuccess.name}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1c2438] border border-slate-200 dark:border-[#222c42] text-xs font-medium text-slate-600 dark:text-slate-300">
              กำลังนำคุณเข้าสู่หน้าแผนการเดินทาง...
              <div className="w-full bg-slate-200 dark:bg-[#111622] rounded-full h-1.5 overflow-hidden mt-2">
                <div className="h-full bg-blue-600 rounded-full animate-pulse w-full" />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                window.location.href = `/trips/${createdTripSuccess.id}`;
              }}
              className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 hover:scale-105 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>เข้าสู่หน้าทริปทันที</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ==================== EDIT TRIP MODAL ==================== */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#151b2b] shadow-2xl border border-slate-200/90 dark:border-[#222c42] max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200 glow-blue">
            {/* Mobile Sheet Handle */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />
            
            <div className="p-4 sm:p-6 pb-4 flex justify-between items-center border-b border-slate-200/90 dark:border-[#222c42]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-lg shadow-md shadow-blue-500/25">
                  ✏️
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-slate-100">
                    แก้ไขรายละเอียดทริป
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    ปรับปรุงชื่อทริป, งบประมาณ และช่วงเวลาเดินทาง
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowEditModal(false)} 
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1c2438] transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTrip} className="p-6 pt-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-800 dark:text-slate-200">ชื่อทริป *</label>
                <input
                  type="text"
                  required
                  className="w-full p-3 rounded-2xl border border-slate-200 dark:border-[#222c42] bg-slate-50/60 dark:bg-[#1c2438] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-bold shadow-2xs transition-all"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-800 dark:text-slate-200">งบประมาณ</label>
                  <input
                    type="number"
                    required
                    className="w-full p-3 rounded-2xl border border-slate-200 dark:border-[#222c42] bg-slate-50/60 dark:bg-[#1c2438] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-black shadow-2xs transition-all"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-800 dark:text-slate-200">สกุลเงินหลัก</label>
                  <select
                    className="w-full p-3 rounded-2xl border border-slate-200 dark:border-[#222c42] bg-slate-50/60 dark:bg-[#1c2438] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-600 font-bold shadow-2xs cursor-pointer transition-all"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  >
                    <option value="JPY">🇯🇵 JPY (¥)</option>
                    <option value="THB">🇹🇭 THB (฿)</option>
                    <option value="CNY">🇨🇳 CNY (元)</option>
                    <option value="USD">🇺🇸 USD ($)</option>
                    <option value="EUR">🇪🇺 EUR (€)</option>
                    <option value="KRW">🇰🇷 KRW (₩)</option>
                    <option value="GBP">🇬🇧 GBP (£)</option>
                    <option value="SGD">🇸🇬 SGD (S$)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-800 dark:text-slate-200">วันเริ่มเดินทาง</label>
                  <input
                    type="date"
                    className="w-full p-3 rounded-2xl border border-slate-200 dark:border-[#222c42] bg-slate-50/60 dark:bg-[#1c2438] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-600 shadow-2xs font-medium transition-all"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-800 dark:text-slate-200">วันเดินทางกลับ</label>
                  <input
                    type="date"
                    className="w-full p-3 rounded-2xl border border-slate-200 dark:border-[#222c42] bg-slate-50/60 dark:bg-[#1c2438] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-600 shadow-2xs font-medium transition-all"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-200/90 dark:border-[#222c42]">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-[#222c42] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1c2438] transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== JOIN TRIP MODAL ==================== */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#151b2b] shadow-2xl border border-slate-200/90 dark:border-[#222c42] max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200 glow-blue">
            {/* Mobile Sheet Handle */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />
            
            <div className="p-4 sm:p-6 pb-4 flex justify-between items-center border-b border-slate-200/90 dark:border-[#222c42]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-lg shadow-md shadow-blue-500/25">
                  🔑
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-slate-100">
                    เข้าร่วมทริปท่องเที่ยว 👥
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    ใส่รหัสเชิญ (Trip ID) ที่เพื่อนแชร์ให้คุณ
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowJoinModal(false)} 
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1c2438] transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleJoinTrip} className="p-4 sm:p-6 pt-4 sm:pt-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-800 dark:text-slate-200">
                  รหัสเชิญเข้าร่วมทริป (Trip ID) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น 123e4567-e89b-12d3-a456-426614174000"
                  className="w-full p-3 rounded-2xl border border-slate-200 dark:border-[#222c42] bg-slate-50/60 dark:bg-[#1c2438] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-mono shadow-2xs transition-all"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                />
              </div>

              {joinError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 border border-rose-200 dark:border-rose-900">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{joinError}</span>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-[#222c42] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1c2438] transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={joinLoading}
                  className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {joinLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> กำลังตรวจสอบ...
                    </>
                  ) : (
                    <>
                      <Users className="h-4 w-4" /> เข้าร่วมทริป
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== DELETE TRIP MODAL ==================== */}
      {showDeleteModal && selectedTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#151b2b] shadow-2xl border border-rose-500/40 glow-rose p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 flex items-center justify-center text-2xl mx-auto shadow-md">
              <Trash2 className="h-7 w-7" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                ยืนยันการลบทริปนี้?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                คุณต้องการลบทริป <b className="text-rose-600 dark:text-rose-400 font-bold">&quot;{selectedTrip.name || selectedTrip.title}&quot;</b> ใช่หรือไม่? ข้อมูลแผนเที่ยวและรายจ่ายทั้งหมดจะถูกลบถาวร
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-[#222c42] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1c2438] transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeleteTrip}
                disabled={actionLoading}
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/25 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? 'กำลังลบ...' : 'ลบทริปถาวร'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
