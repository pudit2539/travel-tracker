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
    <div className="relative overflow-hidden p-4 md:p-5 rounded-3xl border border-slate-200/80 dark:border-purple-800/50 bg-white/95 dark:bg-[#130d22]/95 backdrop-blur-xl card-elevation transition-all duration-300 group space-y-3">
      {/* Background ambient glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-pink-500/10 dark:bg-pink-500/15 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />
      
      {/* Top row: City selector & Refresh */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100/90 dark:bg-purple-950/70 border border-slate-200/60 dark:border-purple-900/40 shadow-inner">
          <button
            onClick={() => setCity('osaka')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              city === 'osaka'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/25 scale-[1.02]'
                : 'text-slate-600 dark:text-purple-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            🍡 โอซาก้า (Osaka)
          </button>
          <button
            onClick={() => setCity('kyoto')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              city === 'kyoto'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/25 scale-[1.02]'
                : 'text-slate-600 dark:text-purple-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            ⛩️ เกียวโต (Kyoto)
          </button>
        </div>

        <button
          onClick={() => loadWeather(city)}
          disabled={loading}
          className="p-2 rounded-xl text-slate-400 hover:text-pink-600 dark:hover:text-pink-400 hover:bg-slate-100 dark:hover:bg-purple-900/40 hover:rotate-180 transition-all duration-500 cursor-pointer shadow-2xs"
          title="อัปเดตสภาพอากาศล่าสุด"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-pink-500' : ''}`} />
        </button>
      </div>

      {/* Main weather info */}
      {weather && (
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-2xl sm:text-3xl rounded-2xl bg-gradient-to-tr from-pink-50 to-purple-50 dark:from-purple-950/80 dark:to-pink-950/60 border border-purple-200/60 dark:border-purple-900/60 shadow-sm">
              {weather.weatherEmoji}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {weather.temperature}°C
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-purple-200 truncate">
                  {weather.weatherText}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500 dark:text-purple-400 font-semibold truncate mt-0.5">
                <span>ต่ำสุด {weather.tempMin}°C</span>
                <span>•</span>
                <span>สูงสุด {weather.tempMax}°C</span>
              </div>
            </div>
          </div>

          {/* Rain chance pill */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-900 text-xs font-bold shadow-2xs">
              <Droplets className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>โอกาสฝนตก {weather.precipitationProb}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Smart Travel Advice Banner */}
      {weather && (
        <div className="relative z-10 p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/40 text-xs text-purple-950 dark:text-purple-200 font-medium flex items-center gap-2.5">
          <Sparkles className="h-4 w-4 text-pink-500 shrink-0" />
          <span className="flex-1 leading-snug">{weather.travelAdvice}</span>
        </div>
      )}
    </div>
  );
}
