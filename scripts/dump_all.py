import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('scripts/v4_parsed_items.json', encoding='utf-8') as f:
    items = json.load(f)

current_day = ""
for idx, it in enumerate(items):
    day = it.get('date_label')
    if day != current_day:
        current_day = day
        print(f"\n==================== {day} ====================")
    print(f"[{idx+1}] {it.get('time_slot')} | {it.get('city')} | {it.get('main_place')}")
    print(f"    - Transport: {it.get('transport_info')}")
    print(f"    - Food: {it.get('food_recommendation')}")
    backups = [b.strip() for b in it.get('backup_plan', '').split('\n') if b.strip()]
    if backups:
        print(f"    - Backups:")
        for b in backups:
            print(f"        * {b}")
