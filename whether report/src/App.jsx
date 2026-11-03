
import React, { useState } from "react";
import "./App.css";

function App() {
    const today = new Date();

    const localDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    const localTime = () => {
        return `${String(today.getHours()).padStart(2, "0")}:${String(today.getMinutes()).padStart(2, "0")}`;
    };

    const [city, setCity] = useState("");
    const [district, setDistrict] = useState("");
    const [date, setDate] = useState(localDate(today));
    const [time, setTime] = useState(localTime());

    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 16);

    // Weather description
    const getWeatherDescription = (code) => {
        const descriptions = {
            0: "Clear Sky",
            1: "Mainly Clear",
            2: "Partly Cloudy",
            3: "Overcast",
            45: "Fog",
            48: "Fog",
            51: "Light Drizzle",
            53: "Moderate Drizzle",
            55: "Heavy Drizzle",
            56: "Freezing Drizzle",
            57: "Freezing Drizzle",
            61: "Slight Rain",
            63: "Moderate Rain",
            65: "Heavy Rain",
            66: "Freezing Rain",
            67: "Heavy Freezing Rain",
            71: "Slight Snow",
            73: "Moderate Snow",
            75: "Heavy Snow",
            77: "Snow Grains",
            80: "Rain Showers",
            81: "Moderate Rain Showers",
            82: "Heavy Rain Showers",
            85: "Snow Showers",
            86: "Heavy Snow Showers",
            95: "Thunderstorm",
            96: "Thunderstorm with Hail",
            99: "Heavy Thunderstorm"
        };

        return descriptions[code] || "Unknown Weather";
    };

    // Weather icons
    const getWeatherIcon = (code) => {
        if (code === 0) return "☀️";
        if (code === 1 || code === 2) return "🌤️";
        if (code === 3) return "☁️";
        if (code === 45 || code === 48) return "🌫️";
        if (code >= 51 && code <= 67) return "🌧️";
        if (code >= 71 && code <= 77) return "❄️";
        if (code >= 80 && code <= 82) return "🌦️";
        if (code === 85 || code === 86) return "🌨️";
        if (code >= 95 && code <= 99) return "⛈️";

        return "🌡️";
    };

    // Search and get weather report
    const getWeather = async (e) => {
        e.preventDefault();

        setLoading(true);
        setError("");
        setReport(null);

        try {
            // Step 1: Find city coordinates
            const geoURL =
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=10&language=en&format=json`;

            const geoResponse = await fetch(geoURL);

            if (!geoResponse.ok) {
                throw new Error("Unable to search location.");
            }

            const geoData = await geoResponse.json();

            if (!geoData.results || geoData.results.length === 0) {
                throw new Error("City not found. Please enter a valid city name.");
            }

            // Select matching city and district
            const locations = geoData.results;

            const location =
                locations.find((item) =>
                    district &&
                    [item.admin1, item.admin2, item.name]
                        .some(value =>
                            value?.toLowerCase() === district.trim().toLowerCase()
                        )
                ) ||
                locations[0];

            const { latitude, longitude } = location;

            // Step 2: Choose forecast or historical weather API
            const isPast = date < localDate(new Date());

            const apiURL = isPast
                ? "https://archive-api.open-meteo.com/v1/archive"
                : "https://api.open-meteo.com/v1/forecast";

            const params = new URLSearchParams({
                latitude,
                longitude,
                start_date: date,
                end_date: date,
                hourly: [
                    "temperature_2m",
                    "apparent_temperature",
                    "relative_humidity_2m",
                    "precipitation_probability",
                    "weather_code",
                    "wind_speed_10m",
                    "pressure_msl"
                ].join(","),
                timezone: "auto"
            });

            const weatherResponse = await fetch(
                `${apiURL}?${params.toString()}`
            );

            if (!weatherResponse.ok) {
                throw new Error("Weather information is unavailable for this date.");
            }

            const weatherData = await weatherResponse.json();

            if (!weatherData.hourly?.time?.length) {
                throw new Error("Weather data is not available.");
            }

            // Step 3: Find selected time
            const times = weatherData.hourly.time;

            const targetMinutes =
                Number(time.split(":")[0]) * 60 +
                Number(time.split(":")[1]);

            let selectedIndex = 0;
            let minimumDifference = Infinity;

            times.forEach((item, index) => {
                const [hour, minute] = item.split("T")[1].split(":");

                const itemMinutes =
                    Number(hour) * 60 + Number(minute);

                const difference = Math.abs(
                    itemMinutes - targetMinutes
                );

                if (difference < minimumDifference) {
                    minimumDifference = difference;
                    selectedIndex = index;
                }
            });

            // Step 4: Prepare report
            const hourly = weatherData.hourly;
            const units = weatherData.hourly_units;

            const getValue = (key) =>
                hourly[key]?.[selectedIndex] ?? "N/A";

            setReport({
                city: location.name,
                district: location.admin2 || district,
                state: location.admin1 || "",
                country: location.country || "",
                date: hourly.time[selectedIndex],
                temperature: getValue("temperature_2m"),
                feelsLike: getValue("apparent_temperature"),
                humidity: getValue("relative_humidity_2m"),
                rain: getValue("precipitation_probability"),
                wind: getValue("wind_speed_10m"),
                pressure: getValue("pressure_msl"),
                code: getValue("weather_code"),
                units
            });

        } catch (err) {
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Convert time to readable format
    const formatTime = (value) => {
        if (!value || value === "N/A") return "N/A";

        const [hour, minute] = value.split(":");
        const h = Number(hour);
        const ampm = h >= 12 ? "PM" : "AM";

        return `${h % 12 || 12}:${minute} ${ampm}`;
    };

    return (
        <div className="app">

            {!report ? (
                <div className="search-container">

                    <div className="logo">🌦️</div>

                    <h1>Weather Report</h1>

                    <p className="subtitle">
                        Get accurate weather information for your location
                    </p>

                    <form onSubmit={getWeather}>

                        <label>City Name</label>
                        <input
                            type="text"
                            placeholder="Enter your city name"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            required
                        />

                        <label>District</label>
                        <input
                            type="text"
                            placeholder="Enter your district"
                            value={district}
                            onChange={(e) => setDistrict(e.target.value)}
                            required
                        />

                        <label>Select Date</label>
                        <input
                            type="date"
                            value={date}
                            min="1940-01-01"
                            max={localDate(maxDate)}
                            onChange={(e) => setDate(e.target.value)}
                            required
                        />

                        <label>Select Time</label>
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            required
                        />

                        {error && (
                            <p className="error">{error}</p>
                        )}

                        <button type="submit" disabled={loading}>
                            {loading ? "Getting Weather..." : "Get Weather"}
                        </button>

                    </form>
                </div>

            ) : (

                <div className="report-container">

                    <h1>🌦️ Weather Report</h1>

                    <div className="location">
                        <h2>{report.city}</h2>
                        <p>
                            {report.district}, {report.state}, {report.country}
                        </p>
                        <p>
                            {report.date.split("T")[0]} |
                            {" "}{formatTime(report.date.split("T")[1])}
                        </p>
                    </div>

                    <div className="main-weather">

                        <div className="weather-icon">
                            {getWeatherIcon(report.code)}
                        </div>

                        <h2>
                            {report.temperature}
                            {report.units.temperature_2m}
                        </h2>

                        <h3>{getWeatherDescription(report.code)}</h3>

                    </div>

                    <div className="details">

                        <div className="weather-box">
                            <span>🌡️</span>
                            <h4>Feels Like</h4>
                            <p>
                                {report.feelsLike}
                                {report.units.apparent_temperature}
                            </p>
                        </div>

                        <div className="weather-box">
                            <span>💧</span>
                            <h4>Humidity</h4>
                            <p>
                                {report.humidity}
                                {report.units.relative_humidity_2m}
                            </p>
                        </div>

                        <div className="weather-box">
                            <span>🌧️</span>
                            <h4>Rain Chance</h4>
                            <p>
                                {report.rain}
                                {report.units.precipitation_probability}
                            </p>
                        </div>

                        <div className="weather-box">
                            <span>💨</span>
                            <h4>Wind Speed</h4>
                            <p>
                                {report.wind}
                                {report.units.wind_speed_10m}
                            </p>
                        </div>

                        <div className="weather-box">
                            <span>🔵</span>
                            <h4>Pressure</h4>
                            <p>
                                {report.pressure}
                                {report.units.pressure_msl}
                            </p>
                        </div>

                    </div>

                    <button
                        className="back-button"
                        onClick={() => setReport(null)}
                    >
                        ← Search Another Location
                    </button>

                    <p className="source">
                        Weather data powered by Open-Meteo
                    </p>

                </div>
            )}

        </div>
    );
}

export default App;
