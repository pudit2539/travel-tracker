'use client';

import React from 'react';
import { Users, Share2, Trash2 } from 'lucide-react';
import { getCatAvatar } from '@/lib/avatars';

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
      <div className="p-4 sm:p-6 rounded-3xl border border-rose-100/80 dark:border-[#323850]/80 bg-white/95 dark:bg-[#222638]/95 card-elevation space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-rose-400" />
              <span>สมาชิกในทริปนี้ ({members.length})</span>
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {isOwner ? '👑 คุณเป็นเจ้าของทริป สามารถกำหนดสิทธิ์ให้เพื่อนแก้ไขหรือดูได้อย่างเดียว' : 'รายชื่อเพื่อนร่วมทริป'}
            </p>
          </div>

          <button
            onClick={() => setShowShareModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-[#e06b88] hover:bg-[#d25875] text-white text-xs font-bold shadow-md shadow-[#e06b88]/20 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Share2 className="h-3.5 w-3.5" /> ชวนเพื่อนเข้าทริป
          </button>
        </div>

        <div className="divide-y divide-rose-50 dark:divide-[#323850]/80">
          {members.map((m) => {
            const mName = m.profiles?.display_name || m.profiles?.email?.split('@')[0] || 'สมาชิก';
            const mCat = getCatAvatar(m.profiles?.avatar_id);
            const isCurrent = m.user_id === currentUser?.id;
            const isTripOwner = m.role === 'owner' || m.user_id === trip?.created_by;

            return (
              <div key={m.id} className="py-3 flex justify-between items-center gap-2">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${mCat.bgGradient} flex items-center justify-center text-base shadow-2xs`}>
                    {mCat.emoji}
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{mName}</span>
                      {isCurrent && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-50 text-[#e06b88] dark:bg-[#e06b88]/20 dark:text-[#f7a1b5] border border-rose-200/80 dark:border-[#e06b88]/35">
                          ฉัน
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {isTripOwner ? '👑 เจ้าของทริป' : m.role === 'editor' ? '✏️ สิทธิ์แก้ไขแผนและรายจ่าย' : '👁️ สิทธิ์เปิดดูอย่างเดียว'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isOwner && !isTripOwner ? (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={m.role}
                        onChange={(e) => handleUpdateMemberRole(m.id, e.target.value as any)}
                        className="px-2.5 py-1 rounded-xl text-xs font-bold border border-slate-300 dark:border-[#323850] bg-slate-50 dark:bg-[#2a2f45] text-slate-900 dark:text-white outline-none cursor-pointer"
                      >
                        <option value="editor">✏️ ผู้แก้ไข (Editor)</option>
                        <option value="viewer">👁️ ผู้เข้าชม (Viewer)</option>
                      </select>
                      <button
                        onClick={() => handleRemoveMember(m.id, mName)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title="ลบสมาชิก"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-300">
                      {isTripOwner ? 'Owner' : m.role === 'editor' ? 'Editor' : 'Viewer'}
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

