// src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, User, Compass, KeyRound, ArrowRight, Loader2, Sparkles, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

export default function LoginPage() {
  const router = useRouter();
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
            },
          },
        });

        if (error) throw error;

        // ถ้ามี Session เข้าใช้งานได้ทันที
        if (data.session) {
          router.push('/');
          router.refresh();
          return;
        }

        // กรณี Supabase ยังไม่ให้ session ให้ลองสั่ง sign-in ให้อัตโนมัติ
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (signInErr) {
          setSuccessMsg('สมัครสมาชิกสำเร็จ! แต่ต้องไปปิด "Confirm email" ใน Supabase จึงจะล็อกอินได้ทันที');
        } else {
          router.push('/');
          router.refresh();
        }
      } else {
        // เข้าสู่ระบบ
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
          } else if (error.message.includes('Email not confirmed')) {
            throw new Error('กรุณาไปปิด "Confirm email" ใน Supabase Dashboard > Authentication > Providers > Email');
          }
          throw error;
        }

        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการดำเนินการ');
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

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden bg-[#f8f7fc] dark:bg-[#08050e] text-[#0f172a] dark:text-[#f8fafc] transition-colors duration-300">
      {/* Background Neon Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-600/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-gradient-to-tr from-purple-600/20 to-pink-500/20 blur-3xl pointer-events-none" />

      {/* Quick Theme Toggle Button */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-3 rounded-2xl bg-white dark:bg-[#120c1e] border border-slate-200 dark:border-purple-800 text-slate-700 dark:text-purple-200 hover:border-pink-500 transition-all cursor-pointer shadow-sm hover:scale-105"
          title="สลับโหมด มืด / สว่าง"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-purple-600" />}
        </button>
      </div>

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200 dark:border-purple-800/50 bg-white dark:bg-[#120c1e] p-8 shadow-2xl backdrop-blur-xl transition-all glow-pink-purple">
        
        {/* Logo & Header */}
        <div className="flex flex-col items-center mb-7 text-center">
          <div className="relative p-3.5 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 text-white shadow-lg shadow-pink-500/30 mb-3.5 group">
            <Compass className="h-8 w-8 transition-transform duration-300 group-hover:rotate-45" />
            <Sparkles className="h-4 w-4 absolute -top-1 -right-1 text-pink-300 animate-pulse" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 dark:from-pink-400 dark:via-purple-400 dark:to-indigo-300 bg-clip-text text-transparent">
            {isRegister ? 'สร้างบัญชีผู้ใช้ใหม่' : 'เข้าสู่ระบบ Travel Tracker'}
          </h1>
          <p className="text-xs text-slate-600 dark:text-purple-300/70 mt-1 font-medium">
            {isRegister ? 'เริ่มต้นวางแผนทริป จัดการงบ และสแกนใบเสร็จด้วย AI' : 'ยินดีต้อนรับกลับสู่ระบบจัดการทริปและรายจ่ายของคุณ'}
          </p>
        </div>

        {/* แจ้งเตือนข้อผิดพลาด / ความสำเร็จ */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-semibold border border-rose-200 dark:border-rose-900/60 flex items-center gap-2">
            <span>⚠️</span> <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-2">
            <span>✅</span> <span>{successMsg}</span>
          </div>
        )}

        {/* ฟอร์มเข้าสู่ระบบ / สมัครสมาชิก */}
        <form onSubmit={handleAuth} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-800 dark:text-purple-200">
                ชื่อที่ใช้แสดง (Display Name)
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-3.5 h-4 w-4 text-slate-400 dark:text-purple-400 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="เช่น Somchai Travel"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-sm outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all placeholder:text-slate-400 dark:placeholder:text-purple-600"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold mb-1.5 text-slate-800 dark:text-purple-200">อีเมล</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 h-4 w-4 text-slate-400 dark:text-purple-400 pointer-events-none" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-sm outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all placeholder:text-slate-400 dark:placeholder:text-purple-600"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-slate-800 dark:text-purple-200">รหัสผ่าน</label>
              {!isRegister && (
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[11px] font-bold text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 hover:underline cursor-pointer"
                >
                  ลืมรหัสผ่าน?
                </button>
              )}
            </div>

            {/* ช่องกรอก Password พร้อมปุ่ม Show/Hide */}
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 h-4 w-4 text-slate-400 dark:text-purple-400 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="อย่างน้อย 6 ตัวอักษร"
                className="w-full pl-10 pr-12 py-3 rounded-2xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-sm outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all placeholder:text-slate-400 dark:placeholder:text-purple-600"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 p-2 text-slate-400 hover:text-pink-600 dark:hover:text-pink-400 cursor-pointer z-20 rounded-xl hover:bg-slate-100 dark:hover:bg-purple-900/40 transition-colors flex items-center justify-center"
                title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-3 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:via-purple-700 hover:to-indigo-700 font-bold text-sm text-white shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> กำลังดำเนินการ...
              </>
            ) : isRegister ? (
              <>
                สมัครสมาชิก <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              <>
                เข้าสู่ระบบ <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Toggle เข้าสู่ระบบ / สมัครสมาชิก */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-600 dark:text-purple-300/70 font-medium">
            {isRegister ? 'มีบัญชีผู้ใช้อยู่แล้ว?' : 'ยังไม่มีบัญชีผู้ใช้?'}{' '}
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className="font-bold text-pink-600 dark:text-pink-400 hover:underline cursor-pointer ml-1"
            >
              {isRegister ? 'เข้าสู่ระบบที่นี่' : 'สมัครสมาชิกฟรี'}
            </button>
          </p>
        </div>

      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#120c1e] p-6 shadow-2xl border border-slate-200 dark:border-purple-800/60 glow-purple">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-xl bg-pink-100 dark:bg-pink-950 text-pink-500">
                <KeyRound className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">รีเซ็ตรหัสผ่าน</h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-purple-300/70 mb-4 font-medium">
              กรอกอีเมลของคุณเพื่อรับลิงก์สำหรับตั้งรหัสผ่านใหม่
            </p>

            {forgotMsg && (
              <div className="mb-4 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 text-xs font-semibold border border-purple-200 dark:border-purple-900/60">
                {forgotMsg}
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-purple-200">อีเมลที่ลงทะเบียน</label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#1c1328]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setForgotMsg('');
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-purple-800 text-xs font-bold text-slate-700 dark:text-purple-200 hover:bg-slate-100 dark:hover:bg-purple-950/40 cursor-pointer"
                >
                  ปิด
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-md shadow-pink-500/25 hover:opacity-95 disabled:opacity-50 cursor-pointer"
                >
                  {forgotLoading ? 'กำลังส่ง...' : 'ส่งลิงก์'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
