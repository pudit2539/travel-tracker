// src/lib/permissions.ts

export const SUPER_ADMIN_EMAILS = ['pudit2539@gmail.com'];

export type TripRole = 'owner' | 'editor' | 'contributor' | 'viewer' | 'plan_only';

export interface UserLike {
  id?: string | null;
  email?: string | null;
  user_metadata?: any;
}

export interface ProfileLike {
  id?: string | null;
  email?: string | null;
  display_name?: string | null;
  is_super_admin?: boolean | null;
  role?: string | null;
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
  contributor: {
    label: 'ผู้ร่วมทริป (Contributor)',
    badge: 'Contributor',
    description: 'ดูแผนเดินทาง และบันทึกค่าใช้จ่ายได้ (ไม่สามารถแก้ไขแผนเที่ยว)',
    canEdit: false,
    canSeeMoney: true,
  },
  viewer: {
    label: 'ผู้เข้าชม (Viewer)',
    badge: 'Viewer',
    description: 'ดูได้ทั้งแผนเที่ยวและค่าใช้จ่าย/งบประมาณ (ดูอย่างเดียว ไม่สามารถแก้ไขได้)',
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

/**
 * Whether the current user may edit/delete a specific expense.
 * Mirrors the RLS policy in supabase_rls_policies.sql:
 *  - owner / editor (and super admin): any expense in the trip
 *  - contributor: only expenses they recorded (created_by) or paid for (payer_id)
 *  - viewer / plan_only: none
 */
export function canModifyExpense(
  role: TripRole,
  isSuper: boolean,
  expense: { created_by?: string | null; payer_id?: string | null } | null | undefined,
  userId: string | null | undefined
): boolean {
  if (isSuper || role === 'owner' || role === 'editor') return true;
  if (role !== 'contributor' || !expense || !userId) return false;
  return expense.created_by === userId || expense.payer_id === userId;
}
