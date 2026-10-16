// src/lib/exportExpensesExcel.ts
import * as XLSX from 'xlsx';
import { convertCurrency } from './currency';
import { SettlementSummary } from './settlement';

interface ExportExpensesParams {
  tripName: string;
  expenses: any[];
  membersList: { name: string; avatar: string; id?: string }[];
  settlementSummary: SettlementSummary;
  tripCurrency?: string;
  fxRate?: number;
  categoryNames?: Record<string, string>;
}

export function buildExpensesWorkbook({
  tripName = 'TravelTracker',
  expenses = [],
  membersList = [],
  settlementSummary,
  tripCurrency = 'JPY',
  fxRate = 0.210,
  categoryNames = {},
}: ExportExpensesParams) {
  const wb = XLSX.utils.book_new();

  // Helper for Payment Method display
  const formatPaymentMethod = (method?: string) => {
    switch (method) {
      case 'credit_card':
        return 'บัตรเครดิต (Credit Card)';
      case 'travel_card':
        return 'Travel Card (บัตรแตะ)';
      case 'promptpay':
        return 'โอนเงิน / PromptPay';
      case 'cash':
      default:
        return 'เงินสด (Cash)';
    }
  };

  // ==========================================
  // SHEET 1: รายการค่าใช้จ่ายทั้งหมด (Expenses)
  // ==========================================
  const expensesRows = expenses.map((e, index) => {
    const rawAmount = Number(e.amount || 0);
    const curr = (e.currency || tripCurrency).toUpperCase();
    const thbAmount = Math.round(convertCurrency(rawAmount, curr, 'THB', fxRate));

    return {
      'ลำดับ': index + 1,
      'วันที่': e.spent_at ? new Date(e.spent_at).toLocaleDateString('th-TH') : '-',
      'ชื่อรายการ / ร้านค้า': e.title || e.merchant || '-',
      'หมวดหมู่': categoryNames[e.category] || e.category || 'ทั่วไป',
      'จำนวนเงิน': rawAmount,
      'สกุลเงิน': curr,
      'เทียบเท่า (บาท)': thbAmount,
      'ผู้จ่ายเงิน': e.payer_name || 'สมาชิก',
      'วิธีชำระเงิน': formatPaymentMethod(e.payment_method),
      'หมายเหตุ': e.note || '-',
    };
  });

  const wsExpenses = XLSX.utils.json_to_sheet(expensesRows);
  wsExpenses['!cols'] = [
    { wch: 6 },  // ลำดับ
    { wch: 14 }, // วันที่
    { wch: 28 }, // ชื่อรายการ
    { wch: 18 }, // หมวดหมู่
    { wch: 14 }, // จำนวนเงิน
    { wch: 10 }, // สกุลเงิน
    { wch: 16 }, // เทียบเท่าบาท
    { wch: 18 }, // ผู้จ่าย
    { wch: 24 }, // วิธีชำระเงิน
    { wch: 30 }, // หมายเหตุ
  ];
  XLSX.utils.book_append_sheet(wb, wsExpenses, 'รายการค่าใช้จ่าย');

  // ==========================================
  // SHEET 2: แผนเคลียร์หนี้ & โอนเงิน (Settlement)
  // ==========================================
  const transferRows = (settlementSummary?.transfers || []).map((t, idx) => ({
    'ลำดับ': idx + 1,
    'ผู้โอนเงิน': t.from,
    'ผู้รับโอนเงิน': t.to,
    'ยอดโอน (บาท THB)': Math.round(t.amountTHB),
    'ยอดโอน (สกุลทริป)': `${Math.round(t.amount).toLocaleString()} ${t.currency}`,
    'สถานะ': 'รอดำเนินการโอนเงิน',
  }));

  const wsTransfers = XLSX.utils.json_to_sheet(
    transferRows.length > 0 ? transferRows : [{ 'ผลลัพธ์': 'ไม่มีหนี้ค้างชำระ ยอดเงินสมดุลแล้ว' }]
  );
  wsTransfers['!cols'] = [
    { wch: 6 },
    { wch: 20 },
    { wch: 20 },
    { wch: 18 },
    { wch: 22 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsTransfers, 'แผนเคลียร์หนี้');

  // ==========================================
  // SHEET 3: ยอดรวมรายคน (Member Spending)
  // ==========================================
  const memberRows = (settlementSummary?.balances || []).map((b, idx) => ({
    'ลำดับ': idx + 1,
    'ชื่อสมาชิก': b.name,
    'ยอดที่ออกไปทั้งหมด (บาท)': b.totalPaid,
    'ส่วนแบ่งที่ต้องรับผิดชอบ (บาท)': b.fairShare,
    'ยอดสุทธิ (บาท)': b.netBalance >= 0 
      ? `+${Math.round(b.netBalance)} (รอรับเงินคืน)` 
      : `${Math.round(b.netBalance)} (ต้องโอนเพิ่ม)`,
  }));

  const wsMembers = XLSX.utils.json_to_sheet(memberRows);
  wsMembers['!cols'] = [
    { wch: 6 },
    { wch: 20 },
    { wch: 24 },
    { wch: 26 },
    { wch: 26 },
  ];
  XLSX.utils.book_append_sheet(wb, wsMembers, 'สรุปรายบุคคล');

  // ==========================================
  // SHEET 4: สรุปตามหมวดหมู่ (Category Summary)
  // ==========================================
  const categoryTotals: Record<string, { thb: number; count: number }> = {};
  let totalTripThb = 0;

  expenses.forEach((e) => {
    const raw = Number(e.amount || 0);
    const curr = (e.currency || tripCurrency).toUpperCase();
    const thb = convertCurrency(raw, curr, 'THB', fxRate);
    const catName = categoryNames[e.category] || e.category || 'ทั่วไป';

    if (!categoryTotals[catName]) {
      categoryTotals[catName] = { thb: 0, count: 0 };
    }
    categoryTotals[catName].thb += thb;
    categoryTotals[catName].count += 1;
    totalTripThb += thb;
  });

  const categoryRows = Object.entries(categoryTotals).map(([cat, data], idx) => ({
    'ลำดับ': idx + 1,
    'หมวดหมู่': cat,
    'จำนวนรายการ': data.count,
    'ยอดรวม (บาท)': Math.round(data.thb),
    'สัดส่วน (%)': totalTripThb > 0 ? `${((data.thb / totalTripThb) * 100).toFixed(1)}%` : '0%',
  }));

  const wsCategories = XLSX.utils.json_to_sheet(categoryRows);
  wsCategories['!cols'] = [
    { wch: 6 },
    { wch: 24 },
    { wch: 14 },
    { wch: 18 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsCategories, 'สรุปตามหมวดหมู่');

  // Generate clean filename
  const cleanTripName = tripName.replace(/[\\/*?:"<>|]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `TravelTracker_${cleanTripName}_${dateStr}.xlsx`;

  return { wb, fileName };
}

export function exportExpensesToExcel(params: ExportExpensesParams) {
  const { wb, fileName } = buildExpensesWorkbook(params);
  if (typeof window !== 'undefined' || typeof XLSX.writeFile === 'function') {
    XLSX.writeFile(wb, fileName);
  }
  return { wb, fileName };
}
