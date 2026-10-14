const { createClient } = require('@supabase/supabase-js');
const url = 'https://sdigqzippsmrwblmkjyw.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkaWdxemlwcHNtcndibG1ranl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMDE0ODksImV4cCI6MjEwMzc3NzQ4OX0.2J50plRmwRj6k_XGOs8A45xi2v4dTUcVjzyMmvoCUbQ';
const supabase = createClient(url, key);

const TRIP_ID = 'aacaed89-95df-49b4-a48c-bddda380b3f2';

async function main() {
  const { data: items, error } = await supabase
    .from('itinerary_items')
    .select('*')
    .eq('trip_id', TRIP_ID)
    .neq('date_label', '__meta_trip_data__')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching items:', error);
    return;
  }

  console.log(`Auditing ${items.length} itinerary items in Supabase...\n`);

  const wrongLinks = [];

  items.forEach((it, idx) => {
    const num = it.sort_order || (idx + 1);
    const date = it.date_label;
    const time = it.time_slot;
    const city = it.city || '';
    const place = it.main_place || '';
    const p_links = it.main_place_links || [];
    const food = it.food_recommendation || '';
    const f_links = it.food_links || [];
    const backup = it.backup_plan || '';
    const b_links = it.backup_links || [];

    // Check Backup Plan lines
    if (backup) {
      const lines = backup.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      lines.forEach((line, lIdx) => {
        const link = b_links[lIdx];
        if (link) {
          const q = decodeURIComponent(link).toLowerCase();
          const cleanLine = line.toLowerCase();
          
          if (cleanLine.includes('donguri') && q.includes('kyoto+tower')) {
            wrongLinks.push({
              itemNum: num,
              id: it.id,
              date: `${date} ${time}`,
              type: 'BACKUP_WRONG_LINK',
              label: 'ร้านอาหารสำรอง Donguri เชื่อมไป Kyoto Tower',
              text: line,
              currentLink: link,
              correctLink: 'https://maps.google.com/?q=Donguri+Kyoto+Station'
            });
          }
          if (cleanLine.includes('maruyama park') && q.includes('yasaka+shrine')) {
            wrongLinks.push({
              itemNum: num,
              id: it.id,
              date: `${date} ${time}`,
              type: 'BACKUP_WRONG_LINK',
              label: 'ที่เที่ยวสำรอง Maruyama Park เชื่อมไป ศาลเจ้า Yasaka Shrine',
              text: line,
              currentLink: link,
              correctLink: 'https://maps.google.com/?q=Maruyama+Park+Kyoto'
            });
          }
          if (cleanLine.includes('kasuga taisha') && q.includes('todaiji')) {
            wrongLinks.push({
              itemNum: num,
              id: it.id,
              date: `${date} ${time}`,
              type: 'BACKUP_WRONG_LINK',
              label: 'ที่เที่ยวสำรอง ศาลเจ้า Kasuga Taisha เชื่อมไป วัด Todaiji',
              text: line,
              currentLink: link,
              correctLink: 'https://maps.google.com/?q=Kasuga+Taisha+Nara'
            });
          }
          if (cleanLine.includes('book-off') && q.includes('mandarake')) {
            wrongLinks.push({
              itemNum: num,
              id: it.id,
              date: `${date} ${time}`,
              type: 'BACKUP_WRONG_LINK',
              label: 'ร้านของมือสอง Book-Off Namba เชื่อมไป Mandarake Grandchaos',
              text: line,
              currentLink: link,
              correctLink: 'https://maps.google.com/?q=BookOff+Plus+Namba+Osaka'
            });
          }
        }
      });
    }

    // Check Place Links
    p_links.forEach(pl => {
      const q = decodeURIComponent(pl).toLowerCase();
      if (q.includes('kyoto+tower') && !place.toLowerCase().includes('kyoto tower')) {
        wrongLinks.push({
          itemNum: num,
          id: it.id,
          date: `${date} ${time}`,
          type: 'PLACE_WRONG_LINK',
          label: 'สถานที่หลักเชื่อมไป Kyoto Tower ผิดพลาด',
          text: place,
          currentLink: pl,
          correctLink: `https://maps.google.com/?q=${encodeURIComponent(place + ' ' + city)}`
        });
      }
    });

    // Check Food Links
    f_links.forEach(fl => {
      const q = decodeURIComponent(fl).toLowerCase();
      if (q.includes('kyoto+tower') && !food.toLowerCase().includes('kyoto tower')) {
        wrongLinks.push({
          itemNum: num,
          id: it.id,
          date: `${date} ${time}`,
          type: 'FOOD_WRONG_LINK',
          label: 'ร้านอาหารเชื่อมไป Kyoto Tower ผิดพลาด',
          text: food,
          currentLink: fl,
          correctLink: `https://maps.google.com/?q=${encodeURIComponent(food + ' ' + city)}`
        });
      }
    });
  });

  console.log(`=== สรุปลิงก์ที่ผิดพลาดชัดเจน (Incorrect / Mismatched Links) ===`);
  console.log(`พบจุดผิดพลาดทั้งหมด: ${wrongLinks.length} จุด\n`);
  wrongLinks.forEach((w, i) => {
    console.log(`จุดที่ ${i+1}: [#${w.itemNum}] ${w.date}`);
    console.log(`  หัวข้อ: ${w.label}`);
    console.log(`  ข้อความเดิม: ${w.text}`);
    console.log(`  ลิงก์ปัจจุบัน (ผิด): ${w.currentLink}`);
    console.log(`  ลิงก์ที่ถูกต้อง:     ${w.correctLink}\n`);
  });
}

main();
