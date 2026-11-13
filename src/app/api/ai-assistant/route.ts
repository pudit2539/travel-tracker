// src/app/api/ai-assistant/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    // Auth Check: Protect AI API quotas from unauthorized bots
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    if (token) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return NextResponse.json({ success: false, error: 'Unauthorized: Invalid session token' }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ success: false, error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const city = String(body?.city || 'Osaka').trim().slice(0, 80);
    const requestType = String(body?.requestType || '').trim().slice(0, 60);
    const query = String(body?.query || '').trim().slice(0, 240);

    const headerGeminiKey = req.headers.get('x-gemini-key')?.trim() || '';
    const headerAnthropicKey = req.headers.get('x-anthropic-key')?.trim() || '';
    const geminiKey =
      (headerGeminiKey.length > 10 ? headerGeminiKey : '') ||
      process.env.GEMINI_API_KEY?.trim() ||
      '';
    const anthropicKey =
      (headerAnthropicKey.length > 10 ? headerAnthropicKey : '') ||
      process.env.ANTHROPIC_API_KEY?.trim() ||
      '';

    const prompt = `You are a concise travel assistant for Japan.
Target city/area: "${city || 'Osaka'}"
User query: "${query || requestType || 'recommend top 3 spots'}"

Respond ONLY with a valid JSON array of max 3 items matching this schema:
[
  {
    "name": "Name in Thai and Japanese/English",
    "category": "หมวด เช่น ร้านราเมง / คาเฟ่ / จุดชมวิว / ในร่ม / วัดและศาลเจ้า / ชอปปิ้ง",
    "highlight": "จุดเด่นสั้นๆ 1 ประโยคพร้อมเวลาหรือการเดินทาง",
    "mapsQuery": "Google Maps search query with city name",
    "transportTip": "สถานีรถไฟใกล้ที่สุดสั้นๆ เช่น JR / Subway"
  }
]
No other text.`;

    const extractJsonArray = (rawText: string) => {
      const jsonMatch = String(rawText || '').match(/\[[\s\S]*\]/);
      if (!jsonMatch) return null;
      try {
        const items = JSON.parse(jsonMatch[0]);
        if (Array.isArray(items) && items.length > 0) {
          return items
            .slice(0, 4)
            .filter((x) => x && typeof x.name === 'string' && x.name.trim().length > 0)
            .map((x) => ({
              name: String(x.name).trim(),
              category: String(x.category || 'แนะนำ').trim(),
              highlight: String(x.highlight || '').trim(),
              mapsQuery: String(x.mapsQuery || `${x.name} ${city}`).trim(),
              transportTip: x.transportTip ? String(x.transportTip).trim() : '',
            }));
        }
      } catch {
        return null;
      }
      return null;
    };

    // 1. Try Google Gemini first (fast, free-tier friendly)
    if (geminiKey) {
      const geminiModels = ['gemini-2.5-flash', 'gemini-2.0-flash'];
      for (const model of geminiModels) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.4,
                maxOutputTokens: 500,
                responseMimeType: 'application/json',
              },
            }),
            signal: AbortSignal.timeout(12000),
          });
          if (!res.ok) continue;
          const geminiData = await res.json();
          const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const parsed = extractJsonArray(rawText);
          if (parsed && parsed.length > 0) {
            return NextResponse.json({
              success: true,
              provider: 'gemini',
              model,
              isFallback: false,
              data: { recommendations: parsed },
            });
          }
        } catch {
          // Try next Gemini model
        }
      }
    }

    // 2. Try Anthropic Claude Haiku cascade
    if (anthropicKey) {
      const haikuModels = [
        'claude-haiku-4-5-20251001',
        'claude-3-5-haiku-20241022',
        'claude-3-haiku-20240307',
      ];
      for (const model of haikuModels) {
        try {
          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': anthropicKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model,
              max_tokens: 450,
              messages: [{ role: 'user', content: prompt }],
            }),
            signal: AbortSignal.timeout(12000),
          });
          if (!res.ok) continue;
          const anthropicData = await res.json();
          const rawText = anthropicData?.content?.[0]?.text || '';
          const parsed = extractJsonArray(rawText);
          if (parsed && parsed.length > 0) {
            return NextResponse.json({
              success: true,
              provider: 'claude',
              model,
              isFallback: false,
              data: { recommendations: parsed },
            });
          }
        } catch {
          // try next fallback model tier
        }
      }
    }

    // 3. Curated offline fallback with explicit isFallback flag
    const targetCity = city || 'Osaka';
    return NextResponse.json({
      success: true,
      provider: 'offline-curated',
      isFallback: true,
      fallbackReason: !geminiKey && !anthropicKey ? 'no_api_key' : 'api_error',
      data: {
        recommendations: [
          {
            name: `ย่านชอปปิ้ง & จุดไฮไลต์ใจกลาง ${targetCity}`,
            category: 'สถานที่ท่องเที่ยว / แลนด์มาร์ก',
            highlight: `คำแนะนำเบื้องต้นสำหรับ ${targetCity} (ตั้งค่า Gemini หรือ Claude AI Key เพื่อรับคำแนะนำแบบเรียลไทม์ตรงตามคำถาม)`,
            mapsQuery: `${targetCity} famous landmark Japan`,
          },
          {
            name: `ร้านราเมง / อาหารท้องถิ่นใกล้สถานีหลัก ${targetCity}`,
            category: 'อาหารท้องถิ่น',
            highlight: 'เดินทางสะดวกใกล้วงเวียนสถานีหลัก มีหลายร้านเปิดดึกและมีเมนูรูปภาพ',
            mapsQuery: `${targetCity} station top ramen restaurant Japan`,
          },
          {
            name: `ศูนย์การค้าและถนนชอปปิ้งมีหลังคา ${targetCity} (Plan B)`,
            category: 'ในร่ม / แผนสำรอง',
            highlight: 'เดินได้สบายแม้ฝนตกหรืออากาศหนาว พร้อมร้านยา Duty-Free และคาเฟ่',
            mapsQuery: `${targetCity} shopping arcade mall Japan`,
          },
        ],
      },
    });
  } catch (err: any) {
    console.error('AI assistant error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'AI Assistant failed' },
      { status: 500 }
    );
  }
}
