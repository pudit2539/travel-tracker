// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import NotificationBell from '@/components/NotificationBell';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('NotificationBell Component', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    localStorage.clear();
  });

  afterEach(() => {
    if (root && container) {
      act(() => {
        root!.unmount();
      });
      container.remove();
    }
    container = null;
    root = null;
  });

  const currentUser = { id: 'usr_me', email: 'me@example.com' };
  const userDisplayName = 'Pudit (ฉัน)';

  it('filters out expenses recorded/paid by current user and only alerts on other members', async () => {
    const expenses = [
      {
        id: 'exp_1',
        title: 'Ramen',
        amount: 1000,
        currency: 'JPY',
        payer_id: 'usr_me',
        payer_name: 'Pudit (ฉัน)',
      },
      {
        id: 'exp_2',
        title: 'Takoyaki',
        amount: 800,
        currency: 'JPY',
        payer_id: 'usr_friend',
        payer_name: 'Friend A',
      },
    ];

    await act(async () => {
      root!.render(
        <NotificationBell 
          expenses={expenses}
          currentUser={currentUser}
          userDisplayName={userDisplayName}
          tripTitle="Osaka 2026"
        />
      );
    });

    // Open drawer
    const bellBtn = container!.querySelector('button[title*="การแจ้งเตือน"]') as HTMLButtonElement;
    expect(bellBtn).toBeTruthy();

    await act(async () => {
      bellBtn.click();
    });

    const html = container!.innerHTML;
    // Should NOT contain Raman (self-action)
    expect(html).not.toContain('Ramen');
    // SHOULD contain Takoyaki (from Friend A)
    expect(html).toContain('Takoyaki');
    expect(html).toContain('Friend A');
  });

  it('does not generate unsolicited nagging weather or settlement recommendations', async () => {
    const expenses = [
      { id: '1', title: 'Coffee', amount: 500, payer_id: 'usr_me' },
      { id: '2', title: 'Donut', amount: 300, payer_id: 'usr_me' },
    ];

    await act(async () => {
      root!.render(
        <NotificationBell 
          expenses={expenses}
          currentUser={currentUser}
          userDisplayName={userDisplayName}
          tripTitle="Osaka 2026"
        />
      );
    });

    const bellBtn = container!.querySelector('button[title*="การแจ้งเตือน"]') as HTMLButtonElement;
    await act(async () => {
      bellBtn.click();
    });

    const html = container!.innerHTML;
    expect(html).not.toContain('พยากรณ์อากาศ');
    expect(html).not.toContain('ระบบเคลียร์บิลพร้อมคำนวณ');
    expect(html).toContain('ไม่มีการแจ้งเตือนใหม่');
  });

  it('filters out current user joining trip and only notifies on other members', async () => {
    const members = [
      {
        user_id: 'usr_me',
        role: 'owner',
        profiles: { display_name: 'Pudit (ฉัน)' },
      },
      {
        user_id: 'usr_friend_2',
        role: 'editor',
        profiles: { display_name: 'Alice' },
      },
    ];

    await act(async () => {
      root!.render(
        <NotificationBell 
          members={members}
          currentUser={currentUser}
          userDisplayName={userDisplayName}
          tripTitle="Osaka 2026"
        />
      );
    });

    const bellBtn = container!.querySelector('button[title*="การแจ้งเตือน"]') as HTMLButtonElement;
    await act(async () => {
      bellBtn.click();
    });

    const html = container!.innerHTML;
    expect(html).not.toContain('Pudit (ฉัน) เข้าร่วมทริป');
    expect(html).toContain('Alice เข้าร่วมทริปแล้ว');
  });
});
