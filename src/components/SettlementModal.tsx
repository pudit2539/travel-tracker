// src/components/SettlementModal.tsx
'use client';

import { useState, useMemo } from 'react';
import { calculateSettlement, TransferPlan, MemberBalance } from '@/lib/settlement';
import { getCatAvatar } from '@/lib/avatars';
import { getCustomJpyToThbRate, setCustomJpyToThbRate } from '@/lib/currency';
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
  currency: string;
}

export default function SettlementModal({
  isOpen,
  onClose,
  expenses,
  members,
  currentUser,
  currency = 'JPY',
}: SettlementModalProps) {
  const [fxRate, setFxRate] = useState<number>(() => getCustomJpyToThbRate());
  const [showRateSettings, setShowRateSettings] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Build full members list (Owner + Joined Members)
  const membersList = useMemo(() => {
    const list: { name: string; avatar: string; id?: string }[] = [];
    const seenNames = new Set<string>();

    // 1. Add current user / owner
    const myName = currentUser?.user_metadata?.display_name || currentUser?.email?.split('@')[0] || 'ฉัน';
    const myAvatar = currentUser?.user_metadata?.avatar_id || 'cat_pink';
    list.push({ name: myName, avatar: myAvatar, id: currentUser?.id });
    seenNames.add(myName.toLowerCase());

    // 2. Add members
    members.forEach((m) => {
      const name = m.profiles?.display_name || m.profiles?.email?.split('@')[0] || 'สมาชิก';
      if (!seenNames.has(name.toLowerCase())) {
        list.push({
          name,
          avatar: m.profiles?.avatar_id || 'cat_purple',
          id: m.user_id,
        });
        seenNames.add(name.toLowerCase());
      }
    });

    // 3. Add any payers recorded in expenses who might not be in members table
    expenses.forEach((e) => {
      if (e.payer_name && !seenNames.has(e.payer_name.toLowerCase())) {
        list.push({
          name: e.payer_name,
          avatar: e.payer_avatar || 'cat_blue',
          id: e.payer_id,
        });
        seenNames.add(e.payer_name.toLowerCase());
      }
    });

    return list;
  }, [members, currentUser, expenses]);

  // Calculate settlement
  const settlement = useMemo(() => {
    return calculateSettlement(expenses, membersList, currency, fxRate);
  }, [expenses, membersList, currency, fxRate]);

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
        msg += `${i + 1}. ${t.from} ➔ โอนให้ ${t.to}: ${t.amount.toLocaleString()} ${currency} (≈ ฿${t.amountTHB.toLocaleString()})\n`;
      });
    }

    navigator.clipboard.writeText(msg);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-[#120c1e] shadow-2xl border border-slate-200 dark:border-purple-800/60 glow-pink-purple max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 pb-3 flex justify-between items-center border-b border-slate-100 dark:border-purple-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white text-lg shadow-md shadow-pink-500/25">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                ระบบเคลียร์บิล & หารค่าใช้จ่าย 💸
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-purple-300/70 font-medium">
                คำนวณยอดหารเฉลี่ยและสรุปขั้นตอนการโอนเงินที่สั้นที่สุด
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-purple-200 hover:bg-slate-100 dark:hover:bg-purple-950/50 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 pt-4 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          
          {/* Top Summary Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-gradient-to-br from-pink-500/10 via-purple-600/10 to-indigo-600/10 border border-purple-200/90 dark:border-purple-800/60">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-purple-300/70 block">ยอดรวมทั้งทริป</span>
              <span className="text-base font-black text-slate-900 dark:text-white">
                {settlement.totalSpent.toLocaleString()} {currency}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-purple-300/70 block">สมาชิก</span>
              <span className="text-base font-black text-slate-900 dark:text-white">
                {settlement.memberCount} คน
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1 border-t sm:border-t-0 pt-2 sm:pt-0 border-purple-200/40">
              <span className="text-[11px] font-bold text-pink-600 dark:text-pink-400 block">หารเฉลี่ยคนละ</span>
              <span className="text-base font-black bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400 bg-clip-text text-transparent">
                {Math.round(settlement.averagePerPerson).toLocaleString()} {currency}
              </span>
            </div>
          </div>

          {/* Rate setting toggle */}
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-600 dark:text-purple-300/80 font-medium">
              อัตราแลกเปลี่ยน: <b className="text-slate-900 dark:text-white">100 JPY = {(fxRate * 100).toFixed(2)} THB</b>
            </span>
            <button
              onClick={() => setShowRateSettings(!showRateSettings)}
              className="text-[11px] font-bold text-pink-600 dark:text-pink-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <SlidersHorizontal className="h-3 w-3" /> {showRateSettings ? 'ซ่อนตั้งค่าเรต' : 'ปรับเรตแลกเงิน'}
            </button>
          </div>

          {showRateSettings && (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-purple-950/30 border border-slate-200 dark:border-purple-900/40 space-y-2 animate-in fade-in">
              <label className="block text-[11px] font-bold text-slate-800 dark:text-purple-200">
                กำหนดเรตแลกเงินที่คุณแลกมา (บาท ต่อ 100 เยน)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  className="flex-1 p-2 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-white dark:bg-[#1c1328] text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-mono font-bold"
                  value={(fxRate * 100).toFixed(2)}
                  onChange={(e) => handleRateChange(parseFloat(e.target.value) / 100 || 0.235)}
                />
                <button
                  type="button"
                  onClick={() => handleRateChange(0.235)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-purple-800 text-xs font-bold text-slate-700 dark:text-purple-200 hover:bg-slate-100 dark:hover:bg-purple-900"
                >
                  เรตมาตรฐาน (23.50)
                </button>
              </div>
            </div>
          )}

          {/* Transfer Plan (ใครต้องโอนให้ใคร) */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-pink-500" /> แผนการโอนเงินเคลียร์บิล (Transfer Settlement)
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
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-purple-900/40 bg-slate-50/50 dark:bg-[#180f28]/80 flex items-center justify-between gap-2 shadow-xs"
                    >
                      {/* From (Debtor) */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${fromCat.bgGradient} flex items-center justify-center text-sm shrink-0`}>
                          {fromCat.emoji}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate block">
                            {t.from}
                          </span>
                          <span className="text-[10px] text-rose-600 font-bold">ผู้โอน</span>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="flex flex-col items-center px-1 shrink-0">
                        <ArrowRight className="h-4 w-4 text-pink-500" />
                      </div>

                      {/* To (Creditor) */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${toCat.bgGradient} flex items-center justify-center text-sm shrink-0`}>
                          {toCat.emoji}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate block">
                            {t.to}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-bold">ผู้รับเงิน</span>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-right shrink-0 pl-2">
                        <div className="text-xs font-black text-slate-900 dark:text-white">
                          {t.amount.toLocaleString()} {currency}
                        </div>
                        <span className="text-[10px] font-extrabold text-pink-600 dark:text-pink-400">
                          ≈ ฿{t.amountTHB.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Member Balance Breakdown */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-purple-900/40">
            <h3 className="text-xs font-black text-slate-900 dark:text-white">
              สถานะยอดของสมาชิกแต่ละคน
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-purple-900/30">
              {settlement.balances.map((b, idx) => {
                const bCat = getCatAvatar(b.avatar);
                const isOverpaid = b.netBalance > 0.5;
                const isExact = Math.abs(b.netBalance) <= 0.5;

                return (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-xl bg-gradient-to-tr ${bCat.bgGradient} flex items-center justify-center text-xs`}>
                        {bCat.emoji}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">{b.name}</span>
                        <span className="text-[10px] text-slate-500 dark:text-purple-400 font-medium">จ่ายไป {b.totalPaid.toLocaleString()} {currency}</span>
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
        <div className="p-6 pt-3 border-t border-slate-100 dark:border-purple-900/40 flex justify-between items-center gap-2">
          <button
            type="button"
            onClick={copySettlementSummary}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold shadow-md shadow-pink-500/20 flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105"
          >
            {copiedText ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span>{copiedText ? 'คัดลอกสรุปแล้ว!' : 'คัดลอกสรุปส่งเข้า LINE'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-purple-800 text-xs font-bold text-slate-700 dark:text-purple-200 hover:bg-slate-100 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
}
