// src/components/SettlementModal.tsx
'use client';

import { useState, useMemo } from 'react';
import { calculateSettlement, TransferPlan, MemberBalance } from '@/lib/settlement';
import { getCatAvatar } from '@/lib/avatars';
import { CatAvatarBadge } from '@/components/CatAvatarBadge';
import { getCustomJpyToThbRate, setCustomJpyToThbRate, convertCurrency, formatExchangeRateDisplay } from '@/lib/currency';
import { getTripExpenseSplits } from '@/lib/expenseSplits';
import { 
  X, ArrowRight, Wallet, Check, Copy, Sparkles, 
  Users, DollarSign, Calculator, ChevronRight, SlidersHorizontal
} from 'lucide-react';

interface SettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: any[];
  members: any[];
  currentUser: any;
  userDisplayName?: string;
  currency: string;
  fxRate?: number;
  tripId?: string;
}

export default function SettlementModal({
  isOpen,
  onClose,
  expenses,
  members,
  currentUser,
  userDisplayName,
  currency = 'THB',
  fxRate: propFxRate,
  tripId,
}: SettlementModalProps) {
  const [fxRate, setFxRate] = useState<number>(() => propFxRate ?? getCustomJpyToThbRate());
  const [showRateSettings, setShowRateSettings] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Build full members list (Owner + Joined Members)
  const membersList = useMemo(() => {
    const list: { name: string; avatar: string; id?: string }[] = [];
    const seenNames = new Set<string>();
    const seenIds = new Set<string>();

    // 1. Add current user / owner
    const myName = userDisplayName || currentUser?.user_metadata?.display_name || currentUser?.email?.split('@')[0] || 'ฉัน';
    const myAvatar = currentUser?.user_metadata?.avatar_id || 'cat_pink';
    list.push({ name: myName, avatar: myAvatar, id: currentUser?.id });
    seenNames.add(myName.toLowerCase().trim());
    if (currentUser?.id) seenIds.add(currentUser.id.toLowerCase());
    if (currentUser?.email) seenNames.add(currentUser.email.toLowerCase().trim());

    // 2. Add members
    members.forEach((m) => {
      const name = (m.profiles?.display_name || m.profiles?.email?.split('@')[0] || 'สมาชิก').trim();
      const mUserId = m.user_id?.toLowerCase();
      const isAlreadyIn = (mUserId && seenIds.has(mUserId)) || seenNames.has(name.toLowerCase());

      if (!isAlreadyIn) {
        list.push({
          name,
          avatar: m.profiles?.avatar_id || 'cat_purple',
          id: m.user_id,
        });
        seenNames.add(name.toLowerCase());
        if (m.user_id) seenIds.add(m.user_id.toLowerCase());
        if (m.profiles?.email) seenNames.add(m.profiles.email.toLowerCase().trim());
      }
    });

    // 3. Add any payers recorded in expenses who might not be in members table
    expenses.forEach((e) => {
      const pName = (e.payer_name || '').trim();
      const pId = e.payer_id?.toLowerCase();
      const isAlreadyIn = (pId && seenIds.has(pId)) || (pName && seenNames.has(pName.toLowerCase()));

      if (pName && !isAlreadyIn) {
        list.push({
          name: pName,
          avatar: e.payer_avatar || 'cat_blue',
          id: e.payer_id,
        });
        seenNames.add(pName.toLowerCase());
        if (e.payer_id) seenIds.add(e.payer_id.toLowerCase());
      }
    });

    return list;
  }, [members, currentUser, userDisplayName, expenses]);

  // Calculate settlement
  const settlement = useMemo(() => {
    const tId = tripId || (expenses && expenses[0]?.trip_id) || '';
    const expenseSplitsMap = tId ? getTripExpenseSplits(tId) : {};
    return calculateSettlement(expenses, membersList, currency, fxRate, expenseSplitsMap);
  }, [expenses, membersList, currency, fxRate, tripId]);

  const handleRateChange = (newRate: number) => {
    setFxRate(newRate);
    setCustomJpyToThbRate(newRate);
  };

  // Generate shareable Line message
  const copySettlementSummary = () => {
    let msg = `💰 สรุปเคลียร์บิลค่าใช้จ่ายทริป ✈️\n`;
    msg += `ยอดรวมทั้งหมด: ${settlement.totalSpent.toLocaleString()} ${currency}\n`;
    msg += `จำนวนสมาชิก: ${settlement.memberCount} คน (หารเฉลี่ยคนละ ${Math.round(settlement.averagePerPerson).toLocaleString()} ${currency})\n\n`;
    msg += `📋 แผนการโอนเงินเคลียร์บิล:\n`;

    if (settlement.transfers.length === 0) {
      msg += `✨ สมาชิกทุกคนจ่ายเท่ากันเรียบร้อยแล้ว ไม่มียอดค้างโอน!\n`;
    } else {
      settlement.transfers.forEach((t, i) => {
        const altText = currency === 'THB'
          ? ` (≈ ¥${Math.round(fxRate > 0 ? t.amount / fxRate : 0).toLocaleString()} JPY)`
          : ` (≈ ฿${t.amountTHB.toLocaleString()})`;
        msg += `${i + 1}. ${t.from} ➔ โอนให้ ${t.to}: ${t.amount.toLocaleString()} ${currency}${altText}\n`;
      });
    }

    navigator.clipboard.writeText(msg);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#151b2b] shadow-2xl border border-slate-200/90 dark:border-[#222c42] glow-blue max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Mobile Sheet Handle */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />
        
        {/* Header */}
        <div className="p-4 sm:p-6 pb-3 flex justify-between items-center border-b border-slate-100 dark:border-[#222c42]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-lg shadow-md shadow-blue-500/25">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                ระบบเคลียร์บิล & หารค่าใช้จ่าย 💸
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                คำนวณยอดหารเฉลี่ยและสรุปขั้นตอนการโอนเงินที่สั้นที่สุด
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1c2438] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 pt-4 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          
          {/* Top Summary Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-blue-50/40 dark:bg-[#1c2438] border border-blue-200/60 dark:border-[#222c42]">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">ยอดรวมทั้งทริป</span>
              <span className="text-base font-black text-slate-900 dark:text-white">
                {settlement.totalSpent.toLocaleString()} {currency}
              </span>
              {currency === 'THB' ? (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">
                  ≈ ¥{Math.round(fxRate > 0 ? settlement.totalSpent / fxRate : 0).toLocaleString()} JPY
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">
                  ≈ ฿{Math.round(settlement.totalSpent * fxRate).toLocaleString()} THB
                </span>
              )}
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">สมาชิก</span>
              <span className="text-base font-black text-slate-900 dark:text-white">
                {settlement.memberCount} คน
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/80 dark:border-[#222c42]">
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block">หารเฉลี่ยคนละ</span>
              <span className="text-base font-black text-blue-600 dark:text-blue-400">
                {Math.round(settlement.averagePerPerson).toLocaleString()} {currency}
              </span>
              {currency === 'THB' ? (
                <span className="text-[10px] text-blue-500/80 dark:text-blue-400/80 block font-mono">
                  ≈ ¥{Math.round(fxRate > 0 ? settlement.averagePerPerson / fxRate : 0).toLocaleString()} JPY
                </span>
              ) : (
                <span className="text-[10px] text-blue-500/80 dark:text-blue-400/80 block font-mono">
                  ≈ ฿{Math.round(settlement.averagePerPerson * fxRate).toLocaleString()} THB
                </span>
              )}
            </div>
          </div>

          {/* Rate setting toggle */}
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-600 dark:text-slate-300 font-medium">
              อัตราแลกเปลี่ยน: <b className="text-slate-900 dark:text-white font-mono font-bold">
                {formatExchangeRateDisplay(currency, fxRate)}
              </b>
            </span>
            <button
              onClick={() => setShowRateSettings(!showRateSettings)}
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <SlidersHorizontal className="h-3 w-3" /> {showRateSettings ? 'ซ่อนตั้งค่าเรต' : 'ปรับเรตแลกเงิน'}
            </button>
          </div>

          {showRateSettings && (
            <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-[#1c2438] border border-slate-200 dark:border-[#222c42] space-y-2 animate-in fade-in">
              <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-200">
                กำหนดเรตแลกเงินที่คุณแลกมา (1 เยน = กี่บาท เช่น 0.210)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.001"
                  className="flex-1 p-2 rounded-xl border border-slate-300 dark:border-[#2a3650] bg-white dark:bg-[#151b2b] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-500 font-mono font-bold"
                  value={fxRate.toFixed(3)}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val > 0) {
                      // If user entered 21.0 -> 0.210
                      const rate = val > 1 ? val / 100 : val;
                      handleRateChange(rate);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleRateChange(0.210)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-[#2a3650] text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#151b2b]"
                >
                  เรตมาตรฐาน (0.210)
                </button>
              </div>
            </div>
          )}

          {/* Transfer Plan (ใครต้องโอนให้ใคร) */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" /> แผนการโอนเงินเคลียร์บิล (Transfer Settlement)
            </h3>

            {settlement.transfers.length === 0 ? (
              <div className="text-center py-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                🎉 ยอดใช้จ่ายลงตัวพอดี ไม่มียอดที่ต้องโอนให้กัน!
              </div>
            ) : (
              <div className="space-y-2">
                {settlement.transfers.map((t, idx) => {
                  const fromCat = getCatAvatar(t.fromAvatar);
                  const toCat = getCatAvatar(t.toAvatar);

                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-[#222c42] bg-slate-50/60 dark:bg-[#1c2438]/70 flex items-center justify-between gap-2 shadow-xs"
                    >
                      {/* From (Debtor) */}
                      <div className="flex items-center gap-2 min-w-0">
                        <CatAvatarBadge cat={fromCat} size="md" />
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate block">
                            {t.from}
                          </span>
                          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">ผู้โอน</span>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="flex flex-col items-center px-1 shrink-0">
                        <ArrowRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>

                      {/* To (Creditor) */}
                      <div className="flex items-center gap-2 min-w-0">
                        <CatAvatarBadge cat={toCat} size="md" />
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate block">
                            {t.to}
                          </span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">ผู้รับเงิน</span>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-right shrink-0 pl-2">
                        <div className="text-xs font-black text-slate-900 dark:text-white">
                          {t.amount.toLocaleString()} {currency}
                        </div>
                        {currency === 'THB' ? (
                          <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 block font-mono">
                            ≈ ¥{Math.round(fxRate > 0 ? t.amount / fxRate : 0).toLocaleString()} JPY
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 block font-mono">
                            ≈ ฿{t.amountTHB.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Member Balance Breakdown */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#222c42]">
            <h3 className="text-xs font-black text-slate-900 dark:text-white">
              สถานะยอดของสมาชิกแต่ละคน
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-[#222c42]">
              {settlement.balances.map((b, idx) => {
                const bCat = getCatAvatar(b.avatar);
                const isOverpaid = b.netBalance > 0.5;
                const isExact = Math.abs(b.netBalance) <= 0.5;

                return (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <CatAvatarBadge cat={bCat} size="sm" />
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">{b.name}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">จ่ายไป {b.totalPaid.toLocaleString()} {currency}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      {isExact ? (
                        <span className="text-[11px] font-bold text-slate-400">ครบพอดี</span>
                      ) : isOverpaid ? (
                        <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                          + รับคืน {Math.round(b.netBalance).toLocaleString()} {currency}
                        </span>
                      ) : (
                        <span className="text-[11px] font-black text-rose-600 dark:text-rose-400">
                          - ต้องจ่าย {Math.round(Math.abs(b.netBalance)).toLocaleString()} {currency}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 pt-3 border-t border-slate-100 dark:border-[#222c42] flex justify-between items-center gap-2">
          <button
            type="button"
            onClick={copySettlementSummary}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105"
          >
            {copiedText ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span>{copiedText ? 'คัดลอกสรุปแล้ว!' : 'คัดลอกสรุปส่งเข้า LINE'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-[#222c42] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1c2438] transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
}
