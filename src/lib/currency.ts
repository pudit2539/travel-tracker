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
 * Convert any amount from a given currency to THB.
 * Uses JPY as the pivot currency (all DEFAULT_RATES are relative to JPY).
 *
 * @param amount       - the amount to convert
 * @param fromCurrency - the source currency (e.g. 'JPY', 'THB', 'CNY', 'USD')
 * @param jpyThbRate   - custom JPY→THB rate from user settings (optional, uses stored rate if omitted)
 */
export function convertToThb(
  amount: number,
  fromCurrency: string,
  jpyThbRate?: number
): number {
  const currency = (fromCurrency || 'JPY').toUpperCase();

  // THB → THB: no conversion
  if (currency === 'THB') return amount;

  const jpyThb = jpyThbRate ?? getCustomJpyToThbRate();

  // JPY → THB directly
  if (currency === 'JPY') return amount * jpyThb;

  // Other currencies: convert to JPY first, then to THB
  // rate = how many <currency> per 1 JPY
  const ratePerJpy = DEFAULT_RATES[currency];
  if (!ratePerJpy || ratePerJpy === 0) return amount * jpyThb; // fallback: treat as JPY

  const amountInJpy = amount / ratePerJpy;
  return amountInJpy * jpyThb;
}

/** @deprecated Use convertToThb() for any-to-THB conversion */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  customJpyThbRate?: number
): number {
  if (fromCurrency === toCurrency) return amount;

  const jpyThb = customJpyThbRate || getCustomJpyToThbRate();

  if (fromCurrency === 'JPY' && toCurrency === 'THB') return amount * jpyThb;
  if (fromCurrency === 'THB' && toCurrency === 'JPY') return amount / jpyThb;

  // Generic pivot via JPY
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
  const thb = convertToThb(amount, currency, customRate);

  if (currency === 'THB') {
    // Show JPY equivalent
    const jpyThb = customRate ?? getCustomJpyToThbRate();
    const jpy = jpyThb > 0 ? Math.round(amount / jpyThb) : 0;
    return `${formattedMain} (≈ ¥${jpy.toLocaleString()})`;
  }

  return `${formattedMain} (≈ ฿${Math.round(thb).toLocaleString()})`;
}
