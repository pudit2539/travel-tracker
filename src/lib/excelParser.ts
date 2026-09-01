// src/lib/excelParser.ts
import * as XLSX from 'xlsx';

export interface PlanItemInput {
  date_label: string;
  time_slot: string;
  city: string;
  main_place: string;
  main_place_links: string[];
  food_recommendation: string;
  food_links: string[];
  backup_plan: string;
  backup_links: string[];
  transport_info: string;
  sort_order: number;
}

export function parseTripExcel(fileBuffer: ArrayBuffer): PlanItemInput[] {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  // ค้นหา Sheet ที่มีชื่อ 'Main Plan' หรือใช้ Sheet แรก
  const sheetName = workbook.SheetNames.find((n) => n.toLowerCase().includes('main')) || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const items: PlanItemInput[] = [];
  let current: PlanItemInput | null = null;

  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.length === 0) continue;

    const [date, time, city, place, food, backup, transport] = row.map((v) =>
      v !== undefined && v !== null ? String(v).trim() : ''
    );

    // ตรวจสอบว่าเป็นแถวที่มีแต่ URL หรือไม่
    const isUrlRow = [place, food, backup].some((v) => v?.startsWith('http'));

    // ถ้าเป็นแถวข้อมูลกิจกรรมใหม่ (มีวันที่, เวลา หรือชื่อเมืองที่ไม่ใช่ URL)
    if (date || time || (city && !isUrlRow)) {
      if (current) items.push(current);
      current = {
        date_label: date || '',
        time_slot: time || '',
        city: city || '',
        main_place: place?.startsWith('http') ? '' : (place || ''),
        main_place_links: place?.startsWith('http') ? [place] : [],
        food_recommendation: food?.startsWith('http') ? '' : (food || ''),
        food_links: food?.startsWith('http') ? [food] : [],
        backup_plan: backup?.startsWith('http') ? '' : (backup || ''),
        backup_links: backup?.startsWith('http') ? [backup] : [],
        transport_info: transport || '',
        sort_order: items.length,
      };
    } else if (current) {
      // ถ้าเป็นแถวต่อเนื่อง (URL หรือข้อความเพิ่มเติมใต้แถวหลัก)
      if (place?.startsWith('http')) {
        if (!current.main_place_links.includes(place)) current.main_place_links.push(place);
      } else if (place && !current.main_place) {
        current.main_place = place;
      }

      if (food?.startsWith('http')) {
        if (!current.food_links.includes(food)) current.food_links.push(food);
      } else if (food && !current.food_recommendation) {
        current.food_recommendation = food;
      }

      if (backup?.startsWith('http')) {
        if (!current.backup_links.includes(backup)) current.backup_links.push(backup);
      } else if (backup) {
        current.backup_plan = current.backup_plan ? `${current.backup_plan}\n${backup}` : backup;
      }

      if (transport && !current.transport_info) {
        current.transport_info = transport;
      }
    }
  }

  if (current) items.push(current);
  return items;
}