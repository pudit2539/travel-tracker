// src/components/SettlementModal.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { calculateSettlement, TransferPlan, MemberBalance } from '@/lib/settlement';
import { getCatAvatar } from '@/lib/avatars';
import { CatAvatarBadge } from '@/components/CatAvatarBadge';
import { getCustomJpyToThbRate, setCustomJpyToThbRate, convertCurrency, formatExchangeRateDisplay } from '@/lib/currency';
import { getTripExpenseSplits, saveTripExpenseSplits } from '@/lib/expenseSplits';
import { 
  X, ArrowRight, Wallet, Check, Copy, Sparkles, 
  Users, DollarSign, Calculator, ChevronRight, SlidersHorizontal,
  QrCode, Utensils, Split, Edit2, CheckCircle2, Circle, AlertCircle, 
  Share2, ArrowUpRight, UserCheck, CheckSquare, Square
} from 'lucide-react';

interface SettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: any[];
  members: any[];
  currentUser: any;
  userDisplayName?: string;
  currency?: string;
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
  const [activeTab, setActiveTab] = useState<'transfers' | 'dishes'>('transfers');

  // Dynamic PromptPay modal state
  const [selectedTransferForQr, setSelectedTransferForQr] = useState<TransferPlan | null>(null);
  const [promptPayNumber, setPromptPayNumber] = useState<string>('');
  const [copiedPromptPay, setCopiedPromptPay] = useState(false);
  const [editingPromptPay, setEditingPromptPay] = useState(false);

  // Transfer paid status (saved locally per trip)
  const [settledTransfers, setSettledTransfers] = useState<Record<string, boolean>>({});

  // Expense splits state for live Dish-Split toggling
  const effectiveTripId = tripId || (expenses && expenses[0]?.trip_id) || '';
  const [splitsMap, setSplitsMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (effectiveTripId) {
      setSplitsMap(getTripExpenseSplits(effectiveTripId));
      try {
        const savedSettled = localStorage.getItem(`travel_tracker_settled_transfers_${effectiveTripId}`);
        if (savedSettled) setSettledTransfers(JSON.parse(savedSettled));
      } catch {}
    }
  }, [effectiveTripId, isOpen]);

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

  // Calculate settlement with live splitsMap
  const settlement = useMemo(() => {
    return calculateSettlement(expenses, membersList, currency, fxRate, splitsMap);
  }, [expenses, membersList, currency, fxRate, splitsMap]);

  const handleRateChange = (newRate: number) => {
    setFxRate(newRate);
    setCustomJpyToThbRate(newRate);
  };

  // Feature 5: Toggle member split for a specific expense / dish
  const handleToggleMemberSplit = (expenseId: string, memberKey: string) => {
    if (!effectiveTripId) return;

    const currentExpenseSplits = splitsMap[expenseId] || membersList.map((m) => m.id || m.name);
    let updatedMembers: string[];

    if (currentExpenseSplits.includes(memberKey)) {
      // Must have at least 1 person sharing
      if (currentExpenseSplits.length <= 1) {
        return;
      }
      updatedMembers = currentExpenseSplits.filter((k) => k !== memberKey);
    } else {
      updatedMembers = [...currentExpenseSplits, memberKey];
    }

    const nextSplits = { ...splitsMap, [expenseId]: updatedMembers };
    setSplitsMap(nextSplits);
    saveTripExpenseSplits(effectiveTripId, nextSplits);
  };

  // Reset dish split to all members
  const handleResetDishToAll = (expenseId: string) => {
    if (!effectiveTripId) return;
    const allKeys = membersList.map((m) => m.id || m.name);
    const nextSplits = { ...splitsMap, [expenseId]: allKeys };
    setSplitsMap(nextSplits);
    saveTripExpenseSplits(effectiveTripId, nextSplits);
  };

  // Toggle mark as settled
  const toggleSettledTransfer = (transferKey: string) => {
    const next = { ...settledTransfers, [transferKey]: !settledTransfers[transferKey] };
    setSettledTransfers(next);
    if (effectiveTripId) {
      try {
        localStorage.setItem(`travel_tracker_settled_transfers_${effectiveTripId}`, JSON.stringify(next));
      } catch {}
    }
  };

  // Open PromptPay QR Modal
  const openPromptPayModal = (transfer: TransferPlan) => {
    setSelectedTransferForQr(transfer);
    // Retrieve saved PromptPay for this creditor
    const saved = localStorage.getItem(`travel_tracker_promptpay_${transfer.to.trim()}`);
    setPromptPayNumber(saved || '0812345678');
    setEditingPromptPay(false);
  };

  const handleSavePromptPay = (newNumber: string) => {
    if (!selectedTransferForQr) return;
    setPromptPayNumber(newNumber);
    localStorage.setItem(`travel_tracker_promptpay_${selectedTransferForQr.to.trim()}`, newNumber);
    setEditingPromptPay(false);
  };

  const copyPromptPayText = () => {
    if (!promptPayNumber) return;
    navigator.clipboard.writeText(promptPayNumber);
    setCopiedPromptPay(true);
    setTimeout(() => setCopiedPromptPay(false), 2000);
  };

  // Generate shareable Line message
  const copySettlementSummary = () => {
    let msg = `สรุปเคลียร์บิลค่าใช้จ่ายทริป\n`;
    msg += `ยอดรวมทั้งหมด: ${settlement.totalSpent.toLocaleString()} ${currency}\n`;
    msg += `จำนวนสมาชิก: ${settlement.memberCount} คน (หารเฉลี่ยคนละ ${Math.round(settlement.averagePerPerson).toLocaleString()} ${currency})\n\n`;
    msg += `แผนการโอนเงินเคลียร์บิล:\n`;

    if (settlement.transfers.length === 0) {
      msg += `สมาชิกทุกคนจ่ายเท่ากันเรียบร้อยแล้ว ไม่มียอดค้างโอน!\n`;
    } else {
      settlement.transfers.forEach((t, i) => {
        const altText = currency === 'THB'
          ? ` (≈ ¥${Math.round(fxRate > 0 ? t.amount / fxRate : 0).toLocaleString()} JPY)`
          : ` (≈ ฿${t.amountTHB.toLocaleString()})`;
        msg += `${i + 1}. ${t.from} โอนให้ ${t.to}: ${t.amount.toLocaleString()} ${currency}${altText}\n`;
      });
    }

    navigator.clipboard.writeText(msg);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#151b2b] shadow-2xl border border-slate-200/90 dark:border-[#222c42] max-h-[88vh] sm:max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
        
        {/* Mobile Sheet Handle */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />
        
        {/* Header */}
        <div className="p-4 sm:p-5 pb-3 flex justify-between items-center border-b border-slate-100 dark:border-[#222c42]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Calculator className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                ระบบเคลียร์บิล & หารค่าใช้จ่าย
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                คำนวณยอดหารและลดขั้นตอนการโอนเงินให้เหลือน้อยที่สุด
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

        {/* Tab Switcher: Transfers vs Dishes */}
        <div className="flex border-b border-slate-100 dark:border-[#222c42] px-4 pt-2 gap-4 shrink-0 bg-slate-50/50 dark:bg-[#111624]/50">
          <button
            type="button"
            onClick={() => setActiveTab('transfers')}
            className={`pb-2.5 text-xs font-bold transition-all relative flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'transfers'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>สรุปการโอนเงิน & QR</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dishes')}
            className={`pb-2.5 text-xs font-bold transition-all relative flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'dishes'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Utensils className="h-3.5 w-3.5" />
            <span>แยกจานอาหาร & บิล ({expenses.length})</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 pt-3 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          
          {/* Top Summary Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-blue-50/40 dark:bg-[#1c2438] border border-blue-200/60 dark:border-[#222c42]">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">ยอดรวมทั้งทริป</span>
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
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">สมาชิก</span>
              <span className="text-base font-black text-slate-900 dark:text-white">
                {settlement.memberCount} คน
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/80 dark:border-[#222c42]">
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 block">หารเฉลี่ยคนละ</span>
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
              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <SlidersHorizontal className="h-3 w-3" /> {showRateSettings ? 'ซ่อนตั้งค่าเรต' : 'ปรับเรตแลกเงิน'}
            </button>
          </div>

          {showRateSettings && (
            <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-[#1c2438] border border-slate-200 dark:border-[#222c42] space-y-2 animate-in fade-in">
              <label className="block text-[11px] font-semibold text-slate-800 dark:text-slate-200">
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
                      const rate = val > 1 ? val / 100 : val;
                      handleRateChange(rate);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleRateChange(0.210)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-[#2a3650] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#151b2b]"
                >
                  เรตมาตรฐาน (0.210)
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: TRANSFER SETTLEMENT & QR */}
          {activeTab === 'transfers' && (
            <>
              {/* Transfer Plan Cards */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>แผนการโอนเงินเคลียร์บิล (Transfer Settlement)</span>
                  </h3>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {settlement.transfers.length} รายการ
                  </span>
                </div>

                {settlement.transfers.length === 0 ? (
                  <div className="text-center py-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                    ยอดใช้จ่ายลงตัวพอดี ไม่มียอดที่ต้องโอนให้กัน
                  </div>
                ) : (
                  <div className="space-y-2">
                    {settlement.transfers.map((t, idx) => {
                      const fromCat = getCatAvatar(t.fromAvatar);
                      const toCat = getCatAvatar(t.toAvatar);
                      const transferKey = `${t.from}_${t.to}_${t.amount}`;
                      const isSettled = settledTransfers[transferKey];

                      return (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-2xl border transition-all flex flex-col gap-2.5 ${
                            isSettled
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 opacity-75'
                              : 'bg-slate-50/70 dark:bg-[#1c2438]/70 border-slate-200 dark:border-[#222c42]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            {/* Debtor */}
                            <div className="flex items-center gap-2 min-w-0">
                              <CatAvatarBadge cat={fromCat} size="md" />
                              <div className="min-w-0">
                                <span className="font-bold text-xs text-slate-900 dark:text-white truncate block">
                                  {t.from}
                                </span>
                                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">ผู้โอน</span>
                              </div>
                            </div>

                            {/* Arrow */}
                            <div className="flex flex-col items-center px-1 shrink-0">
                              <ArrowRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>

                            {/* Creditor */}
                            <div className="flex items-center gap-2 min-w-0">
                              <CatAvatarBadge cat={toCat} size="md" />
                              <div className="min-w-0">
                                <span className="font-bold text-xs text-slate-900 dark:text-white truncate block">
                                  {t.to}
                                </span>
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">ผู้รับเงิน</span>
                              </div>
                            </div>

                            {/* Amount */}
                            <div className="text-right shrink-0 pl-2">
                              <div className="text-xs font-black text-slate-900 dark:text-white">
                                {t.amount.toLocaleString()} {currency}
                              </div>
                              {currency === 'THB' ? (
                                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block font-mono">
                                  ≈ ¥{Math.round(fxRate > 0 ? t.amount / fxRate : 0).toLocaleString()} JPY
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block font-mono">
                                  ≈ ฿{t.amountTHB.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action Row: PromptPay QR & Mark as Settled */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-[#2a3650]">
                            <button
                              type="button"
                              onClick={() => openPromptPayModal(t)}
                              className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-900/60 text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <QrCode className="h-3.5 w-3.5" />
                              <span>สแกน QR จ่ายเงิน</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleSettledTransfer(transferKey)}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                                isSettled
                                  ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#252f48]'
                              }`}
                            >
                              {isSettled ? (
                                <>
                                  <CheckSquare className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                  <span>โอนเรียบร้อยแล้ว</span>
                                </>
                              ) : (
                                <>
                                  <Square className="h-3.5 w-3.5" />
                                  <span>ยังไม่ได้โอน</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Member Balance Breakdown */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#222c42]">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  สถานะยอดสุทธิของสมาชิกแต่ละคน
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
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                              จ่ายไป {b.totalPaid.toLocaleString()} {currency} (ภาระส่วนตัว {b.fairShare.toLocaleString()} {currency})
                            </span>
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
            </>
          )}

          {/* TAB 2: DISH & EXPENSE ITEMIZED BREAKDOWN (Feature 5) */}
          {activeTab === 'dishes' && (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#1c2438] border border-slate-200 dark:border-[#222c42] text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">
                  🍽️ ระบบเลือกคนหารจานอาหาร (Dynamic Dish-Split):
                </span>
                แตะที่ปุ่มชื่อสมาชิกเพื่อเลือก/เอาออก คนที่ไม่ได้รับประทานจานนี้ (เช่น ไม่กินเนื้อ, ไม่ดื่มเบียร์) ยอดเคลียร์บิลจะคำนวณใหม่โดยอัตโนมัติทันที
              </div>

              {expenses.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  ยังไม่มีรายการค่าใช้จ่ายในทริปนี้
                </div>
              ) : (
                <div className="space-y-2.5">
                  {expenses.map((exp) => {
                    const rawAmount = Number(exp.amount || 0);
                    const expCur = exp.currency || currency;
                    const payerName = exp.payer_name || 'สมาชิก';
                    const payerCat = getCatAvatar(exp.payer_avatar);

                    // Members currently splitting this expense
                    const customSplits = splitsMap[exp.id];
                    const allMemberKeys = membersList.map((m) => m.id || m.name);
                    const activeSplits = customSplits && customSplits.length > 0 ? customSplits : allMemberKeys;
                    
                    const isAllSharing = activeSplits.length === membersList.length;
                    const splitCount = activeSplits.length || 1;
                    const perPersonAmount = Math.round(rawAmount / splitCount);

                    return (
                      <div
                        key={exp.id}
                        className="p-3.5 rounded-2xl border border-slate-200 dark:border-[#222c42] bg-slate-50/70 dark:bg-[#1c2438]/70 space-y-2.5"
                      >
                        {/* Expense Header */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">
                              {exp.title || 'ไม่มีชื่อรายการ'}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              <CatAvatarBadge cat={payerCat} size="sm" />
                              <span>ชำระโดย <b className="text-slate-700 dark:text-slate-300">{payerName}</b></span>
                              <span>•</span>
                              <span>{exp.spent_at ? exp.spent_at.split('T')[0] : ''}</span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-black text-xs text-slate-900 dark:text-white block">
                              {rawAmount.toLocaleString()} {expCur}
                            </span>
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold block">
                              คนละ {perPersonAmount.toLocaleString()} {expCur}
                            </span>
                          </div>
                        </div>

                        {/* Split Members Selection Pills */}
                        <div className="pt-2 border-t border-slate-200/60 dark:border-[#2a3650] space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                              คนหาร ({splitCount}/{membersList.length} คน):
                            </span>
                            {!isAllSharing && (
                              <button
                                type="button"
                                onClick={() => handleResetDishToAll(exp.id)}
                                className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                              >
                                รีเซ็ตเป็นหารทุกคน
                              </button>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {membersList.map((m) => {
                              const mKey = m.id || m.name;
                              const isSharing = activeSplits.includes(mKey) || activeSplits.includes(m.name);
                              const mCat = getCatAvatar(m.avatar);

                              return (
                                <button
                                  key={mKey}
                                  type="button"
                                  onClick={() => handleToggleMemberSplit(exp.id, mKey)}
                                  className={`px-2 py-1 rounded-xl text-[10px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                    isSharing
                                      ? 'bg-blue-600 text-white shadow-2xs'
                                      : 'bg-white dark:bg-[#151b2b] text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-[#222c42] line-through opacity-60'
                                  }`}
                                >
                                  <CatAvatarBadge cat={mCat} size="sm" />
                                  <span>{m.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 pt-3 border-t border-slate-100 dark:border-[#222c42] flex justify-between items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={copySettlementSummary}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105"
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

      {/* PROMPTPAY QR MODAL (Feature 5) */}
      {selectedTransferForQr && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#151b2b] p-6 shadow-2xl border border-slate-200 dark:border-[#222c42] space-y-4 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-[#222c42]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <QrCode className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">สแกนจ่ายพร้อมเพย์</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">PromptPay QR Transfer</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTransferForQr(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Recipient & Amount Badge */}
            <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-[#1c2438] border border-blue-200/60 dark:border-[#222c42] text-center space-y-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">
                โอนให้คุณ <b className="text-slate-900 dark:text-white">{selectedTransferForQr.to}</b>
              </span>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                ฿{selectedTransferForQr.amountTHB.toLocaleString()} THB
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">
                ยอดต้นฉบับ: {selectedTransferForQr.amount.toLocaleString()} {selectedTransferForQr.currency}
              </span>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-white rounded-2xl border border-slate-200 shadow-inner">
              {promptPayNumber ? (
                <div className="relative">
                  <img
                    src={`https://promptpay.io/${promptPayNumber.replace(/-/g, '').trim()}/${selectedTransferForQr.amountTHB}.png`}
                    alt="PromptPay QR Code"
                    className="w-48 h-48 object-contain rounded-lg"
                    onError={(e) => {
                      // Fallback UI if offline or promptpay.io is unreachable
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="text-center mt-2">
                    <span className="text-[10px] font-bold text-slate-600 block">
                      พร้อมเพย์: {promptPayNumber}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-slate-400">
                  กรุณาระบุหมายเลขพร้อมเพย์ของผู้รับ
                </div>
              )}
            </div>

            {/* PromptPay Number Input / Edit */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  เลขพร้อมเพย์ / เบอร์มือถือ:
                </span>
                <button
                  type="button"
                  onClick={() => setEditingPromptPay(!editingPromptPay)}
                  className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                >
                  {editingPromptPay ? 'เสร็จสิ้น' : 'เปลี่ยนเบอร์'}
                </button>
              </div>

              {editingPromptPay ? (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={promptPayNumber}
                    onChange={(e) => setPromptPayNumber(e.target.value)}
                    placeholder="เช่น 0812345678 หรือ เลข ปชช."
                    className="flex-1 p-2 rounded-xl border border-slate-300 dark:border-[#2a3650] bg-slate-50 dark:bg-[#111624] text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleSavePromptPay(promptPayNumber)}
                    className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer"
                  >
                    บันทึก
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#1c2438] border border-slate-200 dark:border-[#222c42]">
                  <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                    {promptPayNumber || 'ยังไม่กำหนด'}
                  </span>
                  <button
                    type="button"
                    onClick={copyPromptPayText}
                    className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                  >
                    {copiedPromptPay ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedPromptPay ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedTransferForQr(null)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1c2438] dark:hover:bg-[#252f48] text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง QR
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
