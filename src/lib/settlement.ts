// src/lib/settlement.ts

import { convertCurrency } from './currency';

export interface MemberBalance {
  name: string;
  avatar: string;
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

export function calculateSettlement(
  expenses: any[],
  membersList: { name: string; avatar: string; id?: string }[],
  currency: string = 'JPY',
  jpyThbRate?: number
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

  // 1. Calculate total paid per member
  const paidMap = new Map<string, number>();
  membersList.forEach((m) => paidMap.set(m.name.toLowerCase(), 0));

  let totalSpent = 0;
  expenses.forEach((e) => {
    const amount = Number(e.amount || 0);
    totalSpent += amount;
    const payer = (e.payer_name || 'สมาชิก').toLowerCase();
    paidMap.set(payer, (paidMap.get(payer) || 0) + amount);
  });

  const memberCount = membersList.length;
  const averagePerPerson = memberCount > 0 ? totalSpent / memberCount : 0;

  // 2. Build balances
  const balances: MemberBalance[] = membersList.map((m) => {
    const totalPaid = paidMap.get(m.name.toLowerCase()) || 0;
    const netBalance = totalPaid - averagePerPerson;
    return {
      name: m.name,
      avatar: m.avatar || 'cat_pink',
      totalPaid,
      fairShare: averagePerPerson,
      netBalance,
    };
  });

  // 3. Debt Simplification Algorithm (Greedy matching)
  // Debtors: netBalance < -0.01 (owe money)
  // Creditors: netBalance > 0.01 (should receive money)
  const debtors: { name: string; avatar: string; amount: number }[] = [];
  const creditors: { name: string; avatar: string; amount: number }[] = [];

  balances.forEach((b) => {
    if (b.netBalance < -0.5) {
      debtors.push({ name: b.name, avatar: b.avatar, amount: Math.abs(b.netBalance) });
    } else if (b.netBalance > 0.5) {
      creditors.push({ name: b.name, avatar: b.avatar, amount: b.netBalance });
    }
  });

  // Sort descending
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
      const thb = convertCurrency(roundedAmount, currency, 'THB', jpyThbRate);
      transfers.push({
        from: debtor.name,
        fromAvatar: debtor.avatar,
        to: creditor.name,
        toAvatar: creditor.avatar,
        amount: roundedAmount,
        amountTHB: Math.round(thb),
        currency,
      });
    }

    debtor.amount -= settledAmount;
    creditor.amount -= settledAmount;

    if (debtor.amount < 0.5) dIdx++;
    if (creditor.amount < 0.5) cIdx++;
  }

  return {
    totalSpent,
    memberCount,
    averagePerPerson,
    balances,
    transfers,
  };
}
