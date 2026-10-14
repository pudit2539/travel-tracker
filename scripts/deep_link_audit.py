import json
import sys
import urllib.parse

sys.stdout.reconfigure(encoding='utf-8')

with open('scripts/v4_parsed_items.json', encoding='utf-8') as f:
    items = json.load(f)

print(f"Total items in v4: {len(items)}\n")

discrepancies = []

for idx, it in enumerate(items, start=1):
    date = it.get('date_label', '')
    time = it.get('time_slot', '')
    city = it.get('city', '')
    place = it.get('main_place', '')
    food = it.get('food_recommendation', '')
    backup = it.get('backup_plan', '')
    
    p_links = it.get('main_place_links', [])
    f_links = it.get('food_links', [])
    b_links = it.get('backup_links', [])
    
    b_lines = [l.strip() for l in backup.split('\n') if l.strip()]
    
    # Check 1: Main place vs Place links
    if place and not p_links:
        discrepancies.append({
            'item': idx,
            'type': 'MISSING_PLACE_LINK',
            'detail': f"Item #{idx} ({date} {time}): '{place[:50]}' has NO place link!"
        })
    elif place and p_links:
        for pl in p_links:
            # decode query
            parsed = urllib.parse.urlparse(pl)
            qs = urllib.parse.parse_qs(parsed.query)
            q_val = qs.get('q', [''])[0] or qs.get('query', [''])[0]
            # Print if suspicious
            if 'Kyoto+Tower' in pl and 'Kyoto Tower' not in place:
                discrepancies.append({
                    'item': idx,
                    'type': 'MISMATCHED_PLACE_LINK',
                    'detail': f"Item #{idx}: Place is '{place}' but link query is '{q_val}'"
                })

    # Check 2: Food Recommendation vs Food links
    if food and not f_links:
        # Check if food has a concrete restaurant name
        if any(w in food for w in ['ร้าน', 'Cafe', 'Restaurant', 'Tonkatsu', 'Ramen', 'Sukiyaki', 'Shabu', 'Sushi']):
            discrepancies.append({
                'item': idx,
                'type': 'MISSING_FOOD_LINK',
                'detail': f"Item #{idx} ({date} {time}): Food mentions '{food[:60]}' but food_links is EMPTY!"
            })
    elif food and f_links:
        for fl in f_links:
            parsed = urllib.parse.urlparse(fl)
            qs = urllib.parse.parse_qs(parsed.query)
            q_val = qs.get('q', [''])[0] or qs.get('query', [''])[0]
            if 'Kyoto+Tower' in fl:
                discrepancies.append({
                    'item': idx,
                    'type': 'MISMATCHED_FOOD_LINK',
                    'detail': f"Item #{idx}: Food is '{food}' but link is Kyoto Tower!"
                })

    # Check 3: Backup plan lines vs backup links
    if len(b_lines) > 0:
        for l_idx, bl in enumerate(b_lines):
            # Check if this line is an actual place or restaurant
            is_entity = any(w in bl for w in ['ร้าน', 'วัด', 'ศาลเจ้า', 'สวน', 'ห้าง', 'ตลาด', 'Cafe', 'Street', 'Tower', 'Station', 'Park', 'Temple', 'Shrine'])
            has_link = l_idx < len(b_links)
            if has_link:
                actual_link = b_links[l_idx]
                parsed = urllib.parse.urlparse(actual_link)
                qs = urllib.parse.parse_qs(parsed.query)
                q_val = urllib.parse.unquote_plus(qs.get('q', [''])[0] or qs.get('query', [''])[0])
                
                # Compare q_val with line
                # Check for obvious misalignment e.g. Donguri with Kyoto Tower
                if 'donguri' in bl.lower() and 'kyoto tower' in q_val.lower():
                    discrepancies.append({
                        'item': idx,
                        'type': 'MISALIGNED_BACKUP_LINK',
                        'detail': f"Item #{idx} Line {l_idx+1}: Line is '{bl}' BUT link is '{actual_link}' ({q_val})!"
                    })
                elif 'yasaka shrine' in q_val.lower() and 'maruyama park' in bl.lower() and 'yasaka' not in bl.lower():
                    discrepancies.append({
                        'item': idx,
                        'type': 'POTENTIAL_BACKUP_MISALIGN',
                        'detail': f"Item #{idx} Line {l_idx+1}: Line is '{bl}' BUT link is '{actual_link}' ({q_val})"
                    })
            else:
                if is_entity:
                    discrepancies.append({
                        'item': idx,
                        'type': 'MISSING_BACKUP_LINK',
                        'detail': f"Item #{idx} Line {l_idx+1}: Line '{bl[:60]}' has NO backup link (only {len(b_links)} links for {len(b_lines)} lines)"
                    })

print("=== DISCREPANCIES FOUND ===")
for d in discrepancies:
    print(f"[{d['type']}] {d['detail']}")
print(f"\nTotal discrepancies found: {len(discrepancies)}")
