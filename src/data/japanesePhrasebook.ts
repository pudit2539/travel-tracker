// src/data/japanesePhrasebook.ts

export type PhraseCategoryId =
  | 'all'
  | 'favorites'
  | 'conbini'
  | 'food'
  | 'shopping'
  | 'transport'
  | 'hotel'
  | 'numbers'
  | 'kawaii'
  | 'emergency';

export interface JapanesePhraseItem {
  id: string;
  category: Exclude<PhraseCategoryId, 'all' | 'favorites'>;
  emoji: string;
  japanese: string;
  kana: string;
  romaji: string;
  thaiPhonetic: string;
  thai: string;
  context: string;
  staffReplyHint?: string;
}

export const PHRASE_CATEGORY_META: Array<{
  id: PhraseCategoryId;
  label: string;
  emoji: string;
}> = [
  { id: 'all', label: 'ทั้งหมด', emoji: '📚' },
  { id: 'favorites', label: 'ที่บันทึกไว้', emoji: '⭐' },
  { id: 'conbini', label: 'มินิมาร์ท', emoji: '🏪' },
  { id: 'food', label: 'ร้านอาหาร', emoji: '🍜' },
  { id: 'shopping', label: 'ช้อปปิ้ง', emoji: '🛍️' },
  { id: 'transport', label: 'รถไฟ/ทาง', emoji: '🚃' },
  { id: 'hotel', label: 'โรงแรม', emoji: '🏨' },
  { id: 'numbers', label: 'นับจำนวน', emoji: '🔢' },
  { id: 'kawaii', label: 'คำน่ารักๆ', emoji: '💖' },
  { id: 'emergency', label: 'ฉุกเฉิน', emoji: '🆘' },
];

export const JAPANESE_PHRASEBOOK: JapanesePhraseItem[] = [
  // 1. Conbini
  {
    id: 'c1',
    category: 'conbini',
    emoji: '🛍️',
    japanese: '袋をお願いします。',
    kana: 'ふくろを おねがいします。',
    romaji: 'Fukuro o onegaishimasu.',
    thaiPhonetic: 'ฟุ-คุ-โระ โอะ โอะ-เนะ-ไก-ชิ-มัส',
    thai: 'ขอรับถุงพลาสติกด้วยครับ/ค่ะ',
    context: 'ใช้ตอบแคชเชียร์เวลาถามว่าเอาถุงไหม (Fukuro wa goriyou desu ka?)',
    staffReplyHint: 'พนักงานอาจถาม: 袋はご利用ですか？ (รับถุงไหมคะ?)',
  },
  {
    id: 'c2',
    category: 'conbini',
    emoji: '♻️',
    japanese: '袋は大丈夫です。',
    kana: 'ふくろは だいじょうぶです。',
    romaji: 'Fukuro wa daijōbu desu.',
    thaiPhonetic: 'ฟุ-คุ-โระ วะ ได-โจ-บุ เดส',
    thai: 'ไม่รับถุงครับ/ค่ะ (มีถุงผ้ามาเอง)',
    context: 'ปฏิเสธรับถุงอย่างสุภาพแบบคนญี่ปุ่นใช้จริง',
  },
  {
    id: 'c3',
    category: 'conbini',
    emoji: '🍱',
    japanese: '温めてください。',
    kana: 'あたためて ください。',
    romaji: 'Atatamete kudasai.',
    thaiPhonetic: 'อะ-ตะ-ตะ-เมะ-เตะ คุ-ดะ-ไซ',
    thai: 'ช่วยอุ่นร้อน (เวฟ) ให้ด้วยครับ/ค่ะ',
    context: 'เวลาซื้อข้าวกล่อง เบนโตะ หรือไก่ทอดในเซเว่น/ลอว์สัน',
    staffReplyHint: 'พนักงานจะถาม: お温めしますか？ (อุ่นไหมคะ?)',
  },
  {
    id: 'c4',
    category: 'conbini',
    emoji: '❄️',
    japanese: '温めなくて大丈夫です。',
    kana: 'あたためなくて だいじょうぶです。',
    romaji: 'Atatamenakute daijōbu desu.',
    thaiPhonetic: 'อะ-ตะ-ตะ-เมะ-นะ-คุ-เตะ ได-โจ-บุ เดส',
    thai: 'ไม่ต้องอุ่นครับ/ค่ะ',
    context: 'บอกพนักงานว่ายังไม่ต้องเวฟ เดี๋ยวกลับไปอุ่นที่โรงแรม',
  },
  {
    id: 'c5',
    category: 'conbini',
    emoji: '🥢',
    japanese: 'お箸をお願いします。',
    kana: 'おはしを おねがいします。',
    romaji: 'Ohashi o onegaishimasu.',
    thaiPhonetic: 'โอะ-ฮะ-ชิ โอะ โอะ-เนะ-ไก-ชิ-มัส',
    thai: 'ขอตะเกียบด้วยครับ/ค่ะ',
    context: 'ขอตะเกียบเพิ่มเวลาซื้อบะหมี่ถ้วยหรือข้าวกล่อง',
  },
  {
    id: 'c6',
    category: 'conbini',
    emoji: '🥄',
    japanese: 'スプーンをください。',
    kana: 'スプーンを ください。',
    romaji: 'Supūn o kudasai.',
    thaiPhonetic: 'สุ-ปูน โอะ คุ-ดะ-ไซ',
    thai: 'ขอช้อนหน่อยครับ/ค่ะ',
    context: 'ขอช้อนทานพุดดิ้ง โยเกิร์ต หรือข้าวแกงกะหรี่',
  },

  // 2. Food & Cafe
  {
    id: 'f1',
    category: 'food',
    emoji: '👆',
    japanese: 'これを1つお願いします。',
    kana: 'これを ひとつ おねがいします。',
    romaji: 'Kore o hitotsu onegaishimasu.',
    thaiPhonetic: 'โคะ-เระ โอะ ฮิ-โตะ-สึ โอะ-เนะ-ไก-ชิ-มัส',
    thai: 'เอาอันนี้ 1 ที่ครับ/ค่ะ',
    context: 'ชี้รูปในเมนูแล้วพูดประโยคนี้ รอดตายทุกร้านในญี่ปุ่น!',
  },
  {
    id: 'f2',
    category: 'food',
    emoji: '🍽️',
    japanese: '店内で食べます。',
    kana: 'てんないで たべます。',
    romaji: 'Tennai de tabemasu.',
    thaiPhonetic: 'เท็น-ไน เดะ ทะ-เบะ-มัส',
    thai: 'ทานที่ร้านครับ/ค่ะ (Eat-in)',
    context: 'ตอบพนักงานเวลาสั่งคาเฟ่หรือร้านฟาสต์ฟู้ด (VAT 10%)',
  },
  {
    id: 'f3',
    category: 'food',
    emoji: '🥡',
    japanese: '持ち帰りでお願いします。',
    kana: 'もちかえりで おねがいします。',
    romaji: 'Mochikaeri de onegaishimasu.',
    thaiPhonetic: 'โมะ-จิ-คะ-เอะ-ริ เดะ โอะ-เนะ-ไก-ชิ-มัส',
    thai: 'ห่อกลับบ้านครับ/ค่ะ (Takeout)',
    context: 'สั่งกลับไปกินที่โรงแรม (ในญี่ปุ่นเสียภาษี 8% ถูกกว่านั่งกิน)',
  },
  {
    id: 'f4',
    category: 'food',
    emoji: '📖',
    japanese: '英語のメニューはありますか？',
    kana: 'えいごの メニューは ありますか？',
    romaji: 'Eigo no menyū wa arimasu ka?',
    thaiPhonetic: 'เอ-โกะ โนะ เมะ-นิว วะ อะ-ริ-มัส ก๊ะ',
    thai: 'มีเมนูภาษาอังกฤษไหมครับ/ค่ะ?',
    context: 'ใช้ถามพนักงานทันทีเมื่อเข้าร้านอาหารท้องถิ่น',
  },
  {
    id: 'f5',
    category: 'food',
    emoji: '⭐',
    japanese: 'おすすめは何ですか？',
    kana: 'おすすめは なんですか？',
    romaji: 'Osusume wa nan desu ka?',
    thaiPhonetic: 'โอะ-สุ-สุ-เมะ วะ นัน เดส ก๊ะ',
    thai: 'มีเมนูแนะนำอะไรบ้างครับ/ค่ะ?',
    context: 'ถามเชฟหรือพนักงานเมื่ออยากสั่งจานซิกเนเจอร์ของร้าน',
  },
  {
    id: 'f6',
    category: 'food',
    emoji: '💧',
    japanese: 'お水をください。',
    kana: 'おみずを ください。',
    romaji: 'Omizu o kudasai.',
    thaiPhonetic: 'โอะ-มิ-ซึ โอะ คุ-ดะ-ไซ',
    thai: 'ขอน้ำเปล่าหน่อยครับ/ค่ะ',
    context: 'ร้านอาหารในญี่ปุ่นส่วนใหญ่เสิร์ฟน้ำเปล่าเย็นฟรี',
  },
  {
    id: 'f7',
    category: 'food',
    emoji: '🧾',
    japanese: 'お会計をお願いします。',
    kana: 'おかいけいを おねがいします。',
    romaji: 'Okaikei o onegaishimasu.',
    thaiPhonetic: 'โอะ-ไค-เค โอะ โอะ-เนะ-ไก-ชิ-มัส',
    thai: 'คิดเงินด้วยครับ/ค่ะ (เช็คบิล)',
    context: 'ยกมือเรียกพนักงานตอนทานเสร็จแล้ว',
  },
  {
    id: 'f8',
    category: 'food',
    emoji: '🌿',
    japanese: 'わさび抜きでお願いします。',
    kana: 'わさびぬきで おねがいします。',
    romaji: 'Wasabi nuki de onegaishimasu.',
    thaiPhonetic: 'วะ-ซะ-บิ นุ-คิ เดะ โอะ-เนะ-ไก-ชิ-มัส',
    thai: 'ขอไม่ใส่วาซาบิครับ/ค่ะ',
    context: 'ใช้ตอนสั่งซูชิหรือข้าวหน้าปลาดิบ',
  },
  {
    id: 'f9',
    category: 'food',
    emoji: '🙏',
    japanese: 'ごちそうさまでした！',
    kana: 'ごちそうさまでした！',
    romaji: 'Gochisōsama deshita!',
    thaiPhonetic: 'โกะ-จิ-โซ-ซะ-มะ เดะ-ชิ-ตะ',
    thai: 'ขอบคุณสำหรับมื้ออร่อยครับ/ค่ะ!',
    context: 'พูดตอนลุกออกจากร้าน คนญี่ปุ่นจะยิ้มและประทับใจมาก',
  },

  // 3. Shopping
  {
    id: 's1',
    category: 'shopping',
    emoji: '🛂',
    japanese: '免税できますか？',
    kana: 'めんぜい できますか？',
    romaji: 'Menzei dekimasu ka?',
    thaiPhonetic: 'เม็น-เซ เดะ-คิ-มัส ก๊ะ',
    thai: 'ทำเรื่อง Tax-Free ได้ไหมครับ/ค่ะ?',
    context: 'ถามแคชเชียร์เมื่อช้อปถึงเกณฑ์ ¥5,500 (อย่าลืมพกพาสปอร์ตตัวจริง)',
  },
  {
    id: 's2',
    category: 'shopping',
    emoji: '✨',
    japanese: '新しいものはありますか？',
    kana: 'あたらしい ものは ありますか？',
    romaji: 'Atarashii mono wa arimasu ka?',
    thaiPhonetic: 'อะ-ตะ-ระ-ชี โมะ-โนะ วะ อะ-ริ-มัส ก๊ะ',
    thai: 'มีชิ้นใหม่ในกล่องไหมครับ/ค่ะ? (ไม่เอาตัวโชว์)',
    context: 'ใช้ซื้อรองเท้า กระเป๋า หรือของสะสม',
  },
  {
    id: 's3',
    category: 'shopping',
    emoji: '👗',
    japanese: '試着してもいいですか？',
    kana: 'しちゃく しても いいですか？',
    romaji: 'Shichaku shitemo ii desu ka?',
    thaiPhonetic: 'ชิ-จะ-คุ ชิ-เตะ-โมะ อี้ เดส ก๊ะ',
    thai: 'ขอลองสวมดูได้ไหมครับ/ค่ะ?',
    context: 'ขอลองเสื้อผ้าที่ Uniqlo / GU / ร้านแฟชั่น',
  },
  {
    id: 's4',
    category: 'shopping',
    emoji: '💴',
    japanese: 'これはいくらですか？',
    kana: 'これは いくらですか？',
    romaji: 'Kore wa ikura desu ka?',
    thaiPhonetic: 'โคะ-เระ วะ อิ-คุ-ระ เดส ก๊ะ',
    thai: 'อันนี้ราคาเท่าไหร่ครับ/ค่ะ?',
    context: 'ถามราคาสินค้าเมื่อหาป้ายราคาไม่เจอ',
  },
  {
    id: 's5',
    category: 'shopping',
    emoji: '💳',
    japanese: 'カードは使えますか？',
    kana: 'カードは つかえますか？',
    romaji: 'Kādo wa tsukaemasu ka?',
    thaiPhonetic: 'คา-โดะ วะ สึ-คะ-เอะ-มัส ก๊ะ',
    thai: 'ใช้บัตรเครดิต / Travel Card ได้ไหมครับ/ค่ะ?',
    context: 'ถามร้านค้าขนาดเล็กหรือร้านตลาดก่อนสั่ง/จ่าย',
  },
  {
    id: 's6',
    category: 'shopping',
    emoji: '🧾',
    japanese: 'レシートをお願いします。',
    kana: 'レシートを おねがいします。',
    romaji: 'Reshīto o onegaishimasu.',
    thaiPhonetic: 'เร-ชี-โตะ โอะ โอะ-เนะ-ไก-ชิ-มัส',
    thai: 'ขอใบเสร็จด้วยครับ/ค่ะ',
    context: 'ขอใบเสร็จเก็บไว้สแกนเข้าแอปบันทึกค่าใช้จ่าย',
  },

  // 4. Transport
  {
    id: 't1',
    category: 'transport',
    emoji: '🚻',
    japanese: 'トイレはどこですか？',
    kana: 'トイレは どこですか？',
    romaji: 'Toire wa doko desu ka?',
    thaiPhonetic: 'โท-อิ-เระ วะ โดะ-โคะ เดส ก๊ะ',
    thai: 'ห้องน้ำอยู่ที่ไหนครับ/ค่ะ?',
    context: 'ประโยคฉุกเฉินยอดฮิตในสถานีรถไฟและห้างสรรพสินค้า',
  },
  {
    id: 't2',
    category: 'transport',
    emoji: '🚆',
    japanese: 'この電車は京都へ行きますか？',
    kana: 'この でんしゃは きょうとへ いきますか？',
    romaji: 'Kono densha wa Kyōto e ikimasu ka?',
    thaiPhonetic: 'โคะ-โนะ เด็น-ฉะ วะ เคียว-โตะ เอะ อิ-คิ-มัส ก๊ะ',
    thai: 'รถไฟขบวนนี้ไปเกียวโตไหมครับ/ค่ะ?',
    context: 'ถามนายสถานีหน้าชานชาลาเพื่อความชัวร์ (เปลี่ยนชื่อเมืองได้)',
  },
  {
    id: 't3',
    category: 'transport',
    emoji: '🛅',
    japanese: 'コインロッカーはどこですか？',
    kana: 'コインロッカーは どこですか？',
    romaji: 'Koin rokkā wa doko desu ka?',
    thaiPhonetic: 'โคะ-อิน ร็อก-กา วะ โดะ-โคะ เดส ก๊ะ',
    thai: 'ตู้ฝากกระเป๋าอยู่ตรงไหนครับ/ค่ะ?',
    context: 'ถามหาตู้ Coin Locker ในสถานี Kyoto / Osaka / Namba',
  },
  {
    id: 't4',
    category: 'transport',
    emoji: '🚕',
    japanese: 'ここまでお願いします。',
    kana: 'ここまで おねがいします。',
    romaji: 'Koko made onegaishimasu.',
    thaiPhonetic: 'โคะ-โคะ มะ-เดะ โอะ-เนะ-ไก-ชิ-มัส',
    thai: 'ช่วยไปส่งตรงนี้หน่อยครับ/ค่ะ',
    context: 'เปิดแผนที่หรือการ์ดโรงแรมให้คนขับแท็กซี่ดูแล้วพูดคำนี้',
  },
  {
    id: 't5',
    category: 'transport',
    emoji: '🚉',
    japanese: '出口はどこですか？',
    kana: 'でぐちは どこですか？',
    romaji: 'Deguchi wa doko desu ka?',
    thaiPhonetic: 'เดะ-กุ-จิ วะ โดะ-โคะ เดส ก๊ะ',
    thai: 'ทางออกอยู่ทางไหนครับ/ค่ะ?',
    context: 'หลงทางในสถานี Umeda หรือ Kyoto ใช้ถามหาทางออกได้เลย',
  },

  // 5. Hotel
  {
    id: 'h1',
    category: 'hotel',
    emoji: '🛎️',
    japanese: 'チェックインをお願いします。',
    kana: 'チェックインを おねがいします。',
    romaji: 'Chekkuin o onegaishimasu.',
    thaiPhonetic: 'เช็ก-คุ-อิน โอะ โอะ-เนะ-ไก-ชิ-มัส',
    thai: 'ขอเช็กอินเข้าพักครับ/ค่ะ',
    context: 'ยื่นพาสปอร์ตพร้อมใบจองให้พนักงานเคาน์เตอร์โรงแรม',
  },
  {
    id: 'h2',
    category: 'hotel',
    emoji: '🧳',
    japanese: '荷物を預かってもらえますか？',
    kana: 'にもつを あずかって もらえますか？',
    romaji: 'Nimotsu o azukatte moraemasu ka?',
    thaiPhonetic: 'นิ-โมะ-สึ โอะ อะ-สึ-คัต-เตะ โมะ-ระ-เอะ-มัส ก๊ะ',
    thai: 'ขอฝากกระเป๋าไว้ก่อนได้ไหมครับ/ค่ะ?',
    context: 'ฝากกระเป๋าที่โรงแรมก่อนเวลา Check-in หรือหลัง Check-out',
  },
  {
    id: 'h3',
    category: 'hotel',
    emoji: '📶',
    japanese: 'Wi-Fiのパスワードは何ですか？',
    kana: 'ワイファイの パスワードは なんですか？',
    romaji: 'Waifai no pasuwādo wa nan desu ka?',
    thaiPhonetic: 'ไว-ไฟ โนะ พะ-สุ-วา-โดะ วะ นัน เดส ก๊ะ',
    thai: 'รหัสผ่าน Wi-Fi คืออะไรครับ/ค่ะ?',
    context: 'ถามรหัส Wi-Fi ในโรงแรมหรือคาเฟ่',
  },

  // 6. Numbers & People
  {
    id: 'n1',
    category: 'numbers',
    emoji: '1️⃣',
    japanese: '1つ / 2つ / 3つ',
    kana: 'ひとつ / ふたつ / みっつ',
    romaji: 'Hitotsu / Futatsu / Mittsu',
    thaiPhonetic: 'ฮิ-โตะ-สึ (1) / ฟุ-ตะ-สึ (2) / มิต-สึ (3)',
    thai: '1 ชิ้น / 2 ชิ้น / 3 ชิ้น',
    context: 'ใช้นับจำนวนสิ่งของหรือสั่งอาหารเป็นจาน',
  },
  {
    id: 'n2',
    category: 'numbers',
    emoji: '👥',
    japanese: '2人です / 3人です / 4人です',
    kana: 'ふたりです / さんにんです / よにんです',
    romaji: 'Futari desu / Sannin desu / Yonin desu',
    thaiPhonetic: 'ฟุ-ตะ-ริ เดส (2 คน) / ซัน-นิน เดส (3 คน) / โยะ-นิน เดส (4 คน)',
    thai: 'มา 2 ท่าน / 3 ท่าน / 4 ท่านครับ/ค่ะ',
    context: 'ตอบพนักงานต้อนรับหน้าร้านอาหารเวลาถามจำนวนคน (Nan-mei sama?)',
    staffReplyHint: 'พนักงานจะถาม: 何名様ですか？ (มากี่ท่านคะ?)',
  },
  {
    id: 'n3',
    category: 'numbers',
    emoji: '🔁',
    japanese: 'もう1つください。',
    kana: 'もう ひとつ ください。',
    romaji: 'Mō hitotsu kudasai.',
    thaiPhonetic: 'โม ฮิ-โตะ-สึ คุ-ดะ-ไซ',
    thai: 'ขอเพิ่มอีก 1 ที่ครับ/ค่ะ',
    context: 'สั่งเมนูเดิมเพิ่มอีกจาน หรือขอแก้วน้ำ/ช้อนเพิ่ม',
  },

  // 7. Cute & Friendly (Kawaii)
  {
    id: 'k1',
    category: 'kawaii',
    emoji: '😋',
    japanese: 'すごく美味しいです！',
    kana: 'すごく おいしいです！',
    romaji: 'Sugoku oishii desu!',
    thaiPhonetic: 'สุ-โกะ-คุ โอะ-อิ-ชี เดส!',
    thai: 'อร่อยมากๆ เลยครับ/ค่ะ!',
    context: 'พูดชมเชฟหรือพนักงานร้านอาหาร ยิ้มแก้มปริแน่นอน',
  },
  {
    id: 'k2',
    category: 'kawaii',
    emoji: '🌸',
    japanese: 'かわいいですね！',
    kana: 'かわいい ですね！',
    romaji: 'Kawaii desu ne!',
    thaiPhonetic: 'คะ-วะ-อี้ เดส เน่ะ!',
    thai: 'น่ารักจังเลยนะคะ / ครับ!',
    context: 'ชมของฝาก น้องหมา/น้องแมว หรือขนมสวยๆ ในญี่ปุ่น',
  },
  {
    id: 'k3',
    category: 'kawaii',
    emoji: '🙇',
    japanese: 'すみません。',
    kana: 'すみません。',
    romaji: 'Sumimasen.',
    thaiPhonetic: 'สุ-มิ-มะ-เซ็น',
    thai: 'ขอโทษนะครับ/ค่ะ / ขอทางหน่อย / ขออนุญาตเรียก',
    context: 'คำมหัศจรรย์ใช้ได้ทุกสถานการณ์ ทั้งเรียกพนักงานและขอทาง',
  },
  {
    id: 'k4',
    category: 'kawaii',
    emoji: '💐',
    japanese: 'ありがとうございます！',
    kana: 'ありがとう ございます！',
    romaji: 'Arigatō gozaimasu!',
    thaiPhonetic: 'อะ-ริ-กะ-โต โกะ-ไซ-มัส!',
    thai: 'ขอบคุณมากๆ ครับ/ค่ะ!',
    context: 'กล่าวขอบคุณอย่างสุภาพทุกครั้งที่ได้รับความช่วยเหลือ',
  },
  {
    id: 'k5',
    category: 'kawaii',
    emoji: '📸',
    japanese: '写真を撮ってもいいですか？',
    kana: 'しゃしんを とっても いいですか？',
    romaji: 'Shashin o tottemo ii desu ka?',
    thaiPhonetic: 'ฉะ-ชิน โอะ ทต-เตะ-โมะ อี้ เดส ก๊ะ',
    thai: 'ขออนุญาตถ่ายรูปได้ไหมครับ/ค่ะ?',
    context: 'ใช้ถามร้านค้า วัด หรือศาลเจ้าก่อนยกกล้องถ่ายรูป',
  },

  // 8. Emergency & Help
  {
    id: 'e1',
    category: 'emergency',
    emoji: '🆘',
    japanese: 'すみません、助けてください。',
    kana: 'すみません、たすけて ください。',
    romaji: 'Sumimasen, tasukete kudasai.',
    thaiPhonetic: 'สุ-มิ-มะ-เซ็น, ทะ-สุ-เคะ-เตะ คุ-ดะ-ไซ',
    thai: 'ขอโทษครับ/ค่ะ ช่วยฉันหน่อยได้ไหม?',
    context: 'ใช้ขอความช่วยเหลือเร่งด่วนเมื่อเกิดเหตุฉุกเฉิน',
  },
  {
    id: 'e2',
    category: 'emergency',
    emoji: '🔍',
    japanese: '忘れ物をしました。',
    kana: 'わすれものを しました。',
    romaji: 'Wasuremono o shimashita.',
    thaiPhonetic: 'วะ-สุ-เระ-โมะ-โนะ โอะ ชิ-มะ-ชิ-ตะ',
    thai: 'ฉันลืมของไว้ / ทำของหายครับ/ค่ะ',
    context: 'ติดต่อห้อง Lost & Found ของสถานีรถไฟหรือโรงแรม',
  },
  {
    id: 'e3',
    category: 'emergency',
    emoji: '🤒',
    japanese: '体調が悪いです。',
    kana: 'たいちょうが わるいです。',
    romaji: 'Taichō ga warui desu.',
    thaiPhonetic: 'ไท-โช กะ วะ-รุย เดส',
    thai: 'ฉันรู้สึกไม่ค่อยสบายครับ/ค่ะ',
    context: 'แจ้งเจ้าหน้าที่เมื่อต้องการความช่วยเหลือทางการแพทย์',
  },
  {
    id: 'e4',
    category: 'emergency',
    emoji: '💬',
    japanese: '英語を話せますか？',
    kana: 'えいごを はなせますか？',
    romaji: 'Eigo o hanasemasu ka?',
    thaiPhonetic: 'เอ-โกะ โอะ ฮะ-นะ-เสะ-มัส ก๊ะ',
    thai: 'พูดภาษาอังกฤษได้ไหมครับ/ค่ะ?',
    context: 'ถามเพื่อขอสื่อสารเป็นภาษาอังกฤษ',
  },
];

const FAVORITE_PHRASES_KEY = 'travel_tracker_fav_jp_phrases_v1';

export function getFavoritePhraseIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FAVORITE_PHRASES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function toggleFavoritePhraseId(phraseId: string): string[] {
  const current = getFavoritePhraseIds();
  const next = current.includes(phraseId)
    ? current.filter((id) => id !== phraseId)
    : [...current, phraseId];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(FAVORITE_PHRASES_KEY, JSON.stringify(next));
    } catch {}
  }
  return next;
}

export function filterJapanesePhrases(
  phrases: JapanesePhraseItem[],
  category: PhraseCategoryId,
  query: string,
  favoriteIds: string[] = []
): JapanesePhraseItem[] {
  const q = (query || '').trim().toLowerCase();
  return phrases.filter((item) => {
    if (category === 'favorites') {
      if (!favoriteIds.includes(item.id)) return false;
    } else if (category !== 'all' && item.category !== category) {
      return false;
    }
    if (!q) return true;
    return (
      item.thai.toLowerCase().includes(q) ||
      item.thaiPhonetic.toLowerCase().includes(q) ||
      item.romaji.toLowerCase().includes(q) ||
      item.japanese.toLowerCase().includes(q) ||
      item.kana.toLowerCase().includes(q) ||
      item.context.toLowerCase().includes(q)
    );
  });
}

/**
 * Speaks a Japanese phrase using the browser Web Speech API (`ja-JP`) at normal (1.0) or slow (0.65) speed.
 * Returns true if speech synthesis was triggered.
 */
export function speakJapanesePhrase(text: string, speed: 'normal' | 'slow' = 'normal'): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) {
    return false;
  }
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ja-JP';
    utter.rate = speed === 'slow' ? 0.65 : 0.95;
    utter.pitch = 1.05;
    const voices = window.speechSynthesis.getVoices?.() || [];
    const jpVoice = voices.find((v) => v.lang?.toLowerCase().startsWith('ja'));
    if (jpVoice) utter.voice = jpVoice;
    window.speechSynthesis.speak(utter);
    return true;
  } catch {
    return false;
  }
}
