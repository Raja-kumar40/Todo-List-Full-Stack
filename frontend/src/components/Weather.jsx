
import { useEffect, useState } from "react";
import "./Weather.css";

const weatherInfo = {
  0: ["Clear Sky", "☀️"],
  1: ["Mainly Clear", "🌤️"],
  2: ["Partly Cloudy", "⛅"],
  3: ["Overcast", "☁️"],
  45: ["Foggy", "🌫️"],
  48: ["Foggy", "🌫️"],
  51: ["Light Drizzle", "🌦️"],
  53: ["Drizzle", "🌦️"],
  55: ["Heavy Drizzle", "🌧️"],
  61: ["Light Rain", "🌧️"],
  63: ["Moderate Rain", "🌧️"],
  65: ["Heavy Rain", "⛈️"],
  71: ["Light Snow", "🌨️"],
  73: ["Snow", "❄️"],
  75: ["Heavy Snow", "❄️"],
  80: ["Rain Showers", "🌦️"],
  81: ["Rain Showers", "🌧️"],
  82: ["Heavy Showers", "⛈️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm", "⛈️"],
  99: ["Heavy Thunderstorm", "⛈️"]
};

function Weather() {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getWeather = async (latitude, longitude, cityName) => {
    try {
      setLoading(true);
      setError("");

      const url = new URL(
        "https://api.open-meteo.com/v1/forecast"
      );

      url.search = new URLSearchParams({
        latitude,
        longitude,
        current: [
          "temperature_2m",
          "relative_humidity_2m",
          "apparent_temperature",
          "is_day",
          "precipitation",
          "weather_code",
          "wind_speed_10m"
        ].join(","),
        daily: [
          "weather_code",
          "temperature_2m_max",
          "temperature_2m_min",
          "sunrise",
          "sunset"
        ].join(","),
        timezone: "auto",
        forecast_days: "7"
      });

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Weather data could not be loaded.");
      }

      const data = await response.json();

      setWeather({
        ...data.current,
        city: cityName,
        timezone: data.timezone
      });

      const days = data.daily.time.map((date, index) => ({
        date,
        code: data.daily.weather_code[index],
        max: data.daily.temperature_2m_max[index],
        min: data.daily.temperature_2m_min[index]
      }));

      setForecast(days);
      setCity(cityName);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const searchCity = async (e) => {
    e.preventDefault();

    if (!city.trim()) {
      setError("Please enter a city name.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
      );

      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        throw new Error("City not found. Please try another city.");
      }

      const location = data.results[0];

      await getWeather(
        location.latitude,
        location.longitude,
        `${location.name}${location.country ? ", " + location.country : ""}`
      );
    } catch (err) {
      setError(err.message || "Unable to find city.");
      setLoading(false);
    }
  };

  const getMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Your browser does not support location.");
      return;
    }

    setLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await getWeather(
          position.coords.latitude,
          position.coords.longitude,
          "My Current Location"
        );
      },
      () => {
        setLoading(false);
        setError("Location permission denied. Please search your city.");
      }
    );
  };

  useEffect(() => {
    getMyLocation();
  }, []);

  const getWeatherIcon = (code) => {
    return weatherInfo[code]?.[1] || "🌤️";
  };

  const getWeatherText = (code) => {
    return weatherInfo[code]?.[0] || "Unknown";
  };

  const formatDay = (date, index) => {
    if (index === 0) return "Today";

    return new Date(date + "T12:00:00").toLocaleDateString(
      "en-US",
      { weekday: "short" }
    );
  };

  if (loading && !weather) {
    return (
      <div className="weather-loading">
        <div className="weather-spinner"></div>
        <h3>Loading Weather...</h3>
        <p>Getting latest weather information</p>
      </div>
    );
  }

  return (
    <div className="weather-page">

      <div className="weather-header">
        <div>
          <span className="weather-tag">LIVE WEATHER</span>
          <h1>Weather Dashboard</h1>
          <p>Check current weather and 7-day forecast.</p>
        </div>

        <button
          className="location-btn"
          onClick={getMyLocation}
          disabled={loading}
        >
          📍 My Location
        </button>
      </div>

      <form className="weather-search" onSubmit={searchCity}>
        <span>🔍</span>

        <input
          type="text"
          placeholder="Search city name..."
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Loading..." : "Search"}
        </button>
      </form>

      {error && (
        <div className="weather-error">
          ⚠️ {error}
        </div>
      )}

      {weather && (
        <>
          <div className="weather-main-card">
            <div className="weather-main-info">
              <span className="weather-tag">CURRENT WEATHER</span>

              <h2>📍 {weather.city}</h2>

              <h1>
                {Math.round(weather.temperature_2m)}°C
              </h1>

              <h3>
                {getWeatherText(weather.weather_code)}
              </h3>

              <p>
                Feels Like:{" "}
                {Math.round(weather.apparent_temperature)}°C
              </p>
            </div>

            <div className="weather-big-icon">
              {getWeatherIcon(weather.weather_code)}
            </div>
          </div>

          <div className="weather-stats">

            <div className="weather-stat-card">
              <span>💧</span>
              <p>Humidity</p>
              <h2>{weather.relative_humidity_2m}%</h2>
            </div>

            <div className="weather-stat-card">
              <span>💨</span>
              <p>Wind Speed</p>
              <h2>{weather.wind_speed_10m} km/h</h2>
            </div>

            <div className="weather-stat-card">
              <span>🌧️</span>
              <p>Precipitation</p>
              <h2>{weather.precipitation} mm</h2>
            </div>

            <div className="weather-stat-card">
              <span>🌡️</span>
              <p>Feels Like</p>
              <h2>{Math.round(weather.apparent_temperature)}°C</h2>
            </div>

          </div>

          <div className="forecast-section">
            <div className="forecast-heading">
              <div>
                <h2>7 Days Forecast</h2>
                <p>Weather forecast for upcoming days</p>
              </div>
              <span>📅 Weekly Forecast</span>
            </div>

            <div className="forecast-grid">
              {forecast.map((day, index) => (
                <div className="forecast-card" key={day.date}>
                  <h3>{formatDay(day.date, index)}</h3>

                  <span className="forecast-icon">
                    {getWeatherIcon(day.code)}
                  </span>

                  <p>{getWeatherText(day.code)}</p>

                  <div className="forecast-temperatures">
                    <strong>{Math.round(day.max)}°</strong>
                    <span>{Math.round(day.min)}°</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="weather-footer">
            Weather data provided by Open-Meteo API
          </p>
        </>
      )}
    </div>
  );
}

export default Weather;
