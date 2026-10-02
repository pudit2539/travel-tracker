// src/lib/settlement.ts

import { convertCurrency } from './currency';

export interface MemberBalance {
  name: string;
  avatar: string;
  id?: string;
  totalPaid: number;
  fairShare: number;
  netBalance: number; // positive = should receive, negative = should pay
}

export interface TransferPlan {
  from: string;
  fromAvatar: string;
  to: string;
  toAvatar: string;
  amount: number;
  amountTHB: number;
  currency: string;
}

export interface SettlementSummary {
  totalSpent: number;
  memberCount: number;
  averagePerPerson: number;
  balances: MemberBalance[];
  transfers: TransferPlan[];
}

function cleanMemberName(name: string): string {
  return (name || '').replace(/\s*\(ฉัน\)\s*/gi, '').trim().toLowerCase();
}

export function calculateSettlement(
  expenses: any[],
  membersList: { name: string; avatar: string; id?: string }[],
  currency: string = 'THB',
  jpyThbRate?: number,
  expenseSplitsMap?: Record<string, string[]>
): SettlementSummary {
  if (!membersList || membersList.length === 0) {
    return {
      totalSpent: 0,
      memberCount: 0,
      averagePerPerson: 0,
      balances: [],
      transfers: [],
    };
  }

  const baseCurrency = (currency || 'THB').toUpperCase();

  // 1. Initialize total paid and fair share per member (using normalized member key)
  const paidMap = new Map<string, number>();
  const shareMap = new Map<string, number>();

  membersList.forEach((m) => {
    const key = cleanMemberName(m.name);
    paidMap.set(key, 0);
    shareMap.set(key, 0);
  });

  let totalSpent = 0;

  expenses.forEach((e) => {
    const rawAmount = Number(e.amount || 0);
    if (rawAmount <= 0) return;

    const expCurrency = (e.currency || baseCurrency).toUpperCase();
    // Normalize every expense into the trip's base settlement currency
    const normalizedAmount = convertCurrency(rawAmount, expCurrency, baseCurrency, jpyThbRate);
    totalSpent += normalizedAmount;

    // Match payer against membersList by ID or cleaned name
    const eId = e.payer_id?.toLowerCase();
    const eName = cleanMemberName(e.payer_name);

    let matchedMember = membersList.find((m) => {
      if (eId && m.id && m.id.toLowerCase() === eId) return true;
      return cleanMemberName(m.name) === eName;
    });

    const payerKey = matchedMember ? cleanMemberName(matchedMember.name) : (eName || 'สมาชิก');
    paidMap.set(payerKey, (paidMap.get(payerKey) || 0) + normalizedAmount);

    // Who shares this expense?
    const customSplitKeys = expenseSplitsMap && expenseSplitsMap[e.id];
    let sharingMembers: { name: string; avatar: string; id?: string }[] = [];

    if (customSplitKeys && Array.isArray(customSplitKeys) && customSplitKeys.length > 0) {
      sharingMembers = membersList.filter((m) => {
        const key = cleanMemberName(m.name);
        const mId = (m.id || '').toLowerCase();
        const mRaw = (m.name || '').toLowerCase();
        return customSplitKeys.some((rawK) => {
          const k = (rawK || '').toLowerCase().trim();
          if (!k) return false;
          if (k === 'me' && (mRaw.includes('(ฉัน)') || mId === e.payer_id?.toLowerCase())) return true;
          if (mId && k === mId) return true;
          if (key && (k === key || cleanMemberName(k) === key)) return true;
          if (mRaw && k === mRaw) return true;
          return false;
        });
      });
    }

    // Default: If no custom split is assigned or all members matched, everyone in the trip shares it
    if (sharingMembers.length === 0) {
      sharingMembers = membersList;
    }

    const perPersonShare = normalizedAmount / sharingMembers.length;
    sharingMembers.forEach((m) => {
      const key = cleanMemberName(m.name);
      shareMap.set(key, (shareMap.get(key) || 0) + perPersonShare);
    });
  });

  const memberCount = membersList.length;
  const averagePerPerson = memberCount > 0 ? totalSpent / memberCount : 0;

  // 2. Build balances
  const balances: MemberBalance[] = membersList.map((m) => {
    const key = cleanMemberName(m.name);
    const totalPaid = paidMap.get(key) || 0;
    const fairShare = shareMap.get(key) || 0;
    const netBalance = totalPaid - fairShare;
    return {
      name: m.name.replace(/\s*\(ฉัน\)\s*/gi, ''),
      avatar: m.avatar || 'cat_pink',
      id: m.id,
      totalPaid: Math.round(totalPaid),
      fairShare: Math.round(fairShare),
      netBalance,
    };
  });

  // 3. Debt Simplification Algorithm (Greedy matching)
  // Debtors: netBalance < -0.5 (owe money)
  // Creditors: netBalance > 0.5 (should receive money)
  const debtors: { name: string; avatar: string; amount: number }[] = [];
  const creditors: { name: string; avatar: string; amount: number }[] = [];

  balances.forEach((b) => {
    if (b.netBalance < -0.5) {
      debtors.push({ name: b.name, avatar: b.avatar, amount: Math.abs(b.netBalance) });
    } else if (b.netBalance > 0.5) {
      creditors.push({ name: b.name, avatar: b.avatar, amount: b.netBalance });
    }
  });

  // Sort descending to settle largest debts first
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: TransferPlan[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const settledAmount = Math.min(debtor.amount, creditor.amount);
    const roundedAmount = Math.round(settledAmount);

    if (roundedAmount > 0) {
      const thb = baseCurrency === 'THB' 
        ? roundedAmount 
        : convertCurrency(roundedAmount, baseCurrency, 'THB', jpyThbRate);

      transfers.push({
        from: debtor.name,
        fromAvatar: debtor.avatar,
        to: creditor.name,
        toAvatar: creditor.avatar,
        amount: roundedAmount,
        amountTHB: Math.round(thb),
        currency: baseCurrency,
      });
    }

    debtor.amount -= settledAmount;
    creditor.amount -= settledAmount;

    if (debtor.amount < 0.5) dIdx++;
    if (creditor.amount < 0.5) cIdx++;
  }

  return {
    totalSpent: Math.round(totalSpent),
    memberCount,
    averagePerPerson: Math.round(averagePerPerson),
    balances,
    transfers,
  };
}
