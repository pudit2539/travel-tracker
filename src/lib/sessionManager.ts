// src/lib/sessionManager.ts
import { supabase } from '@/lib/supabase';

export interface DeviceSession {
  id?: string;
  device_id: string;
  device_name: string;
  browser: string;
  os: string;
  device_type: 'mobile' | 'tablet' | 'desktop';
  last_active_at: string;
  is_current?: boolean;
}

const STORAGE_KEYS = {
  DEVICE_ID: 'travel_tracker_device_id',
  REMEMBER_ME: 'travel_tracker_remember_me',
  SESSION_EXPIRY: 'travel_tracker_session_expiry',
  LAST_ACTIVE: 'travel_tracker_last_active',
};

// 7 days in milliseconds
export const REMEMBER_ME_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
// 1 day for non-remembered sessions
export const SHORT_SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * Gets or creates a unique persistent ID for this browser/device
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    let id = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      localStorage.setItem(STORAGE_KEYS.DEVICE_ID, id);
    }
    return id;
  } catch {
    return 'fallback_device';
  }
}

/**
 * Detects current device OS, browser, and friendly name
 */
export function getDeviceInfo(): { name: string; browser: string; os: string; type: 'mobile' | 'tablet' | 'desktop' } {
  if (typeof window === 'undefined') {
    return { name: 'Server', browser: 'Unknown', os: 'Unknown', type: 'desktop' };
  }

  const ua = navigator.userAgent || '';
  let os = 'Unknown OS';
  let type: 'mobile' | 'tablet' | 'desktop' = 'desktop';

  // Detect OS & Type
  if (/iPad|Tablet/i.test(ua)) {
    os = 'iPadOS / Tablet';
    type = 'tablet';
  } else if (/iPhone/i.test(ua)) {
    os = 'iOS (iPhone)';
    type = 'mobile';
  } else if (/Android/i.test(ua)) {
    type = /Mobile/i.test(ua) ? 'mobile' : 'tablet';
    os = 'Android';
  } else if (/Windows/i.test(ua)) {
    os = 'Windows PC';
    type = 'desktop';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'macOS';
    type = 'desktop';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
    type = 'desktop';
  }

  // Detect Browser
  let browser = 'Browser';
  if (/Edg\//i.test(ua)) {
    browser = 'Microsoft Edge';
  } else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) {
    browser = 'Google Chrome';
  } else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) {
    browser = 'Apple Safari';
  } else if (/Firefox\//i.test(ua)) {
    browser = 'Mozilla Firefox';
  } else if (/Opera|OPR\//i.test(ua)) {
    browser = 'Opera';
  }

  const name = `${os} (${browser})`;
  return { name, browser, os, type };
}

/**
 * Sets session persistence options upon login
 */
export function setRememberMePreference(rememberMe: boolean) {
  if (typeof window === 'undefined') return;
  try {
    const duration = rememberMe ? REMEMBER_ME_DURATION_MS : SHORT_SESSION_DURATION_MS;
    const expiry = Date.now() + duration;
    localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, rememberMe ? 'true' : 'false');
    localStorage.setItem(STORAGE_KEYS.SESSION_EXPIRY, expiry.toString());
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, Date.now().toString());
  } catch (e) {
    console.error('Failed to set remember me', e);
  }
}

/**
 * Checks if the session has exceeded the 1-week or 1-day timeout window.
 * Slides the expiration window forward if active.
 */
export function checkAndTouchSession(): { isExpired: boolean; remainingDays: number } {
  if (typeof window === 'undefined') return { isExpired: false, remainingDays: 7 };

  try {
    const rememberMe = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true';
    const expiryStr = localStorage.getItem(STORAGE_KEYS.SESSION_EXPIRY);

    // If no expiry was set yet (existing user), default to 7 days
    if (!expiryStr) {
      setRememberMePreference(true);
      return { isExpired: false, remainingDays: 7 };
    }

    const expiryTime = parseInt(expiryStr, 10);
    const now = Date.now();

    if (now > expiryTime) {
      return { isExpired: true, remainingDays: 0 };
    }

    // Sliding window: If user is actively using the app, renew their active window
    const duration = rememberMe ? REMEMBER_ME_DURATION_MS : SHORT_SESSION_DURATION_MS;
    localStorage.setItem(STORAGE_KEYS.SESSION_EXPIRY, (now + duration).toString());
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, now.toString());

    const remainingMs = (now + duration) - now;
    const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
    return { isExpired: false, remainingDays };
  } catch {
    return { isExpired: false, remainingDays: 7 };
  }
}

/**
 * Register or update the current device in Supabase `user_devices`
 */
export async function trackCurrentDevice(userId: string): Promise<void> {
  if (typeof window === 'undefined' || !userId) return;

  const deviceId = getDeviceId();
  const info = getDeviceInfo();

  try {
    const { error } = await supabase.from('user_devices').upsert(
      {
        user_id: userId,
        device_id: deviceId,
        device_name: info.name,
        browser: info.browser,
        os: info.os,
        device_type: info.type,
        last_active_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,device_id' }
    );

    if (error && error.code !== '42P01') { // 42P01 = table doesn't exist yet
      console.warn('Device tracking notice:', error.message);
    }
  } catch (err) {
    // Graceful fallback if table not yet run in Supabase SQL editor
    console.debug('Device tracking fallback:', err);
  }
}

/**
 * Fetch all registered active devices for the current user
 */
export async function fetchUserDevices(userId: string): Promise<DeviceSession[]> {
  const currentDevId = getDeviceId();
  const currentInfo = getDeviceInfo();

  const fallbackDevice: DeviceSession = {
    device_id: currentDevId,
    device_name: currentInfo.name,
    browser: currentInfo.browser,
    os: currentInfo.os,
    device_type: currentInfo.type,
    last_active_at: new Date().toISOString(),
    is_current: true,
  };

  if (!userId) return [fallbackDevice];

  try {
    const { data, error } = await supabase
      .from('user_devices')
      .select('*')
      .eq('user_id', userId)
      .order('last_active_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return [fallbackDevice];
    }

    return data.map((d: any) => ({
      ...d,
      is_current: d.device_id === currentDevId,
    }));
  } catch {
    return [fallbackDevice];
  }
}

/**
 * Remove an active device from user's active device list
 */
export async function removeUserDevice(userId: string, deviceId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_devices')
      .delete()
      .eq('user_id', userId)
      .eq('device_id', deviceId);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Sign out all other devices
 */
export async function signOutOtherDevices(userId: string): Promise<boolean> {
  const currentDevId = getDeviceId();
  try {
    // 1. Delete all other devices from DB
    await supabase
      .from('user_devices')
      .delete()
      .eq('user_id', userId)
      .neq('device_id', currentDevId);

    // 2. Supabase auth signout others if supported
    try {
      await (supabase.auth as any).signOut({ scope: 'others' });
    } catch {}

    return true;
  } catch {
    return false;
  }
}

/**
 * Safe session retriever:
 * Automatically validates session timeout (1 week rule), attempts refresh if token is expiring,
 * and prevents premature kicking of users to the login screen.
 */
export async function getSafeSession() {
  const { isExpired } = checkAndTouchSession();
  if (isExpired) {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem(STORAGE_KEYS.SESSION_EXPIRY);
    } catch {}
    return { session: null, reason: 'timeout_exceeded' };
  }

  // 1. First attempt to get active session
  let { data: { session }, error } = await supabase.auth.getSession();

  // 2. If no session or error, try refreshing
  if (!session) {
    try {
      const { data: refreshData } = await supabase.auth.refreshSession();
      session = refreshData?.session || null;
    } catch {
      // Keep session as null
    }
  }

  return { session, error };
}
