const { createClient } = require('@supabase/supabase-js');

const url = 'https://sdigqzippsmrwblmkjyw.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkaWdxemlwcHNtcndibG1ranl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMDE0ODksImV4cCI6MjEwMzc3NzQ4OX0.2J50plRmwRj6k_XGOs8A45xi2v4dTUcVjzyMmvoCUbQ';
const supabase = createClient(url, key);

const TRIP_ID = 'aacaed89-95df-49b4-a48c-bddda380b3f2';

async function main() {
  console.log('Fetching existing meta data for trip:', TRIP_ID);
  const { data: existing, error } = await supabase
    .from('itinerary_items')
    .select('*')
    .eq('trip_id', TRIP_ID)
    .eq('date_label', '__meta_trip_data__')
    .single();

  if (error) {
    console.error('Error fetching itinerary meta:', error);
    return;
  }

  let currentPayload = {};
  if (existing.backup_plan) {
    try {
      currentPayload = JSON.parse(existing.backup_plan);
    } catch (e) {
      console.warn('Parse existing backup_plan error:', e);
    }
  }

  const now = Date.now();

  const accommodations = [
    {
      id: 'stay_' + now.toString(36) + '_mskyoto',
      tripId: TRIP_ID,
      name: "Hotel The M's Kyoto",
      city: "Kyoto",
      checkInDate: "2026-12-05",
      checkOutDate: "2026-12-07",
      nights: 2,
      price: 6640,
      currency: "THB",
      googleMapsUrl: "https://maps.google.com/?q=Hotel+The+M%27s+Kyoto",
      notes: "เช็กอิน 5 ธ.ค. 15:00 น. - เช็กเอาต์ 7 ธ.ค. 11:30 น. (ใกล้สถานี Kyoto Station)",
      expenseId: "1e6328cb-1adb-4b5d-8ea3-23c0edf4bde9",
      paymentStatus: "paid",
      createdAt: now,
    },
    {
      id: 'stay_' + (now + 1).toString(36) + '_musse',
      tripId: TRIP_ID,
      name: "Hotel Musse Kyoto Shijo Kawaramachi Meitetsu",
      city: "Kyoto",
      checkInDate: "2026-12-05",
      checkOutDate: "2026-12-07",
      nights: 2,
      price: 6640,
      currency: "THB",
      googleMapsUrl: "https://maps.google.com/?q=Hotel+Musse+Kyoto+Shijo+Kawaramachi+Meitetsu",
      notes: "ย่าน Shijo Kawaramachi / ตลาด Nishiki",
      expenseId: "9a3aaabb-f041-43cb-9d7f-94cfa2229b5d",
      paymentStatus: "paid",
      createdAt: now + 1,
    },
    {
      id: 'stay_' + (now + 2).toString(36) + '_quintessa',
      tripId: TRIP_ID,
      name: "Quintessa Hotel Osaka Shinsaibashi Comic & Books",
      city: "Osaka",
      checkInDate: "2026-12-07",
      checkOutDate: "2026-12-14",
      nights: 7,
      price: 12000,
      currency: "THB",
      googleMapsUrl: "https://maps.google.com/?q=Quintessa+Hotel+Osaka+Shinsaibashi+Comic+%26+Books",
      notes: "เช็กอิน 7 ธ.ค. 13:00 น. - เช็กเอาต์ 14 ธ.ค. 11:00 น. (ย่านชินไซบาชิ/โดทอนโบริ)",
      expenseId: "2422303a-ecb0-48a9-827d-c5ae7820ca08",
      paymentStatus: "paid",
      createdAt: now + 2,
    },
    {
      id: 'stay_' + (now + 3).toString(36) + '_odysis',
      tripId: TRIP_ID,
      name: "Odysis Suites Osaka Airport Hotel",
      city: "Osaka (Rinku Town)",
      checkInDate: "2026-12-14",
      checkOutDate: "2026-12-15",
      nights: 1,
      price: 1900,
      currency: "THB",
      googleMapsUrl: "https://maps.google.com/?q=Odysis+Suites+Osaka+Airport+Hotel",
      notes: "เช็กอิน 14 ธ.ค. - เช็กเอาต์ 15 ธ.ค. (โรงแรมตึกสูงติดสถานี Rinku-Town นั่งรถไฟ 1 สถานีถึงสนามบิน KIX)",
      expenseId: "2eb7c545-4d57-454a-ada5-9d7214163281",
      paymentStatus: "paid",
      createdAt: now + 3,
    }
  ];

  const flights = [
    {
      id: 'flight_' + now.toString(36) + '_vn',
      tripId: TRIP_ID,
      airline: "Vietnam Airlines",
      flightNo: "VN",
      originCode: "BKK",
      originCity: "Bangkok (สุวรรณภูมิ)",
      destCode: "KIX",
      destCity: "Osaka (คันไซ)",
      departureDate: "2026-12-04",
      departureTime: "15:55",
      arrivalTime: "06:55",
      price: 12100,
      currency: "THB",
      paymentStatus: "paid",
      expenseId: "fa0bcf47-c596-4810-8dd8-6affd80ecec1",
      notes: "ขาไป: ออกเดินทาง 4 ธ.ค. 15:55 น. แวะเปลี่ยนเครื่องที่ฮานอย (HAN) ถึง KIX 5 ธ.ค. 06:55 น.",
      createdAt: now,
    },
    {
      id: 'flight_' + (now + 1).toString(36) + '_vz',
      tripId: TRIP_ID,
      airline: "Thai VietJet Air",
      flightNo: "VZ-567",
      originCode: "KIX",
      originCity: "Osaka (คันไซ)",
      destCode: "BKK",
      destCity: "Bangkok (สุวรรณภูมิ)",
      departureDate: "2026-12-15",
      departureTime: "12:00",
      arrivalTime: "18:15",
      price: 18000,
      currency: "THB",
      paymentStatus: "paid",
      expenseId: "b7e2e3bd-35a6-4042-b0b5-64bc436caec1",
      notes: "ขากลับ: เดินทาง 15 ธ.ค. (KIX 12:00 -> แวะไทเป TPE 14:15-15:15 -> ถึง BKK สุวรรณภูมิ 18:15 น.)",
      createdAt: now + 1,
    }
  ];

  const updatedPayload = {
    ...currentPayload,
    accommodations,
    flights,
    flight: flights[0], // for backward compatibility
  };

  console.log('Updating backup_plan with 4 accommodations and 2 flights...');
  const { data: result, error: updateErr } = await supabase
    .from('itinerary_items')
    .update({ backup_plan: JSON.stringify(updatedPayload) })
    .eq('id', existing.id)
    .select();

  if (updateErr) {
    console.error('Update failed:', updateErr);
  } else {
    console.log('SUCCESS! Updated meta item in Supabase:');
    console.log('Accommodations added:', accommodations.length);
    console.log('Flights added:', flights.length);
    console.log('Result payload preview:', JSON.stringify(updatedPayload, null, 2).substring(0, 500) + '...');
  }
}

main();
