// src/lib/tripStatus.ts
import { convertToThb } from '@/lib/currency';
import { PaymentMethod } from '@/lib/paymentMethods';

export type TripLifecycleStatus = 'live' | 'upcoming' | 'completed' | 'unscheduled';

export interface TripStatusBadge {
  status: TripLifecycleStatus;
  label: string;
  shortLabel: string;
  badgeText: string;
  subLabel?: string;
  isPulse?: boolean;
  daysUntil?: number;
  currentDay?: number;
  totalDays?: number;
}

function parseLocalDay(dateStr?: string | null): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const clean = dateStr.split('T')[0].trim();
  const parts = clean.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
}

/**
 * Calculates the real-time status badge for a trip card (Boarding Pass style)
 */
export function getTripStatusBadge(
  startDate?: string | null,
  endDate?: string | null,
  referenceNow?: Date
): TripStatusBadge {
  const start = parseLocalDay(startDate);
  if (!start) {
    const label = '🗓️ รอกำหนดวันเดินทาง';
    return {
      status: 'unscheduled',
      label,
      badgeText: label,
      shortLabel: 'รอกำหนดวัน',
      isPulse: false,
    };
  }

  const end = parseLocalDay(endDate) || start;
  const nowRaw = referenceNow || new Date();
  const today = new Date(nowRaw.getFullYear(), nowRaw.getMonth(), nowRaw.getDate(), 0, 0, 0, 0);

  const msPerDay = 1000 * 60 * 60 * 24;
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / msPerDay) + 1);

  if (today.getTime() >= start.getTime() && today.getTime() <= end.getTime()) {
    const currentDay = Math.round((today.getTime() - start.getTime()) / msPerDay) + 1;
    const label = `🟢 กำลังเดินทาง • Day ${currentDay}/${totalDays}`;
    return {
      status: 'live',
      label,
      badgeText: label,
      shortLabel: `Day ${currentDay}/${totalDays}`,
      subLabel: `กำลังท่องเที่ยววันที่ ${currentDay} จากทั้งหมด ${totalDays} วัน`,
      isPulse: true,
      currentDay,
      totalDays,
    };
  }

  if (today.getTime() < start.getTime()) {
    const daysUntil = Math.round((start.getTime() - today.getTime()) / msPerDay);
    if (daysUntil === 1) {
      const label = '🔥 พรุ่งนี้ออกเดินทาง!';
      return {
        status: 'upcoming',
        label,
        badgeText: label,
        shortLabel: 'พรุ่งนี้!',
        subLabel: `เตรียมกระเป๋าพร้อมออกเดินทาง (${totalDays} วัน)`,
        isPulse: true,
        daysUntil: 1,
        totalDays,
      };
    }
    const label = `✈️ อีก ${daysUntil} วันเดินทาง`;
    return {
      status: 'upcoming',
      label,
      badgeText: label,
      shortLabel: `อีก ${daysUntil} วัน`,
      subLabel: `ระยะเวลาทริป ${totalDays} วัน`,
      isPulse: false,
      daysUntil,
      totalDays,
    };
  }

  const label = `✅ จบทริปแล้ว (${totalDays} วัน)`;
  return {
    status: 'completed',
    label,
    badgeText: label,
    shortLabel: 'จบทริปแล้ว',
    subLabel: `บันทึกความทรงจำครบ ${totalDays} วัน`,
    isPulse: false,
    totalDays,
  };
}

export interface QuickExpensePreset {
  id: string;
  icon: string;
  emoji: string;
  label: string;
  defaultTitle: string;
  title: string;
  category: string;
  paymentMethod: PaymentMethod;
  defaultAmountJpy?: number;
  defaultAmount?: number;
}

export const QUICK_EXPENSE_PRESETS: QuickExpensePreset[] = [
  {
    id: 'konbini',
    icon: '🏪',
    emoji: '🏪',
    label: 'คอมบินิ 7-11/Lawson',
    defaultTitle: '7-Eleven / Lawson คอมบินิ',
    title: '7-Eleven / Lawson คอมบินิ',
    category: 'food',
    paymentMethod: 'travel_card',
  },
  {
    id: 'vending',
    icon: '🥤',
    emoji: '🥤',
    label: 'ตู้กดน้ำ',
    defaultTitle: 'ตู้กดน้ำอัตโนมัติ (Vending Machine)',
    title: 'ตู้กดน้ำอัตโนมัติ (Vending Machine)',
    category: 'food',
    paymentMethod: 'cash',
    defaultAmountJpy: 160,
    defaultAmount: 160,
  },
  {
    id: 'ic_transit',
    icon: '🚃',
    emoji: '🚃',
    label: 'เติมบัตร IC/รถไฟ',
    defaultTitle: 'เติมบัตร Suica / ICOCA / ค่ารถไฟ',
    title: 'เติมบัตร Suica / ICOCA / ค่ารถไฟ',
    category: 'transport',
    paymentMethod: 'cash',
    defaultAmountJpy: 1000,
    defaultAmount: 1000,
  },
  {
    id: 'ramen',
    icon: '🍜',
    emoji: '🍜',
    label: 'ราเมง/มื้ออาหาร',
    defaultTitle: 'มื้ออาหาร / ราเมง',
    title: 'มื้ออาหาร / ราเมง',
    category: 'food',
    paymentMethod: 'cash',
  },
  {
    id: 'cafe',
    icon: '☕',
    emoji: '☕',
    label: 'คาเฟ่/ขนมหวาน',
    defaultTitle: 'คาเฟ่ & ขนมหวาน',
    title: 'คาเฟ่ & ขนมหวาน',
    category: 'food',
    paymentMethod: 'travel_card',
  },
  {
    id: 'donki',
    icon: '🛍️',
    emoji: '🛍️',
    label: 'Donki/ดรักสโตร์',
    defaultTitle: 'ช้อปปิ้ง Don Quijote / Drugstore',
    title: 'ช้อปปิ้ง Don Quijote / Drugstore',
    category: 'shopping',
    paymentMethod: 'credit_card',
  },
  {
    id: 'gashapon',
    icon: '🎡',
    emoji: '🎡',
    label: 'กาชาปอง',
    defaultTitle: 'หมุนตู้กาชาปอง (Gashapon)',
    title: 'หมุนตู้กาชาปอง (Gashapon)',
    category: 'shopping',
    paymentMethod: 'cash',
    defaultAmountJpy: 400,
    defaultAmount: 400,
  },
];

export interface DualCurrencyDisplay {
  primaryAmount: number;
  primaryCurrency: string;
  primarySymbol: string;
  primaryText: string;
  secondaryAmount: number;
  secondaryCurrency: string;
  secondarySymbol: string;
  secondaryText: string;
}

export function getCurrencySymbol(currency: string): string {
  switch ((currency || 'JPY').toUpperCase()) {
    case 'THB':
      return '฿';
    case 'JPY':
    case 'CNY':
      return '¥';
    case 'USD':
    case 'SGD':
      return '$';
    case 'EUR':
      return '€';
    case 'KRW':
      return '₩';
    case 'GBP':
      return '£';
    default:
      return '';
  }
}

/**
 * Computes primary and secondary display amounts depending on active currencyView ('foreign' | 'thb')
 */
export function resolveDisplayCurrency(
  amountInBase: number,
  baseCurrency: string,
  fxRate: number,
  currencyView: 'foreign' | 'thb' = 'foreign'
): DualCurrencyDisplay {
  const safeAmount = Number(amountInBase || 0);
  const safeRate = fxRate > 0 ? fxRate : 0.235;
  const normBase = (baseCurrency || 'JPY').toUpperCase();

  if (normBase === 'THB') {
    const jpyApprox = Math.round(safeAmount / safeRate);
    const primaryAmount = Math.round(safeAmount);
    return {
      primaryAmount,
      primaryCurrency: 'THB',
      primarySymbol: '฿',
      primaryText: `฿${primaryAmount.toLocaleString()}`,
      secondaryAmount: jpyApprox,
      secondaryCurrency: 'JPY',
      secondarySymbol: '¥',
      secondaryText: `(≈ ¥${jpyApprox.toLocaleString()} JPY)`,
    };
  }

  const thbAmount = Math.round(convertToThb(safeAmount, normBase, safeRate));
  const foreignSymbol = getCurrencySymbol(normBase);
  const roundedBase = Math.round(safeAmount);

  if (currencyView === 'thb') {
    return {
      primaryAmount: thbAmount,
      primaryCurrency: 'THB',
      primarySymbol: '฿',
      primaryText: `฿${thbAmount.toLocaleString()}`,
      secondaryAmount: roundedBase,
      secondaryCurrency: normBase,
      secondarySymbol: foreignSymbol,
      secondaryText: `(≈ ${foreignSymbol}${roundedBase.toLocaleString()} ${normBase})`,
    };
  }

  return {
    primaryAmount: roundedBase,
    primaryCurrency: normBase,
    primarySymbol: foreignSymbol,
    primaryText: `${foreignSymbol}${roundedBase.toLocaleString()}`,
    secondaryAmount: thbAmount,
    secondaryCurrency: 'THB',
    secondarySymbol: '฿',
    secondaryText: `(≈ ฿${thbAmount.toLocaleString()} THB)`,
  };
}
