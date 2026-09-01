// src/lib/weather.ts

export interface WeatherData {
  city: string;
  temperature: number;
  tempMin: number;
  tempMax: number;
  weatherCode: number;
  weatherText: string;
  weatherEmoji: string;
  precipitationProb: number;
  travelAdvice: string;
  lastUpdated: string;
}

const CITY_COORDINATES: { [key: string]: { lat: number; lon: number; nameTh: string } } = {
  osaka: { lat: 34.6937, lon: 135.5023, nameTh: 'โอซาก้า (Osaka)' },
  kyoto: { lat: 35.0116, lon: 135.7681, nameTh: 'เกียวโต (Kyoto)' },
  tokyo: { lat: 35.6762, lon: 139.6503, nameTh: 'โตเกียว (Tokyo)' },
};

function getWeatherInfoFromCode(code: number): { text: string; emoji: string } {
  if (code === 0) return { text: 'ท้องฟ้าแจ่มใส แดดออก', emoji: '☀️' };
  if (code === 1 || code === 2) return { text: 'มีเมฆบางส่วน', emoji: '🌤️' };
  if (code === 3) return { text: 'เมฆครึ้ม', emoji: '☁️' };
  if (code >= 45 && code <= 48) return { text: 'มีหมอกบางๆ', emoji: '🌫️' };
  if (code >= 51 && code <= 55) return { text: 'ฝนตกปรอยๆ', emoji: '🌦️' };
  if (code >= 61 && code <= 65) return { text: 'ฝนตกปานกลาง', emoji: '🌧️' };
  if (code >= 71 && code <= 77) return { text: 'หิมะตก', emoji: '❄️' };
  if (code >= 80 && code <= 82) return { text: 'ฝนตกหนัก', emoji: '⛈️' };
  if (code >= 95) return { text: 'พายุฝนฟ้าคะนอง', emoji: '⚡' };
  return { text: 'อากาศสบายๆ', emoji: '⛅' };
}

export async function fetchDestinationWeather(cityKey: string = 'osaka'): Promise<WeatherData> {
  const normalizedKey = cityKey.toLowerCase().includes('kyo') ? 'kyoto' : 'osaka';
  const target = CITY_COORDINATES[normalizedKey] || CITY_COORDINATES.osaka;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${target.lat}&longitude=${target.lon}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTokyo`;
    
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) throw new Error('Weather API error');
    const data = await res.json();

    const currentTemp = Math.round(data.current?.temperature_2m ?? 12);
    const weatherCode = data.current?.weather_code ?? 1;
    const tempMax = Math.round(data.daily?.temperature_2m_max?.[0] ?? currentTemp + 3);
    const tempMin = Math.round(data.daily?.temperature_2m_min?.[0] ?? currentTemp - 4);
    const precipProb = data.daily?.precipitation_probability_max?.[0] ?? 10;

    const { text, emoji } = getWeatherInfoFromCode(weatherCode);

    let advice = 'อากาศกำลังดี เหมาะกับการเดินเที่ยวชมเมือง';
    if (precipProb > 50) {
      advice = '🌧️ มีโอกาสฝนตกสูง แนะนำพกร่ม หรือเปลี่ยนไปเดินเที่ยวชอปปิงในร่ม (Plan B)';
    } else if (currentTemp < 10) {
      advice = '❄️ อากาศหนาวเย็น ลมแรง แนะนำสวมเสื้อโค้ทหนา ฮีทเทค และผ้าพันคอ';
    } else if (currentTemp > 28) {
      advice = '☀️ อากาศค่อนข้างร้อน แนะนำพกน้ำดื่ม หมวก และแว่นกันแดด';
    }

    return {
      city: target.nameTh,
      temperature: currentTemp,
      tempMin,
      tempMax,
      weatherCode,
      weatherText: text,
      weatherEmoji: emoji,
      precipitationProb: precipProb,
      travelAdvice: advice,
      lastUpdated: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    };
  } catch (err) {
    console.warn('Weather fetch error, using fallback:', err);
    return {
      city: target.nameTh,
      temperature: 11,
      tempMin: 6,
      tempMax: 15,
      weatherCode: 1,
      weatherText: 'ท้องฟ้าแจ่มใส ลมหนาว',
      weatherEmoji: '🌤️',
      precipitationProb: 15,
      travelAdvice: '🧥 อากาศเย็นสบายในฤดูหนาว แนะนำเสื้อกันหนาวอุ่นๆ',
      lastUpdated: '12:00',
    };
  }
}
