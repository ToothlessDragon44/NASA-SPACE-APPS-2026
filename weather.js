console.log("WEATHER JS IS RUNNING!");
function getWeather() {

    const weatherBox = document.getElementById("weather");

    weatherBox.innerHTML = "Loading weather...";

    // Default location: Mumbai
    const defaultLat = 19.0760;
    const defaultLon = 72.8777;
    const defaultCity = "Mumbai";

    // Fetch weather using coordinates
    async function fetchWeather(lat, lon, city) {

        weatherBox.innerHTML = "Fetching weather...";

        try {

            const url =
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&temperature_unit=celsius&wind_speed_unit=kmh&timezone=auto`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error("API error");
            }

            const data = await response.json();
            const current = data.current;

            const weatherCodes = {
                0: "Clear Sky ☀️",
                1: "Mainly Clear 🌤️",
                2: "Partly Cloudy ⛅",
                3: "Overcast ☁️",
                45: "Foggy 🌫️",
                48: "Foggy 🌫️",
                51: "Drizzle 🌦️",
                53: "Drizzle 🌦️",
                55: "Heavy Drizzle 🌧️",
                61: "Light Rain 🌧️",
                63: "Rain 🌧️",
                65: "Heavy Rain 🌧️",
                71: "Light Snow ❄️",
                73: "Snow ❄️",
                75: "Heavy Snow ❄️",
                80: "Rain Showers 🌦️",
                81: "Rain Showers 🌧️",
                82: "Heavy Showers ⛈️",
                95: "Thunderstorm ⛈️",
                96: "Thunderstorm with Hail ⛈️",
                99: "Heavy Thunderstorm ⛈️"
            };

            weatherBox.innerHTML = `
                <h2>${city}</h2>
                <h1>${current.temperature_2m}°C</h1>
                <p>${weatherCodes[current.weather_code] || "Unknown"}</p>
                <p>Feels Like: ${current.apparent_temperature}°C</p>
                <p>Humidity: ${current.relative_humidity_2m}%</p>
                <p>Wind: ${current.wind_speed_10m} km/h</p>
                <p>Updated: ${current.time}</p>
            `;

        }

        catch(error) {

            weatherBox.innerHTML = "Unable to load weather.";
            console.log(error);

        }
    }

    // Check whether automatic location detection is available
    if (window.isSecureContext && navigator.geolocation) {

        navigator.geolocation.getCurrentPosition(

            function(position) {

                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                fetchWeather(lat, lon, "Your Local Weather");

            },

            function(error) {

                console.log("Location unavailable:", error.message);

                // Fallback location
                fetchWeather(defaultLat, defaultLon, defaultCity);

            },

            {
                enableHighAccuracy: false,
                timeout: 5000,
                maximumAge: 300000
            }

        );

    }

    else {

        // Fallback when opening HTML directly
        fetchWeather(defaultLat, defaultLon, defaultCity);

    }

}

// Run when website opens
getWeather();
