const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

let currentState = {
  lat: 19.0948,
  lon: 74.7480,
  label: "Ahilyanagar, Maharashtra",
  weather: null,
  soil: null
};

// 1. Initialize Leaflet India Map
const map = L.map("india-map").setView([22.5, 75.5], 5);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

let activePin = L.marker([currentState.lat, currentState.lon]).addTo(map);

// Add markers for the 3 hero focus districts
SATELLITE_ANCHORS.slice(0, 3).forEach((anchor) => {
  L.circleMarker([anchor.lat, anchor.lon], {
    radius: 7,
    color: "#38bdf8",
    fillColor: "#0284c7",
    fillOpacity: 0.9
  })
    .addTo(map)
    .bindTooltip(anchor.name);
});

// 3. Live NASA POWER Climatology Fetch (with Offline Fallback)
async function getNasaPowerWeather(lat, lon) {
  const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=T2M_MAX,PRECTOTCORR&community=AG&longitude=${lon.toFixed(4)}&latitude=${lat.toFixed(4)}&format=JSON`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("NASA POWER request failed");
    const json = await res.json();
    const p = json.properties.parameter;

    const annualRain = Math.round(
      MONTHS.reduce((sum, m, idx) => sum + p.PRECTOTCORR[m] * DAYS_IN_MONTH[idx], 0)
    );
    return {
      annualRain,
      marchHeat: Number(p.T2M_MAX["MAR"].toFixed(1)),
      mayHeat: Number(p.T2M_MAX["MAY"].toFixed(1))
    };
  } catch (err) {
    return { annualRain: 750, marchHeat: 34.0, mayHeat: 39.0 };
  }
}

async function fetchLiveRootWetness(lat, lon) {
  const end = new Date(Date.now() - 4 * 86400000);
  const start = new Date(Date.now() - 14 * 86400000);
  const fmt = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");
  const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=GWETROOT&community=AG&longitude=${lon.toFixed(4)}&latitude=${lat.toFixed(4)}&start=${fmt(start)}&end=${fmt(end)}&format=JSON`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const valid = Object.values(data.properties.parameter.GWETROOT).filter((v) => v >= 0);
    if (!valid.length) return 0.35;
    return Number((valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(2));
  } catch (err) {
    return 0.35;
  }
}

async function fetchRealSoilProfile(lat, lon) {
  const url = `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lon.toFixed(4)}&lat=${lat.toFixed(4)}&property=clay&property=sand&depth=0-5cm&value=mean`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const layers = data.properties.layers;
    const clayRaw = layers.find((l) => l.name === "clay")?.depths[0]?.values?.mean;
    const sandRaw = layers.find((l) => l.name === "sand")?.depths[0]?.values?.mean;

    if (clayRaw == null || sandRaw == null) return "Regional Agricultural Loam";
    const clayPct = Math.round(clayRaw / 10);
    const sandPct = Math.round(sandRaw / 10);

    if (clayPct >= 40) return `Black / Clay Soil (${clayPct}% Clay)`;
    if (sandPct >= 60) return `Sandy Loam (${sandPct}% Sand)`;
    return `Balanced Loam (${clayPct}% Clay, ${sandPct}% Sand)`;
  } catch (err) {
    return "Regional Agricultural Loam";
  }
}
// 4. Score & Render Ranked 3-Season Rotation Cards
function renderRotationCards() {
  const prevCrop = document.getElementById("prev-crop").value;
  const waterSource = document.querySelector('input[name="water-source"]:checked').value;
  const goal = document.getElementById("priority-goal").value;
  const { weather, soil } = currentState;

  const ranked = ROTATION_PATHWAYS.map((plan) => {
    let score = plan.baseGaez;

    // Monocrop break rule
    if (plan.crops.includes(prevCrop)) score -= 32;

    // Water & SMAP root-zone moisture rules
    if (waterSource === "rainfed" && plan.waterNeed === "high") score -= 35;
    if (waterSource === "rainfed" && plan.waterNeed === "medium" && weather.annualRain < 500) score -= 18;
    if (soil.rootWetness < 0.35 && plan.waterNeed !== "low") score -= 18;

    // Terminal heat stress rule (NASA POWER March T2M_MAX)
    if (weather.marchHeat > 34.5 && plan.heatSensitive) score -= 22;

    // Farmer priority goal weighting
    if (goal === "water" && plan.waterNeed === "low") score += 14;
    if (goal === "nitrogen" && plan.fixesNitrogen) score += 14;
    if (goal === "resilience" && plan.droughtHardy) score += 14;
    if (goal === "yield" && waterSource === "irrigated" && plan.waterNeed !== "low") score += 12;

    const finalScore = Math.max(35, Math.min(98, Math.round(score)));

    let fitLabel = "Optimal Fit";
    let fitClass = "fit-optimal";
    if (finalScore < 65) {
      fitLabel = "High Stress";
      fitClass = "fit-stress";
    } else if (finalScore < 80) {
      fitLabel = "Moderate Fit";
      fitClass = "fit-moderate";
    }

    return { ...plan, finalScore, fitLabel, fitClass };
  })
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, 3);

  const container = document.getElementById("rotation-results");
  container.innerHTML = ranked
    .map(
      (item, idx) => `
      <div class="rotation-card">
        <div class="card-header">
          <span class="rank-tag">#${idx + 1} · GAEZ ${item.finalScore}%</span>
          <span class="fit-badge ${item.fitClass}">${item.fitLabel}</span>
        </div>
        <div class="season-flow">
          <div><strong>Kharif:</strong> ${item.kharif}</div>
          <div><strong>Rabi:</strong> ${item.rabi}</div>
          <div><strong>Zaid:</strong> ${item.zaid}</div>
        </div>
        <p class="reason-text">${item.reason}</p>
      </div>
    `
    )
    .join("");
}

// 5. Update Location, Telemetry Strip & Cards Together
async function selectLocation(lat, lon, customLabel = null) {
  currentState.lat = lat;
  currentState.lon = lon;
  activePin.setLatLng([lat, lon]);
  currentState.label = customLabel || `Custom Pin (${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E)`;

  document.getElementById("coord-readout").textContent =
    `Selected: ${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E (${currentState.label})`;
  document.getElementById("tele-rain").textContent = "Loading...";
  document.getElementById("tele-heat").textContent = "Loading...";
  document.getElementById("tele-smap").textContent = "Loading...";
  document.getElementById("tele-soil").textContent = "Loading...";

  const [weather, rootWetness, soilClass] = await Promise.all([
    getNasaPowerWeather(lat, lon),
    fetchLiveRootWetness(lat, lon),
    fetchRealSoilProfile(lat, lon)
  ]);

  currentState.weather = weather;
  currentState.soil = { rootWetness, soilClass };

  document.getElementById("tele-rain").textContent = `${weather.annualRain} mm/yr`;
  document.getElementById("tele-heat").textContent = `${weather.marchHeat}°C / ${weather.mayHeat}°C`;
  document.getElementById("tele-smap").textContent = `${Math.round(rootWetness * 100)}% Root Wetness`;
  document.getElementById("tele-soil").textContent = soilClass;

  renderRotationCards();
}

const stateSelect = document.getElementById("state-select");
const districtSelect = document.getElementById("district-select");

// 1. Populate State / UT Dropdown Alphabetically
Object.keys(INDIA_STATE_DISTRICTS)
  .sort()
  .forEach((stateName) => {
    const opt = document.createElement("option");
    opt.value = stateName;
    opt.textContent = stateName;
    stateSelect.appendChild(opt);
  });

// 2. Helper to Populate Districts for a Chosen State
function populateDistrictDropdown(stateName, preselectDistrict = null) {
  districtSelect.innerHTML = "";

  if (!stateName || !INDIA_STATE_DISTRICTS[stateName]) {
    districtSelect.innerHTML = `<option value="">-- Select State First --</option>`;
    districtSelect.disabled = true;
    return;
  }

  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = `-- Select District (${INDIA_STATE_DISTRICTS[stateName].length}) --`;
  districtSelect.appendChild(defaultOpt);

  INDIA_STATE_DISTRICTS[stateName].forEach((dist) => {
    const opt = document.createElement("option");
    opt.value = dist;
    opt.textContent = dist;
    if (preselectDistrict && dist === preselectDistrict) opt.selected = true;
    districtSelect.appendChild(opt);
  });

  districtSelect.disabled = false;
}

// 3. Resolve Exact Coordinates for Any Indian District (Cache First -> Geocoding API Fallback)
async function resolveDistrictCoordinates(stateName, districtName) {
  const cacheKey = `${stateName}|${districtName}`;
  if (EXACT_DISTRICT_COORDS[cacheKey]) {
    return EXACT_DISTRICT_COORDS[cacheKey];
  }

  document.getElementById("coord-readout").textContent =
    `Locating ${districtName}, ${stateName}...`;

  try {
    const query = encodeURIComponent(districtName);
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=8&language=en&format=json`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      // Filter strictly to India and match state name to avoid duplicate district name collisions
      const indianHits = data.results.filter((r) => r.country_code === "IN");
      const exactStateHit = indianHits.find(
        (r) => r.admin1 && r.admin1.toLowerCase().includes(stateName.toLowerCase())
      );
      const bestMatch = exactStateHit || indianHits[0];

      if (bestMatch) {
        return [bestMatch.latitude, bestMatch.longitude];
      }
    }
  } catch (err) {
    console.warn("Geocoder fallback triggered:", err);
  }

  return [22.5, 78.9]; //Geographic center of India as a last resort
}

// 4. Event Listeners: State Change -> District Change -> Map Click
stateSelect.addEventListener("change", () => {
  populateDistrictDropdown(stateSelect.value);
});

districtSelect.addEventListener("change", async () => {
  const stateName = stateSelect.value;
  const districtName = districtSelect.value;
  if (!stateName || !districtName) return;

  const [lat, lon] = await resolveDistrictCoordinates(stateName, districtName);
  map.flyTo([lat, lon], 8, { duration: 1.0 });
  selectLocation(lat, lon, `${districtName}, ${stateName}`);
});

map.on("click", (e) => {
  // Reset dropdown selection cleanly when user drops a custom pin on the map
  stateSelect.value = "";
  populateDistrictDropdown("");
  selectLocation(e.latlng.lat, e.latlng.lng);
});

document.getElementById("generate-btn").addEventListener("click", renderRotationCards);

// 5. Initial Default Load: Maharashtra -> Ahilyanagar
stateSelect.value = "Maharashtra";
populateDistrictDropdown("Maharashtra", "Ahilyanagar");
selectLocation(19.0948, 74.7480, "Ahilyanagar, Maharashtra");