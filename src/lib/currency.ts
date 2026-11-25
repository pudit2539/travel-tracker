// src/lib/currency.ts

export interface ExchangeRates {
  base: string;
  rates: { [key: string]: number };
  lastUpdated: string;
}

/**
 * All rates are: 1 JPY = X <currency>
 * So to convert amount in currency → THB:
 *   amountInJPY = amount / rates[currency]
 *   amountInTHB = amountInJPY * rates['THB']
 *
 * Special case: if currency === 'THB', just return amount (no conversion needed).
 */
const DEFAULT_RATES: { [key: string]: number } = {
  JPY: 1,
  THB: 0.210,   // 1 JPY = 0.210 THB (JPY/THB = 0.210)
  CNY: 0.048,   // 1 JPY = ~0.048 CNY
  USD: 0.0066,  // 1 JPY = ~0.0066 USD
  EUR: 0.0061,
  KRW: 9.12,
  SGD: 0.0089,
  GBP: 0.0052,
};

const STORAGE_KEY = 'travel_tracker_custom_fx_rate';
const LOCK_STORAGE_KEY = 'travel_tracker_fx_rate_locked';
const LAST_SYNC_STORAGE_KEY = 'travel_tracker_fx_last_synced';

export interface JapanTaxFreeResult {
  grossAmount: number;
  netAmount10: number;
  savedTax10: number;
  netAmount8: number;
  savedTax8: number;
  isEligible: boolean;
  shortfallJpy: number;
}

/**
 * Computes Japan Tax-Free net amounts & eligibility (standard threshold: ¥5,500 tax-included / ¥5,000 pre-tax).
 */
export function calculateJapanTaxFree(amountJpy: number): JapanTaxFreeResult {
  const gross = Math.max(0, Math.round(Number(amountJpy) || 0));
  const netAmount10 = Math.round(gross / 1.1);
  const netAmount8 = Math.round(gross / 1.08);
  const isEligible = gross >= 5500;
  return {
    grossAmount: gross,
    netAmount10,
    savedTax10: Math.max(0, gross - netAmount10),
    netAmount8,
    savedTax8: Math.max(0, gross - netAmount8),
    isEligible,
    shortfallJpy: isEligible ? 0 : Math.max(0, 5500 - gross),
  };
}

export function isFxRateLocked(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(LOCK_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setFxRateLocked(locked: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCK_STORAGE_KEY, locked ? '1' : '0');
    window.dispatchEvent(new Event('travel_tracker_fx_rate_updated'));
  } catch {}
}

export function getLastFxSyncLabel(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(LAST_SYNC_STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function fetchLiveExchangeRates(): Promise<{ [key: string]: number }> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/JPY', {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error('Failed to fetch rates');
    const data = await res.json();
    if (data && data.rates) {
      return data.rates;
    }
  } catch (err) {
    console.warn('Using fallback exchange rates:', err);
  }
  return DEFAULT_RATES;
}

export function getCustomJpyToThbRate(): number {
  if (typeof window === 'undefined') return DEFAULT_RATES.THB;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = parseFloat(saved);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_RATES.THB;
}

export function setCustomJpyToThbRate(rate: number): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, String(rate));
  }
}

/**
 * Fetch latest live JPY/THB rate from real-time market APIs (Frankfurter ECB primary + Open ER fallback),
 * respecting manual rate lock unless `options.force` is true.
 */
export async function syncLiveJpyToThb(options?: {
  force?: boolean;
}): Promise<{ rate: number; success: boolean; locked?: boolean; date?: string; source?: string }> {
  if (!options?.force && isFxRateLocked()) {
    return { rate: getCustomJpyToThbRate(), success: false, locked: true };
  }

  // 1. Primary: Frankfurter API (free, no key, fast CORS)
  try {
    const res = await fetch('https://api.frankfurter.dev/v1/latest?base=JPY&symbols=THB', {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      const rawThb = Number(data?.rates?.THB);
      if (!isNaN(rawThb) && rawThb > 0) {
        const liveRate = parseFloat(rawThb.toFixed(4));
        setCustomJpyToThbRate(liveRate);
        const dateStr = data?.date || new Date().toLocaleDateString('th-TH');
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(LAST_SYNC_STORAGE_KEY, dateStr);
          } catch {}
          window.dispatchEvent(new Event('travel_tracker_fx_rate_updated'));
        }
        return { rate: liveRate, success: true, date: dateStr, source: 'frankfurter' };
      }
    }
  } catch {
    // Fall through to secondary provider
  }

  // 2. Fallback: Open Exchange Rates API
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/JPY', {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error('Live FX API error');
    const data = await res.json();
    if (data && data.rates && data.rates.THB) {
      const liveRate = parseFloat(Number(data.rates.THB).toFixed(4));
      setCustomJpyToThbRate(liveRate);
      const dateStr = data.time_last_update_utc
        ? new Date(data.time_last_update_utc).toLocaleDateString('th-TH')
        : new Date().toLocaleDateString('th-TH');
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(LAST_SYNC_STORAGE_KEY, dateStr);
        } catch {}
        window.dispatchEvent(new Event('travel_tracker_fx_rate_updated'));
      }
      return {
        rate: liveRate,
        success: true,
        date: dateStr,
        source: 'open-er',
      };
    }
  } catch (err) {
    console.warn('Sync live JPY rate failed:', err);
  }
  return { rate: getCustomJpyToThbRate(), success: false };
}

/**
 * Convert any amount from one currency to another.
 * Uses JPY as the internal pivot currency.
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  customJpyThbRate?: number
): number {
  const from = (fromCurrency || 'JPY').toUpperCase();
  const to = (toCurrency || 'JPY').toUpperCase();
  if (from === to || !amount) return amount;

  const jpyThb = customJpyThbRate ?? getCustomJpyToThbRate();

  // 1. Convert source amount into JPY (pivot)
  let amountInJpy = amount;
  if (from === 'JPY') {
    amountInJpy = amount;
  } else if (from === 'THB') {
    amountInJpy = jpyThb > 0 ? amount / jpyThb : amount;
  } else {
    const ratePerJpy = DEFAULT_RATES[from];
    amountInJpy = (ratePerJpy && ratePerJpy > 0) ? amount / ratePerJpy : amount;
  }

  // 2. Convert JPY into target currency
  if (to === 'JPY') {
    return amountInJpy;
  } else if (to === 'THB') {
    return amountInJpy * jpyThb;
  } else {
    const ratePerJpy = DEFAULT_RATES[to];
    return (ratePerJpy && ratePerJpy > 0) ? amountInJpy * ratePerJpy : amountInJpy;
  }
}

/**
 * Convert any amount from a given currency directly to THB.
 */
export function convertToThb(
  amount: number,
  fromCurrency: string,
  jpyThbRate?: number
): number {
  return convertCurrency(amount, fromCurrency, 'THB', jpyThbRate);
}

export function formatCurrencyWithThb(
  amount: number,
  currency: string = 'JPY',
  customRate?: number
): string {
  const formattedMain = `${Number(amount).toLocaleString()} ${currency}`;
  const thb = convertToThb(amount, currency, customRate);

  if (currency === 'THB') {
    // Show JPY equivalent
    const jpyThb = customRate ?? getCustomJpyToThbRate();
    const jpy = jpyThb > 0 ? Math.round(amount / jpyThb) : 0;
    return `${formattedMain} (≈ ¥${jpy.toLocaleString()})`;
  }

  return `${formattedMain} (≈ ฿${Math.round(thb).toLocaleString()})`;
}

/**
 * Format exchange rate stringเทียบเป็น 1 หน่วย (เช่น 1 JPY = 0.210 THB)
 */
export function formatExchangeRateDisplay(
  currency: string = 'JPY',
  customRate?: number
): string {
  const rate = customRate ?? getCustomJpyToThbRate();
  const cur = (currency || 'JPY').toUpperCase();
  if (cur === 'JPY' || cur === 'THB') {
    return `1 JPY = ${rate.toFixed(3)} THB`;
  }
  const perThb = convertCurrency(1, cur, 'THB', rate);
  return `1 ${cur} = ${perThb.toFixed(3)} THB`;
}
