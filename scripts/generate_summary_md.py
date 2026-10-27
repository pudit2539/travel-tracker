# scripts/generate_summary_md.py
import json
import os

with open('scripts/v4_parsed_items.json', encoding='utf-8') as f:
    items = json.load(f)

# Group items by date_label
days = {}
for item in items:
    dl = item.get('date_label', 'Unknown')
    if dl not in days:
        days[dl] = []
    days[dl].append(item)

md = []

md.append("# 🇯🇵 แผนการเดินทางเที่ยวญี่ปุ่นฉบับสมบูรณ์: Osaka - Kyoto - Nara - Kobe - Uji - Rinku (4 - 15 ธ.ค. 2026)")
md.append("> **เอกสารสรุปภาพรวมแผนเที่ยว การเดินทาง ร้านอาหาร แผนสำรอง และ Wishlist สำหรับนำไปปรึกษาต่อใน Gemini AI**")
md.append("> *อ้างอิงข้อมูลเวอร์ชันล่าสุดจากระบบ Travel Tracker (v4 Master Itinerary: 42 กิจกรรม, 4 โรงแรม, 2 เที่ยวบิน, พร้อมพิกัดและแผนสำรองครบถ้วน)*\n")

md.append("---")
md.append("## 📌 1. ข้อมูลภาพรวมของทริป (Trip Overview)")
md.append("- **ชื่อทริป**: Osaka - Kyoto 2026")
md.append("- **ระยะเวลา**: 12 วัน 11 คืน (4 ธันวาคม 2569 – 15 ธันวาคม 2569)")
md.append("- **ผู้ร่วมเดินทาง**: 2 ท่าน")
md.append("- **สกุลเงินหลัก**: JPY (เยนญี่ปุ่น) / THB (บาท)")
md.append("- **บัตรเดินทางหลัก**: บัตรแตะ ICOCA (ใช้ขึ้นรถไฟใต้ดิน รถไฟเอกชน รถบัส ซื้อของร้านสะดวกซื้อ) + ตั๋ว JR Haruka Airport Express (สนามบินคันไซ KIX -> เกียวโต Kyoto)\n")

md.append("### ✈️ เที่ยวบิน (Flights)")
md.append("| ขาไป / ขากลับ | สายการบิน & เที่ยวบิน | เส้นทางบิน | วันที่ & เวลาออก | เวลาถึงปลายทาง | สถานะ |")
md.append("| :--- | :--- | :--- | :--- | :--- | :--- |")
md.append("| **ขาไป (Outbound)** | Vietnam Airlines (VN614 ต่อ VN334) | BKK -> HAN -> KIX | 4 ธ.ค. 2569 เวลา 15:55 น. | 5 ธ.ค. 2569 เวลา 06:55 น. | จองแล้ว (ชำระแล้ว) |")
md.append("| **ขากลับ (Inbound)** | Thai VietJet Air (VZ-567) | KIX -> TPE -> BKK | 15 ธ.ค. 2569 เวลา 12:00 น. | 15 ธ.ค. 2569 เวลา 18:35 น. | จองแล้ว (ชำระแล้ว) |\n")
md.append("*หมายเหตุ: ขากลับแวะเปลี่ยนเครื่องที่ไทเป (TPE) เวลา 14:15 - 15:40 น.*\n")

md.append("### 🏨 ที่พักทั้ง 4 แห่ง (Accommodations)")
md.append("| วันที่เข้าพัก | เมือง | โรงแรม | ย่านที่ตั้ง & จุดเด่น | จำนวนคืน |")
md.append("| :--- | :--- | :--- | :--- | :--- |")
md.append("| **5 – 7 ธ.ค. 2026** | เกียวโต (Kyoto) | **Hotel The M's Kyoto** | ใกล้สถานี JR Kyoto Station เดินทางสะดวกมาก | 2 คืน |")
md.append("| **7 – 9 ธ.ค. 2026** | เกียวโต (Kyoto) | **Hotel Musse Kyoto Shijo Kawaramachi Meitetsu** | ใจกลางย่านช้อปปิ้ง Shijo Kawaramachi ติดตลาด Nishiki | 2 คืน |")
md.append("| **9 – 14 ธ.ค. 2026** | โอซาก้า (Osaka) | **Quintessa Hotel Osaka Shinsaibashi Comic & Books** | ใจกลาง Shinsaibashi ใกล้ Dotonbori มีการ์ตูนให้อ่าน | 5 คืน |")
md.append("| **14 – 15 ธ.ค. 2026** | ริงกุทาวน์ (Rinku) | **Odysis Suites Osaka Airport Hotel** | โรงแรมตึกสูงวิวทะเล เชื่อมต่อสถานี Rinku-Town และ Outlets | 1 คืน |\n")

md.append("---\n")
md.append("## 🗺️ 2. แผนการเดินทางรายวัน (Day-by-Day Itinerary)")
md.append("> ครอบคลุม: **สถานที่หลัก**, **เวลา**, **การเดินทาง (สายรถไฟ/ค่าโดยสาร)**, **ร้านอาหาร/คาเฟ่แนะนำ**, **แผนสำรอง (ที่เที่ยวสำรอง & ร้านอาหารสำรอง)**\n")

for day_idx, (dl, day_items) in enumerate(days.items(), start=1):
    md.append(f"### 🗓️ วันที่ {dl} 2026 (Day {day_idx})")
    if dl == '11 ธ.ค.':
        md.append("> 💡 **จุดเด่นของแผน Day 8 นี้**:")
        md.append("> - **ไม่ย้อนเส้นทาง**: เรียงจาก นารา ➔ สึรุฮาชิ ➔ นิปปอนบาชิ ➔ ชินไซบาชิ เป็นแนวเส้นตรงบนสาย Kintetsu ตลอดบ่าย")
        md.append("> - **เก็บครบทุกจุดที่อยากไป**: ได้ทั้งบรรยากาศนารา, ได้กินและเดินเที่ยว Korea Town, และได้ช้อปของเล่น Den Den Town แบบกระชับ 2.5 ชม. ไม่ล้าจนเกินไป\n")
    
    for item in day_items:
        slot = item.get('time_slot', '').strip()
        city = item.get('city', '').strip()
        main_place = item.get('main_place', '').strip()
        transport = item.get('transport_info', '').strip()
        food = item.get('food_recommendation', '').strip()
        backup_plan = item.get('backup_plan', '').strip()
        
        md.append(f"#### 📍 [{slot}] {main_place} ({city})")
        
        if transport and transport != "-":
            md.append(f"- 🚆 **การเดินทาง**: {transport}")
        
        if food and food != "-":
            md.append(f"- 🍜 **ร้านอาหาร / คาเฟ่แนะนำ**: {food}")
        
        if backup_plan and backup_plan != "-":
            backups = [b.strip() for b in backup_plan.split('\n') if b.strip()]
            md.append("- 🛡️ **แผนสำรอง & ร้านอาหาร/คาเฟ่สำรอง**:")
            for b in backups:
                md.append(f"  - {b}")
        
        md.append("")
    md.append("---\n")

md.append("## 🌟 3. รายการสถานที่ที่อยากไป / Wishlist & Curated Gems")
md.append("> รวบรวมร้านอาหาร คาเฟ่ ช้อปปิ้ง และแลนด์มาร์กที่เพิ่งเพิ่มเข้าระบบและอยู่ใน Wishlist เพื่อใช้สลับหรือเลือกใส่เพิ่มเติม:\n")

md.append("### 🥩 หมวดเนื้อวัวพรีเมียม / กิวคัตสึ / ปิ้งย่าง (Wagyu & Yakiniku)")
md.append("1. **Gyukatsu Motomura (牛かつ もと村) - สาขา Umeda (Lucua 1100 B2) / Namba**")
md.append("   - *ไฮไลท์*: เนื้อวัวชุบเกล็ดขนมปังทอดกรอบนอก นุ่มใน ย่างต่อบนหินร้อนส่วนตัว จิ้มเกลือวาซาบิ (¥1,600 - ¥2,600)")
md.append("2. **Steakland Kobe (Kobe Beef) - โกเบ**")
md.append("   - *ไฮไลท์*: สเต๊กเนื้อโกเบเทปปันยากิผัดกระเทียม เสิร์ฟพร้อมเซตข้าวและผักย่าง คุ้มค่าที่สุดยามกลางวัน (¥3,500 - ¥6,500)")
md.append("3. **Yakiniku M Dotonbori (เนื้อวากิวมัตสึซากะ)**")
md.append("   - *ไฮไลท์*: ปิ้งย่างเนื้อวากิวระดับ A5 ลายหินอ่อนละลายในปาก บรรยากาศส่วนตัวสไตล์ญี่ปุ่น (¥4,000 - ¥8,000)\n")

md.append("### 🍜 หมวดราเมง & ซูชิ (Ramen & Sushi)")
md.append("1. **Ichiran Ramen (一蘭 ラーメン) - Dotonbori / Umeda**")
md.append("   - *ไฮไลท์*: ราเมงข้อสอบ ซุปทงคัตสึเข้มข้น โต๊ะเดี่ยวมีฉากกั้น เลือกระดับความเผ็ดและเส้นได้ 24 ชม. (¥1,100 - ¥1,800)")
md.append("2. **Hakata Ippudo (一風堂) - สาขา Umeda Chayamachi**")
md.append("   - *ไฮไลท์*: ราเมงทงคตสึต้นตำรับฮากาตะ ชิโรมารุ/อากามารุ พร้อมถั่วงอกเผ็ดฟรีไม่อั้น (¥850 - ¥1,400)")
md.append("3. **Kura Sushi Global Flagship Store (くら寿司 グローバル旗艦店) - Dotonbori**")
md.append("   - *ไฮไลท์*: ซูชิสายพาน 100 เยนที่ใหญ่ที่สุด ตกแต่งสไตล์งานวัดญี่ปุ่น ทานครบ 5 จาน ลุ้นเกม Bikkura-Pon กาชาปอง (¥1,200 - ¥2,500)")
md.append("4. **Zundoya Ramen (ずんどう屋) - Shinsaibashi**")
md.append("   - *ไฮไลท์*: ราเมงซุปกระดูกหมูเข้มข้นพิเศษ เลือกระดับมันหมูได้ เปิดตลอด 24 ชั่วโมง เหมาะกับมื้อดึก\n")

md.append("### 🥞 หมวดอาหารพื้นเมืองโอซาก้า & สตรีทฟู้ด (Local & Street Food)")
md.append("1. **Kiji Okonomiyaki (きじ) - Umeda Sky Building B1 (Takimi-koji)**")
md.append("   - *ไฮไลท์*: โอโคโนมิยากิมิชลิน บิบ กูร์มองด์ ระดับตำนาน เมนูเด็ด Modanyaki ใส่เส้นยากิโซบะ (¥900 - ¥1,600)")
md.append("2. **Kushikatsu Daruma (串かつだるま) - Shinsekai / Dotonbori**")
md.append("   - *ไฮไลท์*: ของทอดเสียบไม้ชุบแป้งบางกรอบ กฎเหล็กห้ามจุ่มซอสซ้ำ ทานคู่กับกะหล่ำปลีสดและเบียร์เย็นๆ (¥1,500 - ¥2,500)")
md.append("3. **Wanaka Takoyaki (たこ焼道楽 わなか) - Sennichimae Namba**")
md.append("   - *ไฮไลท์*: ทาโกะยากิกรอบนอกฉ่ำใน เนื้อปลาหมึกชิ้นโต ได้รับรางวัล Bib Gourmand")
md.append("4. **Torikizoku (鳥貴族) - Yakitori Bar**")
md.append("   - *ไฮไลท์*: ร้านไก่ย่างยากิโทริและเครื่องดื่มทุกเมนู ราคาเดียว 370 เยนทั้งร้าน เมนูหน้าจอสัมผัสภาษาอังกฤษ (¥1,500 - ¥2,500)\n")

md.append("### 🍰 หมวดคาเฟ่ & ของหวาน & มัทฉะชาเขียว (Cafes & Sweets & Matcha)")
md.append("1. **HARBS (ハーブス) - Hankyu Sanbangai Umeda / Daimaru Shinsaibashi**")
md.append("   - *ไฮไลท์*: เครปเค้กผลไม้สด 6 ชั้น (Mille Crepes) ครีมสดแท้หวานบางเบา ชิ้นโตจุใจ (¥900 - ¥1,800)")
md.append("2. **Nakamura Tokichi (中村藤吉) - สาขาหลักเมือง Uji & Kyoto Station**")
md.append("   - *ไฮไลท์*: มัทฉะพาร์เฟต์ในกระบอกไม้ไผ่ และเยลลี่ชาเขียวเข้มข้นระดับตำนานกว่า 160 ปี (¥1,200 - ¥1,800)")
md.append("3. **Blue Bottle Coffee (ブルーボトルコーヒー) - สาขาเกียวโต (Nanzenji) / Umeda**")
md.append("   - *ไฮไลท์*: กาแฟดริป Single Origin สไตล์มินิมอล สาขาเกียวโตรีโนเวทจากบ้านโบราณ Machiya 100 ปี (¥600 - ¥1,100)")
md.append("4. **Gion Tsujiri (祇園辻利) & Saryo Tsujiri - ย่าน Gion เกียวโต**")
md.append("   - *ไฮไลท์*: ซอฟต์เสิร์ฟมัทฉะแท้เกียวโตและพาร์เฟต์ชาเขียวคิโยมิซุ")
md.append("5. **% Arabica Kyoto - สาขา Arashiyama ริมแม่น้ำ Oi / Higashiyama**")
md.append("   - *ไฮไลท์*: กาแฟลาเต้รสนุ่ม วิวริมสะพานโทเก็ตสึเคียวและป่าเขาอาราชิยามะ\n")

md.append("### 🛍️ หมวดช้อปปิ้ง & อนิเมะ & แหล่งของเล่นของฝาก (Shopping & Pop Culture)")
md.append("1. **Mega Don Quijote (ดองกี้ 24 ชม.) - สาขา Dotonbori / Shinsekai**")
md.append("   - *ไฮไลท์*: แหล่งช้อปปิ้งของฝาก ขนมญี่ปุ่น ยา เครื่องสำอาง Tax-Free ตลอด 24 ชม.")
md.append("2. **Gashapon Bandai Official Shop - ชินไซบาชิ / อุเมดะ**")
md.append("   - *ไฮไลท์*: อาณาจักรตู้กาชาปองหลายร้อยตู้ ลุ้นโมเดลการ์ตูน สัตว์ และของจิ๋ว")
md.append("3. **Pokemon Center Osaka (Daimaru Umeda) & Pokemon Center Osaka DX (Daimaru Shinsaibashi)**")
md.append("   - *ไฮไลท์*: ศูนย์รวมตุ๊กตาและการ์ดโปเกมอน พร้อมโปเกมอนคาเฟ่")
md.append("4. **Yodobashi Camera Multimedia Umeda / LINKS UMEDA**")
md.append("   - *ไฮไลท์*: เมกะสโตร์เครื่องใช้ไฟฟ้า กล้อง โมเดล ฟิกเกอร์ และสินค้าไอที 8 ชั้น")
md.append("5. **Denden Town (Nipponbashi)**")
md.append("   - *ไฮไลท์*: อากิฮาบาระแห่งโอซาก้า ดงร้านฟิกเกอร์ อนิเมะ การ์ดเกม และเรโทรเกม (Mandarake, Surugaya, Animate)")
md.append("6. **Rinku Premium Outlets**")
md.append("   - *ไฮไลท์*: เอาต์เล็ตริมทะเลกว่า 250 แบรนด์เนม เช่น Nike, Adidas, Coach, Ralph Lauren พร้อมวิวลมทะเล\n")

md.append("### 🎡 หมวดแลนด์มาร์ก & จุดชมวิวสุดพิเศษ (Landmarks & Scenic Views)")
md.append("1. **Umeda Sky Building (Kuchu Teien Observatory)**")
md.append("   - *ไฮไลท์*: จุดชมวิวระเบียงลอยฟ้า 360 องศา ชั้น 39-40 มองเห็นทัศนียภาพเมืองโอซาก้าและแสงไฟยามค่ำคืน")
md.append("2. **Harukas 300 (Abeno Harukas)**")
md.append("   - *ไฮไลท์*: ตึกระฟ้าที่สูงที่สุดแห่งหนึ่งในญี่ปุ่น ชมวิวมุมสูงเสียดฟ้าพร้อมพื้นกระจกวัดใจ")
md.append("3. **Marble Beach Rinku (หาดหินอ่อน)**")
md.append("   - *ไฮไลท์*: หาดหินอ่อนสีขาวทอดยาวริมอ่าวโอซาก้า ชมพระอาทิตย์ตกดินฉากหลังสะพานข้ามสนามบินคันไซ\n")

md.append("---\n")
md.append("## 💬 4. โครงสร้าง Prompt Template สำหรับนำไปวางในแชท Gemini ตัวใหม่")
md.append("> **วิธีใช้**: คัดลอกข้อความด้านล่างนี้ไปวางที่ช่องพิมพ์ของแชท Gemini ตัวใหม่ได้ทันที เพื่อเริ่มการวิเคราะห์หรือวางแผนเจาะลึกเฉพาะเรื่อง:\n")

md.append("```text")
md.append("สวัสดี Gemini ฉันกำลังจะเดินทางไปเที่ยวญี่ปุ่น ทริป Osaka - Kyoto 2026 (12 วัน 11 คืน, 4 - 15 ธ.ค. 2569 ผู้เดินทาง 2 คน)")
md.append("นี่คือสรุปแผนการเดินทาง ข้อมูลเที่ยวบิน โรงแรม การเดินทาง ร้านอาหาร และแผนสำรองทั้งหมดของฉัน (อ้างอิงจากระบบ Travel Tracker):")
md.append("")
md.append("[ วางเนื้อหาจากส่วนที่ 1 ถึงส่วนที่ 3 ของเอกสารนี้ที่นี่ ]")
md.append("")
md.append("คำถาม / สิ่งที่ฉันต้องการให้ Gemini ช่วยวิเคราะห์และให้คำแนะนำเพิ่มเติม:")
md.append("1. ช่วยตรวจเช็คความสมเหตุสมผลของเวลาและระยะทางในแต่ละวัน (Pacing & Route Optimization) มีช่วงไหนที่แน่นเกินไปหรือเดินเหนื่อยเกินไปหรือไม่?")
md.append("2. ในวันที่สภาพอากาศไม่เป็นใจ (เช่น ฝนตก หรือลมหนาวจัด) แผนสำรอง (Indoor Backup) ที่เตรียมไว้เพียงพอและตอบโจทย์หรือไม่?")
md.append("3. แนะนำร้านอาหารหรือคาเฟ่เด็ดลับๆ ในย่านที่ฉันพัก (Kyoto Station, Kawaramachi, Shinsaibashi, Rinku-Town) ที่คนท้องถิ่นชอบไป")
md.append("4. คำแนะนำเรื่องการเตรียมตั๋วรถไฟ / Pass และการจองตั๋ว Universal Studios Japan (USJ + Super Nintendo World) ล่วงหน้าควรจองช่องทางไหนและช่วงเวลาใดดีที่สุด?")
md.append("5. อัปเดตสภาพอากาศและคำแนะนำการแต่งกายช่วง 4-15 ธันวาคม ในแถบคันไซ (โอซาก้า-เกียวโต-โกเบ)")
md.append("```\n")

content = "\n".join(md)

with open('TRIP_ITINERARY_SUMMARY.md', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Generated TRIP_ITINERARY_SUMMARY.md successfully! Total length: {len(content)} chars.")
