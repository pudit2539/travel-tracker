// src/components/NotificationBell.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Bell, Check, CheckCheck, Trash2, X, Sparkles, 
  Receipt, CloudSun, MapPin, Calculator, AlertCircle 
} from 'lucide-react';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'expense' | 'weather' | 'itinerary' | 'settlement' | 'system';
  read: boolean;
  actionUrl?: string;
}

interface NotificationBellProps {
  expenses?: any[];
  itinerary?: any[];
  tripTitle?: string;
}

const READ_NOTIFS_KEY = 'travel_tracker_read_notifs_v1';
const CLEARED_NOTIFS_KEY = 'travel_tracker_cleared_notifs_v1';

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

export default function NotificationBell({ expenses = [], itinerary = [], tripTitle }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Generate dynamic contextual notifications with localStorage persistence
  useEffect(() => {
    const readIds = getStoredIds(READ_NOTIFS_KEY);
    const clearedIds = getStoredIds(CLEARED_NOTIFS_KEY);
    const list: NotificationItem[] = [];

    // 1. Weather notification
    const weatherId = 'notif-weather';
    if (!clearedIds.has(weatherId)) {
      list.push({
        id: weatherId,
        title: 'พยากรณ์อากาศโอซาก้า & เกียวโต 🌤️',
        message: 'อุณหภูมิเฉลี่ย 8-14°C อากาศหนาวเย็นในฤดูหนาว อย่าลืมพกเสื้อโค้ทหนาและฮีทเทค',
        time: 'วันนี้',
        type: 'weather',
        read: readIds.has(weatherId),
      });
    }

    // 2. Recent expense notification
    if (expenses.length > 0) {
      const latestExp = expenses[0];
      const expId = `notif-exp-${latestExp.id || 'recent'}`;
      if (!clearedIds.has(expId)) {
        list.push({
          id: expId,
          title: 'บันทึกค่าใช้จ่ายล่าสุด 🧾',
          message: `${latestExp.payer_name || 'สมาชิก'} บันทึก "${latestExp.title}" ยอด ${Number(latestExp.amount).toLocaleString()} ${latestExp.currency || 'JPY'}`,
          time: 'ล่าสุด',
          type: 'expense',
          read: readIds.has(expId),
        });
      }
    }

    // 3. Bill Settlement ready
    if (expenses.length >= 2) {
      const settleId = 'notif-settle';
      if (!clearedIds.has(settleId)) {
        list.push({
          id: settleId,
          title: 'ระบบเคลียร์บิลพร้อมคำนวณ 💸',
          message: 'มีรายการค่าใช้จ่ายเพียงพอแล้ว สามารถเปิดดูแผนการโอนเงินหารเฉลี่ยได้ทันที',
          time: 'วันนี้',
          type: 'settlement',
          read: readIds.has(settleId),
        });
      }
    }

    // 4. Itinerary Day 1 reminder
    if (itinerary.length > 0) {
      const firstItem = itinerary[0];
      const planId = 'notif-plan-start';
      if (!clearedIds.has(planId)) {
        list.push({
          id: planId,
          title: 'จุดเริ่มต้นการเดินทาง ✈️',
          message: `กิจกรรมแรก: "${firstItem.main_place}" (${firstItem.date_label || 'Day 1'})`,
          time: 'เริ่มต้นทริป',
          type: 'itinerary',
          read: readIds.has(planId),
        });
      }
    }

    setNotifications(list);
  }, [expenses.length, itinerary.length]);

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
      case 'expense':
        return <Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'weather':
        return <CloudSun className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case 'settlement':
        return <Calculator className="h-4 w-4 text-pink-600 dark:text-pink-400" />;
      case 'itinerary':
        return <MapPin className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
      default:
        return <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-2xl border border-slate-200 dark:border-purple-800 bg-white dark:bg-[#120c1e] text-slate-700 dark:text-purple-200 hover:border-pink-500 shadow-sm transition-colors cursor-pointer group"
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
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-3xl bg-white dark:bg-[#120c1e] shadow-2xl border border-slate-200 dark:border-purple-800/80 glow-pink z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          
          {/* Header */}
          <div className="p-4 pb-3 border-b border-slate-100 dark:border-purple-900/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-white">
                  การแจ้งเตือนทริป
                </h3>
                <span className="text-[10px] text-slate-500 dark:text-purple-400 font-bold">
                  {unreadCount > 0 ? `มี ${unreadCount} รายการใหม่` : 'อ่านครบทั้งหมดแล้ว'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="p-1 text-[10px] text-pink-600 dark:text-pink-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  title="ทำเครื่องหมายว่าอ่านแล้วทั้งหมด"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> อ่านทั้งหมด
                </button>
              )}
              <button
                onClick={clearAllNotifications}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                title="ล้างทั้งหมด"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-purple-900/30">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 dark:text-purple-400 font-medium">
                ไม่มีการแจ้งเตือนในขณะนี้
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markSingleAsRead(n.id)}
                  className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-purple-950/40 transition-colors cursor-pointer ${
                    !n.read ? 'bg-pink-50/50 dark:bg-pink-950/20' : ''
                  }`}
                >
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-purple-950/70 border border-slate-200 dark:border-purple-900/50 shrink-0 mt-0.5">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4 className={`text-xs font-black truncate ${!n.read ? 'text-pink-600 dark:text-pink-400' : 'text-slate-900 dark:text-white'}`}>
                        {n.title}
                      </h4>
                      <span className="text-[9px] text-slate-400 dark:text-purple-400 font-semibold shrink-0">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-purple-300/80 leading-snug line-clamp-2 font-medium">
                      {n.message}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-pink-500 shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-slate-100 dark:border-purple-900/40 text-center bg-slate-50 dark:bg-purple-950/20">
            <span className="text-[10px] text-slate-500 dark:text-purple-400 font-bold">
              Travel Tracker Smart Hub • Real-time Alerts
            </span>
          </div>

        </div>
      )}
    </div>
  );
}
