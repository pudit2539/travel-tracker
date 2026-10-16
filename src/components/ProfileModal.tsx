// src/components/ProfileModal.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { CAT_AVATARS, getCatAvatar } from '@/lib/avatars';
import { 
  X, Check, User, Lock, Mail, Key, LogOut, 
  Loader2, Eye, EyeOff, Sparkles, Copy, CheckCircle2, Shield, AlertCircle,
  Laptop, Smartphone, Tablet, Monitor, RefreshCw
} from 'lucide-react';
import { fetchUserDevices, removeUserDevice, signOutOtherDevices, DeviceSession } from '@/lib/sessionManager';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onProfileUpdated?: (updatedProfile: { display_name: string; avatar_id: string }) => void;
}

export default function ProfileModal({ isOpen, onClose, user, onProfileUpdated }: ProfileModalProps) {
  const router = useRouter();

  // Profile data
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState('cat_pink');
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Change password state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Copied User ID state
  const [copiedId, setCopiedId] = useState(false);

  // Active Devices State
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [signingOutOthers, setSigningOutOthers] = useState(false);

  const loadDevices = useCallback(async () => {
    if (!user?.id) return;
    setLoadingDevices(true);
    try {
      const list = await fetchUserDevices(user.id);
      setDevices(list);
    } catch (e) {
      console.error('Failed to load devices', e);
    } finally {
      setLoadingDevices(false);
    }
  }, [user?.id]);

  const handleSignOutOthers = async () => {
    if (!user?.id) return;
    if (!window.confirm('คุณต้องการออกจากระบบบนอุปกรณ์อื่นทั้งหมดใช่หรือไม่?')) return;
    setSigningOutOthers(true);
    try {
      await signOutOtherDevices(user.id);
      await loadDevices();
    } finally {
      setSigningOutOthers(false);
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    if (!user?.id) return;
    if (!window.confirm('ต้องการนำอุปกรณ์นี้ออกจากรายการใช่หรือไม่?')) return;
    await removeUserDevice(user.id, deviceId);
    await loadDevices();
  };

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setSaveError('');
    try {
      // Check local storage first
      try {
        const cached = localStorage.getItem(`travel_tracker_profile_${user.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.display_name) setDisplayName(parsed.display_name);
          if (parsed.avatar_id) setSelectedAvatarId(parsed.avatar_id);
        }
      } catch {}

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setDisplayName(data.display_name || user.user_metadata?.display_name || user.email?.split('@')[0] || '');
        setSelectedAvatarId(data.avatar_id || user.user_metadata?.avatar_id || 'cat_pink');
      } else {
        setDisplayName(user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split('@')[0] || '');
        setSelectedAvatarId(user.user_metadata?.avatar_id || 'cat_pink');
      }
    } catch (err) {
      console.error('Fetch profile err:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Body scroll lock and ESC key listener
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Fetch current user profile and active devices
  useEffect(() => {
    if (isOpen && user?.id) {
      fetchProfile();
      loadDevices();
    }
  }, [isOpen, user?.id, fetchProfile, loadDevices]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setSavingProfile(true);
    setSaveSuccess(false);
    setSaveError('');

    try {
      const nameToSave = displayName.trim() || user.email?.split('@')[0];

      const profilePayload = {
        id: user.id,
        display_name: nameToSave,
        avatar_id: selectedAvatarId,
      };

      // 1. บันทึกข้อมูลลงตาราง profiles
      try {
        const { error } = await supabase
          .from('profiles')
          .upsert(profilePayload);
        if (error) console.warn('profiles upsert note:', error.message);
      } catch (profErr) {
        console.warn('profiles table upsert note:', profErr);
      }

      // 2. อัปเดต user_metadata ในระบบ Auth ไปด้วย
      try {
        await supabase.auth.updateUser({
          data: {
            display_name: nameToSave,
            avatar_id: selectedAvatarId,
          },
        });
      } catch (authErr) {
        console.warn('Auth updateUser note:', authErr);
      }

      // 3. บันทึกสำรองลง LocalStorage
      try {
        localStorage.setItem(`travel_tracker_profile_${user.id}`, JSON.stringify(profilePayload));
      } catch {}

      setSaveSuccess(true);
      if (onProfileUpdated) {
        onProfileUpdated({ display_name: nameToSave, avatar_id: selectedAvatarId });
      }

      // Automatically close modal after brief confirmation feedback
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Save profile error:', err);
      setSaveError(err.message || 'เกิดข้อผิดพลาดในการบันทึกโปรไฟล์');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน');
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPasswordSuccess(false);
        setShowPasswordSection(false);
      }, 3000);
    } catch (err: any) {
      setPasswordError(err.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้');
    } finally {
      setSavingPassword(false);
    }
  };

  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ?')) return;
    setLoggingOut(true);
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((resolve) => setTimeout(resolve, 600)),
      ]);
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      try {
        localStorage.removeItem('travel_tracker_cached_profile');
        sessionStorage.clear();
      } catch {}
      onClose();
      window.location.replace('/login');
    }
  };

  const copyUserId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overscroll-contain overflow-x-hidden animate-in fade-in duration-200 select-none modal-safe-overlay" role="dialog" aria-modal="true">
      <div className="w-full max-w-xl rounded-2xl sm:rounded-3xl bg-white dark:bg-[#151b2b] shadow-2xl border border-slate-200/90 dark:border-[#222c42] glow-blue max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 modal-safe-card">
        {/* Header */}
        <div className="p-4 sm:p-6 pb-3 flex justify-between items-center border-b border-slate-100 dark:border-[#222c42] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-lg shadow-md shadow-blue-500/25">
              🐱
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                ตั้งค่าโปรไฟล์ & บัญชีผู้ใช้
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                เลือก Avatar น้องแมว ({CAT_AVATARS.length} แบบ) เปลี่ยนชื่อ และจัดการความปลอดภัย
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1c2438] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 pt-4 overflow-y-auto overflow-x-hidden touch-pan-y overscroll-contain custom-scrollbar flex-1 min-h-0 space-y-5">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="text-xs font-bold text-slate-400">กำลังโหลดข้อมูลโปรไฟล์...</span>
            </div>
          ) : (
            <>
              {/* SECTION 1: CAT AVATAR SELECTOR */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-slate-900 dark:text-white">
                    เลือก Avatar น้องแมวประจำตัว 🐾 ({CAT_AVATARS.length} แบบ)
                  </label>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                    คลิกเลือกรูปที่ชอบ
                  </span>
                </div>
                
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-56 overflow-y-auto custom-scrollbar p-1">
                  {CAT_AVATARS.map((cat) => {
                    const isSelected = selectedAvatarId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedAvatarId(cat.id)}
                        className={`relative p-2 rounded-2xl border transition-all flex flex-col items-center gap-1 cursor-pointer hover:scale-105 active:scale-95 ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/60 ring-2 ring-blue-500/50 scale-105 shadow-sm'
                            : 'border-slate-200 dark:border-[#222c42] bg-slate-50/70 dark:bg-[#1c2438] hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] shadow-xs">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        )}
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${cat.bgGradient} flex items-center justify-center text-xl shadow-xs overflow-hidden`}>
                          {cat.imgUrl ? (
                            <img src={cat.imgUrl} alt={cat.name} className="w-full h-full object-cover" />
                          ) : (
                            cat.emoji
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate w-full text-center">
                          {cat.name.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 2: DISPLAY NAME & SAVE */}
              <form onSubmit={handleSaveProfile} className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">
                    ชื่อที่ใช้แสดง (Display Name) *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="เช่น Alex, น้องน้ำ, พุด"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-[#2a3650] bg-white dark:bg-[#151b2b] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-bold"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block font-medium">
                    ชื่อนี้จะแสดงเป็นผู้จ่ายในรายการค่าใช้จ่ายและรายชื่อสมาชิกในทริป
                  </span>
                </div>

                {saveError && (
                  <div className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{saveError}</span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-1">
                  {saveSuccess && (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                      <CheckCircle2 className="h-4 w-4" /> บันทึกโปรไฟล์สำเร็จแล้ว!
                    </span>
                  )}
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="ml-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all disabled:opacity-50 cursor-pointer hover:scale-105 active:scale-95"
                  >
                    {savingProfile ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> กำลังบันทึก...
                      </span>
                    ) : (
                      'บันทึกข้อมูลโปรไฟล์'
                    )}
                  </button>
                </div>
              </form>

              {/* SECTION 3: CHANGE PASSWORD (ACCORDION) */}
              <div className="border-t border-slate-100 dark:border-[#222c42] pt-4">
                <button
                  type="button"
                  onClick={() => setShowPasswordSection(!showPasswordSection)}
                  className="flex items-center justify-between w-full text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Lock className="h-4 w-4 text-blue-500" /> เปลี่ยนรหัสผ่าน (Change Password)
                  </span>
                  <span>{showPasswordSection ? '▲ ซ่อน' : '▼ ขยาย'}</span>
                </button>

                {showPasswordSection && (
                  <form onSubmit={handleChangePassword} className="mt-3 p-4 rounded-2xl bg-slate-50 dark:bg-[#1c2438] border border-slate-200 dark:border-[#222c42] space-y-3 animate-in fade-in">
                    <div>
                      <label className="block text-[11px] font-bold mb-1 text-slate-800 dark:text-slate-200">
                        รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          placeholder="••••••••"
                          className="w-full p-2.5 pr-9 rounded-xl border border-slate-300 dark:border-[#2a3650] bg-white dark:bg-[#151b2b] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-500"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold mb-1 text-slate-800 dark:text-slate-200">
                        ยืนยันรหัสผ่านใหม่
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#2a3650] bg-white dark:bg-[#151b2b] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-500"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>

                    {passwordError && (
                      <div className="text-xs font-bold text-rose-600">{passwordError}</div>
                    )}
                    {passwordSuccess && (
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">เปลี่ยนรหัสผ่านสำเร็จแล้ว!</div>
                    )}

                    <button
                      type="submit"
                      disabled={savingPassword}
                      className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {savingPassword ? 'กำลังเปลี่ยนรหัสผ่าน...' : 'ยืนยันเปลี่ยนรหัสผ่าน'}
                    </button>
                  </form>
                )}
              </div>

              {/* SECTION 4: ACTIVE DEVICES & MULTI-DEVICE MANAGEMENT */}
              <div className="border-t border-slate-100 dark:border-[#222c42] pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Laptop className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      อุปกรณ์ที่เข้าสู่ระบบอยู่ ({devices.length})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={loadDevices}
                    disabled={loadingDevices}
                    className="p-1 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="รีเฟรชรายการอุปกรณ์"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingDevices ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  บัญชีของคุณสามารถล็อกอินได้พร้อมกันหลายเครื่อง ตรวจสอบหรือจัดการอุปกรณ์ที่ใช้งานได้ที่นี่
                </p>

                {/* Device List Cards */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {devices.map((dev) => {
                    const isCurrent = dev.is_current;
                    const Icon = dev.device_type === 'mobile' 
                      ? Smartphone 
                      : dev.device_type === 'tablet' 
                        ? Tablet 
                        : Laptop;

                    return (
                      <div
                        key={dev.device_id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                          isCurrent
                            ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60'
                            : 'bg-slate-50/60 dark:bg-[#1a202c]/50 border-slate-200/80 dark:border-[#262f40]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isCurrent 
                              ? 'bg-blue-600 text-white shadow-sm' 
                              : 'bg-slate-200 dark:bg-[#222c42] text-slate-600 dark:text-slate-300'
                          }`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {dev.device_name || 'อุปกรณ์ที่ไม่ระบุชื่อ'}
                              </span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                                  🟢 เครื่องนี้
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <span>{dev.browser}</span>
                              <span>•</span>
                              <span>
                                {isCurrent 
                                  ? 'กำลังใช้งานอยู่' 
                                  : dev.last_active_at 
                                    ? new Date(dev.last_active_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                                    : 'ล่าสุดไม่นานนี้'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDevice(dev.device_id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0 cursor-pointer"
                            title="ออกจากระบบบนอุปกรณ์นี้"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {devices.length > 1 && (
                  <button
                    type="button"
                    onClick={handleSignOutOthers}
                    disabled={signingOutOthers}
                    className="w-full py-1.5 px-3 rounded-lg border border-slate-200 dark:border-[#262f40] hover:border-rose-300 dark:hover:border-rose-900 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {signingOutOthers ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <LogOut className="h-3.5 w-3.5" />
                    )}
                    <span>ออกจากระบบเครื่องอื่นทั้งหมด ({devices.length - 1} เครื่อง)</span>
                  </button>
                )}
              </div>

              {/* SECTION 5: ACCOUNT INFO & LOGOUT */}
              <div className="border-t border-slate-100 dark:border-[#222c42] pt-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">อีเมลที่ล็อกอิน:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">{user?.email}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">User ID:</span>
                  <button
                    type="button"
                    onClick={copyUserId}
                    className="font-mono text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>{user?.id?.slice(0, 13)}...</span>
                    {copiedId ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="w-full py-2.5 rounded-xl border border-rose-300 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {loggingOut ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="h-4 w-4 animate-spin" /> กำลังออกจากระบบ...
                      </span>
                    ) : (
                      <>
                        <LogOut className="h-4 w-4" /> ออกจากระบบ (Sign Out)
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
}
