'use client';

import React from 'react';
import { Users, Share2, Trash2, Shield, Crown, Sparkles } from 'lucide-react';
import { CatAvatarBadge } from '@/components/CatAvatarBadge';

interface TripMembersTabProps {
  members: any[];
  isOwner: boolean;
  currentUser: any;
  trip: any;
  setShowShareModal: (show: boolean) => void;
  handleUpdateMemberRole: (memberId: string, role: 'editor' | 'viewer') => void;
  handleRemoveMember: (memberId: string, memberName: string) => void;
}

export function TripMembersTab({
  members,
  isOwner,
  currentUser,
  trip,
  setShowShareModal,
  handleUpdateMemberRole,
  handleRemoveMember,
}: TripMembersTabProps) {
  return (
    <div className="space-y-4">
      <div className="p-4 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-[#222c42] bg-white/95 dark:bg-[#151b2b]/95 card-elevation space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>สมาชิกในทริปนี้ ({members.length})</span>
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {isOwner ? '👑 คุณเป็นเจ้าของทริป สามารถกำหนดสิทธิ์ให้เพื่อนแก้ไขหรือดูได้อย่างเดียว' : 'รายชื่อเพื่อนร่วมทริปทุกคน'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowShareModal(true)}
            className="btn-luxury-primary px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md shadow-blue-500/25 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Share2 className="h-3.5 w-3.5" /> ชวนเพื่อนเข้าทริป
          </button>
        </div>

        <div className="space-y-2.5 pt-1">
          {members.map((m) => {
            const isCurrent = m.user_id === currentUser?.id;
            const mName = isCurrent
              ? (currentUser?.user_metadata?.display_name || m.profiles?.display_name || m.profiles?.email?.split('@')[0] || 'สมาชิก')
              : (m.profiles?.display_name || m.profiles?.email?.split('@')[0] || 'สมาชิก');
            const avatarId = isCurrent
              ? (currentUser?.user_metadata?.avatar_id || m.profiles?.avatar_id)
              : m.profiles?.avatar_id;
            const isTripOwner = m.role === 'owner' || m.user_id === trip?.created_by;

            return (
              <div 
                key={m.id} 
                className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 dark:bg-[#1c2438] border border-slate-200/80 dark:border-[#222c42] hover:border-blue-400 dark:hover:border-blue-600/70 transition-all duration-200 shadow-xs hover:shadow-md flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`relative shrink-0 ${isTripOwner ? 'ring-2 ring-amber-400 dark:ring-amber-500 rounded-full' : ''}`}>
                    <CatAvatarBadge avatarId={avatarId} size="lg" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                      <span className="truncate">{mName}</span>
                      {isCurrent && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60">
                          ฉัน
                        </span>
                      )}
                      {isTripOwner && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 flex items-center gap-0.5">
                          <Crown className="h-2.5 w-2.5 text-amber-500" /> เจ้าของทริป
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                      {isTripOwner ? 'สิทธิ์เต็ม (ผู้สร้างทริป)' : m.role === 'editor' ? '✏️ สิทธิ์แก้ไขแผนและรายจ่าย' : '👁️ สิทธิ์เปิดดูอย่างเดียว'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isOwner && !isTripOwner ? (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={m.role}
                        onChange={(e) => handleUpdateMemberRole(m.id, e.target.value as any)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-[#222c42] bg-white dark:bg-[#151b2b] text-slate-900 dark:text-white outline-none cursor-pointer focus:border-blue-600 shadow-2xs transition-colors"
                      >
                        <option value="editor">✏️ ผู้แก้ไข (Editor)</option>
                        <option value="viewer">👁️ ผู้เข้าชม (Viewer)</option>
                      </select>
                      <button
                        onClick={() => handleRemoveMember(m.id, mName)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50"
                        title="ลบสมาชิก"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="px-3 py-1 rounded-xl bg-white dark:bg-[#151b2b] border border-slate-200/90 dark:border-[#222c42] text-xs font-extrabold text-blue-600 dark:text-blue-400 font-mono shadow-2xs">
                      {isTripOwner ? 'Owner 👑' : m.role === 'editor' ? 'Editor ✏️' : 'Viewer 👁️'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default TripMembersTab;
