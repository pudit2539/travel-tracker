// src/components/SuperAdminModal.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  ShieldAlert, ShieldCheck, Users, Compass, Trash2, 
  Search, ExternalLink, RefreshCw, X, AlertTriangle, 
  Crown, CheckCircle2, DollarSign, Calendar, Eye,
  Activity, ArrowUpRight, UserX, Clock, ChevronDown,
  ChevronUp, Sparkles, Receipt
} from 'lucide-react';
import { CatAvatarBadge } from '@/components/CatAvatarBadge';
import { toast } from 'sonner';
import { isSuperAdmin, SUPER_ADMIN_EMAILS } from '@/lib/permissions';

interface SuperAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  currentProfile: any;
  onRefreshTrips?: () => void;
}

export default function SuperAdminModal({
  isOpen,
  onClose,
  currentUser,
  currentProfile,
  onRefreshTrips,
}: SuperAdminModalProps) {
  const [activeTab, setActiveTab] = useState<'trips' | 'users' | 'audit' | 'security'>('trips');
  const [loading, setLoading] = useState(false);
  const [trips, setTrips] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
  const [tripSearch, setTripSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'new' | 'active'>('all');
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const isUserAdmin = isSuperAdmin(currentUser, currentProfile);

  useEffect(() => {
    if (isOpen && isUserAdmin) {
      fetchAdminData();
    }
  }, [isOpen, isUserAdmin]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // Parallelize queries across database tables
      const [
        { data: profilesData },
        { data: tripsData },
        { data: membersData },
        { data: expensesData }
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('trips').select('*').order('created_at', { ascending: false }),
        supabase.from('trip_members').select('*'),
        supabase.from('expenses').select('*').order('created_at', { ascending: false }).limit(60)
      ]);

      const userMap = new Map((profilesData || []).map((p: any) => [p.id, p]));
      const memberCountMap = new Map<string, number>();
      (membersData || []).forEach((m: any) => {
        memberCountMap.set(m.trip_id, (memberCountMap.get(m.trip_id) || 0) + 1);
      });

      const enrichedTrips = (tripsData || []).map((t: any) => ({
        ...t,
        creator: userMap.get(t.created_by),
        memberCount: memberCountMap.get(t.id) || 1,
      }));

      setTrips(enrichedTrips);
      setUsers(profilesData || []);
      setMemberships(membersData || []);
      setRecentExpenses(expensesData || []);
    } catch (err: any) {
      console.error('Fetch admin data error:', err);
      toast.error('ไม่สามารถโหลดข้อมูล Super Admin ได้: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForceDeleteTrip = async (tripId: string, tripTitle: string) => {
    if (!confirm(`[SUPER ADMIN ACTION]\nคุณแน่ใจหรือไม่ว่าต้องการลบทริป "${tripTitle}" ออกจากระบบถาวร? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
      return;
    }

    setDeletingTripId(tripId);
    try {
      await supabase.from('itinerary_items').delete().eq('trip_id', tripId);
      await supabase.from('expenses').delete().eq('trip_id', tripId);
      await supabase.from('trip_members').delete().eq('trip_id', tripId);
      const { error } = await supabase.from('trips').delete().eq('id', tripId);

      if (!error) {
        setTrips((prev) => prev.filter((t) => t.id !== tripId));
        toast.success(`[Super Admin] ลบทริป "${tripTitle}" สำเร็จแล้ว`);
        onRefreshTrips?.();
      } else {
        toast.error('ลบทริปไม่สำเร็จ: ' + error.message);
      }
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setDeletingTripId(null);
    }
  };

  const handleForceRemoveMember = async (membershipId: string, userName: string, tripTitle: string) => {
    if (!confirm(`[SUPER ADMIN ACTION]\nต้องการปลดคุณ "${userName}" ออกจากทริป "${tripTitle}" ใช่หรือไม่?`)) {
      return;
    }

    try {
      const { error } = await supabase.from('trip_members').delete().eq('id', membershipId);
      if (!error) {
        setMemberships((prev) => prev.filter((m) => m.id !== membershipId));
        toast.success(`[Super Admin] ปลด "${userName}" ออกจากทริปแล้ว`);
        fetchAdminData();
      } else {
        toast.error('ปลดสมาชิกไม่สำเร็จ: ' + error.message);
      }
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  // Audit Logs (Chronological system activity feed) - Must be declared at top level before any early returns!
  const auditLogs = useMemo(() => {
    const logs: Array<{
      id: string;
      type: 'trip_create' | 'expense_create';
      title: string;
      subtitle: string;
      actorName: string;
      actorEmail: string;
      timestamp: string;
      meta?: any;
    }> = [];

    const userMap = new Map(users.map((u) => [u.id, u]));
    const tripMap = new Map(trips.map((t) => [t.id, t]));

    trips.forEach((t) => {
      const creator = userMap.get(t.created_by);
      logs.push({
        id: `trip_${t.id}`,
        type: 'trip_create',
        title: `สร้างทริปใหม่: "${t.name || t.title}"`,
        subtitle: `ปลายทาง: ${t.destination || t.currency || 'ทริป'} • งบ: ${Number(t.total_budget || 0).toLocaleString()} ${t.currency}`,
        actorName: creator?.display_name || creator?.email?.split('@')[0] || 'ผู้ใช้',
        actorEmail: creator?.email || '',
        timestamp: t.created_at || 'ไม่ระบุ',
        meta: { tripId: t.id },
      });
    });

    recentExpenses.forEach((e) => {
      const trip = tripMap.get(e.trip_id);
      logs.push({
        id: `exp_${e.id}`,
        type: 'expense_create',
        title: `ลงบันทึกค่าใช้จ่าย: "${e.title}" (${Number(e.amount || 0).toLocaleString()} ${e.currency || 'THB'})`,
        subtitle: `ในทริป: "${trip?.name || trip?.title || 'ทริป'}" (หมวด: ${e.category || 'ทั่วไป'})`,
        actorName: e.payer_name || 'สมาชิก',
        actorEmail: '',
        timestamp: e.created_at || e.spent_at || 'ไม่ระบุ',
        meta: { tripId: e.trip_id },
      });
    });

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [trips, recentExpenses, users]);

  if (!isOpen) return null;

  if (!isUserAdmin) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center backdrop-blur-md bg-black/80 p-4">
        <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#181a20] p-6 text-center space-y-4 border border-rose-500/30 shadow-2xl">
          <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto" />
          <h2 className="text-base font-black text-slate-900 dark:text-white">ปฏิเสธการเข้าถึง (Access Denied)</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            หน้านี้สงวนสิทธิ์เฉพาะ Super Admin ({SUPER_ADMIN_EMAILS.join(', ')}) เท่านั้น
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-[#262932] text-xs font-bold text-slate-700 dark:text-slate-200"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    );
  }

  const filteredTrips = trips.filter((t) => {
    const q = tripSearch.toLowerCase().trim();
    if (!q) return true;
    const nameMatch = (t.name || t.title || '').toLowerCase().includes(q);
    const creatorEmail = (t.creator?.email || '').toLowerCase().includes(q);
    const creatorName = (t.creator?.display_name || '').toLowerCase().includes(q);
    return nameMatch || creatorEmail || creatorName;
  });

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase().trim();
    const emailMatch = (u.email || '').toLowerCase().includes(q);
    const nameMatch = (u.display_name || '').toLowerCase().includes(q);
    if (q && !emailMatch && !nameMatch) return false;

    const userTrips = trips.filter((t) => t.created_by === u.id);
    const userJoined = memberships.filter((m) => m.user_id === u.id);

    if (userFilter === 'new') {
      // New users: registered but haven't created trips or joined yet
      return userTrips.length === 0 && userJoined.length === 0;
    }
    if (userFilter === 'active') {
      return userTrips.length > 0 || userJoined.length > 0;
    }
    return true;
  });

  const filteredAuditLogs = auditLogs.filter((log) => {
    const q = auditSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      log.title.toLowerCase().includes(q) ||
      log.subtitle.toLowerCase().includes(q) ||
      log.actorName.toLowerCase().includes(q) ||
      log.actorEmail.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center backdrop-blur-md bg-black/80 p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl rounded-3xl bg-white dark:bg-[#14161b] shadow-2xl border border-amber-500/30 flex flex-col max-h-[92dvh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-[#262932] flex items-center justify-between shrink-0 bg-gradient-to-r from-amber-500/10 via-transparent to-purple-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center text-xl shadow-inner border border-amber-500/30">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Super Admin Console & Audit
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500 text-white tracking-wider">
                  Root Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                ตรวจสอบกิจกรรม สมาชิกใหม่ และสิทธิ์ในระบบ ({currentUser?.email})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAdminData}
              disabled={loading}
              className="p-2 rounded-xl border border-slate-200 dark:border-[#262932] text-slate-600 dark:text-slate-300 hover:text-amber-500 transition-colors cursor-pointer"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#262932] transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* System Stats Bar */}
        <div className="grid grid-cols-4 divide-x divide-slate-200 dark:divide-[#262932] border-b border-slate-200 dark:border-[#262932] bg-slate-50/60 dark:bg-[#181a20]/60 p-3 shrink-0 text-center">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">ผู้ใช้ทั้งหมด</span>
            <span className="text-lg font-black text-slate-900 dark:text-white">{users.length}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">ผู้ใช้ใหม่ (0 ทริป)</span>
            <span className="text-lg font-black text-blue-500">
              {users.filter(u => !trips.some(t => t.created_by === u.id) && !memberships.some(m => m.user_id === u.id)).length}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">ทริปทั้งหมดในระบบ</span>
            <span className="text-lg font-black text-amber-500">{trips.length}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">สถานะสิทธิ์</span>
            <span className="text-xs font-bold text-emerald-500 flex items-center justify-center gap-1 mt-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Full Access
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 px-4 pt-3 border-b border-slate-200 dark:border-[#262932] shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('trips')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'trips'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>ทริปทั้งหมด ({trips.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'users'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>จัดการผู้ใช้ ({users.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'audit'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>📊 ตรวจสอบกิจกรรม & Audit Log ({auditLogs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'security'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Crown className="h-3.5 w-3.5" />
            <span>สิทธิ์ Super Admin</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
          
          {/* TAB 1: ALL TRIPS AUDIT */}
          {activeTab === 'trips' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อทริป, อีเมล หรือชื่อเจ้าของทริป..."
                  value={tripSearch}
                  onChange={(e) => setTripSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-[#262932] bg-slate-50 dark:bg-[#181a20] text-xs outline-none focus:border-amber-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-2">
                {filteredTrips.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#181a20] border border-slate-200 dark:border-[#262932] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-amber-500/50 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {t.name || t.title}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-200 dark:bg-[#262932] text-slate-700 dark:text-slate-300">
                          {t.currency || 'JPY'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          {t.memberCount} สมาชิก
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <span>สร้างโดย:</span>
                          <b className="text-slate-700 dark:text-slate-200">
                            {t.creator?.display_name || t.creator?.email || t.created_by?.slice(0, 8)}
                          </b>
                          {t.creator?.email && (
                            <span className="text-[10px] text-slate-400">({t.creator.email})</span>
                          )}
                        </span>
                        {t.start_date && (
                          <span>• {new Date(t.start_date).toLocaleDateString('th-TH')} - {t.end_date ? new Date(t.end_date).toLocaleDateString('th-TH') : ''}</span>
                        )}
                        <span>• งบ: {Number(t.total_budget || 0).toLocaleString()} {t.currency}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        Trip ID: {t.id}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/trips/${t.id}`}
                        target="_blank"
                        className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-bold hover:scale-105 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                        title="เปิดดูทริปนี้ในฐานะ Super Admin"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>กดดูทริป</span>
                      </Link>

                      <button
                        onClick={() => handleForceDeleteTrip(t.id, t.name || t.title)}
                        disabled={deletingTripId === t.id}
                        className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
                        title="บังคับลบทริปนี้ (Force Delete)"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: ALL USERS MONITORING */}
          {activeTab === 'users' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2 justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อผู้ใช้ หรืออีเมล..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-[#262932] bg-slate-50 dark:bg-[#181a20] text-xs outline-none focus:border-amber-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-[#181a20] border border-slate-200 dark:border-[#262932]">
                  <button
                    type="button"
                    onClick={() => setUserFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      userFilter === 'all' ? 'bg-white dark:bg-[#262932] text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    ทั้งหมด ({users.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserFilter('new')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      userFilter === 'new' ? 'bg-white dark:bg-[#262932] text-blue-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    สมัครใหม่ (0 ทริป)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserFilter('active')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      userFilter === 'active' ? 'bg-white dark:bg-[#262932] text-emerald-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    มีทริป/เป็นสมาชิก
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {filteredUsers.map((u) => {
                  const isRoot = SUPER_ADMIN_EMAILS.includes(u.email?.toLowerCase());
                  const userCreatedTrips = trips.filter((t) => t.created_by === u.id);
                  const userMemberships = memberships.filter((m) => m.user_id === u.id);
                  const isExpanded = expandedUserId === u.id;

                  return (
                    <div
                      key={u.id}
                      className="rounded-2xl bg-slate-50 dark:bg-[#181a20] border border-slate-200 dark:border-[#262932] overflow-hidden transition-all"
                    >
                      <div className="p-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <CatAvatarBadge avatarId={u.avatar_id} size="md" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                {u.display_name || 'ผู้ใช้'}
                              </span>
                              {isRoot && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-0.5">
                                  <Crown className="h-2.5 w-2.5" /> Super Admin
                                </span>
                              )}
                              {userCreatedTrips.length === 0 && userMemberships.length === 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                  🆕 สมาชิกใหม่
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 block truncate">
                              {u.email}
                            </span>
                            <span className="text-[9px] font-mono text-slate-400 block">
                              UUID: {u.id}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right hidden sm:block">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-200/70 dark:bg-[#262932] text-[10px] font-bold text-slate-700 dark:text-slate-300 block">
                              {userCreatedTrips.length} ทริปที่สร้าง
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {userMemberships.length} ทริปที่ร่วมกลุ่ม
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setExpandedUserId(isExpanded ? null : u.id)}
                            className="p-2 rounded-xl border border-slate-200 dark:border-[#262932] hover:bg-slate-100 dark:hover:bg-[#262932] text-slate-600 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1"
                          >
                            <span>ตรวจสอบ</span>
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Drilldown details */}
                      {isExpanded && (
                        <div className="p-3.5 pt-0 border-t border-slate-200/60 dark:border-[#262932]/60 bg-white/50 dark:bg-[#121316]/50 space-y-3">
                          {/* Trips created */}
                          <div>
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1">
                              <Compass className="h-3.5 w-3.5 text-amber-500" />
                              <span>ทริปที่ผู้ใช้นี้สร้างขึ้น ({userCreatedTrips.length}):</span>
                            </span>
                            {userCreatedTrips.length === 0 ? (
                              <p className="text-[11px] text-slate-400 italic pl-2">ยังไม่เคยสร้างทริปใดๆ ในระบบ</p>
                            ) : (
                              <div className="space-y-1.5">
                                {userCreatedTrips.map((t) => (
                                  <div
                                    key={t.id}
                                    className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-[#1c2438] flex items-center justify-between gap-2 text-xs"
                                  >
                                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                      {t.name || t.title}
                                    </span>
                                    <Link
                                      href={`/trips/${t.id}`}
                                      target="_blank"
                                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold flex items-center gap-1 shrink-0"
                                    >
                                      <Eye className="h-3 w-3" />
                                      <span>กดดูทริป</span>
                                    </Link>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Trips joined */}
                          <div>
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1">
                              <Users className="h-3.5 w-3.5 text-blue-500" />
                              <span>ทริปที่ถูกเชิญเข้าร่วมกลุ่ม ({userMemberships.length}):</span>
                            </span>
                            {userMemberships.length === 0 ? (
                              <p className="text-[11px] text-slate-400 italic pl-2">ไม่ได้อยู่ในกลุ่มทริปใดๆ</p>
                            ) : (
                              <div className="space-y-1.5">
                                {userMemberships.map((m) => {
                                  const t = trips.find((item) => item.id === m.trip_id);
                                  return (
                                    <div
                                      key={m.id}
                                      className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-[#1c2438] flex items-center justify-between gap-2 text-xs"
                                    >
                                      <div className="min-w-0">
                                        <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                                          {t?.name || t?.title || m.trip_id}
                                        </span>
                                        <span className="text-[10px] text-blue-500 font-mono">
                                          สิทธิ์: {m.role || 'viewer'}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <Link
                                          href={`/trips/${m.trip_id}`}
                                          target="_blank"
                                          className="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 text-blue-600 text-[10px] font-bold flex items-center gap-1"
                                        >
                                          <Eye className="h-3 w-3" />
                                          <span>ดู</span>
                                        </Link>
                                        <button
                                          type="button"
                                          onClick={() => handleForceRemoveMember(m.id, u.display_name || u.email, t?.name || 'ทริป')}
                                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[10px] font-bold flex items-center gap-1 border border-rose-200 dark:border-rose-900/40"
                                          title="บังคับปลดออกจากทริปนี้"
                                        >
                                          <UserX className="h-3 w-3" />
                                          <span>ปลดออก</span>
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: AUDIT & MONITORING LOG */}
          {activeTab === 'audit' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาประวัติกิจกรรม เช่น ชื่อผู้ใช้, ชื่อทริป, กิจกรรม..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-[#262932] bg-slate-50 dark:bg-[#181a20] text-xs outline-none focus:border-amber-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                {filteredAuditLogs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    ไม่พบประวัติกิจกรรมตามที่ค้นหา
                  </div>
                ) : (
                  filteredAuditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-[#181a20] border border-slate-200 dark:border-[#262932] flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm ${
                          log.type === 'trip_create'
                            ? 'bg-amber-500/15 text-amber-500 border border-amber-500/25'
                            : 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/25'
                        }`}>
                          {log.type === 'trip_create' ? '🗺️' : '🧾'}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="font-bold text-slate-900 dark:text-white truncate">
                            {log.title}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {log.subtitle}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                            <span>โดย: <b className="text-slate-700 dark:text-slate-300">{log.actorName}</b> {log.actorEmail ? `(${log.actorEmail})` : ''}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="h-3 w-3" />
                              {new Date(log.timestamp).toLocaleString('th-TH')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {log.meta?.tripId && (
                        <Link
                          href={`/trips/${log.meta.tripId}`}
                          target="_blank"
                          className="px-2.5 py-1 rounded-xl bg-slate-200/70 dark:bg-[#262932] hover:bg-amber-500 hover:text-white text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                        >
                          <Eye className="h-3 w-3" />
                          <span>ดูทริป</span>
                        </Link>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY & ADMIN CONFIG */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-2">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs">
                  <Crown className="h-4 w-4" />
                  <span>รายชื่อ Super Admin บัญชีหลัก</span>
                </div>
                <div className="space-y-1">
                  {SUPER_ADMIN_EMAILS.map((email) => (
                    <div key={email} className="flex items-center gap-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span>{email}</span>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500 text-white">Full Privileges</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#181a20] border border-slate-200 dark:border-[#262932] space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <h4 className="font-bold text-slate-900 dark:text-white">เอกสิทธิ์ของ Super Admin ในระบบ:</h4>
                <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
                  <li>มองเห็นทุกทริปที่ถูกสร้างขึ้นในระบบ ไม่ว่าจะถูกสร้างโดยใครก็ตาม</li>
                  <li>สามารถกดเข้าดูทริปใดก็ได้โดยไม่ต้องมีรหัสเชิญ (Bypass Permissions Lock)</li>
                  <li>สามารถบังคับลบทริป (Force Delete) และปลดสมาชิกออกจากทริปได้ทันที</li>
                  <li>คอยตรวจสอบการสมัครของสมาชิกใหม่ และประวัติการบันทึกค่าใช้จ่ายย้อนหลัง (Audit Log)</li>
                </ul>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
