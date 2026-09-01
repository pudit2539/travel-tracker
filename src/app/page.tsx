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
  Share2, CheckCircle2, Loader2, X, User, Bell, Coins
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

  // สร้างทริปใหม่
  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setActionLoading(true);
    const { data, error } = await supabase
      .from('trips')
      .insert([
        {
          name: formData.title.trim(),
          total_budget: Number(formData.budget) || 0,
          currency: formData.currency,
          start_date: formData.startDate || null,
          end_date: formData.endDate || null,
          created_by: user?.id,
        },
      ])
      .select()
      .single();

    setActionLoading(false);
    if (!error && data) {
      setShowCreateModal(false);
      resetForm();
      router.push(`/trips/${data.id}`);
    } else {
      alert('เกิดข้อผิดพลาดในการสร้างทริป: ' + (error?.message || ''));
    }
  };

  // แก้ไขทริป
  const handleUpdateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrip || !formData.title.trim()) return;

    setActionLoading(true);
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

    setActionLoading(false);
    if (!error) {
      setShowEditModal(false);
      setSelectedTrip(null);
      resetForm();
      checkUserAndFetchTrips();
    } else {
      alert('เกิดข้อผิดพลาดในการแก้ไขทริป: ' + error.message);
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
        setShowDeleteModal(false);
        setSelectedTrip(null);
        checkUserAndFetchTrips();
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
      router.push(`/trips/${code}`);
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
      budget: String(t.total_budget ?? t.budget ?? '100000'),
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

  return (
    <div className="relative min-h-screen pb-20 bg-grid-pattern transition-colors duration-300">
      
      {/* Background Floating Glow Orbs */}
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-pink-500/10 dark:bg-pink-500/15 rounded-full blur-3xl pointer-events-none animate-float-slow" />
      <div className="absolute top-60 right-10 w-80 h-80 bg-purple-600/10 dark:bg-purple-600/15 rounded-full blur-3xl pointer-events-none animate-float-reverse" />

      {/* ==================== TOP NAVIGATION ==================== */}
      <nav className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-purple-900/40 bg-white/85 dark:bg-[#090611]/85 backdrop-blur-xl transition-colors">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-pink-500/25 animate-float-slow">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base md:text-lg font-black bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 dark:from-pink-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
                Travel Tracker
              </span>
              <span className="block text-[10px] text-slate-500 dark:text-purple-300/70 font-bold tracking-wider uppercase">
                Expense & Itinerary Hub
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Notification Bell */}
            <NotificationBell tripTitle="Travel Hub" />

            {/* Profile Avatar Button */}
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-2 p-1.5 pr-3 rounded-2xl border border-slate-200/80 dark:border-purple-800/80 bg-white/90 dark:bg-[#130d22]/90 hover:border-pink-500 hover:scale-105 shadow-xs transition-all cursor-pointer group"
              title="ตั้งค่าโปรไฟล์"
            >
              <div className={`w-7 h-7 rounded-xl bg-gradient-to-tr ${userCat.bgGradient} flex items-center justify-center text-sm shadow-sm group-hover:scale-110 transition-transform`}>
                {userCat.emoji}
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
          </div>
        </div>
      </nav>

      {/* ==================== MAIN CONTENT CONTAINER ==================== */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 pt-6 space-y-6">

        {/* ==================== WELCOME & STATS ROW ==================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 p-6 rounded-3xl border border-purple-200/70 dark:border-purple-800/50 bg-gradient-to-br from-pink-500/10 via-purple-600/10 to-indigo-600/10 bg-white/90 dark:bg-[#130d22]/90 backdrop-blur-xl card-elevation relative overflow-hidden group">
            <div className="flex items-center gap-3.5 mb-2">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${userCat.bgGradient} flex items-center justify-center text-2xl shadow-md group-hover:scale-105 transition-transform`}>
                {userCat.emoji}
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-black text-slate-900 dark:text-white">
                  สวัสดี, {userDisplayName}! ✈️
                </h1>
                <p className="text-xs text-slate-600 dark:text-purple-200/80 font-medium">
                  จัดการแผนเที่ยว สแกนใบเสร็จด้วย AI และติดตามงบประมาณทริปของคุณ
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-200/70 dark:border-purple-900/40">
              <div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-purple-300/70 block">ทริปทั้งหมด</span>
                <span className="text-2xl font-black text-slate-900 dark:text-purple-100">{trips.length} ทริป</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-purple-300/70 block">งบประมาณรวมทุกทริป</span>
                <span className="text-2xl font-black bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400 bg-clip-text text-transparent">
                  {totalCombinedBudget.toLocaleString()} <span className="text-sm font-semibold text-slate-500 dark:text-purple-400">JPY</span>
                </span>
                <span className="text-[10px] font-extrabold text-pink-600 dark:text-pink-400 block">
                  ≈ ฿{Math.round(totalCombinedBudget * fxRate).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-purple-800/50 bg-white/95 dark:bg-[#130d22]/95 backdrop-blur-xl card-elevation flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300 border border-pink-200 dark:border-pink-900 shadow-2xs">
                  100 JPY = {(fxRate * 100).toFixed(2)} THB
                </span>
              </div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white">Smart Travel Tools</h3>
              <p className="text-xs text-slate-600 dark:text-purple-300/70 mt-1 font-medium leading-relaxed">
                พยากรณ์อากาศสด, เส้นทางท่องเที่ยว และระบบเคลียร์บิลหารเงินอัตโนมัติ
              </p>
            </div>
            <button
              onClick={() => setShowJoinModal(true)}
              className="w-full py-2.5 rounded-xl border border-slate-300 dark:border-purple-800 text-xs font-bold text-slate-800 dark:text-purple-200 hover:border-pink-500 hover:text-pink-600 dark:hover:text-pink-400 hover:scale-[1.02] transition-all cursor-pointer bg-slate-50/50 dark:bg-purple-950/20"
            >
              🔑 เข้าร่วมด้วยรหัสเชิญ
            </button>
          </div>
        </div>

        {/* ==================== ACTION & SEARCH BAR ==================== */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
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
        {loading ? (
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
                  onClick={() => router.push(`/trips/${t.id}`)}
                  className="group relative p-5 rounded-3xl border border-slate-200/90 dark:border-purple-900/50 bg-white/95 dark:bg-[#130d22]/95 card-elevation hover:-translate-y-1.5 hover:border-pink-500/60 dark:hover:border-pink-500/60 transition-all duration-300 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300 border border-pink-200 dark:border-pink-900 shadow-2xs">
                        {t.currency || 'JPY'}
                      </span>
                      
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => openEditModal(t, e)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-purple-900/60 text-slate-400 hover:text-purple-600 dark:hover:text-purple-300 transition-colors cursor-pointer"
                          title="แก้ไขทริป"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#130d22] shadow-2xl border border-slate-200/90 dark:border-purple-800/60 glow-pink-purple max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 pb-3 flex justify-between items-center border-b border-slate-100 dark:border-purple-900/40">
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                สร้างทริปใหม่ ✈️
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-purple-200 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTrip} className="p-6 pt-4 overflow-y-auto custom-scrollbar flex-1 space-y-3.5">
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-purple-200">ชื่อทริป *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น Japan Osaka Trip (04-15 Dec 2026)"
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-medium"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-purple-200">งบประมาณ</label>
                  <input
                    type="number"
                    required
                    placeholder="100000"
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-bold"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-purple-200">สกุลเงินหลัก</label>
                  <select
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-bold"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
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
                  <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-purple-200">วันเริ่มเดินทาง</label>
                  <input
                    type="date"
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-purple-200">วันเดินทางกลับ</label>
                  <input
                    type="date"
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-purple-800 text-xs font-bold text-slate-700 dark:text-purple-200 hover:bg-slate-100 dark:hover:bg-purple-950/40 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-md shadow-pink-500/25 hover:opacity-95 disabled:opacity-50 cursor-pointer hover:scale-[1.02]"
                >
                  {actionLoading ? 'กำลังสร้าง...' : 'สร้างทริป'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== EDIT TRIP MODAL ==================== */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#130d22] shadow-2xl border border-slate-200/90 dark:border-purple-800/60 glow-purple max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 pb-3 flex justify-between items-center border-b border-slate-100 dark:border-purple-900/40">
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                แก้ไขรายละเอียดทริป ✏️
              </h2>
              <button onClick={() => setShowEditModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-purple-200 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTrip} className="p-6 pt-4 overflow-y-auto custom-scrollbar flex-1 space-y-3.5">
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-purple-200">ชื่อทริป *</label>
                <input
                  type="text"
                  required
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-bold"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-purple-200">งบประมาณ</label>
                  <input
                    type="number"
                    required
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-bold"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-purple-200">สกุลเงินหลัก</label>
                  <select
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-bold"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
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
                  <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-purple-200">วันเริ่มเดินทาง</label>
                  <input
                    type="date"
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-purple-200">วันเดินทางกลับ</label>
                  <input
                    type="date"
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-purple-800 text-xs font-bold text-slate-700 dark:text-purple-200 hover:bg-slate-100 dark:hover:bg-purple-950/40 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-md shadow-pink-500/25 hover:opacity-95 disabled:opacity-50 cursor-pointer hover:scale-[1.02]"
                >
                  {actionLoading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== DELETE CONFIRMATION MODAL ==================== */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#130d22] p-6 shadow-2xl border border-rose-200 dark:border-rose-900/60">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
              <Trash2 className="h-5 w-5" />
            </div>
            <h2 className="text-base font-black text-slate-900 dark:text-white mb-1">
              ยืนยันการลบทริป?
            </h2>
            <p className="text-xs text-slate-600 dark:text-purple-300/70 mb-5 font-medium">
              คุณต้องการลบทริป <b className="text-rose-500">"{selectedTrip?.name || selectedTrip?.title}"</b> ใช่หรือไม่? ข้อมูลแผนเที่ยวและรายจ่ายทั้งหมดจะถูกลบอย่างถาวร
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-purple-800 text-xs font-bold text-slate-700 dark:text-purple-200 hover:bg-slate-100 dark:hover:bg-purple-950/40 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeleteTrip}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? 'กำลังลบ...' : 'ยืนยันการลบ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== JOIN TRIP MODAL ==================== */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#130d22] p-6 shadow-2xl border border-slate-200/90 dark:border-purple-800/60 glow-purple">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                เข้าร่วมทริปด้วยรหัสเชิญ 🔑
              </h2>
              <button onClick={() => setShowJoinModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-purple-200 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-purple-300/70 mb-4 font-medium">
              นำ Trip ID ที่เพื่อนส่งให้มากรอก เพื่อเข้าถึงแผนเที่ยวและบันทึกรายจ่ายร่วมกัน
            </p>

            <form onSubmit={handleJoinTrip} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-purple-200">รหัสเชิญ (Trip ID)</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น d1a42b10-86c4-..."
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs font-mono outline-none focus:border-pink-500"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                />
              </div>

              {joinError && (
                <div className="text-xs font-bold text-rose-500 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" /> {joinError}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-purple-800 text-xs font-bold text-slate-700 dark:text-purple-200 hover:bg-slate-100 dark:hover:bg-purple-950/40 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={joinLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-md shadow-pink-500/25 hover:opacity-95 disabled:opacity-50 cursor-pointer hover:scale-[1.02]"
                >
                  {joinLoading ? 'กำลังตรวจสอบ...' : 'เข้าร่วมทริป'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
