// src/components/TransferOwnershipModal.tsx
'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Crown, X, Lock, AlertTriangle, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { CatAvatarBadge } from '@/components/CatAvatarBadge';

interface TransferOwnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetMember: any | null;
  tripName: string;
  currentUserEmail: string;
  onConfirmTransfer: (password: string) => Promise<boolean>;
}

export function TransferOwnershipModal({
  isOpen,
  onClose,
  targetMember,
  tripName,
  currentUserEmail,
  onConfirmTransfer,
}: TransferOwnershipModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !targetMember) return null;

  const targetName =
    targetMember.profiles?.display_name ||
    targetMember.profiles?.email?.split('@')[0] ||
    'สมาชิก';
  const targetAvatar = targetMember.profiles?.avatar_id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMsg('กรุณากรอกรหัสผ่านเพื่อยืนยัน');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const ok = await onConfirmTransfer(password);
      if (ok) {
        setPassword('');
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'รหัสผ่านไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    if (loading) return;
    setPassword('');
    setErrorMsg(null);
    onClose();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center backdrop-blur-md bg-black/80 p-3 sm:p-4 overscroll-contain overflow-x-hidden animate-in fade-in duration-200 select-none"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl sm:rounded-3xl bg-white dark:bg-[#151b2b] p-5 sm:p-6 shadow-2xl border border-slate-200/90 dark:border-[#222c42] glow-amber animate-in zoom-in-95 duration-200 space-y-4 max-h-[90dvh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-200/90 dark:border-[#222c42]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-md">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                โอนสิทธิ์ความเป็นเจ้าของทริป
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[220px]">
                {tripName || 'ทริปนี้'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleModalClose}
            disabled={loading}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1c2438] transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Target Member Card */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1c2438] border border-slate-200/90 dark:border-[#222c42] flex items-center gap-3">
          <div className="ring-2 ring-amber-400 dark:ring-amber-500 rounded-full shrink-0">
            <CatAvatarBadge avatarId={targetAvatar} size="md" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block">
              โอนสิทธิ์เจ้าของให้:
            </span>
            <span className="text-sm font-black text-slate-900 dark:text-white truncate block">
              {targetName}
            </span>
            <span className="text-[10px] text-slate-400 font-mono truncate block">
              {targetMember.profiles?.email || 'สมาชิกในทริป'}
            </span>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30 shrink-0">
            Owner 👑
          </span>
        </div>

        {/* Warning Alert */}
        <div className="p-3 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-1 text-xs text-rose-800 dark:text-rose-200">
          <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>คำเตือนความปลอดภัย</span>
          </div>
          <ul className="list-disc list-inside text-[11px] space-y-0.5 text-rose-700/90 dark:text-rose-300/90 leading-relaxed pl-1">
            <li>คุณจะถูกปรับสถานะเป็น <b>ผู้แก้ไข (Editor)</b> ทันที</li>
            <li>เฉพาะเจ้าของทริปคนใหม่เท่านั้นที่จะมีสิทธิ์เชิญหรือเพิ่มสมาชิกอื่นได้</li>
            <li>การกระทำนี้จะมีผลทันทีและไม่สามารถยกเลิกได้เอง</li>
          </ul>
        </div>

        {/* Form with Password Confirmation */}
        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Lock className="h-3.5 w-3.5 text-amber-500" />
                <span>ยืนยันด้วยรหัสผ่านบัญชีของคุณ:</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                ({currentUserEmail})
              </span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg(null);
                }}
                disabled={loading}
                placeholder="กรอกรหัสผ่านเพื่อยืนยัน..."
                autoFocus
                className="w-full p-2.5 pr-10 rounded-xl border border-slate-200 dark:border-[#222c42] bg-white dark:bg-[#121316] text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errorMsg && (
              <p className="text-[11px] text-rose-500 font-bold mt-1.5 flex items-center gap-1">
                <span>⚠️</span> {errorMsg}
              </p>
            )}
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleModalClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-[#1c2438] transition-all cursor-pointer disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black shadow-md shadow-amber-500/25 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>กำลังตรวจสอบ...</span>
                </>
              ) : (
                <>
                  <Crown className="h-4 w-4" />
                  <span>ยืนยันโอนสิทธิ์</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>,
    document.body
  );
}

export default TransferOwnershipModal;
