import json
import sys
import urllib.parse

sys.stdout.reconfigure(encoding='utf-8')

with open('scripts/v4_parsed_items.json', encoding='utf-8') as f:
    items = json.load(f)

start = int(sys.argv[1]) if len(sys.argv) > 1 else 1
end = int(sys.argv[2]) if len(sys.argv) > 2 else len(items)

for idx in range(start - 1, end):
    it = items[idx]
    f_name = it.get('food_recommendation', '')
    f_links = it.get('food_links', [])
    p_name = it.get('main_place', '')
    p_links = it.get('main_place_links', [])
    b_name = it.get('backup_plan', '')
    b_links = it.get('backup_links', [])
    
    print(f"=== ITEM #{idx+1}: {it.get('date_label')} {it.get('time_slot')} | {it.get('city')} ===")
    print(f"  Main Place: {p_name}")
    print(f"    Place Links: {p_links}")
    if f_name or f_links:
        print(f"  Food Rec:   {f_name}")
        print(f"    Food Links:  {f_links}")
    if b_name or b_links:
        print(f"  Backup:     {b_name.replace(chr(10), ' ')[:70]}")
        print(f"    Backup Links:{b_links}")
    print()

