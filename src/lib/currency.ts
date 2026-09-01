// src/lib/currency.ts

export interface ExchangeRates {
  base: string;
  rates: { [key: string]: number };
  lastUpdated: string;
}

const DEFAULT_RATES: { [key: string]: number } = {
  JPY: 1,
  THB: 0.235, // 1 JPY = ~0.235 THB (100 JPY = 23.5 THB)
  USD: 0.0066,
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

export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  customJpyThbRate?: number
): number {
  if (fromCurrency === toCurrency) return amount;

  const jpyThb = customJpyThbRate || getCustomJpyToThbRate();

  // JPY to THB
  if (fromCurrency === 'JPY' && toCurrency === 'THB') {
    return amount * jpyThb;
  }
  // THB to JPY
  if (fromCurrency === 'THB' && toCurrency === 'JPY') {
    return amount / jpyThb;
  }

  // Fallback direct conversion with default rate
  const fromRate = DEFAULT_RATES[fromCurrency] || 1;
  const toRate = DEFAULT_RATES[toCurrency] || 1;
  return (amount / fromRate) * toRate;
}

export function formatCurrencyWithThb(
  amount: number,
  currency: string = 'JPY',
  customRate?: number
): string {
  const formattedMain = `${Number(amount).toLocaleString()} ${currency}`;
  if (currency === 'JPY') {
    const thb = convertCurrency(amount, 'JPY', 'THB', customRate);
    return `${formattedMain} (≈ ฿${Math.round(thb).toLocaleString()})`;
  }
  if (currency === 'THB') {
    const jpy = convertCurrency(amount, 'THB', 'JPY', customRate);
    return `${formattedMain} (≈ ¥${Math.round(jpy).toLocaleString()})`;
  }
  return formattedMain;
}
