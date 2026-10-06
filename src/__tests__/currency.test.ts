import { describe, it, expect, beforeEach } from 'vitest';
import { 
  convertCurrency, 
  convertToThb, 
  formatCurrencyWithThb, 
  formatExchangeRateDisplay,
  setCustomJpyToThbRate,
  getCustomJpyToThbRate
} from '../lib/currency';

describe('Currency Conversion & Formatting', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns the same amount when from and to currencies are identical', () => {
    expect(convertCurrency(5000, 'JPY', 'JPY')).toBe(5000);
    expect(convertCurrency(1200, 'THB', 'THB')).toBe(1200);
    expect(convertCurrency(0, 'USD', 'USD')).toBe(0);
  });

  it('converts JPY to THB with default rate (0.210)', () => {
    // 10,000 JPY * 0.210 = 2,100 THB
    const converted = convertCurrency(10000, 'JPY', 'THB');
    expect(converted).toBeCloseTo(2100, 2);
  });

  it('converts THB to JPY with default rate (0.210)', () => {
    // 2,100 THB / 0.210 = 10,000 JPY
    const converted = convertCurrency(2100, 'THB', 'JPY');
    expect(converted).toBeCloseTo(10000, 1);
  });

  it('supports custom FX rate overrides', () => {
    // Custom rate: 1 JPY = 0.235 THB
    const customRate = 0.235;
    const thb = convertCurrency(10000, 'JPY', 'THB', customRate);
    expect(thb).toBe(2350);

    const jpy = convertCurrency(2350, 'THB', 'JPY', customRate);
    expect(jpy).toBe(10000);
  });

  it('persists and retrieves custom JPY to THB rate from localStorage', () => {
    setCustomJpyToThbRate(0.245);
    expect(getCustomJpyToThbRate()).toBe(0.245);
  });

  it('formats display strings accurately with secondary currency previews', () => {
    // 10000 JPY at 0.210 => 10,000 JPY (≈ ฿2,100)
    const formattedJpy = formatCurrencyWithThb(10000, 'JPY', 0.210);
    expect(formattedJpy).toContain('10,000 JPY');
    expect(formattedJpy).toContain('฿2,100');

    // 2100 THB at 0.210 => 2,100 THB (≈ ¥10,000)
    const formattedThb = formatCurrencyWithThb(2100, 'THB', 0.210);
    expect(formattedThb).toContain('2,100 THB');
    expect(formattedThb).toContain('¥10,000');
  });

  it('formats exchange rate display string with 3 decimal places', () => {
    expect(formatExchangeRateDisplay('JPY', 0.215)).toBe('1 JPY = 0.215 THB');
  });
});
