// src/components/NotificationBell.tsx
'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Bell, Check, CheckCheck, Trash2, X, Sparkles, 
  Receipt, CloudSun, MapPin, Calculator, AlertCircle, 
  Users, Filter, Clock 
} from 'lucide-react';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  timestamp: number;
  type: 'member' | 'expense' | 'weather' | 'itinerary' | 'settlement' | 'system';
  read: boolean;
  actionUrl?: string;
}

interface NotificationBellProps {
  expenses?: any[];
  itinerary?: any[];
  members?: any[];
  tripTitle?: string;
}

const READ_NOTIFS_KEY = 'travel_tracker_read_notifs_v2';
const CLEARED_NOTIFS_KEY = 'travel_tracker_cleared_notifs_v2';
const EMPTY_ARRAY: any[] = [];

function getStoredIds(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveStoredIds(key: string, set: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
}

export default function NotificationBell({ 
  expenses = EMPTY_ARRAY, 
  itinerary = EMPTY_ARRAY, 
  members = EMPTY_ARRAY, 
  tripTitle 
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'member' | 'expense' | 'weather' | 'itinerary'>('all');
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [clearedIds, setClearedIds] = useState<Set<string>>(() => new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize stored IDs safely on client mount
  useEffect(() => {
    setReadIds(getStoredIds(READ_NOTIFS_KEY));
    setClearedIds(getStoredIds(CLEARED_NOTIFS_KEY));
  }, []);

  // Compute notifications purely via useMemo without triggering setState in useEffect
  const notifications = useMemo(() => {
    const list: NotificationItem[] = [];

    // 1. Member Join Notifications
    if (members && members.length > 0) {
      members.forEach((m, idx) => {
        const memberId = `notif-member-${m.user_id || m.id || idx}`;
        if (!clearedIds.has(memberId)) {
          const mName = m.profiles?.display_name || m.profiles?.email?.split('@')[0] || 'สมาชิกใหม่';
          const memberTime = m.created_at ? new Date(m.created_at) : new Date();
          
          list.push({
            id: memberId,
            title: 'สมาชิกใหม่เข้าร่วมทริป 👥',
            message: `${mName} เข้าร่วมทริปแล้ว (สิทธิ์: ${m.role === 'owner' ? '👑 เจ้าของทริป' : m.role === 'editor' ? '✏️ ผู้แก้ไข' : '👁️ ผู้เข้าชม'})`,
            time: m.created_at ? memberTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : 'ล่าสุด',
            timestamp: m.created_at ? memberTime.getTime() : Date.now() - (idx * 60000),
            type: 'member',
            read: readIds.has(memberId),
          });
        }
      });
    }

    // 2. Recent Expenses
    if (expenses && expenses.length > 0) {
      expenses.slice(0, 5).forEach((exp, idx) => {
        const expId = `notif-exp-${exp.id || idx}`;
        if (!clearedIds.has(expId)) {
          const expTime = exp.spent_at ? new Date(exp.spent_at) : new Date();
          list.push({
            id: expId,
            title: 'บันทึกค่าใช้จ่าย 🧾',
            message: `${exp.payer_name || 'สมาชิก'} บันทึก "${exp.title}" ยอด ${Number(exp.amount).toLocaleString()} ${exp.currency || 'JPY'}`,
            time: exp.spent_at ? new Date(exp.spent_at).toLocaleDateString('th-TH') : 'ล่าสุด',
            timestamp: expTime.getTime() - (idx * 1000),
            type: 'expense',
            read: readIds.has(expId),
          });
        }
      });
    }

    // 3. Bill Settlement ready
    if (expenses && expenses.length >= 2) {
      const settleId = 'notif-settle';
      if (!clearedIds.has(settleId)) {
        list.push({
          id: settleId,
          title: 'ระบบเคลียร์บิลพร้อมคำนวณ 💸',
          message: 'มีรายการค่าใช้จ่ายเพียงพอแล้ว สามารถเปิดดูแผนการโอนเงินหารเฉลี่ยได้ทันที',
          time: 'แนะนำ',
          timestamp: Date.now() - 3600000,
          type: 'settlement',
          read: readIds.has(settleId),
        });
      }
    }

    // 4. Weather notification
    const weatherId = 'notif-weather';
    if (!clearedIds.has(weatherId)) {
      list.push({
        id: weatherId,
        title: 'พยากรณ์อากาศโอซาก้า & เกียวโต 🌤️',
        message: 'อุณหภูมิเฉลี่ย 8-14°C อากาศหนาวเย็นในฤดูหนาว อย่าลืมพกเสื้อโค้ทหนาและฮีทเทค',
        time: 'วันนี้',
        timestamp: Date.now() - 7200000,
        type: 'weather',
        read: readIds.has(weatherId),
      });
    }

    // 5. Itinerary Day 1 reminder
    if (itinerary && itinerary.length > 0) {
      const firstItem = itinerary[0];
      const planId = 'notif-plan-start';
      if (!clearedIds.has(planId)) {
        list.push({
          id: planId,
          title: 'จุดเริ่มต้นการเดินทาง ✈️',
          message: `กิจกรรมแรก: "${firstItem.main_place}" (${firstItem.date_label || 'Day 1'})`,
          time: 'เริ่มต้นทริป',
          timestamp: Date.now() - 86400000,
          type: 'itinerary',
          read: readIds.has(planId),
        });
      }
    }

    // Sort strictly by timestamp descending
    list.sort((a, b) => b.timestamp - a.timestamp);
    return list;
  }, [expenses, itinerary, members, readIds, clearedIds]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    return notifications.filter((n) => {
      if (activeFilter === 'member') return n.type === 'member';
      if (activeFilter === 'expense') return n.type === 'expense' || n.type === 'settlement';
      if (activeFilter === 'weather') return n.type === 'weather';
      if (activeFilter === 'itinerary') return n.type === 'itinerary';
      return true;
    });
  }, [notifications, activeFilter]);

  const markAllAsRead = useCallback(() => {
    setReadIds((prev) => {
      const updated = new Set(prev);
      notifications.forEach((n) => updated.add(n.id));
      saveStoredIds(READ_NOTIFS_KEY, updated);
      return updated;
    });
  }, [notifications]);

  const clearAllNotifications = useCallback(() => {
    setClearedIds((prev) => {
      const updated = new Set(prev);
      notifications.forEach((n) => updated.add(n.id));
      saveStoredIds(CLEARED_NOTIFS_KEY, updated);
      return updated;
    });
  }, [notifications]);

  const markSingleAsRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const updated = new Set(prev);
      updated.add(id);
      saveStoredIds(READ_NOTIFS_KEY, updated);
      return updated;
    });
  }, []);

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'member':
        return <Users className="h-4 w-4 text-pink-600 dark:text-pink-400" />;
      case 'expense':
        return <Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'weather':
        return <CloudSun className="h-4 w-4 text-amber-500" />;
      case 'itinerary':
        return <MapPin className="h-4 w-4 text-indigo-500" />;
      case 'settlement':
        return <Calculator className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      default:
        return <Sparkles className="h-4 w-4 text-pink-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 sm:p-2.5 rounded-2xl border border-slate-200/80 dark:border-purple-800/80 bg-white/90 dark:bg-[#1a182d]/90 text-slate-700 dark:text-purple-200 hover:border-pink-500 hover:text-pink-600 dark:hover:text-pink-400 hover:scale-105 active:scale-95 shadow-2xs transition-all cursor-pointer"
        title="การแจ้งเตือน"
      >
        <Bell className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-1 text-[9px] font-black text-white shadow-md animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover / Dropdown Drawer */}
      {isOpen && (
        <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 z-50 w-auto sm:w-96 rounded-3xl bg-white/95 dark:bg-[#1a182d]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-purple-800/60 shadow-2xl glow-pink-purple overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="p-4 pb-3 border-b border-slate-100 dark:border-purple-900/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-xs">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>การแจ้งเตือน</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-950 px-1.5 py-0.2 rounded-full">
                      {unreadCount} ใหม่
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-purple-300/70 font-medium">
                  {tripTitle ? `ทริป: ${tripTitle}` : 'ความเคลื่อนไหวล่าสุด'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="p-1.5 text-[10px] font-bold text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-purple-950/50 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                  title="อ่านทั้งหมด"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline">อ่านหมด</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAllNotifications}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                  title="ล้างทั้งหมด"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-purple-200 hover:bg-slate-100 dark:hover:bg-purple-950/50 rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 px-4 py-2 bg-slate-50/50 dark:bg-[#11101d]/50 border-b border-slate-100 dark:border-purple-900/30 overflow-x-auto custom-scrollbar">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-purple-300 hover:bg-slate-200 dark:hover:bg-purple-950'
              }`}
            >
              ทั้งหมด ({notifications.length})
            </button>
            <button
              onClick={() => setActiveFilter('member')}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                activeFilter === 'member'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-purple-300 hover:bg-slate-200 dark:hover:bg-purple-950'
              }`}
            >
              👥 สมาชิก
            </button>
            <button
              onClick={() => setActiveFilter('expense')}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                activeFilter === 'expense'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-purple-300 hover:bg-slate-200 dark:hover:bg-purple-950'
              }`}
            >
              🧾 รายจ่าย
            </button>
            <button
              onClick={() => setActiveFilter('itinerary')}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                activeFilter === 'itinerary'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-purple-300 hover:bg-slate-200 dark:hover:bg-purple-950'
              }`}
            >
              🗺️ แผนเที่ยว
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-purple-900/30">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-pink-50 dark:bg-purple-950/60 flex items-center justify-center text-pink-500 mx-auto">
                  <Sparkles className="h-6 w-6" />
                </div>
                <p className="text-xs font-bold text-slate-800 dark:text-white">ไม่มีการแจ้งเตือนใหม่</p>
                <p className="text-[10px] text-slate-400 dark:text-purple-300">
                  ระบบจะแจ้งเตือนเมื่อมีเพื่อนเข้ากลุ่ม, บันทึกค่าใช้จ่าย, หรืออัปเดตแผนเที่ยว
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => markSingleAsRead(notif.id)}
                  className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer group ${
                    !notif.read
                      ? 'bg-pink-50/40 dark:bg-purple-950/40 hover:bg-pink-50/70 dark:hover:bg-purple-950/60'
                      : 'hover:bg-slate-50 dark:hover:bg-[#11101d]/40'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-white dark:bg-[#11101d] border border-slate-200/80 dark:border-purple-900/60 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-110 transition-transform">
                    {getIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {notif.title}
                      </h4>
                      <span className="text-[9px] font-semibold text-slate-400 shrink-0 flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {notif.time}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-purple-200 mt-0.5 leading-snug line-clamp-2">
                      {notif.message}
                    </p>
                  </div>

                  {!notif.read && (
                    <div className="w-2 h-2 rounded-full bg-pink-500 shrink-0 mt-1.5 animate-pulse" />
                  )}
                </div>
              ))
            )}
          </div>

        </div>
      )}
    </div>
  );
}
