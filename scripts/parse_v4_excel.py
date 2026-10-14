import sys
import openpyxl
import json

sys.stdout.reconfigure(encoding='utf-8')

wb = openpyxl.load_workbook('Japan_Osaka-Kyoto_04-15Dec2026_v4.xlsx')
ws = wb['Main Plan - Final']
rows = list(ws.iter_rows(values_only=False))

items = []
current = None

for idx, r in enumerate(rows[1:], start=2):
    vals = [c.value for c in r]
    hyperlinks = [c.hyperlink.target if c.hyperlink else None for c in r]
    
    date_val = str(vals[0]).strip() if vals[0] is not None else ''
    time_val = str(vals[1]).strip() if len(vals) > 1 and vals[1] is not None else ''
    city_val = str(vals[2]).strip() if len(vals) > 2 and vals[2] is not None else ''
    place_val = str(vals[3]).strip() if len(vals) > 3 and vals[3] is not None else ''
    food_val = str(vals[4]).strip() if len(vals) > 4 and vals[4] is not None else ''
    backup_val = str(vals[5]).strip() if len(vals) > 5 and vals[5] is not None else ''
    trans_val = str(vals[6]).strip() if len(vals) > 6 and vals[6] is not None else ''
    
    is_url_row = any(v.startswith('http') for v in [place_val, food_val, backup_val] if v)
    
    if date_val or time_val or (city_val and not is_url_row):
        if current:
            items.append(current)
        current = {
            'row_num': idx,
            'date_label': date_val,
            'time_slot': time_val,
            'city': city_val,
            'main_place': place_val if not place_val.startswith('http') else '',
            'main_place_links': [place_val] if place_val.startswith('http') else ([hyperlinks[3]] if len(hyperlinks) > 3 and hyperlinks[3] else []),
            'food_recommendation': food_val if not food_val.startswith('http') else '',
            'food_links': [food_val] if food_val.startswith('http') else ([hyperlinks[4]] if len(hyperlinks) > 4 and hyperlinks[4] else []),
            'backup_plan': backup_val if not backup_val.startswith('http') else '',
            'backup_links': [backup_val] if backup_val.startswith('http') else ([hyperlinks[5]] if len(hyperlinks) > 5 and hyperlinks[5] else []),
            'transport_info': trans_val if not trans_val.startswith('http') else '',
        }
    elif current:
        if place_val.startswith('http'):
            if place_val not in current['main_place_links']:
                current['main_place_links'].append(place_val)
        elif place_val and not current['main_place']:
            current['main_place'] = place_val
            
        if food_val.startswith('http'):
            if food_val not in current['food_links']:
                current['food_links'].append(food_val)
        elif food_val and not current['food_recommendation']:
            current['food_recommendation'] = food_val
            
        if backup_val.startswith('http'):
            if backup_val not in current['backup_links']:
                current['backup_links'].append(backup_val)
        elif backup_val:
            current['backup_plan'] = (current['backup_plan'] + '\n' + backup_val).strip()
            
        if trans_val and not current['transport_info']:
            current['transport_info'] = trans_val

if current:
    items.append(current)

print(f"Total parsed items: {len(items)}")
for i, it in enumerate(items):
    print(f"[{i+1}] {it['date_label']} {it['time_slot']} | {it['city']} | {it['main_place'][:45]}")
    if it['main_place_links']:
        print(f"   Place Links: {it['main_place_links']}")
    if it['food_links']:
        print(f"   Food Links: {it['food_links']}")
    if it['backup_links']:
        print(f"   Backup Links: {it['backup_links']}")

with open('scripts/v4_parsed_items.json', 'w', encoding='utf-8') as f:
    json.dump(items, f, ensure_ascii=False, indent=2)
print("Saved to scripts/v4_parsed_items.json")
