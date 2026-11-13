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

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Mock fallback if API key is not configured
      return NextResponse.json({
        success: true,
        data: {
          recommendations: [
            {
              name: `จุดแนะนำยอดนิยมใน ${city || 'Osaka'}`,
              category: 'สถานที่ท่องเที่ยว / คาเฟ่',
              highlight: 'บรรยากาศดี ถ่ายรูปสวย เดินทางสะดวกจากสถานีหลัก',
              mapsQuery: `${city || 'Osaka'} attraction`,
            },
            {
              name: `ร้านอาหารเด็ดใกล้เคียง`,
              category: 'อาหารท้องถิ่น',
              highlight: 'เมนูยอดนิยม รสชาติต้นตำรับ ราคาเป็นมิตร',
              mapsQuery: `${city || 'Osaka'} restaurant`,
            },
            {
              name: `จุดพักผ่อน / Plan B ในร่ม`,
              category: 'แผนสำรอง',
              highlight: 'เหมาะสำหรับช่วงฝนตกหรือเวลาเหลือ ชอปปิงเพลิน',
              mapsQuery: `${city || 'Osaka'} shopping mall`,
            },
          ],
        },
      });
    }

    // Lean, token-efficient prompt (strict max_tokens: 350)
    const prompt = `You are a concise travel assistant for Japan.
Target city/area: "${city || 'Osaka'}"
User query: "${query || requestType || 'recommend top 3 spots'}"

Respond ONLY with a valid JSON array of max 3 items matching this schema:
[
  {
    "name": "Name in Thai and Japanese/English",
    "category": "หมวด เช่น ร้านราเมง / คาเฟ่ / จุดชมวิว / ในร่ม",
    "highlight": "จุดเด่นสั้นๆ 1 ประโยค",
    "mapsQuery": "Google Maps search query"
  }
]
No other text, markdown blocks only if standard JSON.`;

    // Ultra-fast, cost-efficient Haiku model cascade with strict timeout
    const haikuModels = [
      'claude-haiku-4-5-20251001',
      'claude-3-5-haiku-20241022',
      'claude-3-haiku-20240307',
    ];
    let anthropicData: any = null;

    for (const model of haikuModels) {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model,
            max_tokens: 350,
            messages: [{ role: 'user', content: prompt }],
          }),
          signal: AbortSignal.timeout(12000),
        });
        if (res.ok) {
          anthropicData = await res.json();
          break;
        }
      } catch {
        // try next fallback model tier
      }
    }

    const rawText = anthropicData?.content?.[0]?.text || '';
    
    // Extract JSON array safely
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const items = JSON.parse(jsonMatch[0]);
        if (Array.isArray(items) && items.length > 0) {
          return NextResponse.json({ success: true, data: { recommendations: items } });
        }
      } catch {
        // fall through to curated offline fallback
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        recommendations: [
          {
            name: `${city || 'Osaka'} Highlight Spot`,
            category: 'สถานที่ท่องเที่ยว',
            highlight: 'จุดชมวิวและถ่ายรูปยอดนิยม',
            mapsQuery: `${city || 'Osaka'}`,
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
