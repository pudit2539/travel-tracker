// src/components/ProfileModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { CAT_AVATARS, getCatAvatar } from '@/lib/avatars';
import { 
  X, Check, User, Lock, Mail, Key, LogOut, 
  Loader2, Eye, EyeOff, Sparkles, Copy, CheckCircle2, Shield, AlertCircle
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onProfileUpdated?: (updatedProfile: any) => void;
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

  // Fetch current user profile
  useEffect(() => {
    if (isOpen && user?.id) {
      fetchProfile();
    }
  }, [isOpen, user?.id]);

  const fetchProfile = async () => {
    setLoading(true);
    setSaveError('');
    try {
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
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setSavingProfile(true);
    setSaveSuccess(false);
    setSaveError('');

    try {
      const nameToSave = displayName.trim() || user.email?.split('@')[0];

      // 1. บันทึกข้อมูลลงตาราง profiles
      const profilePayload = {
        id: user.id,
        display_name: nameToSave,
        avatar_id: selectedAvatarId,
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(profilePayload);

      if (error) {
        throw new Error(error.message);
      }

      // 2. อัปเดต user_metadata ในระบบ Auth ไปด้วย
      await supabase.auth.updateUser({
        data: {
          display_name: nameToSave,
          avatar_id: selectedAvatarId,
        },
      });

      setSaveSuccess(true);
      if (onProfileUpdated) {
        onProfileUpdated({ display_name: nameToSave, avatar_id: selectedAvatarId });
      }
      setTimeout(() => setSaveSuccess(false), 3000);
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

  const handleLogout = async () => {
    if (confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
      await supabase.auth.signOut();
      router.push('/login');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#120c1e] shadow-2xl border border-slate-200 dark:border-purple-800/60 glow-pink-purple max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 pb-3 flex justify-between items-center border-b border-slate-100 dark:border-purple-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white text-lg shadow-md shadow-pink-500/25">
              🐱
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                ตั้งค่าโปรไฟล์ & บัญชีผู้ใช้
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-purple-300/70 font-medium">
                เลือก Avatar น้องแมว เปลี่ยนชื่อ และจัดการความปลอดภัย
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-purple-200 hover:bg-slate-100 dark:hover:bg-purple-950/50 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 pt-4 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
              <span className="text-xs font-bold text-slate-400 dark:text-purple-400">กำลังโหลดข้อมูลโปรไฟล์...</span>
            </div>
          ) : (
            <>
              {/* SECTION 1: CAT AVATAR SELECTOR */}
              <div className="space-y-2.5">
                <label className="block text-xs font-black text-slate-900 dark:text-white">
                  เลือก Avatar น้องแมวประจำตัว 🐾
                </label>
                <div className="grid grid-cols-4 gap-2.5">
                  {CAT_AVATARS.map((cat) => {
                    const isSelected = selectedAvatarId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedAvatarId(cat.id)}
                        className={`relative p-2.5 rounded-2xl border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/40 ring-2 ring-pink-500/40 scale-105 shadow-xs'
                            : 'border-slate-200 dark:border-purple-900/40 bg-slate-50/70 dark:bg-purple-950/20 hover:border-slate-300 dark:hover:border-purple-700'
                        }`}
                      >
                        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${cat.bgGradient} flex items-center justify-center text-2xl shadow-xs`}>
                          {cat.emoji}
                        </div>
                        <span className="text-[10px] font-bold text-slate-800 dark:text-purple-200 truncate w-full text-center">
                          {cat.name.split(' ')[0]}
                        </span>
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pink-500 text-white flex items-center justify-center text-[10px]">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 2: DISPLAY NAME & SAVE */}
              <form onSubmit={handleSaveProfile} className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-purple-200">
                    ชื่อที่ใช้แสดง (Display Name) *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-purple-400" />
                    <input
                      type="text"
                      required
                      placeholder="เช่น Alex, น้องน้ำ, พุด"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 font-bold"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-purple-400 mt-1 block font-medium">
                    ชื่อนี้จะแสดงเป็นผู้จ่ายในรายการค่าใช้จ่ายและรายชื่อสมาชิกในทริป
                  </span>
                </div>

                {saveError && (
                  <div className="text-xs font-bold text-rose-600 flex items-center gap-1.5 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
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
                    className="ml-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold shadow-md shadow-pink-500/25 transition-all disabled:opacity-50 cursor-pointer hover:scale-105"
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
              <div className="border-t border-slate-100 dark:border-purple-900/40 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPasswordSection(!showPasswordSection)}
                  className="flex items-center justify-between w-full text-xs font-bold text-purple-700 dark:text-purple-300 hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Lock className="h-4 w-4 text-pink-500" /> เปลี่ยนรหัสผ่าน (Change Password)
                  </span>
                  <span>{showPasswordSection ? '▲ ซ่อน' : '▼ ขยาย'}</span>
                </button>

                {showPasswordSection && (
                  <form onSubmit={handleChangePassword} className="mt-3 p-4 rounded-2xl bg-slate-50 dark:bg-purple-950/30 border border-slate-200 dark:border-purple-900/40 space-y-3 animate-in fade-in">
                    <div>
                      <label className="block text-[11px] font-bold mb-1 text-slate-800 dark:text-purple-200">
                        รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          placeholder="••••••••"
                          className="w-full p-2.5 pr-9 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-white dark:bg-[#1c1328]/80 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500"
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
                      <label className="block text-[11px] font-bold mb-1 text-slate-800 dark:text-purple-200">
                        ยืนยันรหัสผ่านใหม่
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-white dark:bg-[#1c1328]/80 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500"
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
                      className="w-full py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {savingPassword ? 'กำลังเปลี่ยนรหัสผ่าน...' : 'ยืนยันเปลี่ยนรหัสผ่าน'}
                    </button>
                  </form>
                )}
              </div>

              {/* SECTION 4: ACCOUNT INFO & LOGOUT */}
              <div className="border-t border-slate-100 dark:border-purple-900/40 pt-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-purple-400 font-medium">อีเมลที่ล็อกอิน:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">{user?.email}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-purple-400 font-medium">User ID:</span>
                  <button
                    type="button"
                    onClick={copyUserId}
                    className="font-mono text-[11px] text-pink-600 dark:text-pink-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>{user?.id?.slice(0, 13)}...</span>
                    {copiedId ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full py-2.5 rounded-xl border border-rose-300 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" /> ออกจากระบบ (Sign Out)
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
