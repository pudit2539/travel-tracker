const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const url = 'https://sdigqzippsmrwblmkjyw.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkaWdxemlwcHNtcndibG1ranl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMDE0ODksImV4cCI6MjEwMzc3NzQ4OX0.2J50plRmwRj6k_XGOs8A45xi2v4dTUcVjzyMmvoCUbQ';
const supabase = createClient(url, key);

const TRIP_ID = 'aacaed89-95df-49b4-a48c-bddda380b3f2';

async function fix() {
  console.log('Fetching all itinerary items from Supabase...');
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

  console.log(`Fetched ${items.length} items. Applying link fixes...`);

  const updates = [];

  for (const it of items) {
    const num = it.sort_order;
    let b_links = [...(it.backup_links || [])];
    let f_links = [...(it.food_links || [])];
    let p_links = [...(it.main_place_links || [])];
    let b_plan = it.backup_plan || '';
    let changed = false;

    // --- จุดที่ 1: Item 5 ธ.ค. 11:30 น. (Porta Underground Shopping Mall) ---
    // ปัญหา: backup_links มีแค่ Kyoto Tower อันเดียว ทำให้ร้านอาหารสำรอง Donguri ไปเปิด Kyoto Tower
    if (it.date_label === '5 ธ.ค.' && it.time_slot === '11:30 น.') {
      b_links = [
        'https://maps.google.com/?q=Donguri+Kyoto+Station',
        'https://maps.google.com/?q=Kyoto+Tower'
      ];
      changed = true;
      console.log(`[Fixed Item #${num}] 5 ธ.ค. 11:30 น.: Donguri -> https://maps.google.com/?q=Donguri+Kyoto+Station and Kyoto Tower -> https://maps.google.com/?q=Kyoto+Tower`);
    }

    // --- จุดที่ 2: Item 5 ธ.ค. 17:30 น. (Pontocho Alley) ---
    // ปัญหา: food_links ว่างเปล่า ทานร้าน Izakaya / Yakitori โลคอล
    if (it.date_label === '5 ธ.ค.' && it.time_slot === '17:30 น.') {
      if (f_links.length === 0) {
        f_links = ['https://maps.google.com/?q=Pontocho+Alley+Izakaya+Kyoto'];
        changed = true;
        console.log(`[Fixed Item #${num}] 5 ธ.ค. 17:30 น.: Added food link -> Pontocho Alley Izakaya`);
      }
    }

    // --- จุดที่ 3: Item 6 ธ.ค. 09:30 น. (Kyoto Gion) ---
    // ปัญหา: Maruyama Park โดนจับคู่กับลิงก์ Yasaka Shrine, และ food_links ว่างเปล่า
    if (it.date_label === '6 ธ.ค.' && it.time_slot === '09:30 น.') {
      b_links = [
        'https://maps.google.com/?q=Maruyama+Park+Kyoto',
        'https://maps.google.com/?q=Gion+Karyo'
      ];
      if (f_links.length === 0) {
        f_links = ['https://maps.google.com/?q=Gion+Kyoto+Soba+Restaurant'];
      }
      changed = true;
      console.log(`[Fixed Item #${num}] 6 ธ.ค. 09:30 น.: Maruyama Park link corrected & Gion Soba food link added`);
    }

    // --- จุดที่ 4: Item 9 ธ.ค. 08:30 น. (Fushimi Inari) ---
    if (it.date_label === '9 ธ.ค.' && it.time_slot === '08:30 น.') {
      if (f_links.length === 0) {
        f_links = ['https://maps.google.com/?q=Fushimi+Inari+Taisha+Street+Food'];
        changed = true;
        console.log(`[Fixed Item #${num}] 9 ธ.ค. 08:30 น.: Added Fushimi Inari Food link`);
      }
    }

    // --- จุดที่ 5: Item 10 ธ.ค. 18:00 น. (Umeda Yakiniku) ---
    if (it.date_label === '10 ธ.ค.' && it.time_slot === '18:00 น.') {
      if (f_links.length === 0) {
        f_links = ['https://maps.google.com/?q=Umeda+Station+Yakiniku+Osaka'];
        changed = true;
        console.log(`[Fixed Item #${num}] 10 ธ.ค. 18:00 น.: Added Umeda Yakiniku food link`);
      }
    }

    // --- จุดที่ 6: Item 11 ธ.ค. 08:30 น. (Nara Park / Todaiji) ---
    // ปัญหา: backup_links มี Todaiji ทำให้ Kasuga Taisha ไปเปิด Todaiji ซ้ำ
    if (it.date_label === '11 ธ.ค.' && it.time_slot === '08:30 น.') {
      b_links = ['https://maps.google.com/?q=Kasuga+Taisha+Nara'];
      changed = true;
      console.log(`[Fixed Item #${num}] 11 ธ.ค. 08:30 น.: Kasuga Taisha link corrected`);
    }

    // --- จุดที่ 7: Item 11 ธ.ค. 12:30 น. (Nara -> Honmachi) ---
    // ปัญหา: backup Curry House Nishimoto ไม่มีลิงก์
    if (it.date_label === '11 ธ.ค.' && it.time_slot === '12:30 น.') {
      b_links = ['https://maps.google.com/?q=Curry+House+Nishimoto+Osaka'];
      changed = true;
      console.log(`[Fixed Item #${num}] 11 ธ.ค. 12:30 น.: Added Curry House Nishimoto link`);
    }

    // --- จุดที่ 8: Item 11 ธ.ค. 14:00 น. (Osaka Korea Town) ---
    // ปัญหา: food_links และ backup_links ว่างเปล่า
    if (it.date_label === '11 ธ.ค.' && it.time_slot === '14:00 น.') {
      if (f_links.length === 0) f_links = ['https://maps.google.com/?q=Tsuruhashi+Korea+Town+Street+Food+Osaka'];
      if (b_links.length === 0) b_links = ['https://maps.google.com/?q=Tsuruhashi+Korean+Yakiniku+Osaka'];
      changed = true;
      console.log(`[Fixed Item #${num}] 11 ธ.ค. 14:00 น.: Added Korea Town food and backup links`);
    }

    // --- จุดที่ 9: Item 11 ธ.ค. 16:30 น. (Osaka Recycle Shopping) ---
    // ปัญหา: Book-Off Namba ชี้ไปที่ Mandarake Grandchaos
    if (it.date_label === '11 ธ.ค.' && it.time_slot === '16:30 น.') {
      b_links = [
        'https://maps.google.com/?q=BookOff+Plus+Namba+Osaka',
        'https://maps.google.com/?q=Kindal+Shinsaibashi+Amerikamura'
      ];
      changed = true;
      console.log(`[Fixed Item #${num}] 11 ธ.ค. 16:30 น.: Book-Off Namba link corrected`);
    }

    // --- จุดที่ 10: Item 12 ธ.ค. 13:00 น. (Kobe Chinatown Nankinmachi) ---
    // จัดระเบียบ lines กับ links ให้ตรงกัน
    if (it.date_label === '12 ธ.ค.' && it.time_slot === '13:00 น.') {
      b_plan = "ที่เที่ยวสำรองในโกเบ 1: เดินรับลมทะเลที่ห้าง Kobe Harborland\nที่เที่ยวสำรองในโกเบ 2: ถ่ายรูปคู่กับป้าย BE KOBE ที่ Meriken Park";
      b_links = [
        'https://maps.google.com/?q=Kobe+Harborland',
        'https://maps.google.com/?q=Meriken+Park'
      ];
      changed = true;
      console.log(`[Fixed Item #${num}] 12 ธ.ค. 13:00 น.: Aligned Kobe Harborland & Meriken Park backup lines and links`);
    }

    // --- จุดที่ 11: Item 13 ธ.ค. 09:00 น. (Minoh Falls) ---
    if (it.date_label === '13 ธ.ค.' && it.time_slot === '09:00 น.') {
      if (f_links.length === 0) {
        f_links = ['https://maps.google.com/?q=Minoh+Momiji+Tempura'];
        changed = true;
        console.log(`[Fixed Item #${num}] 13 ธ.ค. 09:00 น.: Added Minoh Momiji Tempura food link`);
      }
    }

    // --- จุดที่ 12: Item 13 ธ.ค. 11:30 น. (Katsuoji Temple) ---
    if (it.date_label === '13 ธ.ค.' && it.time_slot === '11:30 น.') {
      if (f_links.length === 0) f_links = ['https://maps.google.com/?q=Katsuoji+Restaurant+Minoh'];
      if (b_links.length === 0) b_links = ['https://maps.google.com/?q=Katsuoji+Temple+Minoh'];
      changed = true;
      console.log(`[Fixed Item #${num}] 13 ธ.ค. 11:30 น.: Added Katsuoji restaurant & garden links`);
    }

    // --- จุดที่ 13: Item 14 ธ.ค. 13:00 น. (Rinku Outlets) ---
    if (it.date_label === '14 ธ.ค.' && it.time_slot === '13:00 น.') {
      if (f_links.length === 0) {
        f_links = ['https://maps.google.com/?q=Rinku+Dining+Outlets'];
        changed = true;
        console.log(`[Fixed Item #${num}] 14 ธ.ค. 13:00 น.: Added Rinku Dining food link`);
      }
    }

    // --- จุดที่ 14: Item 14 ธ.ค. 18:30 น. (Tennen Onsen Rinkunoyu) ---
    if (it.date_label === '14 ธ.ค.' && it.time_slot === '18:30 น.') {
      if (f_links.length === 0) f_links = ['https://maps.google.com/?q=Tennen+Onsen+Rinkunoyu+Restaurant'];
      if (b_links.length === 0) b_links = ['https://maps.google.com/?q=Rinku+Park'];
      changed = true;
      console.log(`[Fixed Item #${num}] 14 ธ.ค. 18:30 น.: Added Rinku Onsen food & Rinku Park links`);
    }

    if (changed) {
      updates.push({
        id: it.id,
        food_links: f_links,
        backup_links: b_links,
        backup_plan: b_plan,
        main_place_links: p_links
      });
    }
  }

  console.log(`\nPushing ${updates.length} updated rows to Supabase database...`);
  for (const u of updates) {
    const { error: upErr } = await supabase
      .from('itinerary_items')
      .update({
        food_links: u.food_links,
        backup_links: u.backup_links,
        backup_plan: u.backup_plan,
        main_place_links: u.main_place_links
      })
      .eq('id', u.id);

    if (upErr) {
      console.error(`Failed to update item ${u.id}:`, upErr);
    }
  }
  console.log('Database successfully updated with accurate Google Maps links!');

  // Also update v4_parsed_items.json for consistency
  console.log('Updating scripts/v4_parsed_items.json...');
  const v4Items = JSON.parse(fs.readFileSync('scripts/v4_parsed_items.json', 'utf-8'));
  for (const v of v4Items) {
    if (v.date_label === '5 ธ.ค.' && v.time_slot === '11:30 น.') {
      v.backup_links = [
        'https://maps.google.com/?q=Donguri+Kyoto+Station',
        'https://maps.google.com/?q=Kyoto+Tower'
      ];
    }
    if (v.date_label === '5 ธ.ค.' && v.time_slot === '17:30 น.') {
      v.food_links = ['https://maps.google.com/?q=Pontocho+Alley+Izakaya+Kyoto'];
    }
    if (v.date_label === '6 ธ.ค.' && v.time_slot === '09:30 น.') {
      v.backup_links = [
        'https://maps.google.com/?q=Maruyama+Park+Kyoto',
        'https://maps.google.com/?q=Gion+Karyo'
      ];
      v.food_links = ['https://maps.google.com/?q=Gion+Kyoto+Soba+Restaurant'];
    }
    if (v.date_label === '9 ธ.ค.' && v.time_slot === '08:30 น.') {
      v.food_links = ['https://maps.google.com/?q=Fushimi+Inari+Taisha+Street+Food'];
    }
    if (v.date_label === '10 ธ.ค.' && v.time_slot === '18:00 น.') {
      v.food_links = ['https://maps.google.com/?q=Umeda+Station+Yakiniku+Osaka'];
    }
    if (v.date_label === '11 ธ.ค.' && v.time_slot === '08:30 น.') {
      v.backup_links = ['https://maps.google.com/?q=Kasuga+Taisha+Nara'];
    }
    if (v.date_label === '11 ธ.ค.' && v.time_slot === '12:30 น.') {
      v.backup_links = ['https://maps.google.com/?q=Curry+House+Nishimoto+Osaka'];
    }
    if (v.date_label === '11 ธ.ค.' && v.time_slot === '14:00 น.') {
      v.food_links = ['https://maps.google.com/?q=Tsuruhashi+Korea+Town+Street+Food+Osaka'];
      v.backup_links = ['https://maps.google.com/?q=Tsuruhashi+Korean+Yakiniku+Osaka'];
    }
    if (v.date_label === '11 ธ.ค.' && v.time_slot === '16:30 น.') {
      v.backup_links = [
        'https://maps.google.com/?q=BookOff+Plus+Namba+Osaka',
        'https://maps.google.com/?q=Kindal+Shinsaibashi+Amerikamura'
      ];
    }
    if (v.date_label === '12 ธ.ค.' && v.time_slot === '13:00 น.') {
      v.backup_plan = "ที่เที่ยวสำรองในโกเบ 1: เดินรับลมทะเลที่ห้าง Kobe Harborland\nที่เที่ยวสำรองในโกเบ 2: ถ่ายรูปคู่กับป้าย BE KOBE ที่ Meriken Park";
      v.backup_links = [
        'https://maps.google.com/?q=Kobe+Harborland',
        'https://maps.google.com/?q=Meriken+Park'
      ];
    }
    if (v.date_label === '13 ธ.ค.' && v.time_slot === '09:00 น.') {
      v.food_links = ['https://maps.google.com/?q=Minoh+Momiji+Tempura'];
    }
    if (v.date_label === '13 ธ.ค.' && v.time_slot === '11:30 น.') {
      v.food_links = ['https://maps.google.com/?q=Katsuoji+Restaurant+Minoh'];
      v.backup_links = ['https://maps.google.com/?q=Katsuoji+Temple+Minoh'];
    }
    if (v.date_label === '14 ธ.ค.' && v.time_slot === '13:00 น.') {
      v.food_links = ['https://maps.google.com/?q=Rinku+Dining+Outlets'];
    }
    if (v.date_label === '14 ธ.ค.' && v.time_slot === '18:30 น.') {
      v.food_links = ['https://maps.google.com/?q=Tennen+Onsen+Rinkunoyu+Restaurant'];
      v.backup_links = ['https://maps.google.com/?q=Rinku+Park'];
    }
  }
  fs.writeFileSync('scripts/v4_parsed_items.json', JSON.stringify(v4Items, null, 2), 'utf-8');
  console.log('scripts/v4_parsed_items.json successfully updated.');
}

fix();
