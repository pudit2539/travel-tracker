const { createClient } = require('@supabase/supabase-js');
const url = 'https://sdigqzippsmrwblmkjyw.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkaWdxemlwcHNtcndibG1ranl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMDE0ODksImV4cCI6MjEwMzc3NzQ4OX0.2J50plRmwRj6k_XGOs8A45xi2v4dTUcVjzyMmvoCUbQ';
const supabase = createClient(url, key);

const TRIP_ID = 'aacaed89-95df-49b4-a48c-bddda380b3f2';

async function audit() {
  const { data, error } = await supabase
    .from('itinerary_items')
    .select('*')
    .eq('trip_id', TRIP_ID)
    .neq('date_label', '__meta_trip_data__')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Fetch error:', error);
    return;
  }

  console.log(`Auditing ${data.length} itinerary items in Supabase...\n`);

  console.log('=== ALL FOOD RECOMMENDATIONS & THEIR LINKS ===');
  data.forEach((it, idx) => {
    const itemNum = it.sort_order || (idx + 1);
    if (it.food_recommendation && it.food_recommendation !== '-') {
      console.log(`[Item #${itemNum}] ${it.date_label} ${it.time_slot}:`);
      console.log(`   Food: ${it.food_recommendation}`);
      console.log(`   Links: ${JSON.stringify(it.food_links || [])}`);
    }
  });

  console.log('\n=== ALL MAIN PLACES & THEIR LINKS ===');
  data.forEach((it, idx) => {
    const itemNum = it.sort_order || (idx + 1);
    console.log(`[Item #${itemNum}] ${it.date_label} ${it.time_slot}:`);
    console.log(`   Place: ${it.main_place}`);
    console.log(`   Links: ${JSON.stringify(it.main_place_links || [])}`);
  });

  console.log('\n=== DETECTED ISSUES ===');
  const issues = [];

  data.forEach((it, idx) => {
    const itemNum = it.sort_order || (idx + 1);
    const date = it.date_label;
    const time = it.time_slot;
    const place = it.main_place;
    const p_links = it.main_place_links || [];
    const food = it.food_recommendation;
    const f_links = it.food_links || [];
    const backup = it.backup_plan;
    const b_links = it.backup_links || [];

    // 1. Check Main Place
    if (place) {
      if (p_links.length === 0) {
        issues.push({
          itemNum,
          date,
          time,
          section: 'Main Place',
          title: place,
          issue: 'Missing place link',
          currentLink: null
        });
      } else {
        p_links.forEach((pl, lIdx) => {
          const q = decodeURIComponent(pl).toLowerCase();
          // Check obvious anomalies
          if (q.includes('kyoto+tower') && !place.toLowerCase().includes('kyoto tower')) {
            issues.push({
              itemNum,
              date,
              time,
              section: 'Main Place',
              title: place,
              issue: `Place link points to Kyoto Tower: ${pl}`,
              currentLink: pl
            });
          }
        });
      }
    }

    // 2. Check Food
    if (food && food !== '-') {
      if (f_links.length === 0) {
        // Check if concrete restaurant is named
        const isRestaurant = /ร้าน|cafe|restaurant|tonkatsu|ramen|sukiyaki|shabu|sushi|udon|curry|steak|kushikatsu/i.test(food);
        if (isRestaurant) {
          issues.push({
            itemNum,
            date,
            time,
            section: 'Food',
            title: food,
            issue: 'Restaurant mentioned but food_links is empty',
            currentLink: null
          });
        }
      } else {
        f_links.forEach((fl, lIdx) => {
          const q = decodeURIComponent(fl).toLowerCase();
          if (q.includes('kyoto+tower')) {
            issues.push({
              itemNum,
              date,
              time,
              section: 'Food',
              title: food,
              issue: `Food link points to Kyoto Tower: ${fl}`,
              currentLink: fl
            });
          }
        });
      }
    }

    // 3. Check Backup Plan
    if (backup) {
      const lines = backup.split('\n').map(s => s.trim()).filter(s => s.length > 0);
      lines.forEach((line, lIdx) => {
        const link = b_links[lIdx];
        if (!link) {
          const isEntity = /ร้าน|วัด|ศาลเจ้า|สวน|ห้าง|ตลาด|cafe|tower|station|park|temple|shrine|castle|aquarium|market|outlet/i.test(line);
          if (isEntity) {
            issues.push({
              itemNum,
              date,
              time,
              section: `Backup Line ${lIdx + 1}`,
              title: line,
              issue: 'Entity line without dedicated link in backup_links',
              currentLink: null
            });
          }
        } else {
          const q = decodeURIComponent(link).toLowerCase();
          const cleanLine = line.toLowerCase();
          
          // Check for keyword mismatch
          if (cleanLine.includes('donguri') && q.includes('kyoto+tower')) {
            issues.push({
              itemNum,
              date,
              time,
              section: `Backup Line ${lIdx + 1}`,
              title: line,
              issue: `Donguri restaurant matched with Kyoto Tower link: ${link}`,
              currentLink: link
            });
          } else if (cleanLine.includes('maruyama park') && q.includes('yasaka+shrine') && !cleanLine.includes('yasaka shrine')) {
            issues.push({
              itemNum,
              date,
              time,
              section: `Backup Line ${lIdx + 1}`,
              title: line,
              issue: `Maruyama Park matched with Yasaka Shrine link: ${link}`,
              currentLink: link
            });
          } else if (cleanLine.includes('kasuga taisha') && q.includes('todaiji')) {
            issues.push({
              itemNum,
              date,
              time,
              section: `Backup Line ${lIdx + 1}`,
              title: line,
              issue: `Kasuga Taisha matched with Todaiji link: ${link}`,
              currentLink: link
            });
          } else if (cleanLine.includes('book-off') && q.includes('mandarake')) {
            issues.push({
              itemNum,
              date,
              time,
              section: `Backup Line ${lIdx + 1}`,
              title: line,
              issue: `Book-Off matched with Mandarake link: ${link}`,
              currentLink: link
            });
          }
        }
      });
    }
  });

  console.log(`Found ${issues.length} issues in database items:\n`);
  issues.forEach((iss, i) => {
    console.log(`[Issue #${i+1}] Item #${iss.itemNum} (${iss.date} ${iss.time})`);
    console.log(`  Section: ${iss.section}`);
    console.log(`  Text:    ${iss.title}`);
    console.log(`  Problem: ${iss.issue}`);
    console.log(`  Current: ${iss.currentLink}`);
    console.log();
  });
}

audit();
