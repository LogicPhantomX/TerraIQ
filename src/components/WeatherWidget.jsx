import { useState, useEffect } from "react";
import { getWeatherForecast } from "@/lib/api";

const WEATHER_ICONS = {
  Clear:        "☀️",
  Clouds:       "⛅",
  Rain:         "🌧️",
  Drizzle:      "🌦️",
  Thunderstorm: "⛈️",
  Snow:         "❄️",
  Mist:         "🌫️",
  Fog:          "🌫️",
  Haze:         "🌫️",
};

// Nigerian farming regions and their coordinates
const REGION_COORDS = {
  "Oyo State":       { lat:7.3775, lon:3.9470 },
  "Kano State":      { lat:12.0022, lon:8.5920 },
  "Lagos State":     { lat:6.5244, lon:3.3792 },
  "Kaduna State":    { lat:10.5105, lon:7.4165 },
  "Rivers State":    { lat:4.8156, lon:7.0498 },
  "Ogun State":      { lat:7.1600, lon:3.3500 },
  "Borno State":     { lat:11.8333, lon:13.1500 },
  "Enugu State":     { lat:6.4584, lon:7.5464 },
  "Delta State":     { lat:5.8904, lon:5.6800 },
  "Kwara State":     { lat:8.4966, lon:4.5421 },
  "Nasarawa State":  { lat:8.5373, lon:8.5222 },
  "Ekiti State":     { lat:7.7190, lon:5.3110 },
  "Osun State":      { lat:7.5629, lon:4.5200 },
  "Ondo State":      { lat:7.2500, lon:5.1950 },
  "Edo State":       { lat:6.3350, lon:5.6037 },
};

function getCoords(region) {
  if (!region) return { lat:9.0820, lon:8.6753 }; // Nigeria centre
  const key = Object.keys(REGION_COORDS).find(k => region.toLowerCase().includes(k.toLowerCase().replace(" state","")));
  return REGION_COORDS[key] ?? { lat:9.0820, lon:8.6753 };
}

export default function WeatherWidget({ region }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!region) return;
    (async () => {
      try {
        const coords = getCoords(region);
        const data   = await getWeatherForecast(coords.lat, coords.lon);
        const current = data.list?.[0];
        const tomorrow = data.list?.[8]; // ~24hrs ahead
        if (current) {
          setWeather({
            temp:        Math.round(current.main.temp),
            feels_like:  Math.round(current.main.feels_like),
            humidity:    current.main.humidity,
            description: current.weather[0].description,
            main:        current.weather[0].main,
            wind:        Math.round(current.wind.speed * 3.6), // m/s to km/h
            rain_chance: Math.round((current.pop ?? 0) * 100),
            tomorrow_temp: tomorrow ? Math.round(tomorrow.main.temp) : null,
            tomorrow_rain: tomorrow ? Math.round((tomorrow.pop ?? 0) * 100) : null,
            tomorrow_main: tomorrow?.weather[0].main,
          });
        }
      } catch {
        // silently fail — weather is not critical
      } finally {
        setLoading(false);
      }
    })();
  }, [region]);

  if (loading) return (
    <div className="bg-white dark:bg-dark-surface rounded-2xl p-5 border border-deep-light dark:border-dark-light shadow-card animate-pulse">
      <div className="h-4 bg-deep-light dark:bg-dark-light rounded w-32 mb-3" />
      <div className="h-10 bg-deep-light dark:bg-dark-light rounded w-24 mb-2" />
      <div className="h-3 bg-deep-light dark:bg-dark-light rounded w-48" />
    </div>
  );

  if (!weather) return null;

  const icon = WEATHER_ICONS[weather.main] ?? "🌤️";

  // Farming advice based on conditions
  const advice = () => {
    if (weather.rain_chance > 70) return { text:"Heavy rain likely — skip irrigation today", color:"text-sky" };
    if (weather.rain_chance > 40) return { text:"Rain possible — check before irrigating", color:"text-amber" };
    if (weather.temp > 35)        return { text:"Very hot — water early morning only", color:"text-danger" };
    if (weather.humidity > 80)    return { text:"High humidity — watch for fungal disease", color:"text-amber" };
    return { text:"Good conditions for field work today", color:"text-terra" };
  };

  const { text, color } = advice();

  return (
    <div className="bg-white dark:bg-dark-surface rounded-2xl p-5 border border-deep-light dark:border-dark-light shadow-card">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-ink-500 dark:text-gray-400 text-xs font-medium mb-1">{region} · Today</p>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-ink dark:text-white">{weather.temp}°C</span>
            <span className="text-3xl mb-1">{icon}</span>
          </div>
          <p className="text-ink-500 dark:text-gray-400 text-sm capitalize mt-0.5">{weather.description}</p>
        </div>
        <div className="text-right">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-ink-500 dark:text-gray-500">💧 {weather.humidity}% humidity</span>
            <span className="text-xs text-ink-500 dark:text-gray-500">🌧️ {weather.rain_chance}% rain</span>
            <span className="text-xs text-ink-500 dark:text-gray-500">💨 {weather.wind} km/h</span>
          </div>
        </div>
      </div>

      {/* Farming advice */}
      <div className={`mt-3 pt-3 border-t border-deep-light dark:border-dark-light ${color} text-sm font-medium`}>
        {text}
      </div>

      {/* Tomorrow preview */}
      {weather.tomorrow_temp && (
        <div className="mt-2 flex items-center justify-between text-xs text-ink-500 dark:text-gray-500">
          <span>Tomorrow</span>
          <span>{WEATHER_ICONS[weather.tomorrow_main] ?? "🌤️"} {weather.tomorrow_temp}°C · {weather.tomorrow_rain}% rain</span>
        </div>
      )}
    </div>
  );
}
