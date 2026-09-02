// src/components/NotificationBell.tsx
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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
  expenses = [], 
  itinerary = [], 
  members = [], 
  tripTitle 
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'member' | 'expense' | 'weather' | 'itinerary'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Generate dynamic contextual notifications with member join alerts and timestamps
  useEffect(() => {
    const readIds = getStoredIds(READ_NOTIFS_KEY);
    const clearedIds = getStoredIds(CLEARED_NOTIFS_KEY);
    const list: NotificationItem[] = [];

    // 1. Member Join Notifications (แจ้งเตือนเมื่อมีคนเข้าร่วมกลุ่ม)
    if (members.length > 0) {
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

    // 2. Recent Expenses (แจ้งเตือนการบันทึกค่าใช้จ่ายล่าสุด)
    if (expenses.length > 0) {
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
    if (expenses.length >= 2) {
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
    if (itinerary.length > 0) {
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

    // Sort strictly by timestamp descending (Latest on Top)
    list.sort((a, b) => b.timestamp - a.timestamp);
    setNotifications(list);
  }, [expenses, itinerary, members]);

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

  const unreadCount = notifications.filter((n) => !n.read).length;

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

  const markAllAsRead = () => {
    const readIds = getStoredIds(READ_NOTIFS_KEY);
    notifications.forEach((n) => readIds.add(n.id));
    saveStoredIds(READ_NOTIFS_KEY, readIds);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAllNotifications = () => {
    const clearedIds = getStoredIds(CLEARED_NOTIFS_KEY);
    notifications.forEach((n) => clearedIds.add(n.id));
    saveStoredIds(CLEARED_NOTIFS_KEY, clearedIds);

    setNotifications([]);
  };

  const markSingleAsRead = (id: string) => {
    const readIds = getStoredIds(READ_NOTIFS_KEY);
    readIds.add(id);
    saveStoredIds(READ_NOTIFS_KEY, readIds);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'member':
        return <Users className="h-4 w-4 text-pink-600 dark:text-pink-400" />;
      case 'expense':
        return <Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'weather':
        return <CloudSun className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case 'settlement':
        return <Calculator className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case 'itinerary':
        return <MapPin className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
      default:
        return <Sparkles className="h-4 w-4 text-pink-600 dark:text-pink-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-2xl border border-slate-200/80 dark:border-purple-800/80 bg-white/90 dark:bg-[#130d22]/90 text-slate-700 dark:text-purple-200 hover:border-pink-500 shadow-2xs hover:scale-105 transition-all cursor-pointer group"
        title="การแจ้งเตือน"
      >
        <Bell className="h-4 w-4 group-hover:rotate-12 transition-transform" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white text-[10px] font-black flex items-center justify-center shadow-md shadow-pink-500/40 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification Drawer Popover */}
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 sm:hidden animate-in fade-in duration-150"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-96 max-w-lg sm:max-w-none rounded-3xl bg-white dark:bg-[#120c1e] shadow-2xl border border-slate-200 dark:border-purple-800/80 glow-pink z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            
            {/* Header */}
            <div className="p-4 pb-2.5 flex items-center justify-between border-b border-slate-100 dark:border-purple-900/40 bg-slate-50/50 dark:bg-purple-950/20">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-pink-100 dark:bg-pink-950 text-pink-600 dark:text-pink-400">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-white">การแจ้งเตือนทริป</h3>
                <span className="text-[10px] text-slate-500 dark:text-purple-300 font-medium">
                  {unreadCount > 0 ? `มี ${unreadCount} รายการใหม่` : 'อ่านครบทั้งหมดแล้ว'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/50 flex items-center gap-1 transition-colors cursor-pointer"
                  title="อ่านทั้งหมด"
                >
                  <CheckCheck className="h-3 w-3" />
                  <span>อ่านทั้งหมด</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllNotifications}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title="ล้างการแจ้งเตือนทั้งหมด"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-3 py-2 border-b border-slate-100 dark:border-purple-900/40 flex items-center gap-1 overflow-x-auto bg-white dark:bg-[#120c1e]">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-pink-500 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-purple-950/60 text-slate-600 dark:text-purple-300 hover:bg-slate-200'
              }`}
            >
              ทั้งหมด ({notifications.length})
            </button>
            <button
              onClick={() => setActiveFilter('member')}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                activeFilter === 'member'
                  ? 'bg-pink-500 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-purple-950/60 text-slate-600 dark:text-purple-300 hover:bg-slate-200'
              }`}
            >
              👥 สมาชิก
            </button>
            <button
              onClick={() => setActiveFilter('expense')}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                activeFilter === 'expense'
                  ? 'bg-pink-500 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-purple-950/60 text-slate-600 dark:text-purple-300 hover:bg-slate-200'
              }`}
            >
              💰 รายจ่าย
            </button>
            <button
              onClick={() => setActiveFilter('weather')}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                activeFilter === 'weather'
                  ? 'bg-pink-500 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-purple-950/60 text-slate-600 dark:text-purple-300 hover:bg-slate-200'
              }`}
            >
              🌤️ อากาศ
            </button>
            <button
              onClick={() => setActiveFilter('itinerary')}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                activeFilter === 'itinerary'
                  ? 'bg-pink-500 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-purple-950/60 text-slate-600 dark:text-purple-300 hover:bg-slate-200'
              }`}
            >
              🗺️ แผนเที่ยว
            </button>
          </div>

          {/* List (Sorted newest first) */}
          <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-purple-900/30">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 dark:text-purple-400">
                ไม่มีการแจ้งเตือนในหมวดหมู่นี้
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => markSingleAsRead(item.id)}
                  className={`p-3.5 flex items-start gap-3 hover:bg-pink-50/40 dark:hover:bg-purple-950/30 transition-colors cursor-pointer ${
                    !item.read ? 'bg-pink-50/20 dark:bg-purple-950/15' : ''
                  }`}
                >
                  <div className={`p-2 rounded-xl bg-slate-100 dark:bg-purple-950/60 shrink-0 mt-0.5 shadow-2xs`}>
                    {getIcon(item.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className={`text-xs ${!item.read ? 'font-black text-pink-600 dark:text-pink-400' : 'font-bold text-slate-900 dark:text-white'} truncate`}>
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                        {item.time}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-purple-300/80 leading-relaxed line-clamp-2 mt-0.5 font-medium">
                      {item.message}
                    </p>
                  </div>

                  {!item.read && (
                    <div className="w-2 h-2 rounded-full bg-pink-500 shrink-0 mt-1.5 shadow-xs animate-pulse" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 text-center bg-slate-50 dark:bg-purple-950/30 border-t border-slate-100 dark:border-purple-900/40 text-[10px] text-slate-400 dark:text-purple-400 font-medium">
            Travel Tracker Smart Hub • จัดลำดับล่าสุดอยู่บนเสมอ
          </div>
        </div>
      </>
      )}
    </div>
  );
}
