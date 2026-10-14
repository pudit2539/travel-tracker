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
    backup = it.get('backup_plan', '')
    b_links = it.get('backup_links', [])
    food = it.get('food_recommendation', '')
    f_links = it.get('food_links', [])
    
    lines = [l.strip() for l in backup.split('\n') if l.strip()]
    if lines or food:
        print(f"=== ITEM #{idx}: {it.get('date_label')} {it.get('time_slot')} | {it.get('city')} ===")
        print(f"  Main: {it.get('main_place')}")
        if food:
            print(f"  Food: {food}")
            print(f"    Food links: {f_links}")
        if lines:
            print(f"  Backup ({len(lines)} lines, {len(b_links)} links):")
            for i, l in enumerate(lines):
                lk = b_links[i] if i < len(b_links) else '(FALLBACK AUTO QUERY)'
                print(f"    [{i+1}] {l}")
                print(f"        -> {lk}")
        print()
