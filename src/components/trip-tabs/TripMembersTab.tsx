'use client';

import React from 'react';
import { Users, Share2, Trash2, Crown, Shield, Eye, Edit3, MapPin, UserPlus, ArrowRightLeft, Receipt } from 'lucide-react';
import { CatAvatarBadge } from '@/components/CatAvatarBadge';
import { TripRole } from '@/lib/permissions';

interface TripMembersTabProps {
  members: any[];
  isOwner: boolean;
  currentUser: any;
  trip: any;
  setShowShareModal: (show: boolean) => void;
  handleUpdateMemberRole: (memberId: string, role: TripRole) => void;
  handleRemoveMember: (memberId: string, memberName: string) => void;
  onInitiateTransferOwnership?: (member: any) => void;
  onOpenAddMemberModal?: () => void;
}

export function TripMembersTab({
  members,
  isOwner,
  currentUser,
  trip,
  setShowShareModal,
  handleUpdateMemberRole,
  handleRemoveMember,
  onInitiateTransferOwnership,
  onOpenAddMemberModal,
}: TripMembersTabProps) {
  return (
    <div className="space-y-4">
      <div className="p-4 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-[#222c42] bg-white/95 dark:bg-[#151b2b]/95 card-elevation space-y-4 text-left">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                สมาชิกในทริป ({members.length} คน)
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {isOwner
                  ? 'คุณเป็นเจ้าของทริป สามารถเชิญสมาชิก กำหนดระดับสิทธิ์การเข้าถึง หรือโอนสิทธิ์ได้'
                  : 'รายชื่อเพื่อนร่วมทริปและระดับสิทธิ์การเข้าถึงข้อมูล'}
              </p>
            </div>
          </div>

          {isOwner && (
            <div className="flex items-center gap-2">
              {onOpenAddMemberModal && (
                <button
                  type="button"
                  onClick={onOpenAddMemberModal}
                  className="px-3.5 py-2 rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 active:scale-95 shadow-xs"
                >
                  <UserPlus className="h-3.5 w-3.5 text-blue-500" /> 
                  <span>เพิ่มสมาชิก</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="btn-luxury-primary px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md shadow-blue-500/25 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Share2 className="h-3.5 w-3.5" /> 
                <span>ชวนเพื่อนเข้าทริป</span>
              </button>
            </div>
          )}
        </div>

        {/* Roles explainer banner (Clean Corporate Style) */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#121622] border border-slate-200/70 dark:border-[#222c42] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-[11px]">
          <div className="flex items-center gap-2">
            <Edit3 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span className="font-bold text-slate-800 dark:text-slate-200">Editor:</span>
            <span className="text-slate-500 dark:text-slate-400 truncate">แก้ไขแผน + รายจ่าย</span>
          </div>
          <div className="flex items-center gap-2">
            <Receipt className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span className="font-bold text-slate-800 dark:text-slate-200">Contributor:</span>
            <span className="text-slate-500 dark:text-slate-400 truncate">ดูแผน + บันทึกรายจ่าย</span>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="font-bold text-slate-800 dark:text-slate-200">Viewer:</span>
            <span className="text-slate-500 dark:text-slate-400 truncate">ดูอย่างเดียว (ห้ามบันทึก)</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="font-bold text-slate-800 dark:text-slate-200">Plan Only:</span>
            <span className="text-slate-500 dark:text-slate-400 truncate">ดูเฉพาะแผน (ซ่อนเงิน)</span>
          </div>
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
                    <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                      <span className="truncate">{mName}</span>
                      {isCurrent && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60">
                          ฉัน
                        </span>
                      )}
                      {isTripOwner && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 flex items-center gap-1">
                          <Crown className="h-2.5 w-2.5 text-amber-500" /> 
                          <span>เจ้าของทริป</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                      {isTripOwner
                        ? 'สิทธิ์เต็ม — ผู้สร้างทริป (Owner)'
                        : m.role === 'editor'
                        ? 'สิทธิ์แก้ไขแผนและบันทึกค่าใช้จ่าย (Editor)'
                        : m.role === 'contributor'
                        ? 'สิทธิ์ดูแผน และ บันทึกค่าใช้จ่ายได้ (Contributor)'
                        : m.role === 'plan_only'
                        ? 'สิทธิ์ดูเฉพาะแผนเดินทาง (Plan Only)'
                        : 'สิทธิ์ดูข้อมูลอย่างเดียว (Viewer)'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isOwner && !isTripOwner ? (
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <select
                        value={m.role || 'viewer'}
                        onChange={(e) => handleUpdateMemberRole(m.id, e.target.value as TripRole)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-[#2b354f] bg-white dark:bg-[#151b2b] text-slate-900 dark:text-white outline-none cursor-pointer focus:border-blue-500 shadow-2xs transition-colors"
                      >
                        <option value="editor">Editor — แก้ไขแผนและรายจ่าย</option>
                        <option value="contributor">Contributor — ดูแผน และ บันทึกรายจ่ายได้</option>
                        <option value="viewer">Viewer — ดูอย่างเดียว</option>
                        <option value="plan_only">Plan Only — ดูเฉพาะแผนเที่ยว</option>
                      </select>

                      {onInitiateTransferOwnership && (
                        <button
                          type="button"
                          onClick={() => onInitiateTransferOwnership(m)}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800/60 transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-2xs"
                          title="โอนสิทธิ์เจ้าของทริปให้สมาชิกคนนี้"
                        >
                          <ArrowRightLeft className="h-3 w-3" />
                          <span className="hidden sm:inline">โอนสิทธิ์</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleRemoveMember(m.id, mName)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50"
                        title="ลบสมาชิกออกจากทริป"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#151b2b] border border-slate-200/90 dark:border-[#222c42] text-xs font-bold text-slate-700 dark:text-slate-300 inline-flex items-center gap-1.5 shadow-2xs font-mono">
                      {isTripOwner ? (
                        <>
                          <Crown className="h-3 w-3 text-amber-500" />
                          <span>Owner</span>
                        </>
                      ) : m.role === 'editor' ? (
                        <>
                          <Edit3 className="h-3 w-3 text-emerald-500" />
                          <span>Editor</span>
                        </>
                      ) : m.role === 'contributor' ? (
                        <>
                          <Receipt className="h-3 w-3 text-blue-500" />
                          <span>Contributor</span>
                        </>
                      ) : m.role === 'plan_only' ? (
                        <>
                          <MapPin className="h-3 w-3 text-slate-400" />
                          <span>Plan Only</span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3 text-slate-400" />
                          <span>Viewer</span>
                        </>
                      )}
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
