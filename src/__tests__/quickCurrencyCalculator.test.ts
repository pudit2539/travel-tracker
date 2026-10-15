import { describe, it, expect } from 'vitest';
import { convertCurrency } from '@/lib/currency';

describe('Tax-Free & Quick Shopping Calculations', () => {
  it('correctly calculates 10% tax-free net price from total price with tax', () => {
    const priceWithTax = 11000;
    const netTaxFreePrice = Math.round(priceWithTax / 1.1);
    expect(netTaxFreePrice).toBe(10000);
    expect(priceWithTax - netTaxFreePrice).toBe(1000);
  });

  it('correctly calculates 8% tax-free net price for food and confectionery', () => {
    const foodPriceWithTax = 10800;
    const netTaxFreePrice = Math.round(foodPriceWithTax / 1.08);
    expect(netTaxFreePrice).toBe(10000);
    expect(foodPriceWithTax - netTaxFreePrice).toBe(800);
  });

  it('accurately converts tax-free JPY to THB with fxRate 0.210', () => {
    const netJpy = 10000;
    const fxRate = 0.210;
    const thb = convertCurrency(netJpy, 'JPY', 'THB', fxRate);
    expect(thb).toBe(2100);
  });

  it('calculates tax savings in THB correctly', () => {
    const priceWithTax = 55000; // e.g. Nintendo Switch or camera lens
    const netPrice = Math.round(priceWithTax / 1.1); // 50,000 JPY
    const savedJpy = priceWithTax - netPrice; // 5,000 JPY
    const fxRate = 0.210;
    const savedThb = savedJpy * fxRate;
    expect(savedJpy).toBe(5000);
    expect(savedThb).toBe(1050);
  });
});
