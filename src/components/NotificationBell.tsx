// src/components/NotificationBell.tsx
'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, BellOff, CheckCheck, Trash2, X, 
  Receipt, Users, Clock, ShieldCheck 
} from 'lucide-react';
import { toast } from 'sonner';
import { ROLE_INFO, TripRole } from '@/lib/permissions';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  timestamp: number;
  type: 'member' | 'expense' | 'system';
  read: boolean;
  actionUrl?: string;
}

interface NotificationBellProps {
  expenses?: any[];
  itinerary?: any[];
  members?: any[];
  tripTitle?: string;
  currentUser?: any;
  userDisplayName?: string;
}

const READ_NOTIFS_KEY = 'travel_tracker_read_notifs_v3';
const CLEARED_NOTIFS_KEY = 'travel_tracker_cleared_notifs_v3';
const NOTIF_MUTED_KEY = 'travel_tracker_notif_muted_v1';
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
  members = EMPTY_ARRAY, 
  tripTitle,
  currentUser,
  userDisplayName,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'member' | 'expense'>('all');
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [clearedIds, setClearedIds] = useState<Set<string>>(() => new Set());
  const [isMuted, setIsMuted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [baseTimestamp] = useState(() => (typeof window !== 'undefined' ? Date.now() : 1735689600000));

  // Initialize stored IDs and mute state on client mount
  useEffect(() => {
    setReadIds(getStoredIds(READ_NOTIFS_KEY));
    setClearedIds(getStoredIds(CLEARED_NOTIFS_KEY));
    try {
      const storedMute = localStorage.getItem(NOTIF_MUTED_KEY);
      if (storedMute === 'true') setIsMuted(true);
    } catch {}
  }, []);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    try {
      localStorage.setItem(NOTIF_MUTED_KEY, String(next));
    } catch {}
    toast.info(next ? 'เปิดโหมดเงียบ (ปิดการแจ้งเตือนกระดิ่ง) 🔕' : 'เปิดการแจ้งเตือนตามปกติ 🔔');
  };

  // Current user identifiers to filter out own actions
  const myId = (currentUser?.id || '').toLowerCase();
  const myName = (userDisplayName || currentUser?.user_metadata?.display_name || '').trim().toLowerCase();

  // Compute notifications cleanly: Only REAL updates from OTHER members.
  // NO nagging recommendations, NO self-triggered notifications.
  const notifications = useMemo(() => {
    const list: NotificationItem[] = [];

    // 1. Member Join Notifications (from other people)
    if (members && members.length > 0) {
      members.forEach((m, idx) => {
        const mUserId = (m.user_id || '').toLowerCase();
        // Skip current user themselves
        if (myId && mUserId === myId) return;

        const memberId = `notif-member-${m.user_id || m.id || idx}`;
        if (!clearedIds.has(memberId)) {
          const mName = m.profiles?.display_name || m.profiles?.email?.split('@')[0] || 'สมาชิกใหม่';
          const memberTime = m.created_at ? new Date(m.created_at) : new Date(baseTimestamp);
          
          list.push({
            id: memberId,
            title: 'สมาชิกใหม่เข้าร่วมทริป',
            message: `${mName} เข้าร่วมทริปแล้ว (${ROLE_INFO[m.role as TripRole]?.label || m.role || 'สมาชิก'})`,
            time: m.created_at ? memberTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : 'ล่าสุด',
            timestamp: m.created_at ? memberTime.getTime() : baseTimestamp - (idx * 60000),
            type: 'member',
            read: readIds.has(memberId),
          });
        }
      });
    }

    // 2. Expenses recorded by OTHER members
    if (expenses && expenses.length > 0) {
      expenses.slice(0, 10).forEach((exp, idx) => {
        const pId = (exp.payer_id || exp.created_by || '').toLowerCase();
        const pName = (exp.payer_name || '').trim().toLowerCase();
        
        // Never notify user about expenses they recorded or paid themselves
        const isMyExpense = 
          (myId && pId === myId) || 
          (myName && pName === myName) || 
          pName.includes('ฉัน') || 
          pName === 'me';

        if (isMyExpense) return;

        const expId = `notif-exp-${exp.id || idx}`;
        if (!clearedIds.has(expId)) {
          const expTime = exp.spent_at ? new Date(exp.spent_at) : new Date(baseTimestamp);
          list.push({
            id: expId,
            title: 'เพื่อนร่วมทริปบันทึกค่าใช้จ่าย 🧾',
            message: `${exp.payer_name || 'เพื่อนร่วมทริป'} บันทึก "${exp.title}" ยอด ${Number(exp.amount).toLocaleString()} ${exp.currency || 'JPY'}`,
            time: exp.spent_at ? new Date(exp.spent_at).toLocaleDateString('th-TH') : 'ล่าสุด',
            timestamp: expTime.getTime() - (idx * 1000),
            type: 'expense',
            read: readIds.has(expId),
          });
        }
      });
    }

    // Sort strictly by timestamp descending
    list.sort((a, b) => b.timestamp - a.timestamp);
    return list;
  }, [expenses, members, readIds, clearedIds, baseTimestamp, myId, myName]);

  // Unread badge count (0 if muted)
  const unreadCount = useMemo(() => {
    if (isMuted) return 0;
    return notifications.filter((n) => !n.read).length;
  }, [notifications, isMuted]);

  // Auto mark as read when user opens the drawer so the red bubble clears naturally
  const handleOpenDropdown = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState && unreadCount > 0) {
      setReadIds((prev) => {
        const updated = new Set(prev);
        notifications.forEach((n) => updated.add(n.id));
        saveStoredIds(READ_NOTIFS_KEY, updated);
        return updated;
      });
    }
  };

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

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    return notifications.filter((n) => {
      if (activeFilter === 'member') return n.type === 'member';
      if (activeFilter === 'expense') return n.type === 'expense';
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
        return <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case 'expense':
      default:
        return <Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Calm Bell Button without aggressive shake */}
      <button
        type="button"
        onClick={handleOpenDropdown}
        className={`relative p-2 sm:p-2.5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-2xs backdrop-blur-md ${
          isOpen
            ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 text-blue-600 dark:text-blue-400 scale-105 shadow-md shadow-blue-500/20'
            : isMuted
            ? 'bg-slate-100 dark:bg-[#1a2030] border-slate-300 dark:border-[#2b354f] text-slate-400 hover:text-slate-600'
            : 'bg-white/90 dark:bg-[#151b2b]/90 border-slate-200/90 dark:border-[#222c42] text-slate-700 dark:text-slate-200 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 active:scale-95'
        }`}
        title={isMuted ? 'การแจ้งเตือน (โหมดเงียบเปิดอยู่)' : 'การแจ้งเตือนจากเพื่อนร่วมทริป'}
      >
        {isMuted ? (
          <BellOff className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-slate-400" />
        ) : (
          <Bell className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
        )}
        
        {unreadCount > 0 && !isMuted && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white shadow-xs ring-2 ring-white dark:ring-[#151b2b]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover / Dropdown Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 z-50 w-auto sm:w-96 rounded-3xl bg-white/98 dark:bg-[#151b2b]/98 backdrop-blur-2xl border border-slate-200/90 dark:border-[#222c42] shadow-2xl shadow-blue-950/20 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 pb-3 border-b border-slate-100 dark:border-[#222c42] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  {isMuted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>การแจ้งเตือน</span>
                    {isMuted && (
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#1c2438] px-2 py-0.5 rounded-full">
                        🔕 โหมดเงียบ
                      </span>
                    )}
                    {!isMuted && unreadCount > 0 && (
                      <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/70 border border-blue-200/80 dark:border-blue-900/60 px-2 py-0.5 rounded-full">
                        {unreadCount} ใหม่
                      </span>
                    )}
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[190px]">
                    {tripTitle ? `${tripTitle}` : 'เฉพาะความเคลื่อนไหวจากเพื่อนร่วมทริป'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Mute Toggle Button */}
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`p-1.5 rounded-xl border text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    isMuted
                      ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-transparent hover:bg-slate-100 dark:hover:bg-[#1c2438]'
                  }`}
                  title={isMuted ? 'ปิดโหมดเงียบ' : 'เปิดโหมดเงียบ (ไม่รบกวน)'}
                >
                  {isMuted ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                </button>

                {notifications.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-colors cursor-pointer"
                      title="ทำเครื่องหมายว่าอ่านหมดแล้ว"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={clearAllNotifications}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                      title="ล้างรายการทั้งหมด"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
                
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1c2438] rounded-xl transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-50/70 dark:bg-[#111624]/60 border-b border-slate-100 dark:border-[#222c42]">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-black shrink-0 transition-all cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/80 dark:hover:bg-[#1c2438]'
                }`}
              >
                ทั้งหมด ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('expense')}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                  activeFilter === 'expense'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/80 dark:hover:bg-[#1c2438]'
                }`}
              >
                🧾 เพื่อนบันทึกรายจ่าย
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('member')}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                  activeFilter === 'member'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/80 dark:hover:bg-[#1c2438]'
                }`}
              >
                👥 สมาชิกใหม่
              </button>
            </div>

            {/* Notifications List */}
            <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-[#222c42]">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-[#1c2438] flex items-center justify-center text-slate-400 mx-auto">
                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">
                    {isMuted ? 'เปิดโหมดเงียบอยู่ 🔕' : 'ไม่มีการแจ้งเตือนใหม่ ✨'}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-xs mx-auto leading-relaxed">
                    {isMuted
                      ? 'คุณได้ปิดการแจ้งเตือนกระดิ่งไว้ สามารถแตะปุ่มกระดิ่งด้านบนเพื่อเปิดรับตามปกติ'
                      : 'ระบบจะแจ้งเฉพาะเมื่อมีเพื่อนร่วมทริปบันทึกค่าใช้จ่ายใหม่ หรือมีสมาชิกใหม่เข้าร่วม'}
                  </p>
                </div>
              ) : (
                filteredNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => markSingleAsRead(notif.id)}
                    className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer group ${
                      !notif.read
                        ? 'bg-blue-50/40 dark:bg-blue-950/30 border-l-2 border-blue-500 hover:bg-blue-50/70 dark:hover:bg-blue-950/50'
                        : 'hover:bg-slate-50 dark:hover:bg-[#1c2438]/50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-[#222c42] flex items-center justify-center shrink-0 shadow-2xs">
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

                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug line-clamp-2">
                        {notif.message}
                      </p>
                    </div>

                    {!notif.read && (
                      <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 shadow-xs shrink-0 mt-1.5" />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Quiet Mode Footnote */}
            <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-[#111624]/60 border-t border-slate-100 dark:border-[#222c42] flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <span>🔔 แจ้งเฉพาะข้อมูลจริงจากเพื่อน</span>
              </span>
              <button
                type="button"
                onClick={toggleMute}
                className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
              >
                {isMuted ? 'เปิดแจ้งเตือน' : 'เปิดโหมดเงียบ'}
              </button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
