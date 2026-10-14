import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('scripts/v4_parsed_items.json', encoding='utf-8') as f:
    items = json.load(f)

print(f"Total items: {len(items)}")
missing_place_links = []

for idx, it in enumerate(items, 1):
    p_links = it.get('main_place_links', [])
    f_links = it.get('food_links', [])
    b_links = it.get('backup_links', [])
    
    total_links = len(p_links) + len(f_links) + len(b_links)
    print(f"[{idx}] {it['date_label']} {it['time_slot']} | {it['city']} | {it['main_place']}")
    print(f"    Place links: {p_links}")
    print(f"    Food links:  {f_links}")
    print(f"    Backup links:{b_links}")
    
    if not p_links:
        missing_place_links.append((idx, it['date_label'], it['time_slot'], it['city'], it['main_place']))

print("\n--- Items WITHOUT main_place_links ---")
for m in missing_place_links:
    print(m)
