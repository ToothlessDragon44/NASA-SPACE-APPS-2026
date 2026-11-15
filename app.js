const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

let currentState = {
  lat: 19.0948,
  lon: 74.7480,
  label: "Ahilyanagar, Maharashtra",
  weather: { annualRain: 565, marchHeat: 36.4, mayHeat: 40.2 },
  soil: { rootWetness: 0.35, soilClass: "Loading..." }
};

// 1. Initialize Leaflet India Map
const map = L.map("india-map").setView([22.5, 75.5], 5);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

let activePin = L.marker([currentState.lat, currentState.lon]).addTo(map);

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

// Instant 0ms Indian Soil-Zone Classifier (eliminates "Loading..." wait)
function inferIndianSoilClass(lat, lon) {
  if (lat >= 22.5 && lat <= 24.8 && lon >= 68.0 && lon <= 71.5) {
    return "Arid Coastal / Saline Alluvial";
  }
  if (lat >= 24.5 && lat <= 30.0 && lon >= 69.5 && lon <= 75.5) {
    return "Arid Sandy Loam (Desert Soil)";
  }
  if (lat >= 15.5 && lat <= 23.5 && lon >= 72.8 && lon <= 79.5) {
    return "Black Cotton Soil (Vertisol)";
  }
  if (lat >= 24.5 && lat <= 31.5 && lon >= 75.5 && lon <= 88.5) {
    return "Indo-Gangetic Alluvial Loam";
  }
  if (lat > 30.0 || (lat >= 26.5 && lon >= 88.0)) {
    return "Sub-Montane / Tarai Loam";
  }
  return "Red & Lateritic Clay Loam";
}

// Fast 1.5s background refinement from ISRIC SoilGrids
async function fetchRealSoilProfile(lat, lon, fallbackSoil) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);
  const url = `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lon.toFixed(4)}&lat=${lat.toFixed(4)}&property=clay&property=sand&depth=0-5cm&value=mean`;

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    const data = await res.json();
    const layers = data.properties.layers;
    const clayRaw = layers.find((l) => l.name === "clay")?.depths[0]?.values?.mean;
    const sandRaw = layers.find((l) => l.name === "sand")?.depths[0]?.values?.mean;

    if (clayRaw == null || sandRaw == null) return fallbackSoil;
    const clayPct = Math.round(clayRaw / 10);
    const sandPct = Math.round(sandRaw / 10);

    if (clayPct >= 40) return `Black / Clay Soil (${clayPct}% Clay)`;
    if (sandPct >= 60) return `Sandy Loam (${sandPct}% Sand)`;
    return `Balanced Loam (${clayPct}% Clay, ${sandPct}% Sand)`;
  } catch (err) {
    clearTimeout(timer);
    return fallbackSoil;
  }
}
// Resolve the active KVK calendar for the chosen State & District
function getActiveKvkCalendar() {
  const stateName = document.getElementById("state-select").value;
  const districtName = document.getElementById("district-select").value;
  const exactKey = `${stateName}|${districtName}`;

  if (KVK_DISTRICT_CALENDARS[exactKey]) {
    return {
      sourceLabel: `KVK Calendar: ${KVK_DISTRICT_CALENDARS[exactKey].kvkName}`,
      ...KVK_DISTRICT_CALENDARS[exactKey]
    };
  }
  if (KVK_STATE_CALENDARS[stateName]) {
    return {
      sourceLabel: `ICAR State Agro-Climatic Calendar (${stateName})`,
      ...KVK_STATE_CALENDARS[stateName]
    };
  }
  // Custom map pin fallback: infer regional KVK crops from live rainfall
  const isArid = currentState.weather.annualRain < 600;
  return {
    sourceLabel: isArid ? "ICAR Arid-Zone KVK Baseline" : "ICAR Sub-Humid KVK Baseline",
    kharif: isArid ? ["bajra", "guar", "moong", "castor", "cotton"] : ["rice", "soybean", "maize", "tur"],
    rabi:   isArid ? ["chickpea", "mustard", "cumin", "jowar"] : ["wheat", "chickpea", "mustard", "lentil"],
    zaid:   ["moong", "fallow"]
  };
}

// Dynamically build & score 3-season rotations strictly from that district's KVK crops
function renderRotationCards() {
  const prevCrop = document.getElementById("prev-crop").value;
  const waterSource = document.querySelector('input[name="water-source"]:checked').value;
  const goal = document.getElementById("priority-goal").value;
  const { weather, soil } = currentState;
  if (!weather || !soil) return;

  const calendar = getActiveKvkCalendar();
  const candidates = [];

  // Generate all valid (Kharif -> Rabi -> Zaid) triplets from the district's KVK list
  for (const kId of calendar.kharif) {
    for (const rId of calendar.rabi) {
      for (const zId of calendar.zaid) {
        const k = CROP_TRAITS[kId];
        const r = CROP_TRAITS[rId];
        const z = CROP_TRAITS[zId];
        if (!k || !r || !z) continue;

        let score = 74;
        const reasons = [];

        // 1. Rotate away from user's previous crop & avoid consecutive same-family crops
        if (kId === prevCrop || rId === prevCrop || zId === prevCrop) {
          score -= 35;
        } else {
          score += 6;
        }

        if (
          (k.family === r.family && k.family !== "none") ||
          (r.family === z.family && r.family !== "none")
        ) {
          score -= 18; // Penalize consecutive cereals or consecutive legumes
        } else if ((k.fixesN && !r.fixesN) || (!k.fixesN && r.fixesN)) {
          score += 12; // Reward Cereal/Cash <-> Legume pairing
          reasons.push("pairs nutrient feeder with nitrogen-fixing legume");
        }

        // 2. Live NASA POWER Rainfall & Root-Zone Wetness Fit
        const cropsInSeq = [k, r, z];
        const highWaterCount = cropsInSeq.filter((c) => c.waterNeed === "high").length;
        const medWaterCount = cropsInSeq.filter((c) => c.waterNeed === "medium").length;

        if (waterSource === "rainfed") {
          if (highWaterCount > 0) score -= 35 * highWaterCount;
          if (weather.annualRain < 550 && medWaterCount > 0) score -= 14 * medWaterCount;
          if (soil.rootWetness < 0.35 && r.waterNeed !== "low") score -= 15;
          if (zId !== "fallow" && weather.annualRain < 750) score -= 18; // Rainfed drylands need summer fallow
        } else {
          if (highWaterCount > 0 && weather.annualRain >= 650) score += 6;
        }

        // 3. Live NASA POWER March Terminal Heat Stress Check
        if (weather.marchHeat > 34.5 && (r.heatSensitive || z.heatSensitive)) {
          score -= 18;
        }

        // 4. Primary Farmer Goal Weighting
        let goalTag = "";
        const nFixers = cropsInSeq.filter((c) => c.fixesN).length;
        const totalCash = k.cashTier + r.cashTier + z.cashTier;

        if (goal === "water") {
          if (highWaterCount === 0 && medWaterCount === 0) {
            score += 20;
            goalTag = "💧 Ultra-Low Water Sequence";
          } else if (highWaterCount === 0) {
            score += 6;
            goalTag = "💧 Moderate Water Use";
          } else {
            score -= 22;
            goalTag = "⚠️ High Water Requirement";
          }
        } else if (goal === "nitrogen") {
          if (nFixers >= 2) {
            score += 24;
            goalTag = "🌱 Dual Legume N-Restoration";
          } else if (nFixers === 1) {
            score += 12;
            goalTag = "🌱 Single Legume N-Boost";
          } else {
            score -= 16;
            goalTag = "⚠️ No Nitrogen-Fixing Crop";
          }
        } else if (goal === "resilience") {
          if (k.droughtHardy && r.droughtHardy && !r.heatSensitive) {
            score += 20;
            goalTag = "🛡️ Heat & Drought Resilient";
          } else {
            score -= 12;
            goalTag = "⚠️ Sensitive to Heat/Dry Spells";
          }
        } else if (goal === "yield") {
          if (totalCash >= 6) {
            score += 22;
            goalTag = "📈 High-Value Cash & Yield";
          } else if (totalCash >= 4) {
            score += 10;
            goalTag = "📈 Balanced Market Output";
          } else {
            score -= 10;
            goalTag = "⚠️ Low-Input Subsistence";
          }
        }

        const finalScore = Math.max(30, Math.min(99, Math.round(score)));
        const reasonText = reasons.length
          ? `Recommended from ${calendar.sourceLabel}: ${reasons[0]}, matching ${weather.annualRain} mm/yr rainfall and ${Math.round(soil.rootWetness * 100)}% root wetness.`
          : `Selected from ${calendar.sourceLabel} to fit local soil texture and ${weather.marchHeat}°C March heat limits.`;

        const kEn = formatForEnglishSpeech(getCropName(kId, "en"));
        const rEn = formatForEnglishSpeech(getCropName(rId, "en"));
        const zEn = formatForEnglishSpeech(getCropName(zId, "en"));

        const speechByLang = {
          en: `Option ${candidates.length + 1}. Kharif: ${kEn}. Rabi: ${rEn}. Zaid: ${zEn}. Suitability ${finalScore} percent.`,
          hi: `विकल्प. खरीफ में ${getCropName(kId, "hi")}, रबी में ${getCropName(rId, "hi")}, और जायद में ${getCropName(zId, "hi")} उगाएं। अनुकूलता ${finalScore} प्रतिशत है।`,
          mr: `पर्याय. खरीप हंगामात ${getCropName(kId, "mr")}, रब्बीमध्ये ${getCropName(rId, "mr")}, आणि उन्हाळी हंगामात ${getCropName(zId, "mr")} घ्यावे. अनुकूलता ${finalScore} टक्के आहे.`,
          gu: `વિકલ્પ. ખરીફમાં ${getCropName(kId, "gu")}, રવિમાં ${getCropName(rId, "gu")}, અને ઉનાળુ સિઝનમાં ${getCropName(zId, "gu")} વાવો. અનુકૂળતા ${finalScore} ટકા છે.`
        };

        candidates.push({
          pairKey: `${kId}_${rId}`,
          kharif: getCropName(kId),
          rabi: getCropName(rId),
          zaid: getCropName(zId),
          finalScore,
          goalTag,
          reason: reasonText,
          speechByLang
        });
      }
    }
  }

  // Sort highest score first and keep top 3 distinct Kharif-Rabi crop pairs
  candidates.sort((a, b) => b.finalScore - a.finalScore);
  const topThree = [];
  const seenPairs = new Set();
  for (const item of candidates) {
    if (!seenPairs.has(item.pairKey)) {
      seenPairs.add(item.pairKey);
      topThree.push(item);
    }
    if (topThree.length === 3) break;
  }

  const aridBanner =
    waterSource === "rainfed" && weather.annualRain < 450
      ? `<div style="grid-column: 1 / -1; background: #451a03; border: 1px solid #d97706; color: #fde68a; padding: 0.65rem 0.9rem; border-radius: 6px; font-size: 0.85rem;">
          ⚠️ <strong>Arid Rainfed Zone (${weather.annualRain} mm/yr):</strong> Low residual moisture restricts multi-cropping; drought-hardy Kharif crops + summer fallow are prioritized.
        </div>`
      : "";

  latestRankedPlans = topThree; // <-- LANDMARK 3: Save active 3 cards for audio playback
  const activeLang = typeof currentLang !== "undefined" ? currentLang : "en";
  const listenText = (typeof LANG_STRINGS !== "undefined" && LANG_STRINGS[activeLang]?.listen) || "🔊 Listen to Plan";

  const container = document.getElementById("rotation-results");
  container.innerHTML =
    `<div style="grid-column: 1 / -1; color: #7dd3fc; font-size: 0.88rem; font-weight: 600;">
      Active Crop Pool: ${calendar.sourceLabel}
    </div>` +
    aridBanner +
    topThree
      .map((item, idx) => {
        const fitLabel = item.finalScore >= 80 ? "Optimal Fit" : item.finalScore >= 65 ? "Moderate Fit" : "High Stress";
        const fitClass = item.finalScore >= 80 ? "fit-optimal" : item.finalScore >= 65 ? "fit-moderate" : "fit-stress";
        return `
        <div class="rotation-card">
          <div class="card-header">
            <span class="rank-tag">#${idx + 1} · Suitability ${item.finalScore}%</span>
            <span class="fit-badge ${fitClass}">${fitLabel}</span>
          </div>
          <div class="goal-pill">${item.goalTag}</div>
          <div class="season-flow">
            <div><strong>Kharif:</strong> ${item.kharif}</div>
            <div><strong>Rabi:</strong> ${item.rabi}</div>
            <div><strong>Zaid:</strong> ${item.zaid}</div>
          </div>
          <p class="reason-text">${item.reason}</p>
          <!-- LANDMARK 4A: Speaker button inside each card -->
          <button type="button" class="speak-btn" data-plan-idx="${idx}">${listenText}</button>
        </div>
      `;
      })
      .join("");

  // LANDMARK 4B: Attach click events to the 3 speaker buttons
  container.querySelectorAll(".speak-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      speakPlanCard(Number(btn.dataset.planIdx), btn);
    });
  });
}

//////////////////////////

// Translate raw NASA weather & soil numbers into plain-language farmer guidance
function updateFarmConditionUI({ weatherLoaded = true, moistureLoaded = true } = {}) {
  const { weather, soil } = currentState;

  // 1. Rainfall & Water Security
  const rainStatusEl = document.getElementById("farmer-rain-status");
  const rainNoteEl = document.getElementById("farmer-rain-note");
  if (!weatherLoaded) {
    rainStatusEl.className = "status-pill status-loading";
    rainStatusEl.textContent = "Checking...";
    rainNoteEl.textContent = "Checking seasonal rainfall pattern for your area...";
  } else if (weather.annualRain < 500) {
    rainStatusEl.className = "status-pill status-alert";
    rainStatusEl.textContent = "Low Rainfall";
    rainNoteEl.textContent = "Dry zone — choose drought-hardy millets or pulses unless you have well/canal irrigation.";
  } else if (weather.annualRain < 900) {
    rainStatusEl.className = "status-pill status-warn";
    rainStatusEl.textContent = "Moderate Rain";
    rainNoteEl.textContent = "Supports one reliable Kharif crop; winter Rabi sowing needs residual soil moisture or light watering.";
  } else {
    rainStatusEl.className = "status-pill status-good";
    rainStatusEl.textContent = "Good Monsoon";
    rainNoteEl.textContent = "Strong rainfall supports water-loving Kharif crops and good post-monsoon soil recharge.";
  }

  // 2. Spring & Summer Heat Risk (March grain-filling check)
  const heatStatusEl = document.getElementById("farmer-heat-status");
  const heatNoteEl = document.getElementById("farmer-heat-note");
  if (!weatherLoaded) {
    heatStatusEl.className = "status-pill status-loading";
    heatStatusEl.textContent = "Checking...";
    heatNoteEl.textContent = "Checking afternoon heat risk during grain filling...";
  } else if (weather.marchHeat > 34.5) {
    heatStatusEl.className = "status-pill status-alert";
    heatStatusEl.textContent = "Early Heat Risk";
    heatNoteEl.textContent = "Hot March afternoons can shrivel late winter grain; sow early or choose heat-tolerant crops.";
  } else if (weather.marchHeat > 31.5) {
    heatStatusEl.className = "status-pill status-warn";
    heatStatusEl.textContent = "Warm Spring";
    heatNoteEl.textContent = "Moderate March warmth — timely Rabi sowing helps grain mature before peak afternoon heat.";
  } else {
    heatStatusEl.className = "status-pill status-good";
    heatStatusEl.textContent = "Mild Spring";
    heatNoteEl.textContent = "Cool March temperatures protect winter crops during grain filling with low heat stress.";
  }

  // 3. Current Subsoil Moisture (from NASA GWETROOT)
  const moistStatusEl = document.getElementById("farmer-moisture-status");
  const moistNoteEl = document.getElementById("farmer-moisture-note");
  if (!moistureLoaded) {
    moistStatusEl.className = "status-pill status-loading";
    moistStatusEl.textContent = "Checking...";
    moistNoteEl.textContent = "Checking root-zone dampness for seed germination...";
  } else if (soil.rootWetness < 0.35) {
    moistStatusEl.className = "status-pill status-alert";
    moistStatusEl.textContent = "Dry Root Zone";
    moistNoteEl.textContent = "Subsoil is currently dry — pre-sowing watering or waiting for rain is needed before sowing.";
  } else if (soil.rootWetness < 0.60) {
    moistStatusEl.className = "status-pill status-warn";
    moistStatusEl.textContent = "Moderate Moisture";
    moistNoteEl.textContent = "Enough dampness in the root zone for hardy pulses, millets, and deep-rooted crops.";
  } else {
    moistStatusEl.className = "status-pill status-good";
    moistStatusEl.textContent = "Well Moistened";
    moistNoteEl.textContent = "Root zone holds strong moisture — seeds can germinate reliably without immediate watering.";
  }

  // 4. Soil Behavior & Water Retention
  const soilStatusEl = document.getElementById("farmer-soil-status");
  const soilNoteEl = document.getElementById("farmer-soil-note");
  const s = (soil.soilClass || "").toLowerCase();

  if (s.includes("black") || s.includes("clay")) {
    soilStatusEl.className = "status-pill status-good";
    soilStatusEl.textContent = "Holds Water Well";
    soilNoteEl.textContent = "Heavy black/clay soil retains monsoon moisture into winter, but drains slowly if over-watered.";
  } else if (s.includes("sandy")) {
    soilStatusEl.className = "status-pill status-warn";
    soilStatusEl.textContent = "Fast-Draining Soil";
    soilNoteEl.textContent = "Light sandy soil is easy to plow but dries quickly — benefits from organic mulch and light, frequent watering.";
  } else if (s.includes("alluvial")) {
    soilStatusEl.className = "status-pill status-good";
    soilStatusEl.textContent = "Fertile Easy Loam";
    soilNoteEl.textContent = "Deep, fertile alluvial soil supports multi-season cropping with balanced drainage and moisture retention.";
  } else if (s.includes("tarai") || s.includes("montane")) {
    soilStatusEl.className = "status-pill status-good";
    soilStatusEl.textContent = "Rich Foothill Soil";
    soilNoteEl.textContent = "Organic-rich foothill loam holds steady moisture; pair with cool-tolerant winter crops.";
  } else {
    soilStatusEl.className = "status-pill status-good";
    soilStatusEl.textContent = "Well-Drained Loam";
    soilNoteEl.textContent = "Drains excess monsoon rain easily without waterlogging; legumes and compost boost fertility.";
  }
}

const LOCATION_CACHE = {};
let latestRequestId = 0;

async function selectLocation(lat, lon, customLabel = null) {
  const reqId = ++latestRequestId;
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;

  currentState.lat = lat;
  currentState.lon = lon;
  activePin.setLatLng([lat, lon]);
  currentState.label = customLabel || `Custom Pin (${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E)`;

  document.getElementById("coord-readout").textContent =
    `Selected: ${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E (${currentState.label})`;

  // 1. Instant 0ms load from session cache
  if (LOCATION_CACHE[cacheKey]) {
    const cached = LOCATION_CACHE[cacheKey];
    currentState.weather = { ...cached.weather };
    currentState.soil = { ...cached.soil };
    document.getElementById("tele-rain").textContent = `${cached.weather.annualRain} mm/yr`;
    document.getElementById("tele-heat").textContent = `${cached.weather.marchHeat}°C / ${cached.weather.mayHeat}°C`;
    document.getElementById("tele-smap").textContent = `${Math.round(cached.soil.rootWetness * 100)}% Root Wetness`;
    document.getElementById("tele-soil").textContent = cached.soil.soilClass;
    updateFarmConditionUI({ weatherLoaded: true, moistureLoaded: true });
    if (!document.getElementById("state-select").value) syncPrevCropDropdown();
    renderRotationCards();
    return;
  }

  // 2. Immediate 0ms soil classification + loading state for live weather/wetness
  const instantSoil = inferIndianSoilClass(lat, lon);
  currentState.soil = { rootWetness: 0.35, soilClass: instantSoil };

  document.getElementById("tele-rain").textContent = "Loading...";
  document.getElementById("tele-heat").textContent = "Loading...";
  document.getElementById("tele-smap").textContent = "Loading...";
  document.getElementById("tele-soil").textContent = instantSoil;
  updateFarmConditionUI({ weatherLoaded: false, moistureLoaded: false });

  let weatherDone = false;
  let moistureDone = false;

  // 3. Progressive updates as each API resolves
  const weatherPromise = getNasaPowerWeather(lat, lon).then((weather) => {
    if (reqId !== latestRequestId) return weather;
    weatherDone = true;
    currentState.weather = weather;
    document.getElementById("tele-rain").textContent = `${weather.annualRain} mm/yr`;
    document.getElementById("tele-heat").textContent = `${weather.marchHeat}°C / ${weather.mayHeat}°C`;
    updateFarmConditionUI({ weatherLoaded: weatherDone, moistureLoaded: moistureDone });
    if (!document.getElementById("state-select").value) syncPrevCropDropdown();
    renderRotationCards();
    return weather;
  });

  const wetnessPromise = fetchLiveRootWetness(lat, lon).then((rootWetness) => {
    if (reqId !== latestRequestId) return rootWetness;
    moistureDone = true;
    currentState.soil.rootWetness = rootWetness;
    document.getElementById("tele-smap").textContent = `${Math.round(rootWetness * 100)}% Root Wetness`;
    updateFarmConditionUI({ weatherLoaded: weatherDone, moistureLoaded: moistureDone });
    renderRotationCards();
    return rootWetness;
  });

  const soilPromise = fetchRealSoilProfile(lat, lon, instantSoil).then((soilClass) => {
    if (reqId !== latestRequestId) return soilClass;
    currentState.soil.soilClass = soilClass;
    document.getElementById("tele-soil").textContent = soilClass;
    updateFarmConditionUI({ weatherLoaded: weatherDone, moistureLoaded: moistureDone });
    return soilClass;
  });

  const [weather, rootWetness, soilClass] = await Promise.all([
    weatherPromise,
    wetnessPromise,
    soilPromise
  ]);

  if (reqId === latestRequestId) {
    LOCATION_CACHE[cacheKey] = {
      weather,
      soil: { rootWetness, soilClass }
    };
  }
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

let currentLang = "en";
let latestRankedPlans = [];

// Pre-warm browser voice list (Chrome loads voices asynchronously)
if ("speechSynthesis" in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

const CROP_VERNACULAR = {
  bajra:     { en: "Pearl Millet (Bajra)", hi: "बाजरा", mr: "बाजरी", gu: "બાજરી" },
  jowar:     { en: "Sorghum (Jowar)", hi: "ज्वार", mr: "ज्वारी", gu: "જુવાર" },
  ragi:      { en: "Finger Millet (Ragi)", hi: "रागी", mr: "नाचणी", gu: "રાગી" },
  maize:     { en: "Maize (Makka)", hi: "मक्का", mr: "मका", gu: "મકાઈ" },
  rice:      { en: "Paddy (Rice)", hi: "धान", mr: "भात", gu: "ડાંગર" },
  wheat:     { en: "Wheat (Gehun)", hi: "गेहूं", mr: "गहू", gu: "ઘઉં" },
  soybean:   { en: "Soybean", hi: "सोयाबीन", mr: "सोयाबीन", gu: "સોયાબીન" },
  tur:       { en: "Pigeon Pea (Tur)", hi: "अरहर तूर", mr: "तूर", gu: "તુવેર" },
  moong:     { en: "Green Gram (Moong)", hi: "मूंग", mr: "मूग", gu: "મગ" },
  urad:      { en: "Black Gram (Urad)", hi: "उड़द", mr: "उडीद", gu: "અડદ" },
  chickpea:  { en: "Chickpea (Chana)", hi: "चना", mr: "हरभरा", gu: "ચણા" },
  guar:      { en: "Cluster Bean (Guar)", hi: "ग्वार", mr: "गवार", gu: "ગવાર" },
  moth:      { en: "Moth Bean", hi: "मोठ", mr: "मटकी", gu: "મઠ" },
  groundnut: { en: "Groundnut", hi: "मूंगफली", mr: "भुईमूग", gu: "મગફળી" },
  lentil:    { en: "Lentil (Masoor)", hi: "मसूर", mr: "मसूर", gu: "મસૂર" },
  peas:      { en: "Field Pea (Matar)", hi: "मटर", mr: "वाटाणा", gu: "વટાણા" },
  cotton:    { en: "Cotton (Kapas)", hi: "कपास", mr: "कापूस", gu: "કપાસ" },
  mustard:   { en: "Mustard (Sarson)", hi: "सरसों", mr: "मोहरी", gu: "રાયડો" },
  castor:    { en: "Castor (Arandi)", hi: "अरंडी", mr: "एरंडी", gu: "એરંડા" },
  cumin:     { en: "Cumin (Jeera)", hi: "जीरा", mr: "जिरे", gu: "જીરું" },
  safflower: { en: "Safflower (Kardi)", hi: "कुसुम", mr: "करडई", gu: "કસુંબી" },
  sesame:    { en: "Sesame (Til)", hi: "तिल", mr: "तीळ", gu: "તલ" },
  sunflower: { en: "Sunflower", hi: "सूरजमुखी", mr: "सूर्यफूल", gu: "સૂર્યમુખી" },
  onion:     { en: "Onion (Pyaz)", hi: "प्याज", mr: "कांदा", gu: "ડુંગળી" },
  potato:    { en: "Potato (Aloo)", hi: "आलू", mr: "बटाटा", gu: "બટાકા" },
  fallow:    { en: "Soil-Moisture Fallow / Mulch", hi: "खाली खेत और पलवार", mr: "पडीक आणि आच्छादन", gu: "પડતર અને આચ્છાદન" }
};

const LANG_STRINGS = {
  en: { locale: "en-IN", kharif: "Kharif", rabi: "Rabi", zaid: "Zaid", listen: "🔊 Listen to Plan", stop: "⏹️ Stop Audio" },
  hi: { locale: "hi-IN", kharif: "खरीफ", rabi: "रबी", zaid: "जायद", listen: "🔊 सलाह सुनें", stop: "⏹️ आवाज बंद करें" },
  mr: { locale: "mr-IN", kharif: "खरीप", rabi: "रब्बी", zaid: "उन्हाळी", listen: "🔊 सल्ला ऐका", stop: "⏹️ आवाज थांबवा" },
  gu: { locale: "gu-IN", kharif: "ખરીફ", rabi: "રવિ", zaid: "ઉનાળુ", listen: "🔊 સલાહ સાંભળો", stop: "⏹️ અવાજ બંધ કરો" }
};

function getCropName(id, lang = currentLang) {
  return CROP_VERNACULAR[id]?.[lang] || CROP_TRAITS[id]?.name || id;
}

// Convert English crop names into phonetic speech so "Tur" is spoken as "Toor", not spelled T-U-R
function formatForEnglishSpeech(text) {
  return text
    .replace(/\(Tur\/Arhar\)|\(Tur\)/gi, ", Toor")
    .replace(/\(Jowar\)/gi, ", Joh-waar")
    .replace(/\(Bajra\)/gi, ", Baaj-ra")
    .replace(/\(Urad\)/gi, ", Oorad")
    .replace(/\(Guar\)/gi, ", Gwaar")
    .replace(/\(([^)]+)\)/g, ", $1");
}

function speakPlanCard(planIndex, btnEl) {
  if (!("speechSynthesis" in window)) {
    alert("Audio readout is not supported on this browser.");
    return;
  }

  const t = LANG_STRINGS[currentLang] || LANG_STRINGS.en;
  const wasSpeakingThis = btnEl.classList.contains("speaking");

  window.speechSynthesis.cancel();
  document.querySelectorAll(".speak-btn").forEach((b) => {
    b.classList.remove("speaking");
    b.textContent = t.listen;
  });

  if (wasSpeakingThis) return;

  const plan = latestRankedPlans[planIndex];
  if (!plan) return;

  // Match the best installed Indian voice on the device, with smart fallback
  const voices = window.speechSynthesis.getVoices();
  const langPrefix = t.locale.split("-")[0];
  let chosenLang = currentLang;
  let matchedVoice =
    voices.find((v) => v.lang.toLowerCase() === t.locale.toLowerCase()) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));

  // If a desktop OS lacks Marathi/Gujarati voice packs, fall back to Hindi voice (or phonetic English)
  if (!matchedVoice && (currentLang === "mr" || currentLang === "gu")) {
    matchedVoice = voices.find((v) => v.lang.toLowerCase().startsWith("hi"));
    chosenLang = matchedVoice ? "hi" : "en";
  } else if (!matchedVoice && currentLang === "hi") {
    chosenLang = "en";
  }

  const utterance = new SpeechSynthesisUtterance(plan.speechByLang[chosenLang] || plan.speechByLang.en);
  utterance.lang = LANG_STRINGS[chosenLang].locale;
  if (matchedVoice) utterance.voice = matchedVoice;
  utterance.rate = 0.92;

  btnEl.classList.add("speaking");
  btnEl.textContent = t.stop;

  utterance.onend = () => {
    btnEl.classList.remove("speaking");
    btnEl.textContent = t.listen;
  };
  utterance.onerror = () => {
    btnEl.classList.remove("speaking");
    btnEl.textContent = t.listen;
  };

  window.speechSynthesis.speak(utterance);
}

// Language button click handler
document.querySelectorAll(".lang-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    document.querySelectorAll(".lang-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentLang = btn.dataset.lang;
    syncPrevCropDropdown();
    renderRotationCards();
  });
});

document.querySelectorAll(".lang-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    document.querySelectorAll(".lang-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentLang = btn.dataset.lang;
    applyLanguageUI();
    syncPrevCropDropdown();
    renderRotationCards();
  });
});

const CROP_ICONS = {
  bajra: "🌾",
  jowar: "🌾",
  ragi: "🌿",
  maize: "🌽",
  rice: "🌾",
  wheat: "🌾",
  soybean: "🫘",
  tur: "🫘",
  moong: "🫛",
  urad: "🫛",
  chickpea: "🫘",
  guar: "🫛",
  moth: "🫘",
  groundnut: "🥜",
  lentil: "🫘",
  peas: "🫛",
  cotton: "☁️",
  mustard: "🌼",
  castor: "🌱",
  cumin: "🌿",
  safflower: "🌻",
  sesame: "🌱",
  sunflower: "🌻",
  onion: "🧅",
  potato: "🥔"
};

function syncPrevCropDropdown() {
  const prevInput = document.getElementById("prev-crop");
  const cropGrid = document.getElementById("prev-crop-grid");
  if (!prevInput || !cropGrid) return;

  const calendar = getActiveKvkCalendar();
  const uniqueIds = [...new Set([...calendar.kharif, ...calendar.rabi, ...calendar.zaid])]
    .filter((id) => id !== "fallow" && CROP_TRAITS[id]);

  // Preserve current choice if valid in this district; otherwise select the first local crop
  const selectedId = uniqueIds.includes(prevInput.value) ? prevInput.value : uniqueIds[0];
  prevInput.value = selectedId;

  cropGrid.innerHTML = uniqueIds
    .map((id) => {
      const shortLabel = getCropName(id).split("(")[0].trim();
      const icon = CROP_ICONS[id] || "🌾";
      const isActive = id === selectedId ? "active" : "";
      return `
        <button type="button" class="visual-tile crop-tile ${isActive}" data-crop="${id}">
          <span class="tile-icon">${icon}</span>
          <span class="tile-title">${shortLabel}</span>
        </button>
      `;
    })
    .join("");

  cropGrid.querySelectorAll(".crop-tile").forEach((btn) => {
    btn.addEventListener("click", () => {
      cropGrid.querySelectorAll(".crop-tile").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      prevInput.value = btn.dataset.crop;
      renderRotationCards();
    });
  });
}

// Wire up Visual Farmer Goal tap tiles
document.querySelectorAll(".goal-tile").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".goal-tile").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("priority-goal").value = btn.dataset.goal;
    renderRotationCards();
  });
});

// 4. Event Listeners: State Change -> District Change -> Map Click
stateSelect.addEventListener("change", () => {
  populateDistrictDropdown(stateSelect.value);
});

districtSelect.addEventListener("change", async () => {
  const stateName = stateSelect.value;
  const districtName = districtSelect.value;
  if (!stateName || !districtName) return;

  syncPrevCropDropdown();
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

// Reverse-geocode GPS coordinates to auto-select the matching State & District KVK calendar
async function syncDropdownsFromGps(lat, lon) {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    const rawState = (data.principalSubdivision || "").trim();
    const matchedState = Object.keys(INDIA_STATE_DISTRICTS).find(
      (s) => s.toLowerCase() === rawState.toLowerCase()
    );

    if (!matchedState) return null;

    // Auto-select State and unlock District dropdown
    stateSelect.value = matchedState;
    populateDistrictDropdown(matchedState);

    // Collect all administrative names returned for this coordinate
    const adminNames = [
      data.city,
      data.locality,
      ...(data.localityInfo?.administrative || []).map((a) => a.name)
    ]
      .filter(Boolean)
      .map((n) => n.toLowerCase().replace(/\s+district$/i, "").trim());

    // Handle historical district rename (Ahmednagar -> Ahilyanagar)
    if (adminNames.some((n) => n.includes("ahmednagar"))) {
      adminNames.push("ahilyanagar");
    }

    const matchedDistrict = INDIA_STATE_DISTRICTS[matchedState].find((dist) =>
      adminNames.some((admin) => admin === dist.toLowerCase() || admin.includes(dist.toLowerCase()))
    );

    if (matchedDistrict) {
      districtSelect.value = matchedDistrict;
      syncPrevCropDropdown();
      return `My Farm · ${matchedDistrict}, ${matchedState}`;
    }

    syncPrevCropDropdown();
    return `My Farm · ${matchedState}`;
  } catch (err) {
    return null;
  }
}

// One-Tap "Locate My Farm" GPS Handler
const gpsBtn = document.getElementById("gps-locate-btn");
if (gpsBtn) {
  gpsBtn.addEventListener("click", () => {
    const readout = document.getElementById("coord-readout");

    if (!navigator.geolocation) {
      readout.textContent = "GPS not supported on this device — please choose your State & District.";
      return;
    }

    gpsBtn.disabled = true;
    gpsBtn.textContent = "⏳ Finding Your Field...";
    readout.textContent = "Requesting GPS signal from your device...";

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        // Guard against non-Indian VPNs or out-of-bounds test coordinates
        if (lat < 6.5 || lat > 37.5 || lon < 68.0 || lon > 97.5) {
          gpsBtn.disabled = false;
          gpsBtn.textContent = "📍 Locate My Farm (GPS)";
          readout.textContent = "Detected location is outside India — please select an Indian State & District.";
          return;
        }

        // Reset dropdowns before auto-matching detected State/District
        stateSelect.value = "";
        populateDistrictDropdown("");

        const farmLabel = await syncDropdownsFromGps(lat, lon);
        map.flyTo([lat, lon], 12, { duration: 1.1 });
        await selectLocation(lat, lon, farmLabel || `My Farm (${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E)`);

        gpsBtn.disabled = false;
        gpsBtn.textContent = "📍 Locate My Farm (GPS)";
      },
      (err) => {
        gpsBtn.disabled = false;
        gpsBtn.textContent = "📍 Locate My Farm (GPS)";

        if (err.code === err.PERMISSION_DENIED) {
          readout.textContent = "Location permission denied — please select your State & District manually.";
        } else {
          readout.textContent = "Weak GPS signal indoors — please select your State & District manually.";
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });
}

// 5. Initial Default Load: Maharashtra -> Ahilyanagar
stateSelect.value = "Maharashtra";
populateDistrictDropdown("Maharashtra", "Ahilyanagar");
syncPrevCropDropdown();
selectLocation(19.0948, 74.7480, "Ahilyanagar, Maharashtra");