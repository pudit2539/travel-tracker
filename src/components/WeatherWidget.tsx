// src/components/WeatherWidget.tsx
'use client';

import { useState, useEffect } from 'react';
import { fetchDestinationWeather, WeatherData } from '@/lib/weather';
import { CloudSun, Droplets, Thermometer, Wind, RefreshCw, Sparkles } from 'lucide-react';

interface WeatherWidgetProps {
  defaultCity?: string;
}

export default function WeatherWidget({ defaultCity = 'osaka' }: WeatherWidgetProps) {
  const [city, setCity] = useState<'osaka' | 'kyoto'>(
    defaultCity.toLowerCase().includes('kyo') ? 'kyoto' : 'osaka'
  );
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadWeather = async (targetCity: string) => {
    setLoading(true);
    try {
      const data = await fetchDestinationWeather(targetCity);
      setWeather(data);
    } catch (err) {
      console.error('Weather load err:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeather(city);
  }, [city]);

  return (
    <div className="relative overflow-hidden p-4 sm:p-5 rounded-3xl border border-rose-100/80 dark:border-[#323850]/80 bg-white/95 dark:bg-[#222638]/95 backdrop-blur-xl card-elevation transition-all duration-300 group space-y-3.5">
      {/* Background ambient glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#e06b88]/10 dark:bg-[#e06b88]/15 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />
      
      {/* Top row: City selector & Refresh */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-[#2a2f45] border border-slate-200/80 dark:border-[#323850] shadow-2xs">
          <button
            onClick={() => setCity('osaka')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              city === 'osaka'
                ? 'bg-[#e06b88] text-white shadow-xs scale-[1.02]'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            🍡 โอซาก้า (Osaka)
          </button>
          <button
            onClick={() => setCity('kyoto')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              city === 'kyoto'
                ? 'bg-[#e06b88] text-white shadow-xs scale-[1.02]'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            ⛩️ เกียวโต (Kyoto)
          </button>
        </div>

        <button
          onClick={() => loadWeather(city)}
          disabled={loading}
          className="p-2 rounded-xl text-slate-400 hover:text-[#e06b88] dark:hover:text-[#f7a1b5] hover:bg-slate-100 dark:hover:bg-[#2a2f45] hover:rotate-180 transition-all duration-500 cursor-pointer shadow-2xs"
          title="อัปเดตสภาพอากาศล่าสุด"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-[#e06b88]' : ''}`} />
        </button>
      </div>

      {/* Main weather info */}
      {weather && (
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="shrink-0 w-13 h-13 sm:w-15 sm:h-15 flex items-center justify-center text-3xl sm:text-4xl rounded-2xl bg-rose-50 dark:bg-[#2a2f45] border border-rose-200/80 dark:border-[#323850] shadow-xs">
              {weather.weatherEmoji}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {weather.temperature}°C
                </span>
                <span className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 truncate">
                  {weather.weatherText}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-bold truncate mt-0.5">
                <span>ต่ำสุด {weather.tempMin}°C</span>
                <span className="text-slate-400 dark:text-slate-500">•</span>
                <span>สูงสุด {weather.tempMax}°C</span>
              </div>
            </div>
          </div>

          {/* Rain chance pill */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/40 text-xs sm:text-sm font-bold shadow-2xs">
              <Droplets className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              <span>โอกาสฝนตก {weather.precipitationProb}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Smart Travel Advice Banner */}
      {weather && (
        <div className="relative z-10 p-3.5 rounded-2xl bg-rose-50/80 dark:bg-[#2a2f45]/90 border border-rose-200/80 dark:border-[#323850] text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium flex items-center gap-2.5">
          <Sparkles className="h-4 w-4 text-[#e06b88] dark:text-[#f7a1b5] shrink-0" />
          <span className="flex-1 leading-snug">{weather.travelAdvice}</span>
        </div>
      )}
    </div>
  );
}
