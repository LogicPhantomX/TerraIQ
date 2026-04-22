// WeatherWidget — Open-Meteo (free, no API key, no domain restriction)
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const ICONS = {
  0:"☀️", 1:"🌤️", 2:"⛅", 3:"☁️", 45:"🌫️", 48:"🌫️",
  51:"🌦️", 53:"🌦️", 55:"🌧️", 61:"🌧️", 63:"🌧️", 65:"🌧️",
  71:"❄️", 73:"❄️", 75:"❄️", 80:"🌦️", 81:"🌧️", 82:"🌧️",
  95:"⛈️", 96:"⛈️", 99:"⛈️"
};
const DESC_KEY = {
  0:"clearSky", 1:"mainlyClear", 2:"partlyCloudy", 3:"overcast",
  45:"foggy", 48:"foggy", 51:"lightDrizzle", 53:"drizzle", 55:"heavyDrizzle",
  61:"lightRain", 63:"moderateRain", 65:"heavyRain",
  71:"lightSnow", 73:"moderateSnow", 75:"heavySnow",
  80:"rainShowers", 81:"rainShowers", 82:"violentShowers",
  95:"thunderstorm", 96:"thunderstorm", 99:"thunderstorm"
};

const STATE_COORDS = {
  "oyo":{ lat:7.38, lon:3.95 }, "kano":{ lat:12.00, lon:8.59 },
  "lagos":{ lat:6.52, lon:3.38 }, "kaduna":{ lat:10.51, lon:7.42 },
  "rivers":{ lat:4.82, lon:7.05 }, "ogun":{ lat:7.16, lon:3.35 },
  "borno":{ lat:11.83, lon:13.15 }, "enugu":{ lat:6.46, lon:7.55 },
  "delta":{ lat:5.89, lon:5.68 }, "kwara":{ lat:8.50, lon:4.54 },
  "nasarawa":{ lat:8.54, lon:8.52 }, "ekiti":{ lat:7.72, lon:5.31 },
  "osun":{ lat:7.56, lon:4.52 }, "ondo":{ lat:7.25, lon:5.20 },
  "edo":{ lat:6.34, lon:5.60 }, "anambra":{ lat:6.22, lon:7.07 },
  "imo":{ lat:5.49, lon:7.03 }, "abia":{ lat:5.53, lon:7.49 },
  "cross river":{ lat:5.87, lon:8.60 }, "akwa ibom":{ lat:5.01, lon:7.87 },
  "bauchi":{ lat:10.31, lon:9.85 }, "gombe":{ lat:10.29, lon:11.17 },
  "adamawa":{ lat:9.33, lon:12.46 }, "taraba":{ lat:7.99, lon:10.77 },
  "plateau":{ lat:9.92, lon:8.89 }, "benue":{ lat:7.19, lon:8.13 },
  "kogi":{ lat:7.80, lon:6.74 }, "niger":{ lat:9.62, lon:6.55 },
  "kebbi":{ lat:12.45, lon:4.20 }, "sokoto":{ lat:13.06, lon:5.24 },
  "zamfara":{ lat:12.17, lon:6.66 }, "katsina":{ lat:12.99, lon:7.60 },
  "jigawa":{ lat:12.23, lon:9.56 }, "yobe":{ lat:12.30, lon:11.44 },
  "bayelsa":{ lat:4.77, lon:6.06 }, "fct":{ lat:9.08, lon:7.40 },
};

function getCoords(region) {
  if (!region) return { lat:9.08, lon:7.40 };
  const key = region.toLowerCase().replace(" state","").trim();
  return STATE_COORDS[key] || { lat:9.08, lon:7.40 };
}

export default function WeatherWidget({ city, region }) {
  const { t } = useTranslation();
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loc,     setLoc]     = useState("");

  useEffect(() => {
    if (!city && !region) { setLoading(false); return; }
    (async () => {
      try {
        let coords     = getCoords(region);
        let displayLoc = region || "Nigeria";


        // Open-Meteo geocoding — free, no key needed
        if (city?.trim()) {
          try {
            const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city + " Nigeria")}&count=1&language=en&format=json`;
            const geo = await fetch(geoUrl);
            const gd = await geo.json();
            if (gd.results?.[0]) {
              coords = { lat: gd.results[0].latitude, lon: gd.results[0].longitude };
              displayLoc = `${city}, ${region || "Nigeria"}`;
            } else {
            }
          } catch (geoErr) {
            // use state coords
          }
        }
        setLoc(displayLoc);

        // Open-Meteo weather — free, no key, works anywhere
        const url =
          `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${coords.lat}&longitude=${coords.lon}` +
          `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation_probability` +
          `&daily=weather_code,temperature_2m_max,precipitation_probability_max` +
          `&timezone=Africa%2FLagos&forecast_days=2`;

        const res  = await fetch(url);
        const data = await res.json();
        const cur  = data.current;
        const day  = data.daily;

        if (!cur) {
          throw new Error("No weather data");
        }

        setWeather({
          temp:        Math.round(cur.temperature_2m),
          humidity:    cur.relative_humidity_2m,
          rain_chance: cur.precipitation_probability || 0,
          wind:        Math.round(cur.wind_speed_10m),
          code:        cur.weather_code,
          tomorrow_temp: day?.temperature_2m_max?.[1] ? Math.round(day.temperature_2m_max[1]) : null,
          tomorrow_rain: day?.precipitation_probability_max?.[1] ?? null,
          tomorrow_code: day?.weather_code?.[1] ?? null,
        });
      } catch (err) {
      } finally {
        setLoading(false);
      }
    })();
  }, [city, region]);

  if (loading) return (
    <div className="bg-white dark:bg-dark-surface rounded-2xl p-5 border border-deep-light dark:border-dark-light shadow-card animate-pulse">
      <div className="h-4 bg-deep-light dark:bg-dark-light rounded w-32 mb-3"/>
      <div className="h-10 bg-deep-light dark:bg-dark-light rounded w-24 mb-2"/>
      <div className="h-3 bg-deep-light dark:bg-dark-light rounded w-48"/>
    </div>
  );

  if (!weather) return (
    <div className="bg-white dark:bg-dark-surface rounded-2xl p-5 border border-deep-light dark:border-dark-light shadow-card">
      <p className="text-ink-500 dark:text-gray-400 text-sm">
        {t("common.setLocation") || "Set your location in Profile to see weather"}
      </p>
    </div>
  );

  const icon = ICONS[weather.code] ?? "🌤️";
  const descKey = DESC_KEY[weather.code] ?? "clearSky";
  const desc = t(`weather.${descKey}`) || "Clear sky";

  const advice = () => {
    if (weather.rain_chance > 70) return { text:t("weather.heavyRain") || "Heavy rain likely — skip irrigation today",    c:"text-sky"       };
    if (weather.rain_chance > 40) return { text:t("weather.lightRain") || "Rain possible — check before irrigating",       c:"text-amber"     };
    if (weather.temp > 35)        return { text:t("weather.veryHot")   || "Very hot — water crops early morning only",     c:"text-red-500"   };
    if (weather.humidity > 80)    return { text:t("weather.highHumid") || "High humidity — watch for fungal disease",      c:"text-amber"     };
    return                               { text:t("weather.goodDay")   || "Good conditions for field work today",          c:"text-terra"     };
  };
  const { text, c } = advice();

  return (
    <div className="bg-white dark:bg-dark-surface rounded-2xl p-5 border border-deep-light dark:border-dark-light shadow-card">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-ink-500 dark:text-gray-400 text-xs font-medium mb-1">
            {loc} · {t("weather.today") || "Today"}
          </p>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-ink dark:text-white">{weather.temp}°C</span>
            <span className="text-3xl mb-1">{icon}</span>
          </div>
          <p className="text-ink-500 dark:text-gray-400 text-sm capitalize mt-0.5">{desc}</p>
        </div>
        <div className="text-right space-y-1">
          <p className="text-xs text-ink-500 dark:text-gray-500">💧 {weather.humidity}%</p>
          <p className="text-xs text-ink-500 dark:text-gray-500">🌧️ {weather.rain_chance}%</p>
          <p className="text-xs text-ink-500 dark:text-gray-500">💨 {weather.wind} km/h</p>
        </div>
      </div>

      <div className={`mt-3 pt-3 border-t border-deep-light dark:border-dark-light ${c} text-sm font-medium`}>
        {text}
      </div>

      {weather.tomorrow_temp && (
        <div className="mt-2 flex justify-between text-xs text-ink-500 dark:text-gray-500">
          <span>{t("weather.tomorrow") || "Tomorrow"}</span>
          <span>
            {ICONS[weather.tomorrow_code] ?? "🌤️"} {weather.tomorrow_temp}°C
            · {weather.tomorrow_rain}% {t("weather.rain") || "rain"}
          </span>
        </div>
      )}
    </div>
  );
}
