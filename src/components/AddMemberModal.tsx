// src/components/AddMemberModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { 
  Users, UserPlus, X, Search, Check, Loader2, 
  Shield, Sparkles, AlertCircle, Eye, Edit3, MapPin, Receipt 
} from 'lucide-react';
import { CatAvatarBadge } from '@/components/CatAvatarBadge';
import { TripRole, ROLE_INFO } from '@/lib/permissions';
import { toast } from 'sonner';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripName: string;
  existingMemberUserIds: string[];
  onMemberAdded: () => void;
}

export function AddMemberModal({
  isOpen,
  onClose,
  tripId,
  tripName,
  existingMemberUserIds,
  onMemberAdded,
}: AddMemberModalProps) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<TripRole>('contributor');

  useEffect(() => {
    if (isOpen) {
      loadSystemUsers();
      setSelectedUserId(null);
      setSelectedRole('contributor');
      setSearchQuery('');
    }
  }, [isOpen]);

  const loadSystemUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');

      if (!error && data) {
        setProfiles(data);
      }
    } catch (err: any) {
      console.error('Failed to load system profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Filter out users who are already members
  const availableUsers = profiles.filter((p) => {
    if (existingMemberUserIds.includes(p.id)) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const nameMatch = (p.display_name || '').toLowerCase().includes(q);
    const emailMatch = (p.email || '').toLowerCase().includes(q);
    return nameMatch || emailMatch;
  });

  const handleAddMember = async () => {
    if (!selectedUserId || !tripId) return;

    setSubmitting(true);
    try {
      const targetUser = profiles.find((p) => p.id === selectedUserId);
      const targetName = targetUser?.display_name || targetUser?.email?.split('@')[0] || 'สมาชิก';

      const { error } = await supabase
        .from('trip_members')
        .upsert(
          {
            trip_id: tripId,
            user_id: selectedUserId,
            role: selectedRole,
          },
          { onConflict: 'trip_id,user_id' }
        );

      if (error) {
        toast.error('ไม่สามารถเพิ่มสมาชิกได้: ' + error.message);
      } else {
        toast.success(`เพิ่มคุณ "${targetName}" เข้าทริปด้วยสิทธิ์ "${ROLE_INFO[selectedRole]?.label || selectedRole}" เรียบร้อยแล้ว`);
        onMemberAdded();
        onClose();
      }
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาด: ' + (err.message || ''));
    } finally {
      setSubmitting(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-start sm:items-center justify-center backdrop-blur-md bg-black/80 p-3 sm:p-4 overscroll-contain overflow-x-hidden animate-in fade-in duration-200 select-none modal-safe-overlay"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl sm:rounded-3xl bg-white dark:bg-[#181a20] p-5 sm:p-6 shadow-2xl border border-slate-200/90 dark:border-[#262932] glow-blue animate-in zoom-in-95 duration-200 space-y-4 max-h-[90dvh] flex flex-col modal-safe-card">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-200/90 dark:border-[#262932] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                เพิ่มสมาชิกจากผู้ใช้ในระบบ
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[240px]">
                ทริป: {tripName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1e2027] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อผู้ใช้ หรืออีเมลในระบบ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#262932] bg-slate-50 dark:bg-[#1e2027] text-xs font-medium outline-none focus:border-blue-500 text-slate-900 dark:text-white"
          />
        </div>

        {/* Role Selector before adding */}
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#121316] border border-slate-200/80 dark:border-[#262932] space-y-1.5 shrink-0">
          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-blue-500" />
            <span>กำหนดสิทธิ์เริ่มต้นให้กับสมาชิกที่เลือก:</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setSelectedRole('plan_only')}
              className={`p-2 rounded-xl text-xs font-bold transition-all border text-center flex flex-col items-center justify-center gap-1 ${
                selectedRole === 'plan_only'
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500 shadow-xs'
                  : 'bg-white dark:bg-[#1e2027] border-slate-200 dark:border-[#262932] text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <MapPin className="h-4 w-4 text-slate-400" />
              <span>Plan Only</span>
              <span className="text-[9px] text-slate-400 font-normal">ดูเฉพาะแผน</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('viewer')}
              className={`p-2 rounded-xl text-xs font-bold transition-all border text-center flex flex-col items-center justify-center gap-1 ${
                selectedRole === 'viewer'
                  ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500 shadow-xs'
                  : 'bg-white dark:bg-[#1e2027] border-slate-200 dark:border-[#262932] text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <Eye className="h-4 w-4 text-slate-400" />
              <span>Viewer</span>
              <span className="text-[9px] text-slate-400 font-normal">ดูอย่างเดียว</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('contributor')}
              className={`p-2 rounded-xl text-xs font-bold transition-all border text-center flex flex-col items-center justify-center gap-1 ${
                selectedRole === 'contributor'
                  ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500 shadow-xs'
                  : 'bg-white dark:bg-[#1e2027] border-slate-200 dark:border-[#262932] text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <Receipt className="h-4 w-4 text-blue-500" />
              <span>Contributor</span>
              <span className="text-[9px] text-slate-400 font-normal">ดูแผน+ลงเงิน</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('editor')}
              className={`p-2 rounded-xl text-xs font-bold transition-all border text-center flex flex-col items-center justify-center gap-1 ${
                selectedRole === 'editor'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500 shadow-xs'
                  : 'bg-white dark:bg-[#1e2027] border-slate-200 dark:border-[#262932] text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <Edit3 className="h-4 w-4 text-emerald-500" />
              <span>Editor</span>
              <span className="text-[9px] text-slate-400 font-normal">แก้แผน+ลงเงิน</span>
            </button>
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[160px]">
          {loading ? (
            <div className="py-8 text-center space-y-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto" />
              <p className="text-xs text-slate-400 font-medium">กำลังโหลดรายชื่อผู้ใช้ในระบบ...</p>
            </div>
          ) : availableUsers.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 space-y-1">
              <Users className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p>ไม่พบผู้ใช้ที่ยังไม่ได้เข้าร่วมทริปนี้</p>
            </div>
          ) : (
            availableUsers.map((u) => {
              const isSelected = selectedUserId === u.id;
              const uName = u.display_name || u.email?.split('@')[0] || 'ผู้ใช้';

              return (
                <div
                  key={u.id}
                  onClick={() => setSelectedUserId(u.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 shadow-xs'
                      : 'bg-slate-50/60 dark:bg-[#1e2027] border-slate-200/80 dark:border-[#262932] hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CatAvatarBadge avatarId={u.avatar_id} size="md" />
                    <div className="min-w-0">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate block">
                        {uName}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate block">
                        {u.email}
                      </span>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex gap-2.5 border-t border-slate-200/90 dark:border-[#262932] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-[#262932] text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-[#1e2027] transition-all cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleAddMember}
            disabled={!selectedUserId || submitting}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>กำลังเพิ่ม...</span>
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                <span>เพิ่มสมาชิกเข้าทริป</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}

export default AddMemberModal;
