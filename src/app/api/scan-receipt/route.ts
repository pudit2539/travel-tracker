// src/app/api/scan-receipt/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const STRICT_OCR_PROMPT = `You are a high-precision receipt scanner and OCR engine.
Analyze this receipt image and extract ONLY information that is physically printed on the receipt.

CRITICAL INSTRUCTIONS:
1. TRUTHFULNESS & ACCURACY: Extract ONLY what is visible on the receipt. NEVER guess, hallucinate, assume, or extrapolate.
2. NO FOOD BIAS: Do NOT assume this is a food/restaurant bill unless clearly indicated! If this is an electronics store (e.g. Bic Camera, Yodobashi Camera, Apple, Power Buy), pharmacy, clothing store, hotel, train/metro pass, or amusement park, accurately record the ACTUAL store name, ACTUAL category, and ACTUAL line items.
3. CATEGORY CLASSIFICATION:
   - "shopping": electronics, gadgets, appliances, cosmetics, clothing, souvenirs, general merchandise
   - "food": restaurants, cafes, food stalls, beverages, dining
   - "transport": trains, subways, Shinkansen, taxis, buses, flights, fuel, parking, tolls
   - "hotel": hotels, hostels, accommodation
   - "ticket": theme parks, museums, concerts, attractions
   - "other": medical, utilities, services, miscellaneous
4. LINE ITEMS (items):
   - Extract distinct items/products/services clearly listed on the receipt with prices.
   - "name": Exact product/model/dish name as printed on the receipt (Japanese, Thai, or English).
   - "amount": Line price as a positive number.
   - "qty": Quantity purchased as a number (default 1).
   - If the receipt does NOT have clearly distinguishable line items, or the itemized rows are illegible/blurred, return "items": []. DO NOT make up items!
5. TOTAL AMOUNT & CURRENCY:
   - "amount": The grand total paid as a number.
   - "currency": The 3-letter currency code (e.g., "JPY", "THB", "USD", "EUR"). Look for symbols like ¥, ฿, $, €.
6. UNREADABLE / NOT A RECEIPT:
   - If the image is not a receipt or completely illegible, set "unreadable": true.

Return ONLY a JSON object matching this schema without any markdown formatting or extra text:
{
  "unreadable": false,
  "merchant": "Exact store or merchant name as printed",
  "amount": 0.00,
  "currency": "JPY",
  "category": "shopping",
  "date": "YYYY-MM-DD",
  "items": [
    { "name": "Item name as printed", "amount": 0.00, "qty": 1 }
  ]
}`;

export async function POST(req: Request) {
  try {
    // Auth Check: Protect AI vision quotas from unauthorized bots
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

    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64) {
      return NextResponse.json({ success: false, error: 'กรุณาแนบรูปภาพใบเสร็จ' }, { status: 400 });
    }

    // Check API Keys: Priority header > environment variable
    const geminiKey = req.headers.get('x-gemini-key') || process.env.GEMINI_API_KEY;
    const anthropicKey = req.headers.get('x-anthropic-key') || process.env.ANTHROPIC_API_KEY;

    if (!geminiKey && !anthropicKey) {
      return NextResponse.json({
        success: false,
        noKey: true,
        error: 'ยังไม่ได้เชื่อมต่อ AI API Key (กรุณาระบุ Gemini หรือ Claude API Key เพื่อให้อ่านภาพใบเสร็จจริงตามข้อความจริง ไม่สุ่มข้อมูล)',
      }, { status: 200 });
    }

    let parsedData: any = null;

    // 1. Try Google Gemini Flash Vision if configured
    if (geminiKey) {
      const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash'];
      for (const model of modelsToTry) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      inlineData: {
                        mimeType: mimeType || 'image/jpeg',
                        data: imageBase64,
                      },
                    },
                    {
                      text: STRICT_OCR_PROMPT,
                    },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1,
              },
            }),
          });

          if (res.ok) {
            const gJson = await res.json();
            const candidateText = gJson?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const gMatch = candidateText.match(/\{[\s\S]*\}/);
            if (gMatch) {
              parsedData = JSON.parse(gMatch[0]);
              break;
            }
          } else {
            const errBody = await res.text();
            console.warn(`Gemini model ${model} error:`, errBody);
          }
        } catch (geminiErr) {
          console.warn(`Gemini OCR failed on ${model}:`, geminiErr);
        }
      }
    }

    // 2. Try Anthropic Claude Vision if Gemini wasn't available or didn't parse
    if (!parsedData && anthropicKey) {
      try {
        const Anthropic = (await import('@anthropic-ai/sdk')).default;
        const anthropic = new Anthropic({ apiKey: anthropicKey });

        const response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1500,
          temperature: 0.1,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mimeType || 'image/jpeg',
                    data: imageBase64,
                  },
                },
                {
                  type: 'text',
                  text: STRICT_OCR_PROMPT,
                },
              ],
            },
          ],
        });

        const textBlock = response.content.find((c) => c.type === 'text');
        const textContent = textBlock?.type === 'text' ? textBlock.text : '{}';
        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        }
      } catch (anthropicErr: any) {
        console.warn('Anthropic OCR failed:', anthropicErr?.message || anthropicErr);
      }
    }

    // 3. Handle unreadable or failed results
    if (!parsedData || parsedData.unreadable) {
      return NextResponse.json({
        success: false,
        error: 'ไม่สามารถอ่านข้อความจากใบเสร็จนี้ได้ หรือภาพไม่ชัดเจน กรุณากรอกรายการด้วยตนเอง',
      }, { status: 200 });
    }

    // 4. Sanitize and validate extracted data (STRICT: no hallucination)
    const rawItems = Array.isArray(parsedData.items) ? parsedData.items : [];
    const sanitizedItems = rawItems
      .filter((it: any) => it && (typeof it.name === 'string' || it.amount))
      .map((it: any) => ({
        name: String(it.name || '').trim(),
        amount: Math.abs(Number(it.amount) || 0),
        qty: Math.max(1, Math.round(Number(it.qty) || 1)),
      }))
      .filter((it: any) => it.name.length > 0 || it.amount > 0);

    let totalAmount = Math.abs(Number(parsedData.amount) || 0);
    if (totalAmount === 0 && sanitizedItems.length > 0) {
      totalAmount = sanitizedItems.reduce((sum: number, it: any) => sum + (it.amount * it.qty), 0);
    }

    const validCategories = ['shopping', 'food', 'transport', 'hotel', 'ticket', 'other'];
    const category = validCategories.includes(parsedData.category) ? parsedData.category : 'shopping';

    const resultData = {
      merchant: String(parsedData.merchant || '').trim() || 'ร้านค้าตามใบเสร็จ',
      amount: totalAmount,
      currency: String(parsedData.currency || 'JPY').toUpperCase().trim().substring(0, 3) || 'JPY',
      category,
      date: /^\d{4}-\d{2}-\d{2}$/.test(parsedData.date)
        ? parsedData.date
        : new Date().toISOString().split('T')[0],
      items: sanitizedItems,
    };

    return NextResponse.json({
      success: true,
      data: resultData,
    });

  } catch (error: any) {
    console.error('OCR Route Error:', error);
    return NextResponse.json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการสแกนใบเสร็จ กรุณาลองใหม่อีกครั้ง หรือกรอกข้อมูลด้วยตนเอง',
    }, { status: 500 });
  }
}
