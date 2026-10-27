import openpyxl
import shutil

def update_excel(filepath):
    wb = openpyxl.load_workbook(filepath)
    ws = wb['Main Plan - Final']

    # Row 51: Nara
    ws.cell(51, 1).value = '11 ธ.ค.'
    ws.cell(51, 2).value = '08:00 – 12:00 น.'
    ws.cell(51, 3).value = 'Nara (ไฮไลต์เมืองนารายามเช้า)'
    ws.cell(51, 4).value = 'ไฮไลต์เมืองนารายามเช้า: แวะชิมโมจิตำสดร้อนๆ หน้าร้าน Nakatanidou, เดินเล่นและถ่ายรูปกับฝูงกวางที่ Nara Park, เข้าสักการะพระใหญ่ไดบุตสึที่วัด Todai-ji Temple (12:00 น. เดินกลับมาสถานี Kintetsu-Nara เตรียมขึ้นรถไฟ)'
    ws.cell(51, 5).value = 'แวะชิมโมจิตำสดร้อนๆ เหนียวนุ่มหน้าร้าน Nakatanidou ระหว่างทางเดินเที่ยว'
    ws.cell(51, 6).value = 'ที่เที่ยวสำรอง: ศาลเจ้าโคมไฟโบราณ Kasuga Taisha Shrine\nคาเฟ่สำรอง: Rokumei Coffee Co. Nara (แชมป์บาริสต้าคั่วกาแฟ)\nร้านอาหารสำรอง: Shizuka Kamameshi Nara'
    ws.cell(51, 7).value = 'ขึ้นรถไฟ Kintetsu จากสถานี Osaka-Namba ตรงไปยังสถานี Kintetsu-Nara (แตะ ICOCA 680 เยน, ประมาณ 40 นาที)'

    # Row 54: Korea Town & Tsuruhashi
    ws.cell(54, 1).value = '11 ธ.ค.'
    ws.cell(54, 2).value = '12:15 – 15:00 น.'
    ws.cell(54, 3).value = 'Osaka (Tsuruhashi & Ikuno Korea Town)'
    ws.cell(54, 4).value = 'ชุมชนเกาหลี Ikuno Korea Town & มื้อเที่ยงปิ้งย่าง Tsuruhashi: เดินเล่นถนนคนเดิน Miyuki-dori ชิมสตรีทฟู้ดเกาหลี (ต๊อกบกกี คอร์นด็อก ขนมโฮต็อก) แวะดูเครื่องสำอางและของฝากเกาหลี'
    ws.cell(54, 5).value = 'มื้อกลางวัน (13:00 น.): ทานปิ้งย่างเกาหลียากินิคุชื่อดังหน้าสถานี Tsuruhashi หรืออาหารเกาหลีแบบโลคอล + ชิมสตรีทฟู้ดเกาหลี'
    ws.cell(54, 6).value = 'ร้านของฝากสำรอง: Tsuruhashi Wholesale Market (ตลาดค้าส่งกิมจิและอาหารเกาหลีแท้ๆ)\nคาเฟ่เกาหลีสำรอง: Cafe N2 Tsuruhashi\nร้านอาหารสำรอง: Soran Tsuruhashi'
    ws.cell(54, 7).value = 'นั่งรถไฟ Kintetsu จาก Kintetsu-Nara ยิงตรงมาลงที่สถานี Tsuruhashi (สึรุฮาชิ) ได้เลยรวดเดียว (ประมาณ 32 นาที ไม่ต้องเปลี่ยนขบวน) | แตะ ICOCA (540 เยน)'
    ws.cell(55, 4).value = 'https://maps.google.com/?q=Miyuki-dori+Korea+Town+Osaka'
    ws.cell(55, 5).value = 'https://maps.google.com/?q=Tsuruhashi+Korean+Yakiniku+Osaka'
    ws.cell(55, 6).value = 'https://maps.google.com/?q=Tsuruhashi+Market'

    # Row 56: Den Den Town 2.5 ชม.
    ws.cell(56, 1).value = '11 ธ.ค.'
    ws.cell(56, 2).value = '15:15 – 17:45 น.'
    ws.cell(56, 3).value = 'Osaka (Den Den Town Nipponbashi)'
    ws.cell(56, 4).value = 'ลุยโซนของเล่น Den Den Town (คัดเฉพาะจุดเด่น 2.5 ชม. ไม่เดินสะเปะสะปะ): Joshin Super Kids Land Main Store & Character Hall (กันพลา โมเดล รถแข่ง ฟิกเกอร์) ➔ Surugaya Nipponbashi (กล่องสุ่ม ฟิกเกอร์มือสอง) ➔ Mandarake Grandchaos (ของสะสมหายาก แรร์ไอเทม) ➔ Gashapon Bandai Official Shop (หมุนตู้กาชาปอง)'
    ws.cell(56, 5).value = 'ของว่าง/เครื่องดื่มระหว่างช้อปปิ้งย่านเด็นเด็นทาวน์ หรือแวะพักเหนื่อยจิบกาแฟ'
    ws.cell(56, 6).value = 'ร้านของเล่นสำรอง 1: Animate Osaka Nipponbashi\nร้านของเล่นสำรอง 2: Sofmap Namba\nร้านของสะสมสำรอง: K-BOOKS Namba\nคาเฟ่สำรอง: Brooklyn Roasting Company Namba'
    ws.cell(56, 7).value = 'จากสถานี Tsuruhashi นั่งรถไฟ Kintetsu เพียง 2 สถานี (4 นาที) มาลงที่ สถานี Kintetsu-Nipponbashi ทางออก 5 แล้วเดินเข้าโซนของเล่นได้ทันที | แตะ ICOCA (180 เยน)'
    ws.cell(57, 4).value = 'https://maps.google.com/?q=Joshin+Super+Kids+Land+Main+Store'
    ws.cell(57, 5).value = 'https://maps.google.com/?q=Brooklyn+Roasting+Company+Namba'
    ws.cell(57, 6).value = 'https://maps.google.com/?q=Animate+Osaka+Nipponbashi'

    # Row 58: Shinsaibashi & Dotonbori
    ws.cell(58, 1).value = '11 ธ.ค.'
    ws.cell(58, 2).value = '18:00 น. เป็นต้นไป'
    ws.cell(58, 3).value = 'Osaka (Shinsaibashi & Dotonbori)'
    ws.cell(58, 4).value = 'Shinsaibashi & มื้อค่ำ Dotonbori: เดินเท้าจาก Den Den Town ทะลุเข้าโซน Namba / Shinsaibashi เพื่อนำของที่ช้อปมากลับไปเก็บที่โรงแรม Quintessa แล้วออกมาเดินเล่นรับลมริมคลองโดทงโบริ ถ่ายรูปคู่ป้าย Dotonbori Glico Sign'
    ws.cell(58, 5).value = 'ทานมื้อค่ำตามแผน: เทมปุระเจ้าดัง Tenmasa Osaka หรือราเมงข้อสอบ Ichiran Dotonbori หรือโอโคโนมิยากิกระทะร้อน Chibo'
    ws.cell(58, 6).value = 'ที่เที่ยวสำรอง 1: เดินช้อปปิ้งถนนคนเดิน Shinsaibashi-Suji Shopping Street\nที่เที่ยวสำรอง 2: ตรอกหินโบราณ Hozenji Yokocho\nร้านอาหารสำรอง: Mizuno Okonomiyaki\nร้านดองกี้สำรอง: Don Quijote Dotonbori'
    ws.cell(58, 7).value = 'เดินเท้าจาก Den Den Town ทะลุเข้าย่าน Namba / Shinsaibashi กลับโรงแรม Quintessa Hotel Osaka Shinsaibashi Comic & Books | ฟรี'
    ws.cell(59, 4).value = 'https://maps.google.com/?q=Dotonbori+Glico+Sign'
    ws.cell(59, 5).value = 'https://maps.google.com/?q=Tenmasa+Osaka'
    ws.cell(59, 6).value = 'https://maps.google.com/?q=Shinsaibashi-Suji+Shopping+Street'

    wb.save(filepath)
    print(f'Saved {filepath}')

update_excel('Japan_Osaka-Kyoto_04-15Dec2026_v4.xlsx')
shutil.copyfile('Japan_Osaka-Kyoto_04-15Dec2026_v4.xlsx', 'Knowledge/Japan_Osaka-Kyoto_04-15Dec2026_v4.xlsx')
print('Knowledge/Japan_Osaka-Kyoto_04-15Dec2026_v4.xlsx updated as well!')
