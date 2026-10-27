'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Eye, EyeOff, Lock, Mail, User, Compass, KeyRound, 
  ArrowRight, Loader2, Sparkles, Sun, Moon, AlertCircle, 
  CheckCircle2, Users, ArrowLeft, Check, ShieldCheck 
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { setRememberMePreference, trackCurrentDevice } from '@/lib/sessionManager';
import { toast } from 'sonner';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/';

  const { theme, setTheme } = useTheme();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // State สำหรับ Forgot Password (ขอลิงก์รีเซ็ต)
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // State สำหรับ Reset Password (ตั้งรหัสผ่านใหม่เมื่อกดลิงก์จากอีเมล)
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [resetPasswordMsg, setResetPasswordMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // ตรวจจับกรณีผู้ใช้คลิกลิงก์ Reset Password จากอีเมล (ตรวจทั้ง URL hash, searchParams และ Supabase Auth event)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      if (hash.includes('type=recovery') || search.includes('type=recovery')) {
        setShowResetPasswordModal(true);

        // ดึง access_token และ refresh_token จาก hash เพื่อเซ็ต session ให้พร้อมทันที
        try {
          const params = new URLSearchParams(hash.replace(/^#/, ''));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          if (accessToken && refreshToken) {
            supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }
        } catch (e) {
          console.warn('Set session from recovery hash note:', e);
        }
      } else if (search.includes('code=')) {
        // กรณี Supabase ส่งมาเป็น PKCE Auth Code
        const code = new URLSearchParams(search).get('code');
        if (code) {
          supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
            if (!error) {
              setShowResetPasswordModal(true);
            }
          });
        }
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowResetPasswordModal(true);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const autoJoinTripIfInvited = async (userId: string) => {
    if (!returnUrl.startsWith('/trips/')) return;
    try {
      const parts = returnUrl.split('/trips/');
      const tripId = parts[1]?.split('?')[0];
      if (!tripId) return;

      // Check if already member
      const { data: existing } = await supabase
        .from('trip_members')
        .select('id')
        .eq('trip_id', tripId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!existing) {
        await supabase.from('trip_members').insert([
          { trip_id: tripId, user_id: userId, role: 'plan_only' }
        ]);
      }
    } catch (e) {
      console.error('Auto join trip failed', e);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isRegister) {
        if (password.length < 6) {
          throw new Error('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
        }

        // 1. สมัครสมาชิก
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              display_name: displayName.trim() || email.split('@')[0],
              avatar_id: 'cat_blue',
            },
          },
        });

        if (error) {
          if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already exists')) {
            throw new Error('ALREADY_REGISTERED');
          }
          throw error;
        }

        // 2. ล็อกอินให้อัตโนมัติทันที
        let session = data.session;
        if (!session) {
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password,
          });
          if (signInErr) {
            setSuccessMsg('สมัครสมาชิกสำเร็จแล้ว! กำลังนำท่านเข้าสู่ระบบ...');
            setIsRegister(false);
            setLoading(false);
            return;
          }
          session = signInData.session;
        }

        if (session?.user) {
          setRememberMePreference(rememberMe);
          await trackCurrentDevice(session.user.id);
          await autoJoinTripIfInvited(session.user.id);
          try {
            const userMeta = session.user.user_metadata;
            if (userMeta) {
              localStorage.setItem('travel_tracker_cached_profile', JSON.stringify({
                id: session.user.id,
                display_name: userMeta.display_name || session.user.email?.split('@')[0],
                avatar_id: userMeta.avatar_id || 'cat_pink'
              }));
            }
          } catch {}
          router.push(returnUrl);
        }
      } else {
        // เข้าสู่ระบบ
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
          } else if (error.message.includes('Email not confirmed')) {
            throw new Error('กรุณายืนยันอีเมล หรือไปปิด Confirm Email ใน Supabase');
          }
          throw error;
        }

        if (data.session?.user) {
          setRememberMePreference(rememberMe);
          await trackCurrentDevice(data.session.user.id);
          await autoJoinTripIfInvited(data.session.user.id);
          try {
            const userMeta = data.session.user.user_metadata;
            if (userMeta) {
              localStorage.setItem('travel_tracker_cached_profile', JSON.stringify({
                id: data.session.user.id,
                display_name: userMeta.display_name || data.session.user.email?.split('@')[0],
                avatar_id: userMeta.avatar_id || 'cat_pink'
              }));
            }
          } catch {}
        }

        router.push(returnUrl);
      }
    } catch (err: any) {
      if (err.message === 'ALREADY_REGISTERED') {
        setErrorMsg('อีเมลนี้เคยสมัครสมาชิกไว้แล้ว กรุณาเข้าสู่ระบบ');
        setTimeout(() => {
          setIsRegister(false);
        }, 1500);
      } else {
        setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการดำเนินการ');
      }
    } finally {
      setLoading(false);
    }
  };

  // จัดการ Forgot Password (ขอส่งลิงก์รีเซ็ตเข้าอีเมล)
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;

    setForgotLoading(true);
    setForgotMsg(null);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${origin}/login?type=recovery`,
      });
      if (error) throw error;
      setForgotMsg({
        type: 'success',
        text: `ส่งลิงก์รีเซ็ตรหัสผ่านไปยัง ${forgotEmail.trim()} เรียบร้อยแล้ว! กรุณาตรวจสอบอีเมลของคุณ (รวมถึงโฟลเดอร์สแปม/ขยะ) แล้วคลิกลิงก์เพื่อตั้งรหัสผ่านใหม่`,
      });
      toast.success('ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว 📧');
    } catch (err: any) {
      setForgotMsg({
        type: 'error',
        text: 'เกิดข้อผิดพลาด: ' + (err.message || 'ไม่สามารถส่งอีเมลได้ กรุณาตรวจสอบอีเมลอีกครั้ง'),
      });
    } finally {
      setForgotLoading(false);
    }
  };

  // จัดการ Reset Password (บันทึกรหัสผ่านใหม่ลง Supabase)
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setResetPasswordMsg({ type: 'error', text: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetPasswordMsg({ type: 'error', text: 'รหัสผ่านทั้งสองช่องไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง' });
      return;
    }

    setResetPasswordLoading(true);
    setResetPasswordMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setResetPasswordMsg({
        type: 'success',
        text: 'ตั้งรหัสผ่านใหม่สำเร็จแล้ว! ระบบกำลังนำท่านเข้าสู่การใช้งาน...',
      });
      toast.success('เปลี่ยนรหัสผ่านใหม่เรียบร้อยแล้ว 🎉');
      setTimeout(() => {
        setShowResetPasswordModal(false);
        router.push(returnUrl || '/');
      }, 1600);
    } catch (err: any) {
      setResetPasswordMsg({
        type: 'error',
        text: 'ไม่สามารถเปลี่ยนรหัสผ่านได้: ' + (err.message || 'กรุณาลองใหม่อีกครั้ง'),
      });
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const isInviteFlow = returnUrl.startsWith('/trips/');

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center px-4 py-8 safe-area-x overflow-y-auto bg-grid-pattern bg-[#f8f9fb] dark:bg-[#121316] text-slate-900 dark:text-white transition-colors duration-300">
      
      {/* Theme Toggle - Positioned with safe-area insets for iPhone notch/Dynamic Island */}
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        style={{
          top: 'max(env(safe-area-inset-top, 0px) + 0.75rem, 1rem)',
          right: 'max(env(safe-area-inset-right, 0px) + 0.75rem, 1rem)',
        }}
        className="fixed z-30 p-2.5 rounded-2xl border border-slate-200/90 dark:border-[#262932] bg-white/90 dark:bg-[#181a20]/90 backdrop-blur-md shadow-xs hover:border-blue-500 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer min-w-10 min-h-10 flex items-center justify-center"
        title="สลับธีม สว่าง/มืด"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
      </button>

      {/* Main Login Card - Compact max-w-[400px], perfectly fitted for iPhone Portrait (375-390px) without overlapping text */}
      <div className="w-full max-w-[400px] rounded-3xl border border-slate-200/90 dark:border-[#262932] bg-white dark:bg-[#181a20] p-6 sm:p-7 shadow-xl z-10 space-y-5 my-auto">
        
        {/* App Logo & Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-1 rounded-2xl border border-slate-200/80 dark:border-[#262932] bg-slate-50 dark:bg-[#121316] shadow-xs">
            <img
              src="/app-logo.png"
              alt="Travel Tracker Logo"
              className="w-14 h-14 rounded-xl object-cover"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {isRegister ? 'สร้างบัญชีผู้ใช้ใหม่' : 'เข้าสู่ระบบ Travel Tracker'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-xs mx-auto">
            {isRegister ? 'เริ่มต้นวางแผนทริป จัดการงบ และบันทึกเรื่องราวการเดินทาง' : 'บันทึกแผนการเดินทางและจัดการงบประมาณทริปของคุณ'}
          </p>
        </div>

        {/* Invite Flow Banner */}
        {isInviteFlow && (
          <div className="p-3 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-center space-y-0.5 animate-in fade-in">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1.5">
              <Users className="h-4 w-4" /> คุณได้รับคำเชิญเข้าร่วมทริป!
            </span>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
              {isRegister ? 'สมัครสมาชิกเสร็จแล้ว ระบบจะพาคุณเข้าสู่ทริปทันที' : 'เข้าสู่ระบบเพื่อเริ่มวางแผนและบันทึกค่าใช้จ่ายร่วมกัน'}
            </p>
          </div>
        )}

        {/* Alerts */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
            {errorMsg.includes('เคยสมัคร') && (
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setErrorMsg('');
                }}
                className="px-2.5 py-1 rounded-xl bg-blue-600 text-white text-[10px] font-bold shrink-0 hover:bg-blue-700 cursor-pointer"
              >
                เข้าสู่ระบบ
              </button>
            )}
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/80 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          {isRegister && (
            <div className="space-y-1.5 animate-in fade-in duration-200">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                ชื่อที่ใช้แสดง (Display Name)
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="เช่น Popcornz, Alex"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-[#262932] bg-slate-50 dark:bg-[#121316] text-slate-900 dark:text-white text-sm outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#181a20] transition-all font-medium min-h-12"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
              อีเมล
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-[#262932] bg-slate-50 dark:bg-[#121316] text-slate-900 dark:text-white text-sm outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#181a20] transition-all font-medium min-h-12"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                รหัสผ่าน
              </label>
              {!isRegister && (
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotMsg(null);
                    setShowForgotModal(true);
                  }}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  ลืมรหัสผ่าน?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-11 py-3 rounded-2xl border border-slate-200 dark:border-[#262932] bg-slate-50 dark:bg-[#121316] text-slate-900 dark:text-white text-sm outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#181a20] transition-all font-medium min-h-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center justify-between py-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded-md border-slate-300 dark:border-[#262932] text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                จดจำการเข้าสู่ระบบ
              </span>
            </label>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              7 วัน
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-sm font-bold shadow-md hover:shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 min-h-12"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span>{isRegister ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Toggle between Login and Register */}
        <div className="text-center pt-1">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className="text-xs text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium cursor-pointer p-1"
          >
            {isRegister ? (
              <span>มีบัญชีผู้ใช้อยู่แล้ว? <b className="text-blue-600 dark:text-blue-400 font-bold hover:underline">เข้าสู่ระบบที่นี่</b></span>
            ) : (
              <span>ยังไม่มีบัญชีผู้ใช้? <b className="text-blue-600 dark:text-blue-400 font-bold hover:underline">สมัครสมาชิกใหม่</b></span>
            )}
          </button>
        </div>

      </div>

      {/* ========================================================
          1. FORGOT PASSWORD MODAL
          ======================================================== */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-sm max-h-[90dvh] overflow-y-auto rounded-3xl bg-white dark:bg-[#181a20] p-6 shadow-2xl border border-slate-200/90 dark:border-[#262932] space-y-4 my-auto">
            <div className="flex items-center justify-between text-slate-900 dark:text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">ลืมรหัสผ่าน</h3>
                  <span className="text-[10px] text-slate-400 font-mono">Reset Password</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  setForgotMsg(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              กรอกอีเมลของคุณ เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปยังกล่องข้อความ
            </p>

            {forgotMsg && (
              <div className={`p-3 rounded-2xl text-xs font-semibold leading-relaxed flex items-start gap-2.5 ${
                forgotMsg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              }`}>
                {forgotMsg.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                )}
                <span>{forgotMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-3.5 pt-1">
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                  อีเมลของคุณ
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-[#262932] bg-slate-50 dark:bg-[#121316] text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white font-medium min-h-11"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setForgotMsg(null);
                  }}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-[#262932] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#121316] transition-all cursor-pointer min-h-11"
                >
                  ปิด
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 min-h-11"
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>กำลังส่ง...</span>
                    </>
                  ) : (
                    <span>ส่งลิงก์รีเซ็ต</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          2. RESET PASSWORD MODAL
          ======================================================== */}
      {showResetPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-sm max-h-[92dvh] overflow-y-auto rounded-3xl bg-white dark:bg-[#181a20] p-6 sm:p-7 shadow-2xl border border-slate-200/90 dark:border-[#262932] space-y-4 my-auto">
            <div className="text-center space-y-1">
              <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="font-black text-base text-slate-900 dark:text-white">
                ตั้งรหัสผ่านใหม่
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                กำหนดรหัสผ่านใหม่สำหรับเข้าใช้งาน Travel Tracker
              </p>
            </div>

            {resetPasswordMsg && (
              <div className={`p-3 rounded-2xl text-xs font-semibold leading-relaxed flex items-start gap-2.5 ${
                resetPasswordMsg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              }`}>
                {resetPasswordMsg.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                )}
                <span>{resetPasswordMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                  รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="รหัสผ่านใหม่..."
                    className="w-full pl-10 pr-10 py-3 rounded-2xl border border-slate-200 dark:border-[#262932] bg-slate-50 dark:bg-[#121316] text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white font-medium min-h-11"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 cursor-pointer"
                    aria-label="สลับแสดงรหัสผ่าน"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                  ยืนยันรหัสผ่านใหม่อีกครั้ง
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง..."
                    className="w-full pl-10 pr-10 py-3 rounded-2xl border border-slate-200 dark:border-[#262932] bg-slate-50 dark:bg-[#121316] text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white font-medium min-h-11"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 cursor-pointer"
                    aria-label="สลับแสดงรหัสผ่าน"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPasswordModal(false);
                    setResetPasswordMsg(null);
                  }}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-[#262932] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#121316] transition-all cursor-pointer min-h-11"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={resetPasswordLoading}
                  className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 min-h-11"
                >
                  {resetPasswordLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <span>บันทึกรหัสผ่านใหม่</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb] dark:bg-[#121316]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
