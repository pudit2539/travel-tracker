import { describe, it, expect } from 'vitest';
import { calculateSettlement } from '../lib/settlement';

describe('Settlement Calculation & Fair Share', () => {
  const members = [
    { id: 'u1', name: 'Alice (ฉัน)', avatar: 'cat_orange' },
    { id: 'u2', name: 'Bob', avatar: 'cat_black' },
    { id: 'u3', name: 'Charlie', avatar: 'cat_calico' },
  ];

  it('handles empty members and empty expenses gracefully', () => {
    const res = calculateSettlement([], []);
    expect(res.totalSpent).toBe(0);
    expect(res.memberCount).toBe(0);
    expect(res.balances).toEqual([]);
    expect(res.transfers).toEqual([]);
  });

  it('calculates equal splits correctly when one person pays for all', () => {
    const expenses = [
      {
        id: 'exp1',
        title: 'Shinkansen Tickets',
        amount: 30000,
        currency: 'JPY',
        payer_id: 'u1',
        payer_name: 'Alice',
      },
    ];

    const result = calculateSettlement(expenses, members, 'JPY');

    expect(result.totalSpent).toBe(30000);
    expect(result.averagePerPerson).toBe(10000);
    expect(result.memberCount).toBe(3);

    // Alice paid 30,000, fair share is 10,000 => netBalance +20,000
    // Bob paid 0, fair share is 10,000 => netBalance -10,000
    // Charlie paid 0, fair share is 10,000 => netBalance -10,000
    const aliceBalance = result.balances.find((b) => b.name === 'Alice');
    const bobBalance = result.balances.find((b) => b.name === 'Bob');
    const charlieBalance = result.balances.find((b) => b.name === 'Charlie');

    expect(aliceBalance?.totalPaid).toBe(30000);
    expect(aliceBalance?.fairShare).toBe(10000);
    expect(aliceBalance?.netBalance).toBe(20000);

    expect(bobBalance?.totalPaid).toBe(0);
    expect(bobBalance?.fairShare).toBe(10000);
    expect(bobBalance?.netBalance).toBe(-10000);

    expect(charlieBalance?.totalPaid).toBe(0);
    expect(charlieBalance?.fairShare).toBe(10000);
    expect(charlieBalance?.netBalance).toBe(-10000);

    // Transfers: Bob -> Alice 10,000, Charlie -> Alice 10,000
    expect(result.transfers).toHaveLength(2);
    const totalTransferred = result.transfers.reduce((sum, t) => sum + t.amount, 0);
    expect(totalTransferred).toBe(20000);
    result.transfers.forEach((t) => {
      expect(t.to).toBe('Alice');
      expect(t.amount).toBe(10000);
    });
  });

  it('satisfies the zero-sum invariant across multi-person expenses', () => {
    const expenses = [
      { id: 'e1', amount: 15000, currency: 'JPY', payer_id: 'u1', payer_name: 'Alice' },
      { id: 'e2', amount: 6000, currency: 'JPY', payer_id: 'u2', payer_name: 'Bob' },
      { id: 'e3', amount: 9000, currency: 'JPY', payer_id: 'u3', payer_name: 'Charlie' },
    ];

    const result = calculateSettlement(expenses, members, 'JPY');
    expect(result.totalSpent).toBe(30000);

    // Sum of net balances must be approximately 0
    const netSum = result.balances.reduce((acc, b) => acc + b.netBalance, 0);
    expect(Math.abs(netSum)).toBeLessThan(0.01);
  });

  it('handles custom itemized splits where only specific members share the expense', () => {
    const expenses = [
      { id: 'e1', amount: 10000, currency: 'JPY', payer_id: 'u1', payer_name: 'Alice' },
    ];

    // Only Alice and Bob share exp1 (Charlie excluded)
    const expenseSplitsMap = {
      e1: ['u1', 'u2'],
    };

    const result = calculateSettlement(expenses, members, 'JPY', undefined, expenseSplitsMap);

    const alice = result.balances.find((b) => b.name === 'Alice');
    const bob = result.balances.find((b) => b.name === 'Bob');
    const charlie = result.balances.find((b) => b.name === 'Charlie');

    expect(alice?.fairShare).toBe(5000);
    expect(bob?.fairShare).toBe(5000);
    expect(charlie?.fairShare).toBe(0);

    // Only Bob pays Alice 5000
    expect(result.transfers).toHaveLength(1);
    expect(result.transfers[0].from).toBe('Bob');
    expect(result.transfers[0].to).toBe('Alice');
    expect(result.transfers[0].amount).toBe(5000);
  });

  it('normalizes multi-currency expenses into base trip currency', () => {
    const expenses = [
      // 1000 THB paid in THB, with 1 JPY = 0.25 THB (so 1000 THB = 4000 JPY)
      { id: 'e1', amount: 1000, currency: 'THB', payer_id: 'u1', payer_name: 'Alice' },
    ];

    const result = calculateSettlement(expenses, members, 'JPY', 0.25);
    expect(result.totalSpent).toBe(4000);
    expect(result.averagePerPerson).toBe(1333);
  });
});
