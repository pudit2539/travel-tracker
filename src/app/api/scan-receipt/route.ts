// src/app/api/scan-receipt/route.ts
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'ANTHROPIC_API_KEY is not configured in .env.local' },
        { status: 400 }
      );
    }

    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64) {
      return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 });
    }

    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
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
              text: `กรุณาวิเคราะห์รูปภาพใบเสร็จนี้ และตอบกลับเฉพาะ JSON รูปแบบนี้เท่านั้น (ห้ามใส่ Markdown หรือคำอธิบายอื่น):
{
  "merchant": "ชื่อร้านค้า หรือสถานที่",
  "amount": 0.00,
  "currency": "JPY",
  "category": "food",
  "date": "YYYY-MM-DD"
}
* category: food, transport, shopping, hotel, ticket, other`,
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((c) => c.type === 'text');
    const textContent = textBlock?.type === 'text' ? textBlock.text : '{}';

    // Regex สกัด JSON object แม้จะมีข้อความติดมา
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI response did not contain valid JSON');
    }

    const parsedData = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('OCR Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process receipt' },
      { status: 500 }
    );
  }
}