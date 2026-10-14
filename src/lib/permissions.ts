// src/lib/permissions.ts

export const SUPER_ADMIN_EMAILS = ['pudit2539@gmail.com'];

export type TripRole = 'owner' | 'editor' | 'viewer' | 'plan_only';

export interface UserLike {
  id?: string;
  email?: string;
  user_metadata?: any;
}

export interface ProfileLike {
  id?: string;
  email?: string;
  display_name?: string;
  is_super_admin?: boolean;
  role?: string;
}

/**
 * Returns true if the user is a Super Admin
 */
export function isSuperAdmin(user?: UserLike | null, profile?: ProfileLike | null): boolean {
  if (!user && !profile) return false;
  const userEmail = (user?.email || profile?.email || '').toLowerCase().trim();
  if (SUPER_ADMIN_EMAILS.includes(userEmail)) return true;
  if (profile?.is_super_admin === true || profile?.role === 'superadmin') return true;
  if (user?.user_metadata?.is_super_admin === true || user?.user_metadata?.role === 'superadmin') return true;
  return false;
}

/**
 * Role permissions definitions
 */
export const ROLE_INFO: Record<TripRole, { label: string; badge: string; description: string; canEdit: boolean; canSeeMoney: boolean }> = {
  owner: {
    label: 'เจ้าของทริป (Owner)',
    badge: 'Owner',
    description: 'ควบคุมได้ทั้งหมด จัดการแผน, ค่าใช้จ่าย, สมาชิก และการลบทริป',
    canEdit: true,
    canSeeMoney: true,
  },
  editor: {
    label: 'ผู้แก้ไข (Editor)',
    badge: 'Editor',
    description: 'แก้ไขและเพิ่มข้อมูลได้ทั้งแผนเที่ยวและรายการค่าใช้จ่าย',
    canEdit: true,
    canSeeMoney: true,
  },
  viewer: {
    label: 'ผู้เข้าชม (Viewer)',
    badge: 'Viewer',
    description: 'ดูได้ทั้งแผนเที่ยวและค่าใช้จ่าย/งบประมาณ แต่ไม่สามารถแก้ไขได้',
    canEdit: false,
    canSeeMoney: true,
  },
  plan_only: {
    label: 'ดูเฉพาะแผนเที่ยว (Plan Only)',
    badge: 'Plan Only',
    description: 'ดูได้เฉพาะแผนเที่ยวเท่านั้น ซ่อนแท็บค่าใช้จ่าย งบประมาณ และการเงินทั้งหมด',
    canEdit: false,
    canSeeMoney: false,
  },
};
