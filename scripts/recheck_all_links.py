import json
import sys
import urllib.parse
from supabase import create_client

sys.stdout.reconfigure(encoding='utf-8')

url = 'https://sdigqzippsmrwblmkjyw.supabase.co'
key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkaWdxemlwcHNtcndibG1ranl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMDE0ODksImV4cCI6MjEwMzc3NzQ4OX0.2J50plRmwRj6k_XGOs8A45xi2v4dTUcVjzyMmvoCUbQ'
supabase = create_client(url, key)

TRIP_ID = 'aacaed89-95df-49b4-a48c-bddda380b3f2'

res = supabase.table('itinerary_items').select('*').eq('trip_id', TRIP_ID).neq('date_label', '__meta_trip_data__').order('sort_order').execute()
items = res.data

print(f"Total items in DB: {len(items)}\n")

discrepancies = []

for idx, it in enumerate(items, 1):
    sort_order = it.get('sort_order', idx)
    date = it.get('date_label', '')
    time = it.get('time_slot', '')
    city = it.get('city', '')
    place = it.get('main_place', '')
    p_links = it.get('main_place_links') or []
    food = it.get('food_recommendation') or ''
    f_links = it.get('food_links') or []
    backup = it.get('backup_plan') or ''
    b_links = it.get('backup_links') or []
    
    # 1. Check Place links
    if not p_links:
        discrepancies.append({
            'item_id': it['id'],
            'sort_order': sort_order,
            'date': f"{date} {time}",
            'category': 'MAIN_PLACE_MISSING_LINK',
            'title': place,
            'current': 'None',
            'suggested': f"https://maps.google.com/?q={urllib.parse.quote_plus(place.split('(')[0].strip() + ' ' + city)}"
        })
    else:
        for pl in p_links:
            if 'Kyoto+Tower' in pl and 'kyoto tower' not in place.lower():
                discrepancies.append({
                    'item_id': it['id'],
                    'sort_order': sort_order,
                    'date': f"{date} {time}",
                    'category': 'MAIN_PLACE_WRONG_LINK',
                    'title': place,
                    'current': pl,
                    'suggested': f"https://maps.google.com/?q={urllib.parse.quote_plus(place.split('(')[0].strip() + ' ' + city)}"
                })

    # 2. Check Food links
    if food and food != '-':
        if not f_links:
            # Check if restaurant named
            discrepancies.append({
                'item_id': it['id'],
                'sort_order': sort_order,
                'date': f"{date} {time}",
                'category': 'FOOD_MISSING_LINK',
                'title': food,
                'current': 'None',
                'suggested': f"https://maps.google.com/?q={urllib.parse.quote_plus(food.split(/[,(]/)[0].strip() if hasattr(food, 'split') else food)}"
            })
        else:
            for fl in f_links:
                if 'Kyoto+Tower' in fl and 'kyoto tower' not in food.lower():
                    discrepancies.append({
                        'item_id': it['id'],
                        'sort_order': sort_order,
                        'date': f"{date} {time}",
                        'category': 'FOOD_WRONG_LINK',
                        'title': food,
                        'current': fl,
                        'suggested': 'FIX_FOOD_LINK'
                    })

    # 3. Check Backup plan
    if backup:
        lines = [l.strip() for l in backup.split('\n') if l.strip()]
        for l_idx, line in enumerate(lines):
            has_link = l_idx < len(b_links)
            actual_link = b_links[l_idx] if has_link else None
            
            clean_name = line.split(':')[1].strip() if ':' in line else line
            clean_name = clean_name.split('(')[0].strip()
            
            if not actual_link:
                discrepancies.append({
                    'item_id': it['id'],
                    'sort_order': sort_order,
                    'date': f"{date} {time}",
                    'category': 'BACKUP_MISSING_LINK',
                    'title': line,
                    'current': 'None',
                    'suggested': f"https://maps.google.com/?q={urllib.parse.quote_plus(clean_name + ' ' + city)}"
                })
            else:
                q = urllib.parse.unquote_plus(actual_link).lower()
                # Check for explicit wrong link
                if 'donguri' in line.lower() and 'kyoto tower' in q:
                    discrepancies.append({
                        'item_id': it['id'],
                        'sort_order': sort_order,
                        'date': f"{date} {time}",
                        'category': 'BACKUP_WRONG_LINK',
                        'title': line,
                        'current': actual_link,
                        'suggested': 'https://maps.google.com/?q=Donguri+Kyoto+Station'
                    })
                elif 'maruyama park' in line.lower() and 'yasaka shrine' in q and 'yasaka' not in line.lower():
                    discrepancies.append({
                        'item_id': it['id'],
                        'sort_order': sort_order,
                        'date': f"{date} {time}",
                        'category': 'BACKUP_WRONG_LINK',
                        'title': line,
                        'current': actual_link,
                        'suggested': 'https://maps.google.com/?q=Maruyama+Park+Kyoto'
                    })
                elif 'kasuga taisha' in line.lower() and 'todaiji' in q:
                    discrepancies.append({
                        'item_id': it['id'],
                        'sort_order': sort_order,
                        'date': f"{date} {time}",
                        'category': 'BACKUP_WRONG_LINK',
                        'title': line,
                        'current': actual_link,
                        'suggested': 'https://maps.google.com/?q=Kasuga+Taisha+Nara'
                    })
                elif 'book-off' in line.lower() and 'mandarake' in q:
                    discrepancies.append({
                        'item_id': it['id'],
                        'sort_order': sort_order,
                        'date': f"{date} {time}",
                        'category': 'BACKUP_WRONG_LINK',
                        'title': line,
                        'current': actual_link,
                        'suggested': 'https://maps.google.com/?q=BookOff+Plus+Namba+Osaka'
                    })

print(f"Total Discrepancies Found: {len(discrepancies)}\n")
for d in discrepancies:
    print(f"[{d['category']}] Item #{d['sort_order']} ({d['date']}):")
    print(f"   Target:    {d['title']}")
    print(f"   Current:   {d['current']}")
    print(f"   Suggested: {d['suggested']}\n")
