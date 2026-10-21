-- ====================================================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES FOR TRAVEL TRACKER
-- รันสคริปต์นี้ใน Supabase Dashboard -> SQL Editor
-- เพื่อแยกสิทธิ์ความปลอดภัยในระดับฐานข้อมูล (Postgres Database Level)
-- ====================================================================

-- 1. ตาราง trips: เปิดใช้งาน RLS
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- นโยบาย: ผู้ใช้สามารถดู (SELECT) ทริปได้เฉพาะทริปที่ตนสร้าง หรือทริปที่เป็นสมาชิก
DROP POLICY IF EXISTS "Users can view their own or member trips" ON public.trips;
CREATE POLICY "Users can view their own or member trips"
ON public.trips
FOR SELECT
TO authenticated
USING (
  auth.uid() = created_by
  OR EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE public.trip_members.trip_id = public.trips.id
      AND public.trip_members.user_id = auth.uid()
  )
);

-- นโยบาย: ผู้ใช้สามารถสร้าง (INSERT) ทริปได้
DROP POLICY IF EXISTS "Users can insert trips" ON public.trips;
CREATE POLICY "Users can insert trips"
ON public.trips
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
);

-- นโยบาย: เจ้าของหรือ Editor สามารถแก้ไข (UPDATE) ข้อมูลทริปได้
DROP POLICY IF EXISTS "Owners and editors can update trips" ON public.trips;
CREATE POLICY "Owners and editors can update trips"
ON public.trips
FOR UPDATE
TO authenticated
USING (
  auth.uid() = created_by
  OR EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE public.trip_members.trip_id = public.trips.id
      AND public.trip_members.user_id = auth.uid()
      AND public.trip_members.role IN ('owner', 'editor')
  )
);

-- นโยบาย: เฉพาะเจ้าของทริป (Owner) เท่านั้นที่สามารถลบ (DELETE) ทริปได้
DROP POLICY IF EXISTS "Only trip owner can delete trip" ON public.trips;
CREATE POLICY "Only trip owner can delete trip"
ON public.trips
FOR DELETE
TO authenticated
USING (
  auth.uid() = created_by
);


-- 2. ตาราง trip_members: เปิดใช้งาน RLS
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;

-- นโยบาย: สมาชิกในทริปสามารถดูรายชื่อเพื่อนร่วมทริปได้
DROP POLICY IF EXISTS "Members can view trip members" ON public.trip_members;
CREATE POLICY "Members can view trip members"
ON public.trip_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.trips
    WHERE public.trips.id = public.trip_members.trip_id
      AND public.trips.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.trip_members tm
    WHERE tm.trip_id = public.trip_members.trip_id
      AND tm.user_id = auth.uid()
  )
);

-- นโยบาย: เพิ่มสมาชิกเข้าทริป (ผ่านการเชิญ/แชร์ หรือผู้สร้างทริป)
DROP POLICY IF EXISTS "Users can join or add trip members" ON public.trip_members;
CREATE POLICY "Users can join or add trip members"
ON public.trip_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.trips
    WHERE public.trips.id = public.trip_members.trip_id
      AND public.trips.created_by = auth.uid()
  )
);

-- นโยบาย: เจ้าของทริปสามารถเปลี่ยน role สมาชิกได้
DROP POLICY IF EXISTS "Owners can update member role" ON public.trip_members;
CREATE POLICY "Owners can update member role"
ON public.trip_members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trips
    WHERE public.trips.id = public.trip_members.trip_id
      AND public.trips.created_by = auth.uid()
  )
);

-- นโยบาย: เจ้าของทริปสามารถลบสมาชิกได้ หรือสมาชิกกดออกจากทริปเองได้
DROP POLICY IF EXISTS "Owners can remove members or user can leave" ON public.trip_members;
CREATE POLICY "Owners can remove members or user can leave"
ON public.trip_members
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.trips
    WHERE public.trips.id = public.trip_members.trip_id
      AND public.trips.created_by = auth.uid()
  )
);


-- 3. ตาราง itinerary_items: เปิดใช้งาน RLS
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view itinerary" ON public.itinerary_items;
CREATE POLICY "Members can view itinerary"
ON public.itinerary_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trips
    WHERE public.trips.id = public.itinerary_items.trip_id
      AND (
        public.trips.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.trip_members
          WHERE public.trip_members.trip_id = public.trips.id
            AND public.trip_members.user_id = auth.uid()
        )
      )
  )
);

DROP POLICY IF EXISTS "Members can modify itinerary" ON public.itinerary_items;
CREATE POLICY "Members can modify itinerary"
ON public.itinerary_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trips
    WHERE public.trips.id = public.itinerary_items.trip_id
      AND (
        public.trips.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.trip_members
          WHERE public.trip_members.trip_id = public.trips.id
            AND public.trip_members.user_id = auth.uid()
            AND public.trip_members.role IN ('owner', 'editor')
        )
      )
  )
);


-- 4. ตาราง expenses: เปิดใช้งาน RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- นโยบาย: สมาชิกในทริปดูรายการค่าใช้จ่ายได้ (ยกเว้นผู้ที่ถูกจำกัดสิทธิ์ plan_only)
DROP POLICY IF EXISTS "Members can view expenses" ON public.expenses;
CREATE POLICY "Members can view expenses"
ON public.expenses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trips
    WHERE public.trips.id = public.expenses.trip_id
      AND (
        public.trips.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.trip_members
          WHERE public.trip_members.trip_id = public.trips.id
            AND public.trip_members.user_id = auth.uid()
            AND public.trip_members.role != 'plan_only'
        )
      )
  )
);

-- นโยบาย: เจ้าของ, Editor, และ Contributor สามารถเพิ่มรายจ่ายได้
DROP POLICY IF EXISTS "Members can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Members can manage expenses" ON public.expenses;
CREATE POLICY "Members can insert expenses"
ON public.expenses
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trips
    WHERE public.trips.id = public.expenses.trip_id
      AND (
        public.trips.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.trip_members
          WHERE public.trip_members.trip_id = public.trips.id
            AND public.trip_members.user_id = auth.uid()
            AND public.trip_members.role IN ('owner', 'editor', 'contributor')
        )
      )
  )
);

-- นโยบาย: การแก้ไขรายจ่าย (Owner/Editor แก้ได้ทุกรายการ, Contributor แก้ได้เฉพาะที่ตนเองเป็นผู้จ่าย)
DROP POLICY IF EXISTS "Members can update expenses" ON public.expenses;
CREATE POLICY "Members can update expenses"
ON public.expenses
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trips
    WHERE public.trips.id = public.expenses.trip_id
      AND (
        public.trips.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.trip_members
          WHERE public.trip_members.trip_id = public.trips.id
            AND public.trip_members.user_id = auth.uid()
            AND (
              public.trip_members.role IN ('owner', 'editor')
              OR (public.trip_members.role = 'contributor' AND public.expenses.payer_id = auth.uid())
            )
        )
      )
  )
);

-- นโยบาย: การลบรายจ่าย (Owner/Editor ลบได้ทุกรายการ, Contributor ลบได้เฉพาะที่ตนเองเป็นผู้จ่าย)
DROP POLICY IF EXISTS "Members can delete expenses" ON public.expenses;
CREATE POLICY "Members can delete expenses"
ON public.expenses
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trips
    WHERE public.trips.id = public.expenses.trip_id
      AND (
        public.trips.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.trip_members
          WHERE public.trip_members.trip_id = public.trips.id
            AND public.trip_members.user_id = auth.uid()
            AND (
              public.trip_members.role IN ('owner', 'editor')
              OR (public.trip_members.role = 'contributor' AND public.expenses.payer_id = auth.uid())
            )
        )
      )
  )
);

-- หมายเหตุสำหรับ Migration ข้อมูลเดิม:
-- หากมีสมาชิกเก่าที่เป็น 'viewer' อยู่แล้วต้องการให้บันทึกรายจ่ายได้ ให้รันคำสั่งนี้:
-- UPDATE public.trip_members SET role = 'contributor' WHERE role = 'viewer';

-- 5. ตาราง user_devices: เก็บข้อมูลอุปกรณ์ที่เข้าสู่ระบบ (Multi-device tracking)
CREATE TABLE IF NOT EXISTS public.user_devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  browser TEXT,
  os TEXT,
  device_type TEXT DEFAULT 'desktop',
  ip_address TEXT,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own devices" ON public.user_devices;
CREATE POLICY "Users can manage their own devices"
ON public.user_devices
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ====================================================================
-- SUPABASE DATA API EXPLICIT GRANTS (Post-October 30th Compliance)
-- ป้องกันข้อผิดพลาด "permission denied" สำหรับตารางใน public schema
-- ====================================================================
DO $$
BEGIN
  -- ให้สิทธิ์ authenticated และ service_role กับตารางหลักทั้งหมด
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role';
  EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role';
  
  -- สิทธิ์สำหรับ anon (อ่านข้อมูลสาธารณะหรือเช็คอินหากมี)
  EXECUTE 'GRANT SELECT ON public.trips TO anon';
  EXECUTE 'GRANT SELECT ON public.itinerary_items TO anon';
END $$;

