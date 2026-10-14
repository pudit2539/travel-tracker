const { createClient } = require('@supabase/supabase-js');
const url = 'https://sdigqzippsmrwblmkjyw.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkaWdxemlwcHNtcndibG1ranl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMDE0ODksImV4cCI6MjEwMzc3NzQ4OX0.2J50plRmwRj6k_XGOs8A45xi2v4dTUcVjzyMmvoCUbQ';
const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase
    .from('itinerary_items')
    .select('id, date_label, time_slot, city, main_place, main_place_links, food_recommendation, food_links, backup_plan, backup_links, sort_order')
    .eq('trip_id', 'aacaed89-95df-49b4-a48c-bddda380b3f2')
    .neq('date_label', '__meta_trip_data__')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Total items in DB:', data.length);
  for (const it of data) {
    const f_links = it.food_links || [];
    const p_links = it.main_place_links || [];
    const b_links = it.backup_links || [];
    console.log(`[#${it.sort_order}] ${it.date_label} ${it.time_slot} | ${it.city} | ${it.main_place}`);
    if (p_links.length > 0) console.log(`   Place:`, p_links);
    if (it.food_recommendation || f_links.length > 0) {
      console.log(`   Food: ${it.food_recommendation}`);
      console.log(`   Food links:`, f_links);
    }
    if (it.backup_plan || b_links.length > 0) {
      console.log(`   Backup: ${it.backup_plan}`);
      console.log(`   Backup links:`, b_links);
    }
  }
}
check();
