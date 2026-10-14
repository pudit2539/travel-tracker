const { createClient } = require('@supabase/supabase-js');
const url = 'https://sdigqzippsmrwblmkjyw.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkaWdxemlwcHNtcndibG1ranl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMDE0ODksImV4cCI6MjEwMzc3NzQ4OX0.2J50plRmwRj6k_XGOs8A45xi2v4dTUcVjzyMmvoCUbQ';
const supabase = createClient(url, key);

async function verify() {
  const { data: items } = await supabase
    .from('itinerary_items')
    .select('id, date_label, time_slot, main_place, main_place_links')
    .neq('date_label', '__meta_trip_data__')
    .order('sort_order');

  console.log('Total itinerary items in Supabase:', items.length);
  const withoutPlaceLinks = items.filter(i => !i.main_place_links || i.main_place_links.length === 0);
  console.log('Items without place links:', withoutPlaceLinks.length);

  const { data: meta } = await supabase
    .from('itinerary_items')
    .select('backup_plan')
    .eq('date_label', '__meta_trip_data__')
    .single();

  const parsed = JSON.parse(meta.backup_plan);
  console.log('\nAccommodations in Supabase:');
  parsed.accommodations.forEach(a => {
    console.log(`- ${a.name}: ${a.checkInDate} to ${a.checkOutDate} (${a.nights} คืน) | maps: ${a.googleMapsUrl}`);
  });
}
verify();
