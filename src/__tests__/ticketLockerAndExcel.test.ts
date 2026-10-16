import { describe, it, expect } from 'vitest';
import { buildExpensesWorkbook } from '../lib/exportExpensesExcel';
import { calculateSettlement } from '../lib/settlement';
import { VaultPassItem } from '../components/TicketPassLockerModal';

describe('Pass & Ticket Locker with VJW / K-ETA / Train / Flight', () => {
  it('creates valid pass items with attached QR/Ticket image data', () => {
    const vjwPass: VaultPassItem = {
      id: 'pass_vjw_1',
      title: 'Visit Japan Web (Immigration & Customs QR)',
      category: 'vjw',
      bookingRef: 'VJW-JP-ENTRY',
      qrCodeUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...',
      note: 'สแกนที่ ตม. และศุลกากรคันไซ',
      validDate: '10 ธ.ค. 2026',
      createdAt: Date.now(),
    };

    const ketaPass: VaultPassItem = {
      id: 'pass_keta_1',
      title: 'K-ETA Approval Notice',
      category: 'keta',
      bookingRef: 'KETA-2026-KR',
      qrCodeUrl: 'data:image/jpeg;base64,sampleKetaQrData',
      validDate: 'ใช้ได้ 3 ปี',
      createdAt: Date.now(),
    };

    expect(vjwPass.category).toBe('vjw');
    expect(vjwPass.qrCodeUrl).toContain('data:image/jpeg');
    expect(ketaPass.category).toBe('keta');
    expect(ketaPass.bookingRef).toBe('KETA-2026-KR');
  });
});

describe('Export Expenses to Excel (.xlsx)', () => {
  it('generates a 4-sheet workbook with expenses, settlement, member breakdown, and categories', () => {
    const mockExpenses = [
      {
        id: 'exp_1',
        title: 'Nankai Rapi:t Ticket',
        amount: 2860,
        currency: 'JPY',
        category: 'transport',
        payer_name: 'Pudit',
        payer_id: 'user_1',
        payment_method: 'credit_card',
        spent_at: '2026-10-10T10:00:00Z',
      },
      {
        id: 'exp_2',
        title: 'Ichiran Ramen Dotonbori',
        amount: 3200,
        currency: 'JPY',
        category: 'food',
        payer_name: 'Friend',
        payer_id: 'user_2',
        payment_method: 'cash',
        spent_at: '2026-10-10T12:30:00Z',
      },
    ];

    const mockMembers = [
      { id: 'user_1', name: 'Pudit', avatar: 'cat_orange' },
      { id: 'user_2', name: 'Friend', avatar: 'cat_pink' },
    ];

    const settlement = calculateSettlement(mockExpenses, mockMembers, 'JPY', 0.235);

    const { wb, fileName } = buildExpensesWorkbook({
      tripName: 'Osaka Autumn Trip 2026',
      expenses: mockExpenses,
      membersList: mockMembers,
      settlementSummary: settlement,
      tripCurrency: 'JPY',
      fxRate: 0.235,
      categoryNames: { transport: 'การเดินทาง', food: 'อาหารและเครื่องดื่ม' },
    });

    expect(wb.SheetNames).toContain('รายการค่าใช้จ่าย');
    expect(wb.SheetNames).toContain('แผนเคลียร์หนี้');
    expect(wb.SheetNames).toContain('สรุปรายบุคคล');
    expect(wb.SheetNames).toContain('สรุปตามหมวดหมู่');
    expect(fileName).toContain('Osaka Autumn Trip 2026');
  });
});
