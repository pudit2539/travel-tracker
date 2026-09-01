// src/app/login/page.tsx
'use client';

import { useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Eye, EyeOff, Lock, Mail, User, Compass, KeyRound, 
  ArrowRight, Loader2, Sparkles, Sun, Moon, AlertCircle, 
  CheckCircle2, Users, ArrowLeft 
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

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
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // State สำหรับ Forgot Password Modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');

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
          { trip_id: tripId, user_id: userId, role: 'editor' }
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
              avatar_id: 'cat_pink',
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
          await autoJoinTripIfInvited(session.user.id);
          router.push(returnUrl);
          router.refresh();
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
          await autoJoinTripIfInvited(data.session.user.id);
        }

        router.push(returnUrl);
        router.refresh();
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

  // จัดการ Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;

    setForgotLoading(true);
    setForgotMsg('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      setForgotMsg('ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณเรียบร้อยแล้ว');
    } catch (err: any) {
      setForgotMsg('เกิดข้อผิดพลาด: ' + (err.message || ''));
    } finally {
      setForgotLoading(false);
    }
  };

  const isInviteFlow = returnUrl.startsWith('/trips/');

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden bg-[#f8f7fc] dark:bg-[#08050e] text-[#0f172a] dark:text-[#f8fafc] transition-colors duration-300">
      {/* Background Neon Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-pink-500/15 dark:bg-pink-500/20 blur-3xl pointer-events-none animate-float-slow" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-purple-600/15 dark:bg-purple-600/20 blur-3xl pointer-events-none animate-float-reverse" />

      {/* Dark/Light mode toggle */}
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="absolute top-5 right-5 p-3 rounded-2xl border border-slate-200 dark:border-purple-800/80 bg-white/80 dark:bg-[#130d22]/80 shadow-md hover:scale-105 transition-all duration-300 cursor-pointer"
        title="สลับธีม"
      >
        {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-purple-600" />}
      </button>

      <div className="w-full max-w-md rounded-3xl border border-slate-200/80 dark:border-purple-800/50 bg-white/95 dark:bg-[#130d22]/95 backdrop-blur-2xl p-7 sm:p-9 shadow-2xl card-elevation z-10 space-y-6">
        
        {/* Logo and App Title */}
        <div className="text-center space-y-2">
          <div className="inline-block p-1 rounded-3xl bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 shadow-xl shadow-pink-500/25 animate-float-slow">
            <img
              src="/app-logo.png"
              alt="Travel Tracker Logo"
              className="w-20 h-20 rounded-2xl object-cover"
            />
          </div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 dark:from-pink-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
            {isRegister ? 'สร้างบัญชีผู้ใช้ใหม่' : 'ยินดีต้อนรับสู่ Travel Tracker'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-purple-300/70 font-medium">
            {isRegister ? 'เริ่มต้นวางแผนทริป จัดการงบ และสแกนใบเสร็จด้วย AI' : 'เข้าสู่ระบบเพื่อจัดการแผนเที่ยวและเคลียร์บิลกับเพื่อน'}
          </p>
        </div>

        {/* Invite Flow Banner */}
        {isInviteFlow && (
          <div className="p-3.5 rounded-2xl bg-pink-50/80 dark:bg-purple-950/40 border border-pink-200 dark:border-pink-900/60 text-center space-y-1 animate-in fade-in">
            <span className="text-xs font-black text-pink-600 dark:text-pink-400 flex items-center justify-center gap-1.5">
              <Users className="h-4 w-4" /> คุณได้รับคำเชิญเข้าร่วมทริป! ✈️
            </span>
            <p className="text-[11px] text-slate-600 dark:text-purple-300 font-medium">
              {isRegister ? 'สมัครสมาชิกเสร็จแล้ว ระบบจะพาคุณเข้าสู่ทริปทันที' : 'เข้าสู่ระบบเพื่อเริ่มวางแผนและบันทึกค่าใช้จ่ายร่วมกัน'}
            </p>
          </div>
        )}

        {/* Alerts */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/80 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in">
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
                className="px-2.5 py-1 rounded-lg bg-pink-600 text-white text-[10px] font-black shrink-0 hover:bg-pink-700 cursor-pointer"
              >
                เข้าสู่ระบบเลย
              </button>
            )}
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/80 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          {isRegister && (
            <div className="space-y-1.5 animate-in fade-in duration-200">
              <label className="block text-xs font-bold text-slate-700 dark:text-purple-200">
                ชื่อที่ใช้แสดง (Display Name)
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-purple-400" />
                <input
                  type="text"
                  placeholder="เช่น Popcornz, Alex"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-purple-800/70 bg-slate-50/70 dark:bg-[#1a1228]/70 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 dark:focus:border-pink-500 transition-all font-medium"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-purple-200">
              อีเมล
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-purple-400" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-purple-800/70 bg-slate-50/70 dark:bg-[#1a1228]/70 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 dark:focus:border-pink-500 transition-all font-medium"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-slate-700 dark:text-purple-200">
                รหัสผ่าน
              </label>
              {!isRegister && (
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[11px] font-bold text-pink-600 dark:text-pink-400 hover:underline cursor-pointer"
                >
                  ลืมรหัสผ่าน?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-purple-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-3 rounded-2xl border border-slate-200 dark:border-purple-800/70 bg-slate-50/70 dark:bg-[#1a1228]/70 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 dark:focus:border-pink-500 transition-all font-medium"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-purple-300 cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white text-xs font-black shadow-lg shadow-pink-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
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
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className="text-xs text-slate-600 dark:text-purple-300 hover:text-pink-600 dark:hover:text-pink-400 transition-colors font-medium cursor-pointer"
          >
            {isRegister ? (
              <span>มีบัญชีผู้ใช้อยู่แล้ว? <b className="text-pink-600 dark:text-pink-400 underline">เข้าสู่ระบบที่นี่</b></span>
            ) : (
              <span>ยังไม่มีบัญชีผู้ใช้? <b className="text-pink-600 dark:text-pink-400 underline">สมัครสมาชิกใหม่</b></span>
            )}
          </button>
        </div>

      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#130d22] p-6 shadow-2xl border border-slate-200 dark:border-purple-800/70 space-y-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <KeyRound className="h-5 w-5 text-pink-500" />
              <h3 className="font-black text-sm">รีเซ็ตรหัสผ่าน</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-purple-300/70 font-medium">
              กรอกอีเมลของคุณเพื่อรับลิงก์สำหรับตั้งรหัสผ่านใหม่
            </p>

            {forgotMsg && (
              <div className="p-3 rounded-xl bg-pink-50 dark:bg-purple-950/60 border border-pink-200 dark:border-purple-900 text-xs font-bold text-pink-700 dark:text-pink-300">
                {forgotMsg}
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-3">
              <input
                type="email"
                required
                placeholder="name@example.com"
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-purple-800 bg-slate-50 dark:bg-[#1c1328] text-xs outline-none focus:border-pink-500 text-slate-900 dark:text-white font-medium"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setForgotMsg('');
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-purple-800 text-xs font-bold text-slate-700 dark:text-purple-200 cursor-pointer"
                >
                  ปิด
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="flex-1 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {forgotLoading ? 'กำลังส่ง...' : 'ส่งอีเมลรีเซ็ต'}
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
      <div className="min-h-screen flex items-center justify-center bg-[#f8f7fc] dark:bg-[#08050e]">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
