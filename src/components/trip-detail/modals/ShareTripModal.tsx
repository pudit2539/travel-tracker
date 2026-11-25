// src/components/trip-detail/modals/ShareTripModal.tsx
'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, Eye, Share2, X } from 'lucide-react';
import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/clipboard';
import { syncTripMetadataToSupabase } from '@/lib/tripMetadata';

interface SharePrivacyState {
  hideDates?: boolean;
  hideHotels?: boolean;
  allowPublicReadOnly?: boolean;
}

interface ShareTripModalProps {
  isOpen: boolean;
  isOwner: boolean;
  mounted: boolean;
  tripId: string;
  copiedLink: boolean;
  copiedAuthLink: boolean;
  copiedCode: boolean;
  sharePrivacy: SharePrivacyState;
  setSharePrivacy: React.Dispatch<React.SetStateAction<SharePrivacyState>>;
  onClose: () => void;
  onNativeShare: () => void;
  onCopyInviteLink: () => void;
  onCopyAuthInviteLink: () => void;
  onCopyTripCode: () => void;
}

export const ShareTripModal = React.memo(function ShareTripModal({
  isOpen,
  isOwner,
  mounted,
  tripId,
  copiedLink,
  copiedAuthLink,
  copiedCode,
  sharePrivacy,
  setSharePrivacy,
  onClose,
  onNativeShare,
  onCopyInviteLink,
  onCopyAuthInviteLink,
  onCopyTripCode,
}: ShareTripModalProps) {
  const [copiedReadOnly, setCopiedReadOnly] = useState(false);

  if (!isOpen || !isOwner || !mounted) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const readOnlyUrl = `${origin}/trips/${tripId}?view=readonly`;

  const updatePrivacy = (patch: Partial<SharePrivacyState>) => {
    const next = { ...sharePrivacy, ...patch };
    setSharePrivacy(next);
    try {
      localStorage.setItem(`travel_share_privacy_${tripId}`, JSON.stringify(next));
    } catch {}
    syncTripMetadataToSupabase(tripId, { sharePrivacy: next }).catch(() => {});
  };

  const handleCopyReadOnlyLink = async () => {
    if (!origin || !tripId) return;
    if (!sharePrivacy.allowPublicReadOnly) {
      updatePrivacy({ allowPublicReadOnly: true });
    }
    const ok = await copyToClipboard(readOnlyUrl);
    if (ok) {
      setCopiedReadOnly(true);
      toast.success('คัดลอกลิงก์ดูแพลนแบบ Read-Only (ไม่ต้องล็อกอิน) แล้ว 👀');
      setTimeout(() => setCopiedReadOnly(false), 2200);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-md bg-black/80 p-3 sm:p-4 overscroll-contain overflow-x-hidden animate-in fade-in duration-200 select-none"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl sm:rounded-3xl bg-white dark:bg-[#161c27] p-5 sm:p-6 shadow-2xl border border-slate-200/90 dark:border-[#24324a] glow-blue animate-in zoom-in-95 duration-200 space-y-4 max-h-[90dvh] overflow-y-auto overflow-x-hidden touch-pan-y overscroll-contain">
        <div className="flex justify-between items-center pb-3 border-b border-slate-200/90 dark:border-[#24324a]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                แชร์ทริปนี้ให้เพื่อน & ครอบครัว ✈️
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                ส่งชวนเข้ากลุ่มแก้ไขร่วมกัน หรือส่งลิงก์ดูแพลนอย่างเดียวไม่ต้องล็อกอิน
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1a202c] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3.5">
          {/* 1-Tap LINE / AirDrop / Native Share Sheet */}
          <button
            type="button"
            onClick={onNativeShare}
            className="w-full py-3 min-h-[44px] rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 touch-manipulation"
          >
            <Share2 className="h-4 w-4" />
            <span>แชร์ส่งเข้า LINE / AirDrop ทันที 📲</span>
          </button>

          {/* Public Read-Only Link (No Login Required) */}
          <div className="p-3.5 rounded-2xl border border-[#bfdbfe] dark:border-[#4cd7f6]/30 bg-[#eff6ff]/70 dark:bg-[#080e19]/85 space-y-2">
            <div className="flex justify-between items-center gap-2">
              <label className="text-xs font-bold text-[#0f172a] dark:text-[#dde2f3] flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-[#0284c7] dark:text-[#4cd7f6]" />
                <span>ลิงก์ดูแพลนอย่างเดียว (Read-Only ไม่ต้องล็อกอิน)</span>
              </label>
              <label className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#1d4ed8] dark:text-[#4cd7f6] cursor-pointer">
                <span>{sharePrivacy.allowPublicReadOnly !== false ? 'เปิดใช้งาน' : 'ปิดอยู่'}</span>
                <input
                  type="checkbox"
                  checked={sharePrivacy.allowPublicReadOnly !== false}
                  onChange={(e) => updatePrivacy({ allowPublicReadOnly: e.target.checked })}
                  className="w-3.5 h-3.5 accent-blue-600 rounded cursor-pointer"
                />
              </label>
            </div>
            <p className="text-[11px] text-[#475569] dark:text-[#94a3b8]">
              ส่งให้ที่บ้านหรือเพื่อนเปิดดูตารางเที่ยวได้ทันทีโดยไม่ต้องสมัครบัญชี (ซ่อนหน้าค่าใช้จ่ายอัตโนมัติ)
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                className="w-full p-2.5 rounded-xl border border-[#bfdbfe] dark:border-[#24324a] bg-white dark:bg-[#161c27] text-xs font-mono text-slate-900 dark:text-white select-all"
                value={readOnlyUrl}
              />
              <button
                type="button"
                onClick={handleCopyReadOnlyLink}
                className="px-4 py-2.5 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer active:scale-95 flex items-center gap-1.5"
              >
                {copiedReadOnly ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copiedReadOnly ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl border border-blue-100 dark:border-[#24324a] bg-blue-50/20 dark:bg-[#1a202c] space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                🔗 ลิงก์ตรงเข้าหน้าทริป (สำหรับผู้ร่วมทริป)
              </label>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                ร่วมแก้ไข/หารบิล
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#24324a] bg-white dark:bg-[#161c27] text-xs font-mono text-slate-900 dark:text-white select-all"
                value={origin ? `${origin}/trips/${tripId}?invite=${tripId}` : ''}
              />
              <button
                type="button"
                onClick={onCopyInviteLink}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer active:scale-95 flex items-center gap-1.5"
              >
                {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copiedLink ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-[#24324a] bg-slate-50/50 dark:bg-[#1a202c] space-y-2">
            <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              👥 ลิงก์เชิญเพื่อนใหม่ (สมัครเสร็จแล้วเข้าทริปทันที)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#24324a] bg-white dark:bg-[#161c27] text-xs font-mono text-slate-900 dark:text-white select-all"
                value={origin ? `${origin}/login?invite=${tripId}` : ''}
              />
              <button
                type="button"
                onClick={onCopyAuthInviteLink}
                className="px-4 py-2.5 bg-white dark:bg-[#161c27] border border-slate-200 dark:border-[#24324a] hover:border-blue-400 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer active:scale-95 flex items-center gap-1.5"
              >
                {copiedAuthLink ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4 text-blue-500" />
                )}
                <span>{copiedAuthLink ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">
              รหัสเชิญประจำทริป (Trip ID)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#24324a] bg-slate-50 dark:bg-[#1a202c] text-xs font-mono text-slate-900 dark:text-white select-all font-bold"
                value={tripId}
              />
              <button
                type="button"
                onClick={onCopyTripCode}
                className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-[#1a202c] dark:hover:bg-[#24324a] text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer active:scale-95 min-h-[42px] touch-manipulation"
              >
                {copiedCode ? 'คัดลอกแล้ว' : 'คัดลอก'}
              </button>
            </div>
          </div>

          {/* Privacy Share Toggles */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-[#24324a] bg-slate-50/70 dark:bg-[#0d131f] space-y-2.5">
            <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>🛡️ ตั้งค่าความเป็นส่วนตัวเมื่อแชร์ทริป (Share Privacy)</span>
            </div>
            <label className="flex items-center justify-between gap-2 text-xs text-slate-700 dark:text-slate-300 font-bold cursor-pointer">
              <span>ซ่อนวันที่เดินทางจริงในลิงก์ Read-Only (แสดงเฉพาะ Day 1, Day 2...)</span>
              <input
                type="checkbox"
                checked={Boolean(sharePrivacy.hideDates)}
                onChange={(e) => updatePrivacy({ hideDates: e.target.checked })}
                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between gap-2 text-xs text-slate-700 dark:text-slate-300 font-bold cursor-pointer">
              <span>ซ่อนข้อมูลที่พักและรหัสการจองจากผู้ชม Read-Only</span>
              <input
                type="checkbox"
                checked={Boolean(sharePrivacy.hideHotels)}
                onChange={(e) => updatePrivacy({ hideHotels: e.target.checked })}
                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
              />
            </label>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
});

export default ShareTripModal;
