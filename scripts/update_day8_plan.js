const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const url = 'https://sdigqzippsmrwblmkjyw.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkaWdxemlwcHNtcndibG1ranl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMDE0ODksImV4cCI6MjEwMzc3NzQ4OX0.2J50plRmwRj6k_XGOs8A45xi2v4dTUcVjzyMmvoCUbQ';
const supabase = createClient(url, key);

const TRIP_ID = 'aacaed89-95df-49b4-a48c-bddda380b3f2';

const day8Items = [
  {
    id: '2eb96946-dc94-4150-8572-71dcf5e56c1e',
    trip_id: TRIP_ID,
    sort_order: 24,
    date_label: '11 ธ.ค.',
    time_slot: '08:00 – 12:00 น.',
    city: 'Nara (ไฮไลต์เมืองนารายามเช้า)',
    main_place: 'ไฮไลต์เมืองนารายามเช้า: แวะชิมโมจิตำสดร้อนๆ หน้าร้าน Nakatanidou, เดินเล่นและถ่ายรูปกับฝูงกวางที่ Nara Park, เข้าสักการะพระใหญ่ไดบุตสึที่วัด Todai-ji Temple (12:00 น. เดินกลับมาสถานี Kintetsu-Nara เตรียมขึ้นรถไฟกลับเข้าเมือง)',
    main_place_links: [
      'https://maps.google.com/?q=Nara+Park',
      'https://maps.google.com/?q=Todai-ji+Temple+Nara',
      'https://maps.google.com/?q=Kintetsu-Nara+Station'
    ],
    food_recommendation: 'แวะชิมโมจิตำสดร้อนๆ เหนียวนุ่มหน้าร้าน Nakatanidou ระหว่างทางเดินเที่ยว',
    food_links: [
      'https://maps.google.com/?q=Nakatanidou'
    ],
    backup_plan: 'ที่เที่ยวสำรอง: ศาลเจ้าโคมไฟโบราณ Kasuga Taisha Shrine\nคาเฟ่สำรอง: Rokumei Coffee Co. Nara (แชมป์บาริสต้าคั่วกาแฟ คาเฟ่ Specialty ประจำเมืองนารา)\nร้านอาหารสำรอง: Shizuka Kamameshi Nara (ข้าวอบหม้อโบราณคิวยาวหน้าสวนนารา)',
    backup_links: [
      'https://maps.google.com/?q=Kasuga+Taisha+Nara',
      'https://maps.google.com/?q=Rokumei+Coffee+Nara',
      'https://maps.google.com/?q=Shizuka+Koen-ten+Nara'
    ],
    transport_info: 'ขึ้นรถไฟ Kintetsu จากสถานี Osaka-Namba ตรงไปยังสถานี Kintetsu-Nara (แตะ ICOCA 680 เยน, ประมาณ 40 นาที)'
  },
  {
    id: 'dfb69d2b-1cf6-4416-aa19-310bcedac423',
    trip_id: TRIP_ID,
    sort_order: 25,
    date_label: '11 ธ.ค.',
    time_slot: '12:15 – 15:00 น.',
    city: 'Osaka (Tsuruhashi & Ikuno Korea Town)',
    main_place: 'ชุมชนเกาหลี Ikuno Korea Town & มื้อเที่ยงปิ้งย่าง Tsuruhashi: เดินเล่นถนนคนเดิน Miyuki-dori (Ikuno Korea Town) ชิมสตรีทฟู้ดเกาหลี (ต๊อกบกกี คอร์นด็อก ขนมโฮต็อก) แวะดูเครื่องสำอางและของฝากเกาหลี',
    main_place_links: [
      'https://maps.google.com/?q=Miyuki-dori+Korea+Town+Osaka',
      'https://maps.google.com/?q=Tsuruhashi+Station'
    ],
    food_recommendation: 'มื้อกลางวัน (13:00 น.): ทานปิ้งย่างเกาหลียากินิคุชื่อดังหน้าสถานี Tsuruhashi หรือแวะทานอาหารเกาหลีแบบโลคอล + ชิมสตรีทฟู้ดเกาหลี (ต๊อกบกกี คอร์นด็อก ขนมโฮต็อก)',
    food_links: [
      'https://maps.google.com/?q=Tsuruhashi+Korean+Yakiniku+Osaka',
      'https://maps.google.com/?q=Tsuruhashi+Korea+Town+Street+Food+Osaka'
    ],
    backup_plan: 'ร้านของฝากสำรอง: Tsuruhashi Wholesale Market (ตลาดค้าส่งกิมจิและอาหารเกาหลีแท้ๆ)\nคาเฟ่เกาหลีสำรอง: Cafe N2 Tsuruhashi (คาเฟ่สไตล์มินิมอลเกาหลี ครอฟเฟิลและครีมลาเต้)\nร้านอาหารเกาหลีสำรอง: Soran Tsuruhashi (ร้านอาหารพื้นเมืองเกาหลีและซุปกิมจิร้อนๆ)',
    backup_links: [
      'https://maps.google.com/?q=Tsuruhashi+Market',
      'https://maps.google.com/?q=Cafe+N2+Tsuruhashi',
      'https://maps.google.com/?q=Soran+Tsuruhashi'
    ],
    transport_info: 'นั่งรถไฟ Kintetsu จาก Kintetsu-Nara ยิงตรงมาลงที่สถานี Tsuruhashi (สึรุฮาชิ) ได้เลยรวดเดียว (ประมาณ 32 นาที ไม่ต้องเปลี่ยนขบวน) | แตะ ICOCA (540 เยน)'
  },
  {
    id: 'dd8ab523-a042-42e6-91db-12f71672996e',
    trip_id: TRIP_ID,
    sort_order: 26,
    date_label: '11 ธ.ค.',
    time_slot: '15:15 – 17:45 น.',
    city: 'Osaka (Den Den Town Nipponbashi)',
    main_place: 'ลุยโซนของเล่น Den Den Town (คัดเฉพาะจุดเด่น 2.5 ชม. ไม่เดินสะเปะสะปะ): Joshin Super Kids Land Main Store & Character Hall (กันพลา โมเดลประกอบ รถแข่ง ฟิกเกอร์ และกล่องของเล่นหลัก) ➔ Surugaya Nipponbashi (กล่องสุ่ม ฟิกเกอร์มือสอง และของสะสมอนิเมะ) ➔ Mandarake Grandchaos (ของสะสมหายาก ฟิกเกอร์วินเทจ และตู้โชว์แรร์ไอเทม) ➔ Gashapon Bandai Official Shop (หมุนตู้กาชาปอง)',
    main_place_links: [
      'https://maps.google.com/?q=Joshin+Super+Kids+Land+Main+Store',
      'https://maps.google.com/?q=Surugaya+Osaka+Nipponbashi',
      'https://maps.google.com/?q=Mandarake+Grandchaos',
      'https://maps.google.com/?q=Gashapon+Bandai+Official+Shop+Nipponbashi'
    ],
    food_recommendation: 'ของว่าง/เครื่องดื่มระหว่างช้อปปิ้งย่านเด็นเด็นทาวน์ หรือแวะพักเหนื่อยจิบกาแฟ',
    food_links: [
      'https://maps.google.com/?q=Brooklyn+Roasting+Company+Namba'
    ],
    backup_plan: 'ร้านของเล่นสำรอง 1: Animate Osaka Nipponbashi (อนิเมะ มังงะ และกู๊ดส์ลิขสิทธิ์แท้)\nร้านของเล่นสำรอง 2: Sofmap Namba (ฟิกเกอร์ เกม และอุปกรณ์ไอที)\nร้านของสะสมสำรอง: K-BOOKS Namba (กู๊ดส์และของสะสมอนิเมะมือสองสภาพนางฟ้า)\nคาเฟ่สำรอง: Brooklyn Roasting Company Namba (คาเฟ่ริมทางรถไฟ บรรยากาศดิบเท่สไตล์นิวยอร์ก)',
    backup_links: [
      'https://maps.google.com/?q=Animate+Osaka+Nipponbashi',
      'https://maps.google.com/?q=Sofmap+Namba',
      'https://maps.google.com/?q=K-BOOKS+Namba',
      'https://maps.google.com/?q=Brooklyn+Roasting+Company+Namba'
    ],
    transport_info: 'จากสถานี Tsuruhashi นั่งรถไฟ Kintetsu เพียง 2 สถานี (4 นาที) มาลงที่ สถานี Kintetsu-Nipponbashi ทางออก 5 แล้วเดินเข้าโซนของเล่นได้ทันที | แตะ ICOCA (180 เยน)'
  },
  {
    id: '003ef244-61a2-4425-aadd-7db892312021',
    trip_id: TRIP_ID,
    sort_order: 27,
    date_label: '11 ธ.ค.',
    time_slot: '18:00 น. เป็นต้นไป',
    city: 'Osaka (Shinsaibashi & Dotonbori)',
    main_place: 'Shinsaibashi & มื้อค่ำ Dotonbori: เดินเท้าจาก Den Den Town ทะลุเข้าโซน Namba / Shinsaibashi เพื่อนำของที่ช้อปมากลับไปเก็บที่โรงแรม Quintessa แล้วออกมาเดินเล่นรับลมริมคลองโดทงโบริ ถ่ายรูปคู่ป้าย Dotonbori Glico Sign',
    main_place_links: [
      'https://maps.google.com/?q=Dotonbori+Glico+Sign',
      'https://maps.google.com/?q=Quintessa+Hotel+Osaka+Shinsaibashi'
    ],
    food_recommendation: 'ทานมื้อค่ำตามแผน: เทมปุระเจ้าดัง Tenmasa Osaka หรือราเมงข้อสอบ Ichiran Dotonbori หรือโอโคโนมิยากิกระทะร้อน Chibo',
    food_links: [
      'https://maps.google.com/?q=Tenmasa+Osaka',
      'https://maps.google.com/?q=Ichiran+Ramen+Dotonbori',
      'https://maps.google.com/?q=Chibo+Okonomiyaki+Dotonbori'
    ],
    backup_plan: 'ที่เที่ยวสำรอง 1: เดินช้อปปิ้งถนนคนเดิน Shinsaibashi-Suji Shopping Street\nที่เที่ยวสำรอง 2: ตรอกหินโบราณและรูปปั้นพระฟุโดเมียวโอะมอสเขียว Hozenji Yokocho\nร้านอาหารสำรอง: Mizuno Okonomiyaki (โอโคโนมิยากิมิชลิน บิบ กูร์มองด์)\nร้านดองกี้สำรอง: Don Quijote Dotonbori (ช้อปปิ้งดองกี้ชิงช้าสวรรค์ริมคลอง เปิด 24 ชม.)',
    backup_links: [
      'https://maps.google.com/?q=Shinsaibashi-Suji+Shopping+Street',
      'https://maps.google.com/?q=Hozenji+Yokocho',
      'https://maps.google.com/?q=Mizuno+Okonomiyaki',
      'https://maps.google.com/?q=Don+Quijote+Dotonbori'
    ],
    transport_info: 'เดินเท้าจาก Den Den Town ทะลุเข้าย่าน Namba / Shinsaibashi กลับโรงแรม Quintessa Hotel Osaka Shinsaibashi Comic & Books | ฟรี'
  }
];

async function updateDay8() {
  console.log('Updating Day 8 items in Supabase...');
  for (const item of day8Items) {
    const { id, ...dataToUpdate } = item;
    const { error } = await supabase
      .from('itinerary_items')
      .update(dataToUpdate)
      .eq('id', id);

    if (error) {
      console.error(`Failed to update item ${id}:`, error);
    } else {
      console.log(`Successfully updated item ${item.sort_order}: ${item.time_slot}`);
    }
  }

  // Update scripts/v4_parsed_items.json
  console.log('Updating scripts/v4_parsed_items.json...');
  const v4Items = JSON.parse(fs.readFileSync('scripts/v4_parsed_items.json', 'utf-8'));
  
  // Indices 23, 24, 25, 26 correspond to sort_order 24, 25, 26, 27
  v4Items[23] = {
    row_num: v4Items[23].row_num,
    ...day8Items[0]
  };
  delete v4Items[23].id;
  delete v4Items[23].trip_id;
  delete v4Items[23].sort_order;

  v4Items[24] = {
    row_num: v4Items[24].row_num,
    ...day8Items[1]
  };
  delete v4Items[24].id;
  delete v4Items[24].trip_id;
  delete v4Items[24].sort_order;

  v4Items[25] = {
    row_num: v4Items[25].row_num,
    ...day8Items[2]
  };
  delete v4Items[25].id;
  delete v4Items[25].trip_id;
  delete v4Items[25].sort_order;

  v4Items[26] = {
    row_num: v4Items[26].row_num,
    ...day8Items[3]
  };
  delete v4Items[26].id;
  delete v4Items[26].trip_id;
  delete v4Items[26].sort_order;

  fs.writeFileSync('scripts/v4_parsed_items.json', JSON.stringify(v4Items, null, 2), 'utf-8');
  console.log('scripts/v4_parsed_items.json updated successfully!');
}

updateDay8();
