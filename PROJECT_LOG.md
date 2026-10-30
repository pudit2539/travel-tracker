# 📋 Travel Tracker — Project Architecture & Development Log
> **คำแนะนำสำหรับ AI Assistant ในทุก Session ใหม่**: 
> 1. อ่านไฟล์นี้ก่อนเสมอเพื่อทำความเข้าใจสถาปัตยกรรม บริบทระบบ ข้อมูลทริป และประวัติการแก้ไขทั้งหมดโดยละเอียด
> 2. **กฎเหล็ก (Mandatory Auto-Deploy Rule)**: ทุกครั้งที่แก้ไขโค้ดหรืออัปเดตฟีเจอร์เสร็จสิ้นและทดสอบผ่านแล้ว **ต้องรัน `git add`, `git commit`, และ `git push origin main` เพื่อ Auto Deploy ขึ้น Production ทันทีทุกครั้ง** โดยไม่ต้องรอให้ผู้ใช้ถาม


---

## 1. ข้อมูลภาพรวมของโปรเจกต์ (Project Overview)
* **ชื่อโปรเจกต์**: Travel Tracker (เว็บแอปจัดการทริปท่องเที่ยว และบริหารค่าใช้จ่ายกลุ่ม)
* **Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Zustand, Supabase (Auth + PostgreSQL RLS), Framer Motion, Lucide Icons, Sonner Toast
* **Localhost Port**: `4000` (ปรับจาก 3000 เพื่อไม่ให้ชนกับโปรเจกต์อื่นที่รันพอร์ต 3000 อยู่)
  * รันคำสั่ง: `npm run dev` (สคริปต์คือ `next dev -H 0.0.0.0 -p 4000`)
* **ทริปหลักในระบบ**: ทริปญี่ปุ่น Osaka - Kyoto - Nara - Kobe - Uji - Rinku (4 - 15 ธ.ค. 2026)
  * ข้อมูลแผนเที่ยว สถานที่ ลิงก์ Google Maps พิกัด และร้านอาหารสำรองทั้งหมด จัดเก็บอยู่ใน:
    `Knowledge/Japan_Osaka-Kyoto_04-15Dec2026_v1 - Use.xlsx`

---

## 2. ระบบสิทธิ์และความปลอดภัย (Roles & Permissions Architecture)
* **Super Admin**: `pudit2539@gmail.com` (กำหนดใน `src/lib/permissions.ts`)
  * มีสิทธิ์เข้าถึงทุกทริป, สลับดูโหมด All Trips, เข้า SuperAdminModal ได้
* **Trip Roles**:
  1. `owner`: เจ้าของทริป ควบคุมได้ทั้งหมด ลบทริปได้ จัดการสิทธิ์สมาชิก
  2. `editor`: ผู้แก้ไข เพิ่ม/แก้แผนเที่ยว และบันทึกค่าใช้จ่ายได้
  3. `viewer`: ผู้เข้าชม ดูได้ทั้งแผนเที่ยวและสรุปค่าใช้จ่าย แต่แก้ไขไม่ได้
  4. `plan_only`: ดูเฉพาะแผนเที่ยว ซ่อนแท็บการเงิน/งบประมาณทั้งหมด
* **ฐานข้อมูล & Row Level Security (RLS)**:
  * นโยบาย RLS ถูกเขียนไว้ใน `supabase_rls_policies.sql` (ควบคุม `trips`, `trip_members`, `itinerary_items`, `expenses`, `user_devices`)

---

## 3. ระบบยืนยันตัวตน และการจัดการ Session / Device (Auth & Session Management)
* **ตัวจัดการ Session**: `src/lib/sessionManager.ts`
* **Remember Me (จดจำการเข้าสู่ระบบ 1 สัปดาห์)**:
  * ในหน้า `src/app/login/page.tsx` มี Checkbox `จดจำการเข้าสู่ระบบไว้ (1 สัปดาห์)` (เปิดเป็นค่าเริ่มต้น)
  * หากติ๊ก: Session จะมีอายุ 7 วัน (604,800,000 ms) และมีระบบ **Sliding Window** (หากผู้ใช้เปิดใช้งานอย่างต่อเนื่อง จะต่อเวลาให้อัตโนมัติ ไม่ถูกเตะออกกะทันหัน)
  * หากไม่ติ๊ก: Session มีอายุ 24 ชั่วโมง
* **ป้องกันปัญหา "ชอบให้ login ใหม่"**:
  * ใช้ `getSafeSession()` ใน `HomePage` และ `TripDetailPage`: เมื่อเปิดแอปมาหลัง Token หมดอายุ (1 ชม.) ระบบจะพยายาม refresh token ให้อัตโนมัติก่อน และตรวจสอบ Timeout 7 วัน แทนการใช้ one-shot `getSession()` ดิบๆ ที่เตะผู้ใช้ไป `/login` ทันที
  * เพิ่มการยืนยัน `window.confirm('คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ?')` ที่ปุ่ม Logout ทั้งหมด ป้องกันการกดโดนบนมือถือ
  * ไม่ใช้ `localStorage.clear()` แบบกวาดเรียบ เพื่อไม่ให้ Device ID และแคชโปรไฟล์หาย
* **Multi-Device Login & Device Tracker**:
  * รองรับการล็อกอินได้หลายเครื่องพร้อมกัน (มือถือ, แท็บเล็ต, คอมพิวเตอร์)
  * บันทึกข้อมูลอุปกรณ์ลงตาราง `public.user_devices` (OS, Browser, Device Type, Device ID, Last Active)
  * ใน `ProfileModal`: มีส่วน **"อุปกรณ์ที่เข้าสู่ระบบอยู่ (Active Devices)"**
    * แสดงรายชื่ออุปกรณ์ทั้งหมดที่ล็อกอินบัญชีนี้อยู่
    * มีป้ายกำกับ `🟢 เครื่องนี้`
    * สามารถกด **"ออกจากระบบเครื่องอื่นทั้งหมด (Sign out other devices)"** หรือกดลบอุปกรณ์รายตัวได้

---

## 4. บันทึกประวัติการแก้ไขและอัปเดต (Changelog & History)

### [2026-10-14] แก้ไขปัญหา Session หลุดบ่อย, เพิ่ม Remember Me 1 สัปดาห์, Multi-device, และพอร์ต 4000
1. **เปลี่ยน Localhost Port**:
   - ปรับ `package.json` ให้ `dev` และ `start` รันบน `-p 4000` (URL: `http://localhost:4000`)
   - แก้ไข `README.md` เป็นพอร์ต 4000
2. **แก้ปัญหา User ชอบให้ Login ใหม่**:
   - เพิ่ม `src/lib/sessionManager.ts` จัดการ Session Timeout แบบ Sliding Window 7 วัน และมี `getSafeSession()` ที่คอย Refresh Token อัตโนมัติ
   - ป้องกันการกด Logout พลาดบนมือถือ: เพิ่ม Confirmation Dialog ในปุ่ม Logout ของ `TripDetailPage`, `HomePage`, และ `ProfileModal`
   - ปรับเปลี่ยนจากการเคลียร์ `localStorage.clear()` เป็นการเคลียร์เฉพาะข้อมูล Auth ที่จำเป็น
3. **เพิ่มปุ่ม "จดจำการเข้าสู่ระบบ (1 สัปดาห์)" ในหน้า Login**:
   - เพิ่ม Checkbox โมเดิร์นใน `src/app/login/page.tsx`
   - บันทึก `travel_tracker_remember_me` และกำหนดวันหมดอายุเป็น 7 วัน
4. **ระบบ Multi-Device Tracking**:
   - เพิ่มตาราง `public.user_devices` ใน `supabase_rls_policies.sql`
   - ตรวจจับ User Agent เป็นชนิดอุปกรณ์ (Mobile / Tablet / Desktop), Browser, และ OS อัตโนมัติ
   - เพิ่มส่วนจัดการอุปกรณ์ใน `ProfileModal.tsx`: ผู้ใช้สามารถดูว่าตนเองล็อกอินอยู่ที่เครื่องไหนบ้าง และกดเตะเครื่องอื่นออกได้
5. **สร้าง Project Log สำหรับ Assistant**:
   - สร้าง `PROJECT_LOG.md` และเชื่อมโยงใน `CLAUDE.md` เพื่อส่งต่อ Context ให้ทุกแชทใหม่ในอนาคต

### [2026-10-14] เพิ่มระบบความสัมพันธ์ ที่พัก-ตั๋วบิน-รายจ่าย (Bidirectional Sync), ระบบ Checklist จ่ายเงิน, และแก้บัคลบที่พัก
1. **เชื่อมโยงรายจ่าย ที่พัก และตั๋วบิน เข้าหากันแบบ 2 ทาง (Bidirectional Sync)**:
   - เมื่อบันทึกรายจ่ายหมวด "🏨 ที่พัก / โรงแรม": ระบบจะสร้างข้อมูลที่พักใน `AccommodationsCard` ให้อัตโนมัติ พร้อมผูก `expenseId` โดยผู้ใช้ไม่ต้องกรอกข้อมูลเยอะในตอนแรก และสามารถมากดแก้ไขเพิ่มข้อมูล เช่น แผนที่, ใบจอง, ย่าน, ห้องพัก ได้ทีหลัง
   - เมื่อบันทึกรายจ่ายหมวดเดินทาง/ตั๋วบิน: ระบบจะสร้างข้อมูลตั๋วใน `FlightBoardingPassCard` ให้อัตโนมัติ
   - เมื่อสร้างที่พักหรือตั๋วเครื่องบินจากหน้าแผนเที่ยวโดยตรง: มีตัวเลือก "⚡ บันทึกเป็นรายจ่ายลงในแท็บ รายการ ทันที" และมีปุ่ม "ลงรายจ่าย" แบบ 1-Click หากยังไม่ได้ลงบันทึก
2. **แก้ไขบัคลบที่พักแล้วข้อมูลไม่อัพเดทในต่าง Browser / ต่าง User**:
   - ต้นเหตุเดิม: มีเงื่อนไข `parsed.accommodations && parsed.accommodations.length > 0` เมื่อลบจนเหลือ `[]` (length === 0) โค้ดมองเป็นเท็จ ทำให้ไม่เซฟค่าว่างทับ `localStorage` เดิม
   - แก้ไข: เช็ค `parsed.accommodations !== undefined && Array.isArray(...)` ทั้งใน `page.tsx` และ `AccommodationsCard.tsx`
   - เพิ่ม `supabase.channel` Realtime Subscription บนตาราง `itinerary_items` ในทั้ง AccommodationsCard และ FlightBoardingPassCard ทำให้เมื่ออุปกรณ์ใดอุปกรณ์หนึ่งลบหรือแก้ไข ข้อมูลบนหน้าจอของเครื่องอื่นจะอัปเดตแบบเรียลไทม์ทันที
3. **ระบบตั๋วเครื่องบิน กรอกเองได้ + รองรับหลายเที่ยวบิน + ดีไซน์ Boarding Pass สไตล์ Apple Wallet**:
   - สร้าง `src/lib/flights.ts` รองรับการเพิ่ม ลบ แก้ไข ตั๋วเครื่องบินหลายใบ (ขาไป, ขากลับ, ในประเทศ)
   - ปรับปรุง `FlightBoardingPassCard.tsx` ให้กรอกข้อมูลเองได้อย่างอิสระ: สายการบิน, เลขไฟลต์, สนามบินต้นทาง-ปลายทาง, วันเดินทาง, เวลาออก, เวลา Boarding, Terminal, Gate, ที่นั่ง, PNR, ราคา, สกุลเงิน, โน้ต
   - มีปุ่มคัดลอกรหัสการจอง (PNR) แบบ 1-Click และปุ่มเช็คอินออนไลน์
4. **เอาติ๊กถูกออกจาก Default ของการแยกรายจ่าย**:
   - ปรับค่าเริ่มต้นของ `splitAsSeparateExpenses` ให้เป็น `false` เสมอ (ไม่ติ๊กถูกออโต้เมื่อสแกนหรือเพิ่มรายการ) ตามความต้องการของผู้ใช้
5. **ระบบ Checklist ชำระเงิน (จ่ายแล้ว หรือ ยังไม่จ่าย / จ่ายทีหลัง)**:
   - เพิ่มสถานะ `paymentStatus`: `'paid' | 'unpaid'` ให้กับทั้งที่พักและตั๋วเครื่องบิน เพื่อรองรับกรณีจองผ่านเอเจนต์ (Agoda, Booking.com, Trip.com) ที่เลือกชำระเงินภายหลังหรือจ่าย ณ ที่พัก
   - มีปุ่ม Checklist สลับสถานะได้ทันทีในหน้าการ์ด: `[✅ จ่ายเงินแล้ว]` ⟷ `[⏳ ยังไม่จ่าย / จ่ายทีหลัง]`
   - เมื่อเปลี่ยนสถานะเป็น "จ่ายเงินแล้ว" หากมีราคาแต่ยังไม่ได้ลงรายจ่าย ระบบจะมี Popup ถามว่าต้องการลงบันทึกในรายจ่ายทริปด้วยหรือไม่
6. **เพิ่มข้อมูล วันเช็คอิน, จำนวนคืน, และลิงก์ Google Maps**:
   - แสดงวันเช็คอิน วันเช็คเอาท์ จำนวนคืนที่คำนวณอัตโนมัติ และปุ่มเปิดแผนที่ Google Maps โดยตรง
7. **ทดสอบระบบ**:
   - สร้างชุดทดสอบ `src/__tests__/flightsAndSync.test.ts` (6 tests) ผ่านทั้งหมด 100% รวมเป็น 33 passed tests
8. **นำเข้าข้อมูลรายจ่ายเดิมที่มีอยู่แล้วเข้าสู่การ์ดที่พักและตั๋วเครื่องบิน (One-Time Existing Data Sync)**:
   - นำเข้า 4 ที่พัก: Hotel The M's Kyoto (6,640 THB), Hotel Musse Kyoto Shijo Kawaramachi Meitetsu (6,640 THB), Quintessa Hotel Osaka Shinsaibashi Comic & Books (12,000 THB), Odysis Suites Osaka Airport Hotel (1,900 THB) พร้อมลิงก์ Google Maps, วันที่, คืนที่พัก, และเชื่อม expenseId
   - นำเข้า 2 เที่ยวบิน: ขาไป Vietnam Airlines (12,100 THB, BKK -> KIX 4 ธ.ค.), ขากลับ Thai VietJet Air VZ-567 (18,000 THB, KIX -> BKK 15 ธ.ค.) พร้อมเชื่อม expenseId และสถานะ จ่ายเงินแล้ว (paid)
9. **แก้ปัญหาบันทึกข้อมูลผิดในครั้งแรก และเพิ่มระบบตรวจสอบวันเช็คอิน/เช็คเอาท์ (Date Validation)**:
   - ตรวจสอบวันเช็คอินต้องอยู่ก่อนวันเช็คเอาท์อย่างน้อย 1 คืน (`checkIn < checkOut`) ห้ามบันทึกหากเช็คอินหลังวันออกหรือวันเดียวกัน พร้อมแสดง Toast เตือน และแถบเตือนสีแดงในฟอร์ม
   - กำหนด `min` ให้ช่องวันเช็คเอาท์ไม่สามารถเลือกวันที่ก่อนหรือเท่ากับวันเช็คอินได้ และหากเปลี่ยนวันเช็คอิน ระบบจะเลื่อนวันเช็คเอาท์ตามจำนวนคืนเดิมให้อัตโนมัติ
   - ตรวจสอบวันที่เช็คอิน/เช็คเอาท์ไม่ให้เกินช่วงของทริป (`tripStartDate` / `tripEndDate`)
   - แก้ปัญหาบันทึกผิดในครั้งแรก: ปรับปรุง `updateAccommodation` และ `addOrUpdateFlight` ให้รับ `currentStays`/`currentFlights` จาก State เพื่อป้องกันการอ่านแคชเก่าจาก `localStorage` ที่ยังโหลดไม่เสร็จ, พร้อม `await syncAccommodationsToSupabase` เพื่อรอให้ฐานข้อมูลบันทึกสำเร็จก่อนปิด Modal
   - แก้บั๊ก Date Timezone Shift: `sanitizeSpentAtDate` เปลี่ยนจากการใช้ `toISOString()` ซึ่งทำให้เวลาเที่ยงคืนของไทย (UTC+7) เลื่อนถอยหลังไป 1 วันใน UTC มาเป็นฟังก์ชันแปลงวันที่แบบ Local Calendar (`YYYY-MM-DD`) เที่ยงตรง 100%
10. **อัปเดตแผนเที่ยวและที่พักใหม่ทั้งหมดตามไฟล์ `Japan_Osaka-Kyoto_04-15Dec2026_v4.xlsx`**:
   - นำเข้าแผนเที่ยวกิจกรรมใหม่ 42 รายการ ครบทุกวัน (4 - 15 ธ.ค. 2026) แทนที่แผนเดิม
   - เพิ่มลิงก์ Google Maps ครบ 100% ทุกสถานที่ ทั้งสถานที่หลัก ร้านอาหาร และแผนสำรอง
   - ปรับปรุงการ์ดที่พัก 4 แห่งตามแผน v4:
     1. Hotel The M's Kyoto (5 - 7 ธ.ค., 2 คืน, 6,640 THB)
     2. Hotel Musse Kyoto Shijo Kawaramachi Meitetsu (7 - 9 ธ.ค., 2 คืน, 6,640 THB)
     3. Quintessa Hotel Osaka Shinsaibashi Comic & Books (9 - 14 ธ.ค., 5 คืน, 12,000 THB)
     4. Odysis Suites Osaka Airport Hotel (14 - 15 ธ.ค., 1 คืน, 1,900 THB)
   - คัดลอกไฟล์ต้นฉบับไปไว้ที่ `Knowledge/Japan_Osaka-Kyoto_04-15Dec2026_v4.xlsx` เพื่อเป็นเอกสารอ้างอิงของโปรเจกต์

### [2026-10-20] ปรับปรุงแผนเที่ยว Day 8 (11 ธ.ค. 2026): Nara ➔ Korea Town ➔ Den Den Town ➔ Shinsaibashi & Dotonbori
- **แก้ปัญหาเส้นทางย้อนไปมา**: เปลี่ยนรูทการเดินทางให้เรียงต่อกันเป็นแนวเส้นตรงบนสาย Kintetsu Line (Osaka-Namba ➔ Kintetsu-Nara ➔ Tsuruhashi ➔ Kintetsu-Nipponbashi ➔ Shinsaibashi)
- **4 ช่วงเวลาหลัก**:
  1. `08:00 – 12:00 น.`: ไฮไลต์เมืองนารายามเช้า (Nakatanidou โมจิตำสด, Nara Park ถ่ายรูปฝูงกวาง, ไหว้พระใหญ่ Todai-ji Temple)
  2. `12:15 – 15:00 น.`: นั่ง Kintetsu ตรงมาลง Tsuruhashi มื้อกลางวันปิ้งย่างเกาหลีชื่อดังหน้าสถานี เดินเล่นถนนคนเดิน Miyuki-dori (Ikuno Korea Town) ชิมสตรีทฟู้ด (ต๊อกบกกี คอร์นด็อก ขนมโฮต็อก) แวะดูเครื่องสำอางและของฝาก
  3. `15:15 – 17:45 น.`: นั่ง Kintetsu เพียง 2 สถานีลง Kintetsu-Nipponbashi ลุยโซนของเล่น Den Den Town คัดเฉพาะร้านไฮไลท์ 2.5 ชม. (Joshin Super Kids Land Main Store & Character Hall, Surugaya Nipponbashi, Mandarake Grandchaos, Gashapon Bandai Official Shop)
  4. `18:00 น. เป็นต้นไป`: เดินทะลุเข้า Shinsaibashi เก็บของช้อปปิ้งที่โรงแรม Quintessa แล้วออกมาเดินรับลมริมคลองโดทงโบริ ถ่ายรูปป้ายกูลิโกะ และทานมื้อค่ำตามแผน (เทมปุระ Tenmasa, ราเมงข้อสอบ Ichiran, หรือโอโคโนมิยากิ Chibo/Mizuno)
- **อัปเดตระบบครบทุกมิติ**:
  - อัปเดตตารางฐานข้อมูล `itinerary_items` ใน Supabase แบบเรียลไทม์
  - อัปเดต `scripts/v4_parsed_items.json`
  - อัปเดต `TRIP_ITINERARY_SUMMARY.md`
  - อัปเดต Master Excel: `Japan_Osaka-Kyoto_04-15Dec2026_v4.xlsx` และ `Knowledge/Japan_Osaka-Kyoto_04-15Dec2026_v4.xlsx`
  - เพิ่ม Visual Card & Category Tags ใน `src/lib/placeThumbnails.ts` สำหรับ `Den Den Town` และ `Korea Town`

### [2026-10-30] อัปเกรดระบบครั้งใหญ่จาก TabiPlan (12 หมวดฟีเจอร์ครบวงจร) + ยกเลิกระบบปัดขวาเช็คอินบนมือถือ
1. **ยกเลิกระบบปัดขวาเช็คอินบนการ์ดสถานที่ (`Swipe-Right Check-in Removed`)**:
   - ถอด `handleTouchStart`, `handleTouchMove`, `handleTouchEnd`, `swipeOffset` และ Overlay ปัดขวาออกจาก `src/components/trip-detail/ItineraryStopCard.tsx` อย่างสมบูรณ์ เพื่อแก้ปัญหาเวลาใช้นิ้วเลื่อนหน้าจอบนโทรศัพท์แล้วเผลอไปโดนเช็คอินโดยไม่ตั้งใจ
   - คงเหลือเฉพาะการกดปุ่ม **`📍 เช็คอิน`** บนการ์ดโดยตรง และการเช็คอินอัตโนมัติด้วย GPS จริงเมื่อเข้าใกล้พิกัดในรัศมี 80 เมตร
2. **Smart Cascading Timeline & Time Engine (`src/lib/smartTimeline.ts`, `ItineraryStopCard.tsx`, `TripPlanTab.tsx`)**:
   - คำนวณเวลาถึง-เวลาออกต่อเนื่องกันทั้งวันอัตโนมัติ (`⚡ 08:30–10:00 (90น.)`) พร้อมสรุปชั่วโมงเที่ยว เวลาเดินทาง และค่ารถไฟรวมประจำวัน
   - แจ้งเตือนอัตโนมัติเมื่อไปถึงก่อนร้านเปิด (`⏳ รอร้านเปิด`) หรือเสี่ยงไม่ทันเวลาจอง/ร้านปิด (`⚠️ เสี่ยงไม่ทัน`)
   - ปุ่ม **`⏭️ ข้ามจุดแวะชั่วคราว (Skip Stop)`** โดยไม่ต้องลบข้อมูลออกจากทริป และปุ่ม **`📅 ย้ายไปวันอื่น`** ในคลิกเดียว
   - แท็กความพร้อมหน้างานอัตโนมัติ (`☔ เหมาะวันฝนตก/ในร่ม`, `🧳 มีตู้ล็อกเกอร์ฝากกระเป๋า`, `🚻 จุดแวะห้องน้ำ`, `🚉 ติดสถานีรถไฟ`, `🛍️ Tax-Free`)
   - ชิป Autocomplete สายรถไฟและเส้นทางยอดฮิตคันไซ (`KANSAI_TRANSIT_SUGGESTIONS`) ในฟอร์มเพิ่ม/แก้ไขกิจกรรม
3. **5-Stop Chunked Google Maps & Apple Maps Route Bar (`TripPlanTab.tsx`)**:
   - แบ่งจุดแวะรายวันออกเป็นช่วงละไม่เกิน 5 จุดแวะเชื่อมต่อกัน เพื่อแก้ปัญหา Google Maps ตัดพิกัดทิ้งเมื่อส่งเกินลิมิต พร้อมรองรับทั้ง **Google Maps** และ **Apple Maps** และสลับโหมด `🚇 รถไฟ`, `🚶 เดิน`, `🚗 ขับรถ`
   - เพิ่มปุ่มลอย **`⬆️ บนสุด` / `⬇️ ล่างสุด`** สำหรับวันที่มีจุดแวะยาว
4. **Split Group View & Stop-Pinned Group Notes (`ItineraryStopCard.tsx`, `TripPlanTab.tsx`)**:
   - ระบุผู้ร่วมเดินทางแยกตามจุดแวะ (`👥 ไปทุกคน` หรือเลือกเฉพาะสมาชิกเมื่อแยกกันเดิน เช่น ทีมช้อปปิ้ง vs ทีมของเล่น) พร้อมตัวกรองสลับ **`👥 ทั้งกลุ่ม` ⟷ `👤 แผนของฉัน`**
   - ระบบปักหมุดโน้ตกลุ่มรายจุดแวะ (`💬 โน้ตกลุ่ม`) พร้อมชื่อผู้เขียนและเวลา
5. **Interactive Chibi Companion + Real-Time GPS Vector Projection (`src/components/LiveTripCard.tsx`)**:
   - ตัวละคร Chibi Companion แบบ Layered SVG สลับได้ระหว่าง **`👧 สาวคาวาอี้`** และ **`👦 หนุ่มนักสำรวจ`** เปลี่ยนพร็อพตามเมือง (`🍁 เกียวโต`, `🎀 โอซาก้า`, `🦌 นารา`, `⚓ โกเบ`) และถือถุงช้อปปิ้งเพิ่มขึ้นจริงตามของที่ติ๊กซื้อแล้ว พร้อมเสียงพูดเชียร์ 2 ภาษา (TH/JP)
   - ระบบ **`📍 จับพิกัด GPS จริง`** คำนวณ Vector Projection ลงบนเส้นทางระหว่างจุดแวะ แจ้งเตือนเมื่อออกนอกเส้นทางเกิน 120 เมตร และ **Auto Check-in อัตโนมัติเมื่อเข้าใกล้จุดแวะในรัศมี 80 เมตร** พร้อมโหมด **`🚶 จำลองเดินเที่ยว`** และตัวเลือกความเป็นส่วนตัว (`ปิด` / `เฉพาะ %` / `เฉพาะย่าน` / `พิกัดละเอียด`)
6. **Stop-Linked Shopping Bag + Auto Expense Sync + 8-Dimension Wishlist (`src/lib/shoppingBag.ts`, `WishlistDrawer.tsx`, `ItineraryStopCard.tsx`)**:
   - ระบบกระเป๋าช้อปปิ้งผูกกับวันและจุดแวะ (ตั้งค่าเริ่มต้นของฝากคันไซ 8 รายการ) เมื่อติ๊ก **`✅ ซื้อแล้ว`** ระบบจะสร้างบิลรายจ่ายเข้าแท็บค่าใช้จ่ายให้อัตโนมัติทันที
   - อัปเกรดคลังพิกัดสำรอง (`WishlistDrawer.tsx`) เพิ่มตัวกรอง 8 มิติ (`☔ วันฝนตก/ในร่ม`, `🚉 ติดสถานี`, `🧳 มีตู้ฝากกระเป๋า`, `♿ ทางราบ/เดินน้อย`, `🚫🐷 ไม่ทานหมู/เนื้อ/ปลา`, `🛍️ Tax-Free 10%`) และป้าย `(✓ มีในแผนแล้ว)`
7. **Train Seat Reservations + Inspector View + Japan Rules & Etiquette (`src/components/TravelHubModal.tsx`)**:
   - ระบบบันทึกตั๋วรถไฟด่วน (`Haruka`, `Rapi:t`, `Shinkansen`, `Kintetsu`) ระบุขบวน ตู้ที่ (Car) เลขที่นั่ง (Seat) และโหมดเต็มจอ **"โชว์ให้นายสถานีดู 👮"**
   - แท็บใหม่ **`🇯🇵 กฎ & มารยาทญี่ปุ่น`** ครบ 5 หมวด (กฎหมายเข้มงวด, มารยาทคันไซ vs คันโต, ทริคเอาตัวรอดหน้างาน, ข้อมูลด่วน, ลิงก์ทางการ JNTO/Customs)
8. **Multi-Shared Fund Pools & Guardian Mode (`src/components/SettlementModal.tsx`)**:
   - แท็บใหม่ **`🏦 กองกลาง & ผู้ดูแล`** รองรับการตั้งวงเงินกองกลางหลายก้อน บันทึกยอดเติมเงินรายคน คำนวณเงินคงเหลือและยอดคืนเงินต่อคนอัตโนมัติ
   - **โหมดผู้ปกครอง/ดูแลจ่ายแทน (`👨‍👩‍👧 Guardian Mode`)** ผูกสมาชิกให้ผู้ดูแลรับผิดชอบยอดจ่ายและยอดเคลียร์หนี้แทนโดยอัตโนมัติ
9. **Landscape A4 One-Page Poster Print + Ink-Saver + Share Privacy (`src/components/PrintableItineraryModal.tsx`, `src/app/trips/[id]/page.tsx`)**:
   - เพิ่มโหมด **`🗺️ โปสเตอร์สรุปทริปแผ่นเดียว A4 แนวนอน`** พร้อมปุ่มซูม (`60%–115%`) และสลับโหมด **`🖨️ ประหยัดหมึก ขาวดำ`**
   - เพิ่มตัวเลือกความเป็นส่วนตัวใน Modal แชร์ทริป (ซ่อนวันที่เดินทางจริง / ซ่อนชื่อโรงแรมเมื่อแชร์สาธารณะ)

10. **Performance Optimization & Code Review (แก้ปัญหาระบบหน่วง/ช้า)**:
   - **Conditional Modal Mounting (`page.tsx`, `TripPlanTab.tsx`, `ItineraryStopCard.tsx`, `LiveTripCard.tsx`)**: เปลี่ยนจากการ Mount โมดอลทั้ง 16 ตัวใน `page.tsx` และ 3 โมดอลย่อยในการ์ดสถานที่ 42 ใบ (`42 × 3 = 126 instances`) ตลอดเวลา ให้เป็น Conditional Mount (`{showX && <X />}`) และทำ Dynamic Import สำหรับ `WishlistDrawer` และ `InteractiveTripMap` ลดจำนวน Component ที่ต้องรันตอนเปิดหน้าแรกกว่า 140+ ตัว
   - **ลด Re-render ของ `LiveTripCard` 60 ครั้ง/นาที**: ปรับ Interval นาฬิกาเวลาญี่ปุ่นจากทุก 1 วินาที (`1000ms`) เป็นทุก 30 วินาที (`30000ms`) และหุ้มด้วย `React.memo` ป้องกันการวาด SVG ตัวละคร Chibi ใหม่ทุกวินาที
   - **ตัดการอ่าน `localStorage` และ Event Listener ซ้ำซ้อนในการ์ดสถานที่ 42 ใบ (`ItineraryStopCard.tsx`)**: ใช้ข้อมูล `stopMeta` และ `stopShoppingItems` ที่คำนวณจาก `TripPlanTab` โดยตรงแทนการให้การ์ดทั้ง 42 ใบแยกกันอ่าน `localStorage` และผูก `window.addEventListener` ซ้ำ 84 ตัว
   - **รักษา Reference ให้ `React.memo(ItineraryStopCard)` ทำงานได้ 100% (`TripPlanTab.tsx`)**: ใช้ `stopShoppingByKey` (`useMemo` + `EMPTY_SHOPPING_ITEMS`) และ `handleTogglePlanB` (`useCallback`) เพื่อไม่ให้สร้าง Array/Function ใหม่ทุกครั้งที่หน้าจอขยับ
   - **เพิ่ม O(1) In-Memory Cache แทนการเรียก `JSON.parse(localStorage)` ซ้ำๆ (`placeThumbnails.ts`, `visitedStamps.ts`, `smartTimeline.ts`, `shoppingBag.ts`)**: แคชผลลัพธ์ `JSON.parse` ในหน่วยความจำ (ตรวจสอบด้วย `raw === cached.raw`) และเพิ่ม `negativePhotoCache` ป้องกันการยิง API รูปภาพซ้ำเมื่อการ์ด Re-mount

### [2026-10-12] เพิ่มระบบสิทธิ์ Granular Roles, Realtime Sync, และ Super Admin Console
- เพิ่มบทบาท `plan_only` ซ่อนแท็บงบประมาณ/การเงิน
- เพิ่ม `AddMemberModal` ให้เลือกสมาชิกจากระบบได้โดยตรง
- สร้าง `SuperAdminModal` เพื่อตรวจสอบ Audit ทริปทั้งหมดในระบบ
- เพิ่มฟีเจอร์ Transfer Ownership โอนสิทธิ์ความเป็นเจ้าของทริป
- ปรับปรุง RLS Database Level Policies ใน Supabase
