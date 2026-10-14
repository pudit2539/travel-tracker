const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const url = 'https://sdigqzippsmrwblmkjyw.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkaWdxemlwcHNtcndibG1ranl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMDE0ODksImV4cCI6MjEwMzc3NzQ4OX0.2J50plRmwRj6k_XGOs8A45xi2v4dTUcVjzyMmvoCUbQ';
const supabase = createClient(url, key);

const TRIP_ID = 'aacaed89-95df-49b4-a48c-bddda380b3f2';

// Specific fallback links for items without links
const FALLBACK_PLACE_LINKS = {
  1: ['https://maps.google.com/?q=Suvarnabhumi+Airport'],
  2: ['https://maps.google.com/?q=Kansai+International+Airport'],
  9: ['https://maps.google.com/?q=Kyoto+Station+Grand+Staircase'],
  17: ['https://maps.google.com/?q=Hotel+Musse+Kyoto+Shijo+Kawaramachi+Meitetsu'],
  19: ['https://maps.google.com/?q=Hotel+Musse+Kyoto+Shijo+Kawaramachi+Meitetsu'],
  25: ['https://maps.google.com/?q=Honmachi+Station+Osaka'],
  30: ['https://maps.google.com/?q=Shinsaibashi-Suji+Shopping+Street'],
  40: ['https://maps.google.com/?q=Odysis+Suites+Osaka+Airport+Hotel'],
  41: ['https://maps.google.com/?q=Rinku-Town+Station'],
  42: ['https://maps.google.com/?q=Kansai+International+Airport'],
};

async function run() {
  console.log('Loading parsed v4 items...');
  const rawItems = JSON.parse(fs.readFileSync('scripts/v4_parsed_items.json', 'utf-8'));
  console.log(`Found ${rawItems.length} items in v4 plan.`);

  const formattedItems = rawItems.map((item, idx) => {
    let placeLinks = item.main_place_links || [];
    if (placeLinks.length === 0 && FALLBACK_PLACE_LINKS[idx + 1]) {
      placeLinks = FALLBACK_PLACE_LINKS[idx + 1];
    }

    return {
      trip_id: TRIP_ID,
      date_label: item.date_label || '',
      time_slot: item.time_slot || '',
      city: item.city || '',
      main_place: item.main_place || '',
      main_place_links: placeLinks,
      food_recommendation: item.food_recommendation || '',
      food_links: item.food_links || [],
      backup_plan: item.backup_plan || '',
      backup_links: item.backup_links || [],
      transport_info: item.transport_info || '',
      sort_order: idx + 1,
    };
  });

  console.log('1. Deleting old non-metadata itinerary items...');
  const { error: delError } = await supabase
    .from('itinerary_items')
    .delete()
    .eq('trip_id', TRIP_ID)
    .neq('date_label', '__meta_trip_data__');

  if (delError) {
    console.error('Failed to delete old itinerary items:', delError);
    return;
  }
  console.log('Old items deleted successfully.');

  console.log(`2. Inserting ${formattedItems.length} new items from v4 plan...`);
  // Insert in chunks of 20 to avoid large payload limits
  const chunkSize = 20;
  for (let i = 0; i < formattedItems.length; i += chunkSize) {
    const chunk = formattedItems.slice(i, i + chunkSize);
    const { error: insError } = await supabase.from('itinerary_items').insert(chunk);
    if (insError) {
      console.error(`Insert failed at chunk ${i}:`, insError);
      return;
    }
  }
  console.log('All itinerary items inserted successfully!');

  console.log('3. Updating accommodations and metadata row...');
  const { data: metaRow } = await supabase
    .from('itinerary_items')
    .select('id, backup_plan')
    .eq('trip_id', TRIP_ID)
    .eq('date_label', '__meta_trip_data__')
    .maybeSingle();

  let existingPayload = {};
  if (metaRow?.backup_plan) {
    try {
      existingPayload = JSON.parse(metaRow.backup_plan);
    } catch (e) {}
  }

  const now = Date.now();

  // Updated accommodations reflecting v4 dates
  const updatedAccommodations = [
    {
      id: 'stay_ms_kyoto_v4',
      tripId: TRIP_ID,
      name: "Hotel The M's Kyoto",
      city: "Kyoto (Kyoto Station)",
      checkInDate: "2026-12-05",
      checkOutDate: "2026-12-07",
      nights: 2,
      price: 6640,
      currency: "THB",
      googleMapsUrl: "https://maps.google.com/?q=Hotel+The+M%27s+Kyoto",
      notes: "เช็กอิน 5 ธ.ค. 15:00 น. - เช็กเอาต์ 7 ธ.ค. 09:00 น. (ย้ายกระเป๋าไปฝาก Hotel Musse)",
      expenseId: "1e6328cb-1adb-4b5d-8ea3-23c0edf4bde9",
      paymentStatus: "paid",
      createdAt: now,
    },
    {
      id: 'stay_musse_kyoto_v4',
      tripId: TRIP_ID,
      name: "Hotel Musse Kyoto Shijo Kawaramachi Meitetsu",
      city: "Kyoto (Kawaramachi)",
      checkInDate: "2026-12-07",
      checkOutDate: "2026-12-09",
      nights: 2,
      price: 6640,
      currency: "THB",
      googleMapsUrl: "https://maps.google.com/?q=Hotel+Musse+Kyoto+Shijo+Kawaramachi+Meitetsu",
      notes: "ฝากกระเป๋า 7 ธ.ค. 09:00 น. - เช็กอิน 18:30 น. - เช็กเอาต์ 9 ธ.ค. 11:30 น. (ย่านคาวาระมาจิ/ตลาดนิชิกิ)",
      expenseId: "9a3aaabb-f041-43cb-9d7f-94cfa2229b5d",
      paymentStatus: "paid",
      createdAt: now + 1,
    },
    {
      id: 'stay_quintessa_v4',
      tripId: TRIP_ID,
      name: "Quintessa Hotel Osaka Shinsaibashi Comic & Books",
      city: "Osaka (Shinsaibashi)",
      checkInDate: "2026-12-09",
      checkOutDate: "2026-12-14",
      nights: 5,
      price: 12000,
      currency: "THB",
      googleMapsUrl: "https://maps.google.com/?q=Quintessa+Hotel+Osaka+Shinsaibashi+Comic+%26+Books",
      notes: "เช็กอิน 9 ธ.ค. 13:00 น. - เช็กเอาต์ 14 ธ.ค. 11:00 น. (ย่านชินไซบาชิ/โดทอนโบริ)",
      expenseId: "2422303a-ecb0-48a9-827d-c5ae7820ca08",
      paymentStatus: "paid",
      createdAt: now + 2,
    },
    {
      id: 'stay_odysis_v4',
      tripId: TRIP_ID,
      name: "Odysis Suites Osaka Airport Hotel",
      city: "Osaka (Rinku Town)",
      checkInDate: "2026-12-14",
      checkOutDate: "2026-12-15",
      nights: 1,
      price: 1900,
      currency: "THB",
      googleMapsUrl: "https://maps.google.com/?q=Odysis+Suites+Osaka+Airport+Hotel",
      notes: "เช็กอิน 14 ธ.ค. 11:00 น. - เช็กเอาต์ 15 ธ.ค. 08:30 น. (โรงแรมตึกสูงติดสถานี Rinku-Town นั่งรถไฟ 1 สถานีถึงสนามบิน KIX)",
      expenseId: "2eb7c545-4d57-454a-ada5-9d7214163281",
      paymentStatus: "paid",
      createdAt: now + 3,
    }
  ];

  const updatedPayload = {
    ...existingPayload,
    accommodations: updatedAccommodations,
  };

  if (metaRow?.id) {
    const { error: metaErr } = await supabase
      .from('itinerary_items')
      .update({ backup_plan: JSON.stringify(updatedPayload) })
      .eq('id', metaRow.id);

    if (metaErr) console.error('Error updating metadata row:', metaErr);
    else console.log('Metadata row updated with new accommodations successfully!');
  }

  console.log('--- IMPORT COMPLETED SUCCESSFULLY ---');
}

run();
