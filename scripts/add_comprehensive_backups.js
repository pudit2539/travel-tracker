const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const url = 'https://sdigqzippsmrwblmkjyw.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkaWdxemlwcHNtcndibG1ranl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMDE0ODksImV4cCI6MjEwMzc3NzQ4OX0.2J50plRmwRj6k_XGOs8A45xi2v4dTUcVjzyMmvoCUbQ';
const supabase = createClient(url, key);

const TRIP_ID = 'aacaed89-95df-49b4-a48c-bddda380b3f2';

// Dictionary of enhanced backup plans and direct matching links for each item (1-42)
const ENHANCED_BACKUPS = {
  1: { // 4 ธ.ค. 15:55 น. BKK -> HAN
    lines: [
      'ที่พักผ่อนสำรอง: Song Hong Premium Lounge & Bar (เลานจ์พักผ่อน อาบน้ำ ทานบุฟเฟต์ระหว่างรอต่อเครื่องที่สนามบินฮานอย)',
      'คาเฟ่สำรอง: Highlands Coffee Noi Bai Airport (แวะจิบค้างคาวกาแฟเวียดนามแท้ในสนามบิน)',
      'ร้านอาหารสำรอง: Big Bowl Pho Noi Bai (เฝอร้อนๆ ซุปรสชาติดั้งเดิมในสนามบิน)'
    ],
    links: [
      'https://maps.google.com/?q=Song+Hong+Premium+Lounge+Noi+Bai',
      'https://maps.google.com/?q=Highlands+Coffee+Noi+Bai+Airport',
      'https://maps.google.com/?q=Big+Bowl+Pho+Noi+Bai+Airport'
    ]
  },
  2: { // 5 ธ.ค. 06:55 น. KIX -> Kyoto
    lines: [
      'ร้านของว่างสำรอง: 551 Horai Kansai Airport (ซาลาเปาหมูสับนึ่งร้อนๆ ซิกเนเจอร์โอซาก้าหน้าสถานีรถไฟ KIX)',
      'คาเฟ่สำรอง: Tully\'s Coffee KIX Station (จิบกาแฟอุ่นๆ ระหว่างรอขบวนรถไฟ Haruka)',
      'ที่พักผ่อนสำรอง: KIX Airport Lounge (จุดนั่งพักชาร์จแบตเตอรี่และเชื่อมต่อ Wi-Fi ในสนามบิน)'
    ],
    links: [
      'https://maps.google.com/?q=551+Horai+Kansai+Airport',
      'https://maps.google.com/?q=Tullys+Coffee+Kansai+Airport',
      'https://maps.google.com/?q=KIX+Airport+Lounge'
    ]
  },
  3: { // 5 ธ.ค. 11:30 น. Porta Kyoto Station
    lines: [
      'ร้านอาหารสำรอง: Donguri Kyoto Station (โอโคโนมิยากิกระทะร้อนต้นตำรับเกียวโต)',
      'ที่เที่ยวสำรอง: ขึ้นชมวิวเมืองเกียวโตแบบพาโนรามาที่ Kyoto Tower',
      'คาเฟ่สำรอง: Inoda Coffee Kyoto Porta (ร้านกาแฟคลาสสิกสไตล์ย้อนยุคดั้งเดิมของเกียวโต)'
    ],
    links: [
      'https://maps.google.com/?q=Donguri+Kyoto+Station',
      'https://maps.google.com/?q=Kyoto+Tower',
      'https://maps.google.com/?q=Inoda+Coffee+Porta+Kyoto'
    ]
  },
  4: { // 5 ธ.ค. 15:00 น. Hotel The M's Kyoto
    lines: [
      'ที่เที่ยวสำรองใกล้ที่พัก: วัด Toji Temple (ชมเจดีย์ไม้ 5 ชั้นที่สูงที่สุดในญี่ปุ่น เดินจากโรงแรมได้)',
      'คาเฟ่สำรอง: Kissa Master Kyoto (คาเฟ่โลคอลสไตล์คิสซาเต็น จิบกาแฟดริปโบราณ)',
      'ที่เที่ยวช้อปปิ้งสำรอง: Aeon Mall Kyoto (ห้างใหญ่ใกล้สถานีเกียวโต เดินชิลซื้อของใช้และขนม)'
    ],
    links: [
      'https://maps.google.com/?q=Toji+Temple+Kyoto',
      'https://maps.google.com/?q=Kissa+Master+Kyoto',
      'https://maps.google.com/?q=Aeon+Mall+Kyoto'
    ]
  },
  5: { // 5 ธ.ค. 17:30 น. Pontocho Alley
    lines: [
      'ร้านอาหารสำรอง 1: Chao Chao Gyoza Sanjo (เกี๊ยวซ่าชื่อดังที่คนท้องถิ่นชอบไปนั่งดื่มกิน)',
      'ร้านอาหารสำรอง 2: Ippudo Nishikikoji Kyoto (ราเมนฮากาตะซุปกระดูกหมูเข้มข้น)',
      'คาเฟ่/บาร์สำรอง: Hello Dolly Pontocho (คาเฟ่แจ๊สคลาสสิกริมแม่น้ำคาโมะ วิวยามค่ำคืน)'
    ],
    links: [
      'https://maps.google.com/?q=Chao+Chao+Gyoza+Sanjo+Kaiko',
      'https://maps.google.com/?q=Ippudo+Nishikikoji+Kyoto',
      'https://maps.google.com/?q=Hello+Dolly+Pontocho+Kyoto'
    ]
  },
  6: { // 6 ธ.ค. 06:00 น. Kiyomizu-dera
    lines: [
      'ที่เที่ยวสำรอง: เดินต่อไปวัด Kodai-ji Temple (สวนหินและทางเดินไผ่เงียบสงบ)',
      'คาเฟ่สำรอง: Starbucks Coffee Kyoto Ninenzaka Yasaka Chaya (สตาร์บัคส์บ้านไม้โบราณเสื่อทาทามิแห่งเดียวในโลก)',
      'ร้านขนมสำรอง: Maccha House Kyoto (มัทฉะทีรามิสุในกล่องไม้สนฮิโนกิยอดฮิต)'
    ],
    links: [
      'https://maps.google.com/?q=Kodai-ji',
      'https://maps.google.com/?q=Starbucks+Coffee+Kyoto+Ninenzaka+Yasaka+Chaya',
      'https://maps.google.com/?q=Maccha+House+Kyoto'
    ]
  },
  7: { // 6 ธ.ค. 09:30 น. Gion
    lines: [
      'ที่เที่ยวสำรอง 1: เดินเล่นสวน Maruyama Park ข้างศาลเจ้า ยาซากะ',
      'ร้านอาหารสำรอง 1: Gion Karyo (อาหารไคเซกิเกียวโตดั้งเดิมริมถนนฮานามิโคจิ)',
      'คาเฟ่สำรอง: Gion Tsujiri Main Shop (ร้านชาเขียวอุจิระดับตำนาน ไอศกรีมพาร์เฟต์เข้มข้น)'
    ],
    links: [
      'https://maps.google.com/?q=Maruyama+Park+Kyoto',
      'https://maps.google.com/?q=Gion+Karyo',
      'https://maps.google.com/?q=Gion+Tsujiri+Main+Shop'
    ]
  },
  8: { // 6 ธ.ค. 13:30 น. Arashiyama
    lines: [
      'ที่เที่ยวสำรอง 2: เดินชมป่าไผ่ Arashiyama Bamboo Grove (ปรับเป็นแผนสำรอง)',
      'ที่เที่ยวสำรอง 3: ล่องเรือชมแม่น้ำโฮซึ Hozugawa River Boat Ride',
      'คาเฟ่สำรอง: Bread, Espresso & Arashiyama Garden (เบเกอรี่บ้านโบราณในสวนญี่ปุ่น)',
      'ร้านอาหารสำรอง: Yojiya Cafe Saga Arashiyama (คาเฟ่หน้าสาวเกอิชา ซุปและขนมสไตล์เกียวโต)'
    ],
    links: [
      'https://maps.google.com/?q=Arashiyama+Bamboo+Grove',
      'https://maps.google.com/?q=Hozugawa+River+Boat+Ride',
      'https://maps.google.com/?q=Bread+Espresso+and+Arashiyama+Garden',
      'https://maps.google.com/?q=Yojiya+Cafe+Saga+Arashiyama'
    ]
  },
  9: { // 6 ธ.ค. 18:00 น. Kyoto Station
    lines: [
      'ร้านอาหารสำรอง 2: Katsukura Tonkatsu (หมูทอดทงคัตสึต้นตำรับเกียวโต ชั้น The Cube)',
      'ที่เที่ยวสำรอง: Kyoto Railway Museum (พิพิธภัณฑ์รถไฟยักษ์และหัวรถจักรไอน้ำใกล้สถานี)',
      'คาเฟ่สำรอง: Nakamura Tokichi Kyoto Station Store (มัทฉะพาร์เฟต์เกรดพรีเมียมบนสถานี)'
    ],
    links: [
      'https://maps.google.com/?q=Katsukura+Kyoto+Station+The+Cube',
      'https://maps.google.com/?q=Kyoto+Railway+Museum',
      'https://maps.google.com/?q=Nakamura+Tokichi+Kyoto+Station'
    ]
  },
  10: { // 7 ธ.ค. 09:00 น. Nishiki Market
    lines: [
      'ที่เที่ยวสำรอง: เดินเล่นชมตลาด Nishiki Market ตลาดเก่าแก่ใจกลางเมืองข้างโรงแรม',
      'คาเฟ่สำรอง: Koe Donuts Kyoto (โดนัทออร์แกนิกดีไซน์สถาปัตยกรรมไม้ไผ่โดย Kengo Kuma ย่านชิโจ)',
      'ร้านอาหารสำรอง: Honke Dai-ichi Asahi (ราเมนคิวยาวระดับตำนานน้ำซุปเข้มข้น)'
    ],
    links: [
      'https://maps.google.com/?q=Nishiki+Market+Kyoto',
      'https://maps.google.com/?q=Koe+Donuts+Kyoto',
      'https://maps.google.com/?q=Honke+DaiichiAsahi'
    ]
  },
  11: { // 7 ธ.ค. 10:30 น. Uji
    lines: [
      'ที่เที่ยวสำรอง 4: ศาลเจ้าเก่าแก่ที่สุดในญี่ปุ่น Ujigami Shrine',
      'ร้านอาหารสำรอง 3: Itohkyuemon Uji (คาเฟ่มัทฉะโซบะและพาร์เฟต์)',
      'คาเฟ่ประวัติศาสตร์สำรอง: Tsuen Tea Uji (ร้านน้ำชาที่เก่าแก่ที่สุดในญี่ปุ่น ก่อตั้ง ค.ศ. 1160 ริมแม่น้ำอุจิ)',
      'ที่เที่ยวสำรอง: The Tale of Genji Museum Uji (พิพิธภัณฑ์ตำนานเก็นจิ วรรณกรรมชิ้นเอก)'
    ],
    links: [
      'https://maps.google.com/?q=Ujigami+Shrine',
      'https://maps.google.com/?q=Itohkyuemon+Uji',
      'https://maps.google.com/?q=Tsuen+Tea+Uji',
      'https://maps.google.com/?q=The+Tale+of+Genji+Museum+Uji'
    ]
  },
  12: { // 7 ธ.ค. 14:30 น. Recycle Shopping
    lines: [
      'ร้านของมือสองเสริม 1: Kindal Kyoto Teramachi (ร้านคัดเกรด 3 ชั้น)',
      'ร้านของมือสองเสริม 2: Hard-Off / Surugaya Kyoto Teramachi (ของสะสม ฟิกเกอร์ แผ่นเกม แผ่นเสียง แก็ดเจ็ต)',
      'ร้านแบรนด์เนมมือสองสำรอง: Komehyo Kyoto Shijo (แบรนด์เนม นาฬิกา กล้อง กระเป๋าคัดเกรด A)',
      'คาเฟ่พักขาสำรอง: Doutor Coffee Shijo Kawaramachi'
    ],
    links: [
      'https://maps.google.com/?q=Kindal+Kyoto',
      'https://maps.google.com/?q=Surugaya+Kyoto+Teramachi',
      'https://maps.google.com/?q=Komehyo+Kyoto+Shijo',
      'https://maps.google.com/?q=Doutor+Coffee+Shijo+Kawaramachi'
    ]
  },
  13: { // 7 ธ.ค. 18:30 น. Moritaya Sukiyaki
    lines: [
      'ร้านอาหารสำรอง 4: Gyoza Hohei Gion (เกี๊ยวซ่าระดับมิชลินบิบกูร์มองด์ บรรยากาศอบอุ่น)',
      'ร้านอาหารสำรองเสริม: Musashi Sushi Kyoto (ซูชิสายพานท้องถิ่นคุณภาพสดคุ้มราคา ย่านคาวาระมาจิ)',
      'คาเฟ่ของหวานสำรอง: Salon de Muge Kyoto (มิชลินไกด์ เซตชาเขียวและขนมญี่ปุ่นแบบประณีต)'
    ],
    links: [
      'https://maps.google.com/?q=Gyoza+Hohei+Gion',
      'https://maps.google.com/?q=Musashi+Sushi+Kyoto',
      'https://maps.google.com/?q=Salon+de+Muge+Kyoto'
    ]
  },
  14: { // 8 ธ.ค. 08:00 น. Shirahige Shrine
    lines: [
      'ที่เที่ยวสำรอง 5: แวะชมศาลาลอยน้ำโบราณ Ukimidou Mangetsu-ji (ศาลาวัดยื่นลงในทะเลสาบบิวะ)',
      'คาเฟ่วิวทะเลสาบสำรอง: Shirahige Soba (ร้านโซบะท้องถิ่นชมวิวทะเลสาบบิวะ)',
      'จุดชมวิวสำรอง: Biwako Valley (กระเช้าลอยฟ้าบนยอดเขามองเห็นทะเลสาบบิวะ 360 องศา)'
    ],
    links: [
      'https://maps.google.com/?q=Ukimidou+Mangetsuji',
      'https://maps.google.com/?q=Shirahige+Jinja+Soba',
      'https://maps.google.com/?q=Biwako+Valley'
    ]
  },
  15: { // 8 ธ.ค. 11:30 น. Omihachiman
    lines: [
      'ที่เที่ยวสำรอง (Plan B ทะเลสาบ): ขึ้นกระเช้าลอยฟ้า Hachimanyama Ropeway ชมวิวมุมสูงแบบพาโนรามา',
      'คาเฟ่ริมคลองสำรอง: Merikatei Cafe Omihachiman (คาเฟ่เรือนขนมปังฝรั่งเศสริมลำคลองประวัติศาสตร์)',
      'ร้านอาหารสำรอง: Omi Beef Shin (ร้านข้าวหน้าเนื้อวากิวโอมิย่างเตาถ่านแท้)'
    ],
    links: [
      'https://maps.google.com/?q=Hachimanyama+Ropeway',
      'https://maps.google.com/?q=Merikatei+Omihachiman',
      'https://maps.google.com/?q=Omi+Beef+Shin+Omihachiman'
    ]
  },
  16: { // 8 ธ.ค. 14:30 น. La Collina
    lines: [
      'ที่เที่ยวสำรองในเกียวโต (หากต้องการกลับเร็ว): ปราสาทมรดกโลก Nijo Castle',
      'ที่เที่ยวประวัติศาสตร์สำรอง: Kawara Museum (พิพิธภัณฑ์กระเบื้องหลังคาโบราณริมคลองโอมิฮาจิมัง)',
      'ร้านขนมสำรอง: Taneya Main Store Omihachiman (ร้านขนมญี่ปุ่นดั้งเดิมต้นกำเนิดของ Club Harie)'
    ],
    links: [
      'https://maps.google.com/?q=Nijo+Castle',
      'https://maps.google.com/?q=Kawara+Museum+Omihachiman',
      'https://maps.google.com/?q=Taneya+Main+Store+Omihachiman'
    ]
  },
  17: { // 8 ธ.ค. 17:30 น. Menya Inoichi
    lines: [
      'ร้านอาหารสำรอง 5: Chao Chao Gyoza Shijo (เกี๊ยวซ่าทอดกระทะร้อน)',
      'ร้านอาหารสำรองเสริม: Tendon Makino Kyoto Teramachi (ข้าวหน้าเทมปุระล้นชามทอดสดใหม่ คิวยอดนิยม)',
      'บาร์เครื่องดื่มสำรอง: Bar K6 Kyoto (บาร์ค็อกเทลคลาสสิกระดับท็อปของเกียวโต)'
    ],
    links: [
      'https://maps.google.com/?q=Chao+Chao+Gyoza+Sanjo+Kaiko',
      'https://maps.google.com/?q=Tendon+Makino+Kyoto+Teramachi',
      'https://maps.google.com/?q=Bar+K6+Kyoto'
    ]
  },
  18: { // 9 ธ.ค. 08:30 น. Fushimi Inari
    lines: [
      'คาเฟ่สำรอง: Vermillion Cafe Fushimi (คาเฟ่ริมลำธารและป่าร่มรื่น)',
      'ที่เที่ยวสำรอง: Tofukuji Temple (วัดโทฟุคุจิ สะพานไม้ Tsutenkyo ชมสวนหินเซนและธรรมชาติสงบ)',
      'ร้านอาหารสำรอง: Kendon Udon Fushimi (อุด้งเส้นสดทำมือ ซุปปลาแห้งเข้มข้นสไตล์เกียวโต)'
    ],
    links: [
      'https://maps.google.com/?q=Vermillion+cafe+Fushimi+Kyoto',
      'https://maps.google.com/?q=Tofukuji+Temple+Kyoto',
      'https://maps.google.com/?q=Kendon+Udon+Fushimi'
    ]
  },
  19: { // 9 ธ.ค. 11:30 น. Kyoto -> Osaka
    lines: [
      'ที่เที่ยวช้อปปิ้งสำรองระหว่างทาง: Eki Marche Shin-Osaka (ศูนย์รวมของฝากและร้านอาหารในสถานีชินโอซาก้า)',
      'ร้านอาหารสำรอง: Matsuba Kushikatsu Shin-Osaka (ร้านของทอดแบบยืนกินระดับตำนานในสถานี)',
      'คาเฟ่สำรอง: Doutor Coffee Shin-Osaka Station'
    ],
    links: [
      'https://maps.google.com/?q=Eki+Marche+Shin-Osaka',
      'https://maps.google.com/?q=Matsuba+Shin-Osaka',
      'https://maps.google.com/?q=Doutor+Coffee+Shin-Osaka'
    ]
  },
  20: { // 9 ธ.ค. 13:00 น. Quintessa Shinsaibashi
    lines: [
      'ที่เที่ยวสำรองใกล้ที่พัก: America-mura Osaka (หมู่บ้านอเมริกา แหล่งรวมแฟชั่นสตรีท เสื้อผ้ามือสอง และกราฟิตี)',
      'คาเฟ่สำรอง: LiLo Coffee Roasters (ร้านกาแฟ Specialty Coffee ชื่อดังแห่งย่านชินไซบาชิ)',
      'ร้านขนมสำรอง: Rikuro Ojisan Namba (ชีสเค้กคุณลุงเด้งดึ๋ง อบสดใหม่ส่งกลิ่นหอมสั่นกระดิ่ง)'
    ],
    links: [
      'https://maps.google.com/?q=America-mura+Osaka',
      'https://maps.google.com/?q=LiLo+Coffee+Roasters',
      'https://maps.google.com/?q=Rikuro+Ojisan+Namba+Main+Branch'
    ]
  },
  21: { // 9 ธ.ค. 15:00 น. Dotonbori
    lines: [
      'ร้านอาหารสำรอง 6: Mizuno Okonomiyaki (โอโคโนมิยากิมิชลินบิบกูร์มองด์)',
      'ร้านอาหารสำรอง 7: Ichiran Ramen Dotonbori (ราเมนข้อสอบสาขาริมคลองโดทงโบริ)',
      'ที่เที่ยวสำรอง: Hozenji Yokocho (ตรอกหินโบราณและรูปปั้นพระฟุโดเมียวโอะปกคลุมด้วยมอสเขียว)'
    ],
    links: [
      'https://maps.google.com/?q=Mizuno+Okonomiyaki',
      'https://maps.google.com/?q=Ichiran+Dotonbori',
      'https://maps.google.com/?q=Hozenji+Yokocho+Osaka'
    ]
  },
  22: { // 10 ธ.ค. 07:00 น. Kyoto Tour Departure
    lines: [
      'คาเฟ่อาหารเช้าสำรอง: Komeda\'s Coffee Shinsaibashi (เปิดเช้า สั่งกาแฟแถมเซตขนมปังปิ้งไข่ต้มฟรี)',
      'ร้านกาแฟสปีดสำรอง: Doutor Coffee Shinsaibashi',
      'จุดนัดพบสำรอง: Namba Station Tourist Information Center'
    ],
    links: [
      'https://maps.google.com/?q=Komedas+Coffee+Shinsaibashi',
      'https://maps.google.com/?q=Doutor+Coffee+Shinsaibashi',
      'https://maps.google.com/?q=Namba+Station+Tourist+Information'
    ]
  },
  23: { // 10 ธ.ค. 18:00 น. Umeda Sky Building
    lines: [
      'ที่เที่ยวสำรอง: เดินห้าง Grand Front Osaka',
      'ร้านขนมสำรอง: Harbs Umeda (เค้กผลไม้เครปพันชั้นชื่อดัง)',
      'ร้านอาหารสำรอง: Kiji Okonomiyaki Umeda (โอโคโนมิยากิสูตรดั้งเดิมในตรอกโบราณ Takimi Koji ใต้ตึกสกาย)',
      'จุดชมวิวสำรอง: HEP FIVE Ferris Wheel (ชิงช้าสวรรค์สีแดงยักษ์บนดาดฟ้าห้างใจกลางอุเมดะ)'
    ],
    links: [
      'https://maps.google.com/?q=Grand+Front+Osaka',
      'https://maps.google.com/?q=Harbs+Umeda',
      'https://maps.google.com/?q=Kiji+Okonomiyaki+Umeda+Sky+Building',
      'https://maps.google.com/?q=HEP+FIVE+Ferris+Wheel'
    ]
  },
  24: { // 11 ธ.ค. 08:30 น. Nara Park
    lines: [
      'ที่เที่ยวสำรอง: ศาลเจ้าโคมไฟโบราณ Kasuga Taisha Shrine',
      'คาเฟ่สำรอง: Rokumei Coffee Co. Nara (แชมป์บาริสต้าคั่วกาแฟ คาเฟ่ Specialty ประจำเมืองนารา)',
      'ร้านอาหารสำรอง: Shizuka Kamameshi Nara (ข้าวอบหม้อโบราณคิวยาวหน้าสวนนารา)'
    ],
    links: [
      'https://maps.google.com/?q=Kasuga+Taisha+Nara',
      'https://maps.google.com/?q=Rokumei+Coffee+Nara',
      'https://maps.google.com/?q=Shizuka+Koen-ten+Nara'
    ]
  },
  25: { // 11 ธ.ค. 12:30 น. Honmachi
    lines: [
      'ร้านอาหารสำรอง 8: Curry House Nishimoto (แกงกะหรี่เนื้อทอดสไตล์โฮมเมด)',
      'คาเฟ่สำรอง: Wad Omotenashi Cafe (คาเฟ่ชาเขียวชงสดและขนมดังโงะย่างเตาถ่านส่วนตัว)',
      'ที่เที่ยวสำรอง: Utsubo Park Osaka (สวนอุสึโบะ สวนกว้างร่มรื่นและย่านคาเฟ่ชิคๆ ของโอซาก้า)'
    ],
    links: [
      'https://maps.google.com/?q=Curry+House+Nishimoto+Osaka',
      'https://maps.google.com/?q=Wad+Omotenashi+Cafe+Osaka',
      'https://maps.google.com/?q=Utsubo+Park+Osaka'
    ]
  },
  26: { // 11 ธ.ค. 14:00 น. Korea Town
    lines: [
      'ร้านอาหารสำรอง 9: ปิ้งย่างเกาหลี / หมูย่างเกาหลีรสเด็ดย่าน Tsuruhashi',
      'คาเฟ่เกาหลีสำรอง: Cafe N2 Tsuruhashi (คาเฟ่สไตล์มินิมอลเกาหลี ครอฟเฟิลและครีมลาเต้)',
      'ร้านของฝากสำรอง: Tsuruhashi Wholesale Market (ตลาดค้าส่งกิมจิและอาหารเกาหลีแท้ๆ)'
    ],
    links: [
      'https://maps.google.com/?q=Tsuruhashi+Korean+Yakiniku+Osaka',
      'https://maps.google.com/?q=Cafe+N2+Tsuruhashi',
      'https://maps.google.com/?q=Tsuruhashi+Market'
    ]
  },
  27: { // 11 ธ.ค. 16:30 น. Shinsaibashi Recycle
    lines: [
      'ร้านของมือสองเสริม 3: Book-Off Plus / Book-Off Super Bazaar Namba',
      'ร้านของมือสองเสริม 4: Kindal Shinsaibashi Amerikamura',
      'คาเฟ่สำรอง: Brooklyn Roasting Company Namba (คาเฟ่ริมทางรถไฟ บรรยากาศดิบเท่สไตล์นิวยอร์ก)',
      'ร้านของสะสมสำรอง: Joshin Super Kids Land Main Store Nipponbashi (สวรรค์กันดั้มและโมเดลรถไฟ)'
    ],
    links: [
      'https://maps.google.com/?q=BookOff+Plus+Namba+Osaka',
      'https://maps.google.com/?q=Kindal+Shinsaibashi+Amerikamura',
      'https://maps.google.com/?q=Brooklyn+Roasting+Company+Namba',
      'https://maps.google.com/?q=Joshin+Super+Kids+Land+Main+Store'
    ]
  },
  28: { // 12 ธ.ค. 10:00 น. Kobe Kitano
    lines: [
      'ร้านอาหารสำรอง 10: Steak Ishida Kobe (สเต๊กเนื้อโกเบพรีเมียม)',
      'ที่เที่ยวสำรอง: นั่งกระเช้าลอยฟ้า Kobe Nunobiki Ropeway ชมสวนสมุนไพรและวิวมุมสูง',
      'คาเฟ่ประวัติศาสตร์สำรอง: Starbucks Coffee Kobe Kitano Ijinkan (สตาร์บัคส์บ้านวิกตอเรียนปี 1907)',
      'ร้านเบเกอรี่สำรอง: Cafe Freundlieb Kobe (คาเฟ่โบสถ์เก่า แซนด์วิชและพายผีเสื้อชื่อดัง)'
    ],
    links: [
      'https://maps.google.com/?q=Steak+Ishida+Kobe',
      'https://maps.google.com/?q=Kobe+Nunobiki+Ropeway',
      'https://maps.google.com/?q=Starbucks+Coffee+Kobe+Kitano+Ijinkan',
      'https://maps.google.com/?q=Cafe+Freundlieb+Kobe'
    ]
  },
  29: { // 12 ธ.ค. 13:00 น. Kobe Chinatown
    lines: [
      'ที่เที่ยวสำรองในโกเบ 1: เดินรับลมทะเลที่ห้าง Kobe Harborland',
      'ที่เที่ยวสำรองในโกเบ 2: ถ่ายรูปคู่กับป้าย BE KOBE ที่ Meriken Park',
      'คาเฟ่ขนมหวานสำรอง: Morozoff Kobe Main Store (ชีสเค้กและพุดดิ้งคัสตาร์ดระดับตำนานของเมืองโกเบ)',
      'จุดชมวิวสำรอง: Kobe Port Tower (หอคอยสีแดงทรงกลองญี่ปุ่นสัญลักษณ์แห่งอ่าวโกเบ)'
    ],
    links: [
      'https://maps.google.com/?q=Kobe+Harborland',
      'https://maps.google.com/?q=Meriken+Park',
      'https://maps.google.com/?q=Morozoff+Kobe+Main+Store',
      'https://maps.google.com/?q=Kobe+Port+Tower'
    ]
  },
  30: { // 12 ธ.ค. 15:00 น. Kobe -> Osaka
    lines: [
      'ร้านอาหารสำรอง: Yaekatsu Kushikatsu (คุชิคัตสึทอดไม่อมน้ำมันเจ้าดังย่านชินเซไก)',
      'ที่เที่ยวสำรอง: Tsutenkaku Tower & Slider (หอคอยซึเทนคาคุและสไลเดอร์ยักษ์ Tower Slider)',
      'คาเฟ่สำรอง: Sennari Kissa Shinsekai (คาเฟ่ย้อนยุคโชวะ ชิมพาร์เฟต์ผลไม้และกาแฟโบราณ)'
    ],
    links: [
      'https://maps.google.com/?q=Yaekatsu',
      'https://maps.google.com/?q=Tsutenkaku+Tower+Osaka',
      'https://maps.google.com/?q=Sennari+Kissa+Shinsekai'
    ]
  },
  31: { // 13 ธ.ค. 09:00 น. Minoh Falls
    lines: [
      'แผนสำรองการเดินทาง: นั่งแท็กซี่ขึ้นไปใกล้จุดชมน้ำตกได้โดยตรงสำหรับผู้ที่ไม่อยากเดินไกล',
      'คาเฟ่สำรอง: Yamamoto Coffee Minoh (ร้านกาแฟคั่วบดริมลำธารหุบเขามิโนะ)',
      'ที่เที่ยวธรรมชาติสำรอง: Minoh Park Insect Museum (พิพิธภัณฑ์ธรรมชาติและโดมผีเสื้อเขตร้อนกลางป่า)'
    ],
    links: [
      'https://maps.google.com/?q=Minoh+Falls',
      'https://maps.google.com/?q=Yamamoto+Coffee+Minoh',
      'https://maps.google.com/?q=Minoh+Park+Insect+Museum'
    ]
  },
  32: { // 13 ธ.ค. 11:30 น. Katsuoji Temple
    lines: [
      'ที่เที่ยวสำรอง: ถ่ายรูปมุมไฮไลต์สวนน้ำตกและสระน้ำกลางวัดดารุมะ Katsuoji',
      'ร้านอาหาร/ของว่างสำรอง: Katsuoji Daruma Teahouse (จิบชาร้อนและทานโมจิตุ๊กตาดารุมะนำโชค)',
      'จุดชมวิวสำรอง: Meiji no Mori Minoh Quasi-National Park'
    ],
    links: [
      'https://maps.google.com/?q=Katsuoji+Temple+Minoh',
      'https://maps.google.com/?q=Katsuoji+Teahouse',
      'https://maps.google.com/?q=Meiji+no+Mori+Minoh'
    ]
  },
  33: { // 13 ธ.ค. 14:00 น. Ryuanji Temple
    lines: [
      'ที่เที่ยวสำรองในมิโนะ: แวะแช่น้ำพุร้อนบ่อแช่เท้าหน้าสถานี Minoh Station Footbath (Yuzuru-an)',
      'คาเฟ่สำรอง: Franc et elegant Yuzuru Cafe (คาเฟ่ขนมยูซุขึ้นชื่อของเมืองมิโนะ)',
      'ร้านขนมสำรอง: Hisakuni Soushindou (ร้านต้นตำรับโมมิจิเทมปุระทอดสดสูตรกว่า 80 ปี)'
    ],
    links: [
      'https://maps.google.com/?q=Minoh+Station+Footbath',
      'https://maps.google.com/?q=Minoh+Station+Yuzuru+Cafe',
      'https://maps.google.com/?q=Hisakuni+Soushindou+Minoh'
    ]
  },
  34: { // 13 ธ.ค. 17:00 น. Osaka Castle
    lines: [
      'แผนสำรอง (หากไม่แวะปราสาท): เดินทางตรงกลับเข้าย่านชินไซบาชิ พักผ่อนเก็บของที่โรงแรม Quintessa',
      'คาเฟ่สำรอง: Miraiza Osaka-jo (อาคารประวัติศาสตร์สไตล์ยุโรปหน้าปราสาท รวมคาเฟ่และร้านขนม)',
      'ร้านอาหารสำรอง: The Landmark Square Osaka (มื้ออาหารพร้อมวิวตัวปราสาทโอซาก้าแบบพาโนรามา)'
    ],
    links: [
      'https://maps.google.com/?q=Quintessa+Hotel+Osaka+Shinsaibashi',
      'https://maps.google.com/?q=Miraiza+Osakajo',
      'https://maps.google.com/?q=The+Landmark+Square+Osaka'
    ]
  },
  35: { // 13 ธ.ค. 18:30 น. On Yasai Namba
    lines: [
      'ร้านอาหารสำรอง 11: ไก่ย่างเสียบไม้เตาถ่านชื่อดังของคนท้องถิ่น Yakitori Rikimaru Namba',
      'คาเฟ่ของหวานสำรอง: Gram Cafe & Pancakes Shinsaibashi (แพนเค้กซูเฟล่ 3 ชั้นนุ่มเด้งละลายในปาก)',
      'ร้านราเมนดึกสำรอง: Zundoya Ramen Shinsaibashi (ราเมนซุปกระดูกหมูเข้มข้นเปิด 24 ชม.)'
    ],
    links: [
      'https://maps.google.com/?q=Yakitori+Rikimaru+Osaka',
      'https://maps.google.com/?q=Gram+Cafe+Pancakes+Shinsaibashi',
      'https://maps.google.com/?q=Zundoya+Shinsaibashi'
    ]
  },
  36: { // 14 ธ.ค. 11:00 น. Odysis Suites Rinku
    lines: [
      'แผนสำรอง: พักผ่อนและเตรียมสัมภาระสำหรับวันเดินทางกลับในห้องพัก Odysis Suites',
      'ร้านกาแฟสำรอง: Tully\'s Coffee Rinku Pleasure Town Seacle',
      'จุดเดินเล่นสำรอง: Rinku Park Symbol Green (สวนสาธารณะริมอ่าว ลานปิคนิคชมวิวสะพานข้ามทะเล)'
    ],
    links: [
      'https://maps.google.com/?q=Odysis+Suites+Osaka+Airport+Hotel',
      'https://maps.google.com/?q=Tullys+Coffee+Seacle+Rinku',
      'https://maps.google.com/?q=Rinku+Park+Symbol+Green'
    ]
  },
  37: { // 14 ธ.ค. 13:00 น. Rinku Premium Outlets
    lines: [
      'ร้านอาหารสำรอง 12: Kura Sushi Rinku Town (ซูชิสายพานจานละ 100 เยนยอดฮิต)',
      'ที่เที่ยวสำรอง: เดินห้างติดสถานี Rinku Pleasure Town Seacle และขึ้นชิงช้าสวรรค์ยักษ์',
      'คาเฟ่สำรอง: Godiva Cafe Rinku Outlets (ช็อกโกแลตปั่นเข้มข้นและซอฟต์เสิร์ฟพรีเมียม)',
      'ร้านอาหารสำรองเสริม: Bagel & Bagel Rinku Outlets (เบเกิลแซนด์วิชและกาแฟพักช้อป)'
    ],
    links: [
      'https://maps.google.com/?q=Kura+Sushi+Rinku',
      'https://maps.google.com/?q=Seacle',
      'https://maps.google.com/?q=Godiva+Rinku+Premium+Outlets',
      'https://maps.google.com/?q=Bagel+and+Bagel+Rinku+Outlets'
    ]
  },
  38: { // 14 ธ.ค. 17:00 น. Marble Beach
    lines: [
      'แผนสำรอง: เดินเล่นชมวิวพระอาทิตย์ตกดินดวงโตๆ ริมหาดหินอ่อนสีขาว Marble Beach',
      'คาเฟ่วิวทะเลสำรอง: Starbucks Coffee Rinku Outlets Seaside (สตาร์บัคส์ริมทะเล นั่งชมแสงทไวไลท์)',
      'จุดถ่ายรูปสำรอง: สวนหินอ่อน Love The Beach Monument (ป้ายรูปหัวใจแลนด์มาร์กหาดหินอ่อน)'
    ],
    links: [
      'https://maps.google.com/?q=Marble+Beach+Rinku',
      'https://maps.google.com/?q=Starbucks+Coffee+Rinku+Outlets+Seaside',
      'https://maps.google.com/?q=Marble+Beach+Heart+Monument'
    ]
  },
  39: { // 14 ธ.ค. 18:30 น. Tennen Onsen Rinkunoyu
    lines: [
      'กิจกรรมสำรอง: เดินเล่นพักผ่อนรับลมที่สวนริมชายฝั่ง Rinku Park ชมแสงไฟรันเวย์สนามบินคันไซ',
      'ร้านอาหารสำรอง: Izakaya Maru Rinku (อิซากายะซีฟู้ดและปลาสดจากอ่าวโอซาก้า)',
      'ร้านขนมสำรอง: Mister Donut Rinku Seacle'
    ],
    links: [
      'https://maps.google.com/?q=Rinku+Park',
      'https://maps.google.com/?q=Rinku+Seafood+Izakaya',
      'https://maps.google.com/?q=Mister+Donut+Rinku+Seacle'
    ]
  },
  40: { // 15 ธ.ค. 08:30 น. Check-out Odysis
    lines: [
      'แผนสำรอง: จัดกระเป๋าเดินทางและเตรียมตัวออกเดินทางข้ามไปสนามบิน KIX ล่วงหน้า 3 ชั่วโมง',
      'คาเฟ่อาหารเช้าสำรอง: Cafe de Crié Rinku-Town Station (เซตอาหารเช้า ครัวซองต์และกาแฟร้อน)',
      'ร้านสะดวกซื้อสำรอง: 7-Eleven Rinku-Town Station (ซื้อขนมของฝากรอบสุดท้าย)'
    ],
    links: [
      'https://maps.google.com/?q=Odysis+Suites+Osaka+Airport+Hotel',
      'https://maps.google.com/?q=Cafe+de+Crie+Rinku+Town+Station',
      'https://maps.google.com/?q=7-Eleven+Rinku+Town+Station'
    ]
  },
  41: { // 15 ธ.ค. 09:00 น. Rinku to KIX
    lines: [
      'แผนสำรอง: เดินทางถึงสนามบินล่วงหน้า 3 ชั่วโมง เพื่อเตรียมตัวเช็กอินสัมภาระสำหรับเที่ยวบิน 12:00 น.',
      'จุดชมวิวสำรอง: KIX Observation Hall Sky View (จุดชมเครื่องบินขึ้นลงแบบใกล้ชิดพร้อมพิพิธภัณฑ์การบิน)',
      'คาเฟ่สำรอง: PRONTO KIX Airport Terminal 1 (คาเฟ่และเบเกอรี่นั่งรอเช็กอิน ชั้น 3)'
    ],
    links: [
      'https://maps.google.com/?q=Kansai+International+Airport',
      'https://maps.google.com/?q=KIX+Observation+Hall+Sky+View',
      'https://maps.google.com/?q=PRONTO+Kansai+Airport'
    ]
  },
  42: { // 15 ธ.ค. 12:00 น. Flight KIX -> TPE -> BKK
    lines: [
      'ร้านอาหารสำรอง (ช่วงต่อเครื่องไทเป TPE): Chun Shui Tang TPE Airport (ต้นตำรับชานมไข่มุกและบะหมี่เนื้อไต้หวัน)',
      'คาเฟ่สำรอง (สนามบินเถาหยวน): Starbucks Taoyuan Airport Terminal 1',
      'จุดพักผ่อนสำรอง: Plaza Premium Lounge TPE (ห้องรับรองพร้อมโซนนอนพักระหว่างต่อเครื่อง)'
    ],
    links: [
      'https://maps.google.com/?q=Chun+Shui+Tang+Taoyuan+Airport',
      'https://maps.google.com/?q=Starbucks+Taoyuan+Airport+Terminal+1',
      'https://maps.google.com/?q=Plaza+Premium+Lounge+Taoyuan+Airport'
    ]
  }
};

async function run() {
  console.log('Fetching all 42 itinerary items from Supabase...');
  const { data: items, error } = await supabase
    .from('itinerary_items')
    .select('*')
    .eq('trip_id', TRIP_ID)
    .neq('date_label', '__meta_trip_data__')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Fetch error:', error);
    return;
  }

  console.log(`Fetched ${items.length} items. Updating with 2-3 backup spots per item...`);

  let updatedCount = 0;

  for (const it of items) {
    const num = it.sort_order;
    const patch = ENHANCED_BACKUPS[num];

    if (patch) {
      const newPlan = patch.lines.join('\n');
      const newLinks = patch.links;

      // Sanity check: Ensure line count exactly matches link count!
      if (patch.lines.length !== patch.links.length) {
        console.error(`ERROR: Item #${num} lines count (${patch.lines.length}) != links count (${patch.links.length})`);
        return;
      }

      const { error: upErr } = await supabase
        .from('itinerary_items')
        .update({
          backup_plan: newPlan,
          backup_links: newLinks
        })
        .eq('id', it.id);

      if (upErr) {
        console.error(`Failed to update item #${num}:`, upErr);
      } else {
        updatedCount++;
        console.log(`[Updated #${num}] ${it.date_label} ${it.time_slot} | Added ${patch.lines.length} backup spots`);
      }
    }
  }

  console.log(`\nAll ${updatedCount} items successfully updated in Supabase database!`);

  // Update scripts/v4_parsed_items.json as well
  console.log('Synchronizing scripts/v4_parsed_items.json...');
  const v4Items = JSON.parse(fs.readFileSync('scripts/v4_parsed_items.json', 'utf-8'));
  v4Items.forEach((it, idx) => {
    const num = idx + 1;
    const patch = ENHANCED_BACKUPS[num];
    if (patch) {
      it.backup_plan = patch.lines.join('\n');
      it.backup_links = patch.links;
    }
  });

  fs.writeFileSync('scripts/v4_parsed_items.json', JSON.stringify(v4Items, null, 2), 'utf-8');
  console.log('scripts/v4_parsed_items.json successfully synchronized!');
}

run();
