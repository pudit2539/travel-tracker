// src/app/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Compass, Plus, Calendar, DollarSign, ArrowRight, 
  LogOut, Moon, Sun, PlaneTakeoff, Search, Edit3, 
  Trash2, Users, Sparkles, TrendingUp, AlertCircle, 
  Share2, CheckCircle2, Loader2, X, User, Bell, Coins, 
  Check, ArrowUpRight, Shield, Globe2, KeyRound, Sparkle
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import ProfileModal from '@/components/ProfileModal';
import NotificationBell from '@/components/NotificationBell';
import { getCatAvatar } from '@/lib/avatars';
import { getCustomJpyToThbRate, setCustomJpyToThbRate, formatCurrencyWithThb } from '@/lib/currency';

export default function HomePage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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
    if (!searchQuery.trim()) return trips;
    return trips.filter((t) => {
      const name = t.name || t.title || '';
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [trips, searchQuery]);

  const totalCombinedBudget = useMemo(() => {
    return trips.reduce((acc, curr) => acc + Number(curr.total_budget ?? curr.budget ?? 0), 0);
  }, [trips]);

  const userCat = getCatAvatar(profile?.avatar_id);
  const userDisplayName = profile?.display_name || user?.email?.split('@')[0] || 'นักเดินทาง';

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

  return (
    <div className="relative min-h-screen pb-20 bg-grid-pattern transition-colors duration-300">
      
      {/* Background Floating Glow Orbs */}
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-pink-500/10 dark:bg-pink-500/15 rounded-full blur-3xl pointer-events-none animate-float-slow" />
      <div className="absolute top-60 right-10 w-80 h-80 bg-purple-600/10 dark:bg-purple-600/15 rounded-full blur-3xl pointer-events-none animate-float-reverse" />

      {/* ==================== TOP NAVIGATION ==================== */}
      <nav className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-purple-900/40 bg-white/85 dark:bg-[#090611]/85 backdrop-blur-xl transition-colors">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              <img
                src="/app-logo.png"
                alt="Travel Tracker Logo"
                className="w-10 h-10 rounded-2xl object-cover shadow-md shadow-pink-500/25 border border-pink-300/60 dark:border-purple-800/80 group-hover:scale-110 transition-transform"
              />
              <div>
                <span className="text-base md:text-lg font-black bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 dark:from-pink-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  Travel Tracker
                </span>
                <span className="block text-[10px] text-slate-500 dark:text-purple-300/70 font-bold tracking-wider uppercase">
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
              className="flex items-center gap-2 p-1.5 pr-3 rounded-2xl border border-slate-200/80 dark:border-purple-800/80 bg-white/90 dark:bg-[#130d22]/90 hover:border-pink-500 hover:scale-105 shadow-xs transition-all cursor-pointer group"
              title="ตั้งค่าโปรไฟล์"
            >
              <div className={`w-7 h-7 rounded-xl bg-gradient-to-tr ${userCat.bgGradient} flex items-center justify-center text-sm shadow-sm group-hover:scale-110 transition-transform overflow-hidden`}>
                {userCat.imgUrl ? (
                  <img src={userCat.imgUrl} alt={userCat.name} className="w-full h-full object-cover" />
                ) : (
                  userCat.emoji
                )}
              </div>
              <span className="text-xs font-black text-slate-800 dark:text-purple-100 max-w-[100px] truncate hidden sm:inline">
                {userDisplayName}
              </span>
            </button>

            {/* Dark/Light Switcher */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2.5 rounded-2xl border border-slate-200/80 dark:border-purple-800/80 bg-white/90 dark:bg-[#130d22]/90 text-slate-700 dark:text-purple-200 hover:border-pink-500 hover:rotate-45 shadow-xs transition-all duration-300 cursor-pointer"
              title="สลับโหมด มืด/สว่าง"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-purple-600" />}
            </button>

            {/* Quick Logout Button */}
            <button
              onClick={handleQuickLogout}
              className="p-2.5 rounded-2xl border border-slate-200/80 dark:border-purple-800/80 bg-white/90 dark:bg-[#130d22]/90 text-slate-500 hover:text-rose-600 dark:text-purple-300 dark:hover:text-rose-400 hover:border-rose-400 shadow-xs transition-all cursor-pointer"
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 p-6 rounded-3xl border border-purple-200/70 dark:border-purple-800/50 bg-gradient-to-br from-pink-500/10 via-purple-600/10 to-indigo-600/10 bg-white/90 dark:bg-[#130d22]/90 backdrop-blur-xl card-elevation relative overflow-hidden group">
            <div className="flex items-center gap-3.5 mb-2">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${userCat.bgGradient} flex items-center justify-center text-2xl shadow-md group-hover:scale-105 transition-transform overflow-hidden`}>
                {userCat.imgUrl ? (
                  <img src={userCat.imgUrl} alt={userCat.name} className="w-full h-full object-cover" />
                ) : (
                  userCat.emoji
                )}
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-black text-slate-900 dark:text-white">
                  สวัสดี, {userDisplayName}! ✈️
                </h1>
                <p className="text-xs text-slate-600 dark:text-purple-300/80 font-medium">
                  จัดการแผนเที่ยว สแกนใบเสร็จด้วย AI และติดตามงบประมาณทริปของคุณ
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-purple-200/60 dark:border-purple-900/40">
              <div>
                <div className="text-[11px] font-bold text-slate-500 dark:text-purple-300/70">ทริปทั้งหมด</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  {trips.length} <span className="text-sm font-bold text-pink-600 dark:text-pink-400">ทริป</span>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold text-slate-500 dark:text-purple-300/70">งบประมาณรวมทุกทริป</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  {totalCombinedBudget.toLocaleString()} <span className="text-sm font-bold text-pink-600 dark:text-pink-400">JPY</span>
                </div>
                <div className="text-[10px] text-slate-400 dark:text-purple-400 font-medium">
                  ≈ ฿{Math.round(totalCombinedBudget * fxRate).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-purple-900/50 bg-white/95 dark:bg-[#130d22]/95 card-elevation flex flex-col justify-between space-y-4">
            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300 border border-pink-200 dark:border-pink-900 mb-2">
                100 JPY = {(fxRate * 100).toFixed(2)} THB
              </div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                Smart Travel Tools
              </h3>
              <p className="text-xs text-slate-500 dark:text-purple-300/70 mt-1 font-medium">
                พยากรณ์อากาศสด, เส้นทางท่องเที่ยว และระบบเคลียร์บิลหารเงินอัตโนมัติ
              </p>
            </div>

            <button
              onClick={() => setShowJoinModal(true)}
              className="w-full py-2.5 px-4 rounded-2xl border border-purple-300 dark:border-purple-800 bg-purple-50/60 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 font-bold text-xs hover:border-pink-500 hover:scale-[1.02] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <KeyRound className="h-3.5 w-3.5 text-pink-500" />
              <span>เข้าร่วมด้วยรหัสเชิญ</span>
            </button>
          </div>
        </div>

        {/* ==================== ACTION BAR & SEARCH ==================== */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-purple-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อทริป หรือจุดหมายปลายทาง..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 dark:border-purple-800/60 bg-white/90 dark:bg-[#130d22]/90 text-slate-900 dark:text-slate-100 text-xs outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 shadow-xs transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>สร้างทริปใหม่</span>
            </button>
          </div>
        </div>

        {/* ==================== TRIP CARDS LIST ==================== */}
        {loading && trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
            <span className="text-xs font-bold text-slate-500 dark:text-purple-400">กำลังโหลดรายการทริป...</span>
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-slate-300 dark:border-purple-900/50 rounded-3xl p-8 bg-white/60 dark:bg-[#130d22]/60 shadow-sm">
            <PlaneTakeoff className="h-12 w-12 text-pink-500 mx-auto mb-3 animate-float-slow" />
            <h3 className="font-black text-base text-slate-900 dark:text-white mb-1">ยังไม่มีทริปท่องเที่ยว</h3>
            <p className="text-xs text-slate-600 dark:text-purple-300/70 mb-5 max-w-sm mx-auto font-medium">
              สร้างทริปแรกของคุณเพื่อเริ่มจัดทำแผนเที่ยวและติดตามค่าใช้จ่าย
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-md shadow-pink-500/25 hover:scale-105 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" /> สร้างทริปแรกเลย
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTrips.map((t) => {
              const tripName = t.name || t.title || 'ทริปท่องเที่ยว';
              const tripBudget = Number(t.total_budget ?? t.budget ?? 0);

              return (
                <div
                  key={t.id}
                  onClick={() => {
                    window.location.href = `/trips/${t.id}`;
                  }}
                  className="group relative p-5 rounded-3xl border border-slate-200/90 dark:border-purple-900/50 bg-white/95 dark:bg-[#130d22]/95 card-elevation hover:-translate-y-1.5 hover:border-pink-500/60 dark:hover:border-pink-500/60 transition-all duration-300 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300 border border-pink-200 dark:border-pink-900 shadow-2xs">
                        {t.currency || 'JPY'}
                      </span>
                      
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => openEditModal(t, e)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-purple-900/60 text-slate-400 hover:text-purple-600 dark:hover:text-purple-300 transition-colors cursor-pointer"
                          title="แก้ไขทริป"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => openDeleteModal(t, e)}
                          className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                          title="ลบทริป"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-black text-base text-slate-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors line-clamp-1">
                      {tripName}
                    </h3>

                    <div className="mt-2.5 space-y-1.5 text-xs text-slate-600 dark:text-purple-300/80 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-purple-400" />
                        <span>{t.start_date ? new Date(t.start_date).toLocaleDateString('th-TH') : 'ไม่ระบุวัน'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5 text-pink-500" />
                        <span>งบประมาณ: <b className="text-slate-900 dark:text-white">{tripBudget.toLocaleString()}</b> {t.currency}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-purple-900/40 flex justify-between items-center text-xs font-black text-pink-600 dark:text-pink-400">
                    <span>เปิดดูแผนเที่ยว</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1.5 transition-transform duration-300" />
                  </div>
                </div>
              );
            })}
          </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#130d22] shadow-2xl border border-slate-200/90 dark:border-purple-800/60 glow-pink-purple max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 pb-4 flex justify-between items-center border-b border-slate-100 dark:border-purple-900/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white text-lg shadow-md shadow-pink-500/25">
                  ✈️
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    สร้างทริปท่องเที่ยวใหม่ 🎌
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-purple-300/70 font-medium">
                    กำหนดชื่อทริป, งบประมาณ และช่วงเวลาเดินทาง
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowCreateModal(false)} 
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-purple-200 hover:bg-slate-100 dark:hover:bg-purple-950/50 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleCreateTrip} className="p-6 pt-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-800 dark:text-purple-200">
                  ชื่อทริปท่องเที่ยว *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น Japan Osaka & Tokyo Trip (04-15 Dec 2026)"
                  className="w-full p-3 rounded-2xl border border-slate-300 dark:border-purple-800 bg-slate-50/60 dark:bg-[#1c1328] text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-bold shadow-2xs"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              {/* Budget & Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-800 dark:text-purple-200">
                    งบประมาณรวมทริป
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      placeholder="100000"
                      className="w-full p-3 rounded-2xl border border-slate-300 dark:border-purple-800 bg-slate-50/60 dark:bg-[#1c1328] text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-black shadow-2xs"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      {formData.currency}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-800 dark:text-purple-200">
                    สกุลเงินหลัก
                  </label>
                  <select
                    className="w-full p-3 rounded-2xl border border-slate-300 dark:border-purple-800 bg-slate-50/60 dark:bg-[#1c1328] text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-bold shadow-2xs cursor-pointer"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  >
                    <option value="JPY">🇯🇵 JPY (เยนญี่ปุ่น - ¥)</option>
                    <option value="THB">🇹🇭 THB (บาทไทย - ฿)</option>
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
                        ? 'bg-pink-500 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-purple-950/60 text-slate-600 dark:text-purple-300 hover:bg-slate-200'
                    }`}
                  >
                    {Number(preset).toLocaleString()} {formData.currency}
                  </button>
                ))}
              </div>

              {/* Travel Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-800 dark:text-purple-200">
                    วันเริ่มเดินทาง (Start Date)
                  </label>
                  <input
                    type="date"
                    className="w-full p-3 rounded-2xl border border-slate-300 dark:border-purple-800 bg-slate-50/60 dark:bg-[#1c1328] text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 shadow-2xs font-medium"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-800 dark:text-purple-200">
                    วันเดินทางกลับ (End Date)
                  </label>
                  <input
                    type="date"
                    className="w-full p-3 rounded-2xl border border-slate-300 dark:border-purple-800 bg-slate-50/60 dark:bg-[#1c1328] text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 shadow-2xs font-medium"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-purple-900/40">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 rounded-2xl border border-slate-300 dark:border-purple-800 text-xs font-bold text-slate-700 dark:text-purple-200 hover:bg-slate-100 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-pink-500/25 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#130d22] shadow-2xl border border-pink-500/50 glow-pink-purple p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 text-white text-3xl flex items-center justify-center mx-auto shadow-lg shadow-pink-500/30 animate-bounce">
              🎉
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-950/80 px-2.5 py-0.5 rounded-full border border-pink-200 dark:border-pink-900">
                Created Successfully
              </span>
              <h3 className="text-base font-black text-slate-900 dark:text-white mt-2">
                สร้างทริปสำเร็จเรียบร้อยแล้ว! ✈️
              </h3>
              <p className="text-xs font-bold text-purple-600 dark:text-purple-400 mt-1 line-clamp-1">
                {createdTripSuccess.name}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-purple-950/40 border border-slate-200 dark:border-purple-900/40 text-xs font-medium text-slate-600 dark:text-purple-300">
              กำลังนำคุณเข้าสู่หน้าแผนการเดินทาง...
              <div className="w-full bg-slate-200 dark:bg-purple-950 rounded-full h-1.5 overflow-hidden mt-2">
                <div className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full animate-pulse w-full" />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                window.location.href = `/trips/${createdTripSuccess.id}`;
              }}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-md shadow-pink-500/25 hover:scale-105 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>เข้าสู่หน้าทริปทันที</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ==================== EDIT TRIP MODAL ==================== */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#130d22] shadow-2xl border border-slate-200/90 dark:border-purple-800/60 glow-purple max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 pb-4 flex justify-between items-center border-b border-slate-100 dark:border-purple-900/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white text-lg shadow-md shadow-pink-500/25">
                  ✏️
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    แก้ไขรายละเอียดทริป
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-purple-300/70 font-medium">
                    ปรับปรุงชื่อทริป, งบประมาณ และช่วงเวลาเดินทาง
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowEditModal(false)} 
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-purple-200 hover:bg-slate-100 dark:hover:bg-purple-950/50 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTrip} className="p-6 pt-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-800 dark:text-purple-200">ชื่อทริป *</label>
                <input
                  type="text"
                  required
                  className="w-full p-3 rounded-2xl border border-slate-300 dark:border-purple-800 bg-slate-50/60 dark:bg-[#1c1328] text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-bold shadow-2xs"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-800 dark:text-purple-200">งบประมาณ</label>
                  <input
                    type="number"
                    required
                    className="w-full p-3 rounded-2xl border border-slate-300 dark:border-purple-800 bg-slate-50/60 dark:bg-[#1c1328] text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-black shadow-2xs"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-800 dark:text-purple-200">สกุลเงินหลัก</label>
                  <select
                    className="w-full p-3 rounded-2xl border border-slate-300 dark:border-purple-800 bg-slate-50/60 dark:bg-[#1c1328] text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-bold shadow-2xs cursor-pointer"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  >
                    <option value="JPY">🇯🇵 JPY (¥)</option>
                    <option value="THB">🇹🇭 THB (฿)</option>
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
                  <label className="block text-xs font-bold mb-1.5 text-slate-800 dark:text-purple-200">วันเริ่มเดินทาง</label>
                  <input
                    type="date"
                    className="w-full p-3 rounded-2xl border border-slate-300 dark:border-purple-800 bg-slate-50/60 dark:bg-[#1c1328] text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 shadow-2xs font-medium"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-800 dark:text-purple-200">วันเดินทางกลับ</label>
                  <input
                    type="date"
                    className="w-full p-3 rounded-2xl border border-slate-300 dark:border-purple-800 bg-slate-50/60 dark:bg-[#1c1328] text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 shadow-2xs font-medium"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-purple-900/40">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 rounded-2xl border border-slate-300 dark:border-purple-800 text-xs font-bold text-slate-700 dark:text-purple-200 hover:bg-slate-100 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-md shadow-pink-500/25 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#130d22] shadow-2xl border border-purple-500/40 glow-purple max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 pb-4 flex justify-between items-center border-b border-slate-100 dark:border-purple-900/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white text-lg shadow-md shadow-pink-500/25">
                  🔑
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    เข้าร่วมทริปท่องเที่ยว 👥
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-purple-300/70 font-medium">
                    ใส่รหัสเชิญ (Trip ID) ที่เพื่อนแชร์ให้คุณ
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowJoinModal(false)} 
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-purple-200 hover:bg-slate-100 dark:hover:bg-purple-950/50 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleJoinTrip} className="p-6 pt-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-800 dark:text-purple-200">
                  รหัสเชิญเข้าร่วมทริป (Trip ID) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น 123e4567-e89b-12d3-a456-426614174000"
                  className="w-full p-3 rounded-2xl border border-slate-300 dark:border-purple-800 bg-slate-50/60 dark:bg-[#1c1328] text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-mono shadow-2xs"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                />
              </div>

              {joinError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 border border-rose-200 dark:border-rose-900">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{joinError}</span>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 py-3 rounded-2xl border border-slate-300 dark:border-purple-800 text-xs font-bold text-slate-700 dark:text-purple-200 hover:bg-slate-100 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={joinLoading}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-md shadow-pink-500/25 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#130d22] shadow-2xl border border-rose-500/40 glow-rose p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center text-2xl mx-auto shadow-md">
              <Trash2 className="h-7 w-7" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                ยืนยันการลบทริปนี้?
              </h3>
              <p className="text-xs text-slate-500 dark:text-purple-300/80 mt-1 font-medium">
                คุณต้องการลบทริป <b className="text-rose-600 dark:text-rose-400 font-bold">&quot;{selectedTrip.name || selectedTrip.title}&quot;</b> ใช่หรือไม่? ข้อมูลแผนเที่ยวและรายจ่ายทั้งหมดจะถูกลบถาวร
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 rounded-2xl border border-slate-300 dark:border-purple-800 text-xs font-bold text-slate-700 dark:text-purple-200 hover:bg-slate-100 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
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
