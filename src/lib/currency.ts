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
  THB: 0.235,   // 1 JPY = ~0.235 THB  (100 JPY ≈ 23.5 THB)
  CNY: 0.048,   // 1 JPY = ~0.048 CNY  (1 CNY ≈ 4.9 THB)
  USD: 0.0066,  // 1 JPY = ~0.0066 USD
  EUR: 0.0061,
  KRW: 9.12,
  SGD: 0.0089,
};

const STORAGE_KEY = 'travel_tracker_custom_fx_rate';

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
